export default function TypingIndicator({ icon = '🕯️', label = null }) {
  return (
    <div className="flex items-start gap-4 mb-6 px-4">
      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0 mt-1">
        {icon === '🕯️' ? 'R' : icon}
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        {label && <span className="text-xs text-gray-500">{label}</span>}
        <span className="flex gap-1 items-center h-5">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}
