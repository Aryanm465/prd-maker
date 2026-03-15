// ── PDF.js worker (must match library version in index.html) ──
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── PRD Type Prompt Presets ──
const PRD_PROMPTS = {
  standard: `You are a senior product manager. Using the raw inputs below, produce a complete, professional Product Requirements Document (PRD) in Markdown format.

## Instructions
- Structure the PRD with these sections:
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
- Do not include commentary outside the PRD itself.`,

  lean: `You are a product manager at a fast-moving startup. Create a concise Lean PRD in Markdown focused on shipping fast and validating assumptions.

## Instructions
- Keep it short and scannable — prioritise clarity over completeness.
- Structure:
  1. Problem & Target User (2-3 sentences)
  2. Value Proposition (one sentence)
  3. MVP Scope — 3-5 core features only
  4. User Hypotheses & Assumptions
  5. Success Metrics (learn-oriented)
  6. Out of Scope (explicitly listed)
  7. Open Questions / Next Validation Steps
- Avoid padding. If a section has nothing to say, skip it.
- Infer from available inputs; do not ask for more information.
- Do not include commentary outside the PRD itself.`,

  enterprise: `You are a senior product manager at an enterprise software company. Produce a formal, comprehensive PRD in Markdown suitable for executive review and engineering sign-off.

## Instructions
- Include a document header: title, version, date (today), status.
- Structure:
  1. Executive Summary & Strategic Alignment
  2. Problem Statement & Business Objectives
  3. Stakeholders & RACI
  4. Target User Personas
  5. Detailed Functional Requirements (MoSCoW prioritised)
  6. Non-Functional Requirements (performance, scalability, reliability SLAs)
  7. Security, Compliance & Privacy Requirements
  8. Integration & Migration Plan
  9. Rollout & Change Management Strategy
  10. Success Metrics & KPIs
  11. Assumptions, Constraints & Dependencies
  12. Out of Scope
  13. Risks & Mitigations
  14. Open Questions & Decisions Required
- Write formally with complete sentences. Infer enterprise-grade detail where inputs are sparse.
- Do not include commentary outside the PRD itself.`,

  technical: `You are a technical product manager bridging product and engineering. Create a Technical Specification PRD in Markdown written for a senior engineering audience.

## Instructions
- Structure:
  1. Technical Overview & Architecture Notes
  2. System Context & Integration Points
  3. API Contracts (endpoints, methods, request/response shapes, error codes)
  4. Data Models & Schema Changes
  5. Performance & Scalability Requirements (latency targets, throughput, load)
  6. Security & Authentication Requirements
  7. Error Handling, Edge Cases & Failure Modes
  8. Observability — Logging, Metrics, Alerting
  9. Testing Strategy & Acceptance Criteria
  10. Deployment & Configuration Guide
  11. Backward Compatibility & Deprecation Notes
  12. Open Technical Questions
- Use code-style formatting (backticks) for field names, endpoints, and values.
- Infer sensible technical defaults where inputs are vague.
- Do not include commentary outside the PRD itself.`,

  onepager: `You are a product strategist writing for time-constrained executives. Create a crisp One-Pager PRD in Markdown — maximum one printed page.

## Instructions
- Structure:
  1. Headline — one punchy sentence describing what this is
  2. Problem (2 sentences max)
  3. Solution Overview (2 sentences max)
  4. Target User / Market (1 sentence)
  5. Key Requirements — 3-5 bullet points only
  6. Success Metrics — 2-3 measurable outcomes
  7. Investment Required (time, team, cost — estimate if unknown)
  8. Timeline / Urgency
  9. Key Risks (2-3 bullets)
  10. Recommended Next Steps
- Every sentence must earn its place. Cut ruthlessly.
- Infer from available inputs. Do not ask for more.
- Do not include commentary outside the PRD itself.`,

  userstory: `You are an agile product manager. Create a User Story-driven PRD in Markdown organised around user journeys and acceptance criteria.

## Instructions
- Structure:
  1. Product Vision & Goals
  2. User Personas (brief)
  3. User Journey Overview (narrative flow)
  4. Epics & User Stories
     - Group stories by Epic
     - Each story: "As a [persona], I want to [action] so that [outcome]"
     - Each story includes Acceptance Criteria (Given / When / Then or bullet list)
     - Label each story: Must Have / Should Have / Nice to Have
  5. Definition of Done
  6. Dependencies & Blockers
  7. Success Metrics & KPIs
  8. Release / Sprint Sequencing
- Infer personas and journeys from available inputs.
- Do not include commentary outside the PRD itself.`,

  feature: `You are a product manager writing a focused Feature PRD in Markdown for a single capability within an existing product.

## Instructions
- Structure:
  1. Feature Overview & Purpose
  2. Problem Being Solved
  3. Target User Segment
  4. Detailed Feature Requirements
  5. User Stories & Workflows
  6. UX/Design Considerations
  7. Technical Implementation Notes
  8. Acceptance Criteria & Definition of Done
  9. Success Metrics for Feature Adoption
  10. Dependencies & Integration Points
  11. Out of Scope
  12. Timeline & Milestones
- Stay tightly scoped to the feature. Do not expand to a full product PRD.
- Infer reasonable details where inputs are vague.
- Do not include commentary outside the PRD itself.`,

  custom: `You are a senior product manager. Using the raw inputs below, produce a Product Requirements Document (PRD) in Markdown format.

## Instructions
- Adapt the structure to best fit the inputs provided.
- Be specific, actionable, and clear.
- Use Markdown with headings and bullet points.
- Do not include commentary outside the PRD itself.`,
};

