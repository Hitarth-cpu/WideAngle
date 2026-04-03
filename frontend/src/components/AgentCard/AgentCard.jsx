import { motion, AnimatePresence } from 'framer-motion'
import StreamingText from './StreamingText'

const STATUS_BADGE = {
  idle:     { label: 'Waiting',  color: '#4a6fa5' },
  thinking: { label: 'Thinking', color: '#7eb8f7' },
  acting:   { label: 'Using tool', color: '#a78bfa' },
  done:     { label: 'Complete', color: '#f0c060' },
}

export default function AgentCard({ agent, onChatOpen }) {
  if (!agent) return null
  const badge = STATUS_BADGE[agent.status] || STATUS_BADGE.idle

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 140 }}
      style={{
        position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
        width: 320, maxHeight: '70vh',
        background: 'rgba(13,27,75,0.8)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(74,111,165,0.3)', borderRadius: 16,
        padding: 20, zIndex: 20, overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e8f0fe' }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: '#4a6fa5', marginTop: 2 }}>Stage {agent.stage}</div>
        </div>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 20,
          background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}44`,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Role */}
      <div style={{ fontSize: 11, color: '#7eb8f7', marginBottom: 12, lineHeight: 1.5 }}>{agent.role}</div>

      {/* Streaming output */}
      <div style={{ background: 'rgba(4,8,18,0.5)', borderRadius: 8, padding: 10, marginBottom: 12, maxHeight: 200, overflowY: 'auto' }}>
        <StreamingText
          text={agent.output}
          isStreaming={agent.status === 'thinking' || agent.status === 'acting'}
        />
      </div>

      {/* Chat button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onChatOpen?.(agent.name)}
        style={{
          width: '100%', padding: '8px 0', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(126,184,247,0.12)', border: '1px solid rgba(126,184,247,0.3)',
          color: '#7eb8f7', fontSize: 13, fontWeight: 600,
        }}
      >
        Chat with {agent.name} →
      </motion.button>
    </motion.div>
  )
}
