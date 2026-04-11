import { onMounted, onUnmounted, inject } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useStepStore } from '../stores/stepStore'
import { useScenarioRunner } from './useScenarioRunner'
import type { useSimulation } from './useSimulation'

export function useKeyboardShortcuts() {
  const ui = useUiStore()
  const stepStore = useStepStore()
  const sim = inject<ReturnType<typeof useSimulation>>('simulation')

  let runner: ReturnType<typeof useScenarioRunner> | null = null

  function handler(e: KeyboardEvent) {
    // Don't capture when typing in inputs
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        ui.togglePause()
        break
      case 'KeyN':
      case 'ArrowRight':
        if (ui.mode === 'step-by-step' && stepStore.currentScenario) {
          e.preventDefault()
          if (!runner) runner = useScenarioRunner()
          runner.nextStep()
        }
        break
      case 'KeyP':
      case 'ArrowLeft':
        if (ui.mode === 'step-by-step' && stepStore.currentScenario) {
          e.preventDefault()
          if (!runner) runner = useScenarioRunner()
          runner.prevStep()
        }
        break
      case 'KeyR':
        if (e.ctrlKey || e.metaKey) return // Don't intercept browser refresh
        e.preventDefault()
        sim?.reset(Math.floor(Math.random() * 10000))
        break
      case 'Escape':
        ui.selectNode(null)
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
