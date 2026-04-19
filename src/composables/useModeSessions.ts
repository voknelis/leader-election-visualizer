import { watch } from 'vue'
import type { EngineSnapshot } from '../engine/RaftEngine'
import type { RaftEvent } from '../types/simulation'
import type { NodeId } from '../types/raft'
import type { AppMode } from '../stores/uiStore'
import { useUiStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSimulationStore } from '../stores/simulationStore'
import { useStepStore } from '../stores/stepStore'
import type { useSimulation } from './useSimulation'
import type { useScenarioRunner } from './useScenarioRunner'

type SettingsSnapshot = {
  nodeCount: number
  speedMultiplier: number
  messageDelayMin: number
  messageDelayMax: number
  messageLossProbability: number
  electionTimeoutMin: number
  electionTimeoutMax: number
  heartbeatInterval: number
}

type ModeSession = {
  engine: EngineSnapshot
  isPaused: boolean
  highlightedNodes: NodeId[]
  selectedNodeId: NodeId | null
  eventHistory: RaftEvent[]
  settings: SettingsSnapshot
}

export function useModeSessions(
  sim: ReturnType<typeof useSimulation>,
  runner: ReturnType<typeof useScenarioRunner>,
) {
  const ui = useUiStore()
  const settings = useSettingsStore()
  const simStore = useSimulationStore()
  const stepStore = useStepStore()

  const sessions = new Map<AppMode, ModeSession>()

  function captureSettings(): SettingsSnapshot {
    return {
      nodeCount: settings.nodeCount,
      speedMultiplier: settings.speedMultiplier,
      messageDelayMin: settings.messageDelayMin,
      messageDelayMax: settings.messageDelayMax,
      messageLossProbability: settings.messageLossProbability,
      electionTimeoutMin: settings.electionTimeoutMin,
      electionTimeoutMax: settings.electionTimeoutMax,
      heartbeatInterval: settings.heartbeatInterval,
    }
  }

  function applySettings(s: SettingsSnapshot) {
    settings.nodeCount = s.nodeCount
    settings.speedMultiplier = s.speedMultiplier
    settings.messageDelayMin = s.messageDelayMin
    settings.messageDelayMax = s.messageDelayMax
    settings.messageLossProbability = s.messageLossProbability
    settings.electionTimeoutMin = s.electionTimeoutMin
    settings.electionTimeoutMax = s.electionTimeoutMax
    settings.heartbeatInterval = s.heartbeatInterval
  }

  function save(mode: AppMode) {
    sessions.set(mode, {
      engine: sim.engine.value.saveSnapshot(),
      isPaused: ui.isPaused,
      highlightedNodes: [...ui.highlightedNodes],
      selectedNodeId: ui.selectedNodeId,
      eventHistory: [...simStore.eventHistory],
      settings: captureSettings(),
    })
  }

  function restore(mode: AppMode): boolean {
    const s = sessions.get(mode)
    if (!s) return false
    applySettings(s.settings)
    sim.engine.value.restoreSnapshot(s.engine)
    simStore.eventHistory = s.eventHistory
    sim.syncSnapshot()
    ui.isPaused = s.isPaused
    ui.highlightedNodes = s.highlightedNodes
    ui.selectNode(s.selectedNodeId)
    return true
  }

  function initializeFresh(mode: AppMode) {
    if (mode === 'step-by-step') {
      ui.isPaused = true
      ui.highlightedNodes = []
      stepStore.autoRunTicksRemaining = 0
    }
    // Demo first entry: engine already initialized at app boot, nothing to do.
  }

  // Swap sessions on mode change.
  watch(
    () => ui.mode,
    (newMode, oldMode) => {
      if (!oldMode || newMode === oldMode) return
      if (oldMode === 'step-by-step') {
        runner.cancelAllTimers()
        stepStore.autoRunTicksRemaining = 0
      }
      save(oldMode)
      if (!restore(newMode)) initializeFresh(newMode)
    },
  )

  return { save, restore, sessions }
}
