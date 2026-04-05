import { useState } from 'react'
import { useParams } from 'react-router-dom'
import useWebSocket from '../hooks/useWebSocket'
import SpaceCanvas from '../components/Canvas/SpaceCanvas'
import AgentPanel from '../components/AgentPanel/AgentPanel'
import SupernovaModal from '../components/Report/SupernovaModal'

export default function SessionPage() {
  const { sessionId } = useParams()
  const [selectedAgent, setSelectedAgent] = useState(null)
  useWebSocket(sessionId)

  function handleAgentClick(agent) {
    // Toggle: clicking the same star closes the panel
    setSelectedAgent(prev =>
      (prev?.id || prev?.name) === (agent?.id || agent?.name) ? null : agent
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#010108', overflow: 'hidden' }}>
      <SpaceCanvas
        onAgentClick={handleAgentClick}
        selectedAgentId={selectedAgent?.id || selectedAgent?.name}
      />
      <AgentPanel
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
      <SupernovaModal />
    </div>
  )
}
