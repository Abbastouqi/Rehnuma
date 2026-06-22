import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBot } from '../context/BotContext'

const CATEGORIES = ['All', 'Programming', 'Writing', 'Productivity', 'Research & Analysis', 'Education', 'Lifestyle', 'General']

const CATEGORY_COLORS = {
  Programming: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Writing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Productivity: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Research & Analysis': 'bg-green-500/20 text-green-300 border-green-500/30',
  Education: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Lifestyle: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  General: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

export default function Explore() {
  const { bots, loadBots, selectBot } = useBot()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBots().finally(() => setLoading(false))
  }, [loadBots])

  const filtered = bots.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || b.category === category
    return matchSearch && matchCat
  })

  const handleOpen = (bot) => {
    selectBot(bot)
    navigate('/chat')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#212121] min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Explore GPTs</h1>
            <p className="text-gray-400 text-sm mt-1">Discover and use custom AI assistants built for specific tasks</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14"/>
            </svg>
            Create
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search GPTs..."
            className="w-full bg-[#2f2f2f] text-white border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-white/25 transition"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                category === c
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-white/15 hover:border-white/30 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-20">No GPTs found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(bot => (
              <button
                key={bot.id}
                onClick={() => handleOpen(bot)}
                className="text-left bg-[#2f2f2f] hover:bg-[#383838] border border-white/8 rounded-2xl p-5 transition group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-2xl shrink-0 border border-white/10">
                    {bot.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate group-hover:text-blue-300 transition">
                      {bot.name}
                    </h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      By {bot.author_name || 'Gemma Chat'}
                    </p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-snug line-clamp-2 mb-3">
                  {bot.description}
                </p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[bot.category] || CATEGORY_COLORS.General}`}>
                  {bot.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
