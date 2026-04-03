import { useState, useCallback } from 'react'
import axios from 'axios'
import useSessionStore from '../store/sessionStore'

export default function useAgentChat() {
  const [loading, setLoading] = useState(false)
  const { session, appendChatMessage } = useSessionStore()

  const sendMessage = useCallback(async (agentName, message) => {
    if (!session?.session_id || !message.trim()) return

    appendChatMessage(agentName, 'user', message)
    setLoading(true)

    try {
      const { data } = await axios.post(
        `/api/sessions/${session.session_id}/chat`,
        { agent_name: agentName, message }
      )
      appendChatMessage(agentName, 'agent', data.response)
      return data.response
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to reach agent'
      appendChatMessage(agentName, 'agent', `[Error: ${errMsg}]`)
    } finally {
      setLoading(false)
    }
  }, [session, appendChatMessage])

  return { sendMessage, loading }
}
