// Parses agent output text into structured tokens and renders them cleanly.

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#e8f0fe', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function parseAgentOutput(text) {
  if (!text) return []
  const cleaned = text.replace(/^FINAL ANSWER:\s*/i, '').trim()
  const tokens = []
  const lines = cleaned.split('\n')
  let paragraphLines = []

  const flushParagraph = () => {
    const joined = paragraphLines.join('\n').trim()
    if (joined) tokens.push({ type: 'paragraph', text: joined })
    paragraphLines = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      return
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      flushParagraph()
      tokens.push({ type: 'heading', text: trimmed.replace(/^#+\s/, '') })
      return
    }

    if (/^[-*]\s/.test(trimmed)) {
      flushParagraph()
      tokens.push({ type: 'bullet', text: trimmed.replace(/^[-*]\s/, '') })
      return
    }

    if (/^>\s/.test(trimmed)) {
      flushParagraph()
      tokens.push({ type: 'quote', text: trimmed.replace(/^>\s/, '') })
      return
    }

    paragraphLines.push(trimmed)
  })

  flushParagraph()
  return tokens
}

export default function FormattedOutput({ text }) {
  const tokens = parseAgentOutput(text)

  if (!tokens.length) {
    return (
      <div style={{ fontSize: 12, color: '#4a6fa5', fontStyle: 'italic' }}>
        No output yet.
      </div>
    )
  }

  return (
    <div style={{ fontSize: 12, lineHeight: 1.65, color: '#b8c8e8' }}>
      {tokens.map((token, i) => {
        if (token.type === 'heading') {
          return (
            <div
              key={i}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#7eb8f7',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginTop: i > 0 ? 14 : 0,
                marginBottom: 5,
                fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                borderBottom: '1px solid rgba(126,184,247,0.15)',
                paddingBottom: 3,
              }}
            >
              {token.text}
            </div>
          )
        }

        if (token.type === 'bullet') {
          return (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4, alignItems: 'flex-start' }}>
              <span style={{ color: '#4a6fa5', flexShrink: 0, marginTop: 2, fontSize: 14, lineHeight: 1 }}>·</span>
              <span style={{ color: '#b8c8e8' }}>{renderInline(token.text)}</span>
            </div>
          )
        }

        if (token.type === 'quote') {
          return (
            <div
              key={i}
              style={{
                borderLeft: '2px solid rgba(126,184,247,0.35)',
                paddingLeft: 10,
                marginBottom: 7,
                marginTop: 4,
                color: '#7eb8f7',
                fontStyle: 'italic',
                fontSize: 11,
              }}
            >
              {token.text}
            </div>
          )
        }

        if (token.type === 'paragraph') {
          return (
            <p key={i} style={{ margin: '0 0 9px 0', color: '#b8c8e8' }}>
              {renderInline(token.text)}
            </p>
          )
        }

        return null
      })}
    </div>
  )
}
