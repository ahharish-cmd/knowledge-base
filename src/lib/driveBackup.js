import { useState, useCallback } from 'react'

const DRIVE_FOLDER_ID = '1W57qnP46z814kafiW6I-gTOZnuD4m5AM'

async function getAdminDriveToken() {
  const res = await fetch('/api/refresh-drive-token', { method: 'POST' })
  if (!res.ok) throw new Error('Could not get Drive token')
  const data = await res.json()
  return data.access_token
}

export default function useDriveBackup() {
  const [driveStatus, setDriveStatus] = useState('idle')
  const [driveMessage, setDriveMessage] = useState('Drive backup active')
  const fileIdRef = { current: null }

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
    setDriveStatus('syncing')
    setDriveMessage('Saving to Drive...')
    try {
      const token = await getAdminDriveToken()
      const content = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), entries }, null, 2)
      const blob = new Blob([content], { type: 'application/json' })
      const existingId = await findExistingFile(token)
      let res
      if (existingId) {
        res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: blob,
          }
        )
      } else {
        const metadata = { name: 'harish-knowledge-base.json', parents: [DRIVE_FOLDER_ID] }
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', blob)
        res = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
        )
        if (res.ok) { const d = await res.json(); fileIdRef.current = d.id }
      }
      if (res.ok) {
        setDriveStatus('synced')
        setDriveMessage(`Backed up at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
        setTimeout(() => { setDriveStatus('idle'); setDriveMessage('Drive backup active') }, 3000)
      } else {
        setDriveStatus('error')
        setDriveMessage('Backup failed — will retry on next save')
        setTimeout(() => { setDriveStatus('idle'); setDriveMessage('Drive backup active') }, 5000)
      }
    } catch (e) {
      setDriveStatus('error')
      setDriveMessage('Backup error — will retry on next save')
      setTimeout(() => { setDriveStatus('idle'); setDriveMessage('Drive backup active') }, 5000)
    }
  }, [])

  return { driveStatus, driveMessage, connectDrive: () => {}, pushToDrive }
}
