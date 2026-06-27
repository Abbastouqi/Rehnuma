import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import WorkflowBadge from '../WorkflowBadge'
import { useChat } from '../../context/ChatContext'

/* ── recursive React node → plain text (for copy + TTS) ── */
function nodeToText(node) {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join('')
  if (node?.props?.children) return nodeToText(node.props.children)
  return ''
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'code block. ')
    .replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/_(.+?)_/gs, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

/* ── copy button ── */
function CopyButton({ text, label = 'Copy code' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }
  return (
    <button onClick={copy}
      className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition font-sans ${
        copied ? 'text-green-400 bg-green-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}>
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path stroke="currentColor" strokeWidth="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

/* ── read aloud ── */
function ReadAloudButton({ text }) {
  const [speaking, setSpeaking] = useState(false)
  const speak = () => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(stripMarkdown(text))
    utt.rate = 1
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
    setSpeaking(true)
  }
  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(false) }
  return (
    <button onClick={speaking ? stop : speak} title={speaking ? 'Stop' : 'Read aloud'}
      className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition ${
        speaking ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
      }`}>
      {speaking ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
          Stop
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M11 5 6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          Read aloud
        </>
      )}
    </button>
  )
}

/*
 * normalizeMarkdown: light safety-net for the cases where the model emits
 * a code fence or heading on the same line as the preceding sentence with
 * no blank line, which CommonMark requires before some block elements.
 * (The main newline-preservation fix is JSON-encoding SSE tokens in the backend.)
 */
function normalizeMarkdown(text) {
  if (!text) return ''
  return text
    // Blank line before opening code fence when immediately after text
    .replace(/([^\n`])\n(```)/g, '$1\n\n$2')
    // Blank line after closing code fence when text follows immediately
    .replace(/(```)\n([^\n`\s])/g, '$1\n\n$2')
    // Collapse excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
}

/* ── code block rendered via hljs directly ── */
function CodeBlock({ lang, rawCode }) {
  let highlighted = ''
  try {
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(rawCode, { language: lang }).value
    } else {
      highlighted = hljs.highlightAuto(rawCode).value
    }
  } catch {
    highlighted = rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg text-[13px]">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10">
        <span className="text-[11px] text-gray-400 font-mono font-medium tracking-wide">
          {lang || 'plaintext'}
        </span>
        <CopyButton text={rawCode} />
      </div>
      {/* code */}
      <div className="overflow-x-auto bg-[#0d1117]">
        <pre className="px-5 py-4 m-0 bg-transparent leading-relaxed">
          <code
            className={lang ? `language-${lang} hljs` : 'hljs'}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  )
}

/* ── react-markdown component map ── */
const mdComponents = {
  /*
   * pre: neutralise the outer <pre> wrapper react-markdown emits.
   * Our custom code() component renders its own complete block wrapper
   * so we just pass children through.
   */
  pre: ({ children }) => <>{children}</>,

  /*
   * code: handles BOTH inline and fenced block code.
   *
   * In react-markdown v10 the `inline` prop was removed.
   * Detection strategy:
   *   - className present  →  block (react-markdown sets language-xxx)
   *   - content has \n    →  block (multi-line literal)
   *   - otherwise          →  inline
   */
  code({ className, children }) {
    const raw = String(children || '').replace(/\n$/, '')
    const lang = /language-(\w+)/.exec(className || '')?.[1] || ''
    const isBlock = !!className || raw.includes('\n')

    if (!isBlock) {
      return (
        <code className="bg-[#1e2432] text-[#e06c75] px-1.5 py-[2px] rounded text-[0.82em] font-mono border border-white/10 align-middle">
          {raw}
        </code>
      )
    }

    return <CodeBlock lang={lang} rawCode={raw} />
  },

  h1: ({ children }) => (
    <h1 className="text-[1.4rem] font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[1.15rem] font-bold text-white mt-5 mb-2 leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[1rem] font-semibold text-gray-100 mt-4 mb-1.5 leading-tight">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[0.95rem] font-semibold text-gray-200 mt-3 mb-1 leading-tight">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-gray-100 leading-[1.78] mb-3 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-3 pl-5 space-y-1 text-gray-100 list-disc marker:text-gray-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 pl-5 space-y-1 text-gray-100 list-decimal marker:text-gray-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-[1.75] pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-4 border-l-[3px] border-gray-500 text-gray-300 bg-white/[0.03] py-2 pr-3 rounded-r-lg italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer"
      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition">
      {children}
    </a>
  ),
  hr: () => <hr className="border-white/10 my-5" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
      <table className="w-full text-sm text-gray-200 border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/8 text-gray-300 text-xs uppercase tracking-wide">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-white/[0.03] transition">{children}</tr>,
  th: ({ children }) => <th className="px-4 py-3 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-4 py-3">{children}</td>,
}

/* ── user message with edit / copy actions ── */
function UserBubble({ message, msgIndex }) {
  const { editMessage, streaming } = useChat()
  const doc = message.document
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  const handleSave = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === message.content) { setEditing(false); return }
    setEditing(false)
    await editMessage(msgIndex, trimmed)
  }

  const handleCancel = () => {
    setDraft(message.content)
    setEditing(false)
  }

  return (
    <div className="flex justify-end mb-6 px-4 group msg-animate">
      <div className="max-w-[88%] sm:max-w-[75%] flex flex-col items-end gap-1">
        {doc && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
            <span>📎</span>
            <span className="max-w-[220px] truncate">{doc.filename}</span>
          </div>
        )}

        {editing ? (
          /* ── edit mode ── */
          <div className="w-full min-w-[300px]">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
                if (e.key === 'Escape') handleCancel()
              }}
              className="w-full bg-[#1c1e30] border border-green-500/40 text-gray-100 px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed resize-none focus:outline-none focus:border-green-500/70 transition"
              rows={1}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={handleCancel}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!draft.trim() || streaming}
                className="px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-lg transition">
                Save &amp; Submit
              </button>
            </div>
          </div>
        ) : (
          /* ── display mode ── */
          <>
            <div className="bg-[#1e2240] text-gray-100 px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm border border-white/[0.06]">
              {message.content}
            </div>
            {/* action row — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-0.5">
              <button onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white/5 transition">
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => { setDraft(message.content); setEditing(true) }} disabled={streaming} title="Edit message"
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white/5 disabled:opacity-30 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── message bubble ── */
export default function MessageBubble({ message, msgIndex, botName = null }) {
  const isUser = message.role === 'user'
  const doc = message.document

  if (isUser) {
    return <UserBubble message={message} msgIndex={msgIndex} />
  }

  const workflowType = doc ? 'document' : botName ? 'bot' : 'general'

  return (
    <div className="flex items-start gap-3 mb-7 px-4 group/msg msg-animate">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-white/10 shadow-md">
        <img src="/riphah_logo.png" alt="R" className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-sm pt-0.5 overflow-hidden">
        {workflowType !== 'general' && message.content && (
          <div className="mb-2">
            <WorkflowBadge type={workflowType} botName={botName} />
          </div>
        )}

        {message.content ? (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
            >
              {normalizeMarkdown(message.content)}
            </ReactMarkdown>
            <div className="mt-2.5 flex items-center gap-0.5 pt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
              <CopyButton text={message.content} label="Copy" />
              <ReadAloudButton text={message.content} />
            </div>
          </>
        ) : (
          <span className="flex gap-[5px] items-center h-7">
            <span className="w-2 h-2 bg-green-400/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-green-400/60 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
            <span className="w-2 h-2 bg-green-400/40 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}
