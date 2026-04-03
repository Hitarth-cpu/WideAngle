import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatBubble from './ChatBubble'
import useSessionStore from '../../store/sessionStore'
import useAgentChat from '../../hooks/useAgentChat'

export default function ChatPanel() {
  const { activeChat, chatHistories, closeChat } = useSessionStore()
  const { sendMessage, loading } = useAgentChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const messages = chatHistories[activeChat] || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    await sendMessage(activeChat, msg)
  }

  return (
    <AnimatePresence>
      {activeChat && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 360,
            background: 'rgba(4,8,18,0.92)', backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(74,111,165,0.3)',
            display: 'flex', flexDirection: 'column', zIndex: 30,
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid rgba(74,111,165,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#e8f0fe' }}>{activeChat}</div>
              <div style={{ fontSize: 11, color: '#4a6fa5' }}>Ask anything about this analysis</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={closeChat}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a6fa5', fontSize: 20 }}
            >×</motion.button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {messages.length === 0 && (
              <div style={{ color: '#4a6fa5', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                Ask {activeChat} anything about their analysis.
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                {[0,1,2].map(i => (
                  <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#4a6fa5' }}
                    animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(74,111,165,0.2)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              style={{
                flex: 1, background: 'rgba(13,27,75,0.6)', border: '1px solid rgba(74,111,165,0.3)',
                borderRadius: 8, padding: '8px 12px', color: '#e8f0fe', fontSize: 13, outline: 'none',
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleSend} disabled={loading || !input.trim()}
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                background: input.trim() ? 'rgba(126,184,247,0.2)' : 'rgba(74,111,165,0.1)',
                border: '1px solid rgba(126,184,247,0.3)', color: '#7eb8f7', fontSize: 13,
              }}
            >→</motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
