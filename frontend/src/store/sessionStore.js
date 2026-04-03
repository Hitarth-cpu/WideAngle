import { create } from 'zustand'

const useSessionStore = create((set, get) => ({
  // Session
  session: null,
  mode: 'startup', // 'startup' | 'code_review'

  // DAG + agents
  agents: [],      // [{ id, name, persona, role, stage, status, output, dependencies }]
  dag: null,

  // Final report
  report: null,
  sessionStatus: 'idle', // 'idle' | 'running' | 'done' | 'error'

  // Chat
  activeChat: null,       // agent name string
  chatHistories: {},      // { agentName: [{role, content}] }

  // Actions
  setMode: (mode) => set({ mode }),

  setSession: (session) => set({ session, sessionStatus: 'running' }),

  setPlanReady: (agents, dag) => set({ agents, dag }),

  updateAgent: (agentId, updates) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, ...updates } : a
    ),
  })),

  appendAgentToken: (agentId, token) => set((state) => ({
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, output: (a.output || '') + token } : a
    ),
  })),

  setReport: (report) => set({ report, sessionStatus: 'done' }),

  setSessionError: (error) => set({ sessionStatus: 'error', error }),

  openChat: (agentName) => set({ activeChat: agentName }),

  closeChat: () => set({ activeChat: null }),

  appendChatMessage: (agentName, role, content) => set((state) => ({
    chatHistories: {
      ...state.chatHistories,
      [agentName]: [
        ...(state.chatHistories[agentName] || []),
        { role, content },
      ],
    },
  })),

  reset: () => set({
    session: null, agents: [], dag: null, report: null,
    sessionStatus: 'idle', activeChat: null, chatHistories: {},
  }),
}))

export default useSessionStore
