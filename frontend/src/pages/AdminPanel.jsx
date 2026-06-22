import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const TABS = ['Overview', 'Users', 'Chats', 'API Keys', 'Usage Logs']

const PLAN_COLORS = {
  free: 'text-gray-300 border-gray-500/30 bg-gray-500/10',
  pro: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
  enterprise: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`bg-[#2f2f2f] rounded-2xl p-5 border ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
      </div>
      <p className="text-white text-3xl font-bold">{value ?? '—'}</p>
    </div>
  )
}

export default function AdminPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [chats, setChats] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [usageLogs, setUsageLogs] = useState([])
  const [apiStats, setApiStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin') navigate('/chat')
  }, [user, navigate])

  const loadStats = useCallback(async () => {
    const { data } = await api.get('/admin/stats')
    setStats(data)
  }, [])

  const loadUsers = useCallback(async () => {
    const { data } = await api.get('/admin/users')
    setUsers(data)
  }, [])

  const loadChats = useCallback(async () => {
    const { data } = await api.get('/admin/chats')
    setChats(data)
  }, [])

  const loadApiKeys = useCallback(async () => {
    const [keysRes, statsRes] = await Promise.all([
      api.get('/admin/api-keys'),
      api.get('/admin/api-stats'),
    ])
    setApiKeys(keysRes.data)
    setApiStats(statsRes.data)
  }, [])

  const loadUsageLogs = useCallback(async () => {
    const { data } = await api.get('/admin/usage-logs')
    setUsageLogs(data)
  }, [])

  const toggleApiKey = async (id, current) => {
    await api.put(`/admin/api-keys/${id}`, { is_active: !current })
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: !current } : k))
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    const loaders = {
      Overview: loadStats,
      Users: loadUsers,
      Chats: loadChats,
      'API Keys': loadApiKeys,
      'Usage Logs': loadUsageLogs,
    }
    loaders[tab]?.()
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [tab, loadStats, loadUsers, loadChats, loadApiKeys, loadUsageLogs])

  const toggleActive = async (userId, current) => {
    await api.put(`/admin/users/${userId}`, { is_active: !current })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
  }

  const toggleRole = async (userId, current) => {
    const next = current === 'admin' ? 'user' : 'admin'
    await api.put(`/admin/users/${userId}`, { role: next })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: next } : u))
  }

  const deleteUser = async (userId) => {
    if (!confirm('Delete this user and all their data?')) return
    await api.delete(`/admin/users/${userId}`)
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (stats) setStats({ ...stats, users: stats.users - 1 })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#212121]">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-0.5">Rahnuma · Riphah International University</p>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to Chat
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#2f2f2f] p-1 rounded-xl mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
        )}

        {loading && (
          <div className="text-gray-500 text-sm text-center py-16">Loading...</div>
        )}

        {/* Overview */}
        {!loading && tab === 'Overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Users" value={stats.users} icon="👤" color="border-blue-500/25 text-blue-300" />
              <StatCard label="Chats" value={stats.chats} icon="💬" color="border-purple-500/25 text-purple-300" />
              <StatCard label="Messages" value={stats.messages} icon="📝" color="border-green-500/25 text-green-300" />
              <StatCard label="Documents" value={stats.documents} icon="📎" color="border-amber-500/25 text-amber-300" />
            </div>
            <div className="bg-[#2f2f2f] rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-semibold mb-1">System Info</h3>
              <p className="text-gray-400 text-sm">Model: Qwen3-4B-Instruct · rahnuma.riphah.edu.pk</p>
              <p className="text-gray-400 text-sm mt-1">Platform: Rahnuma — Riphah International University AI Assistant</p>
              <p className="text-gray-500 text-xs mt-2">Default admin credentials: <code className="bg-black/30 px-1 rounded">admin / admin123</code> — change after first login</p>
            </div>
          </div>
        )}

        {/* Users */}
        {!loading && tab === 'Users' && (
          <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Users ({users.length})</h3>
            </div>
            <div className="divide-y divide-white/5">
              {users.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-12">No users found</p>
              )}
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-yellow-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{u.username}</p>
                    <p className="text-gray-500 text-xs truncate">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    u.role === 'admin'
                      ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                      : 'bg-gray-500/15 text-gray-400 border-gray-500/20'
                  }`}>
                    {u.role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    u.is_active
                      ? 'bg-green-500/15 text-green-300 border-green-500/25'
                      : 'bg-red-500/15 text-red-400 border-red-500/25'
                  }`}>
                    {u.is_active ? 'active' : 'disabled'}
                  </span>
                  {u.id !== user.id && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        className="text-gray-500 hover:text-yellow-400 p-1.5 rounded-lg hover:bg-white/5 transition text-xs"
                      >
                        {u.role === 'admin' ? '↓' : '↑'}
                      </button>
                      <button
                        onClick={() => toggleActive(u.id, u.is_active)}
                        title={u.is_active ? 'Disable' : 'Enable'}
                        className="text-gray-500 hover:text-blue-400 p-1.5 rounded-lg hover:bg-white/5 transition text-xs"
                      >
                        {u.is_active ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        title="Delete user"
                        className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition text-xs"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                  {u.id === user.id && (
                    <span className="text-gray-600 text-xs italic">you</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chats */}
        {!loading && tab === 'Chats' && (
          <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Recent Conversations ({chats.length})</h3>
            </div>
            <div className="divide-y divide-white/5">
              {chats.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-12">No conversations yet</p>
              )}
              {chats.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition">
                  <div className="w-7 h-7 rounded-full bg-[#3f3f3f] flex items-center justify-center text-gray-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{c.title}</p>
                    <p className="text-gray-500 text-xs">by {c.username}</p>
                  </div>
                  <span className="text-gray-600 text-xs shrink-0">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Keys */}
        {!loading && tab === 'API Keys' && (
          <div className="space-y-5">
            {apiStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Keys" value={apiStats.total_keys} icon="🔑" color="border-green-500/25 text-green-300" />
                <StatCard label="Active Keys" value={apiStats.active_keys} icon="✅" color="border-blue-500/25 text-blue-300" />
                <StatCard label="Req / Month" value={apiStats.total_requests_month} icon="📊" color="border-purple-500/25 text-purple-300" />
                <StatCard label="Tokens / Month" value={apiStats.total_tokens_month} icon="⚡" color="border-amber-500/25 text-amber-300" />
              </div>
            )}
            <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="text-white font-semibold">All API Keys ({apiKeys.length})</h3>
              </div>
              <div className="divide-y divide-white/5">
                {apiKeys.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-12">No API keys found</p>
                )}
                {apiKeys.map(k => (
                  <div key={k.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white text-sm font-medium">{k.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PLAN_COLORS[k.plan] || PLAN_COLORS.free}`}>
                          {k.plan}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          k.is_active
                            ? 'bg-green-500/15 text-green-300 border-green-500/25'
                            : 'bg-red-500/15 text-red-400 border-red-500/25'
                        }`}>
                          {k.is_active ? 'active' : 'revoked'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-green-400/70 text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">{k.key_prefix}…</code>
                        <span className="text-gray-600 text-xs">by {k.username}</span>
                        <span className="text-gray-700 text-xs">· {k.requests_month} req/mo</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleApiKey(k.id, k.is_active)}
                        title={k.is_active ? 'Revoke' : 'Reactivate'}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                          k.is_active
                            ? 'text-red-400 border-red-500/25 hover:bg-red-500/10'
                            : 'text-green-400 border-green-500/25 hover:bg-green-500/10'
                        }`}
                      >
                        {k.is_active ? 'Revoke' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Usage Logs */}
        {!loading && tab === 'Usage Logs' && (
          <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Recent API Requests (last 100)</h3>
            </div>
            {usageLogs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">No API requests yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left text-gray-500 px-5 py-3 font-medium">Time</th>
                      <th className="text-left text-gray-500 px-3 py-3 font-medium">User</th>
                      <th className="text-left text-gray-500 px-3 py-3 font-medium">Key</th>
                      <th className="text-right text-gray-500 px-3 py-3 font-medium">Tokens</th>
                      <th className="text-right text-gray-500 px-3 py-3 font-medium">Latency</th>
                      <th className="text-center text-gray-500 px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usageLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/2 transition">
                        <td className="text-gray-400 px-5 py-2.5">
                          {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="text-gray-300 px-3 py-2.5">{log.username || '—'}</td>
                        <td className="px-3 py-2.5">
                          <code className="text-green-400/70 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                            {log.key_prefix || '—'}…
                          </code>
                        </td>
                        <td className="text-gray-300 px-3 py-2.5 text-right">
                          {log.input_tokens + log.output_tokens}
                        </td>
                        <td className="text-gray-400 px-3 py-2.5 text-right">{log.latency_ms}ms</td>
                        <td className="px-5 py-2.5 text-center">
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
        )}

      </div>
    </div>
  )
}
