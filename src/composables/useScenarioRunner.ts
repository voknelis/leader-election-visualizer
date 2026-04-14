import { watch, inject } from 'vue'
import { useStepStore } from '../stores/stepStore'
import { useUiStore } from '../stores/uiStore'
import { useSimulationStore } from '../stores/simulationStore'
import { NodeState } from '../types/raft'
import type { EngineAction } from '../types/scenario'
import type { Scenario } from '../types/scenario'
import type { useSimulation } from './useSimulation'

const AUTO_PLAY_DELAY_MS = 1500
const AUTO_REPLAY_DELAY_MS = 2500

export function useScenarioRunner(simParam?: ReturnType<typeof useSimulation>) {
  const stepStore = useStepStore()
  const ui = useUiStore()
  const simStore = useSimulationStore()
  const sim = simParam ?? inject<ReturnType<typeof useSimulation>>('simulation')!

  let autoPlayTimer: ReturnType<typeof setTimeout> | null = null
  let autoReplayTimer: ReturnType<typeof setTimeout> | null = null

  function cancelAutoPlayTimer() {
    if (autoPlayTimer !== null) {
      clearTimeout(autoPlayTimer)
      autoPlayTimer = null
    }
  }

  function cancelAutoReplayTimer() {
    if (autoReplayTimer !== null) {
      clearTimeout(autoReplayTimer)
      autoReplayTimer = null
    }
  }

  function cancelAllTimers() {
    cancelAutoPlayTimer()
    cancelAutoReplayTimer()
  }

  function stopAutoPlay() {
    cancelAllTimers()
    stepStore.isAutoPlaying = false
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

    if (step.autoRunTicks) {
      stepStore.autoRunTicksRemaining = step.autoRunTicks
      ui.isPaused = false
    } else if (step.advanceCondition) {
      ui.isPaused = false
    } else {
      ui.isPaused = true
    }
  }

  /** Enter a step for the first time: run engine actions, snapshot the stable starting state, then drive the step. */
  function applyStep(stepIndex: number) {
    const step = stepStore.currentScenario?.steps[stepIndex]
    if (!step) return
    if (step.engineActions) {
      for (const action of step.engineActions) {
        applyAction(action)
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
    runStepPostActions(stepIndex)
    return true
  }

  function replayCurrentStep() {
    cancelAllTimers()
    replayStep(stepStore.currentStepIndex)
  }

  function nextStep() {
    if (stepStore.isLastStep) {
      stopAutoPlay()
      return
    }
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

  function toggleAutoPlay() {
    if (stepStore.isAutoPlaying) {
      stopAutoPlay()
    } else {
      if (stepStore.isLastStep) return
      cancelAutoReplayTimer()
      stepStore.isAutoPlaying = true
      scheduleAutoAdvanceIfSettled()
    }
  }

  function scheduleAutoAdvance() {
    cancelAutoPlayTimer()
    autoPlayTimer = setTimeout(() => {
      autoPlayTimer = null
      if (!stepStore.isAutoPlaying) return
      if (stepStore.isLastStep) {
        stopAutoPlay()
        return
      }
      nextStepFromAutoPlay()
    }, AUTO_PLAY_DELAY_MS)
  }

  function nextStepFromAutoPlay() {
    if (stepStore.isLastStep) {
      stopAutoPlay()
      return
    }
    stepStore.nextStep()
    const idx = stepStore.currentStepIndex
    if (stepStore.visitedSteps.has(idx)) {
      replayStep(idx)
    } else {
      applyStep(idx)
    }
    scheduleAutoAdvanceIfSettled()
  }

  /** Step is "settled" when autoRun has finished AND no condition-wait is active. */
  function isStepSettled() {
    if (stepStore.autoRunTicksRemaining > 0) return false
    const step = stepStore.currentStep
    if (step?.advanceCondition && !ui.isPaused) return false
    return true
  }

  /** If the current step is already settled, queue the next advance. */
  function scheduleAutoAdvanceIfSettled() {
    if (!stepStore.isAutoPlaying) return
    if (isStepSettled()) scheduleAutoAdvance()
  }

  /** Loop the current step's animation when user is not auto-playing. */
  function scheduleAutoReplay() {
    cancelAutoReplayTimer()
    if (stepStore.isAutoPlaying) return
    const step = stepStore.currentStep
    if (!step) return
    const hasAnimation = (step.autoRunTicks ?? 0) > 0 || !!step.advanceCondition
    if (!hasAnimation) return
    autoReplayTimer = setTimeout(() => {
      autoReplayTimer = null
      if (stepStore.isAutoPlaying) return
      replayStep(stepStore.currentStepIndex)
    }, AUTO_REPLAY_DELAY_MS)
  }

  function applyAction(action: EngineAction) {
    switch (action.type) {
      case 'reset':
        sim.reset(42)
        break
      case 'crash_node': {
        const nodeId = action.payload.nodeId as string
        if (nodeId === '__leader__') {
          for (const [id, node] of simStore.nodes) {
            if (node.state === NodeState.LEADER) {
              sim.crashNode(id)
              break
            }
          }
        } else {
          sim.crashNode(nodeId)
        }
        break
      }
      case 'restore_node':
        sim.restoreNode(action.payload.nodeId as string)
        break
      case 'set_partition': {
        const groupA = action.payload.groupA as string[]
        const groupB = action.payload.groupB as string[]
        if (groupA.length === 0 && groupB.length === 0) {
          sim.clearPartition()
        } else {
          sim.setPartition(groupA, groupB)
        }
        break
      }
      case 'set_config':
        break
      case 'add_node':
        sim.addNode()
        break
      case 'remove_node':
        sim.removeNode(action.payload.nodeId as string)
        break
    }
  }

  // advanceCondition watcher: pause when condition is met, optionally queue auto-advance
  watch(
    () => simStore.tick,
    () => {
      if (ui.mode !== 'step-by-step' || !stepStore.currentStep?.advanceCondition) return
      if (ui.isPaused) return
      const snap = {
        tick: simStore.tick,
        nodes: simStore.nodes,
        messages: simStore.messages,
        config: {} as any,
        events: simStore.events,
      }
      if (stepStore.currentStep.advanceCondition(snap)) {
        ui.isPaused = true
        if (stepStore.isAutoPlaying) scheduleAutoAdvance()
        else scheduleAutoReplay()
      }
    },
  )

  // autoRunTicks countdown settled: queue auto-advance or auto-replay
  watch(
    () => stepStore.autoRunTicksRemaining,
    (remaining, prev) => {
      if (remaining === 0 && prev && prev > 0) {
        if (stepStore.isAutoPlaying) scheduleAutoAdvance()
        else scheduleAutoReplay()
      }
    },
  )

  return {
    loadScenario,
    nextStep,
    prevStep,
    replayCurrentStep,
    jumpToStep,
    toggleAutoPlay,
    stopAutoPlay,
  }
}
