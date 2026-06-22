import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

/* ── small reusable eye-toggle button ── */
function EyeBtn({ show, toggle }) {
  return (
    <button type="button" onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeWidth="2"
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line stroke="currentColor" strokeLinecap="round" strokeWidth="2" x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
    </button>
  )
}

/* ── decorative left panel ── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col relative flex-1 overflow-hidden">
      {/* Riphah logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
        <div className="flex flex-col items-center opacity-[0.06]">
          {/* Riphah arch SVG */}
          <svg width="340" height="380" viewBox="0 0 340 380" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M170 10 C70 10 10 90 10 190 C10 290 70 360 170 360 C270 360 330 290 330 190 C330 90 270 10 170 10Z"
              stroke="white" strokeWidth="8" fill="none"/>
            <path d="M170 40 C100 40 50 105 50 190 C50 275 100 340 170 340 C240 340 290 275 290 190 C290 105 240 40 170 40Z"
              stroke="white" strokeWidth="5" fill="none"/>
            {/* Riphah calligraphy curves */}
            <path d="M90 120 Q130 80 170 100 Q210 120 250 100" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M80 160 Q120 140 160 155 Q200 170 240 155" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <circle cx="170" cy="70" r="12" fill="white" opacity="0.8"/>
            <circle cx="155" cy="70" r="5" fill="white" opacity="0.6"/>
            <circle cx="185" cy="70" r="5" fill="white" opacity="0.6"/>
          </svg>
          <p className="text-white text-5xl font-black tracking-widest mt-2 uppercase">RIPHAH</p>
          <p className="text-white text-xl tracking-[0.3em] mt-1">INTERNATIONAL</p>
        </div>
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large circle top-left */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border border-white/10"/>
        <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full border border-white/8"/>
        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-purple-400/10 blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-400/10 blur-3xl"/>
        {/* Grid dots */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>

        {/* University silhouette shapes */}
        <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
          {/* Buildings */}
          <rect x="20" y="180" width="60" height="120" rx="4" fill="white" opacity="0.3"/>
          <rect x="30" y="140" width="40" height="40" rx="2" fill="white" opacity="0.2"/>
          {/* Arch/dome */}
          <path d="M160 300 L160 160 Q200 100 240 160 L240 300Z" fill="white" opacity="0.25"/>
          <rect x="170" y="200" width="20" height="30" rx="2" fill="white" opacity="0.5"/>
          {/* Tower */}
          <rect x="300" y="150" width="30" height="150" rx="3" fill="white" opacity="0.2"/>
          <polygon points="315,100 300,150 330,150" fill="white" opacity="0.3"/>
          {/* Trees */}
          <ellipse cx="390" cy="220" rx="30" ry="40" fill="white" opacity="0.15"/>
          <rect x="386" y="250" width="8" height="50" fill="white" opacity="0.2"/>
          <ellipse cx="450" cy="230" rx="25" ry="30" fill="white" opacity="0.12"/>
          <rect x="446" y="252" width="8" height="48" fill="white" opacity="0.2"/>
          {/* Ground */}
          <rect x="0" y="290" width="600" height="10" fill="white" opacity="0.1"/>
        </svg>
      </div>

      {/* Brand text */}
      <div className="relative z-10 flex flex-col justify-end h-full p-12 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">🕯️</div>
          <div>
            <p className="text-white font-bold text-xl leading-tight" style={{ fontFamily: 'serif' }}>راہنما</p>
            <p className="text-white/50 text-xs">Riphah International University</p>
          </div>
        </div>
        <h2 className="text-white text-3xl font-bold leading-tight mb-3">
          Your intelligent<br />university assistant
        </h2>
        <p className="text-white/60 text-sm max-w-xs leading-relaxed">
          Ask anything about admissions, academics, research, or campus life — powered by AI.
        </p>
        <div className="flex gap-3 mt-8">
          {['AI-Powered', 'Secure', 'Always Available'].map(tag => (
            <span key={tag} className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/15">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pendingPrompt = sessionStorage.getItem('pendingPrompt')
  const canSubmit = form.username.trim() && form.password

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      setTimeout(() => navigate('/chat'), 400)
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running.')
      } else {
        const detail = err.response.data?.detail
        setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1e1248]">

      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-8 py-4 bg-[#160d38]/80 backdrop-blur-sm border-b border-white/5 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-base">🕯️</div>
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'serif' }}>راہنما</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <span className="hover:text-white cursor-pointer transition">Home</span>
          <span className="hover:text-white cursor-pointer transition">About</span>
          <span className="hover:text-white cursor-pointer transition">Help</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-sm hidden md:block border border-white/10 rounded-full px-4 py-1.5 font-medium">
            Log In
          </span>
          <Link to="/register"
            className="text-white text-sm font-semibold px-4 py-1.5 rounded-full bg-[#5b2ef9] hover:bg-[#6d3ffb] transition">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ── Main split ── */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />

        {/* ── Right: Login card ── */}
        <div className="flex items-center justify-center w-full lg:w-auto lg:min-w-[460px] xl:min-w-[520px] p-6 lg:p-12 bg-[#1e1248]/50 lg:bg-transparent">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">

            <h2 className="text-gray-900 text-2xl font-bold mb-1">Welcome Back…</h2>
            <p className="text-gray-500 text-sm mb-7">Please enter your username and password</p>

            {pendingPrompt && (
              <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 mb-5">
                <span className="text-violet-500 shrink-0">💬</span>
                <p className="text-violet-700 text-xs leading-relaxed line-clamp-2">
                  You'll send: "<em>{pendingPrompt}</em>"
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-xl mb-5 text-sm">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="relative">
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="Username"
                  required autoFocus
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Password"
                  required
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                />
                <EyeBtn show={showPw} toggle={() => setShowPw(v => !v)} />
              </div>

              <p className="text-[11px] text-gray-400">
                By logging in, you agree to our{' '}
                <span className="text-violet-600 cursor-pointer hover:underline">Terms & Conditions</span>
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#5b2ef9] hover:bg-[#6d3ffb] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition"
                >
                  {loading ? 'Signing in…' : 'login…'}
                  {!loading && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  )}
                </button>
                <Link to="/" className="text-[11px] text-gray-400 hover:text-violet-600 transition whitespace-nowrap">
                  Forgot Password?
                </Link>
              </div>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-semibold text-violet-600 hover:underline">Create Account</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Chat widget bottom-left ── */}
      <div className="fixed bottom-6 left-6 z-30 flex items-end gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center text-xl shrink-0">
          🕯️
        </div>
        <div className="bg-white rounded-2xl rounded-bl-sm shadow-xl px-4 py-2.5 max-w-[220px]">
          <p className="text-[11px] font-semibold text-gray-700 mb-0.5">Rahnuma</p>
          <p className="text-xs text-gray-500">👋 Hey there, How can we help you…?</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-8 py-3 bg-[#160d38]/60 border-t border-white/5 text-[11px] text-white/30 shrink-0">
        <div className="flex gap-4">
          <span className="hover:text-white/60 cursor-pointer transition">Twitter</span>
          <span className="text-white/20">–</span>
          <span className="hover:text-white/60 cursor-pointer transition">LinkedIn</span>
        </div>
        <span>©2025 Rahnuma · Riphah International University</span>
        <div className="flex gap-4">
          <span className="hover:text-white/60 cursor-pointer transition">Privacy</span>
          <span className="text-white/20">:</span>
          <span className="hover:text-white/60 cursor-pointer transition">Terms of Service</span>
        </div>
      </div>
    </div>
  )
}
