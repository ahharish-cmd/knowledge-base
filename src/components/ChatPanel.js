import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function findRelevantEntries(question, entries) {
  if (!entries || !entries.length) return []
  const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const scored = entries.map(e => {
    const text = (e.title + " " + e.summary + " " + e.key_insight + " " + (e.tags || []).join(" ")).toLowerCase()
    const score = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
    return { ...e, score }
  }).filter(e => e.score > 0).sort((a, b) => b.score - a.score)
  return scored.slice(0, 3)
}

export default function ChatPanel({ session, entries, onEntryAdded, showToast }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || loading) return
    setInput("")
    const userMsg = { role: "user", content: question }
    const relevant = findRelevantEntries(question, entries)
    setMessages(prev => [...prev, { type: "user", text: question, relevant }])
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, entries: relevant })
      })
      const data = await res.json()
      const reply = data.response || "Sorry, I could not generate a response."
      setMessages(prev => [...prev, { type: "assistant", text: reply, relevant }])
      setHistory(prev => [...prev, userMsg, { role: "assistant", content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { type: "assistant", text: "Error: " + e.message, relevant: [] }])
    }
    setLoading(false)
  }

  const saveAsEntry = async (msg) => {
    const conversationText = messages.map(m => (m.type === "user" ? "Q: " : "A: ") + m.text).join("\n\n")
    const { error } = await supabase.from("entries").insert({
      created_by: session.user.id,
      title: (messages[0]?.text || "AI Conversation").slice(0, 60),
      category: "Personal Growth",
      summary: msg.text.slice(0, 300),
      key_insight: msg.text.split(".")[0] + ".",
      source_type: "AI Conversation",
      tags: ["AI Chat"],
      raw_content: conversationText,
    })
    if (error) { showToast("Save failed", "error"); return }
    showToast("Conversation saved as entry")
    if (onEntryAdded) onEntryAdded()
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 1000,
        width: 52, height: 52, borderRadius: "50%",
        background: "#1a1714", color: "white", border: "none",
        cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }} title="Ask AI">
        {open ? "×" : "💬"}
      </button>

      {open && (
        <>
          {/* Solid overlay behind panel to block card grid */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 997,
            background: "rgba(26,23,20,0.45)",
          }} onClick={() => setOpen(false)} />

          <div style={{
            position: "fixed", bottom: 90, right: 28, zIndex: 999,
            width: 400, height: 540,
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
            border: "1px solid #d0c8be",
            display: "flex", flexDirection: "column",
            fontFamily: "Inter, sans-serif",
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #EEEAE3",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#ffffff",
              borderRadius: "16px 16px 0 0",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1714" }}>Ask your Knowledge Base</div>
                <div style={{ fontSize: 11, color: "#8a8078", marginTop: 2 }}>Searches your saved entries first</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {messages.length > 0 && (
                  <button onClick={() => { setMessages([]); setHistory([]) }} style={{
                    fontSize: 11, color: "#8a8078", background: "none",
                    border: "1px solid #d0c8be", borderRadius: 6,
                    padding: "3px 8px", cursor: "pointer"
                  }}>Clear</button>
                )}
                <button onClick={() => setOpen(false)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#8a8078", fontSize: 20, lineHeight: 1, padding: "0 2px"
                }}>×</button>
              </div>
            </div>

            <div style={{
              flex: 1, overflowY: "auto", padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 12,
              background: "#ffffff",
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#8a8078", fontSize: 13, marginTop: 40, lineHeight: 1.7 }}>
                  Ask anything about your saved knowledge.<br/>
                  <span style={{ fontSize: 11 }}>Try: "Explain CRR" or "What do I know about delegation?"</span>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.type === "user" ? "flex-end" : "flex-start" }}>
                  {msg.relevant?.length > 0 && msg.type === "user" && (
                    <div style={{ fontSize: 10, color: "#8a8078", marginBottom: 4, textAlign: "right" }}>
                      Found {msg.relevant.length} relevant {msg.relevant.length === 1 ? "entry" : "entries"}
                    </div>
                  )}
                  <div style={{
                    maxWidth: "85%", padding: "10px 13px", borderRadius: 12,
                    background: msg.type === "user" ? "#1a1714" : "#F7F4EF",
                    color: msg.type === "user" ? "white" : "#1a1714",
                    fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
                    borderBottomRightRadius: msg.type === "user" ? 4 : 12,
                    borderBottomLeftRadius: msg.type === "assistant" ? 4 : 12,
                  }}>
                    {msg.text}
                  </div>
                  {msg.type === "assistant" && (
                    <button onClick={() => saveAsEntry(msg)} style={{
                      marginTop: 5, fontSize: 11, color: "#a51d36",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "2px 4px", textDecoration: "underline"
                    }}>+ Save as entry</button>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8a8078", fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, border: "2px solid #d0c8be", borderTopColor: "#a51d36", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Thinking...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{
              padding: "12px 14px",
              borderTop: "1px solid #EEEAE3",
              display: "flex", gap: 8,
              background: "#ffffff",
              borderRadius: "0 0 16px 16px",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask anything..."
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 8,
                  border: "1px solid #d0c8be", background: "#FAFAF9",
                  fontSize: 13, color: "#1a1714", fontFamily: "inherit", outline: "none"
                }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
                padding: "9px 14px", borderRadius: 8, border: "none",
                background: "#1a1714", color: "white", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                opacity: !input.trim() || loading ? 0.5 : 1
              }}>Ask</button>
            </div>
          </div>
        </>
      )}
      <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
    </>
  )
}
