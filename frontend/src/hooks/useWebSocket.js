import { useEffect, useRef, useCallback } from 'react'
import useSessionStore from '../store/sessionStore'

export default function useWebSocket(sessionId) {
  const wsRef = useRef(null)
  const { setPlanReady, updateAgent, appendAgentToken, setReport, setSessionError } = useSessionStore()

  const connect = useCallback(() => {
    if (!sessionId) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}/ws/sessions/${sessionId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data)
        handleEvent(type, data)
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    ws.onerror = (e) => console.error('WebSocket error', e)

    ws.onclose = () => {
      // Reconnect after 2s if session still running
      const { sessionStatus } = useSessionStore.getState()
      if (sessionStatus === 'running') {
        setTimeout(connect, 2000)
      }
    }
  }, [sessionId])

  function handleEvent(type, data) {
    switch (type) {
      case 'plan_ready':
        setPlanReady(data.agents, data.dag)
        break
      case 'agent_start':
        updateAgent(data.agent_id, { status: 'thinking', name: data.name })
        break
      case 'agent_status':
        updateAgent(data.agent_id, { status: data.status })
        break
      case 'agent_token':
        appendAgentToken(data.agent_id, data.token)
        break
      case 'agent_done':
        updateAgent(data.agent_id, { status: 'done', output: data.output })
        break
      case 'session_done':
        setReport(data.report)
        break
      case 'session_error':
        setSessionError(data.error)
        break
      default:
        break
    }
  }

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
