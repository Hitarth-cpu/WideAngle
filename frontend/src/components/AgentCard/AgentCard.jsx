import { motion } from 'framer-motion'
import StreamingText from './StreamingText'
import FormattedOutput from './FormattedOutput'

const STATUS_BADGE = {
  idle:     { label: 'Waiting',    color: '#a09070' },
  thinking: { label: 'Thinking',   color: '#ffe080' },
  acting:   { label: 'Using tool', color: '#ffb347' },
  done:     { label: 'Complete',   color: '#ffffff' },
}

export default function AgentCard({ agent, onChatOpen, onClose }) {
  if (!agent) return null
  const badge = STATUS_BADGE[agent.status] || STATUS_BADGE.idle
  const isDone = agent.status === 'done'
  const isStreaming = agent.status === 'thinking' || agent.status === 'acting'

  return (
    <div style={{
      position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
      zIndex: 20, width: 320,
    }}>
      <motion.div
        initial={{ opacity: 0, x: 30, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 130, damping: 18 }}
        style={{
          maxHeight: '75vh',
          background: 'rgba(6,4,10,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,210,100,0.18)',
          borderRadius: 16,
          padding: '16px 18px',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,200,80,0.05)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#f5ead8', lineHeight: 1.2 }}>{agent.name}</div>
            <div style={{ fontSize: 10, color: '#7a6848', marginTop: 2 }}>Stage {agent.stage}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{
              fontSize: 10, padding: '3px 7px', borderRadius: 20, whiteSpace: 'nowrap',
              background: `${badge.color}18`, color: badge.color,
              border: `1px solid ${badge.color}35`,
            }}>{badge.label}</span>
            <motion.button
              whileHover={{ scale: 1.12, background: 'rgba(255,200,80,0.18)' }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                background: 'rgba(255,200,80,0.08)',
                border: '1px solid rgba(255,200,80,0.25)',
                borderRadius: 5, cursor: 'pointer',
                color: '#c8a860', fontSize: 15,
                width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
              aria-label="Close"
            >x</motion.button>
          </div>
        </div>

        {/* Role */}
        {agent.role && (
          <div style={{
            fontSize: 10, color: '#c8a060',
            background: 'rgba(255,180,60,0.08)',
            border: '1px solid rgba(255,180,60,0.18)',
            borderRadius: 20, padding: '2px 10px', marginBottom: 12,
            display: 'inline-block', maxWidth: '100%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {agent.role}
          </div>
        )}

        {/* Output box */}
        <div style={{
          background: 'rgba(2,2,6,0.7)',
          border: '1px solid rgba(255,200,80,0.12)',
          borderRadius: 10,
          padding: '10px 12px',
          marginBottom: 12,
          minHeight: 60,
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          {isDone
            ? <FormattedOutput text={agent.output} />
            : <StreamingText text={agent.output} isStreaming={isStreaming} />
          }
        </div>

        {/* Chat button */}
        <motion.button
          whileHover={{ scale: 1.02, background: 'rgba(255,200,80,0.14)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChatOpen?.(agent.name)}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 9, cursor: 'pointer',
            background: 'rgba(255,200,80,0.08)',
            border: '1px solid rgba(255,200,80,0.25)',
            color: '#d4a84b', fontSize: 12, fontWeight: 600,
            fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
          }}
        >
          Chat with {agent.name} &rarr;
        </motion.button>
      </motion.div>
    </div>
  )
}
