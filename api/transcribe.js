const { callWhisper, callGeminiTranscribe, cors } = require('./_helpers');

module.exports.config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { model, apiKey, audioBase64, mimeType } = req.body;
    if (!audioBase64 || !apiKey) return res.status(400).json({ error: 'Missing audioBase64 or apiKey' });

    let text;
    if (model === 'gemini') {
      text = await callGeminiTranscribe(audioBase64, mimeType || 'audio/webm', apiKey);
    } else {
      const audioBuf = Buffer.from(audioBase64, 'base64');
      text = await callWhisper(audioBuf, mimeType || 'audio/webm', apiKey);
    }
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
