import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

function PasswordCheck({ ok, text }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
        ok ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        {ok ? '✓' : '·'}
      </span>
      <span className={`text-xs transition-colors ${ok ? 'text-green-600' : 'text-gray-400'}`}>{text}</span>
    </div>
  )
}

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {[1, 2].map(n => (
        <div key={n} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
            n < step ? 'bg-green-500 text-white' :
            n === step ? 'bg-[#5b2ef9] text-white' :
            'bg-gray-100 text-gray-400'
          }`}>
            {n < step ? '✓' : n}
          </div>
          {n < 2 && <div className={`w-12 h-0.5 rounded transition-all ${n < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-400">
        {step === 1 ? 'Your details' : 'Create password'}
      </span>
    </div>
  )
}

/* ── decorative left panel (same as Login) ── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col relative flex-1 overflow-hidden">
      {/* Riphah watermark */}
      <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
        <div className="flex flex-col items-center opacity-[0.06]">
          <svg width="340" height="380" viewBox="0 0 340 380" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M170 10 C70 10 10 90 10 190 C10 290 70 360 170 360 C270 360 330 290 330 190 C330 90 270 10 170 10Z"
              stroke="white" strokeWidth="8" fill="none"/>
            <path d="M170 40 C100 40 50 105 50 190 C50 275 100 340 170 340 C240 340 290 275 290 190 C290 105 240 40 170 40Z"
              stroke="white" strokeWidth="5" fill="none"/>
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

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border border-white/10"/>
        <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full border border-white/8"/>
        <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-purple-400/10 blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-400/10 blur-3xl"/>
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots2" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots2)"/>
        </svg>
        <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="180" width="60" height="120" rx="4" fill="white" opacity="0.3"/>
          <rect x="30" y="140" width="40" height="40" rx="2" fill="white" opacity="0.2"/>
          <path d="M160 300 L160 160 Q200 100 240 160 L240 300Z" fill="white" opacity="0.25"/>
          <rect x="170" y="200" width="20" height="30" rx="2" fill="white" opacity="0.5"/>
          <rect x="300" y="150" width="30" height="150" rx="3" fill="white" opacity="0.2"/>
          <polygon points="315,100 300,150 330,150" fill="white" opacity="0.3"/>
          <ellipse cx="390" cy="220" rx="30" ry="40" fill="white" opacity="0.15"/>
          <rect x="386" y="250" width="8" height="50" fill="white" opacity="0.2"/>
          <ellipse cx="450" cy="230" rx="25" ry="30" fill="white" opacity="0.12"/>
          <rect x="446" y="252" width="8" height="48" fill="white" opacity="0.2"/>
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
          Join thousands of<br />students already using AI
        </h2>
        <p className="text-white/60 text-sm max-w-xs leading-relaxed">
          Get instant answers to your academic questions, research help, and campus guidance.
        </p>
        <div className="flex gap-3 mt-8">
          {['Free to use', 'Private & Secure', 'Powered by AI'].map(tag => (
            <span key={tag} className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/15">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pwChecks = {
    length: form.password.length >= 8 && form.password.length <= 120,
    numberOrSymbol: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password),
    match: form.password === form.confirm && form.confirm.length > 0,
  }

  const step1Valid = form.username.trim().length >= 3 && /\S+@\S+\.\S+/.test(form.email)
  const step2Valid = pwChecks.length && pwChecks.numberOrSymbol && pwChecks.match

  const nextStep = () => { setError(''); setStep(2) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!step2Valid) return
    setError('')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      navigate('/login')
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach the server.')
      } else {
        const detail = err.response.data?.detail
        const msg = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail
        setError(msg || `Registration failed (${err.response.status})`)
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
          <Link to="/login"
            className="text-white text-sm font-medium border border-white/10 rounded-full px-4 py-1.5 hover:bg-white/10 transition">
            Log In
          </Link>
          <span className="text-white/50 text-sm hidden md:block border border-white/10 rounded-full px-4 py-1.5 font-semibold bg-[#5b2ef9]/30">
            Sign Up
          </span>
        </div>
      </nav>

      {/* ── Main split ── */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />

        {/* ── Right: Register card ── */}
        <div className="flex items-center justify-center w-full lg:w-auto lg:min-w-[460px] xl:min-w-[520px] p-6 lg:p-12 bg-[#1e1248]/50 lg:bg-transparent">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Back nav inside card */}
            <div className="px-8 pt-6">
              {step === 1 ? (
                <Link to="/login" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  Back to Login
                </Link>
              ) : (
                <button onClick={() => { setStep(1); setError('') }}
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="px-8 pt-4 pb-8">
              {step === 1 ? (
                <>
                  <h2 className="text-gray-900 text-2xl font-bold mb-1">Create Account</h2>
                  <p className="text-gray-500 text-sm mb-6">Join Rahnuma — it's free</p>
                </>
              ) : (
                <>
                  <h2 className="text-gray-900 text-2xl font-bold mb-1">Set Password</h2>
                  <p className="text-gray-500 text-sm mb-6">Choose a strong password to secure your account</p>
                </>
              )}

              <StepDots step={step} />

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-xl mb-5 text-sm">
                  <span className="shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* ── Step 1 ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        placeholder="e.g. john_doe"
                        autoFocus
                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </span>
                    </div>
                    {form.username && form.username.length < 3 && (
                      <p className="text-xs text-red-500 mt-1">At least 3 characters required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    By signing up, you agree to our{' '}
                    <span className="text-violet-600 cursor-pointer hover:underline">Terms & Conditions</span>
                  </p>

                  <button
                    onClick={nextStep}
                    disabled={!step1Valid}
                    className="w-full flex items-center justify-center gap-2 bg-[#5b2ef9] hover:bg-[#6d3ffb] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition mt-2"
                  >
                    Continue
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        autoFocus
                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                        {showPw ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line stroke="currentColor" strokeLinecap="round" strokeWidth="2" x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={e => setForm({ ...form, confirm: e.target.value })}
                        placeholder="••••••••"
                        className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                        {showConfirm ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line stroke="currentColor" strokeLinecap="round" strokeWidth="2" x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Checklist */}
                  {(form.password || form.confirm) && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                      <PasswordCheck ok={pwChecks.length} text="Between 8 and 120 characters" />
                      <PasswordCheck ok={pwChecks.numberOrSymbol} text="Contains a number or symbol" />
                      <PasswordCheck ok={pwChecks.match} text="Passwords match" />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!step2Valid || loading}
                    className="w-full flex items-center justify-center gap-2 bg-[#5b2ef9] hover:bg-[#6d3ffb] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition"
                  >
                    {loading ? 'Creating account…' : 'Create Account'}
                    {!loading && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                </form>
              )}

              <p className="text-center text-gray-500 text-sm mt-6">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-violet-600 hover:underline">Log in</Link>
              </p>
            </div>
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
          <p className="text-xs text-gray-500">Create your account to get started 🎉</p>
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
