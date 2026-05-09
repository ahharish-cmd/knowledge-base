import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  CAT_ORDER, SOURCE_TYPES, getCatColor,
  isYouTubeUrl, extractYouTubeId, ytThumbnail,
  localCategorise, extractTags, detectSourceType,
  generateTitle, generateSummary, generateInsight
} from '../lib/utils'

async function aiCategorise(text) {
  try {
    const res = await fetch('/api/categorise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) throw new Error('API error ' + res.status)
    return await res.json()
  } catch (e) {
    console.error('AI categorise failed:', e.message)
    return null
  }
}


function TagInput({ tags, onChange }) {
  const [input, setInput] = React.useState('')

  const addTag = (val) => {
    const trimmed = val.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag))

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px',
      border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
      cursor: 'text', minHeight: 42
    }} onClick={e => e.currentTarget.querySelector('input')?.focus()}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--accent-light)', color: 'var(--accent)',
          padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500
        }}>
          {tag}
          <button onClick={() => removeTag(tag)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', padding: 0, lineHeight: 1, fontSize: 14
          }}>x</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) { addTag(input); setInput('') } }}
        placeholder={tags.length === 0 ? 'Type a tag and press Enter or comma' : ''}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 120,
          fontFamily: 'inherit'
        }}
      />
    </div>
  )
}

