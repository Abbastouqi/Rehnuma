import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOutletContext } from 'react-router-dom'
import api from '../services/api'

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
        active ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}>
      {children}
    </button>
  )
}

function MemoriesTab() {
  const [memories, setMemories] = useState([])
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await api.get('/memories')
    setMemories(data)
  }

  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!newText.trim()) return
    setSaving(true)
    try {
      await api.post('/memories', { content: newText.trim() })
      setNewText('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    await api.delete(`/memories/${id}`)
    setMemories(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-1">Memories</h3>
        <p className="text-gray-500 text-sm">
          Facts Rahnuma remembers about you — injected into every conversation automatically.
        </p>
      </div>

      <form onSubmit={add} className="flex gap-3">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="e.g. I am a computer science student at Riphah"
          className="flex-1 bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/25"
        />
        <button type="submit" disabled={saving || !newText.trim()}
          className="bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-100 transition disabled:opacity-40">
          {saving ? '…' : 'Add'}
        </button>
      </form>

      {memories.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">No memories yet. Add something above!</p>
      ) : (
        <div className="space-y-2">
          {memories.map(m => (
            <div key={m.id} className="flex items-start gap-3 bg-[#2f2f2f] border border-white/8 rounded-xl px-4 py-3">
              <span className="text-purple-400 mt-0.5 shrink-0">🧠</span>
              <p className="text-gray-300 text-sm flex-1 leading-relaxed">{m.content}</p>
              <button onClick={() => remove(m.id)} className="text-gray-600 hover:text-red-400 transition shrink-0 mt-0.5">
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
  )
}

function ProfileTab() {
  const { user } = useAuth()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) { setErr('New passwords do not match'); return }
    if (pw.next.length < 8) { setErr('Password must be at least 8 characters'); return }
    setErr(''); setMsg(''); setSaving(true)
    try {
      await api.put('/auth/password', { current_password: pw.current, new_password: pw.next })
      setMsg('Password updated successfully!')
      setPw({ current: '', next: '', confirm: '' })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-red-700 to-yellow-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-lg">{user?.username}</p>
          <p className="text-gray-500 text-sm">{user?.role === 'admin' ? '⭐ Administrator' : 'Member'}</p>
        </div>
      </div>

      {/* Change password */}
      <div>
        <h3 className="text-white font-semibold mb-4">Change Password</h3>
        {msg && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 mb-4">{msg}</p>}
        {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-4">{err}</p>}
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          {['current', 'next', 'confirm'].map((field, i) => (
            <input
              key={field}
              type="password"
              value={pw[field]}
              onChange={e => setPw({ ...pw, [field]: e.target.value })}
              placeholder={['Current password', 'New password', 'Confirm new password'][i]}
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/25"
            />
          ))}
          <button type="submit" disabled={saving}
            className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition disabled:opacity-40">
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('profile')
  const { openSidebar } = useOutletContext() || {}

  return (
    <div className="flex flex-col h-full bg-[#212121] overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center gap-3 mb-6">
          {/* Mobile hamburger */}
          <button onClick={openSidebar}
            className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
            aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <h1 className="text-white text-xl md:text-2xl font-bold">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-white/8 pb-2">
          <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')}>Profile</TabBtn>
          <TabBtn active={tab === 'memories'} onClick={() => setTab('memories')}>🧠 Memories</TabBtn>
        </div>

        {tab === 'profile' && <ProfileTab />}
        {tab === 'memories' && <MemoriesTab />}
      </div>
    </div>
  )
}
