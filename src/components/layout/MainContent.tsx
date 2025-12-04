import { ChatArea } from '../chat/ChatArea'
import { SandboxGrid } from '../sandbox/SandboxGrid'

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white/50">
      <div className="flex-1 overflow-y-auto w-full">
        {/* Zone Chat */}
        <ChatArea />
        
        {/* Bac à Sable */}
        <SandboxGrid />
      </div>
    </main>
  )
}
