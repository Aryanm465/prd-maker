const { fetchFollowingRedirects, cors } = require('./_helpers');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const docId = req.query.id;
  if (!docId || !/^[a-zA-Z0-9_-]{10,}$/.test(docId))
    return res.status(400).json({ error: 'Invalid or missing Google Doc ID' });

  try {
    const text = await fetchFollowingRedirects(
      `https://docs.google.com/document/d/${docId}/export?format=txt`
    );
    res.json({ text });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
