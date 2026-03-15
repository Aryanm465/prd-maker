const https = require('https');

const DEFAULT_INSTRUCTIONS = `You are a senior product manager. Using the raw inputs below, produce a complete, professional Product Requirements Document (PRD) in Markdown format.

## Instructions
- Structure the PRD with the following sections:
  1. Executive Summary
  2. Problem Statement
  3. Goals & Success Metrics
  4. User Personas
  5. User Stories
  6. Functional Requirements
  7. Non-Functional Requirements
  8. Out of Scope
  9. Dependencies & Risks
  10. Open Questions
- Be specific and actionable. Infer reasonable details where inputs are vague.
- If any input section is missing or marked "(not provided)", skip it gracefully and infer from available context.
- Use Markdown formatting with clear headings and bullet points.
- Do not include any commentary outside the PRD itself.`;

function buildPrompt({ roughContext, meetingNotes, actionItems, transcribedVoice, customInstructions }) {
  const instructions = (customInstructions || '').trim() || DEFAULT_INSTRUCTIONS;
  const inputSections = [];
  if (roughContext)     inputSections.push(`### Rough Context / Notes\n${roughContext}`);
  if (meetingNotes)     inputSections.push(`### Meeting Notes\n${meetingNotes}`);
  if (actionItems)      inputSections.push(`### Action Items\n${actionItems}`);
  if (transcribedVoice) inputSections.push(`### Voice Notes (Transcribed)\n${transcribedVoice}`);
  const rawInputs = inputSections.length
    ? inputSections.join('\n\n')
    : '(No specific inputs provided — use your best judgment to create a representative PRD.)';
  return `${instructions}\n\n## Raw Inputs\n\n${rawInputs}`;
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function callClaude(prompt, apiKey) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  return httpsRequest({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body).then(({ body: data }) => {
    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error(parsed.error.message);
    const text = parsed.content?.[0]?.text;
    if (!text) throw new Error('No content in Claude response');
    return text;
  });
}

function callOpenAI(prompt, apiKey) {
  const body = JSON.stringify({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  return httpsRequest({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body).then(({ body: data }) => {
    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error(parsed.error.message);
    const text = parsed.choices?.[0]?.message?.content;
    if (!text) throw new Error('No content in OpenAI response');
    return text;
  });
}

function callGemini(prompt, apiKey) {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return httpsRequest({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.5-flash:generateContent',
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body).then(({ body: data }) => {
    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error(parsed.error.message);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content in Gemini response');
    return text;
  });
}

function callModel(model, prompt, apiKey) {
  switch (model) {
    case 'openai': return callOpenAI(prompt, apiKey);
    case 'gemini': return callGemini(prompt, apiKey);
    default:       return callClaude(prompt, apiKey);
  }
}

function callWhisper(audioBuffer, mimeType, apiKey) {
  return new Promise((resolve, reject) => {
    const boundary = `----PRDMakerBoundary${Date.now().toString(16)}`;
    const ext      = (mimeType.split(';')[0].split('/')[1] || 'webm').replace('x-', '');
    const pre  = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const post = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`
    );
    const body = Buffer.concat([pre, audioBuffer, post]);
    httpsRequest({
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, body).then(({ body: data }) => {
      const parsed = JSON.parse(data);
      if (parsed.error) throw new Error(parsed.error.message);
      if (!parsed.text) throw new Error('No transcription returned by Whisper');
      resolve(parsed.text.trim());
    }).catch(reject);
  });
}

function callGeminiTranscribe(audioBase64, mimeType, apiKey) {
  const baseMime = mimeType.split(';')[0];
  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: baseMime, data: audioBase64 } },
        { text: 'Transcribe this audio accurately. Return only the transcribed text — no labels, no commentary, no timestamps, no formatting.' },
      ],
    }],
  });
  return httpsRequest({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.5-flash:generateContent',
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body).then(({ body: data }) => {
    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error(parsed.error.message);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No transcription returned by Gemini');
    return text.trim();
  });
}

function fetchFollowingRedirects(urlStr, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    let u;
    try { u = new URL(urlStr); } catch { return reject(new Error('Invalid URL')); }
    https.get({
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: { 'User-Agent': 'PRD-Maker/1.0' },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${u.protocol}//${u.host}${res.headers.location}`;
        fetchFollowingRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Request failed (HTTP ${res.statusCode}). Make sure the Google Doc is publicly shared.`));
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (data.trimStart().startsWith('<!DOCTYPE') || data.trimStart().startsWith('<html'))
          return reject(new Error('Document is private or not found. Share it publicly (Anyone with link → Viewer).'));
        resolve(data);
      });
    }).on('error', reject);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { buildPrompt, callModel, callWhisper, callGeminiTranscribe, fetchFollowingRedirects, cors };
