import { ref, watch } from 'vue'
import { RaftEngine } from '../engine/RaftEngine'
import type { EngineSnapshot } from '../engine/RaftEngine'
import { useSimulationStore } from '../stores/simulationStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useUiStore } from '../stores/uiStore'
import { useStepStore } from '../stores/stepStore'
import { useAnimationLoop } from './useAnimationLoop'

export function useSimulation() {
  const simStore = useSimulationStore()
  const settings = useSettingsStore()
  const ui = useUiStore()
  const stepStore = useStepStore()

  const engine = ref<RaftEngine>(new RaftEngine({
    nodeCount: settings.nodeCount,
    electionTimeoutMin: settings.electionTimeoutMin,
    electionTimeoutMax: settings.electionTimeoutMax,
    heartbeatInterval: settings.heartbeatInterval,
    messageDelayMin: settings.messageDelayMin,
    messageDelayMax: settings.messageDelayMax,
    messageLossProbability: settings.messageLossProbability,
  }))

  const stepSnapshots = ref<Map<number, { snap: EngineSnapshot; historyLength: number }>>(new Map())

  const { start, stop, playOneTick, cancelManualTick } = useAnimationLoop(
    engine, simStore, settings, ui, stepStore,
  )

  function tickN(n: number) {
    for (let i = 0; i < n; i++) {
      const snapshot = engine.value.tick()
      simStore.updateFromSnapshot(snapshot)
    }
  }

  function tickOnce() {
    tickN(1)
  }

  // --- Engine mutation wrappers ---

  function addNode() {
    const id = engine.value.addNode()
    settings.nodeCount = engine.value.getNodeIds().length
    syncSnapshot()
    return id
  }

  function removeNode(id: string) {
    engine.value.removeNode(id)
    settings.nodeCount = engine.value.getNodeIds().length
    syncSnapshot()
  }

  function crashNode(id: string) {
    engine.value.crashNode(id)
    syncSnapshot()
  }

  function restoreNode(id: string) {
    engine.value.restoreNode(id)
    syncSnapshot()
  }

  function setPartition(groupA: string[], groupB: string[]) {
    engine.value.setPartition(groupA, groupB)
    syncSnapshot()
  }

  function clearPartition() {
    engine.value.clearPartition()
    syncSnapshot()
  }

  function reset(seed?: number) {
    engine.value.reset(seed)
    simStore.clearHistory()
    stepSnapshots.value.clear()
    syncSnapshot()
  }

  function saveStepSnapshot(stepIndex: number) {
    stepSnapshots.value.set(stepIndex, {
      snap: engine.value.saveSnapshot(),
      historyLength: simStore.eventHistory.length,
    })
  }

  function restoreStepSnapshot(stepIndex: number): boolean {
    const entry = stepSnapshots.value.get(stepIndex)
    if (entry) {
      engine.value.restoreSnapshot(entry.snap)
      simStore.truncateHistory(entry.historyLength)
      syncSnapshot()
      return true
    }
    return false
  }

  function syncSnapshot() {
    simStore.updateFromSnapshot(engine.value.getSnapshot())
  }

  watch(
    () => ({
      messageDelayMin: settings.messageDelayMin,
      messageDelayMax: settings.messageDelayMax,
      messageLossProbability: settings.messageLossProbability,
      electionTimeoutMin: settings.electionTimeoutMin,
      electionTimeoutMax: settings.electionTimeoutMax,
      heartbeatInterval: settings.heartbeatInterval,
    }),
    (cfg) => {
      engine.value.updateConfig(cfg)
    },
  )

  syncSnapshot()

  return {
    engine,
    start,
    stop,
    tickOnce,
    tickN,
    playOneTick,
    cancelManualTick,
    addNode,
    removeNode,
    crashNode,
    restoreNode,
    setPartition,
    clearPartition,
    reset,
    saveStepSnapshot,
    restoreStepSnapshot,
    syncSnapshot,
  }
}
