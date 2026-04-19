import { ref, computed, watch, inject } from 'vue'
import { useStepStore } from '../stores/stepStore'
import { useUiStore } from '../stores/uiStore'
import { useSimulationStore } from '../stores/simulationStore'
import type { SimulationSnapshot } from '../types/simulation'
import { DEFAULT_CONFIG } from '../types/simulation'
import type { Scenario } from '../types/scenario'
import type { useSimulation } from './useSimulation'
import { applyEngineAction } from './applyEngineAction'

const AUTO_REPLAY_DELAY_MS = 2500

export function useScenarioRunner(simParam?: ReturnType<typeof useSimulation>) {
  const stepStore = useStepStore()
  const ui = useUiStore()
  const simStore = useSimulationStore()
  const sim = simParam ?? inject<ReturnType<typeof useSimulation>>('simulation')!

  let autoReplayTimer: ReturnType<typeof setTimeout> | null = null
  const tickInFlight = ref(false)

  function liveSnapshot(): SimulationSnapshot {
    return {
      tick: simStore.tick,
      nodes: simStore.nodes,
      messages: simStore.messages,
      config: { ...DEFAULT_CONFIG, partitions: simStore.partitions },
      events: simStore.events,
    }
  }

  const conditionMet = computed(() => {
    const step = stepStore.currentStep
    if (!step?.advanceCondition) return false
    return step.advanceCondition(liveSnapshot())
  })

  /** True when a manual tick is allowed: no animation in flight, step not already settled. */
  const canTickNow = computed(() => {
    if (tickInFlight.value) return false
    const step = stepStore.currentStep
    if (!step) return false
    const hasAutoRun = (step.autoRunTicks ?? 0) > 0
    const hasCondition = !!step.advanceCondition
    if (!hasAutoRun && !hasCondition) return false
    if (hasAutoRun && stepStore.autoRunTicksRemaining === 0 && !hasCondition) return false
    if (conditionMet.value) return false
    return true
  })

  function cancelAutoReplayTimer() {
    if (autoReplayTimer !== null) {
      clearTimeout(autoReplayTimer)
      autoReplayTimer = null
    }
  }

  function clearTickInFlight() {
    sim.cancelManualTick()
    tickInFlight.value = false
  }

  function cancelAllTimers() {
    cancelAutoReplayTimer()
    clearTickInFlight()
  }

  function loadScenario(scenario: Scenario) {
    cancelAllTimers()
    stepStore.loadScenario(scenario)
    ui.setMode('step-by-step')
    ui.isPaused = true

    sim.reset(42)
    applyStep(0)
  }

  /** Visual side of a step: highlights, autoRun / advanceCondition gating. */
  function runStepPostActions(stepIndex: number) {
    const step = stepStore.currentScenario?.steps[stepIndex]
    if (!step) return

    ui.highlightedNodes = step.highlightNodes ?? []

    const hasAutoRun = !!step.autoRunTicks
    const hasCondition = !!step.advanceCondition

    if (!hasAutoRun && !hasCondition) {
      ui.isPaused = true
      return
    }

    if (hasAutoRun) {
      stepStore.autoRunTicksRemaining = step.autoRunTicks!
    }

    // Manual mode: keep paused; user drives ticks via tickOnce()
    ui.isPaused = !stepStore.autoAdvance
  }

  /** Enter a step for the first time: run engine actions, snapshot the stable starting state, then drive the step. */
  function applyStep(stepIndex: number) {
    const step = stepStore.currentScenario?.steps[stepIndex]
    if (!step) return
    if (step.engineActions) {
      for (const action of step.engineActions) {
        applyEngineAction(action, sim, simStore)
      }
    }
    // Snapshot captures the post-action starting state so replay/jump is idempotent.
    sim.saveStepSnapshot(stepIndex)
    stepStore.markVisited(stepIndex)
    runStepPostActions(stepIndex)
  }

  /** Replay a step: restore its starting snapshot then drive the step (skip re-running actions). */
  function replayStep(stepIndex: number) {
    const restored = sim.restoreStepSnapshot(stepIndex)
    if (!restored) return false
    clearTickInFlight()
    runStepPostActions(stepIndex)
    return true
  }

  function replayCurrentStep() {
    cancelAllTimers()
    replayStep(stepStore.currentStepIndex)
  }

  function nextStep() {
    if (stepStore.isLastStep) return
    cancelAllTimers()
    stepStore.nextStep()
    const idx = stepStore.currentStepIndex
    if (stepStore.visitedSteps.has(idx)) {
      replayStep(idx)
    } else {
      applyStep(idx)
    }
  }

  function prevStep() {
    if (stepStore.isFirstStep) return
    cancelAllTimers()
    stepStore.prevStep()
    replayStep(stepStore.currentStepIndex)
  }

  function jumpToStep(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= stepStore.totalSteps) return
    if (targetIndex === stepStore.currentStepIndex) {
      replayCurrentStep()
      return
    }
    if (!stepStore.visitedSteps.has(targetIndex)) return
    cancelAllTimers()
    stepStore.goToStep(targetIndex)
    replayStep(targetIndex)
  }

  /** Manually advance the simulation by one animated tick (only sensible in manual mode). */
  function tickOnce() {
    if (!stepStore.currentScenario) return
    if (!canTickNow.value) return
    const started = sim.playOneTick(() => {
      tickInFlight.value = false
    })
    if (started) tickInFlight.value = true
  }

  /** Loop the current step's animation when user is letting it run on its own. */
  function scheduleAutoReplay() {
    cancelAutoReplayTimer()
    if (!stepStore.autoAdvance) return
    const step = stepStore.currentStep
    if (!step) return
    const hasAnimation = (step.autoRunTicks ?? 0) > 0 || !!step.advanceCondition
    if (!hasAnimation) return
    autoReplayTimer = setTimeout(() => {
      autoReplayTimer = null
      replayStep(stepStore.currentStepIndex)
    }, AUTO_REPLAY_DELAY_MS)
  }

  // advanceCondition watcher: pause when condition is met, queue auto-replay
  watch(
    () => simStore.tick,
    () => {
      if (ui.mode !== 'step-by-step' || !stepStore.currentStep?.advanceCondition) return
      if (ui.isPaused) return
      if (stepStore.currentStep.advanceCondition(liveSnapshot())) {
        ui.isPaused = true
        scheduleAutoReplay()
      }
    },
  )

  // autoRunTicks countdown settled: queue auto-replay
  watch(
    () => stepStore.autoRunTicksRemaining,
    (remaining, prev) => {
      if (remaining === 0 && prev && prev > 0) {
        scheduleAutoReplay()
      }
    },
  )

  // Live-toggle of autoAdvance: off → pause; on → resume drained-step or condition-step
  watch(
    () => stepStore.autoAdvance,
    (enabled) => {
      if (ui.mode !== 'step-by-step' || !stepStore.currentScenario) return
      const step = stepStore.currentStep
      if (!step) return
      if (!enabled) {
        ui.isPaused = true
        cancelAutoReplayTimer()
        return
      }
      // Don't resume a step that's already settled — condition met or autoRun drained with no condition.
      if (conditionMet.value) return
      const hasRemainingTicks = stepStore.autoRunTicksRemaining > 0
      const hasOpenCondition = !!step.advanceCondition
      if (hasRemainingTicks || hasOpenCondition) {
        ui.isPaused = false
      }
    },
  )

  return {
    loadScenario,
    nextStep,
    prevStep,
    replayCurrentStep,
    jumpToStep,
    tickOnce,
    canTickNow,
    conditionMet,
    cancelAllTimers,
  }
}
