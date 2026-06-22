import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../context/ChatContext'
import { usePrompts } from '../../context/PromptContext'

const ACCEPT = '.txt,.md,.csv,.pdf,.docx,.json,.py,.js,.ts,.html'
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function MessageInput({ onSend }) {
  const { sendMessage, streaming, stopGeneration, activeDoc, uploadDocument, clearDocument } = useChat()
  const { prompts } = usePrompts()

  const [text, setText] = useState('')
  const [webSearch, setWebSearch] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [listening, setListening] = useState(false)
  const [slashSuggestions, setSlashSuggestions] = useState([])
  const [suggestionIdx, setSuggestionIdx] = useState(0)

  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)
  const suggestRef = useRef(null)

  /* ── slash command filtering ── */
  useEffect(() => {
    const m = text.match(/^\/(\w*)$/)
    if (m) {
      const q = m[1].toLowerCase()
      const matches = prompts.filter(p =>
        p.command.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
      ).slice(0, 6)
      setSlashSuggestions(matches)
      setSuggestionIdx(0)
    } else {
      setSlashSuggestions([])
    }
  }, [text, prompts])

  /* ── close suggestions on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setSlashSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyPrompt = (prompt) => {
    setText(prompt.content)
    setSlashSuggestions([])
    textareaRef.current?.focus()
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
      }
    }, 0)
  }

  /* ── voice ── */
  const startListening = () => {
    if (!SpeechRecognition) {
      setUploadError('Voice input requires Chrome or Edge browser.')
      setTimeout(() => setUploadError(''), 3500)
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setText(prev => prev ? prev + ' ' + transcript : transcript)
      textareaRef.current?.focus()
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  /* ── send ── */
  const handleSubmit = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    if (onSend) await onSend(trimmed, webSearch)
    else await sendMessage(trimmed, null, webSearch)
  }

  const handleKeyDown = (e) => {
    if (slashSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIdx(i => Math.min(i + 1, slashSuggestions.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyPrompt(slashSuggestions[suggestionIdx]); return }
      if (e.key === 'Escape') { setSlashSuggestions([]); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  /* ── file upload ── */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadError('')
    setUploading(true)
    try {
      await uploadDocument(file)
    } catch (err) {
      const detail = err.response?.data?.detail
      setUploadError(typeof detail === 'string' ? detail : 'Upload failed')
      setTimeout(() => setUploadError(''), 4000)
    } finally {
      setUploading(false)
    }
  }

  const canSend = text.trim().length > 0 && !streaming

  return (
    <div className="px-4 pb-6 pt-2 shrink-0">
      <div className="max-w-3xl mx-auto">

        {/* Attached document banner */}
        {activeDoc && (
          <div className="flex items-center gap-2 mb-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
            <span className="text-amber-400 text-sm">📎</span>
            <span className="text-amber-300 text-xs flex-1 truncate">{activeDoc.filename}</span>
            <span className="text-amber-500/60 text-xs">{(activeDoc.size / 1024).toFixed(0)} KB</span>
            <button onClick={clearDocument} className="text-amber-500/60 hover:text-amber-300 transition text-xs ml-1" title="Remove document">✕</button>
          </div>
        )}

        {/* Upload / voice error */}
        {uploadError && (
          <div className="flex items-center gap-2 mb-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
            <span className="text-red-400 text-xs">{uploadError}</span>
          </div>
        )}

        {/* Slash suggestions popup */}
        {slashSuggestions.length > 0 && (
          <div ref={suggestRef}
            className="mb-1 bg-[#1a1b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <p className="text-gray-600 text-[10px] px-3 pt-2 pb-1 font-medium uppercase tracking-wider">Prompts</p>
            {slashSuggestions.map((p, i) => (
              <button key={p.id} onMouseDown={(e) => { e.preventDefault(); applyPrompt(p) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                  i === suggestionIdx ? 'bg-white/8' : 'hover:bg-white/5'
                }`}>
                <span className="text-green-400 font-mono text-xs bg-green-500/10 px-1.5 py-0.5 rounded">/{p.command}</span>
                <span className="text-gray-300 text-sm flex-1 truncate">{p.title}</span>
                <span className="text-gray-600 text-xs hidden sm:block truncate max-w-[140px]">{p.content.slice(0, 40)}…</span>
              </button>
            ))}
          </div>
        )}

        {/* Input box */}
        <div className="relative bg-[#1c1e30] rounded-2xl border border-white/10 focus-within:border-green-500/40 transition">

          {/* Left cluster: file attach + web search */}
          <div className="absolute left-2 bottom-2.5 flex items-center gap-0.5">
            {/* File attach */}
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={streaming || uploading} title="Attach file"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition
                ${uploading ? 'text-amber-400 animate-pulse' : 'text-gray-500 hover:text-gray-300 hover:bg-white/10'}
                disabled:opacity-40`}>
              {uploading ? (
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />

            {/* Web search toggle */}
            <button type="button" onClick={() => setWebSearch(v => !v)}
              title={webSearch ? 'Web search ON — click to disable' : 'Enable web search'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                webSearch
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/10'
              }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path stroke="currentColor" strokeWidth="2" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              webSearch
                ? 'Search the web + ask Rahnuma…'
                : activeDoc
                  ? `Ask about "${activeDoc.filename}"…`
                  : 'Message Rahnuma… (type / for prompts)'
            }
            rows={1}
            className="w-full bg-transparent text-white text-sm px-20 py-4 pr-24 focus:outline-none resize-none placeholder-gray-500 leading-relaxed"
            style={{ minHeight: '52px', maxHeight: '200px' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
            }}
          />

          {/* Mic button */}
          <button type="button" onClick={listening ? stopListening : startListening}
            disabled={streaming} title={listening ? 'Stop recording' : 'Voice input'}
            className={`absolute right-14 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center transition
              ${listening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-gray-300 hover:bg-white/10 disabled:opacity-30'}`}>
            {listening ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2"/>
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
              </svg>
            )}
          </button>

          {/* Send / Stop button */}
          {streaming ? (
            <button onClick={stopGeneration} title="Stop generating"
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center bg-green-600 hover:bg-green-500 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#fff">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canSend}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg flex items-center justify-center bg-green-600 disabled:bg-white/10 disabled:cursor-not-allowed hover:bg-green-500 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Web search indicator */}
        {webSearch && (
          <p className="text-center text-blue-400/70 text-xs mt-2">
            🌐 Web search enabled — responses will include live search results
          </p>
        )}
        {!webSearch && (
          <p className="text-center text-gray-600 text-xs mt-3">
            Rahnuma · Riphah International University — AI responses may not always be accurate.
          </p>
        )}
      </div>
    </div>
  )
}
