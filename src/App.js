import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './App.css'

const ADMIN_EMAIL = 'ah.harish@gmail.com'

async function storeAdminDriveToken(session) {
  if (!session?.user?.email) return
  if (session.user.email !== ADMIN_EMAIL) return
  const providerToken = session.provider_token
  const providerRefreshToken = session.provider_refresh_token
  if (!providerToken && !providerRefreshToken) return
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
  const { error } = await supabase.from('drive_tokens').upsert({
    user_id: session.user.id,
    access_token: providerToken || null,
    refresh_token: providerRefreshToken || null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })

}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) storeAdminDriveToken(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) storeAdminDriveToken(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

