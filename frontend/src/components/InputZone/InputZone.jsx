import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ModeToggle from './ModeToggle'
import useSession from '../../hooks/useSession'
import useSessionStore from '../../store/sessionStore'

export default function InputZone() {
  const { mode } = useSessionStore()
  const { startSession } = useSession()
  const [inputText, setInputText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [codeTab, setCodeTab] = useState('paste')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    setError(null)
    const text = mode === 'code_review' && codeTab === 'github' ? githubUrl : inputText
    const inputType = mode === 'startup' ? 'code'
      : codeTab === 'github' ? 'github' : 'code'
    if (!text.trim()) { setError('Please provide input first.'); return }
    setLoading(true)
    try {
      await startSession({ inputText: text, inputType })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to start session.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      position: 'relative', zIndex: 1,
    }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0, 0.2, 1] }}
        style={{ textAlign: 'center', marginBottom: 44 }}
      >
        <h1 style={{
          fontSize: '3.4rem', fontWeight: 800, margin: 0,
          letterSpacing: '-0.03em',
          color: '#f5ead8',
          textShadow: '0 0 60px rgba(255,200,100,0.25)',
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        }}>
          Wide<span style={{
            color: '#ffcc60',
            textShadow: '0 0 30px rgba(255,200,80,0.6)',
          }}>Angle</span>
        </h1>
        <p style={{
          color: '#6a5838', marginTop: 10, fontSize: '1rem',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        }}>
          Multi-agent analysis &mdash; see every angle
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        style={{ marginBottom: 24 }}
      >
        <ModeToggle />
      </motion.div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.2, 0, 0.2, 1] }}
        style={{
          width: '100%', maxWidth: 640,
          background: 'rgba(6,4,10,0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,200,80,0.15)',
          borderRadius: 16, padding: '18px 20px',
        }}
      >
        {mode === 'startup' ? (
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe your startup idea, paste a pitch deck summary, or share your vision..."
            rows={7}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: '#e8dcc8', fontSize: 14, lineHeight: 1.75, resize: 'vertical',
              fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
              '::placeholder': { color: '#4a3820' },
            }}
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['paste','Paste Code'],['github','GitHub URL']].map(([id, label]) => (
                <button key={id} onClick={() => setCodeTab(id)} style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: codeTab === id ? 'rgba(255,200,80,0.15)' : 'transparent',
                  color: codeTab === id ? '#ffcc60' : '#6a5838',
                  borderBottom: codeTab === id ? '1px solid rgba(255,200,80,0.4)' : '1px solid transparent',
                  fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                }}>{label}</button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {codeTab === 'paste' ? (
                <motion.textarea key="paste"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  value={inputText} onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your code here..."
                  rows={7}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    color: '#e8dcc8', fontSize: 13, lineHeight: 1.65, resize: 'vertical',
                    fontFamily: "'Cascadia Code','Fira Code',monospace",
                  }}
                />
              ) : (
                <motion.input key="github"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    color: '#e8dcc8', fontSize: 14, padding: '8px 0',
                    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                  }}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ color: '#ff8060', fontSize: 13, marginTop: 12 }}>
          {error}
        </motion.div>
      )}

      {/* Analyze button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(255,200,80,0.25)' }}
        whileTap={{ scale: 0.97 }}
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          marginTop: 22, padding: '13px 44px', borderRadius: 30,
          border: '1px solid rgba(255,200,80,0.3)',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: loading
            ? 'rgba(255,180,60,0.06)'
            : 'linear-gradient(135deg, rgba(255,200,80,0.15), rgba(255,150,50,0.12))',
          color: loading ? '#6a5030' : '#f0d898',
          fontSize: 15, fontWeight: 600, letterSpacing: '0.04em',
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
          transition: 'background 0.3s, color 0.3s',
        }}
      >
        {loading ? (
          <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            Generating constellation...
          </motion.span>
        ) : 'Analyze'}
      </motion.button>
    </div>
  )
}
