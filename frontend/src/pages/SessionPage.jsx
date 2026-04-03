import { useState } from 'react'
import { useParams } from 'react-router-dom'
import useWebSocket from '../hooks/useWebSocket'
import SpaceCanvas from '../components/Canvas/SpaceCanvas'
import AgentCard from '../components/AgentCard/AgentCard'
import ChatPanel from '../components/ChatPanel/ChatPanel'
import SupernovaModal from '../components/Report/SupernovaModal'
import useSessionStore from '../store/sessionStore'

export default function SessionPage() {
  const { sessionId } = useParams()
  const [selectedAgent, setSelectedAgent] = useState(null)
  const { openChat } = useSessionStore()
  useWebSocket(sessionId)

  function handleAgentClick(agent) {
    setSelectedAgent(agent)
  }

  function handleChatOpen(agentName) {
    openChat(agentName)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#040812', overflow: 'hidden' }}>
      <SpaceCanvas onAgentClick={handleAgentClick} />
      {selectedAgent && (
        <AgentCard agent={selectedAgent} onChatOpen={handleChatOpen} />
      )}
      <ChatPanel />
      <SupernovaModal />
    </div>
  )
}
