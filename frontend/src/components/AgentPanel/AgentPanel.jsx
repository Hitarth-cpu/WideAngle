import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSessionStore from '../../store/sessionStore'
import useAgentChat from '../../hooks/useAgentChat'
import FormattedOutput from '../AgentCard/FormattedOutput'
import StreamingText from '../AgentCard/StreamingText'

const STATUS_BADGE = {
  idle:     { label: 'Waiting',    color: '#a09070' },
  thinking: { label: 'Thinking',   color: '#ffe060' },
  acting:   { label: 'Using tool', color: '#ffb347' },
  done:     { label: 'Complete',   color: '#aaffaa' },
}

function ChatBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '7px 11px',
        borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
        background: isUser
          ? 'rgba(255,210,80,0.12)'
          : 'rgba(30,30,50,0.8)',
        border: isUser
          ? '1px solid rgba(255,210,80,0.25)'
          : '1px solid rgba(255,255,255,0.06)',
        color: isUser ? '#f5e8c0' : '#c8bca8',
        fontSize: 12,
        lineHeight: 1.55,
      }}>
        {content}
      </div>
    </div>
  )
}

export default function AgentPanel({ agent, onClose }) {
  const { chatHistories } = useSessionStore()
  const { sendMessage, loading } = useAgentChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const messages = agent ? (chatHistories[agent.name] || []) : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading || !agent) return
    const msg = input.trim()
    setInput('')
    await sendMessage(agent.name, msg)
  }

  const badge = agent ? (STATUS_BADGE[agent.status] || STATUS_BADGE.idle) : null
  const isDone = agent?.status === 'done'
  const isStreaming = agent?.status === 'thinking' || agent?.status === 'acting'

  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          key={agent.id || agent.name}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '110%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            position: 'fixed',
            right: 0, top: 0, bottom: 0,
            width: 380,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 25,
            background: 'rgba(4,3,10,0.96)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255,210,100,0.12)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.7)',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,210,100,0.08)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 15, color: '#f5ead8',
                  fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                  lineHeight: 1.2,
                }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 10, color: '#6a5838', marginTop: 2 }}>
                  Stage {agent.stage}
                  {agent.role && ` · ${agent.role}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {badge && (
                  <motion.span
                    key={badge.label}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 20,
                      background: `${badge.color}18`, color: badge.color,
                      border: `1px solid ${badge.color}35`,
                      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {badge.label}
                  </motion.span>
                )}
                <motion.button
                  whileHover={{ scale: 1.1, background: 'rgba(255,200,80,0.18)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  aria-label="Close panel"
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'rgba(255,200,80,0.08)',
                    border: '1px solid rgba(255,200,80,0.22)',
                    color: '#c8a060', fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >x</motion.button>
              </div>
            </div>
          </div>

          {/* ── Output / Reasoning section ── */}
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255,210,100,0.07)',
            maxHeight: '42vh',
            overflowY: 'auto',
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,210,100,0.4)', textTransform: 'uppercase',
              marginBottom: 8,
              fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
            }}>
              Analysis
            </div>
            <div style={{
              background: 'rgba(2,2,8,0.6)',
              border: '1px solid rgba(255,200,80,0.08)',
              borderRadius: 8,
              padding: '10px 12px',
              minHeight: 48,
            }}>
              {isDone
                ? <FormattedOutput text={agent.output} />
                : <StreamingText text={agent.output} isStreaming={isStreaming} />
              }
            </div>
          </div>

          {/* ── Chat section ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            flex: 1, overflow: 'hidden',
          }}>
            {/* Chat label */}
            <div style={{
              padding: '10px 18px 6px',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,210,100,0.4)', textTransform: 'uppercase',
              fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
              flexShrink: 0,
            }}>
              Chat with {agent.name}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: '4px 18px 8px',
            }}>
              {messages.length === 0 && (
                <div style={{
                  color: 'rgba(150,130,100,0.5)', fontSize: 11,
                  textAlign: 'center', marginTop: 24,
                  fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                }}>
                  Ask anything about this analysis
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} />
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 4, padding: '6px 0' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8a060' }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input row */}
            <div style={{
              padding: '10px 14px 14px',
              borderTop: '1px solid rgba(255,210,100,0.07)',
              display: 'flex', gap: 8, flexShrink: 0,
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                style={{
                  flex: 1,
                  background: 'rgba(10,8,20,0.7)',
                  border: '1px solid rgba(255,200,80,0.15)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#e8dcc8',
                  fontSize: 12,
                  outline: 'none',
                  fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                }}
              />
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  background: input.trim()
                    ? 'rgba(255,200,80,0.14)'
                    : 'rgba(80,70,50,0.1)',
                  border: '1px solid rgba(255,200,80,0.22)',
                  color: input.trim() ? '#f0d898' : '#5a4830',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                →
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
