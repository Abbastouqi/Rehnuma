import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import { ChatProvider } from '../../context/ChatContext'
import { BotProvider } from '../../context/BotContext'
import { PromptProvider } from '../../context/PromptContext'

export default function Layout() {
  return (
    <BotProvider>
      <ChatProvider>
        <PromptProvider>
          <div className="flex h-screen bg-[#131420] overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-hidden flex flex-col">
              <Outlet />
            </div>
          </div>
        </PromptProvider>
      </ChatProvider>
    </BotProvider>
  )
}
