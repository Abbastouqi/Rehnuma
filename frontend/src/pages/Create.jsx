import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBot } from '../context/BotContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const CATEGORIES = ['General', 'Programming', 'Writing', 'Productivity', 'Research & Analysis', 'Education', 'Lifestyle']
const MODELS = ['', 'unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M', 'ggml-org/gemma-4-12B-it-GGUF:Q4_K_M']
const ICONS = ['🤖', '🐍', '✍️', '📐', '🔬', '⚡', '👨‍💻', '🎨', '📊', '🌍', '🎓', '💡', '🔧', '🎭', '🚀']

const EMPTY = {
  name: '',
  description: '',
  instructions: '',
  starters: ['', '', '', ''],
  knowledge: [],
  capabilities: { webSearch: false, imageGen: false, codeInterpreter: false },
  model: '',
  category: 'General',
  icon: '🤖',
  is_public: true,
}

export default function Create() {
  const [params] = useSearchParams()
  const editId = params.get('id')
  const navigate = useNavigate()
  const { getBot, createBot, updateBot } = useBot()

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewMessages, setPreviewMessages] = useState([])
  const [previewInput, setPreviewInput] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const previewBottom = useRef(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (editId) {
      getBot(editId).then(bot => {
        setForm({
          name: bot.name,
          description: bot.description,
          instructions: bot.instructions,
          starters: [...bot.starters, '', '', '', ''].slice(0, 4),
          knowledge: bot.knowledge || [],
          capabilities: bot.capabilities || EMPTY.capabilities,
          model: bot.model || '',
          category: bot.category,
          icon: bot.icon,
          is_public: bot.is_public,
        })
      }).catch(() => setError('Failed to load bot'))
    }
  }, [editId, getBot])

  useEffect(() => {
    previewBottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [previewMessages])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const setStarter = (i, val) => {
    const s = [...form.starters]
    s[i] = val
    set('starters', s)
  }

  const setCap = (key, val) => set('capabilities', { ...form.capabilities, [key]: val })

  const handleKnowledge = async (e) => {
    const files = Array.from(e.target.files)
    const results = []
    for (const file of files) {
      const text = await file.text()
      results.push({ name: file.name, text })
    }
    set('knowledge', [...form.knowledge, ...results])
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = {
        ...form,
        starters: form.starters.filter(s => s.trim()),
      }
      if (editId) {
        await updateBot(editId, payload)
        setSuccess('Bot updated successfully!')
      } else {
        const bot = await createBot(payload)
        setSuccess('Bot created! Redirecting to Explore...')
        setTimeout(() => navigate('/explore'), 1200)
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const sendPreview = async () => {
    if (!previewInput.trim() || previewing) return
    const userMsg = { role: 'user', content: previewInput.trim() }
    setPreviewMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setPreviewInput('')
    setPreviewing(true)

    try {
      const response = await fetch('/api/bots/preview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          instructions: form.instructions,
          message: userMsg.content,
          history: previewMessages.filter(m => m.content),
        }),
      })
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const chunk = line.slice(6)
          if (chunk === '[DONE]') break
          setPreviewMessages(prev => {
            const updated = [...prev]
            const last = { ...updated[updated.length - 1] }
            last.content += chunk
            updated[updated.length - 1] = last
            return updated
          })
        }
      }
    } catch (e) {
      setPreviewMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Preview error — check your instructions.' }
        return updated
      })
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#212121]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-white font-semibold">{editId ? 'Edit GPT' : 'Create a GPT'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-400 text-sm">{error}</span>}
          {success && <span className="text-green-400 text-sm">{success}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Config form */}
        <div className="w-1/2 overflow-y-auto border-r border-white/10 px-6 py-6 space-y-6">

          {/* Icon + Name */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#2f2f2f] border border-white/10 flex items-center justify-center text-3xl">
                {form.icon}
              </div>
              <select
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="GPT name"
                className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/25"
              />
              <input
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Short description shown on cards"
                className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Instructions</label>
            <p className="text-xs text-gray-500 mb-2">Define the bot's personality, rules, and behavior. This becomes the system prompt.</p>
            <textarea
              value={form.instructions}
              onChange={e => set('instructions', e.target.value)}
              placeholder="You are a helpful assistant that..."
              rows={6}
              className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/25 resize-none leading-relaxed"
            />
          </div>

          {/* Starters */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Conversation Starters</label>
            <p className="text-xs text-gray-500 mb-2">Up to 4 prompts shown on the chat welcome screen</p>
            <div className="space-y-2">
              {form.starters.map((s, i) => (
                <input
                  key={i}
                  value={s}
                  onChange={e => setStarter(i, e.target.value)}
                  placeholder={`Starter ${i + 1}`}
                  className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/25"
                />
              ))}
            </div>
          </div>

          {/* Knowledge */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Knowledge</label>
            <p className="text-xs text-gray-500 mb-2">Upload .txt or .md files — their content is injected into the system context</p>
            <label className="flex items-center justify-center gap-2 w-full border border-dashed border-white/15 rounded-xl py-4 cursor-pointer hover:border-white/30 transition text-gray-500 text-sm hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Upload files
              <input type="file" accept=".txt,.md" multiple onChange={handleKnowledge} className="hidden" />
            </label>
            {form.knowledge.length > 0 && (
              <div className="mt-2 space-y-1">
                {form.knowledge.map((k, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#2f2f2f] rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-300 truncate">{k.name}</span>
                    <button
                      onClick={() => set('knowledge', form.knowledge.filter((_, j) => j !== i))}
                      className="text-gray-500 hover:text-red-400 ml-2 text-xs"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Capabilities</label>
            {[
              { key: 'webSearch', label: 'Web Search', desc: 'Let the bot search the web' },
              { key: 'imageGen', label: 'Image Generation', desc: 'Generate images from prompts' },
              { key: 'codeInterpreter', label: 'Code Interpreter', desc: 'Run and analyse code' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between py-2.5 border-b border-white/5 cursor-pointer group">
                <div>
                  <p className="text-sm text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <div
                  onClick={() => setCap(key, !form.capabilities[key])}
                  className={`w-10 h-5 rounded-full transition relative ${form.capabilities[key] ? 'bg-blue-600' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.capabilities[key] ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            ))}
          </div>

          {/* Model + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Model</label>
              <select
                value={form.model}
                onChange={e => set('model', e.target.value)}
                className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-white/25"
              >
                <option value="">Default</option>
                {MODELS.filter(Boolean).map(m => <option key={m} value={m}>{m.split('/')[1]?.split(':')[0] || m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-white/25"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Public toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-200">Public</p>
              <p className="text-xs text-gray-500">Visible to all users on Explore</p>
            </div>
            <div
              onClick={() => set('is_public', !form.is_public)}
              className={`w-10 h-5 rounded-full transition relative ${form.is_public ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_public ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>
        </div>

        {/* Right: Live preview */}
        <div className="w-1/2 flex flex-col bg-[#1a1a1a]">
          <div className="px-5 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{form.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{form.name || 'Preview'}</p>
                <p className="text-gray-500 text-xs">Live preview</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {previewMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <p className="text-gray-500 text-sm">Test your bot here before saving</p>
                {form.starters.filter(Boolean).length > 0 && (
                  <div className="mt-4 space-y-2 w-full max-w-sm">
                    {form.starters.filter(Boolean).map((s, i) => (
                      <button key={i} onClick={() => { setPreviewInput(s); }} className="w-full text-left text-xs text-gray-400 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5 transition">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {previewMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'items-start gap-2'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black shrink-0 mt-0.5">
                        {form.icon}
                      </div>
                    )}
                    <div className={`text-xs leading-relaxed rounded-xl px-3 py-2 max-w-[80%] ${
                      msg.role === 'user' ? 'bg-[#2f2f2f] text-gray-100' : 'text-gray-300'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm prose-invert max-w-none">
                          {msg.content || '...'}
                        </ReactMarkdown>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={previewBottom} />
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2">
              <input
                value={previewInput}
                onChange={e => setPreviewInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendPreview()}
                placeholder="Test your bot..."
                disabled={previewing}
                className="flex-1 bg-[#2f2f2f] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white/25"
              />
              <button
                onClick={sendPreview}
                disabled={!previewInput.trim() || previewing}
                className="bg-white text-black rounded-xl px-3 py-2 text-xs font-medium hover:bg-gray-100 disabled:opacity-30 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