// ── DOM refs ──
const roughContext     = document.getElementById('rough-context');
const meetingNotes     = document.getElementById('meeting-notes');
const actionItems      = document.getElementById('action-items');
const transcribedVoice = document.getElementById('transcribed-voice');
const recordBtn        = document.getElementById('record-btn');
const recordLabel      = recordBtn.querySelector('.record-label');
const voiceStatus      = document.getElementById('voice-status');
const voiceUnavailable  = document.getElementById('voice-unavailable');
const voiceModelHint    = document.getElementById('voice-model-hint');
const generateBtn      = document.getElementById('generate-btn');
const inputError       = document.getElementById('input-error');
const outputArea       = document.getElementById('output-area');
const editTextarea     = document.getElementById('edit-textarea');
const loadingEl        = document.getElementById('loading');
const outputError      = document.getElementById('output-error');
const outputToolbar    = document.getElementById('output-toolbar');
const copyBtn          = document.getElementById('copy-btn');
const exportBtn        = document.getElementById('export-btn');
const exportMenu       = document.getElementById('export-menu');
const previewBtn       = document.getElementById('preview-btn');
const editBtn          = document.getElementById('edit-btn');
const modelSelect      = document.getElementById('model-select');
const apiKeyInput      = document.getElementById('api-key-input');
const toggleKeyBtn     = document.getElementById('toggle-key-btn');
const statusDot        = document.getElementById('status-dot');
const statusLabel      = document.getElementById('status-label');
const footerProvider   = document.getElementById('footer-provider');
const loadingProvider  = document.getElementById('loading-provider');
const systemPromptEl   = document.getElementById('system-prompt');
const resetPromptBtn   = document.getElementById('reset-prompt-btn');
const prdTypePills     = document.getElementById('prd-type-pills');
const darkModeBtn      = document.getElementById('dark-mode-btn');

let rawPrdText  = '';
let outputMode  = 'preview';
let activePrdType = 'standard';

marked.use({ gfm: true, breaks: false });

// ── Model labels ──
const MODEL_LABELS = {
  claude: 'Claude 4.6 Sonnet',
  openai: 'OpenAI GPT-4o',
  gemini: 'Gemini 2.5 Flash',
};
function updateProviderLabels() {
  const label = MODEL_LABELS[modelSelect.value] || MODEL_LABELS.claude;
  footerProvider.textContent  = label;
  loadingProvider.textContent = label;
}

function updateVoiceHint() {
  const model = modelSelect.value;
  if (model === 'openai') {
    voiceModelHint.textContent = 'Uses OpenAI Whisper — high-quality transcription.';
    voiceModelHint.className = 'voice-model-hint';
  } else if (model === 'gemini') {
    voiceModelHint.textContent = 'Uses Gemini 2.5 Flash audio understanding — high-quality transcription.';
    voiceModelHint.className = 'voice-model-hint';
  } else {
    voiceModelHint.textContent = 'Claude has no audio API — using browser speech recognition (Chrome/Edge only). Switch to OpenAI or Gemini for better quality.';
    voiceModelHint.className = 'voice-model-hint warn';
  }
}

// ── Key status dot ──
function setKeyStatus(state) {
  statusDot.dataset.status = state;
  statusLabel.textContent  = { empty: 'No key', pending: 'Key entered', ok: 'Connected', error: 'Auth failed' }[state] || '';
}

// ── Restore from localStorage ──
{
  const savedModel = localStorage.getItem('prd_model');
  const savedKey   = localStorage.getItem('prd_api_key');
  const savedType  = localStorage.getItem('prd_type');
  if (savedModel) modelSelect.value = savedModel;
  if (savedKey)   apiKeyInput.value = savedKey;
  updateProviderLabels();
  updateVoiceHint();
  setKeyStatus(apiKeyInput.value.trim() ? 'pending' : 'empty');

  // Restore PRD type
  if (savedType && PRD_PROMPTS[savedType]) activePrdType = savedType;
  applyPrdType(activePrdType);
}

// Restore drafts
const DRAFT_KEYS = ['rough-context', 'meeting-notes', 'action-items', 'transcribed-voice'];
DRAFT_KEYS.forEach(id => {
  const saved = localStorage.getItem(`prd_draft_${id}`);
  if (saved) document.getElementById(id).value = saved;
});
// Save drafts on input (debounced)
let draftTimer = null;
document.querySelectorAll('#rough-context,#meeting-notes,#action-items,#transcribed-voice')
  .forEach(ta => {
    ta.addEventListener('input', () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => {
        localStorage.setItem(`prd_draft_${ta.id}`, ta.value);
      }, 800);
    });
  });

