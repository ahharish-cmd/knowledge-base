const ADMIN_EMAIL = 'ah.harish@gmail.com'
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supabaseGet(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}&limit=1`
  const res = await fetch(url, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  const data = await res.json()
  return Array.isArray(data) ? data[0] : null
}

async function supabaseUpsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(body)
  })
  return res
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const profile = await supabaseGet('profiles', `email=eq.${encodeURIComponent(ADMIN_EMAIL)}&select=id`)
    if (!profile) return res.status(404).json({ error: 'Admin user not found' })

    const tokenRow = await supabaseGet('drive_tokens', `user_id=eq.${profile.id}&select=*`)
    if (!tokenRow?.refresh_token) {
      return res.status(404).json({ error: 'No Drive token stored. Sign in with Google first.' })
    }

    if (tokenRow.access_token && tokenRow.expires_at && new Date(tokenRow.expires_at) > new Date(Date.now() + 60000)) {
      return res.status(200).json({ access_token: tokenRow.access_token })
    }

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokenRow.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const tokens = await refreshRes.json()
    if (!tokens.access_token) {
      return res.status(500).json({ error: 'Token refresh failed', details: tokens })
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabaseUpsert('drive_tokens', {
      user_id: profile.id,
      access_token: tokens.access_token,
      refresh_token: tokenRow.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })

    return res.status(200).json({ access_token: tokens.access_token })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
