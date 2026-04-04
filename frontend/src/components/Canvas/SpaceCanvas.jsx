import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StarNode from './StarNode'
import ConstellationLine from './ConstellationLine'
import Nebula from './Nebula'
import useSessionStore from '../../store/sessionStore'

// ─── Deterministic RNG (stable across re-renders) ────────────────────────────
function rng(seed) {
  let s = (seed ^ 0x9e3779b9) >>> 0
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0
  return ((s ^ (s >>> 16)) >>> 0) / 0x100000000
}

// String → deterministic 0–1 float (for per-agent float timing)
function hashFloat(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0
  return h / 0xffffffff
}

// ─── Photorealistic star color palette ───────────────────────────────────────
const STAR_COLORS = [
  '#ffffff', '#fff8f0', '#fff5e4', '#fffaf5',   // warm white
  '#ffefc8', '#ffd580', '#ffc860',              // golden
  '#ffe0b0', '#ffcc80',                         // amber
  '#f0f8ff', '#e8f4ff',                         // faint blue-white
]
function pickColor(seed) {
  const t = rng(seed * 7919 + 1234)
  if (t < 0.55) return STAR_COLORS[Math.floor(rng(seed) * 4)]
  if (t < 0.80) return STAR_COLORS[4 + Math.floor(rng(seed * 3) * 3)]
  if (t < 0.93) return STAR_COLORS[7 + Math.floor(rng(seed * 5) * 2)]
  return STAR_COLORS[9 + Math.floor(rng(seed * 11) * 2)]
}

// ─── Ambient starfield: 3 depth layers for parallax ─────────────────────────
const NUM_AMBIENT = 550
const AMBIENT_STARS = Array.from({ length: NUM_AMBIENT }, (_, i) => {
  const x = rng(i * 1664525 + 1013904223)
  const y = rng(i * 22695477 + 1)
  const sizeSeed = rng(i * 6364136 + 1442695040)
  const rawR = sizeSeed < 0.70 ? 0.2 + sizeSeed * 0.5
             : sizeSeed < 0.92 ? 0.5 + rng(i * 999) * 0.7
             : 1.2 + rng(i * 777) * 1.0
  const r = Math.max(0.15, rawR)
  const opacity = 0.2 + rng(i * 3333) * 0.6
  // Parallax layer: 0=far(slow), 1=mid, 2=near(fast)
  const layer = i < 300 ? 0 : i < 480 ? 1 : 2
  return {
    id: i, layer,
    xPct: x, yPct: y, r, opacity,
    color: pickColor(i),
    blinkDur: 4 + rng(i * 4567) * 10,
    blinkDelay: rng(i * 8765) * 8,
  }
})
const STAR_LAYERS = [
  AMBIENT_STARS.filter(s => s.layer === 0),
  AMBIENT_STARS.filter(s => s.layer === 1),
  AMBIENT_STARS.filter(s => s.layer === 2),
]

// ─── Layout helpers ──────────────────────────────────────────────────────────
// Uses actual screen dimensions — no viewBox scaling, no cropping, no scrollbars

