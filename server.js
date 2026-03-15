const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// API keys are provided per-request from the client — no .env loading needed.
// NOTE: If ever deployed publicly, use HTTPS to protect keys in transit.

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

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

  // Only include input sections that have content
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

function callClaude(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content?.[0]?.text;
          if (!text) return reject(new Error('No content in Claude response'));
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse Claude response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function callOpenAI(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.choices?.[0]?.message?.content;
          if (!text) return reject(new Error('No content in OpenAI response'));
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.5-flash:generateContent',
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error('No content in Gemini response'));
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse Gemini response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function callModel(model, prompt, apiKey) {
  switch (model) {
    case 'openai': return callOpenAI(prompt, apiKey);
    case 'gemini': return callGemini(prompt, apiKey);
    default:       return callClaude(prompt, apiKey);
  }
}

// Fetches a URL, following redirects up to maxRedirects times.
function fetchFollowingRedirects(urlStr, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('Invalid URL')); }

    const opts = {
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      method: 'GET',
      headers: { 'User-Agent': 'PRD-Maker/1.0' },
    };

    https.get(opts, (res) => {
      const { statusCode, headers } = res;
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
        res.resume();
        const next = headers.location.startsWith('http')
          ? headers.location
          : `${u.protocol}//${u.host}${headers.location}`;
        fetchFollowingRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`Request failed (HTTP ${statusCode}). Make sure the Google Doc is publicly shared.`));
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (data.trimStart().startsWith('<!DOCTYPE') || data.trimStart().startsWith('<html')) {
          return reject(new Error('Document is private or not found. Share it publicly (Anyone with link → Viewer) and try again.'));
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

// ── Whisper (OpenAI) audio transcription ──
function callWhisper(audioBuffer, mimeType, apiKey) {
  return new Promise((resolve, reject) => {
    const boundary = `----PRDMakerBoundary${Date.now().toString(16)}`;
    const ext      = (mimeType.split(';')[0].split('/')[1] || 'webm').replace('x-', '');
    const filename = `audio.${ext}`;

    const pre  = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const post = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `whisper-1\r\n` +
      `--${boundary}--\r\n`
    );
    const body = Buffer.concat([pre, audioBuffer, post]);

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          if (!parsed.text) return reject(new Error('No transcription returned by Whisper'));
          resolve(parsed.text.trim());
        } catch (e) { reject(new Error('Failed to parse Whisper response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Gemini audio transcription ──
function callGeminiTranscribe(audioBase64, mimeType, apiKey) {
  return new Promise((resolve, reject) => {
    const baseMime = mimeType.split(';')[0]; // strip codec params

    const body = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: baseMime, data: audioBase64 } },
          { text: 'Transcribe this audio accurately. Return only the transcribed text — no labels, no commentary, no timestamps, no formatting.' },
        ],
      }],
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.5-flash:generateContent',
      method: 'POST',
      headers: {
        'x-goog-api-key':  apiKey,
        'content-type':    'application/json',
        'content-length':  Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error('No transcription returned by Gemini'));
          resolve(text.trim());
        } catch (e) { reject(new Error('Failed to parse Gemini transcription response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let filePath = path.join(__dirname, 'public', parsed.pathname === '/' ? 'index.html' : parsed.pathname);
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Google Doc proxy — fetches public doc as plain text to avoid browser CORS
  if (req.method === 'GET' && req.url.startsWith('/api/fetch-gdoc')) {
    const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const docId = params.get('id');
    if (!docId || !/^[a-zA-Z0-9_-]{10,}$/.test(docId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing Google Doc ID' }));
      return;
    }
    try {
      const text = await fetchFollowingRedirects(
        `https://docs.google.com/document/d/${docId}/export?format=txt`
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Audio transcription — routes to Whisper (openai) or Gemini based on model
  if (req.method === 'POST' && req.url === '/api/transcribe') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { model, apiKey, audioBase64, mimeType } = JSON.parse(body);
        if (!audioBase64 || !apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing audioBase64 or apiKey' }));
          return;
        }
        let text;
        if (model === 'gemini') {
          text = await callGeminiTranscribe(audioBase64, mimeType || 'audio/webm', apiKey);
        } else {
          // openai or claude (caller decides to use Whisper)
          const audioBuf = Buffer.from(audioBase64, 'base64');
          text = await callWhisper(audioBuf, mimeType || 'audio/webm', apiKey);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate-prd') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { model, apiKey, customInstructions, ...contentInputs } = JSON.parse(body);
        const prompt = buildPrompt({ ...contentInputs, customInstructions });
        const prd = await callModel(model, prompt, apiKey);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ prd }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`PRD Maker running at http://localhost:${PORT}`);
  console.log('  API keys are supplied per-request from the client UI.');
});
