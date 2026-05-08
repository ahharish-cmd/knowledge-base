import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

const patchedFetch = (url, init = {}) => {
  if (init && init.headers) {
    const cleaned = {}
    const entries = typeof init.headers.entries === 'function'
      ? [...init.headers.entries()]
      : Object.entries(init.headers)
    for (const [k, v] of entries) {
      cleaned[k] = String(v).split('').filter(c => c.charCodeAt(0) <= 127).join('')
    }
    init = { ...init, headers: cleaned }
  }
  return window.fetch(url, init)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: patchedFetch },
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey
