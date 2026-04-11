import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useStepStore } from '../stores/stepStore'
import type { useSimulation } from './useSimulation'
import type { useScenarioRunner } from './useScenarioRunner'

export function useKeyboardShortcuts(
  sim: ReturnType<typeof useSimulation>,
  runner: ReturnType<typeof useScenarioRunner>,
) {
  const ui = useUiStore()
  const stepStore = useStepStore()

  function handler(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        ui.togglePause()
        break
      case 'ArrowRight':
        if (ui.mode === 'step-by-step' && stepStore.currentScenario) {
          e.preventDefault()
          runner.nextStep()
        }
        break
      case 'ArrowLeft':
        if (ui.mode === 'step-by-step' && stepStore.currentScenario) {
          e.preventDefault()
          runner.prevStep()
        }
        break
      case 'KeyR':
        if (e.ctrlKey || e.metaKey) return
        e.preventDefault()
        sim.reset(Math.floor(Math.random() * 10000))
        break
      case 'Escape':
        ui.selectNode(null)
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
