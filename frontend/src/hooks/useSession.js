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

    // 2. Trigger run
    await axios.post(`/api/sessions/${created.session_id}/run`)

    // 3. Navigate to canvas
    navigate(`/session/${created.session_id}`)
    return created.session_id
  }, [mode, setSession, reset, navigate])

  return { startSession }
}