export default function AddEntry({ session, customCats, onClose, onAdded, showToast }) {
  const [step, setStep] = useState('input') // input | review
  const [rawInput, setRawInput] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(null)
  const [newCatInput, setNewCatInput] = useState('')
  const fileRef = useRef(null)

  const allCats = [...CAT_ORDER.filter(c => c !== 'Other'), ...customCats, 'Other']
  const isYT = isYouTubeUrl(rawInput)
  const ytId = isYT ? extractYouTubeId(rawInput) : null

  const handleFile = (f) => {
    if (!f) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(f.type)) {
      showToast('Only PDF and image files supported', 'error')
      return
    }
    setFile(f)
    setRawInput(prev => prev || f.name)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const extractPdfText = async (pdfFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result)
          if (!window.pdfjsLib) {
            resolve(`PDF: ${pdfFile.name}`)
            return
          }
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise
          let text = ''
          const maxPages = Math.min(pdf.numPages, 10)
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            text += content.items.map(item => item.str).join(' ') + '\n'
          }
          resolve(text.slice(0, 4000) || `PDF: ${pdfFile.name}`)
        } catch (err) {
          resolve(`PDF: ${pdfFile.name}`)
        }
      }
      reader.readAsArrayBuffer(pdfFile)
    })
  }

  const processEntry = async () => {
    if (!rawInput.trim() && !file) return
    setProcessing(true)

    let textForAI = rawInput.trim()
    const fileType = file?.type || ''
    
    if (!textForAI && file) {
      if (file.type === 'application/pdf') {
        textForAI = await extractPdfText(file)
      } else {
        textForAI = `File: ${file.name}`
      }
    }

    // Try AI first, fall back to local
    let meta = await aiCategorise(textForAI)
    if (!meta) {
      meta = {
        title: generateTitle(textForAI),
        category: localCategorise(textForAI),
        summary: generateSummary(textForAI),
        key_insight: generateInsight(textForAI),
        tags: extractTags(textForAI),
        source_type: detectSourceType(textForAI, fileType),
      }
    }

    if (isYT) { meta.source_type = 'Video'; meta.youtube_id = ytId; meta.youtube_url = rawInput.trim() }

    setDraft({
      ...meta,
      raw_content: rawInput.trim(),
      transcript: '',
      youtube_id: ytId || null,
      youtube_url: isYT ? rawInput.trim() : null,
    })
    setProcessing(false)
    setStep('review')
  }

  const addCustomCat = async (name) => {
    const trimmed = name.trim()
    if (!trimmed || allCats.includes(trimmed)) return
    const { error } = await supabase.from('custom_categories').insert({ name: trimmed, created_by: session.user.id })
    if (error) { showToast('Category save failed: ' + error.message, 'error'); return }
    setDraft(d => ({ ...d, category: trimmed }))
    setNewCatInput('')
    showToast('Category added: ' + trimmed)
  }

  const saveEntry = async () => {
    setSaving(true)
    let fileUrl = null, fileName = null, fileType = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${session.user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('knowledge-files')
        .upload(path, file)
      if (uploadError) {
        showToast('File upload failed', 'error')
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('knowledge-files').getPublicUrl(path)
      fileUrl = publicUrl
      fileName = file.name
      fileType = file.type
    }

    const { error } = await supabase.from('entries').insert({
      created_by: session.user.id,
      title: draft.title,
      category: draft.category,
      summary: draft.summary,
      key_insight: draft.key_insight,
      source_type: draft.source_type,
      tags: draft.tags,
      raw_content: draft.raw_content,
      youtube_id: draft.youtube_id || null,
      youtube_url: draft.youtube_url || null,
      transcript: draft.transcript || null,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    })

    setSaving(false)
    if (error) { showToast('Save failed: ' + error.message, 'error'); return }
    onAdded()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            {step === 'input' ? 'Add to knowledge base' : 'Review before saving'}
          </div>
          <button className="btn-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {step === 'input' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
              Paste any text, a YouTube URL, or upload a PDF / image. Claude will read and categorise it.
            </p>

            <div className="form-group">
              <label className="form-label">Content or URL</label>
              <textarea
                className="form-textarea"
                placeholder="Paste article, AI conversation, YouTube URL, notes..."
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                autoFocus
              />
            </div>

            {isYT && ytId && (
              <div className="yt-thumbnail" style={{ marginBottom: 14 }}>
                <img src={ytThumbnail(ytId)} alt="YouTube thumbnail" />
                <div className="yt-bar">
                  <span>YouTube video detected</span>
                  <a className="yt-link" href={rawInput} target="_blank" rel="noopener noreferrer">Preview ↗</a>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Or upload a file <span>(PDF, image, screenshot)</span></label>
              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div className="upload-zone-text">{file ? file.name : 'Click to upload or drag and drop'}</div>
                <div className="upload-zone-sub">PDF, JPG, PNG, WEBP</div>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            {processing && (
              <div className="processing-box">
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Claude is reading and categorising your content...
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                disabled={(!rawInput.trim() && !file) || processing}
                onClick={processEntry}
              >
                {processing ? 'Processing...' : 'Process & Review →'}
              </button>
            </div>
          </>
        )}

        {step === 'review' && draft && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
              Auto-filled by Claude. Edit anything before saving.
            </p>

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

            {(draft.category === 'Other' || draft.category === 'Uncategorised') && (
              <div className="new-cat-box">
                <div className="new-cat-prompt">Create new category</div>
                <div className="new-cat-row">
                  <input className="form-input" style={{ flex: 1 }} placeholder="e.g. Sports Bikes, Aviation..." value={newCatInput}
                    onChange={e => setNewCatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomCat(newCatInput)} />
                  <button className="btn-primary" onClick={() => addCustomCat(newCatInput)}>Add</button>
                </div>
                <div className="new-cat-note">Saved permanently, visible to all users.</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Key Insight</label>
              <input className="form-input" value={draft.key_insight} onChange={e => setDraft({...draft, key_insight: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Tags</label>
              <TagInput tags={draft.tags || []} onChange={tags => setDraft({...draft, tags})} />
            </div>

            {draft.youtube_id && (
              <>
                <div className="yt-thumbnail" style={{ marginBottom: 10 }}>
                  <img src={ytThumbnail(draft.youtube_id)} alt="YouTube thumbnail" />
                  <div className="yt-bar">
                    <span>YouTube · {draft.youtube_id}</span>
                    <a className="yt-link" href={draft.youtube_url} target="_blank" rel="noopener noreferrer">Watch ↗</a>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Transcript <span>(optional — paste from YouTube "Show transcript")</span></label>
                  <textarea className="form-textarea" style={{ minHeight: 100 }}
                    placeholder="Open YouTube → click ··· → Show transcript → copy here..."
                    value={draft.transcript || ''}
                    onChange={e => setDraft({...draft, transcript: e.target.value})} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setStep('input')}>← Back</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={onClose}>Discard</button>
                <button className="btn-primary" disabled={saving} onClick={saveEntry}>
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
