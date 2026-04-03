import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StarNode from './StarNode'
import ConstellationLine from './ConstellationLine'
import Nebula from './Nebula'
import useSessionStore from '../../store/sessionStore'

// Layout agents in a DAG grid by stage
function layoutAgents(agents) {
  if (!agents?.length) return {}

  const stages = {}
  agents.forEach((a) => {
    if (!stages[a.stage]) stages[a.stage] = []
    stages[a.stage].push(a)
  })

  const positions = {}
  const stageNums = Object.keys(stages).map(Number).sort((a, b) => a - b)
  const canvasW = 900
  const canvasH = 500
  const stageSpacingX = canvasW / (stageNums.length + 1)

  stageNums.forEach((stageNum, si) => {
    const agentsInStage = stages[stageNum]
    const stageX = stageSpacingX * (si + 1)
    const spacingY = canvasH / (agentsInStage.length + 1)
    agentsInStage.forEach((agent, ai) => {
      positions[agent.id || agent.name] = {
        x: stageX,
        y: spacingY * (ai + 1),
      }
    })
  })

  return positions
}

export default function SpaceCanvas({ onAgentClick }) {
  const { agents, report } = useSessionStore()
  const [hoveredAgent, setHoveredAgent] = useState(null)
  const svgRef = useRef(null)

  const positions = layoutAgents(agents)

  // Build dependency edges
  const edges = []
  agents.forEach((agent) => {
    const targetPos = positions[agent.id || agent.name]
    if (!targetPos) return
    ;(agent.dependencies || []).forEach((depName) => {
      const depAgent = agents.find((a) => a.name === depName)
      if (!depAgent) return
      const srcPos = positions[depAgent.id || depAgent.name]
      if (srcPos) {
        edges.push({
          key: `${depName}->${agent.name}`,
          x1: srcPos.x, y1: srcPos.y,
          x2: targetPos.x, y2: targetPos.y,
          active: depAgent.status === 'done',
        })
      }
    })
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Nebula />

      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 900 500"
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', height: '100%',
        }}
      >
        {/* Constellation lines */}
        {edges.map((edge) => (
          <ConstellationLine key={edge.key} {...edge} />
        ))}

        {/* Agent stars */}
        <AnimatePresence>
          {agents.map((agent) => {
            const pos = positions[agent.id || agent.name]
            if (!pos) return null
            return (
              <motion.g
                key={agent.id || agent.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 120, delay: agent.stage * 0.1 }}
              >
                <StarNode
                  agent={agent}
                  x={pos.x}
                  y={pos.y}
                  onHover={setHoveredAgent}
                  onClick={onAgentClick}
                />
              </motion.g>
            )
          })}
        </AnimatePresence>

        {/* Meta supernova — only show when report is ready */}
        <AnimatePresence>
          {report && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 80, delay: 0.3 }}
            >
              {/* Supernova burst rings */}
              {[40, 60, 80].map((r, i) => (
                <motion.circle
                  key={r}
                  cx={450} cy={250} r={r}
                  fill="none"
                  stroke="#ff9d00"
                  strokeWidth={1}
                  initial={{ opacity: 0.8, r: 20 }}
                  animate={{ opacity: 0, r }}
                  transition={{ duration: 1.5, delay: i * 0.2, ease: 'easeOut' }}
                />
              ))}
              <motion.circle
                cx={450} cy={250} r={14}
                fill="#ff9d00"
                style={{ filter: 'drop-shadow(0 0 20px rgba(255,157,0,0.8))' }}
                animate={{ r: [14, 17, 14], opacity: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <text x={450} y={275} textAnchor="middle" fill="#ff9d00" fontSize={11} fontFamily="'Segoe UI', sans-serif">
                Final Report
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {hoveredAgent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(13,27,75,0.85)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(74,111,165,0.3)', borderRadius: 12,
              padding: '12px 20px', color: '#e8f0fe', zIndex: 10,
              maxWidth: 360, pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{hoveredAgent.name}</div>
            <div style={{ fontSize: 12, color: '#4a6fa5', marginBottom: 6 }}>Stage {hoveredAgent.stage}</div>
            {hoveredAgent.output && (
              <div style={{ fontSize: 12, color: '#7eb8f7', maxHeight: 80, overflow: 'hidden' }}>
                {hoveredAgent.output.slice(0, 200)}…
              </div>
            )}
            <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 6 }}>Click to chat →</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
