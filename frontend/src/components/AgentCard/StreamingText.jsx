import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function StreamingText({ text, isStreaming }) {
  const endRef = useRef(null)

  useEffect(() => {
    if (isStreaming) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [text, isStreaming])

  return (
    <div style={{ position: 'relative', fontFamily: 'monospace', fontSize: 12, color: '#e8f0fe', lineHeight: 1.6 }}>
      <span>{text || ''}</span>
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ display: 'inline-block', width: 8, height: 14, background: '#7eb8f7', marginLeft: 2, verticalAlign: 'text-bottom' }}
        />
      )}
      <div ref={endRef} />
    </div>
  )
}