document.getElementById('clear-drafts-btn').addEventListener('click', () => {
  DRAFT_KEYS.forEach(id => {
    localStorage.removeItem(`prd_draft_${id}`);
    document.getElementById(id).value = '';
  });
});

// Dark mode
const prefersDark = localStorage.getItem('prd_theme') === 'dark' ||
  (!localStorage.getItem('prd_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
if (prefersDark) document.documentElement.dataset.theme = 'dark';
darkModeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? '' : 'dark';
  localStorage.setItem('prd_theme', isDark ? 'light' : 'dark');
});

// ── Model / key listeners ──
modelSelect.addEventListener('change', () => {
  localStorage.setItem('prd_model', modelSelect.value);
  updateProviderLabels();
  updateVoiceHint();
});
apiKeyInput.addEventListener('input', () => {
  localStorage.setItem('prd_api_key', apiKeyInput.value);
  setKeyStatus(apiKeyInput.value.trim() ? 'pending' : 'empty');
});
toggleKeyBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleKeyBtn.innerHTML = '&#128584;';
  } else {
    apiKeyInput.type = 'password';
    toggleKeyBtn.innerHTML = '&#128065;';
  }
});

// ── PRD type pills ──
prdTypePills.addEventListener('click', (e) => {
  const pill = e.target.closest('.prd-pill');
  if (!pill) return;
  const type = pill.dataset.type;
  applyPrdType(type);
  localStorage.setItem('prd_type', type);
});

function applyPrdType(type) {
  activePrdType = type;
  // Update pill active state
  document.querySelectorAll('.prd-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.type === type);
  });
  // Load prompt — unless user is on 'custom' and has edited it
  if (type !== 'custom' || systemPromptEl.dataset.userEdited !== 'true') {
    systemPromptEl.value = PRD_PROMPTS[type] || PRD_PROMPTS.custom;
    systemPromptEl.dataset.userEdited = 'false';
  }
}

// Mark prompt as user-edited when they type in it (while on a preset type)
systemPromptEl.addEventListener('input', () => {
  systemPromptEl.dataset.userEdited = 'true';
});

resetPromptBtn.addEventListener('click', () => {
  systemPromptEl.value = PRD_PROMPTS[activePrdType] || PRD_PROMPTS.custom;
  systemPromptEl.dataset.userEdited = 'false';
});

// ── Character counters ──
const WARN_THRESHOLD = 8000;
document.querySelectorAll('textarea').forEach(ta => {
  const countEl = document.querySelector(`.char-count[data-for="${ta.id}"]`);
  if (!countEl) return;
  ta.addEventListener('input', () => {
    const len = ta.value.length;
    countEl.textContent = len ? `${len.toLocaleString()} chars` : '';
    countEl.classList.toggle('warn', len >= WARN_THRESHOLD);
  });
});

// Collapsible input cards
document.querySelector('.inputs-panel').addEventListener('click', e => {
  const btn = e.target.closest('.card-collapse-btn');
  if (!btn) return;
  const card = btn.closest('.card');
  const body = card.querySelector('.card-body');
  const isCollapsed = body.classList.toggle('collapsed');
  btn.classList.toggle('collapsed', isCollapsed);
  btn.setAttribute('aria-expanded', String(!isCollapsed));
  if (card.dataset.cardId) {
    localStorage.setItem(`prd_collapsed_${card.dataset.cardId}`, isCollapsed);
  }
});
// Restore collapsed state
document.querySelectorAll('.card[data-card-id]').forEach(card => {
  const isCollapsed = localStorage.getItem(`prd_collapsed_${card.dataset.cardId}`) === 'true';
  if (isCollapsed) {
    card.querySelector('.card-body')?.classList.add('collapsed');
    const btn = card.querySelector('.card-collapse-btn');
    if (btn) { btn.classList.add('collapsed'); btn.setAttribute('aria-expanded', 'false'); }
  }
});

// ── Voice input ──
// OpenAI/Gemini → MediaRecorder + API transcription (high quality, all browsers)
// Claude         → Web Speech API fallback (Chrome/Edge only, lower quality)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition      = null;
let wsrFinalText     = ''; // Web Speech API accumulated transcript
let mediaRecorder    = null;
let audioChunks      = [];
let isRecording      = false;
let recordingTimerId = null;
let recordingSeconds = 0;

// Initialise Web Speech API for Claude fallback
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous     = true;
  recognition.interimResults = true;
  recognition.lang           = 'en-US';

  recognition.onstart  = () => { voiceStatus.textContent = 'Listening…'; };
  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) wsrFinalText += t + ' ';
      else interim = t;
    }
    transcribedVoice.value = wsrFinalText + interim;
    transcribedVoice.dispatchEvent(new Event('input'));
  };
  recognition.onerror = (e) => {
    const msgs = { 'not-allowed': 'Mic access denied.', 'no-speech': 'No speech detected.', 'audio-capture': 'No microphone found.' };
    voiceStatus.textContent = msgs[e.error] || `Error: ${e.error}`;
    stopRecording();
  };
  recognition.onend = () => {
    if (isRecording && modelSelect.value === 'claude') recognition.start();
    else if (!isRecording) voiceStatus.textContent = wsrFinalText ? 'Done.' : '';
  };
}

