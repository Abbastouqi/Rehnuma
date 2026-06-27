import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const SUGGESTIONS = [
  'What is machine learning?',
  'Write a Python function to sort a list',
  'Explain the theory of relativity',
  'How do I improve my study habits?',
]

export default function PublicLanding() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const handleSend = () => {
    if (!text.trim()) return
    // Store the pending prompt so login can redirect back
    sessionStorage.setItem('pendingPrompt', text.trim())
    navigate('/login')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (s) => {
    sessionStorage.setItem('pendingPrompt', s)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0d0e1a] flex flex-col">

      {/* Top nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
            <img src="/riphah_logo.png" alt="Riphah" className="w-full h-full object-cover" />
          </div>
          <div>
            <span
              className="text-white font-bold text-base leading-tight block"
              style={{ fontFamily: 'serif' }}
            >
              راہنما
            </span>
            <span className="text-gray-600 text-[10px] leading-tight block">
              Riphah International
            </span>
          </div>
        </div>

        {/* Nav right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              sessionStorage.setItem('redirectAfterLogin', '/api-platform')
              navigate('/login')
            }}
            className="hidden sm:flex text-gray-300 text-sm font-medium px-4 py-2 rounded-full hover:bg-white/8 transition items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z"/>
            </svg>
            API Platform
          </button>
          <Link
            to="/login"
            className="text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="text-black text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-full bg-white hover:bg-gray-100 transition"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Main centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16 sm:pb-20">
        <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-semibold mb-6 sm:mb-8 text-center tracking-tight">
          What's on your mind today?
        </h1>

        {/* Input bar */}
        <div className="w-full max-w-2xl">
          <div className="relative bg-[#1a1c2e] rounded-2xl border border-white/[0.08] hover:border-white/15 focus-within:border-green-500/40 focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.08)] transition-all duration-200 shadow-xl">

            {/* Attach / plus button */}
            <button
              onClick={() => navigate('/login')}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/10 transition"
              title="Log in to attach files"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14"/>
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything"
              rows={1}
              className="w-full bg-transparent text-white text-sm px-12 py-4 pr-28 focus:outline-none resize-none placeholder-gray-500 leading-relaxed"
              style={{ minHeight: '56px', maxHeight: '200px' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
            />

            {/* Right side buttons */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {/* Mic icon */}
              <button
                onClick={() => navigate('/login')}
                title="Log in to use voice"
                className="text-gray-500 hover:text-gray-300 transition p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
                  <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2"/>
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"/>
                </svg>
              </button>

              {/* Send button */}
              <button
                onClick={handleSend}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition font-medium
                  ${text.trim() ? 'bg-white text-black hover:bg-gray-100' : 'bg-white/10 text-gray-600 cursor-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-gray-400 text-xs border border-white/10 rounded-full px-4 py-1.5 hover:bg-white/5 hover:text-gray-200 hover:border-white/20 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-700 text-xs pb-5 px-4">
        Rahnuma is AI. Responses may be inaccurate.{' '}
        <Link to="/login" className="underline hover:text-gray-500 transition">Log in</Link>
        {' '}to save your conversations.
      </footer>
    </div>
  )
}
