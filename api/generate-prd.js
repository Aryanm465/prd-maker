const { buildPrompt, callModel, cors } = require('./_helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { model, apiKey, customInstructions, ...contentInputs } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });
    const prompt = buildPrompt({ ...contentInputs, customInstructions });
    const prd = await callModel(model, prompt, apiKey);
    res.json({ prd });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