recordBtn.addEventListener('click', () => {
  if (isRecording) stopRecording(); else startRecording();
});

async function startRecording() {
  const model = modelSelect.value;

  if (model === 'claude') {
    // Web Speech API fallback
    if (!SpeechRecognition) {
      voiceUnavailable.hidden = false;
      return;
    }
    wsrFinalText = '';
    isRecording  = true;
    recordBtn.classList.add('recording');
    recordLabel.textContent = 'Stop';
    voiceStatus.textContent = 'Starting…';
    recognition.start();
    return;
  }

  // MediaRecorder path for OpenAI / Gemini
  if (!navigator.mediaDevices?.getUserMedia) {
    voiceStatus.textContent = 'Microphone API not available in this browser.';
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    voiceStatus.textContent = `Mic error: ${err.message}`;
    return;
  }

  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', '']
    .find(t => t === '' || MediaRecorder.isTypeSupported(t));

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  audioChunks   = [];

  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    clearInterval(recordingTimerId);
    await transcribeWithApi(mediaRecorder.mimeType || 'audio/webm');
  };

  mediaRecorder.start(250);
  isRecording      = true;
  recordingSeconds = 0;
  recordBtn.classList.add('recording');
  recordLabel.textContent = 'Stop';

  recordingTimerId = setInterval(() => {
    recordingSeconds++;
    const m = Math.floor(recordingSeconds / 60);
    const s = String(recordingSeconds % 60).padStart(2, '0');
    voiceStatus.textContent = `Recording ${m}:${s}`;
  }, 1000);
  voiceStatus.textContent = 'Recording 0:00';
}

function stopRecording() {
  isRecording = false;
  recordBtn.classList.remove('recording');
  recordLabel.textContent = 'Record';
  clearInterval(recordingTimerId);

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop(); // triggers onstop → transcribeWithApi
  } else if (recognition) {
    try { recognition.stop(); } catch (_) {}
  }
}

async function transcribeWithApi(mimeType) {
  const model  = modelSelect.value;
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    voiceStatus.textContent = 'No API key — transcription skipped.';
    return;
  }

  const providerName = model === 'gemini' ? 'Gemini' : 'Whisper';
  voiceStatus.textContent = `Transcribing with ${providerName}…`;
  recordBtn.disabled = true;

  try {
    const blob   = new Blob(audioChunks, { type: mimeType });
    const base64 = await blobToBase64(blob);

    const res  = await fetch('/api/transcribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, apiKey, audioBase64: base64, mimeType }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Append to existing content if present
    const existing = transcribedVoice.value.trim();
    transcribedVoice.value = existing ? existing + ' ' + data.text : data.text;
    transcribedVoice.dispatchEvent(new Event('input'));
    voiceStatus.textContent = `Transcribed with ${providerName} ✓`;
    setTimeout(() => { voiceStatus.textContent = ''; }, 4000);
  } catch (err) {
    voiceStatus.textContent = `Transcription failed: ${err.message}`;
  } finally {
    recordBtn.disabled = false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// ── File import ──
async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt')  return file.text();
  if (ext === 'pdf') {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not loaded');
    if (file.size > 20_000_000) throw new Error('PDF too large (> 20 MB)');
    const buf  = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const ct   = await page.getTextContent();
      pages.push(ct.items.map(item => item.str).join(' '));
    }
    return pages.join('\n');
  }
  if (ext === 'docx') {
    if (typeof mammoth === 'undefined') throw new Error('mammoth.js not loaded');
    if (file.size > 20_000_000) throw new Error('File too large (> 20 MB)');
    const buf    = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  throw new Error(`Unsupported file type .${ext}. Use .pdf, .docx, or .txt`);
}

function appendToTextarea(ta, text) {
  ta.value = ta.value.trim() ? ta.value.trim() + '\n\n' + text : text;
  ta.dispatchEvent(new Event('input'));
}

function setImportStatus(targetId, msg, type) {
  const el = document.querySelector(`.import-status[data-for="${targetId}"]`);
  if (!el) return;
  el.textContent = msg;
  el.className = `import-status ${type || ''}`;
  if (type === 'ok') setTimeout(() => { el.textContent = ''; el.className = 'import-status'; }, 3000);
}

// File upload buttons
document.querySelectorAll('.import-btn[data-action="file"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector(`.file-input[data-target="${btn.dataset.target}"]`)?.click();
  });
});

document.querySelectorAll('.file-input').forEach(input => {
  input.addEventListener('change', async () => {
    const targetId = input.dataset.target;
    const ta = document.getElementById(targetId);
    const file = input.files[0];
    if (!file || !ta) return;
    setImportStatus(targetId, `Reading ${file.name}…`, '');
    try {
      appendToTextarea(ta, await extractTextFromFile(file));
      setImportStatus(targetId, `Imported ${file.name}`, 'ok');
    } catch (err) {
      setImportStatus(targetId, err.message, 'err');
    }
    input.value = '';
  });
});

