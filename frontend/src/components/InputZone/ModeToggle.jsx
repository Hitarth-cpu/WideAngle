import { motion } from 'framer-motion'
import useSessionStore from '../../store/sessionStore'

const MODES = [
  { id: 'startup', label: 'Startup Idea' },
  { id: 'code_review', label: 'Code Review' },
]

export default function ModeToggle() {
  const { mode, setMode } = useSessionStore()
  return (
    <div style={{
      display: 'flex',
      background: 'rgba(6,4,10,0.7)',
      borderRadius: 30,
      padding: 4,
      border: '1px solid rgba(255,200,80,0.14)',
      position: 'relative',
    }}>
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          style={{
            position: 'relative', zIndex: 1,
            padding: '8px 22px', borderRadius: 26,
            border: 'none', background: 'none', cursor: 'pointer',
            color: mode === id ? '#f0d898' : '#5a4830',
            fontSize: 13, fontWeight: 600,
            transition: 'color 0.25s',
            fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
            letterSpacing: '0.02em',
          }}
        >
          {mode === id && (
            <motion.div
              layoutId="mode-pill"
              style={{
                position: 'absolute', inset: 0, borderRadius: 26,
                background: 'rgba(255,200,80,0.12)',
                border: '1px solid rgba(255,200,80,0.28)',
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            />
          )}
          {label}
        </button>
      ))}
    </div>
  )
}
