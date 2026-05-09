import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

const safeFetch = (url, options = {}) => {
  if (options.headers) {
    const safe = {}
    const entries = options.headers instanceof Headers
      ? [...options.headers.entries()]
      : Object.entries(options.headers)
    for (const [k, v] of entries) {
      safe[k] = String(v).replace(/[^\x20-\x7E]/g, '')
    }
    options = { ...options, headers: safe }
  }
  return fetch(url, options)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: safeFetch },
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey
