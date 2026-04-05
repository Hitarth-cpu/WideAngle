import { useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import useSessionStore from '../store/sessionStore'

export default function useSession() {
  const navigate = useNavigate()
  const { mode, setSession, reset } = useSessionStore()

  const startSession = useCallback(async ({ inputText, inputType }) => {
    reset()
    // 1. Create session
    const { data: created } = await axios.post('/api/sessions', {
      mode,
      input_type: inputType,
      input_text: inputText,
    })
    setSession(created)

    // 2. Navigate first so WebSocket connects before /run starts emitting events
    navigate(`/session/${created.session_id}`)

    // 3. Small delay to allow WS handshake before backend starts emitting
    await new Promise((r) => setTimeout(r, 400))

    // 4. Trigger run
    await axios.post(`/api/sessions/${created.session_id}/run`)
    return created.session_id
  }, [mode, setSession, reset, navigate])

  return { startSession }
}