function useScreenSize() {
  const [size, setSize] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  })
  useEffect(() => {
    function onResize() { setSize({ w: window.innerWidth, h: window.innerHeight }) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

// Deterministic jitter per agent name — breaks grid look into organic constellation
function agentJitter(name, rangeX, rangeY) {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0
  const h2 = Math.imul(h ^ 0xdeadbeef, 0x45d9f3b) >>> 0
  const jx = ((h  & 0xffff) / 0xffff - 0.5) * rangeX
  const jy = ((h2 & 0xffff) / 0xffff - 0.5) * rangeY
  return { jx, jy }
}

function layoutAgents(agents, vbW, vbH) {
  if (!agents?.length) return {}
  const padX = vbW * 0.13
  const padY = vbH * 0.16
  const availW = vbW - padX * 2
  const availH = vbH - padY * 2

  const stages = {}
  agents.forEach((a) => { const s = a.stage ?? 1; if (!stages[s]) stages[s] = []; stages[s].push(a) })
  const positions = {}
  const stageNums = Object.keys(stages).map(Number).sort((a, b) => a - b)
  const maxPerStage = Math.max(...Object.values(stages).map(v => v.length))

  const spacingX = stageNums.length <= 1 ? 0 : availW / (stageNums.length - 1)
  const spacingY = maxPerStage <= 1 ? 0 : Math.min(availH / (maxPerStage - 1), 130)

  // Jitter budget: up to 35% of stage spacing so stars never swap columns
  const jitterX = Math.min(spacingX * 0.35, 80)
  const jitterY = spacingY * 0.55

  stageNums.forEach((stageNum, si) => {
    const arr = stages[stageNum]
    const baseX = stageNums.length === 1 ? vbW / 2 : padX + spacingX * si
    const totalH = (arr.length - 1) * spacingY
    const startY = vbH / 2 - totalH / 2

    arr.forEach((agent, ai) => {
      const baseY = arr.length === 1 ? vbH / 2 : startY + spacingY * ai
      const { jx, jy } = agentJitter(agent.name || String(ai), jitterX * 2, jitterY * 2)
      // Clamp so no agent goes outside the padded zone
      const x = Math.max(padX, Math.min(vbW - padX, baseX + jx))
      const y = Math.max(padY, Math.min(vbH - padY, baseY + jy))
      positions[agent.id || agent.name] = { x, y }
    })
  })
  return positions
}

// Scatter: stars FLY IN from just outside the screen edges — cinematic entry
function getScatterPos(key, vbW, vbH) {
  const str = String(key)
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0
  const h2 = Math.imul(h ^ 0xdeadbeef, 0x45d9f3b) >>> 0
  const side = h % 4   // 0=top 1=right 2=bottom 3=left
  const t = (h2 & 0xffff) / 0xffff
  const margin = 80
  switch (side) {
    case 0: return { x: t * vbW,          y: -margin }
    case 1: return { x: vbW + margin,      y: t * vbH }
    case 2: return { x: t * vbW,          y: vbH + margin }
    default: return { x: -margin,          y: t * vbH }
  }
}

// ─── Supernova sub-components ────────────────────────────────────────────────
function DiffractionSpike({ angle, length, delay, cx, cy }) {
  const rad = (angle * Math.PI) / 180
  const x2 = cx + Math.cos(rad) * length
  const y2 = cy + Math.sin(rad) * length
  const x1 = cx - Math.cos(rad) * length
  const y1 = cy - Math.sin(rad) * length
  const gradId = `spike-${angle}`
  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="white" stopOpacity="0" />
          <stop offset="45%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="50%"  stopColor="white" stopOpacity="1" />
          <stop offset="55%"  stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.line
        x1={cx} y1={cy} x2={cx} y2={cy}
        stroke={`url(#${gradId})`} strokeWidth={2.5} strokeLinecap="round"
        initial={{ x1: cx, y1: cy, x2: cx, y2: cy }}
        animate={{ x1, y1, x2, y2 }}
        transition={{ duration: 0.8, delay, ease: [0.0, 0.0, 0.2, 1] }}
      />
    </g>
  )
}

function NovaEffect({ cx, cy, vbW, vbH }) {
  const beamHalfW = Math.max(vbW, vbH) * 0.85
  return (
    <g>
      <defs>
        <radialGradient id="novaCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="white"    stopOpacity="1" />
          <stop offset="30%"  stopColor="white"    stopOpacity="0.95" />
          <stop offset="60%"  stopColor="#fff5e0"  stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffd580"  stopOpacity="0" />
        </radialGradient>
        <radialGradient id="novaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="white"   stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffcc80" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hBeam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="white" stopOpacity="0" />
          <stop offset="35%"  stopColor="white" stopOpacity="0.55" />
          <stop offset="50%"  stopColor="white" stopOpacity="0.95" />
          <stop offset="65%"  stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[50, 110, 190, 280, 380].map((maxR, i) => (
        <motion.circle key={`ring-${i}`}
          cx={cx} cy={cy} fill="none"
          stroke={i < 2 ? '#ffffff' : i < 4 ? '#ffe8a0' : '#ffcc60'}
          strokeWidth={i === 0 ? 2.5 : 1.5}
          initial={{ r: 4, opacity: 1 }}
          animate={{ r: maxR, opacity: 0 }}
          transition={{ duration: 2.2, delay: i * 0.16, ease: [0.1, 0.0, 0.6, 1] }}
        />
      ))}

      <motion.circle cx={cx} cy={cy} fill="url(#novaGlow)"
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: [0, vbH * 0.7, vbH * 0.55], opacity: [0, 0.35, 0.22] }}
        transition={{ duration: 2.5, delay: 0.1, ease: 'easeOut' }}
      />
      <motion.rect
        x={cx - beamHalfW} y={cy - 35} width={beamHalfW * 2} height={70}
        fill="url(#hBeam)"
        initial={{ opacity: 0, scaleX: 0.1 }}
        animate={{ opacity: [0, 0.9, 0.7, 0.5], scaleX: 1 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        transition={{ duration: 1.0, delay: 0.25, ease: [0.0, 0.0, 0.3, 1] }}
      />
      <motion.rect
        x={cx - beamHalfW} y={cy - 8} width={beamHalfW * 2} height={16}
        fill="url(#hBeam)"
        initial={{ opacity: 0, scaleX: 0.05 }}
        animate={{ opacity: [0, 1, 0.85], scaleX: 1 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
      />
      {[0, 90, 45, 135].map((angle, i) => (
        <DiffractionSpike key={angle} angle={angle} cx={cx} cy={cy}
          length={i < 2 ? vbH * 0.52 : vbH * 0.34}
          delay={0.35 + i * 0.06}
        />
      ))}
      <motion.circle cx={cx} cy={cy} fill="url(#novaCore)"
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: [0, 80, 60], opacity: [0, 1, 0.92] }}
        transition={{ duration: 0.65, delay: 0.2, ease: [0.0, 0.0, 0.3, 1] }}
      />
      <motion.circle cx={cx} cy={cy} fill="white"
        initial={{ r: 0 }}
        animate={{ r: [0, 28, 22] }}
        transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
      />
      <motion.circle cx={cx} cy={cy} r={14} fill="white"
        style={{ filter: 'drop-shadow(0 0 40px white) drop-shadow(0 0 80px rgba(255,220,150,0.8))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, r: [14, 18, 14] }}
        transition={{
          opacity: { duration: 0.3, delay: 0.6 },
          r: { duration: 3, delay: 0.8, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
      <motion.text x={cx} y={cy + 48} textAnchor="middle"
        fill="#ffe8a0" fontSize={13}
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontWeight="700" letterSpacing="0.12em"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
      >FINAL REPORT</motion.text>
      <motion.text x={cx} y={cy + 65} textAnchor="middle"
        fill="rgba(255,220,140,0.55)" fontSize={9.5}
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.45, 0.8] }}
        transition={{ delay: 1.6, duration: 2.8, repeat: Infinity }}
      >click to view</motion.text>
    </g>
  )
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────
// Parallax multipliers per layer (far=slow, near=faster)
const PARALLAX = [0.006, 0.014, 0.028]

export default function SpaceCanvas({ onAgentClick, selectedAgentId }) {
  const { agents, sessionStatus, setSupernovaReady } = useSessionStore()
  const [hoveredAgent, setHoveredAgent] = useState(null)
  const [isConverging, setIsConverging] = useState(false)
  const [showSupernova, setShowSupernova] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const screen = useScreenSize()

  // Mouse parallax
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMouse({
      x: (e.clientX - rect.width  / 2) / rect.width,
      y: (e.clientY - rect.height / 2) / rect.height,
    })
  }, [])

  // Convergence → supernova state machine
  useEffect(() => {
    if (sessionStatus !== 'done') return
    const t1 = setTimeout(() => setIsConverging(true), 400)
    const t2 = setTimeout(() => setShowSupernova(true), 1300)
    const t3 = setTimeout(() => setSupernovaReady(true), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [sessionStatus, setSupernovaReady])

  // SVG viewBox = exact screen size: 1px SVG unit = 1 screen pixel, no scaling/cropping
  const vbW = screen.w
  const vbH = screen.h
  const centerX = vbW / 2
  const centerY = vbH / 2
  const positions = useMemo(() => layoutAgents(agents, vbW, vbH), [agents, vbW, vbH])

  // Constellation aura: soft glow centered on the agent cluster
  const aura = useMemo(() => {
    const pts = Object.values(positions)
    if (pts.length < 1) return null
    const xs = pts.map(p => p.x)
    const ys = pts.map(p => p.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 160
    const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 130
    return { cx, cy, rx, ry }
  }, [positions])

  const edges = useMemo(() => {
    const result = []
    agents.forEach((agent) => {
      const targetPos = positions[agent.id || agent.name]
      if (!targetPos) return
      ;(agent.dependencies || []).forEach((depName) => {
        const depAgent = agents.find((a) => a.name === depName)
        if (!depAgent) return
        const srcPos = positions[depAgent.id || depAgent.name]
        if (srcPos) result.push({
          key: `${depName}->${agent.name}`,
          x1: srcPos.x, y1: srcPos.y,
          x2: targetPos.x, y2: targetPos.y,
          active: depAgent.status === 'done',
        })
      })
    })
    return result
  }, [agents, positions])

  return (
    <div
      style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
    >
      <Nebula />

      {/* Full-screen white flash on supernova */}
      <AnimatePresence>
        {showSupernova && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 0] }}
            transition={{ duration: 1.2, times: [0, 0.15, 0.5, 1], ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, zIndex: 3,
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,240,180,0.6) 40%, transparent 75%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Unified SVG — ambient field + agent stars in same coordinate space */}
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1, width: '100%', height: '100%', overflow: 'hidden' }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ffcc60" stopOpacity="0.25" />
            <stop offset="50%"  stopColor="#fff0a0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffcc60" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="lineGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ffdd80" stopOpacity="0.5" />
            <stop offset="50%"  stopColor="#ffffff" stopOpacity="1.0" />
            <stop offset="100%" stopColor="#ffdd80" stopOpacity="0.5" />
          </linearGradient>
          {/* Constellation aura gradient */}
          <radialGradient id="auraGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffe8a0" stopOpacity="0.06" />
            <stop offset="50%"  stopColor="#ffcc60" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0" />
          </radialGradient>
          {/* Depth vignette — darkens edges so stars feel like they're in infinite space */}
          <radialGradient id="vigGrad" cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="black" stopOpacity="0" />
            <stop offset="70%"  stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        {/* ── Parallax ambient starfield (3 depth layers) ── */}
        {STAR_LAYERS.map((layer, li) => {
          const px = mouse.x * PARALLAX[li] * vbW
          const py = mouse.y * PARALLAX[li] * vbH
          return (
            <g key={`layer-${li}`} transform={`translate(${px}, ${py})`}>
              {layer.map((s) => {
                const cx = s.xPct * vbW
                const cy = s.yPct * vbH
                return (
                  <motion.circle
                    key={s.id}
                    cx={cx} cy={cy} r={s.r}
                    fill={s.color}
                    opacity={s.opacity}
                    animate={{ opacity: [s.opacity, Math.min(s.opacity * 2.0, 1), s.opacity] }}
                    transition={{
                      duration: s.blinkDur,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: s.blinkDelay,
                    }}
                  />
                )
              })}
            </g>
          )
        })}

        {/* ── Depth vignette overlay ── */}
        <rect x={0} y={0} width={vbW} height={vbH} fill="url(#vigGrad)" style={{ pointerEvents: 'none' }} />

        {/* ── Constellation aura — soft nebula glow around agent cluster ── */}
        {aura && !isConverging && (
          <motion.ellipse
            cx={aura.cx} cy={aura.cy}
            rx={aura.rx} ry={aura.ry}
            fill="url(#auraGrad)"
            style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ── Constellation lines ── */}
        {edges.map((edge) => (
          <ConstellationLine key={edge.key} {...edge} isConverging={isConverging} />
        ))}

        {/* ── Agent stars ── */}
        <AnimatePresence>
          {agents.map((agent) => {
            const dagPos = positions[agent.id || agent.name]
            if (!dagPos) return null
            const scatter = getScatterPos(agent.id || agent.name, vbW, vbH)
            return (
              <motion.g
                key={agent.id || agent.name}
                initial={{
                  x: scatter.x - dagPos.x,
                  y: scatter.y - dagPos.y,
                  opacity: 0,
                  scale: 0.2,
                }}
                animate={{
                  x: isConverging ? centerX - dagPos.x : 0,
                  y: isConverging ? centerY - dagPos.y : 0,
                  opacity: isConverging ? 0 : 1,
                  scale: isConverging ? 0 : 1,
                }}
                transition={isConverging
                  ? { duration: 0.85, ease: [0.5, 0, 1, 0.8] }
                  : {
                      x: { type: 'spring', stiffness: 42, damping: 11, delay: (agent.stage ?? 1) * 0.2 + 0.15 },
                      y: { type: 'spring', stiffness: 42, damping: 11, delay: (agent.stage ?? 1) * 0.2 + 0.15 },
                      opacity: { duration: 0.8, delay: (agent.stage ?? 1) * 0.2 + 0.05 },
                      scale: { type: 'spring', stiffness: 55, damping: 12, delay: (agent.stage ?? 1) * 0.2 },
                    }
                }
              >
                <StarNode
                  agent={agent}
                  x={dagPos.x}
                  y={dagPos.y}
                  isSelected={(agent.id || agent.name) === selectedAgentId}
                  isConverging={isConverging}
                  onHover={setHoveredAgent}
                  onClick={onAgentClick}
                />
              </motion.g>
            )
          })}
        </AnimatePresence>

        {/* ── Supernova ── */}
        <AnimatePresence>
          {showSupernova && (
            <NovaEffect key="nova" cx={centerX} cy={centerY} vbW={vbW} vbH={vbH} />
          )}
        </AnimatePresence>
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredAgent && !isConverging && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(6,5,12,0.93)', backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,210,100,0.25)', borderRadius: 12,
              padding: '10px 18px', color: '#f0e6cc', zIndex: 10,
              maxWidth: 360, pointerEvents: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12, color: '#fff8e8', marginBottom: 1 }}>
              {hoveredAgent.name}
            </div>
            <div style={{ fontSize: 10, color: '#c8a870' }}>
              Stage {hoveredAgent.stage} · {hoveredAgent.status}
            </div>
            <div style={{ fontSize: 9, color: '#6a5840', marginTop: 4 }}>Click to open</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
