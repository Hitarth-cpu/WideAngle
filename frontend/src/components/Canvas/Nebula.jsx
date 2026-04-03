import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// Generate static ambient star positions once
const AMBIENT_STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 1.5 + 0.5,
  opacity: Math.random() * 0.5 + 0.1,
  delay: Math.random() * 4,
}))

export default function Nebula() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
        background: 'radial-gradient(ellipse at 20% 40%, #1a0533 0%, #040812 45%, #0d1b4b 100%)',
      }}
    >
      {/* Animated nebula overlay */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.08) 0%, transparent 60%)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 10% 80%, rgba(13,27,75,0.6) 0%, transparent 50%)',
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Ambient parallax stars */}
      {AMBIENT_STARS.map((star) => (
        <motion.div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#7eb8f7',
            opacity: star.opacity,
          }}
          animate={{ opacity: [star.opacity, star.opacity * 2, star.opacity] }}
          transition={{ duration: 2 + star.delay, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
        />
      ))}
    </div>
  )
}
