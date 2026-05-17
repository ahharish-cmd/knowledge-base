import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_ORDER, getCatColor, fmtDate } from '../lib/utils'
import useDriveBackup from '../lib/driveBackup'
import ChatPanel from './ChatPanel'
import AddEntry from './AddEntry'
import EntryDetail from './EntryDetail'

const STATUS_CONFIG = {
  idle:    { dot: 'var(--drive-dot)', label: 'Drive backup active' },
  syncing: { dot: '#f59e0b', label: 'Saving to Drive...' },
  synced:  { dot: 'var(--drive-dot)', label: 'Saved to Drive' },
  error:   { dot: '#ef4444', label: 'Backup error' },
}

export default function Dashboard({ session }) {
  const [entries, setEntries] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [toast, setToast] = useState(null)
  const [darkMode, setDarkMode] = useState(true)

  const { driveStatus, driveMessage, pushToDrive } = useDriveBackup()
  const profile = session.user
  const initials = profile.user_metadata?.full_name
    ? profile.user_metadata.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.email?.[0]?.toUpperCase() || 'U'

  // Apply theme to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-mode')
    } else {
      document.body.classList.add('light-mode')
    }
  }, [darkMode])

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem('kb-theme')
    if (saved === 'light') {
      setDarkMode(false)
      document.body.classList.add('light-mode')
    }
  }, [])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('kb-theme', next ? 'dark' : 'light')
  }

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
    document.body.classList.remove('light-mode')
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

  // Top tags across all entries
  const topTags = Object.entries(
    entries.flatMap(e => e.tags || []).reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1; return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t)

  // Max entries in any category (for bar widths)
  const maxCatCount = Math.max(...activeCats.map(c => entries.filter(e => e.category === c).length), 1)

  // Today's date string
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const driveStatusCfg = STATUS_CONFIG[driveStatus] || STATUS_CONFIG.idle
  const isSyncing = driveStatus === 'syncing'

  // Home view: show when filterCat is All and no search
  const isHomeView = filterCat === 'All' && !search.trim()

  // First entry per section (for featured treatment)
  const featuredCat = activeCats[0]
  const featuredEntry = featuredCat ? entries.find(e => e.category === featuredCat) : null

  return (
    <>
    <div className="app-shell">

      {/* ── Masthead ── */}
      <div className="masthead">
        <div className="masthead-left">
          <div className="masthead-logo">Knowledge Base</div>
          <div className="masthead-edition">
            Shared Library<br />
            {today} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
        <div className="masthead-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? '☀ Light' : '☾ Dark'}
          </button>
          <button className="btn-add" onClick={() => setShowAdd(true)}>
            + Add Entry
          </button>
        </div>
      </div>

      {/* ── Category nav strip ── */}
      <div className="cat-nav">
        <button
          className={`cat-nav-item ${filterCat === 'All' ? 'active' : ''}`}
          onClick={() => { setFilterCat('All'); setSearch('') }}
        >
          Home
        </button>
        {activeCats.map(cat => (
          <button
            key={cat}
            className={`cat-nav-item ${filterCat === cat ? 'active' : ''}`}
            onClick={() => setFilterCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div className="searchbar">
        <div className="search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search entries..."
            value={search}
            onChange={e => { setSearch(e.target.value); if (e.target.value) setFilterCat('All') }}
          />
          <span className="search-shortcut">⌘K</span>
        </div>
        <span className="entry-count">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {/* ── Main layout ── */}
      <div className="layout">

        {/* ── Index column ── */}
        <div className="index-col">

          <div className="index-section">
            <div className="index-head">Browse</div>
            <button
              className={`index-item ${filterCat === 'All' ? 'active' : ''}`}
              onClick={() => { setFilterCat('All'); setSearch('') }}
            >
              <span>All entries</span>
              <span className="index-ct">{entries.length}</span>
            </button>
          </div>

          <div className="stats-block">
            <div>
              <div className="stat-val">{entries.length}</div>
              <div className="stat-label">Entries</div>
            </div>
            <div>
              <div className="stat-val">{activeCats.length}</div>
              <div className="stat-label">Categories</div>
            </div>
            <div>
              <div className="stat-val">{topTags.length}</div>
              <div className="stat-label">Tags</div>
            </div>
            <div>
              <div className="stat-val">
                {entries.filter(e => {
                  const d = new Date(e.created_at)
                  const now = new Date()
                  return (now - d) < 7 * 24 * 60 * 60 * 1000
                }).length}
              </div>
              <div className="stat-label">This week</div>
            </div>
          </div>

          <div className="index-section">
            <div className="index-head">Index</div>
            {activeCats.map(cat => (
              <button
                key={cat}
                className={`index-item ${filterCat === cat ? 'active' : ''}`}
                onClick={() => setFilterCat(cat)}
              >
                <span>{cat}</span>
                <span className="index-ct">{entries.filter(e => e.category === cat).length}</span>
              </button>
            ))}
          </div>

          <div className="tags-block">
            <div className="tags-head">Top Tags</div>
            <div className="tag-cloud">
              {topTags.slice(0, 8).map((t, i) => (
                <button
                  key={t}
                  className={`tag-pill ${i < 3 ? 'hot' : ''}`}
                  onClick={() => { setSearch(t); setFilterCat('All') }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="recent-block">
            <div className="recent-head">Recently Added</div>
            {entries.slice(0, 4).map(e => (
              <div key={e.id} className="recent-item" onClick={() => setSelectedEntry(e)}>
                <div className="recent-title">{e.title}</div>
                <div className="recent-meta">{e.category} · {fmtDate(e.created_at)}</div>
              </div>
            ))}
          </div>

          <div className="index-user">
            <div className="index-avatar">
              {profile.user_metadata?.avatar_url
                ? <img src={profile.user_metadata.avatar_url} alt="" />
                : initials}
            </div>
            <div className="index-uname">{profile.user_metadata?.full_name || profile.email}</div>
            <button className="btn-signout" onClick={handleSignOut}>Out</button>
          </div>

        </div>

        {/* ── Main content ── */}
        <div className="main-content">

          {/* Drive status bar */}
          <div className="drive-bar">
            <div className="drive-dot" style={{ background: driveStatusCfg.dot, animation: isSyncing ? 'pulse 1s infinite' : 'none' }} />
            <span className="drive-label">{driveMessage || driveStatusCfg.label}</span>
            <button
              className="drive-backup-btn"
              disabled={isSyncing}
              onClick={async () => {
                const { data } = await supabase.from('entries').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false })
                if (data) pushToDrive(data)
              }}
            >
              ↑ Backup now
            </button>
          </div>

          <div className="content-area">

            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : entries.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5">
                  <path d="M12 2C8.5 2 6 4.5 6 7c0 1-.3 2-1 2.7C3.8 11 3 12.4 3 14c0 2.8 2.2 5 5 5h1v2h6v-2h1c2.8 0 5-2.2 5-5 0-1.6-.8-3-2-3.9-.7-.6-1-1.6-1-2.6 0-2.4-2.2-4.5-5-4.5z"/>
                </svg>
                <div className="empty-title">Your knowledge base is empty</div>
                <div style={{ fontSize: 13, maxWidth: 360, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace', textAlign: 'center', lineHeight: 1.6 }}>
                  Add your first entry — paste an article, YouTube URL, or upload a PDF.
                </div>
                <button className="btn-add" onClick={() => setShowAdd(true)}>+ Add first entry</button>
              </div>
            ) : filtered.length === 0 && search ? (
              <div className="empty-state">
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>
                  No entries match "{search}"
                </div>
              </div>
            ) : isHomeView ? (
              /* ── HOME VIEW ── */
              <>
                <div className="dateline">
                  <span>{today}</span>
                  <span>{entries.length} entries · {activeCats.length} categories · Drive {driveStatus === 'error' ? 'error' : 'active'}</span>
                </div>

                {/* Home panels: category breakdown + recent */}
                <div className="home-panels">
                  <div className="home-panel">
                    <div className="home-panel-label">Category Breakdown</div>
                    {activeCats.map(cat => (
                      <div key={cat} className="bar-item" onClick={() => setFilterCat(cat)} style={{ cursor: 'pointer' }}>
                        <span className="bar-name">{cat}</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(entries.filter(e => e.category === cat).length / maxCatCount) * 100}%` }} />
                        </div>
                        <span className="bar-ct">{entries.filter(e => e.category === cat).length}</span>
                      </div>
                    ))}
                  </div>

                  <div className="home-panel">
                    <div className="home-panel-label">Recently Added</div>
                    {entries.slice(0, 5).map(e => (
                      <div key={e.id} className="panel-recent-item" onClick={() => setSelectedEntry(e)}>
                        <div className="panel-recent-title">{e.title}</div>
                        <div className="panel-recent-meta">{e.category} · {fmtDate(e.created_at)} · {e.source_type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sections with featured + grid per category */}
                {activeCats.map(cat => {
                  const catEntries = entries.filter(e => e.category === cat)
                  const featured = catEntries[0]
                  const rest = catEntries.slice(1)

                  return (
                    <div key={cat} className="cat-section">
                      <div className="section-rule">
                        <div className="section-bar" />
                        <span className="section-name">{cat}</span>
                        <span className="section-ct">({catEntries.length})</span>
                        <div className="section-line" />
                      </div>

                      {/* Featured card */}
                      {featured && (
                        <div className="featured" onClick={() => setSelectedEntry(featured)}>
                          <div className="featured-body">
                            <div className="featured-kicker">
                              {featured.source_type} · {fmtDate(featured.created_at)}
                              {featured.profiles?.full_name ? ` · ${featured.profiles.full_name}` : ''}
                            </div>
                            <div className="featured-title">{featured.title}</div>
                            <div className="featured-summary">{featured.summary}</div>
                            <div className="featured-tags">
                              {(featured.tags || []).slice(0, 4).map(t => (
                                <span key={t} className="featured-tag">{t}</span>
                              ))}
                            </div>
                          </div>
                          <div className="featured-aside">
                            <div>
                              <div className="featured-insight-label">Key Insight</div>
                              <div className="featured-insight-text">{featured.key_insight}</div>
                            </div>
                            <div className="featured-meta">
                              <span>Added by {featured.profiles?.full_name || 'You'}</span>
                              <button className="featured-open" onClick={e => { e.stopPropagation(); setSelectedEntry(featured) }}>
                                Read full entry ↗
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rest in grid */}
                      {rest.length > 0 && (
                        <div className="card-grid">
                          {rest.map(entry => {
                            const summary = entry.summary || ''
                            const truncated = truncateSummary(summary)
                            const isLong = summary.length > 160
                            return (
                              <div key={entry.id} className="entry-card" onClick={() => setSelectedEntry(entry)}>
                                <div className="card-kicker">
                                  {entry.source_type} · {fmtDate(entry.created_at)}
                                </div>
                                <div className="card-tags">
                                  {(entry.tags || []).slice(0, 3).map(t => (
                                    <span key={t} className="card-tag">{t}</span>
                                  ))}
                                </div>
                                <div className="card-title">{entry.title}</div>
                                <div className="card-summary">
                                  {truncated}
                                  {isLong && <span className="card-read-more"> Read more</span>}
                                </div>
                                <div className="card-meta">
                                  <div className="card-dates">
                                    <span className="card-date">{fmtDate(entry.created_at)}</span>
                                    {entry.updated_at && (new Date(entry.updated_at) - new Date(entry.created_at)) > 60000 && (
                                      <span className="card-modified">Edited {fmtDate(entry.updated_at)}</span>
                                    )}
                                  </div>
                                  <span className="card-source">{entry.source_type}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ) : (
              /* ── FILTERED VIEW (category or search) ── */
              <>
                <div className="dateline">
                  <span>{filterCat !== 'All' ? filterCat : `Search: "${search}"`}</span>
                  <span>{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
                </div>

                {allCats.filter(cat => grouped[cat]).map(cat => (
                  <div key={cat} className="cat-section">
                    {filterCat === 'All' && (
                      <div className="section-rule">
                        <div className="section-bar" />
                        <span className="section-name">{cat}</span>
                        <span className="section-ct">({grouped[cat].length})</span>
                        <div className="section-line" />
                      </div>
                    )}
                    <div className="card-grid">
                      {grouped[cat].map(entry => {
                        const summary = entry.summary || ''
                        const truncated = truncateSummary(summary)
                        const isLong = summary.length > 160
                        return (
                          <div key={entry.id} className="entry-card" onClick={() => setSelectedEntry(entry)}>
                            <div className="card-kicker">
                              {entry.source_type} · {fmtDate(entry.created_at)}
                            </div>
                            <div className="card-tags">
                              {(entry.tags || []).slice(0, 3).map(t => (
                                <span key={t} className="card-tag">{t}</span>
                              ))}
                            </div>
                            <div className="card-title">{entry.title}</div>
                            <div className="card-summary">
                              {truncated}
                              {isLong && <span className="card-read-more"> Read more</span>}
                            </div>
                            <div className="card-meta">
                              <div className="card-dates">
                                <span className="card-date">{fmtDate(entry.created_at)}</span>
                                {entry.updated_at && (new Date(entry.updated_at) - new Date(entry.created_at)) > 60000 && (
                                  <span className="card-modified">Edited {fmtDate(entry.updated_at)}</span>
                                )}
                              </div>
                              <span className="card-source">{entry.source_type}</span>
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
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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

    {session && (
      <ChatPanel
        session={session}
        entries={entries}
        onEntryAdded={handleEntryAdded}
        showToast={showToast}
      />
    )}
    </>
  )
}
