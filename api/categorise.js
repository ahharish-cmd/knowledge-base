const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'No text provided' })

    const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').slice(0, 3000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: 'You are a JSON-only API. Respond with a single valid JSON object and nothing else. No markdown, no explanation.',
        messages: [{
          role: 'user',
          content: 'Analyse this text and return JSON with these exact fields:\n- title: concise 6-8 word title\n- category: one of: Leadership, Strategy, Macro & Policy, Finance, Technology, Operations, Marketing, Personal Growth, India & SMEs, Productivity, Mental Models, Personal Interests, Other\n- summary: 2-3 sentences capturing the core insight\n- key_insight: single most actionable takeaway in one sentence\n- tags: array of 4-5 relevant keyword strings\n- source_type: one of: Article, AI Conversation, Book Note, Video, Personal Note, Research, PDF, Image / Screenshot, Podcast\n\nText: ' + cleanText
        }]
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({ error: 'Anthropic error', details: err })
    }

    const data = await response.json()
    const raw = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Parse failed', raw: raw.slice(0, 200) })

    const result = JSON.parse(match[0])
    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
