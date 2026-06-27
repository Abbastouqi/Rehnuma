import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import { ChatProvider } from '../../context/ChatContext'
import { BotProvider } from '../../context/BotContext'
import { PromptProvider } from '../../context/PromptContext'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BotProvider>
      <ChatProvider>
        <PromptProvider>
          <div className="flex h-screen bg-[#131420] overflow-hidden">

            {/* Mobile backdrop — tap to close */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/60 z-30 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar — always visible on md+, slide-in drawer on mobile */}
            <div className={`
              fixed md:relative inset-y-0 left-0 z-40 h-full shrink-0
              transition-transform duration-300 ease-in-out
              md:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
            </div>
          </div>
        </PromptProvider>
      </ChatProvider>
    </BotProvider>
  )
}
