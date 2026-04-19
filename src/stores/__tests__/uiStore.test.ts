import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defaults to demo mode, unpaused, no selection', () => {
    const ui = useUiStore()
    expect(ui.mode).toBe('demo')
    expect(ui.isPaused).toBe(false)
    expect(ui.selectedNodeId).toBeNull()
    expect(ui.highlightedNodes).toEqual([])
    expect(ui.showInspector).toBe(false)
    expect(ui.showEventLog).toBe(true)
  })

  it('selectNode sets selectedNodeId and shows inspector', () => {
    const ui = useUiStore()
    ui.selectNode('N1')
    expect(ui.selectedNodeId).toBe('N1')
    expect(ui.showInspector).toBe(true)
  })

  it('selectNode(null) clears selection and hides inspector', () => {
    const ui = useUiStore()
    ui.selectNode('N1')
    ui.selectNode(null)
    expect(ui.selectedNodeId).toBeNull()
    expect(ui.showInspector).toBe(false)
  })

  it('togglePause flips isPaused', () => {
    const ui = useUiStore()
    expect(ui.isPaused).toBe(false)
    ui.togglePause()
    expect(ui.isPaused).toBe(true)
    ui.togglePause()
    expect(ui.isPaused).toBe(false)
  })

  it('setMode changes mode', () => {
    const ui = useUiStore()
    ui.setMode('step-by-step')
    expect(ui.mode).toBe('step-by-step')
    ui.setMode('demo')
    expect(ui.mode).toBe('demo')
  })
})
