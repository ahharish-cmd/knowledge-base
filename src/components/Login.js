import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const signInWithGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const sendMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1a1714" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
            <path d="M12 2C8.5 2 6 4.5 6 7c0 1-.3 2-1 2.7C3.8 11 3 12.4 3 14c0 2.8 2.2 5 5 5h1v2h6v-2h1c2.8 0 5-2.2 5-5 0-1.6-.8-3-2-3.9-.7-.6-1-1.6-1-2.6 0-2.4-2.2-4.5-5-4.5z"/>
          </svg>
          <div className="login-logo">Knowledge Base</div>
          <div className="login-sub">Your shared learning library</div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </div>
          </div>
        ) : (
          <>
            <button className="btn-google" onClick={signInWithGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="login-divider">or</div>

            <form className="email-form" onSubmit={sendMagicLink}>
              <input
                className="email-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button className="btn-email" type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
              <div className="magic-link-note">No password needed. We email you a sign-in link.</div>
            </form>

            {error && (
              <div style={{ marginTop: 14, fontSize: 13, color: '#c0392b', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
