import { useNavigate } from 'react-router-dom'

/**
 * Shown when the API returns HTTP 402 (insufficient_credits).
 * Pass `onClose` to dismiss and `onBuyCredits` to navigate to billing.
 */
export default function QuotaExhaustedModal({ onClose, errorDetail }) {
  const navigate = useNavigate()

  const handleBuyCredits = () => {
    if (onClose) onClose()
    navigate('/billing?tab=buy')
  }

  const handleUpgrade = () => {
    if (onClose) onClose()
    navigate('/billing')
  }

  const handleContactAdmin = () => {
    if (onClose) onClose()
    window.location.href = 'mailto:admin@rahnuma.ai'
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1b2e] border border-red-500/25 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + heading */}
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path stroke="#f87171" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
            </svg>
          </div>
          <h3 className="text-white text-xl font-bold mb-2">Credits Exhausted</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            {errorDetail?.message ||
              "You've used all your available API credits. Purchase more credits or upgrade your plan to continue."}
          </p>
        </div>

        {/* Usage indicator */}
        <div className="mx-6 mb-5 bg-red-500/8 border border-red-500/15 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-400">Credits balance</span>
            <span className="text-red-300 font-semibold">0 remaining</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-full rounded-full bg-red-500/60" />
          </div>
          <p className="text-gray-600 text-[10px] mt-2">
            API calls are paused until credits are replenished.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleBuyCredits}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v8M8 12h8"/>
            </svg>
            Buy More Credits
          </button>

          <button
            onClick={handleUpgrade}
            className="w-full bg-white/8 hover:bg-white/12 text-white border border-white/10 font-medium py-3 rounded-xl text-sm transition"
          >
            View Plans & Billing
          </button>

          <button
            onClick={handleContactAdmin}
            className="w-full text-gray-400 hover:text-white text-sm py-2.5 rounded-xl transition hover:bg-white/5"
          >
            Contact Admin
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 p-1.5 rounded-lg hover:bg-white/10 transition"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
