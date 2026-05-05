
export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  // 2. Get API Key from Environment Variables (set in Vercel dashboard)
  const API_KEY = process.env.GEMINI_AI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  const prompt = `You are a helpful assistant that summarises web pages.
Given the following page content, return a JSON object with exactly this shape:
{"bullets": ["key point 1", "key point 2", "key point 3"],"insights": ["insight 1", "insight 2"],"readingTime": "X min read"}
Return only the JSON. No explanation. No markdown.
Page content:
${content}`;

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();

    // Forward the AI response back to the extension
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to connect to AI service' });
  }
}
