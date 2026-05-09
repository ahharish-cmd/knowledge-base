import React from 'react'

const STATUS_CONFIG = {
  idle:    { color: '#1e7a45', bg: '#edf7f0', dot: '#1e7a45', label: 'Drive backup active' },
  syncing: { color: '#b5932a', bg: '#fdfaee', dot: '#b5932a', label: 'Saving to Drive...' },
  synced:  { color: '#1e7a45', bg: '#edf7f0', dot: '#1e7a45', label: 'Saved to Drive' },
  error:   { color: '#c0392b', bg: '#fdeef3', dot: '#c0392b', label: 'Backup error' },
}

export default function DriveStatusBar({ driveStatus, driveMessage, onManualBackup }) {
  const cfg = STATUS_CONFIG[driveStatus] || STATUS_CONFIG.idle
  const isPulsing = driveStatus === 'synced'
  const isSyncing = driveStatus === 'syncing'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 24px',
      background: cfg.bg,
      borderBottom: '1px solid #d0c8be',
      fontSize: 12,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: cfg.dot,
        boxShadow: isPulsing ? `0 0 8px ${cfg.dot}` : 'none',
        flexShrink: 0,
        transition: 'all 0.3s',
        animation: isSyncing ? 'pulse 1s infinite' : 'none',
      }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      <span style={{ color: cfg.color, fontWeight: 500 }}>
        {driveMessage || cfg.label}
      </span>

      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={onManualBackup}
          disabled={isSyncing}
          style={{
            padding: '4px 12px', borderRadius: 6,
            border: '1px solid #d0c8be',
            background: 'white', color: '#1a1714',
            fontSize: 11, fontWeight: 600,
            cursor: isSyncing ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            opacity: isSyncing ? 0.5 : 1,
          }}
        >
          ↑ Backup now
        </button>
      </div>
    </div>
  )
}
