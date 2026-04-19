import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Scenario, ScenarioStep } from '../types/scenario'

export const useStepStore = defineStore('step', () => {
  const currentScenario = ref<Scenario | null>(null)
  const currentStepIndex = ref(0)
  /** Ticks remaining in autoRunTicks countdown */
  const autoRunTicksRemaining = ref(0)
  /** Step indices the user has entered at least once */
  const visitedSteps = ref<Set<number>>(new Set())
  /** When false, step entry does NOT auto-run ticks; user advances manually with the Tick button */
  const autoAdvance = ref(true)

  const currentStep = computed<ScenarioStep | null>(() => {
    if (!currentScenario.value) return null
    return currentScenario.value.steps[currentStepIndex.value] ?? null
  })

  const totalSteps = computed(() => currentScenario.value?.steps.length ?? 0)
  const isFirstStep = computed(() => currentStepIndex.value === 0)
  const isLastStep = computed(() => currentStepIndex.value >= totalSteps.value - 1)

  function loadScenario(scenario: Scenario) {
    currentScenario.value = scenario
    currentStepIndex.value = 0
    autoRunTicksRemaining.value = 0
    visitedSteps.value = new Set()
    // autoAdvance is intentionally NOT reset — user preference persists across scenarios.
  }

  function markVisited(index: number) {
    if (!visitedSteps.value.has(index)) {
      const next = new Set(visitedSteps.value)
      next.add(index)
      visitedSteps.value = next
    }
  }

  function nextStep() {
    if (!isLastStep.value) {
      currentStepIndex.value++
      autoRunTicksRemaining.value = currentStep.value?.autoRunTicks ?? 0
    }
  }

  function prevStep() {
    if (!isFirstStep.value) {
      currentStepIndex.value--
      autoRunTicksRemaining.value = 0
    }
  }

  function goToStep(index: number) {
    if (currentScenario.value && index >= 0 && index < totalSteps.value) {
      currentStepIndex.value = index
      autoRunTicksRemaining.value = currentStep.value?.autoRunTicks ?? 0
    }
  }

  function decrementAutoRunTicks(): boolean {
    if (autoRunTicksRemaining.value > 0) {
      autoRunTicksRemaining.value--
      return autoRunTicksRemaining.value === 0
    }
    return false
  }

  return {
    currentScenario,
    currentStepIndex,
    autoRunTicksRemaining,
    visitedSteps,
    autoAdvance,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    loadScenario,
    markVisited,
    nextStep,
    prevStep,
    goToStep,
    decrementAutoRunTicks,
  }
})
