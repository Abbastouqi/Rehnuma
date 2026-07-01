import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const PLAN_COLORS = {
  free: 'text-gray-300 border-gray-500/30 bg-gray-500/10',
  pro: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
  enterprise: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
}

const PLAN_PERKS = {
  free: ['100 req/day', '1,000 req/month', '100K tokens/month', '100K starter credits'],
  pro: ['1,000 req/day', '30K req/month', '5M tokens/month', 'Priority support'],
  enterprise: ['10K req/day', '300K req/month', '50M tokens/month', 'Dedicated support'],
}

function fmtNum(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function fmtMoney(n) {
  return `$${Number(n).toFixed(2)}`
}

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-green-500/15 text-green-300',
    pending:   'bg-amber-500/15 text-amber-300',
    failed:    'bg-red-500/15 text-red-300',
    refunded:  'bg-gray-500/15 text-gray-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[status] || map.pending}`}>
      {status}
    </span>
  )
}

/* ── Purchase Modal ─────────────────────────────────────────────────── */
function PurchaseModal({ pkg, onClose, onSuccess }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!card.name.trim()) { setError('Name on card is required'); return }
    setLoading(true)
    setError('')
    try {
      const last4 = card.number.replace(/\s/g, '').slice(-4) || '4242'
      const brand = card.number.startsWith('4') ? 'Visa' : card.number.startsWith('5') ? 'Mastercard' : 'Card'
      const { data } = await api.post('/billing/purchase', {
        package_id: pkg.id,
        card_last4: last4,
        card_brand: brand,
      })
      onSuccess(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fmtCardNum = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const fmtExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1b2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Purchase Credits</h3>
              <p className="text-gray-400 text-xs mt-0.5">{pkg.name} — {fmtNum(pkg.credits)} credits</p>
            </div>
            <div className="text-right">
              <p className="text-white text-2xl font-bold">{fmtMoney(pkg.price_usd)}</p>
              <p className="text-gray-500 text-[10px]">{fmtMoney((pkg.price_usd / pkg.credits) * 1_000_000)}/1M tokens</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handlePay} className="px-6 py-5 space-y-4">
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-xs">
            This is a simulated payment environment. No real charges are made.
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Name on card</label>
            <input
              value={card.name}
              onChange={e => setCard(p => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith"
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40 transition placeholder-gray-600"
              required
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Card number</label>
            <input
              value={card.number}
              onChange={e => setCard(p => ({ ...p, number: fmtCardNum(e.target.value) }))}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-green-500/40 transition placeholder-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Expiry</label>
              <input
                value={card.expiry}
                onChange={e => setCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                placeholder="MM / YY"
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40 transition placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">CVC</label>
              <input
                value={card.cvc}
                onChange={e => setCard(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="123"
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/40 transition placeholder-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl py-3 text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Processing…
                </>
              ) : (
                `Pay ${fmtMoney(pkg.price_usd)}`
              )}
            </button>
          </div>
        </form>

        {/* Secure badge */}
        <div className="px-6 pb-4 flex items-center gap-1.5 text-gray-600 text-[10px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Payments are processed securely. Your card data is never stored.
        </div>
      </div>
    </div>
  )
}

/* ── Invoice Modal ──────────────────────────────────────────────────── */
function InvoiceModal({ invoice, onClose }) {
  if (!invoice) return null
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1b2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Invoice</h3>
            <p className="text-gray-500 text-xs mt-0.5">{invoice.invoice_number}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Billed to</p>
              <p className="text-white font-medium">{invoice.customer?.username}</p>
              <p className="text-gray-400 text-xs">{invoice.customer?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs mb-1">Date</p>
              <p className="text-white text-xs">{new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="bg-[#0d0e1a] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{invoice.item?.description}</p>
                <p className="text-gray-500 text-xs mt-0.5">{fmtNum(invoice.item?.credits)} credits</p>
              </div>
              <p className="text-white font-semibold">{fmtMoney(invoice.item?.amount_usd)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/8">
            <div>
              <p className="text-gray-500 text-xs">Payment method</p>
              <p className="text-gray-300 text-sm">{invoice.payment_method}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Total</p>
              <p className="text-white text-lg font-bold">{fmtMoney(invoice.total_usd)}</p>
            </div>
          </div>

          {invoice.reference && (
            <p className="text-gray-600 text-[10px] font-mono">Ref: {invoice.reference}</p>
          )}
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl py-2.5 text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function Billing() {
  const navigate = useNavigate()
  const { openSidebar } = useOutletContext() || {}
  const { user } = useAuth()

  const [tab, setTab] = useState('overview')
  const [balance, setBalance] = useState(null)
  const [packages, setPackages] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchasePkg, setPurchasePkg] = useState(null) // open purchase modal
  const [successBanner, setSuccessBanner] = useState(null) // { credits, new_balance }
  const [invoice, setInvoice] = useState(null) // open invoice modal

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [balRes, pkgRes, histRes] = await Promise.all([
        api.get('/billing/balance'),
        api.get('/billing/packages'),
        api.get('/billing/history'),
      ])
      setBalance(balRes.data)
      setPackages(pkgRes.data)
      setHistory(histRes.data)
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handlePurchaseSuccess = async (result) => {
    setPurchasePkg(null)
    setSuccessBanner({ credits: result.credits_added, new_balance: result.new_balance })
    await load()
    setTimeout(() => setSuccessBanner(null), 8000)
  }

  const loadInvoice = async (txnId) => {
    try {
      const { data } = await api.get(`/billing/invoice/${txnId}`)
      setInvoice(data)
    } catch {
      /* ignore */
    }
  }

  const plan = balance?.plan || user?.plan || 'free'
  const credits = balance?.credits_balance ?? 0
  const totalPurchased = balance?.total_credits_purchased ?? 0
  const creditsUsed = totalPurchased > 0 ? Math.max(0, totalPurchased - credits + 100_000) : Math.max(0, 100_000 - credits)
  const creditsPct = Math.min(100, credits > 0 ? (credits / Math.max(credits + creditsUsed, 1)) * 100 : 0)

  return (
    <div className="flex-1 overflow-y-auto bg-[#131420]">
      {purchasePkg && (
        <PurchaseModal
          pkg={purchasePkg}
          onClose={() => setPurchasePkg(null)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

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
              <h1 className="text-xl md:text-2xl font-bold text-white">Billing</h1>
              <p className="text-gray-400 text-xs md:text-sm mt-0.5">Manage your credits, plan, and payment history</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/api-platform')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            <span className="hidden sm:inline">API Platform</span>
          </button>
        </div>

        {/* Success banner */}
        {successBanner && (
          <div className="bg-green-500/10 border border-green-500/25 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-green-300 font-medium text-sm">Payment successful!</p>
              <p className="text-green-400/70 text-xs">
                {fmtNum(successBanner.credits)} credits added · New balance: {fmtNum(successBanner.new_balance)} credits
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1a1b2e] p-1 rounded-xl mb-6 w-fit border border-white/8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'buy', label: 'Buy Credits' },
            { id: 'history', label: 'History' },
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

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Plan card */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full border uppercase tracking-wide ${PLAN_COLORS[plan]}`}>
                      {plan}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {(PLAN_PERKS[plan] || PLAN_PERKS.free).map(p => (
                  <div key={p} className="flex items-center gap-2 text-xs text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24">
                      <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
                    </svg>
                    {p}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTab('buy')}
                className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition shrink-0"
              >
                Buy Credits
              </button>
            </div>

            {/* Credits overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#1a1b2e] border border-green-500/20 rounded-2xl p-5">
                <p className="text-gray-400 text-xs mb-1">Credits Balance</p>
                <p className="text-white text-3xl font-bold tracking-tight">{fmtNum(credits)}</p>
                <p className="text-gray-600 text-xs mt-1">≈ {fmtNum(credits)} tokens remaining</p>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all ${creditsPct < 20 ? 'bg-red-400' : creditsPct < 50 ? 'bg-amber-400' : 'bg-green-500'}`}
                    style={{ width: `${creditsPct}%` }}
                  />
                </div>
              </div>
              <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
                <p className="text-gray-400 text-xs mb-1">Total Purchased</p>
                <p className="text-white text-3xl font-bold tracking-tight">{fmtNum(totalPurchased)}</p>
                <p className="text-gray-600 text-xs mt-1">Lifetime credits purchased</p>
              </div>
              <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5">
                <p className="text-gray-400 text-xs mb-1">Credits Used</p>
                <p className="text-white text-3xl font-bold tracking-tight">{fmtNum(creditsUsed)}</p>
                <p className="text-gray-600 text-xs mt-1">Tokens consumed total</p>
              </div>
            </div>

            {/* Recent transactions */}
            {history.length > 0 && (
              <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">Recent Transactions</h3>
                  <button onClick={() => setTab('history')} className="text-gray-500 hover:text-green-400 text-xs transition">
                    View all →
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {history.slice(0, 5).map(txn => (
                    <div key={txn.id} className="px-5 py-3.5 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        txn.status === 'completed' ? 'bg-green-500/10' : txn.status === 'refunded' ? 'bg-gray-500/10' : 'bg-amber-500/10'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24">
                          <path stroke={txn.status === 'completed' ? '#4ade80' : txn.status === 'refunded' ? '#9ca3af' : '#fbbf24'}
                            strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4l3 3"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{txn.package_name || 'Admin Grant'}</p>
                        <p className="text-gray-500 text-xs">{new Date(txn.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-green-300 text-sm font-medium">+{fmtNum(txn.credits)}</p>
                        {txn.amount_usd > 0 && <p className="text-gray-500 text-xs">{fmtMoney(txn.amount_usd)}</p>}
                      </div>
                      <StatusBadge status={txn.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {credits <= 10_000 && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="#f87171" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-red-300 font-semibold text-sm">Credits Running Low</p>
                  <p className="text-red-400/70 text-xs mt-0.5">
                    You have {fmtNum(credits)} credits remaining. Purchase more to avoid API interruptions.
                  </p>
                </div>
                <button
                  onClick={() => setTab('buy')}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium px-4 py-2 rounded-xl transition shrink-0"
                >
                  Buy Credits
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Buy Credits Tab ── */}
        {tab === 'buy' && (
          <div className="space-y-5">
            <p className="text-gray-400 text-sm">
              1 credit = 1 token. Credits never expire. Purchase more at any time.
            </p>

            {loading ? (
              <div className="text-gray-600 text-sm text-center py-20">Loading packages…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    className={`relative bg-[#1a1b2e] border rounded-2xl p-6 flex flex-col gap-4 transition hover:border-green-500/30 ${
                      pkg.is_featured
                        ? 'border-green-500/30 shadow-[0_0_0_1px_rgba(74,222,128,0.1)]'
                        : 'border-white/8'
                    }`}
                  >
                    {pkg.is_featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                      <p className="text-gray-400 text-xs mt-1">{pkg.description}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-white text-3xl font-bold">{fmtMoney(pkg.price_usd)}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {fmtNum(pkg.credits)} credits · {fmtMoney(pkg.price_per_1m)}/1M tokens
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24">
                          <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
                        </svg>
                        {fmtNum(pkg.credits)} API tokens
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24">
                          <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
                        </svg>
                        Never expires
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24">
                          <path stroke="#4ade80" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
                        </svg>
                        Instant delivery
                      </div>
                    </div>

                    <button
                      onClick={() => setPurchasePkg(pkg)}
                      className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                        pkg.is_featured
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                      }`}
                    >
                      Purchase
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Contact admin */}
            <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-white font-semibold text-sm">Need a custom plan?</h3>
                <p className="text-gray-400 text-xs mt-0.5">Contact the admin for enterprise pricing, custom quotas, or special arrangements.</p>
              </div>
              <a
                href="mailto:admin@rahnuma.ai"
                className="flex items-center gap-2 border border-white/15 text-gray-300 hover:text-white hover:border-white/30 text-sm px-5 py-2.5 rounded-xl transition shrink-0"
              >
                Contact Admin
              </a>
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl text-center py-16 text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" className="mx-auto mb-3 opacity-30">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                </svg>
                <p className="text-sm">No transactions yet</p>
                <p className="text-xs mt-1">Your payment history will appear here</p>
              </div>
            ) : (
              <div className="bg-[#1a1b2e] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8">
                  <h3 className="text-white font-semibold text-sm">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-gray-500 px-5 py-3 font-medium">Date</th>
                        <th className="text-left text-gray-500 px-3 py-3 font-medium">Description</th>
                        <th className="text-right text-gray-500 px-3 py-3 font-medium">Credits</th>
                        <th className="text-right text-gray-500 px-3 py-3 font-medium">Amount</th>
                        <th className="text-center text-gray-500 px-3 py-3 font-medium">Status</th>
                        <th className="text-center text-gray-500 px-5 py-3 font-medium">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {history.map(txn => (
                        <tr key={txn.id} className="hover:bg-white/2 transition">
                          <td className="text-gray-400 px-5 py-3.5">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3.5">
                            <p className="text-white font-medium">{txn.package_name || 'Credits'}</p>
                            <p className="text-gray-600 text-[10px]">{txn.payment_method}</p>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <span className="text-green-300 font-medium">+{fmtNum(txn.credits)}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right text-gray-300">
                            {txn.amount_usd > 0 ? fmtMoney(txn.amount_usd) : '—'}
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <StatusBadge status={txn.status} />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {txn.amount_usd > 0 && (
                              <button
                                onClick={() => loadInvoice(txn.id)}
                                className="text-gray-500 hover:text-green-400 transition"
                                title="View invoice"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
