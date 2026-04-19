import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import type { EffectScope } from 'vue'
import { useScenarioRunner } from '../useScenarioRunner'
import { useStepStore } from '../../stores/stepStore'
import { useUiStore } from '../../stores/uiStore'
import { useSimulationStore } from '../../stores/simulationStore'
import type { Scenario, ScenarioStep } from '../../types/scenario'
import type { useSimulation } from '../useSimulation'

const { mockRoute } = vi.hoisted(() => {
  const { ref } = require('vue')
  const mockRoute = ref({ path: '/' } as any)
  return { mockRoute }
})
vi.mock('../../router', () => ({
  default: {
    currentRoute: mockRoute,
    push: (to: string) => { mockRoute.value = { path: to } as any },
  },
}))

type FakeSim = ReturnType<typeof makeFakeSim>

function makeFakeSim() {
  return {
    engine: { value: {} as any },
    start: vi.fn(),
    stop: vi.fn(),
    tickOnce: vi.fn(),
    tickN: vi.fn(),
    playOneTick: vi.fn().mockReturnValue(true),
    cancelManualTick: vi.fn(),
    addNode: vi.fn(),
    removeNode: vi.fn(),
    crashNode: vi.fn(),
    restoreNode: vi.fn(),
    setPartition: vi.fn(),
    clearPartition: vi.fn(),
    reset: vi.fn(),
    saveStepSnapshot: vi.fn(),
    restoreStepSnapshot: vi.fn().mockReturnValue(true),
    syncSnapshot: vi.fn(),
  }
}

function buildScenario(steps: ScenarioStep[]): Scenario {
  return { id: 'test', title: 'Test', description: '', steps }
}

const baseScenario = () => buildScenario([
  { id: 's0', title: 'Step 0', narration: '', autoRunTicks: 5 },
  { id: 's1', title: 'Step 1', narration: '' }, // pure narration
  { id: 's2', title: 'Step 2', narration: '', advanceCondition: (snap) => snap.tick >= 10 },
  { id: 's3', title: 'Step 3', narration: '', autoRunTicks: 4, advanceCondition: (snap) => snap.tick >= 20 },
])

