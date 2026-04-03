export default function ChatBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '80%', padding: '8px 12px', borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser ? 'rgba(167,139,250,0.25)' : 'rgba(13,27,75,0.7)',
        border: `1px solid ${isUser ? 'rgba(167,139,250,0.3)' : 'rgba(74,111,165,0.3)'}`,
        color: '#e8f0fe', fontSize: 13, lineHeight: 1.5,
      }}>
        {content}
      </div>
    </div>
  )
}
