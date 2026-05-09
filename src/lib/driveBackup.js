import { useState, useEffect, useRef, useCallback } from 'react'

const DRIVE_FOLDER_ID = '1W57qnP46z814kafiW6I-gTOZnuD4m5AM'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID

export default function useDriveBackup() {
  const [driveStatus, setDriveStatus] = useState('disconnected')
  const [driveMessage, setDriveMessage] = useState('Connect Drive for backup')
  const tokenRef = useRef(null)
  const tokenClientRef = useRef(null)
  const fileIdRef = useRef(null)
  const pendingDataRef = useRef(null)

  useEffect(() => {
    if (!CLIENT_ID) return
    const existing = document.getElementById('gis-script')
    if (existing) { setTimeout(initTokenClient, 500); return }
    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initTokenClient()
    document.body.appendChild(script)
  }, [])

  const initTokenClient = () => {
    if (!window.google || !CLIENT_ID) return
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          setDriveStatus('error')
          setDriveMessage('Drive access denied')
          return
        }
        tokenRef.current = response.access_token
        setDriveStatus('idle')
        setDriveMessage('Drive connected')
        if (pendingDataRef.current) {
          pushToDrive(pendingDataRef.current)
          pendingDataRef.current = null
        }
      }
    })
  }

  const connectDrive = () => {
    setDriveStatus('connecting')
    if (!tokenClientRef.current) initTokenClient()
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    } else {
      setDriveStatus('error')
      setDriveMessage('Google SDK not loaded — refresh page')
    }
  }

  const findExistingFile = async (token) => {
    if (fileIdRef.current) return fileIdRef.current
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+name='harish-knowledge-base.json'+and+trashed=false&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.files && data.files.length > 0) {
        fileIdRef.current = data.files[0].id
        return fileIdRef.current
      }
    } catch (e) {}
    return null
  }

  const pushToDrive = useCallback(async (entries) => {
    if (!tokenRef.current) {
      pendingDataRef.current = entries
      setDriveStatus('disconnected')
      setDriveMessage('Connect Drive to enable backup')
      return
    }
    setDriveStatus('syncing')
    setDriveMessage('Saving to Drive...')
    try {
      const token = tokenRef.current
      const content = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), entries }, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const existingId = await findExistingFile(token)
      let res
      if (existingId) {
        res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: blob,
        })
      } else {
        const metadata = { name: 'harish-knowledge-base.json', parents: [DRIVE_FOLDER_ID] }
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', blob)
        res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (res.ok) { const d = await res.json(); fileIdRef.current = d.id }
      }
      if (res.ok) {
        setDriveStatus('synced')
        setDriveMessage(`Backed up at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
        setTimeout(() => { setDriveStatus('idle'); setDriveMessage('Drive connected') }, 3000)
      } else if (res.status === 401) {
        tokenRef.current = null
        pendingDataRef.current = entries
        setDriveStatus('disconnected')
        setDriveMessage('Session expired — reconnect Drive')
      } else {
        setDriveStatus('error')
        setDriveMessage('Backup failed — try manual push')
      }
    } catch (e) {
      setDriveStatus('error')
      setDriveMessage('Backup error: ' + e.message)
    }
  }, [])

  return { driveStatus, driveMessage, connectDrive, pushToDrive }
}
