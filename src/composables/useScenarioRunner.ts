import { watch, inject } from 'vue'
import { useStepStore } from '../stores/stepStore'
import { useUiStore } from '../stores/uiStore'
import { useSimulationStore } from '../stores/simulationStore'
import { NodeState } from '../types/raft'
import type { EngineAction } from '../types/scenario'
import type { Scenario } from '../types/scenario'
import type { useSimulation } from './useSimulation'

export function useScenarioRunner() {
  const stepStore = useStepStore()
  const ui = useUiStore()
  const simStore = useSimulationStore()
  const sim = inject<ReturnType<typeof useSimulation>>('simulation')!

  function loadScenario(scenario: Scenario) {
    stepStore.loadScenario(scenario)
    ui.setMode('step-by-step')
    ui.isPaused = true

    // Reset engine and apply first step
    sim.reset(42)
    applyStep(0)
  }

  function applyStep(stepIndex: number) {
    const step = stepStore.currentScenario?.steps[stepIndex]
    if (!step) return

    // Save snapshot at this step boundary
    sim.saveStepSnapshot(stepIndex)

    // Apply engine actions
    if (step.engineActions) {
      for (const action of step.engineActions) {
        applyAction(action)
      }
    }

    // Set highlights
    ui.highlightedNodes = step.highlightNodes ?? []

    // Handle autoRunTicks
    if (step.autoRunTicks) {
      stepStore.autoRunTicksRemaining = step.autoRunTicks
      ui.isPaused = false
    } else if (step.advanceCondition) {
      // Let it run until condition is met
      ui.isPaused = false
    } else {
      ui.isPaused = true
    }
  }

  function nextStep() {
    if (stepStore.isLastStep) return
    stepStore.nextStep()
    applyStep(stepStore.currentStepIndex)
  }

  function prevStep() {
    if (stepStore.isFirstStep) return
    const targetIdx = stepStore.currentStepIndex - 1
    // Restore snapshot from previous step
    const restored = sim.restoreStepSnapshot(targetIdx)
    if (restored) {
      stepStore.prevStep()
      ui.highlightedNodes = stepStore.currentStep?.highlightNodes ?? []
      ui.isPaused = true
    }
  }

  function applyAction(action: EngineAction) {
    switch (action.type) {
      case 'reset':
        sim.reset(42)
        break
      case 'crash_node': {
        const nodeId = action.payload.nodeId as string
        if (nodeId === '__leader__') {
          // Find and crash current leader
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
        // Would need engine reconfiguration — skip for now
        break
      case 'add_node':
        sim.addNode()
        break
      case 'remove_node':
        sim.removeNode(action.payload.nodeId as string)
        break
    }
  }

  // Watch for advanceCondition being met
  watch(
    () => simStore.tick,
    () => {
      if (ui.mode !== 'step-by-step' || !stepStore.currentStep?.advanceCondition) return
      const snap = {
        tick: simStore.tick,
        nodes: simStore.nodes,
        messages: simStore.messages,
        config: {} as any,
        events: simStore.events,
      }
      if (stepStore.currentStep.advanceCondition(snap)) {
        ui.isPaused = true
      }
    },
  )

  return {
    loadScenario,
    nextStep,
    prevStep,
  }
}
