import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { useSimulation } from '../useSimulation'
import { useSimulationStore } from '../../stores/simulationStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUiStore } from '../../stores/uiStore'

/**
 * Drive the rAF loop manually. We capture every requestAnimationFrame callback
 * and feed it controlled `now` timestamps via runFrame().
 */
function makeRafController() {
  let nextId = 1
  let pending: { id: number; cb: FrameRequestCallback } | null = null
  let nowMs = 0

  const raf = vi.fn((cb: FrameRequestCallback) => {
    const id = nextId++
    pending = { id, cb }
    return id
  })
  const caf = vi.fn((id: number) => {
    if (pending?.id === id) pending = null
  })
  const perfNow = vi.fn(() => nowMs)

  return {
    raf,
    caf,
    perfNow,
    setNow: (ms: number) => {
      nowMs = ms
    },
    /** Fire the most recently registered rAF callback with current nowMs. */
    runFrame: () => {
      const p = pending
      if (!p) throw new Error('no pending rAF')
      pending = null
      p.cb(nowMs)
    },
    hasPending: () => pending !== null,
  }
}

describe('useSimulation - playOneTick / cancelManualTick', () => {
  let scope: EffectScope
  let sim: ReturnType<typeof useSimulation>
  let raf: ReturnType<typeof makeRafController>

  beforeEach(() => {
    setActivePinia(createPinia())
    raf = makeRafController()
    vi.stubGlobal('requestAnimationFrame', raf.raf)
    vi.stubGlobal('cancelAnimationFrame', raf.caf)
    vi.stubGlobal('performance', { now: raf.perfNow } as unknown as Performance)

    scope = effectScope()
    scope.run(() => {
      sim = useSimulation()
    })
  })

  afterEach(() => {
    sim.stop()
    scope.stop()
    vi.unstubAllGlobals()
  })

  it('playOneTick returns true and schedules an animated tick', () => {
    raf.setNow(0)
    sim.start()
    raf.runFrame() // initial loop frame, paused (default isPaused=true)

    const cb = vi.fn()
    expect(sim.playOneTick(cb)).toBe(true)
    expect(cb).not.toHaveBeenCalled()
  })

  it('does not advance simStore.tick before the animation window elapses', () => {
    const settings = useSettingsStore()
    const simStore = useSimulationStore()
    settings.msPerTick = 100
    settings.speedMultiplier = 1

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    const startTick = simStore.tick
    sim.playOneTick()

    raf.setNow(50) // halfway
    raf.runFrame()
    expect(simStore.tick).toBe(startTick)
    expect(simStore.frameFraction).toBeCloseTo(0.5, 5)
  })

  it('fires engine tick, clears frameFraction, and invokes callback when window completes', () => {
    const settings = useSettingsStore()
    const simStore = useSimulationStore()
    settings.msPerTick = 100
    settings.speedMultiplier = 1

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    const startTick = simStore.tick
    const cb = vi.fn()
    sim.playOneTick(cb)

    raf.setNow(100) // exactly at the window end
    raf.runFrame()

    expect(simStore.tick).toBe(startTick + 1)
    expect(simStore.frameFraction).toBe(0)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('rejects a second playOneTick while one is in flight', () => {
    raf.setNow(0)
    sim.start()
    raf.runFrame()

    expect(sim.playOneTick()).toBe(true)
    expect(sim.playOneTick()).toBe(false)
  })

  it('accepts a new playOneTick after the previous one completes', () => {
    const settings = useSettingsStore()
    settings.msPerTick = 50
    settings.speedMultiplier = 1

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    sim.playOneTick()
    raf.setNow(50)
    raf.runFrame() // completes first tick

    expect(sim.playOneTick()).toBe(true)
  })

  it('cancelManualTick aborts the in-flight tick: callback never fires, no engine.tick advance', () => {
    const settings = useSettingsStore()
    const simStore = useSimulationStore()
    const ui = useUiStore()
    settings.msPerTick = 100
    settings.speedMultiplier = 1
    ui.isPaused = true // prevent normal-loop ticks from running after cancel

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    const startTick = simStore.tick
    const cb = vi.fn()
    sim.playOneTick(cb)

    raf.setNow(50)
    raf.runFrame() // mid-animation
    sim.cancelManualTick()

    raf.setNow(200) // well past what would have been the firing point
    raf.runFrame()

    expect(simStore.tick).toBe(startTick)
    expect(cb).not.toHaveBeenCalled()
  })

  it('respects speedMultiplier when computing the animation window', () => {
    const settings = useSettingsStore()
    const simStore = useSimulationStore()
    settings.msPerTick = 100
    settings.speedMultiplier = 2 // window = 100/2 = 50ms

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    const startTick = simStore.tick
    sim.playOneTick()

    raf.setNow(50)
    raf.runFrame()
    expect(simStore.tick).toBe(startTick + 1)
  })

  it('decrements stepStore.autoRunTicksRemaining on manual-tick fire when in step-by-step mode', async () => {
    const { useStepStore } = await import('../../stores/stepStore')
    const settings = useSettingsStore()
    const ui = useUiStore()
    const stepStore = useStepStore()

    settings.msPerTick = 100
    settings.speedMultiplier = 1
    ui.setMode('step-by-step')
    stepStore.autoRunTicksRemaining = 3

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    sim.playOneTick()
    raf.setNow(100)
    raf.runFrame()

    expect(stepStore.autoRunTicksRemaining).toBe(2)
  })

  it('manual tick takes priority over the paused-loop early return', () => {
    const settings = useSettingsStore()
    const simStore = useSimulationStore()
    const ui = useUiStore()

    settings.msPerTick = 100
    settings.speedMultiplier = 1
    ui.isPaused = true // explicitly paused — manual tick must still fire

    raf.setNow(0)
    sim.start()
    raf.runFrame()

    const startTick = simStore.tick
    sim.playOneTick()
    raf.setNow(100)
    raf.runFrame()

    expect(simStore.tick).toBe(startTick + 1)
  })
})
