import React from 'react'

const STATUS_CONFIG = {
  disconnected: { color: '#6a6a6a', bg: '#f0f0f0', label: 'Drive not connected' },
  connecting:   { color: '#b5932a', bg: '#fdfaee', label: 'Connecting...' },
  idle:         { color: '#1e7a45', bg: '#edf7f0', label: 'Drive connected' },
  syncing:      { color: '#b5932a', bg: '#fdfaee', label: 'Saving to Drive...' },
  synced:       { color: '#1e7a45', bg: '#edf7f0', label: 'Saved to Drive' },
  error:        { color: '#c0392b', bg: '#fdeef3', label: 'Backup error' },
}

export default function DriveStatusBar({ driveStatus, driveMessage, connectDrive, onManualBackup }) {
  const cfg = STATUS_CONFIG[driveStatus] || STATUS_CONFIG.disconnected
  const isConnected = ['idle', 'syncing', 'synced'].includes(driveStatus)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px',
      background: cfg.bg,
      borderBottom: '1px solid #d0c8be',
      fontSize: 12,
    }}>
      {/* LED indicator */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: cfg.color,
        boxShadow: driveStatus === 'synced' ? `0 0 6px ${cfg.color}` : 'none',
        flexShrink: 0,
        transition: 'all 0.3s',
      }} />

      <span style={{ color: cfg.color, fontWeight: 500 }}>
        {driveMessage || cfg.label}
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {!isConnected && driveStatus !== 'connecting' && (
          <button
            onClick={connectDrive}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #d0c8be',
              background: '#1a1714', color: 'white', fontSize: 11,
              fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Connect Drive
          </button>
        )}
        {isConnected && (
          <button
            onClick={onManualBackup}
            disabled={driveStatus === 'syncing'}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #d0c8be',
              background: 'white', color: '#1a1714', fontSize: 11,
              fontWeight: 600, cursor: driveStatus === 'syncing' ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif", opacity: driveStatus === 'syncing' ? 0.5 : 1,
            }}
          >
            ↑ Push backup now
          </button>
        )}
      </div>
    </div>
  )
}
