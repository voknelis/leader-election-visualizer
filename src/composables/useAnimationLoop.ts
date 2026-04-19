import { onUnmounted, type Ref } from 'vue'
import type { RaftEngine } from '../engine/RaftEngine'
import type { useSimulationStore } from '../stores/simulationStore'
import type { useSettingsStore } from '../stores/settingsStore'
import type { useUiStore } from '../stores/uiStore'
import type { useStepStore } from '../stores/stepStore'

const MAX_DELTA_MS = 200
const MAX_TICKS_PER_FRAME = 20

export function useAnimationLoop(
  engine: Ref<RaftEngine>,
  simStore: ReturnType<typeof useSimulationStore>,
  settings: ReturnType<typeof useSettingsStore>,
  ui: ReturnType<typeof useUiStore>,
  stepStore: ReturnType<typeof useStepStore>,
) {
  let animFrameId: number | null = null
  let lastTime = 0
  let tickAccumulator = 0
  let manualTickStart: number | null = null
  let manualTickOnComplete: (() => void) | null = null

  function loop(now: number) {
    animFrameId = requestAnimationFrame(loop)

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

    const delta = Math.min(now - lastTime, MAX_DELTA_MS)
    lastTime = now

    const msPerTick = settings.msPerTick / settings.speedMultiplier
    tickAccumulator += delta

    let ticksThisFrame = 0

    while (tickAccumulator >= msPerTick && ticksThisFrame < MAX_TICKS_PER_FRAME) {
      tickAccumulator -= msPerTick
      ticksThisFrame++

      const snapshot = engine.value.tick()
      simStore.updateFromSnapshot(snapshot)

      if (ui.mode === 'step-by-step' && stepStore.autoRunTicksRemaining > 0) {
        const done = stepStore.decrementAutoRunTicks()
        if (done) {
          ui.isPaused = true
        }
      }
    }

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

  onUnmounted(() => stop())

  return { start, stop, playOneTick, cancelManualTick }
}
