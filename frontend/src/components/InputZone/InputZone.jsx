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
  const [codeTab, setCodeTab] = useState('paste') // 'paste' | 'github'
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
      alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1,
    }}>
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '3.2rem', fontWeight: 700, color: '#e8f0fe', margin: 0, letterSpacing: '-0.02em' }}>
          Wide<span style={{ color: '#7eb8f7' }}>Angle</span>
        </h1>
        <p style={{ color: '#4a6fa5', marginTop: 8, fontSize: '1.05rem' }}>
          Multi-agent analysis — see every angle
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ marginBottom: 28 }}>
        <ModeToggle />
      </motion.div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{
          width: '100%', maxWidth: 640,
          background: 'rgba(13,27,75,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(74,111,165,0.25)', borderRadius: 16, padding: 20,
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
              color: '#e8f0fe', fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        ) : (
          <>
            {/* Code Review tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['paste','Paste Code'],['github','GitHub URL']].map(([id, label]) => (
                <button key={id} onClick={() => setCodeTab(id)} style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: codeTab === id ? 'rgba(126,184,247,0.2)' : 'transparent',
                  color: codeTab === id ? '#7eb8f7' : '#4a6fa5',
                  borderBottom: codeTab === id ? '1px solid rgba(126,184,247,0.4)' : '1px solid transparent',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {codeTab === 'paste' ? (
                <motion.textarea
                  key="paste"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your code here..."
                  rows={7}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    color: '#e8f0fe', fontSize: 13, lineHeight: 1.6, resize: 'vertical',
                    fontFamily: "'Cascadia Code', 'Fira Code', monospace",
                  }}
                />
              ) : (
                <motion.input
                  key="github"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    color: '#e8f0fe', fontSize: 14, padding: '8px 0', fontFamily: 'inherit',
                  }}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ color: '#ff6b6b', fontSize: 13, marginTop: 12 }}>
          {error}
        </motion.div>
      )}

      {/* Analyze button */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        onClick={handleAnalyze} disabled={loading}
        style={{
          marginTop: 20, padding: '13px 40px', borderRadius: 30, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? 'rgba(74,111,165,0.2)' : 'linear-gradient(135deg, rgba(126,184,247,0.25), rgba(167,139,250,0.25))',
          color: loading ? '#4a6fa5' : '#e8f0fe',
          border: '1px solid rgba(126,184,247,0.35)',
          fontSize: 15, fontWeight: 600, letterSpacing: '0.02em',
        }}
      >
        {loading ? (
          <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
            Generating constellation...
          </motion.span>
        ) : 'Analyze →'}
      </motion.button>
    </div>
  )
}
