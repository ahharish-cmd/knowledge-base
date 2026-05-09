const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { question, history, entries } = req.body

    let context = ''
    if (entries && entries.length > 0) {
      context = entries.map(e =>
        "Title: " + e.title + "\nSummary: " + e.summary + "\nKey Insight: " + e.key_insight + "\nContent: " + (e.raw_content || '').slice(0, 500)
      ).join("\n\n---\n\n")
    }

    const systemPrompt = context
      ? "You are a knowledgeable assistant helping the user explore their personal knowledge base. You have access to the following saved articles and notes relevant to their question:\n\n" + context + "\n\nAnswer based primarily on this content. If the saved content covers the topic well, answer from it and mention which articles you are drawing from. If the content is insufficient, supplement with your own knowledge and clearly say so. Keep responses clear, concise and practical."
      : "You are a knowledgeable assistant helping the user explore topics related to their knowledge base. Answer clearly and practically."

    const messages = [
      ...(history || []),
      { role: "user", content: question }
    ]

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: systemPrompt,
        messages
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({ error: "Claude error", details: err })
    }

    const data = await response.json()
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || ""
    return res.status(200).json({ response: text })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
