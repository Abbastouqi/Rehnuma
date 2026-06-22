const BADGES = {
  document: { label: 'Document Chat', icon: '📎', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  bot:      { label: null,            icon: null,  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  general:  { label: 'General',       icon: '💬',  cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
}

export default function WorkflowBadge({ type = 'general', botName = null }) {
  const badge = BADGES[type] || BADGES.general
  const label = type === 'bot' ? `GPT: ${botName}` : badge.label
  const icon = type === 'bot' ? '🤖' : badge.icon

  if (type === 'general') return null

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
