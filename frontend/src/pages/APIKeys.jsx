import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import api from '../services/api'

const PLAN_COLORS = {
  free: 'text-gray-300 border-gray-500/30 bg-gray-500/10',
  pro: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
  enterprise: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
}

const PLAN_LIMITS = {
  free:       { req_day: 100,    req_month: 1000,   tokens_month: 100000 },
  pro:        { req_day: 1000,   req_month: 30000,  tokens_month: 5000000 },
  enterprise: { req_day: 10000,  req_month: 300000, tokens_month: 50000000 },
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 transition rounded-lg px-2 py-1 text-xs ${
        copied
          ? 'text-green-400 bg-green-500/10'
          : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
      title="Copy"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width={small ? 12 : 14} height={small ? 12 : 14} fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width={small ? 12 : 14} height={small ? 12 : 14} fill="none" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path stroke="currentColor" strokeWidth="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      )}
      {!small && (copied ? 'Copied' : 'Copy')}
    </button>
  )
}

function ProgressBar({ value, max, color = 'bg-green-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const warn = pct > 80
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${warn ? 'bg-amber-400' : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* One-time key reveal modal */
function NewKeyModal({ fullKey, name, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1b2e] border border-green-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">API Key Created</h3>
            <p className="text-gray-400 text-xs">{name}</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" className="shrink-0 mt-0.5 text-amber-400">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
          </svg>
          <p className="text-amber-300 text-xs leading-relaxed">
            Copy this key now. For security, it will <strong>never be shown again</strong>.
          </p>
        </div>

        <div className="bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 mb-5 font-mono">
          <span className="text-green-300 text-sm flex-1 break-all select-all">{fullKey}</span>
          <CopyBtn text={fullKey} />
        </div>

        <button
          onClick={onClose}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-medium text-sm py-2.5 rounded-xl transition"
        >
          I've saved my key — Done
        </button>
      </div>
    </div>
  )
}

export default function APIKeys() {
  const navigate = useNavigate()
  const { openSidebar } = useOutletContext() || {}
  const [keys, setKeys] = useState([])
  const [usage, setUsage] = useState(null)
  const [limits, setLimits] = useState(null)
  const [tab, setTab] = useState('keys')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyModal, setNewKeyModal] = useState(null) // { key, name }
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [keysRes, usageRes, limitsRes] = await Promise.all([
        api.get('/keys'),
        api.get('/keys/usage'),
        api.get('/keys/limits'),
      ])
      setKeys(keysRes.data)
      setUsage(usageRes.data)
      setLimits(limitsRes.data)
    } catch {
      setError('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createKey = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    setError('')
    try {
      const { data } = await api.post('/keys', { name: newKeyName.trim() })
      setNewKeyModal({ key: data.key, name: data.name })
      setNewKeyName('')
      setShowCreate(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    try {
      await api.delete(`/keys/${id}`)
      setKeys(prev => prev.filter(k => k.id !== id))
    } catch {
      setError('Failed to revoke key')
    }
  }

  const plan = limits?.plan || 'free'
  const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  return (
    <div className="flex-1 overflow-y-auto bg-[#131420]">
      {newKeyModal && (
        <NewKeyModal
          fullKey={newKeyModal.key}
          name={newKeyModal.name}
          onClose={() => setNewKeyModal(null)}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button onClick={openSidebar}
              className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
              aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">API Platform</h1>
              <p className="text-gray-400 text-xs md:text-sm mt-0.5">Build with Rahnuma · OpenAI-compatible API</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            <span className="hidden sm:inline">Back to Chat</span>
          </button>
        </div>

        {/* Plan banner */}
        {limits && (
          <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase tracking-wide ${PLAN_COLORS[plan]}`}>
                {plan} plan
              </span>
              <span className="text-gray-400 text-sm">
                {fmtNum(planLimits.req_day)} req/day · {fmtNum(planLimits.req_month)} req/month · {fmtNum(planLimits.tokens_month)} tokens/month
              </span>
            </div>
            {plan === 'free' && (
              <span className="text-gray-600 text-xs">Contact admin to upgrade</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1a1b2e] p-1 rounded-xl mb-6 w-fit border border-white/8">
          {[
            { id: 'keys', label: 'API Keys' },
            { id: 'usage', label: 'Usage' },
            { id: 'docs', label: 'Documentation' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* ── API Keys Tab ── */}
        {tab === 'keys' && (
          <div className="space-y-4">
            {/* Create key */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm">API Keys</h3>
                  <p className="text-gray-500 text-xs mt-0.5">Keys are shown once — copy and store them securely</p>
                </div>
                <button
                  onClick={() => setShowCreate(v => !v)}
                  className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14"/>
                  </svg>
                  New key
                </button>
              </div>

              {showCreate && (
                <form onSubmit={createKey} className="px-5 py-4 border-b border-white/8 bg-white/2 flex items-center gap-3">
                  <input
                    autoFocus
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="Key name  (e.g. My App, Production)"
                    maxLength={100}
                    className="flex-1 bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/40 transition"
                  />
                  <button
                    type="submit"
                    disabled={creating || !newKeyName.trim()}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition"
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setNewKeyName('') }}
                    className="text-gray-500 hover:text-gray-300 text-sm transition px-2"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {loading ? (
                <div className="text-gray-600 text-sm text-center py-12">Loading…</div>
              ) : keys.length === 0 ? (
                <div className="text-center py-14 text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" className="mx-auto mb-3 opacity-30">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z"/>
                  </svg>
                  <p className="text-sm">No API keys yet</p>
                  <p className="text-xs mt-1">Create your first key to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {keys.map(key => (
                    <div key={key.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/2 transition">
                      <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                          <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z"/>
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-sm font-medium">{key.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PLAN_COLORS[key.plan] || PLAN_COLORS.free}`}>
                            {key.plan}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <code className="text-green-400/80 text-xs font-mono bg-white/5 px-2 py-0.5 rounded">
                            {key.key_prefix}…
                          </code>
                          <span className="text-gray-600 text-xs">·</span>
                          <span className="text-gray-500 text-xs">
                            {key.requests_today} req today · {key.requests_month} this month
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-gray-600 text-xs">
                          {key.last_used_at
                            ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                            : 'Never used'}
                        </p>
                        <p className="text-gray-700 text-xs">
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <button
                        onClick={() => revokeKey(key.id)}
                        title="Revoke key"
                        className="text-gray-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Usage Tab ── */}
        {tab === 'usage' && (
          <div className="space-y-5">
            {usage && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Requests Today',
                      value: fmtNum(usage.requests_today),
                      max: planLimits.req_day,
                      used: usage.requests_today,
                      color: 'border-green-500/25',
                    },
                    {
                      label: 'Requests This Month',
                      value: fmtNum(usage.requests_month),
                      max: planLimits.req_month,
                      used: usage.requests_month,
                      color: 'border-blue-500/25',
                    },
                    {
                      label: 'Tokens This Month',
                      value: fmtNum(usage.tokens_month),
                      max: planLimits.tokens_month,
                      used: usage.tokens_month,
                      color: 'border-purple-500/25',
                    },
                  ].map(card => (
                    <div key={card.label} className={`bg-[#1a1b2e] border ${card.color} rounded-2xl p-5`}>
                      <p className="text-gray-400 text-xs mb-2">{card.label}</p>
                      <p className="text-white text-2xl font-bold mb-3">{card.value}</p>
                      <ProgressBar value={card.used} max={card.max} />
                      <p className="text-gray-600 text-[10px] mt-1 text-right">
                        of {fmtNum(card.max)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recent requests */}
                <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/8">
                    <h3 className="text-white font-semibold text-sm">Recent Requests</h3>
                  </div>
                  {usage.recent_logs.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-12">No requests yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-gray-500 px-5 py-2.5 font-medium">Time</th>
                            <th className="text-left text-gray-500 px-3 py-2.5 font-medium">Key</th>
                            <th className="text-left text-gray-500 px-3 py-2.5 font-medium">Model</th>
                            <th className="text-right text-gray-500 px-3 py-2.5 font-medium">Tokens</th>
                            <th className="text-right text-gray-500 px-3 py-2.5 font-medium">Latency</th>
                            <th className="text-center text-gray-500 px-5 py-2.5 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {usage.recent_logs.map(log => (
                            <tr key={log.id} className="hover:bg-white/2 transition">
                              <td className="text-gray-400 px-5 py-3">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-3">
                                <code className="text-green-400/70 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                                  {log.key_prefix || '—'}…
                                </code>
                              </td>
                              <td className="text-gray-400 px-3 py-3">{log.model || '—'}</td>
                              <td className="text-gray-300 px-3 py-3 text-right">
                                {log.input_tokens + log.output_tokens}
                              </td>
                              <td className="text-gray-400 px-3 py-3 text-right">{log.latency_ms}ms</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  log.status_code === 200
                                    ? 'bg-green-500/15 text-green-300'
                                    : 'bg-red-500/15 text-red-300'
                                }`}>
                                  {log.status_code}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Docs Tab ── */}
        {tab === 'docs' && (
          <div className="space-y-5">
            {/* Base URL */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Base URL</h3>
              <div className="bg-[#0d0e1a] rounded-xl px-4 py-3 flex items-center gap-3 font-mono">
                <span className="text-green-300 text-sm flex-1">{window.location.origin}/api/v1</span>
                <CopyBtn text={`${window.location.origin}/api/v1`} small />
              </div>
            </div>

            {/* Authentication */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Authentication</h3>
              <p className="text-gray-400 text-sm mb-3">
                Pass your API key as a Bearer token in the <code className="text-green-300 bg-white/5 px-1 rounded">Authorization</code> header.
              </p>
              <div className="bg-[#0d0e1a] rounded-xl p-4 font-mono text-sm">
                <span className="text-blue-400">Authorization</span>
                <span className="text-gray-500">: </span>
                <span className="text-green-300">Bearer sk-rph-...</span>
              </div>
            </div>

            {/* Chat Completions */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-1">POST /chat/completions</h3>
              <p className="text-gray-500 text-xs mb-4">OpenAI-compatible chat endpoint. Supports streaming.</p>

              <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">Request</p>
              <div className="bg-[#0d0e1a] rounded-xl p-4 font-mono text-xs text-gray-300 mb-4 overflow-x-auto">
                <pre>{`curl ${window.location.origin}/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-rph-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "rahnuma-1",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'`}</pre>
              </div>

              <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">Response</p>
              <div className="bg-[#0d0e1a] rounded-xl p-4 font-mono text-xs text-gray-300 overflow-x-auto">
                <pre>{`{
  "id": "chatcmpl-v1",
  "object": "chat.completion",
  "model": "rahnuma-1",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 3,
    "completion_tokens": 8,
    "total_tokens": 11
  }
}`}</pre>
              </div>
            </div>

            {/* Models */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-1">GET /models</h3>
              <p className="text-gray-500 text-xs mb-4">List available models.</p>
              <div className="bg-[#0d0e1a] rounded-xl p-4 font-mono text-xs overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500">Response</span>
                  <CopyBtn text={`curl ${window.location.origin}/api/v1/models -H "Authorization: Bearer sk-rph-..."`} small />
                </div>
                <pre className="text-gray-300">{`{
  "object": "list",
  "data": [{"id": "rahnuma-1", "owned_by": "rahnuma"}]
}`}</pre>
              </div>
            </div>

            {/* Rate limits */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Rate Limits by Plan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left text-gray-500 py-2 font-medium">Plan</th>
                      <th className="text-right text-gray-500 py-2 font-medium">Req / Day</th>
                      <th className="text-right text-gray-500 py-2 font-medium">Req / Month</th>
                      <th className="text-right text-gray-500 py-2 font-medium">Tokens / Month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(PLAN_LIMITS).map(([p, lim]) => (
                      <tr key={p}>
                        <td className="py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_COLORS[p]}`}>
                            {p}
                          </span>
                        </td>
                        <td className="text-gray-300 text-right py-2.5">{fmtNum(lim.req_day)}</td>
                        <td className="text-gray-300 text-right py-2.5">{fmtNum(lim.req_month)}</td>
                        <td className="text-gray-300 text-right py-2.5">{fmtNum(lim.tokens_month)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
