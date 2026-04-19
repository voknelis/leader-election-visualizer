import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStepStore } from '../stepStore'
import type { Scenario } from '../../types/scenario'

function makeScenario(): Scenario {
  return {
    id: 'test',
    title: 'Test',
    description: '',
    steps: [
      { id: 's0', title: 'Step 0', narration: '', autoRunTicks: 5 },
      { id: 's1', title: 'Step 1', narration: '' },
      { id: 's2', title: 'Step 2', narration: '', autoRunTicks: 3 },
    ],
  }
}

describe('stepStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('autoAdvance defaults to true', () => {
    const store = useStepStore()
    expect(store.autoAdvance).toBe(true)
  })

  it('loadScenario does NOT reset autoAdvance (preference persists)', () => {
    const store = useStepStore()
    store.autoAdvance = false
    store.loadScenario(makeScenario())
    expect(store.autoAdvance).toBe(false)

    store.autoAdvance = true
    store.loadScenario(makeScenario())
    expect(store.autoAdvance).toBe(true)
  })

  it('loadScenario resets index, ticks remaining, visited steps', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    store.markVisited(0)
    store.markVisited(1)
    store.autoRunTicksRemaining = 4
    store.currentStepIndex = 2

    store.loadScenario(makeScenario())
    expect(store.currentStepIndex).toBe(0)
    expect(store.autoRunTicksRemaining).toBe(0)
    expect(store.visitedSteps.size).toBe(0)
  })

  it('nextStep sets autoRunTicksRemaining from the new step', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    store.nextStep() // s1 has no autoRunTicks
    expect(store.currentStepIndex).toBe(1)
    expect(store.autoRunTicksRemaining).toBe(0)

    store.nextStep() // s2 has autoRunTicks: 3
    expect(store.currentStepIndex).toBe(2)
    expect(store.autoRunTicksRemaining).toBe(3)
  })

  it('prevStep clears autoRunTicksRemaining', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    store.nextStep()
    store.nextStep()
    store.autoRunTicksRemaining = 2
    store.prevStep()
    expect(store.currentStepIndex).toBe(1)
    expect(store.autoRunTicksRemaining).toBe(0)
  })

  it('goToStep sets autoRunTicksRemaining from target step', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    store.goToStep(2)
    expect(store.currentStepIndex).toBe(2)
    expect(store.autoRunTicksRemaining).toBe(3)
  })

  it('goToStep ignores out-of-range indices', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    store.goToStep(99)
    expect(store.currentStepIndex).toBe(0)
    store.goToStep(-1)
    expect(store.currentStepIndex).toBe(0)
  })

  it('markVisited adds index, idempotent', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    store.markVisited(1)
    expect(store.visitedSteps.has(1)).toBe(true)

    const sizeBefore = store.visitedSteps.size
    store.markVisited(1)
    expect(store.visitedSteps.size).toBe(sizeBefore)
  })

  it('decrementAutoRunTicks returns true only when reaching zero', () => {
    const store = useStepStore()
    store.autoRunTicksRemaining = 2
    expect(store.decrementAutoRunTicks()).toBe(false) // 2 -> 1
    expect(store.decrementAutoRunTicks()).toBe(true)  // 1 -> 0
    expect(store.decrementAutoRunTicks()).toBe(false) // already 0
  })

  it('isFirstStep / isLastStep reflect index correctly', () => {
    const store = useStepStore()
    store.loadScenario(makeScenario())
    expect(store.isFirstStep).toBe(true)
    expect(store.isLastStep).toBe(false)
    store.goToStep(2)
    expect(store.isFirstStep).toBe(false)
    expect(store.isLastStep).toBe(true)
  })

  it('does not expose isAutoPlaying or toggleAutoPlay (auto-play removed)', () => {
    const store = useStepStore() as unknown as Record<string, unknown>
    expect(store.isAutoPlaying).toBeUndefined()
    expect(store.toggleAutoPlay).toBeUndefined()
  })
})
