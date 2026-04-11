import { ref, watch, onUnmounted } from 'vue'
import { RaftEngine } from '../engine/RaftEngine'
import type { EngineSnapshot } from '../engine/RaftEngine'
import { useSimulationStore } from '../stores/simulationStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useUiStore } from '../stores/uiStore'
import { useStepStore } from '../stores/stepStore'

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

  /** Snapshots saved at each step boundary for Prev navigation */
  const stepSnapshots = ref<Map<number, EngineSnapshot>>(new Map())

  let animFrameId: number | null = null
  let lastTime = 0
  let tickAccumulator = 0

  function loop(now: number) {
    animFrameId = requestAnimationFrame(loop)

    if (ui.isPaused) {
      lastTime = now
      return
    }

    const delta = Math.min(now - lastTime, 200) // cap to avoid spiral
    lastTime = now

    const msPerTick = settings.msPerTick / settings.speedMultiplier
    tickAccumulator += delta

    let ticksThisFrame = 0
    const maxTicksPerFrame = 20

    while (tickAccumulator >= msPerTick && ticksThisFrame < maxTicksPerFrame) {
      tickAccumulator -= msPerTick
      ticksThisFrame++

      const snapshot = engine.value.tick()
      simStore.updateFromSnapshot(snapshot)

      // Step-by-step mode: handle autoRunTicks countdown
      if (ui.mode === 'step-by-step' && stepStore.autoRunTicksRemaining > 0) {
        const done = stepStore.decrementAutoRunTicks()
        if (done) {
          ui.isPaused = true
        }
      }
    }
  }

  function start() {
    lastTime = performance.now()
    tickAccumulator = 0
    animFrameId = requestAnimationFrame(loop)
  }

  function stop() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  /** Manually tick N times (for step-by-step) */
  function tickN(n: number) {
    for (let i = 0; i < n; i++) {
      const snapshot = engine.value.tick()
      simStore.updateFromSnapshot(snapshot)
    }
  }

  /** Tick once */
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
    stepSnapshots.value.set(stepIndex, engine.value.saveSnapshot())
  }

  function restoreStepSnapshot(stepIndex: number): boolean {
    const snap = stepSnapshots.value.get(stepIndex)
    if (snap) {
      engine.value.restoreSnapshot(snap)
      syncSnapshot()
      return true
    }
    return false
  }

  function syncSnapshot() {
    simStore.updateFromSnapshot(engine.value.getSnapshot())
  }

  // Watch settings changes and propagate to engine
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

  onUnmounted(() => stop())

  // Initial snapshot
  syncSnapshot()

  return {
    engine,
    start,
    stop,
    tickOnce,
    tickN,
    addNode,
    removeNode,
    crashNode,
    restoreNode,
    setPartition,
    clearPartition,
    reset,
    saveStepSnapshot,
    restoreStepSnapshot,
  }
}
