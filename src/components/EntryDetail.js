import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_ORDER, SOURCE_TYPES, getCatColor, fmtDate, ytThumbnail } from '../lib/utils'

export default function EntryDetail({ entry, session, customCats, onClose, onDeleted, onUpdated, showToast }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...entry })
  const [saving, setSaving] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')

  const allCats = [...CAT_ORDER.filter(c => c !== 'Other'), ...customCats, 'Other']
  const isOwner = entry.created_by === session.user.id
  const catColor = getCatColor(entry.category)

  const handleDelete = async () => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    const { error } = await supabase.from('entries').delete().eq('id', entry.id)
    if (error) { showToast('Delete failed', 'error'); return }
    onDeleted()
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('entries').update({
      title: draft.title,
      category: draft.category,
      summary: draft.summary,
      key_insight: draft.key_insight,
      source_type: draft.source_type,
      tags: draft.tags,
      transcript: draft.transcript,
    }).eq('id', entry.id)
    setSaving(false)
    if (error) { showToast('Update failed', 'error'); return }
    onUpdated(draft)
    setEditing(false)
  }

  const addCustomCat = async (name) => {
    const trimmed = name.trim()
    if (!trimmed || allCats.includes(trimmed)) return
    await supabase.from('custom_categories').insert({ name: trimmed, created_by: session.user.id })
    setDraft(d => ({ ...d, category: trimmed }))
    setNewCatInput('')
  }

  if (editing) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Edit entry</div>
          <button className="btn-close" onClick={() => setEditing(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})}>
              {allCats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Source Type</label>
            <select className="form-select" value={draft.source_type} onChange={e => setDraft({...draft, source_type: e.target.value})}>
              {SOURCE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {draft.category === 'Other' && (
          <div className="new-cat-box">
            <div className="new-cat-prompt">Create new category</div>
            <div className="new-cat-row">
              <input className="form-input" style={{ flex: 1 }} placeholder="e.g. Sports Bikes..." value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomCat(newCatInput)} />
              <button className="btn-primary" onClick={() => addCustomCat(newCatInput)}>Add</button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Key Insight</label>
          <input className="form-input" value={draft.key_insight || ''} onChange={e => setDraft({...draft, key_insight: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="form-label">Summary</label>
          <textarea className="form-textarea" style={{ minHeight: 100 }} value={draft.summary || ''}
            onChange={e => setDraft({...draft, summary: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="form-label">Tags <span>(comma separated)</span></label>
          <input className="form-input" value={(draft.tags || []).join(', ')}
            onChange={e => setDraft({...draft, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} />
        </div>

        {draft.youtube_id && (
          <div className="form-group">
            <label className="form-label">Transcript</label>
            <textarea className="form-textarea" style={{ minHeight: 100 }}
              value={draft.transcript || ''}
              onChange={e => setDraft({...draft, transcript: e.target.value})} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <button className="btn-ghost" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          {isOwner && (
            <button className="btn-ghost" onClick={() => setEditing(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          )}
        </div>

        <span className="detail-cat-badge" style={{ background: catColor.bg, color: catColor.dot }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor.dot, display: 'inline-block' }} />
          {entry.category}
        </span>

        <div className="detail-title">{entry.title}</div>
        <div className="detail-meta">
          {fmtDate(entry.created_at)} · {entry.source_type}
          {entry.profiles?.full_name && ` · Added by ${entry.profiles.full_name}`}
        </div>

        {entry.key_insight && (
          <div className="insight-box">
            <div className="insight-label">Key Insight</div>
            <div className="insight-text">{entry.key_insight}</div>
          </div>
        )}

        {entry.summary && (
          <>
            <div className="detail-section-label">Summary</div>
            <div className="detail-body" style={{ marginBottom: 0 }}>{entry.summary}</div>
          </>
        )}

        {entry.tags?.length > 0 && (
          <>
            <div className="detail-section-label">Tags</div>
            <div className="card-tags" style={{ marginBottom: 0 }}>
              {entry.tags.map(t => <span key={t} className="card-tag" style={{ fontSize: 12, padding: '3px 10px' }}>{t}</span>)}
            </div>
          </>
        )}

        {entry.youtube_id && (
          <>
            <div className="detail-section-label">Video</div>
            <div className="yt-thumbnail">
              <img src={ytThumbnail(entry.youtube_id)} alt="YouTube thumbnail" />
              <div className="yt-bar">
                <span>YouTube · {entry.youtube_id}</span>
                <a className="yt-link" href={entry.youtube_url || `https://youtube.com/watch?v=${entry.youtube_id}`}
                  target="_blank" rel="noopener noreferrer">Watch ↗</a>
              </div>
            </div>
          </>
        )}

        {entry.transcript && (
          <>
            <div className="detail-section-label">Transcript</div>
            <div className="raw-content-box">{entry.transcript}</div>
          </>
        )}

        {entry.file_url && (
          <>
            <div className="detail-section-label">File</div>
            <div className="file-preview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1 }}>{entry.file_name}</span>
              <a href={entry.file_url} target="_blank" rel="noopener noreferrer" className="yt-link">Open ↗</a>
            </div>
          </>
        )}

        {entry.raw_content && (
          <>
            <div className="detail-section-label">Original Content</div>
            <div className="raw-content-box">{entry.raw_content}</div>
          </>
        )}

        <div className="modal-actions">
          {isOwner ? (
            <button className="btn-danger" onClick={handleDelete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--rule)' }}>Added by {entry.profiles?.full_name}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--rule)' }}>Synced across all devices</span>
        </div>
      </div>
    </div>
  )
}
