import { motion } from 'framer-motion'

export default function ConstellationLine({ x1, y1, x2, y2, active = false }) {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

  return (
    <motion.line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={active ? '#7eb8f7' : '#2a4a8a'}
      strokeWidth={active ? 1.5 : 1}
      strokeLinecap="round"
      strokeDasharray={length}
      initial={{ strokeDashoffset: length, opacity: 0 }}
      animate={{ strokeDashoffset: 0, opacity: active ? 0.7 : 0.3 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
      style={{ filter: active ? 'drop-shadow(0 0 4px rgba(126,184,247,0.4))' : 'none' }}
    />
  )
}
