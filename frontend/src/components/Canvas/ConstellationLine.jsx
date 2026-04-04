import { motion } from 'framer-motion'

// Curved bezier path — looks like a real constellation, not a grid diagram
function curvedPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  // Perpendicular offset: 10% of length, max 35px — gives organic curve
  const offset = Math.min(len * 0.10, 35)
  const px = (-dy / len) * offset
  const py = (dx / len) * offset
  return `M ${x1} ${y1} Q ${mx + px} ${my + py} ${x2} ${y2}`
}

export default function ConstellationLine({ x1, y1, x2, y2, active = false, isConverging = false }) {
  const d = curvedPath(x1, y1, x2, y2)

  return (
    <motion.path
      d={d}
      stroke={active ? 'rgba(255,240,180,0.85)' : 'rgba(255,210,120,0.38)'}
      strokeWidth={active ? 1.4 : 0.7}
      fill="none"
      strokeLinecap="round"
      style={{
        filter: active && !isConverging
          ? 'drop-shadow(0 0 2px rgba(255,230,140,0.5))'
          : 'none',
        pointerEvents: 'none',
      }}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{
        pathLength: 1,
        opacity: isConverging ? 0 : (active ? 0.9 : 0.45),
      }}
      transition={{
        pathLength: { duration: 1.6, ease: [0.4, 0, 0.2, 1] },
        opacity: isConverging
          ? { duration: 0.25 }
          : { duration: 0.5, delay: 0.3 },
      }}
    />
  )
}
