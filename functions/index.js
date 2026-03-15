const { onRequest } = require('firebase-functions/v2/https');
const express       = require('express');
const cors          = require('cors');
const https         = require('https');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '20mb' })); // 20 MB needed for base64 audio

// ── PRD prompt builder ──
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
- If any input section is absent, skip it and infer from available context.
- Use Markdown with clear headings and bullet points.
- Do not include commentary outside the PRD itself.`;

function buildPrompt({ roughContext, meetingNotes, actionItems, transcribedVoice, customInstructions }) {
  const instructions = (customInstructions || '').trim() || DEFAULT_INSTRUCTIONS;
  const sections = [];
  if (roughContext)     sections.push(`### Rough Context / Notes\n${roughContext}`);
  if (meetingNotes)     sections.push(`### Meeting Notes\n${meetingNotes}`);
  if (actionItems)      sections.push(`### Action Items\n${actionItems}`);
  if (transcribedVoice) sections.push(`### Voice Notes (Transcribed)\n${transcribedVoice}`);
  const rawInputs = sections.length
    ? sections.join('\n\n')
    : '(No specific inputs provided — use your best judgment to create a representative PRD.)';
  return `${instructions}\n\n## Raw Inputs\n\n${rawInputs}`;
}

// ── Model callers ──
function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function callClaude(prompt, apiKey) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = await httpsPost({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message);
  const text = parsed.content?.[0]?.text;
  if (!text) throw new Error('No content in Claude response');
  return text;
}

async function callOpenAI(prompt, apiKey) {
  const body = JSON.stringify({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = await httpsPost({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message);
  const text = parsed.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content in OpenAI response');
  return text;
}

async function callGemini(prompt, apiKey) {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  const raw = await httpsPost({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent',
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message);
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No content in Gemini response');
  return text;
}

function callModel(model, prompt, apiKey) {
  if (model === 'openai') return callOpenAI(prompt, apiKey);
  if (model === 'gemini') return callGemini(prompt, apiKey);
  return callClaude(prompt, apiKey);
}

// ── Whisper transcription ──
async function callWhisper(audioBuffer, mimeType, apiKey) {
  const boundary = `----PRDMakerBoundary${Date.now().toString(16)}`;
  const ext      = (mimeType.split(';')[0].split('/')[1] || 'webm').replace('x-', '');
  const pre  = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const post = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`
  );
  const body = Buffer.concat([pre, audioBuffer, post]);
  const raw = await httpsPost({
    hostname: 'api.openai.com',
    path: '/v1/audio/transcriptions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
  }, body);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message);
  if (!parsed.text) throw new Error('No transcription returned by Whisper');
  return parsed.text.trim();
}

// ── Gemini transcription ──
async function callGeminiTranscribe(audioBase64, mimeType, apiKey) {
  const baseMime = mimeType.split(';')[0];
  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: baseMime, data: audioBase64 } },
        { text: 'Transcribe this audio accurately. Return only the transcribed text — no labels, no commentary, no timestamps.' },
      ],
    }],
  });
  const raw = await httpsPost({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent',
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    },
  }, body);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message);
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No transcription returned by Gemini');
  return text.trim();
}

// ── Google Doc proxy ──
function fetchFollowingRedirects(urlStr, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('Invalid URL')); }
    https.get({ hostname: u.hostname, path: u.pathname + (u.search || ''), headers: { 'User-Agent': 'PRD-Maker/1.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http') ? res.headers.location : `${u.protocol}//${u.host}${res.headers.location}`;
        fetchFollowingRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} — make sure the doc is publicly shared.`)); }
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        if (data.trimStart().startsWith('<!DOCTYPE') || data.trimStart().startsWith('<html')) {
          return reject(new Error('Document is private or not found. Share it publicly (Anyone with link → Viewer).'));
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

// ── Routes ──
app.post('/api/generate-prd', async (req, res) => {
  try {
    const { model, apiKey, customInstructions, ...contentInputs } = req.body;
    const prd = await callModel(model, buildPrompt({ ...contentInputs, customInstructions }), apiKey);
    res.json({ prd });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/transcribe', async (req, res) => {
  const { model, apiKey, audioBase64, mimeType } = req.body;
  if (!audioBase64 || !apiKey) return res.status(400).json({ error: 'Missing audioBase64 or apiKey' });
  try {
    const text = model === 'gemini'
      ? await callGeminiTranscribe(audioBase64, mimeType || 'audio/webm', apiKey)
      : await callWhisper(Buffer.from(audioBase64, 'base64'), mimeType || 'audio/webm', apiKey);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/fetch-gdoc', async (req, res) => {
  const docId = req.query.id;
  if (!docId || !/^[a-zA-Z0-9_-]{10,}$/.test(docId)) return res.status(400).json({ error: 'Invalid or missing Google Doc ID' });
  try {
    const text = await fetchFollowingRedirects(`https://docs.google.com/document/d/${docId}/export?format=txt`);
    res.json({ text });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

exports.api = onRequest({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 120 }, app);
