import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const STATUS_COLORS = {
  idle:     { core: '#4a6fa5', glow: 'rgba(74,111,165,0.3)',  ring: 'rgba(74,111,165,0.15)' },
  thinking: { core: '#7eb8f7', glow: 'rgba(126,184,247,0.6)', ring: 'rgba(126,184,247,0.2)' },
  acting:   { core: '#a78bfa', glow: 'rgba(167,139,250,0.6)', ring: 'rgba(167,139,250,0.2)' },
  done:     { core: '#f0c060', glow: 'rgba(240,192,96,0.5)',  ring: 'rgba(240,192,96,0.15)' },
}

export default function StarNode({ agent, x, y, onHover, onClick }) {
  const status = agent?.status || 'idle'
  const colors = STATUS_COLORS[status] || STATUS_COLORS.idle
  const isThinking = status === 'thinking' || status === 'acting'

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover?.(agent)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(agent)}
    >
      {/* Outer glow ring */}
      <motion.circle
        r={24}
        fill={colors.ring}
        animate={isThinking ? { r: [24, 30, 24], opacity: [0.6, 1, 0.6] } : { r: 24, opacity: 0.6 }}
        transition={{ duration: 1.5, repeat: isThinking ? Infinity : 0, ease: 'easeInOut' }}
      />

      {/* Core star */}
      <motion.circle
        r={8}
        fill={colors.core}
        style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
        animate={isThinking
          ? { r: [8, 11, 8], opacity: [1, 0.8, 1] }
          : status === 'done'
          ? { r: 10, opacity: 1 }
          : { r: 8, opacity: 0.8 }
        }
        transition={{ duration: 1.2, repeat: isThinking ? Infinity : 0, ease: 'easeInOut' }}
      />

      {/* Star sparkle points for done state */}
      {status === 'done' && (
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {[0, 45, 90, 135].map((angle) => (
            <motion.line
              key={angle}
              x1={0} y1={-13}
              x2={0} y2={-17}
              stroke={colors.core}
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{ transformOrigin: '0 0', transform: `rotate(${angle}deg)` }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </motion.g>
      )}

      {/* Agent name label */}
      <text
        y={28}
        textAnchor="middle"
        fill="#e8f0fe"
        fontSize={11}
        fontFamily="'Segoe UI', sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {agent?.name || ''}
      </text>

      {/* Stage badge */}
      <text
        y={40}
        textAnchor="middle"
        fill="#4a6fa5"
        fontSize={9}
        fontFamily="'Segoe UI', sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        Stage {agent?.stage}
      </text>
    </g>
  )
}
