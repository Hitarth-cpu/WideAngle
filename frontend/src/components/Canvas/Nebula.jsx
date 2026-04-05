import { motion } from 'framer-motion'

// Deep-space background with atmospheric depth layers
export default function Nebula() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
      background: '#010108',   // true deep space black with just a hint of blue
    }}>
      {/* Deep space base — radial darkening toward edges */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 120% 120% at 50% 50%, #0a0818 0%, #04030c 55%, #010108 100%)',
      }} />

      {/* Milky Way band — faint diagonal warm cloud */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(118deg, transparent 20%, rgba(255,220,150,0.018) 45%, rgba(255,200,120,0.03) 55%, transparent 78%)',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Central warm glow — nucleus of the constellation zone */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 48%, rgba(255,200,100,0.028) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.04, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Left-side cool dust cloud */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 35% 50% at 18% 60%, rgba(120,140,255,0.018) 0%, transparent 60%)',
        }}
        animate={{ opacity: [0.4, 0.85, 0.4] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Right-side warm amber cloud */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 30% 40% at 82% 35%, rgba(255,160,60,0.018) 0%, transparent 55%)',
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
      />

      {/* Edge vignette — makes center feel like a window into deep space */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