// Google Doc toggle
document.querySelectorAll('.import-btn[data-action="gdoc"]').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = document.querySelector(`.gdoc-row[data-for="${btn.dataset.target}"]`);
    if (!row) return;
    row.hidden = !row.hidden;
    btn.classList.toggle('active', !row.hidden);
    if (!row.hidden) row.querySelector('.gdoc-url-input').focus();
  });
});

document.querySelectorAll('.gdoc-import-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const targetId = btn.dataset.target;
    const ta  = document.getElementById(targetId);
    const row = document.querySelector(`.gdoc-row[data-for="${targetId}"]`);
    const inp = row.querySelector('.gdoc-url-input');
    const raw = inp.value.trim();
    if (!raw) return;

    const match = raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    const docId = match ? match[1] : (/^[a-zA-Z0-9_-]{10,}$/.test(raw) ? raw : null);
    if (!docId) { setImportStatus(targetId, 'Invalid Google Doc URL', 'err'); return; }

    btn.disabled = true;
    btn.textContent = 'Importing…';
    setImportStatus(targetId, 'Fetching doc…', '');
    try {
      const res  = await fetch(`/api/fetch-gdoc?id=${encodeURIComponent(docId)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      appendToTextarea(ta, data.text);
      setImportStatus(targetId, 'Google Doc imported', 'ok');
      inp.value = '';
      row.hidden = true;
      document.querySelector(`.import-btn[data-action="gdoc"][data-target="${targetId}"]`)?.classList.remove('active');
    } catch (err) {
      setImportStatus(targetId, err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Import';
    }
  });
});

// ── Output mode ──
function setOutputMode(mode) {
  outputMode = mode;
  if (mode === 'edit') {
    editTextarea.value = rawPrdText;
    outputArea.style.display = 'none';
    editTextarea.hidden = false;
    editBtn.classList.add('active');
    previewBtn.classList.remove('active');
  } else {
    rawPrdText = editTextarea.value || rawPrdText;
    renderPrd(rawPrdText);
    outputArea.style.display = 'block';
    editTextarea.hidden = true;
    previewBtn.classList.add('active');
    editBtn.classList.remove('active');
  }
}
previewBtn.addEventListener('click', () => setOutputMode('preview'));
editBtn.addEventListener('click',    () => setOutputMode('edit'));
editTextarea.addEventListener('input', () => { rawPrdText = editTextarea.value; updateWordCount(editTextarea.value); });

// ── Generate PRD ──
generateBtn.addEventListener('click', async () => {
  inputError.hidden  = true;
  outputError.hidden = true;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    inputError.textContent = 'Please enter your API key in the top bar.';
    inputError.hidden = false;
    apiKeyInput.focus();
    return;
  }

  const inputs = {
    roughContext:     roughContext.value.trim(),
    meetingNotes:     meetingNotes.value.trim(),
    actionItems:      actionItems.value.trim(),
    transcribedVoice: transcribedVoice.value.trim(),
  };

  if (!inputs.roughContext && !inputs.meetingNotes && !inputs.actionItems && !inputs.transcribedVoice) {
    inputError.textContent = 'Please fill in at least one input field.';
    inputError.hidden = false;
    return;
  }

  const customInstructions = systemPromptEl.value.trim();

  outputArea.style.display = 'none';
  editTextarea.hidden       = true;
  outputToolbar.hidden      = true;
  loadingEl.hidden          = false;
  outputError.hidden        = true;
  generateBtn.disabled      = true;

  try {
    const res  = await fetch('/api/generate-prd', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: modelSelect.value, apiKey, customInstructions, ...inputs }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`);

    rawPrdText = data.prd;
    setOutputMode('preview');
    outputToolbar.hidden = false;
    if (firebaseReady) savePrdBtn.hidden = false;
    setKeyStatus('ok');
  } catch (err) {
    outputError.textContent = `Generation failed: ${err.message}`;
    outputError.hidden  = false;
    outputArea.style.display = 'block';
    setKeyStatus('error');
  } finally {
    loadingEl.hidden     = true;
    generateBtn.disabled = false;
  }
});

// ── Markdown renderer ──
function markdownToHtml(md) {
  return marked.parse(md);
}

const wordCountEl = document.getElementById('word-count');
function updateWordCount(text) {
  if (!wordCountEl) return;
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCountEl.textContent = count ? `${count.toLocaleString()} words` : '';
}

function renderPrd(md) {
  outputArea.innerHTML = `<div class="prd-content">${markdownToHtml(md)}</div>`;
  updateWordCount(md);
}

// ── Copy ──
copyBtn.addEventListener('click', async () => {
  const text = outputMode === 'edit' ? editTextarea.value : rawPrdText;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '✓ Copied';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  } catch { copyBtn.textContent = 'Failed'; }
});

// ── Export dropdown ──
exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.hidden = !exportMenu.hidden;
});
document.addEventListener('click', (e) => {
  if (!exportBtn.closest('.export-wrap').contains(e.target)) exportMenu.hidden = true;
});
exportMenu.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-export]');
  if (!li) return;
  exportMenu.hidden = true;
  exportPrd(li.dataset.export);
});

