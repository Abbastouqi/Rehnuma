import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const TABS = ['Overview', 'Users', 'Chats', 'API Keys', 'Usage Logs', 'Billing']

const PLAN_COLORS = {
  free:       'text-gray-300 border-gray-500/30 bg-gray-500/10',
  pro:        'text-blue-300 border-blue-500/30 bg-blue-500/10',
  enterprise: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
}

function fmtNum(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
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

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-green-500/15 text-green-300',
    pending:   'bg-amber-500/15 text-amber-300',
    failed:    'bg-red-500/15 text-red-300',
    refunded:  'bg-gray-500/15 text-gray-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${map[status] || map.pending}`}>
      {status}
    </span>
  )
}

/* ── Credit Adjust Modal ───────────────────────────────────────────── */
function CreditModal({ targetUser, onClose, onSave }) {
  const [delta, setDelta] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    const n = parseInt(delta, 10)
    if (!n || isNaN(n)) { setError('Enter a non-zero number'); return }
    setLoading(true)
    try {
      const { data } = await api.put(`/admin/users/${targetUser.id}/credits`, { delta: n, notes })
      onSave(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to adjust credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-[#1e1f2e] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-1">Adjust Credits</h3>
        <p className="text-gray-400 text-xs mb-4">
          {targetUser.username} · current balance: <span className="text-white">{fmtNum(targetUser.credits_balance)}</span>
        </p>
        {error && <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl px-4 py-3 mb-4">{error}</div>}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Delta (positive = add, negative = remove)</label>
            <input
              autoFocus
              type="number"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40 transition"
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for adjustment"
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40 transition"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-white/10 text-gray-400 rounded-xl py-2.5 text-sm transition hover:border-white/20">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition">
              {loading ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Package Form Modal ────────────────────────────────────────────── */
function PackageModal({ pkg, onClose, onSave }) {
  const isEdit = !!pkg
  const [form, setForm] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    credits: pkg?.credits || '',
    price_usd: pkg?.price_usd || '',
    is_featured: pkg?.is_featured || false,
    sort_order: pkg?.sort_order || 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/admin/billing/packages/${pkg.id}`, {
          ...form,
          credits: parseInt(form.credits, 10),
          price_usd: parseFloat(form.price_usd),
        })
      } else {
        await api.post('/admin/billing/packages', {
          ...form,
          credits: parseInt(form.credits, 10),
          price_usd: parseFloat(form.price_usd),
        })
      }
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save package')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-[#1e1f2e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-semibold mb-4">{isEdit ? 'Edit' : 'New'} Package</h3>
        {error && <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl px-4 py-3 mb-4">{error}</div>}
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Starter" required
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition"/>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition"/>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Short description"
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Credits</label>
              <input type="number" value={form.credits} onChange={e => setForm(p => ({ ...p, credits: e.target.value }))}
                placeholder="500000" required
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition"/>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Price (USD)</label>
              <input type="number" step="0.01" value={form.price_usd} onChange={e => setForm(p => ({ ...p, price_usd: e.target.value }))}
                placeholder="5.00" required
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/40 transition"/>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))}
              className="rounded"/>
            <span className="text-gray-300 text-sm">Featured (Most Popular)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-white/10 text-gray-400 rounded-xl py-2.5 text-sm transition hover:border-white/20">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition">
              {loading ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function AdminPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { openSidebar } = useOutletContext() || {}
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [chats, setChats] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [usageLogs, setUsageLogs] = useState([])
  const [apiStats, setApiStats] = useState(null)
  const [billingStats, setBillingStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modals
  const [creditModal, setCreditModal] = useState(null) // target user
  const [packageModal, setPackageModal] = useState(false) // true = new, obj = edit
  const [editPkg, setEditPkg] = useState(null)

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

  const loadBilling = useCallback(async () => {
    const [statsRes, txnRes, pkgRes] = await Promise.all([
      api.get('/admin/billing/stats'),
      api.get('/admin/billing/transactions'),
      api.get('/admin/billing/packages'),
    ])
    setBillingStats(statsRes.data)
    setTransactions(txnRes.data)
    setPackages(pkgRes.data)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const loaders = {
      Overview:   loadStats,
      Users:      loadUsers,
      Chats:      loadChats,
      'API Keys': loadApiKeys,
      'Usage Logs': loadUsageLogs,
      Billing:    loadBilling,
    }
    loaders[tab]?.()
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [tab, loadStats, loadUsers, loadChats, loadApiKeys, loadUsageLogs, loadBilling])

  const toggleActive = async (userId, current) => {
    await api.put(`/admin/users/${userId}`, { is_active: !current })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
  }

  const toggleRole = async (userId, current) => {
    const next = current === 'admin' ? 'user' : 'admin'
    await api.put(`/admin/users/${userId}`, { role: next })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: next } : u))
  }

  const changePlan = async (userId, plan) => {
    await api.put(`/admin/users/${userId}/plan`, { plan })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
  }

  const deleteUser = async (userId) => {
    if (!confirm('Delete this user and all their data?')) return
    await api.delete(`/admin/users/${userId}`)
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (stats) setStats({ ...stats, users: stats.users - 1 })
  }

  const toggleApiKey = async (id, current) => {
    await api.put(`/admin/api-keys/${id}`, { is_active: !current })
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: !current } : k))
  }

  const refundTxn = async (id) => {
    if (!confirm('Refund this transaction and deduct credits from user?')) return
    try {
      await api.post(`/admin/billing/transactions/${id}/refund`)
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'refunded' } : t))
    } catch (err) {
      alert(err.response?.data?.detail || 'Refund failed')
    }
  }

  const deletePkg = async (id) => {
    if (!confirm('Delete this package?')) return
    await api.delete(`/admin/billing/packages/${id}`)
    setPackages(prev => prev.filter(p => p.id !== id))
  }

  const togglePkgActive = async (id, current) => {
    await api.put(`/admin/billing/packages/${id}`, { is_active: !current })
    setPackages(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#212121]">
      {creditModal && (
        <CreditModal
          targetUser={creditModal}
          onClose={() => setCreditModal(null)}
          onSave={(data) => {
            setUsers(prev => prev.map(u => u.id === creditModal.id
              ? { ...u, credits_balance: data.new_balance }
              : u))
          }}
        />
      )}
      {(packageModal || editPkg) && (
        <PackageModal
          pkg={editPkg}
          onClose={() => { setPackageModal(false); setEditPkg(null) }}
          onSave={() => loadBilling()}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <button onClick={openSidebar}
              className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
              aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400 text-xs md:text-sm mt-0.5">Rahnuma · Riphah International University</p>
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

        {/* Tabs */}
        <div className="overflow-x-auto mb-6 pb-1 -mx-1 px-1">
          <div className="flex gap-1 bg-[#2f2f2f] p-1 rounded-xl w-fit min-w-full sm:min-w-0">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  tab === t ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
        )}

        {loading && (
          <div className="text-gray-500 text-sm text-center py-16">Loading...</div>
        )}

        {/* ── Overview ── */}
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

        {/* ── Users ── */}
        {!loading && tab === 'Users' && (
          <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Users ({users.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left text-gray-500 px-5 py-3 font-medium">User</th>
                    <th className="text-left text-gray-500 px-3 py-3 font-medium">Plan</th>
                    <th className="text-right text-gray-500 px-3 py-3 font-medium">Credits</th>
                    <th className="text-center text-gray-500 px-3 py-3 font-medium">Status</th>
                    <th className="text-center text-gray-500 px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="text-gray-500 text-sm text-center py-12">No users found</td></tr>
                  )}
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/3 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-700 to-yellow-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {u.username[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium">{u.username}</p>
                            <p className="text-gray-500 text-[10px] truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {u.id !== user.id ? (
                          <select
                            value={u.plan || 'free'}
                            onChange={e => changePlan(u.id, e.target.value)}
                            className="bg-[#1a1b2e] border border-white/10 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="free">free</option>
                            <option value="pro">pro</option>
                            <option value="enterprise">enterprise</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PLAN_COLORS[u.plan] || PLAN_COLORS.free}`}>
                            {u.plan || 'free'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-green-300 font-medium">{fmtNum(u.credits_balance || 0)}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          u.role === 'admin'
                            ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                            : u.is_active
                              ? 'bg-green-500/15 text-green-300 border-green-500/25'
                              : 'bg-red-500/15 text-red-400 border-red-500/25'
                        }`}>
                          {u.role === 'admin' ? 'admin' : u.is_active ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.id !== user.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setCreditModal(u)}
                              title="Adjust credits"
                              className="text-gray-500 hover:text-green-400 p-1.5 rounded-lg hover:bg-white/5 transition text-[10px] whitespace-nowrap"
                            >
                              Credits
                            </button>
                            <button
                              onClick={() => toggleRole(u.id, u.role)}
                              title={u.role === 'admin' ? 'Demote' : 'Promote to admin'}
                              className="text-gray-500 hover:text-yellow-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                            >
                              {u.role === 'admin' ? '↓' : '↑'}
                            </button>
                            <button
                              onClick={() => toggleActive(u.id, u.is_active)}
                              title={u.is_active ? 'Disable' : 'Enable'}
                              className="text-gray-500 hover:text-blue-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                            >
                              {u.is_active ? '⏸' : '▶'}
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              title="Delete user"
                              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                            >
                              🗑
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs italic text-center block">you</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Chats ── */}
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
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{c.title}</p>
                    <p className="text-gray-500 text-xs">by {c.username}</p>
                  </div>
                  <span className="text-gray-600 text-xs shrink-0">{new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── API Keys ── */}
        {!loading && tab === 'API Keys' && (
          <div className="space-y-5">
            {apiStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Keys" value={apiStats.total_keys} icon="🔑" color="border-green-500/25 text-green-300" />
                <StatCard label="Active Keys" value={apiStats.active_keys} icon="✅" color="border-blue-500/25 text-blue-300" />
                <StatCard label="Req / Month" value={fmtNum(apiStats.total_requests_month)} icon="📊" color="border-purple-500/25 text-purple-300" />
                <StatCard label="Tokens / Month" value={fmtNum(apiStats.total_tokens_month)} icon="⚡" color="border-amber-500/25 text-amber-300" />
              </div>
            )}
            <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="text-white font-semibold">All API Keys ({apiKeys.length})</h3>
              </div>
              <div className="divide-y divide-white/5">
                {apiKeys.length === 0 && <p className="text-gray-500 text-sm text-center py-12">No API keys found</p>}
                {apiKeys.map(k => (
                  <div key={k.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white text-sm font-medium">{k.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PLAN_COLORS[k.plan] || PLAN_COLORS.free}`}>{k.plan}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          k.is_active ? 'bg-green-500/15 text-green-300 border-green-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'
                        }`}>{k.is_active ? 'active' : 'revoked'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-green-400/70 text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">{k.key_prefix}…</code>
                        <span className="text-gray-600 text-xs">by {k.username} · {fmtNum(k.requests_month)} req/mo · {fmtNum(k.tokens_month)} tokens</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleApiKey(k.id, k.is_active)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition shrink-0 ${
                        k.is_active ? 'text-red-400 border-red-500/25 hover:bg-red-500/10' : 'text-green-400 border-green-500/25 hover:bg-green-500/10'
                      }`}
                    >
                      {k.is_active ? 'Revoke' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Usage Logs ── */}
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
                          <code className="text-green-400/70 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{log.key_prefix || '—'}…</code>
                        </td>
                        <td className="text-gray-300 px-3 py-2.5 text-right">{log.input_tokens + log.output_tokens}</td>
                        <td className="text-gray-400 px-3 py-2.5 text-right">{log.latency_ms}ms</td>
                        <td className="px-5 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            log.status_code === 200 ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                          }`}>{log.status_code}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Billing ── */}
        {!loading && tab === 'Billing' && (
          <div className="space-y-6">
            {/* Billing stats */}
            {billingStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Revenue" value={`$${Number(billingStats.total_revenue_usd).toFixed(2)}`} icon="💰" color="border-green-500/25 text-green-300" />
                <StatCard label="Credits Sold" value={fmtNum(billingStats.total_credits_sold)} icon="⚡" color="border-blue-500/25 text-blue-300" />
                <StatCard label="Transactions" value={billingStats.total_transactions} icon="📑" color="border-purple-500/25 text-purple-300" />
                <StatCard label="Outstanding" value={fmtNum(billingStats.total_credits_outstanding)} icon="🏦" color="border-amber-500/25 text-amber-300" />
              </div>
            )}

            {/* Packages management */}
            <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-semibold">Credit Packages</h3>
                <button
                  onClick={() => { setEditPkg(null); setPackageModal(true) }}
                  className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  + New Package
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {packages.length === 0 && <p className="text-gray-500 text-sm text-center py-12">No packages yet</p>}
                {packages.map(p => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white text-sm font-medium">{p.name}</p>
                        {p.is_featured && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/25">Featured</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          p.is_active ? 'bg-green-500/15 text-green-300 border-green-500/25' : 'bg-gray-500/15 text-gray-400 border-gray-500/20'
                        }`}>{p.is_active ? 'active' : 'inactive'}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{fmtNum(p.credits)} credits · ${Number(p.price_usd).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setEditPkg(p); setPackageModal(true) }}
                        className="text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20 transition">
                        Edit
                      </button>
                      <button onClick={() => togglePkgActive(p.id, p.is_active)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                          p.is_active ? 'text-amber-400 border-amber-500/25 hover:bg-amber-500/10' : 'text-green-400 border-green-500/25 hover:bg-green-500/10'
                        }`}>
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deletePkg(p.id)}
                        className="text-xs text-red-400 border border-red-500/25 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-[#2f2f2f] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="text-white font-semibold">Transactions ({transactions.length})</h3>
              </div>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-12">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="text-left text-gray-500 px-5 py-3 font-medium">Date</th>
                        <th className="text-left text-gray-500 px-3 py-3 font-medium">User</th>
                        <th className="text-left text-gray-500 px-3 py-3 font-medium">Package</th>
                        <th className="text-right text-gray-500 px-3 py-3 font-medium">Credits</th>
                        <th className="text-right text-gray-500 px-3 py-3 font-medium">Amount</th>
                        <th className="text-center text-gray-500 px-3 py-3 font-medium">Status</th>
                        <th className="text-center text-gray-500 px-5 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-white/2 transition">
                          <td className="text-gray-400 px-5 py-3">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-white font-medium">{t.username}</p>
                            <p className="text-gray-600 text-[10px]">{t.email}</p>
                          </td>
                          <td className="text-gray-300 px-3 py-3">{t.package_name || t.payment_method}</td>
                          <td className="text-green-300 px-3 py-3 text-right font-medium">+{fmtNum(t.credits)}</td>
                          <td className="text-gray-300 px-3 py-3 text-right">
                            {t.amount_usd > 0 ? `$${Number(t.amount_usd).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center"><StatusBadge status={t.status} /></td>
                          <td className="px-5 py-3 text-center">
                            {t.status === 'completed' && t.amount_usd > 0 && (
                              <button
                                onClick={() => refundTxn(t.id)}
                                className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/25 px-2 py-1 rounded-lg hover:bg-red-500/10 transition"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
