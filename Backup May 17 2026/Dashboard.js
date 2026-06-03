import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_ORDER, getCatColor, fmtDate } from '../lib/utils'
import useDriveBackup from '../lib/driveBackup'
import DriveStatusBar from './DriveStatusBar'
import ChatPanel from './ChatPanel'
import AddEntry from './AddEntry'
import EntryDetail from './EntryDetail'

export default function Dashboard({ session }) {
  const [entries, setEntries] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [toast, setToast] = useState(null)

  const { driveStatus, driveMessage, connectDrive, pushToDrive } = useDriveBackup()
  const profile = session.user
  const initials = profile.user_metadata?.full_name
    ? profile.user_metadata.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.email?.[0]?.toUpperCase() || 'U'

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('entries')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [])

  const fetchCustomCats = useCallback(async () => {
    const { data } = await supabase
      .from('custom_categories')
      .select('name')
      .order('created_at')
    if (data) setCustomCats(data.map(c => c.name))
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchCustomCats()

    const channel = supabase
      .channel('entries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, fetchEntries)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchEntries, fetchCustomCats])

  const allCats = [...CAT_ORDER.filter(c => c !== 'Other'), ...customCats, 'Other']
  const activeCats = allCats.filter(c => entries.some(e => e.category === c))

  const filtered = entries.filter(e => {
    const matchCat = filterCat === 'All' || e.category === filterCat
    const q = search.toLowerCase()
    const matchSearch = !q || [e.title, e.summary, e.key_insight, ...(e.tags || [])].some(s => s?.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  const grouped = filtered.reduce((acc, e) => {
    ;(acc[e.category] = acc[e.category] || []).push(e)
    return acc
  }, {})

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleEntryAdded = async () => {
    setShowAdd(false)
    await fetchEntries()
    fetchCustomCats()
    showToast('Entry saved')
    const { data } = await supabase.from('entries').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false })
    if (data) pushToDrive(data)
  }

  const handleEntryDeleted = () => {
    setSelectedEntry(null)
    fetchEntries()
    showToast('Entry deleted')
  }

  const handleEntryUpdated = (updated) => {
    setSelectedEntry(updated)
    fetchEntries()
    showToast('Entry updated')
  }

  const truncateSummary = (text, limit = 160) => {
    if (!text) return ''
    if (text.length <= limit) return text
    return text.slice(0, limit).trimEnd() + '...'
  }

  return (
    <>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Knowledge Base</div>
          <div className="sidebar-logo-sub">Shared Library</div>
        </div>

        <nav className="sidebar-cats">
          <div className="sidebar-section-label">Browse</div>
          <button
            className={`sidebar-cat ${filterCat === 'All' ? 'active' : ''}`}
            onClick={() => setFilterCat('All')}
          >
            <span className="sidebar-cat-dot" style={{ background: filterCat === 'All' ? '#a51d36' : 'rgba(255,255,255,0.2)' }} />
            All entries
            <span className="sidebar-cat-count">{entries.length}</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: 8 }}>Categories</div>
          {activeCats.map(cat => (
            <button
              key={cat}
              className={`sidebar-cat ${filterCat === cat ? 'active' : ''}`}
              onClick={() => setFilterCat(cat)}
            >
              <span className="sidebar-cat-dot" style={{ background: filterCat === cat ? '#a51d36' : 'rgba(255,255,255,0.2)' }} />
              {cat}
              <span className="sidebar-cat-count">
                {entries.filter(e => e.category === cat).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {profile.user_metadata?.avatar_url
                ? <img src={profile.user_metadata.avatar_url} alt="" />
                : initials}
            </div>
            <div className="sidebar-user-name">
              {profile.user_metadata?.full_name || profile.email}
            </div>
          </div>
          <button className="btn-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search entries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="entry-count">{filtered.length} entries</span>
          <button className="btn-add" onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Entry
          </button>
        </div>

        <DriveStatusBar
          driveStatus={driveStatus}
          driveMessage={driveMessage}
          connectDrive={connectDrive}
          onManualBackup={async () => {
            const { data } = await supabase.from('entries').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false })
            if (data) pushToDrive(data)
          }}
        />
        <div className="content-area">
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />
            </div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--rule)" strokeWidth="1.5">
                <path d="M12 2C8.5 2 6 4.5 6 7c0 1-.3 2-1 2.7C3.8 11 3 12.4 3 14c0 2.8 2.2 5 5 5h1v2h6v-2h1c2.8 0 5-2.2 5-5 0-1.6-.8-3-2-3.9-.7-.6-1-1.6-1-2.6 0-2.4-2.2-4.5-5-4.5z"/>
              </svg>
              <div className="empty-title">Your knowledge base is empty</div>
              <div style={{ fontSize: 14, maxWidth: 360 }}>
                Add your first entry — paste an article, AI conversation, YouTube URL, or upload a PDF.
              </div>
              <button className="btn-add" onClick={() => setShowAdd(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add first entry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 15, color: 'var(--muted)' }}>No entries match your search.</div>
            </div>
          ) : (
            allCats.filter(cat => grouped[cat]).map(cat => (
              <div key={cat} className="cat-section">
                <div className="cat-label">
                  {cat}
                  <span className="cat-count">({grouped[cat].length})</span>
                </div>
                <div className="entries-grid">
                  {grouped[cat].map(entry => {
                    const summary = entry.summary || ''
                    const truncated = truncateSummary(summary)
                    const isLong = summary.length > 160
                    return (
                      <div
                        key={entry.id}
                        className="entry-card"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <div className="card-tags">
                          {(entry.tags || []).slice(0, 3).map(t => (
                            <span key={t} className="card-tag">{t}</span>
                          ))}
                        </div>
                        <div className="card-title">{entry.title}</div>
                        <div className="card-summary">
                          {truncated}
                          {isLong && (
                            <span className="card-read-more"> Read more</span>
                          )}
                        </div>
                        <div className="card-meta">
                          <div className="card-dates">
                            <span className="card-date">{fmtDate(entry.created_at)}</span>
                            {entry.updated_at && (new Date(entry.updated_at) - new Date(entry.created_at)) > 60000 && (
                              <span className="card-date card-modified">Edited {fmtDate(entry.updated_at)}</span>
                            )}
                          </div>
                          <span className="card-source">
                            {entry.source_type}
                          </span>
                        </div>
                        {entry.profiles?.full_name && (
                          <div className="card-user" style={{ marginTop: 8 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            {entry.profiles.full_name}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <AddEntry
          session={session}
          customCats={customCats}
          onClose={() => setShowAdd(false)}
          onAdded={handleEntryAdded}
          showToast={showToast}
        />
      )}

      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          session={session}
          customCats={customCats}
          onClose={() => setSelectedEntry(null)}
          onDeleted={handleEntryDeleted}
          onUpdated={handleEntryUpdated}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>
      )}
    </div>
    {session && <ChatPanel
      session={session}
      entries={entries}
      onEntryAdded={handleEntryAdded}
      showToast={showToast}
    />}
    </>
  )
}
