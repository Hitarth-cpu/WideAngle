import { motion, AnimatePresence } from 'framer-motion'

// Tiny stars matching the constellation sketch — small glowing dots
// Visual difference is GLOW, not size. Stars stay small like real stars.
const STATUS = {
  idle:     { core: '#c8bca8', glowR: 0,  glowColor: 'none', glowOpacity: 0 },
  thinking: { core: '#ffe060', glowR: 10, glowColor: 'rgba(255,210,60,0.35)',  glowOpacity: 0.7 },
  acting:   { core: '#ffaa30', glowR: 13, glowColor: 'rgba(255,160,40,0.40)',  glowOpacity: 0.8 },
  done:     { core: '#ffffff', glowR: 8,  glowColor: 'rgba(255,255,230,0.35)', glowOpacity: 0.9 },
}

export default function StarNode({ agent, x, y, isSelected, isConverging, onHover, onClick }) {
  const status = agent?.status || 'idle'
  const cfg = STATUS[status] || STATUS.idle
  const isThinking = status === 'thinking' || status === 'acting'
  const isDone = status === 'done'

  if (isConverging) {
    return (
      <g transform={`translate(${x},${y})`}>
        <circle r={2.5} fill={cfg.core} />
      </g>
    )
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {/* ── Outer soft bloom (thinking pulse) ── */}
      {isThinking && (
        <motion.circle
          r={cfg.glowR}
          fill={cfg.glowColor}
          style={{ pointerEvents: 'none' }}
          animate={{ r: [cfg.glowR * 0.7, cfg.glowR * 1.4, cfg.glowR * 0.7], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Done glow ring (static, no pulse) ── */}
      {isDone && (
        <circle r={cfg.glowR} fill={cfg.glowColor} style={{ pointerEvents: 'none' }} />
      )}

      {/* ── Selected ring (bright outline when panel is open) ── */}
      {isSelected && (
        <motion.circle
          r={8}
          fill="none"
          stroke="#ffe080"
          strokeWidth={1}
          strokeOpacity={0.7}
          style={{ pointerEvents: 'none' }}
          animate={{ r: [7, 9, 7], strokeOpacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Core star dot ── */}
      <motion.circle
        r={isDone ? 3 : 2.5}
        fill={cfg.core}
        style={{
          filter: isThinking
            ? `drop-shadow(0 0 3px ${cfg.core}) drop-shadow(0 0 6px ${cfg.core})`
            : isDone
            ? 'drop-shadow(0 0 4px white) drop-shadow(0 0 8px rgba(255,255,200,0.6))'
            : 'none',
          pointerEvents: 'none',
        }}
        animate={isThinking ? { r: [2.2, 3.2, 2.2] } : { r: isDone ? 3 : 2.5 }}
        transition={isThinking ? { duration: 1.0, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
      />

      {/* ── Bright center pinpoint ── */}
      <circle r={1} fill="rgba(255,255,255,0.9)" style={{ pointerEvents: 'none' }} />

      {/* ── Done: 4 tiny diffraction spikes ── */}
      <AnimatePresence>
        {isDone && (
          <g style={{ pointerEvents: 'none' }}>
            {[0, 45, 90, 135].map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const len = i % 2 === 0 ? 10 : 6
              return (
                <motion.line key={angle}
                  x1={-Math.sin(rad) * len} y1={-Math.cos(rad) * len}
                  x2={Math.sin(rad) * len}  y2={Math.cos(rad) * len}
                  stroke="white"
                  strokeWidth={i % 2 === 0 ? 0.9 : 0.5}
                  strokeLinecap="round"
                  strokeOpacity={i % 2 === 0 ? 0.75 : 0.4}
                  initial={{ scaleX: 0, scaleY: 0 }}
                  animate={{ scaleX: 1, scaleY: 1 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                />
              )
            })}
          </g>
        )}
      </AnimatePresence>

      {/* ── Large transparent hit area for easy clicking ── */}
      <circle
        r={16}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover?.(agent)}
        onMouseLeave={() => onHover?.(null)}
        onClick={() => onClick?.(agent)}
      />
    </g>
  )
}