const EXPORT_CSS = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:780px;margin:2.5rem auto;padding:0 1.5rem;color:#09090b;line-height:1.7}h1{font-size:1.4rem;font-weight:800;border-bottom:2px solid #eff6ff;padding-bottom:.5rem;color:#2563eb;margin:0 0 1rem}h2{font-size:1rem;font-weight:700;margin:1.5rem 0 .4rem}h3{font-size:.92rem;font-weight:600;margin:1rem 0 .3rem;color:#52525b}p{margin:.35rem 0 .65rem}ul,ol{padding-left:1.35rem;margin:.3rem 0 .65rem}li{margin-bottom:.25rem}code{background:#f4f4f5;border-radius:4px;padding:.1em .35em;font-size:.84em;font-family:'SF Mono','Fira Code',monospace}hr{border:none;border-top:1px solid #e4e4e7;margin:1.1rem 0}strong{font-weight:700}em{font-style:italic}`;

function exportPrd(format) {
  const text = outputMode === 'edit' ? editTextarea.value : rawPrdText;
  if (format === 'md')    return download('prd.md', text, 'text/markdown');
  if (format === 'txt')   return download('prd.txt', text, 'text/plain');
  if (format === 'html') {
    const body = markdownToHtml(text);
    return download('prd.html', `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>PRD</title><style>${EXPORT_CSS}</style></head><body>${body}</body></html>`, 'text/html');
  }
  if (format === 'print') {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PRD</title><style>${EXPORT_CSS}@media print{body{margin:0}}</style></head><body>${markdownToHtml(text)}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
}

function download(filename, content, mimeType) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type: mimeType })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Firebase / Firestore ──
// All Firebase UI is hidden when firebase-config.js has placeholder values.

const projectBar          = document.getElementById('project-bar');
const currentProjectNameEl= document.getElementById('current-project-name');
const projectNameBtn      = document.getElementById('project-name-btn');
const projectDropdown     = document.getElementById('project-dropdown');
const projectList         = document.getElementById('project-list');
const newProjectBtn       = document.getElementById('new-project-btn');
const syncDot             = document.getElementById('sync-dot');
const savePrdBtn          = document.getElementById('save-prd-btn');
const libraryToggleBtn    = document.getElementById('library-toggle-btn');
const libraryPanel        = document.getElementById('library-panel');
const libraryList         = document.getElementById('library-list');
const libraryEmpty        = document.getElementById('library-empty');
const libraryCount        = document.getElementById('library-count');

let firebaseReady    = false;
let currentUid       = null;
let currentProjectId = null;
let currentProjectName = '';
let libraryOpen      = false;
let db               = null;
let fbAuth           = null;

function isFirebaseConfigured() {
  const cfg = window.FIREBASE_CONFIG;
  return cfg && cfg.projectId && !cfg.projectId.startsWith('YOUR_');
}

function setSyncDot(status) {
  // status: 'idle' | 'saving' | 'ok' | 'error'
  syncDot.dataset.status = status;
}

function revealFirebaseUI() {
  projectBar.hidden      = false;
  savePrdBtn.hidden      = false;
  libraryToggleBtn.hidden = false;
}

// ── Project helpers ──
function projectsRef() {
  return db.collection('users').doc(currentUid).collection('projects');
}
function prdsRef(pid) {
  return db.collection('users').doc(currentUid).collection('projects').doc(pid).collection('prds');
}

