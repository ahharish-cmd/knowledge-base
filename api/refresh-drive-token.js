const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

const ADMIN_EMAIL = 'ah.harish@gmail.com'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { global: { WebSocket } }
)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Admin user not found', detail: profileError?.message })
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from('drive_tokens')
      .select('*')
      .eq('user_id', profile.id)
      .single()

    if (tokenError || !tokenRow?.refresh_token) {
      return res.status(404).json({ error: 'No Drive token stored. Sign in with Google first.', detail: tokenError?.message })
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

    await supabase.from('drive_tokens').upsert({
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
// ws fix Sat May  9 15:09:18 IST 2026
