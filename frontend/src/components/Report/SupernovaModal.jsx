import { motion, AnimatePresence } from 'framer-motion'
import useSessionStore from '../../store/sessionStore'

function Section({ title, content, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ marginBottom: 24 }}
    >
      <h3 style={{ color: '#7eb8f7', fontSize: 14, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      <div style={{ color: '#e8f0fe', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    </motion.div>
  )
}

function parseReport(report) {
  if (!report) return []
  const sections = []
  const lines = report.split('\n')
  let current = null

  lines.forEach((line) => {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.replace('## ', '').trim(), content: [] }
    } else if (current) {
      current.content.push(line)
    }
  })
  if (current) sections.push(current)

  return sections.map((s) => ({ ...s, content: s.content.join('\n').trim() }))
}

export default function SupernovaModal() {
  const { report } = useSessionStore()
  const sections = parseReport(report)

  return (
    <AnimatePresence>
      {report && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(4,8,18,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.1 }}
            style={{
              width: '100%', maxWidth: 720, maxHeight: '85vh',
              background: 'rgba(13,27,75,0.9)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,157,0,0.3)', borderRadius: 20,
              padding: 32, overflowY: 'auto',
            }}
          >
            {/* Header */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>☀</div>
              <h2 style={{ color: '#ff9d00', fontSize: 20, fontWeight: 700, margin: 0 }}>Final Analysis Report</h2>
              <p style={{ color: '#4a6fa5', fontSize: 12, marginTop: 4 }}>Synthesized from all agent analyses</p>
            </motion.div>

            {/* Parsed sections */}
            {sections.length > 0 ? (
              sections.map((s, i) => (
                <Section key={s.title} title={s.title} content={s.content} delay={0.15 + i * 0.1} />
              ))
            ) : (
              <div style={{ color: '#e8f0fe', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {report}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