async function ensureDefaultProject() {
  const snap = await projectsRef().orderBy('createdAt').limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    currentProjectId   = doc.id;
    currentProjectName = doc.data().name || 'Default';
  } else {
    const ref = await projectsRef().add({ name: 'Default', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    currentProjectId   = ref.id;
    currentProjectName = 'Default';
  }
  currentProjectNameEl.textContent = currentProjectName;
}

async function renderProjectBar() {
  const snap = await projectsRef().orderBy('createdAt').get();
  projectList.innerHTML = '';
  snap.forEach(doc => {
    const li = document.createElement('li');
    li.className = doc.id === currentProjectId ? 'active' : '';
    li.dataset.pid = doc.id;
    li.innerHTML = `<span class="proj-item-name">${escHtml(doc.data().name)}</span>
      <div class="proj-item-btns">
        <button class="proj-icon-btn project-rename-btn" data-pid="${doc.id}" title="Rename">&#9998;</button>
        <button class="proj-icon-btn danger project-delete-btn" data-pid="${doc.id}" title="Delete">&#10005;</button>
      </div>`;
    projectList.appendChild(li);
  });
}

async function switchProject(pid, name) {
  currentProjectId   = pid;
  currentProjectName = name;
  currentProjectNameEl.textContent = name;
  projectDropdown.hidden = true;
  if (libraryOpen) await loadLibrary();
}

async function createProject() {
  const name = await showNameModal('New project name');
  if (!name) return;
  setSyncDot('saving');
  try {
    const ref = await projectsRef().add({ name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await switchProject(ref.id, name);
    await renderProjectBar();
    setSyncDot('ok');
    setTimeout(() => setSyncDot('idle'), 1500);
  } catch (err) {
    console.error(err);
    setSyncDot('error');
  }
}

async function renameProject(pid) {
  const current = projectList.querySelector(`[data-pid="${pid}"] .proj-item-name`)?.textContent || '';
  const name = await showNameModal('Rename project', current);
  if (!name) return;
  setSyncDot('saving');
  try {
    await projectsRef().doc(pid).update({ name });
    if (pid === currentProjectId) {
      currentProjectName = name;
      currentProjectNameEl.textContent = name;
    }
    await renderProjectBar();
    setSyncDot('ok');
    setTimeout(() => setSyncDot('idle'), 1500);
  } catch (err) {
    console.error(err);
    setSyncDot('error');
  }
}

async function deleteProject(pid) {
  const snap = await projectsRef().get();
  if (snap.size <= 1) { await showConfirmModal('You need at least one project. Create another first before deleting this one.', 'Got it', true); return; }
  const ok = await showConfirmModal('Delete this project and all its saved PRDs?');
  if (!ok) return;

  setSyncDot('saving');
  try {
    // Delete all PRDs in sub-collection first
    const prdSnap = await prdsRef(pid).get();
    const batch = db.batch();
    prdSnap.forEach(d => batch.delete(d.ref));
    batch.delete(projectsRef().doc(pid));
    await batch.commit();

    // If we deleted the active project, switch to first available
    if (pid === currentProjectId) {
      const remaining = await projectsRef().orderBy('createdAt').limit(1).get();
      if (!remaining.empty) {
        const d = remaining.docs[0];
        await switchProject(d.id, d.data().name || 'Default');
      }
    }
    await renderProjectBar();
    setSyncDot('ok');
    setTimeout(() => setSyncDot('idle'), 1500);
  } catch (err) {
    console.error(err);
    setSyncDot('error');
  }
}

// ── Project bar interactions ──
projectNameBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!firebaseReady) return;
  if (projectDropdown.hidden) {
    await renderProjectBar();
    projectDropdown.hidden = false;
  } else {
    projectDropdown.hidden = true;
  }
});

document.addEventListener('click', (e) => {
  if (!projectDropdown.hidden && !projectBar.contains(e.target)) {
    projectDropdown.hidden = true;
  }
});

projectList.addEventListener('click', async (e) => {
  const renameBtn = e.target.closest('.project-rename-btn');
  const deleteBtn = e.target.closest('.project-delete-btn');
  const item      = e.target.closest('li');
  if (!item) return;
  const pid = item.dataset.pid;

  if (renameBtn) { e.stopPropagation(); await renameProject(pid); return; }
  if (deleteBtn) { e.stopPropagation(); await deleteProject(pid); return; }
  const name = item.querySelector('.proj-item-name').textContent;
  await switchProject(pid, name);
  await renderProjectBar();
  projectDropdown.hidden = true;
});

newProjectBtn.addEventListener('click', async () => {
  projectDropdown.hidden = true;
  await createProject();
});

