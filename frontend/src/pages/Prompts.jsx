import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrompts } from '../context/PromptContext'
import { useAuth } from '../context/AuthContext'

function PromptCard({ prompt, currentUserId, onUse, onEdit, onDelete }) {
  const isOwn = prompt.user_id === currentUserId
  return (
    <div className="bg-[#2f2f2f] border border-white/8 rounded-2xl p-4 flex flex-col gap-3 hover:border-white/15 transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            /{prompt.command}
          </span>
          <p className="text-white font-medium text-sm mt-2">{prompt.title}</p>
        </div>
        {prompt.is_public && !isOwn && (
          <span className="text-[10px] text-gray-500 border border-white/10 rounded-full px-2 py-0.5 shrink-0">built-in</span>
        )}
      </div>
      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 flex-1">{prompt.content}</p>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onUse(prompt)}
          className="flex-1 text-xs font-medium bg-white/10 hover:bg-white/15 text-white py-1.5 rounded-xl transition"
        >
          Use in Chat
        </button>
        {isOwn && (
          <>
            <button
              onClick={() => onEdit(prompt)}
              className="text-gray-500 hover:text-gray-300 p-1.5 rounded-lg hover:bg-white/10 transition"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => onDelete(prompt.id)}
              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/10 transition"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const EMPTY_FORM = { command: '', title: '', content: '', is_public: false }

export default function Prompts() {
  const { prompts, loadPrompts, createPrompt, updatePrompt, deletePrompt } = usePrompts()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadPrompts() }, [loadPrompts])

  const filtered = prompts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.command.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = (prompt) => {
    setEditing(prompt)
    setForm({ command: prompt.command, title: prompt.title, content: prompt.content, is_public: prompt.is_public })
    setError('')
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.command.trim() || !form.title.trim() || !form.content.trim()) {
      setError('All fields are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updatePrompt(editing.id, form)
      } else {
        await createPrompt(form)
      }
      setShowForm(false)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleUse = (prompt) => {
    sessionStorage.setItem('pendingPrompt', prompt.content)
    navigate('/chat')
  }

  return (
    <div className="flex flex-col h-full bg-[#212121] overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Prompts</h1>
            <p className="text-gray-500 text-sm mt-1">Reusable prompt templates — type <code className="text-green-400">/command</code> in chat to use them</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-white text-black font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14"/>
            </svg>
            New Prompt
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.5"/>
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full bg-[#2f2f2f] text-gray-200 placeholder-gray-500 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none border border-white/8 focus:border-white/20 transition"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <PromptCard
              key={p.id}
              prompt={p}
              currentUserId={user?.id}
              onUse={handleUse}
              onEdit={openEdit}
              onDelete={deletePrompt}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-3 text-center text-gray-600 py-16">No prompts found</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
              <h2 className="text-white font-semibold">{editing ? 'Edit Prompt' : 'New Prompt'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition">✕</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Slash Command</label>
                <div className="flex items-center bg-[#2f2f2f] border border-white/10 rounded-xl overflow-hidden focus-within:border-white/25">
                  <span className="text-green-400 pl-3 font-mono text-sm">/</span>
                  <input
                    value={form.command}
                    onChange={e => setForm({ ...form, command: e.target.value.replace(/\s/g, '') })}
                    placeholder="summarize"
                    className="flex-1 bg-transparent text-white text-sm px-2 py-2.5 focus:outline-none placeholder-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Summarize Text"
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                  Prompt Content <span className="text-gray-600 font-normal normal-case">(use {'{{text}}'} as placeholder)</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="Summarize the following in bullet points:&#10;&#10;{{text}}"
                  rows={5}
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 resize-none placeholder-gray-600"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={e => setForm({ ...form, is_public: e.target.checked })}
                  className="rounded accent-green-500" />
                <span className="text-gray-400 text-sm">Make public (visible to all users)</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 py-2.5 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 text-sm font-semibold bg-white text-black hover:bg-gray-100 py-2.5 rounded-xl transition disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
