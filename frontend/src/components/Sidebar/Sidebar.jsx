import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { useBot } from '../../context/BotContext'

/* ── tiny icon helpers ── */
const Icon = ({ d, size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d}/>
  </svg>
)

/* ── chat context menu ── */
function ChatMenu({ chat, onClose, onRename, onPin, onArchive, onExport, onDelete, onFolder }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items = [
    { label: 'Rename', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', action: onRename },
    { label: chat.is_pinned ? 'Unpin' : 'Pin to top', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z', action: onPin },
    { label: 'Move to folder…', icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', action: onFolder },
    { label: 'Export as Markdown', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', action: onExport },
    { label: chat.is_archived ? 'Unarchive' : 'Archive', icon: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4', action: onArchive },
    { label: 'Delete', icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', action: onDelete, danger: true },
  ]

  return (
    <div ref={ref}
      className="absolute right-0 top-6 z-50 bg-[#1a1b2e] border border-white/10 rounded-xl shadow-2xl py-1 w-44 text-xs">
      {items.map(({ label, icon, action, danger }) => (
        <button key={label} onClick={(e) => { e.stopPropagation(); action(); onClose() }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 transition ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-white/8'}`}>
          <Icon d={icon} size={12}/>
          {label}
        </button>
      ))}
    </div>
  )
}

/* ── folder input dialog ── */
function FolderDialog({ current, onConfirm, onClose }) {
  const [val, setVal] = useState(current || '')
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-white font-semibold mb-3 text-sm">Move to folder</p>
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          placeholder="Folder name (empty to remove)"
          className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/25 mb-3"/>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-gray-400 border border-white/10 rounded-xl py-2 text-xs hover:border-white/20 transition">Cancel</button>
          <button onClick={() => onConfirm(val)} className="flex-1 bg-white text-black rounded-xl py-2 text-xs font-semibold hover:bg-gray-100 transition">Move</button>
        </div>
      </div>
    </div>
  )
}

/* ── single chat row ── */
function ChatRow({ chat, isActive, onClick, onRename, onPin, onArchive, onExport, onDelete, onFolder }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={`group relative rounded-lg px-3 py-2 cursor-pointer flex items-center gap-2 transition mb-0.5 ${
        isActive ? 'bg-green-500/15 border border-green-500/20' : 'hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      {chat.is_pinned && <span className="text-yellow-500 text-[10px] shrink-0">📌</span>}
      <span className="flex-1 text-sm text-gray-300 truncate">{chat.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
        className="hidden group-hover:flex text-gray-500 hover:text-gray-300 p-1 rounded transition"
        title="Options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {menuOpen && (
        <ChatMenu
          chat={chat}
          onClose={() => setMenuOpen(false)}
          onRename={onRename}
          onPin={onPin}
          onArchive={onArchive}
          onExport={onExport}
          onDelete={onDelete}
          onFolder={onFolder}
        />
      )}
    </div>
  )
}

export default function Sidebar({ onClose = () => {} }) {
  const {
    chats, activeChat, loadChats, selectChat, newChat,
    deleteChat, renameChat, updateChat, exportChat,
    activeDoc, clearDocument
  } = useChat()
  const { user, logout } = useAuth()
  const { activeBot, clearBot } = useBot()
  const navigate = useNavigate()
  const location = useLocation()

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [folderDialog, setFolderDialog] = useState(null) // { chatId, current }
  const [collapsed, setCollapsed] = useState({}) // { folderName: bool }
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { loadChats(showArchived) }, [loadChats, showArchived])

  const handleRename = async (chatId) => {
    if (editTitle.trim()) await renameChat(chatId, editTitle.trim())
    setEditingId(null)
  }

  const handleNewChat = () => { clearBot(); newChat(); navigate('/chat'); onClose() }
  const handleSelect = (chat) => { selectChat(chat.id); navigate(`/chat/${chat.id}`); onClose() }

  const handlePin = (chat) => updateChat(chat.id, { is_pinned: !chat.is_pinned })
  const handleArchive = async (chat) => {
    await updateChat(chat.id, { is_archived: !chat.is_archived })
    loadChats(showArchived)
  }
  const handleExport = (chat) => exportChat(chat.id, chat.title)
  const handleFolder = (chatId, current) => setFolderDialog({ chatId, current })
  const confirmFolder = async (name) => {
    await updateChat(folderDialog.chatId, { folder: name.trim() })
    setFolderDialog(null)
  }

  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  // Group chats: pinned, then by folder, then no-folder
  const pinned = filtered.filter(c => c.is_pinned && !c.folder)
  const foldered = {}
  filtered.filter(c => !c.is_pinned && c.folder).forEach(c => {
    if (!foldered[c.folder]) foldered[c.folder] = []
    foldered[c.folder].push(c)
  })
  const recent = filtered.filter(c => !c.is_pinned && !c.folder)

  const toggleFolder = (name) => setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))

  const chatRowProps = (chat) => ({
    key: chat.id,
    chat,
    isActive: activeChat?.id === chat.id,
    onClick: () => {
      if (editingId === chat.id) return
      handleSelect(chat)
    },
    onRename: () => { setEditingId(chat.id); setEditTitle(chat.title) },
    onPin: () => handlePin(chat),
    onArchive: () => handleArchive(chat),
    onExport: () => handleExport(chat),
    onDelete: () => deleteChat(chat.id),
    onFolder: () => handleFolder(chat.id, chat.folder),
  })

  const isPage = (p) => location.pathname === p

  return (
    <div className="w-64 bg-[#0d0e1a] flex flex-col h-full shrink-0 border-r border-white/5">

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button onClick={handleNewChat}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20">
            <img src="/riphah_logo.png" alt="Riphah" className="w-full h-full object-cover" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'serif' }}>راہنما</p>
            <p className="text-gray-500 text-[10px] leading-tight truncate">Riphah International</p>
          </div>
        </button>
        {/* Mobile close button */}
        <button onClick={onClose} title="Close menu"
          className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <button onClick={handleNewChat} title="New chat"
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition shrink-0">
          <Icon d="M12 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={17}/>
        </button>
      </div>

      {/* Active doc / bot indicators */}
      {activeDoc && (
        <div className="mx-3 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
          <span className="text-amber-400 text-sm">📎</span>
          <p className="text-amber-300 text-xs flex-1 truncate">{activeDoc.filename}</p>
          <button onClick={clearDocument} className="text-amber-500/50 hover:text-amber-300 text-xs">✕</button>
        </div>
      )}
      {activeBot && (
        <div className="mx-3 mb-2 px-3 py-2 bg-blue-600/15 border border-blue-500/25 rounded-xl flex items-center gap-2">
          <span className="text-base">{activeBot.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-blue-300 text-xs font-medium truncate">{activeBot.name}</p>
            <p className="text-blue-400/60 text-[10px]">Active assistant</p>
          </div>
          <button onClick={clearBot} className="text-blue-400/50 hover:text-blue-300 text-xs">✕</button>
        </div>
      )}

      {/* Nav links */}
      <div className="px-2 mb-1 space-y-0.5">
        {[
          { path: '/explore', label: 'Explore GPTs', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v20M2 12h20' },
          { path: '/prompts', label: 'Prompts', icon: 'M4 6h16M4 10h16M4 14h10' },
          { path: '/api-platform', label: 'API Platform', icon: 'M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z' },
          { path: '/billing', label: 'Billing', icon: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22' },
        ].map(({ path, label, icon }) => (
          <button key={path} onClick={() => { navigate(path); onClose() }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
              isPage(path) ? 'bg-green-500/15 text-green-300 border border-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Icon d={icon} size={15}/>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.5"/>
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-white/5 text-gray-300 placeholder-gray-600 text-xs rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:bg-white/8 transition"/>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">

        {/* Pinned */}
        {pinned.length > 0 && (
          <>
            <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider px-3 mb-1 mt-1">Pinned</p>
            {pinned.map(chat => (
              editingId === chat.id ? (
                <div key={chat.id} className="px-3 py-2 mb-0.5">
                  <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id)} onKeyDown={e => e.key === 'Enter' && handleRename(chat.id)}
                    className="w-full bg-white/10 text-white text-sm px-2 py-0.5 rounded outline-none"/>
                </div>
              ) : <ChatRow {...chatRowProps(chat)} />
            ))}
          </>
        )}

        {/* Folders */}
        {Object.entries(foldered).map(([folder, folderChats]) => (
          <div key={folder}>
            <button onClick={() => toggleFolder(folder)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition">
              <span>{collapsed[folder] ? '▶' : '▼'}</span>
              <span>📁</span>
              <span className="flex-1 text-left font-medium truncate">{folder}</span>
              <span className="text-gray-700">{folderChats.length}</span>
            </button>
            {!collapsed[folder] && folderChats.map(chat => (
              editingId === chat.id ? (
                <div key={chat.id} className="px-3 py-2 mb-0.5 ml-2">
                  <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id)} onKeyDown={e => e.key === 'Enter' && handleRename(chat.id)}
                    className="w-full bg-white/10 text-white text-sm px-2 py-0.5 rounded outline-none"/>
                </div>
              ) : (
                <div key={chat.id} className="ml-3">
                  <ChatRow {...chatRowProps(chat)} />
                </div>
              )
            ))}
          </div>
        ))}

        {/* Recent */}
        {recent.length > 0 && (
          <>
            {(pinned.length > 0 || Object.keys(foldered).length > 0) && (
              <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider px-3 mb-1 mt-2">Recent</p>
            )}
            {recent.map(chat => (
              editingId === chat.id ? (
                <div key={chat.id} className="px-3 py-2 mb-0.5">
                  <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id)} onKeyDown={e => e.key === 'Enter' && handleRename(chat.id)}
                    className="w-full bg-white/10 text-white text-sm px-2 py-0.5 rounded outline-none"/>
                </div>
              ) : <ChatRow {...chatRowProps(chat)} />
            ))}
          </>
        )}

        {filtered.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-10 px-4">
            {search ? 'No matching chats' : showArchived ? 'No archived chats' : 'No conversations yet'}
          </p>
        )}

        {/* Archive toggle */}
        <button onClick={() => setShowArchived(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-[11px] text-gray-600 hover:text-gray-400 transition">
          <Icon d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" size={12}/>
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>

      {/* Footer — user menu */}
      <div className="p-3 border-t border-white/10 relative" ref={userMenuRef}>

        {/* Dropdown — opens upward */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-[#1a1b2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {/* Profile header */}
            <div className="px-3 py-3 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover"/>
                ) : (
                  <div className="w-9 h-9 bg-gradient-to-br from-green-700 to-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-gray-500 text-[11px] truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            {/* Menu items */}
            <div className="py-1">
              <button onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition">
                <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" size={14}/>
                Settings
              </button>
              <button onClick={() => { navigate('/billing'); setUserMenuOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition">
                <Icon d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22" size={14}/>
                Billing
              </button>
              {user?.role === 'admin' && (
                <button onClick={() => { navigate('/admin'); setUserMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/8 transition">
                  <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" size={14}/>
                  Admin Panel
                </button>
              )}
              <div className="border-t border-white/8 mt-1 pt-1">
                <button onClick={() => { logout(); setUserMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
                  <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={14}/>
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User row — click to open/close dropdown */}
        <div
          onClick={() => setUserMenuOpen(v => !v)}
          className={`flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition select-none ${
            userMenuOpen ? 'bg-white/8' : 'hover:bg-white/5'
          }`}
        >
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover"/>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-green-700 to-green-500 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="block text-sm text-gray-300 truncate">{user?.username}</span>
            {user?.role === 'admin' && <span className="text-[10px] text-yellow-500">admin</span>}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"
            className={`text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m18 15-6-6-6 6"/>
          </svg>
        </div>
      </div>

      {/* Folder dialog */}
      {folderDialog && (
        <FolderDialog
          current={folderDialog.current}
          onConfirm={confirmFolder}
          onClose={() => setFolderDialog(null)}
        />
      )}
    </div>
  )
}