describe('useScenarioRunner', () => {
  let scope: EffectScope
  let sim: FakeSim
  let runner: ReturnType<typeof useScenarioRunner>

  function setup(autoAdvance = true) {
    setActivePinia(createPinia())
    sim = makeFakeSim()
    scope = effectScope()
    scope.run(() => {
      runner = useScenarioRunner(sim as unknown as ReturnType<typeof useSimulation>)
    })
    useStepStore().autoAdvance = autoAdvance
  }

  beforeEach(() => {
    mockRoute.value = { path: '/' }
    setup()
  })

  describe('canTickNow', () => {
    it('false when no scenario loaded', () => {
      expect(runner.canTickNow.value).toBe(false)
    })

    it('false for pure narration step (no autoRun, no condition)', async () => {
      const stepStore = useStepStore()
      runner.loadScenario(baseScenario())
      stepStore.goToStep(1)
      await nextTick()
      expect(runner.canTickNow.value).toBe(false)
    })

    it('true in manual mode while autoRun has remaining ticks', () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      const stepStore = useStepStore()
      // After loadScenario applyStep(0): autoRunTicksRemaining set to 5
      expect(stepStore.autoRunTicksRemaining).toBe(5)
      expect(runner.canTickNow.value).toBe(true)
    })

    it('false when autoRun fully drained and no condition', () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      const stepStore = useStepStore()
      stepStore.autoRunTicksRemaining = 0
      expect(runner.canTickNow.value).toBe(false)
    })

    it('false when condition step is already met', async () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      const stepStore = useStepStore()
      const simStore = useSimulationStore()
      stepStore.goToStep(2)
      await nextTick()
      expect(runner.canTickNow.value).toBe(true) // tick=0, condition tick>=10 false
      simStore.tick = 10
      expect(runner.canTickNow.value).toBe(false)
    })

    it('false while a manual tick animation is in flight', () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      runner.tickOnce()
      expect(runner.canTickNow.value).toBe(false)
    })
  })

  describe('tickOnce', () => {
    it('no-op when no scenario loaded', () => {
      runner.tickOnce()
      expect(sim.playOneTick).not.toHaveBeenCalled()
    })

    it('no-op when canTickNow is false (autoRun drained)', () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      const stepStore = useStepStore()
      stepStore.autoRunTicksRemaining = 0
      runner.tickOnce()
      expect(sim.playOneTick).not.toHaveBeenCalled()
    })

    it('no-op when condition is already met (T hotkey gating)', async () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      useStepStore().goToStep(2)
      await nextTick()
      useSimulationStore().tick = 10
      runner.tickOnce()
      expect(sim.playOneTick).not.toHaveBeenCalled()
    })

    it('calls sim.playOneTick and flips tickInFlight via callback', () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      let onComplete: (() => void) | undefined
      sim.playOneTick.mockImplementation((cb?: () => void) => {
        onComplete = cb
        return true
      })
      runner.tickOnce()
      expect(sim.playOneTick).toHaveBeenCalledTimes(1)
      expect(runner.canTickNow.value).toBe(false) // in-flight

      onComplete?.()
      // canTickNow re-derives; autoRun still has 5 ticks remaining so it's true
      expect(runner.canTickNow.value).toBe(true)
    })

    it('does not start a new tick while one is in flight', () => {
      useStepStore().autoAdvance = false
      runner.loadScenario(baseScenario())
      sim.playOneTick.mockReturnValue(true)
      runner.tickOnce()
      runner.tickOnce()
      runner.tickOnce()
      expect(sim.playOneTick).toHaveBeenCalledTimes(1)
    })
  })

  describe('runStepPostActions (via loadScenario / nextStep)', () => {
    it('auto mode: unpauses on step with autoRun', () => {
      useStepStore().autoAdvance = true
      const ui = useUiStore()
      runner.loadScenario(baseScenario())
      expect(ui.isPaused).toBe(false)
    })

    it('manual mode: keeps paused on step with autoRun', () => {
      useStepStore().autoAdvance = false
      const ui = useUiStore()
      runner.loadScenario(baseScenario())
      expect(ui.isPaused).toBe(true)
    })

    it('pure narration step always pauses regardless of mode', () => {
      const ui = useUiStore()
      runner.loadScenario(baseScenario())
      useStepStore().goToStep(1)
      runner.nextStep() // moves to s2; ignore
      // back to s1 to test
      useStepStore().goToStep(1)
      runner.replayCurrentStep()
      expect(ui.isPaused).toBe(true)
    })

    it('seeds autoRunTicksRemaining from step.autoRunTicks', () => {
      const stepStore = useStepStore()
      runner.loadScenario(baseScenario())
      expect(stepStore.autoRunTicksRemaining).toBe(5)
    })
  })

  describe('autoAdvance live toggle', () => {
    it('OFF mid-run pauses the sim', async () => {
      const ui = useUiStore()
      const stepStore = useStepStore()
      runner.loadScenario(baseScenario()) // auto mode, isPaused=false
      expect(ui.isPaused).toBe(false)
      stepStore.autoAdvance = false
      await nextTick()
      expect(ui.isPaused).toBe(true)
    })

    it('ON with remaining ticks unpauses', async () => {
      const ui = useUiStore()
      const stepStore = useStepStore()
      stepStore.autoAdvance = false
      await nextTick() // flush the false-watcher before flipping back to true
      runner.loadScenario(baseScenario())
      expect(ui.isPaused).toBe(true)
      stepStore.autoAdvance = true
      await nextTick()
      expect(ui.isPaused).toBe(false)
    })

    it('ON does NOT unpause when condition is already met (regression: extra-tick bug)', async () => {
      const ui = useUiStore()
      const stepStore = useStepStore()
      const simStore = useSimulationStore()
      stepStore.autoAdvance = false
      runner.loadScenario(baseScenario())
      stepStore.goToStep(2) // condition: tick >= 10
      await nextTick()
      simStore.tick = 10 // condition met
      ui.isPaused = true

      stepStore.autoAdvance = true
      await nextTick()
      // Bug used to be: watcher unpaused because hasOpenCondition was true,
      // letting the loop fire one extra tick before the condition watcher caught it.
      expect(ui.isPaused).toBe(true)
    })

    it('ON does NOT unpause when autoRun drained and no condition', async () => {
      const ui = useUiStore()
      const stepStore = useStepStore()
      stepStore.autoAdvance = false
      runner.loadScenario(baseScenario())
      stepStore.autoRunTicksRemaining = 0
      ui.isPaused = true

      stepStore.autoAdvance = true
      await nextTick()
      expect(ui.isPaused).toBe(true)
    })
  })

  describe('loadScenario', () => {
    it('calls sim.reset(42) and applies step 0', () => {
      runner.loadScenario(baseScenario())
      expect(sim.reset).toHaveBeenCalledWith(42)
      expect(sim.saveStepSnapshot).toHaveBeenCalledWith(0)
      expect(useStepStore().visitedSteps.has(0)).toBe(true)
    })

    it('does NOT reset autoAdvance preference', () => {
      const stepStore = useStepStore()
      stepStore.autoAdvance = false
      runner.loadScenario(baseScenario())
      expect(stepStore.autoAdvance).toBe(false)
    })

    it('cancels pending manual tick from prior session', () => {
      runner.loadScenario(baseScenario())
      // sim.cancelManualTick is called via cancelAllTimers → clearTickInFlight
      expect(sim.cancelManualTick).toHaveBeenCalled()
    })
  })

  describe('navigation', () => {
    it('nextStep on unvisited step calls saveStepSnapshot', () => {
      runner.loadScenario(baseScenario())
      sim.saveStepSnapshot.mockClear()
      runner.nextStep()
      expect(sim.saveStepSnapshot).toHaveBeenCalledWith(1)
    })

    it('nextStep on visited step calls restoreStepSnapshot instead', () => {
      runner.loadScenario(baseScenario())
      runner.nextStep() // visit s1
      runner.prevStep() // back to s0
      sim.saveStepSnapshot.mockClear()
      sim.restoreStepSnapshot.mockClear()
      runner.nextStep() // s1 already visited
      expect(sim.saveStepSnapshot).not.toHaveBeenCalled()
      expect(sim.restoreStepSnapshot).toHaveBeenCalledWith(1)
    })

    it('jumpToStep refuses unvisited targets', () => {
      runner.loadScenario(baseScenario())
      sim.restoreStepSnapshot.mockClear()
      runner.jumpToStep(2) // not visited
      expect(useStepStore().currentStepIndex).toBe(0)
      expect(sim.restoreStepSnapshot).not.toHaveBeenCalled()
    })

    it('jumpToStep replays current step when targetIndex matches', () => {
      runner.loadScenario(baseScenario())
      sim.restoreStepSnapshot.mockClear()
      runner.jumpToStep(0)
      expect(sim.restoreStepSnapshot).toHaveBeenCalledWith(0)
    })
  })

  describe('cancelAllTimers', () => {
    it('cancels manual tick in sim', () => {
      runner.loadScenario(baseScenario())
      sim.cancelManualTick.mockClear()
      runner.cancelAllTimers()
      expect(sim.cancelManualTick).toHaveBeenCalled()
    })
  })

})