// ── PRD Library ──
async function savePrd() {
  if (!firebaseReady || !rawPrdText) return;
  setSyncDot('saving');
  savePrdBtn.disabled = true;
  try {
    const title = rawPrdText.match(/^#+ (.+)/m)?.[1]?.trim() || 'Untitled PRD';
    await prdsRef(currentProjectId).add({
      title,
      content: rawPrdText,
      model:   modelSelect.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    savePrdBtn.textContent = 'Saved ✓';
    setTimeout(() => { savePrdBtn.textContent = 'Save'; }, 2000);
    setSyncDot('ok');
    setTimeout(() => setSyncDot('idle'), 1500);
    if (libraryOpen) await loadLibrary();
  } catch (err) {
    console.error(err);
    setSyncDot('error');
    savePrdBtn.textContent = 'Save failed';
    setTimeout(() => { savePrdBtn.textContent = 'Save'; }, 2500);
  } finally {
    savePrdBtn.disabled = false;
  }
}

async function loadLibrary() {
  libraryList.innerHTML = '';
  libraryEmpty.hidden   = true;
  libraryCount.textContent = '';

  try {
    const snap = await prdsRef(currentProjectId).orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      libraryEmpty.hidden = false;
      libraryCount.textContent = '';
      return;
    }
    libraryCount.textContent = `${snap.size} saved`;
    snap.forEach(doc => libraryList.appendChild(buildLibraryItem(doc)));
  } catch (err) {
    console.error(err);
  }
}

function buildLibraryItem(doc) {
  const data = doc.data();
  const li   = document.createElement('li');
  li.className = 'library-item';
  const date = data.createdAt?.toDate?.()
    ? data.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  li.innerHTML = `
    <div class="lib-item-info">
      <span class="lib-item-title">${escHtml(data.title || 'Untitled PRD')}</span>
      <span class="lib-item-meta">${escHtml(MODEL_LABELS[data.model] || data.model || '')}${date ? ' · ' + date : ''}</span>
    </div>
    <div class="lib-item-actions">
      <button class="lib-btn lib-load-btn" data-id="${doc.id}">Load</button>
      <button class="lib-btn lib-rename-btn" data-id="${doc.id}">Rename</button>
      <button class="lib-btn lib-del-btn"  data-id="${doc.id}">Delete</button>
    </div>`;
  li.querySelector('.lib-load-btn').addEventListener('click', () => loadPrd(doc.id, data.content));
  li.querySelector('.lib-rename-btn').addEventListener('click', () => renamePrd(doc.id, data.title, li));
  li.querySelector('.lib-del-btn').addEventListener('click',  () => deletePrd(doc.id, li));
  return li;
}

function loadPrd(id, content) {
  rawPrdText = content;
  setOutputMode('preview');
  outputToolbar.hidden = false;
  if (libraryOpen) toggleLibrary();
}

async function deletePrd(id, liEl) {
  if (!await showConfirmModal('Delete this PRD? This cannot be undone.')) return;
  setSyncDot('saving');
  try {
    await prdsRef(currentProjectId).doc(id).delete();
    liEl.remove();
    const remaining = libraryList.querySelectorAll('.library-item').length;
    if (remaining === 0) libraryEmpty.hidden = false;
    libraryCount.textContent = remaining ? `${remaining} saved` : '';
    setSyncDot('ok');
    setTimeout(() => setSyncDot('idle'), 1500);
  } catch (err) {
    console.error(err);
    setSyncDot('error');
  }
}

async function renamePrd(id, currentTitle, liEl) {
  const name = await showNameModal('Rename PRD', currentTitle);
  if (!name) return;
  setSyncDot('saving');
  try {
    await prdsRef(currentProjectId).doc(id).update({ title: name });
    liEl.querySelector('.lib-item-title').textContent = name;
    setSyncDot('ok');
    setTimeout(() => setSyncDot('idle'), 1500);
  } catch (err) {
    console.error(err);
    setSyncDot('error');
  }
}

function toggleLibrary() {
  libraryOpen = !libraryOpen;
  libraryPanel.hidden = !libraryOpen;
  libraryToggleBtn.classList.toggle('library-toggle-active', libraryOpen);
  if (libraryOpen) loadLibrary();
}

savePrdBtn.addEventListener('click', savePrd);
libraryToggleBtn.addEventListener('click', toggleLibrary);

// ── Utility ──
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Custom inline confirm modal replacing browser confirm() / alert()
const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
const confirmModalMsg    = document.getElementById('confirm-modal-msg');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalOk     = document.getElementById('confirm-modal-ok');

function showConfirmModal(msg, okLabel = 'Delete', hideCancel = false) {
  return new Promise((resolve) => {
    confirmModalMsg.textContent    = msg;
    confirmModalOk.textContent     = okLabel;
    confirmModalCancel.hidden      = hideCancel;
    confirmModalOverlay.hidden     = false;

    function finish(value) {
      confirmModalOverlay.hidden = true;
      confirmModalOk.removeEventListener('click', onOk);
      confirmModalCancel.removeEventListener('click', onCancel);
      resolve(value);
    }

    function onOk()     { finish(true); }
    function onCancel() { finish(false); }

    confirmModalOk.addEventListener('click', onOk);
    confirmModalCancel.addEventListener('click', onCancel);
  });
}

// Custom inline modal replacing browser prompt()
const nameModalOverlay = document.getElementById('name-modal-overlay');
const nameModalLabel   = document.getElementById('name-modal-label');
const nameModalInput   = document.getElementById('name-modal-input');
const nameModalCancel  = document.getElementById('name-modal-cancel');
const nameModalOk      = document.getElementById('name-modal-ok');

function showNameModal(label, defaultValue = '') {
  return new Promise((resolve) => {
    nameModalLabel.textContent = label;
    nameModalInput.value = defaultValue;
    nameModalOverlay.hidden = false;
    nameModalInput.focus();
    nameModalInput.select();

    function finish(value) {
      nameModalOverlay.hidden = true;
      nameModalOk.removeEventListener('click', onOk);
      nameModalCancel.removeEventListener('click', onCancel);
      nameModalInput.removeEventListener('keydown', onKey);
      resolve(value);
    }

    function onOk() { finish(nameModalInput.value.trim() || null); }
    function onCancel() { finish(null); }
    function onKey(e) {
      if (e.key === 'Enter') onOk();
      if (e.key === 'Escape') onCancel();
    }

    nameModalOk.addEventListener('click', onOk);
    nameModalCancel.addEventListener('click', onCancel);
    nameModalInput.addEventListener('keydown', onKey);
  });
}

// ── Init Firebase ──
(async function initFirebase() {
  if (!isFirebaseConfigured()) return;

  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    db     = firebase.firestore();

    await new Promise((resolve, reject) => {
      const unsub = fbAuth.onAuthStateChanged(async (user) => {
        unsub();
        if (user) {
          currentUid = user.uid;
        } else {
          const cred = await fbAuth.signInAnonymously();
          currentUid = cred.user.uid;
        }
        resolve();
      }, reject);
    });

    await ensureDefaultProject();
    revealFirebaseUI();
    firebaseReady = true;
    setSyncDot('idle');

    // Show save button if a PRD is already in the output
    if (rawPrdText) savePrdBtn.hidden = false;
  } catch (err) {
    console.error('Firebase init failed:', err);
    // App continues to work without Firebase
  }
})();
