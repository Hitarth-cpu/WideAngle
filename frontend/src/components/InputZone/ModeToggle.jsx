import { motion } from 'framer-motion'
import useSessionStore from '../../store/sessionStore'

const MODES = [
  { id: 'startup', label: '✦ Startup Idea' },
  { id: 'code_review', label: '⌥ Code Review' },
]

export default function ModeToggle() {
  const { mode, setMode } = useSessionStore()
  return (
    <div style={{
      display: 'flex', background: 'rgba(13,27,75,0.5)', borderRadius: 30,
      padding: 4, border: '1px solid rgba(74,111,165,0.25)', position: 'relative',
    }}>
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          style={{
            position: 'relative', zIndex: 1, padding: '8px 20px', borderRadius: 26,
            border: 'none', background: 'none', cursor: 'pointer',
            color: mode === id ? '#e8f0fe' : '#4a6fa5', fontSize: 13, fontWeight: 600, transition: 'color 0.2s',
          }}
        >
          {mode === id && (
            <motion.div
              layoutId="mode-pill"
              style={{
                position: 'absolute', inset: 0, borderRadius: 26,
                background: 'rgba(126,184,247,0.15)', border: '1px solid rgba(126,184,247,0.3)',
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
          )}
          {label}
        </button>
      ))}
    </div>
  )
}
