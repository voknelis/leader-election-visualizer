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
  const stepSnapshots = ref<Map<number, { snap: EngineSnapshot; historyLength: number }>>(new Map())

  let animFrameId: number | null = null
  let lastTime = 0
  let tickAccumulator = 0
  /** When set, a single manual tick is animating; rAF interpolates frameFraction and fires the tick at completion. */
  let manualTickStart: number | null = null
  let manualTickOnComplete: (() => void) | null = null

  function loop(now: number) {
    animFrameId = requestAnimationFrame(loop)

    // Manual single-tick animation takes priority over normal pause/auto-tick logic
    if (manualTickStart !== null) {
      const animMs = settings.msPerTick / Math.max(settings.speedMultiplier, 0.0001)
      const elapsed = now - manualTickStart
      if (elapsed >= animMs) {
        const snapshot = engine.value.tick()
        simStore.updateFromSnapshot(snapshot)
        if (ui.mode === 'step-by-step' && stepStore.autoRunTicksRemaining > 0) {
          stepStore.decrementAutoRunTicks()
        }
        simStore.frameFraction = 0
        manualTickStart = null
        const cb = manualTickOnComplete
        manualTickOnComplete = null
        cb?.()
      } else {
        simStore.frameFraction = animMs > 0 ? Math.min(elapsed / animMs, 1) : 0
      }
      lastTime = now
      tickAccumulator = 0
      return
    }

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

    // Always update frame fraction for smooth interpolation (every rAF frame)
    simStore.frameFraction = msPerTick > 0 ? Math.min(tickAccumulator / msPerTick, 1) : 0
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

  /** Tick once (instant — no animation) */
  function tickOnce() {
    tickN(1)
  }

  /** Animate one tick over msPerTick / speed ms; calls onComplete after the tick fires. Cancels any prior pending manual tick. */
  function playOneTick(onComplete?: () => void): boolean {
    if (manualTickStart !== null) return false
    manualTickStart = performance.now()
    manualTickOnComplete = onComplete ?? null
    return true
  }

  function cancelManualTick() {
    manualTickStart = null
    manualTickOnComplete = null
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
