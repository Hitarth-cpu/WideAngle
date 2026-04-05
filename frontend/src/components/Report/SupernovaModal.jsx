import { motion, AnimatePresence } from 'framer-motion'
import useSessionStore from '../../store/sessionStore'

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#f5ead8', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function parseReport(report) {
  if (!report) return []
  const cleaned = report.replace(/^FINAL ANSWER:\s*/i, '').trim()
  const sections = []
  const lines = cleaned.split('\n')
  let current = null
  let preamble = []
  let foundHeader = false

  lines.forEach((line) => {
    const h1 = line.match(/^#\s+(.+)/)
    const h2 = line.match(/^##\s+(.+)/)
    const h3 = line.match(/^###\s+(.+)/)
    if (h1 || h2 || h3) {
      if (current) sections.push(current)
      else if (preamble.length) {
        sections.push({ title: 'Summary', content: preamble.join('\n').trim(), level: 2 })
        preamble = []
      }
      foundHeader = true
      const title = (h3?.[1] || h2?.[1] || h1?.[1]).trim()
      current = { title, content: [], level: h3 ? 3 : h2 ? 2 : 1 }
    } else if (current) {
      current.content.push(line)
    } else if (!foundHeader) {
      preamble.push(line)
    }
  })
  if (current) sections.push(current)
  if (!foundHeader && preamble.length) {
    sections.push({ title: 'Analysis', content: preamble.join('\n').trim(), level: 2 })
  }
  return sections.map((s) => ({
    ...s,
    content: Array.isArray(s.content) ? s.content.join('\n').trim() : s.content,
  }))
}

function Section({ title, content, level, delay }) {
  const lines = content.split('\n')
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: 'easeOut', duration: 0.4 }}
      style={{ marginBottom: 22 }}
    >
      <div style={{
        color: level === 1 ? '#ffe8a0' : level === 3 ? '#c8a870' : '#d4b870',
        fontSize: level === 1 ? 14 : level === 3 ? 11 : 12,
        fontWeight: 700,
        marginBottom: 8,
        textTransform: level === 3 ? 'none' : 'uppercase',
        letterSpacing: level === 3 ? '0.01em' : '0.07em',
        borderBottom: `1px solid ${level === 1 ? 'rgba(255,232,160,0.2)' : 'rgba(200,168,100,0.15)'}`,
        paddingBottom: 5,
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#c8bca8' }}>
        {lines.map((line, i) => {
          const trimmed = line.trim()
          if (!trimmed) return null
          if (/^[-*]\s/.test(trimmed)) {
            return (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{ color: '#806840', flexShrink: 0, marginTop: 2, fontSize: 15, lineHeight: 1 }}>·</span>
                <span>{renderInline(trimmed.replace(/^[-*]\s/, ''))}</span>
              </div>
            )
          }
          return <p key={i} style={{ margin: '0 0 6px 0' }}>{renderInline(trimmed)}</p>
        })}
      </div>
    </motion.div>
  )
}

export default function SupernovaModal() {
  const { report, supernovaReady, setSupernovaReady } = useSessionStore()
  const sections = parseReport(report)

  return (
    <AnimatePresence>
      {supernovaReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(1,1,3,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSupernovaReady(false) }}
        >
          <motion.div
            initial={{ scale: 0.78, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 85, damping: 14, delay: 0.1 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 'min(700px, calc(100vw - 48px))',
              maxHeight: '85vh',
              background: 'rgba(5,4,10,0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,220,100,0.25)',
              borderRadius: 20,
              padding: '28px 32px',
              overflowY: 'auto',
              boxShadow: '0 0 100px rgba(255,180,60,0.08), 0 40px 80px rgba(0,0,0,0.85)',
            }}
          >
            {/* Close */}
            <motion.button
              whileHover={{ scale: 1.1, background: 'rgba(255,200,80,0.2)' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSupernovaReady(false)}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: 'rgba(255,200,80,0.08)',
                border: '1px solid rgba(255,200,80,0.3)',
                borderRadius: 20, color: '#d4a840',
                width: 30, height: 30, fontSize: 17,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
              aria-label="Close report"
            >x</motion.button>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              style={{ textAlign: 'center', marginBottom: 28 }}
            >
              {/* Simple glowing star dot instead of emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'radial-gradient(circle, white 0%, #ffe080 50%, transparent 100%)',
                  margin: '0 auto 12px',
                  boxShadow: '0 0 20px rgba(255,220,120,0.9), 0 0 40px rgba(255,180,80,0.5)',
                }}
              />
              <h2 style={{
                color: '#f5e8c0', fontSize: 20, fontWeight: 800,
                margin: '0 0 4px',
                letterSpacing: '0.05em',
                fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
              }}>
                Final Analysis Report
              </h2>
              <p style={{ color: '#6a5838', fontSize: 11, margin: 0, letterSpacing: '0.04em' }}>
                Synthesized from all agent analyses
              </p>
            </motion.div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,210,100,0.3), transparent)',
              marginBottom: 24,
            }} />

            {/* Sections */}
            {sections.length > 0 ? (
              sections.map((s, i) => (
                <Section key={`${s.title}-${i}`} title={s.title} content={s.content} level={s.level} delay={0.2 + i * 0.07} />
              ))
            ) : (
              <div style={{ color: '#c8bca8', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {report}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
