import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settingsStore'

describe('settingsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('has correct defaults', () => {
    const s = useSettingsStore()
    expect(s.nodeCount).toBe(5)
    expect(s.speedMultiplier).toBe(1)
    expect(s.messageDelayMin).toBe(3)
    expect(s.messageDelayMax).toBe(4)
    expect(s.messageLossProbability).toBe(0)
    expect(s.electionTimeoutMin).toBe(15)
    expect(s.electionTimeoutMax).toBe(30)
    expect(s.heartbeatInterval).toBe(5)
    expect(s.msPerTick).toBe(400)
  })

  it('refs are writable', () => {
    const s = useSettingsStore()
    s.nodeCount = 7
    s.speedMultiplier = 2
    expect(s.nodeCount).toBe(7)
    expect(s.speedMultiplier).toBe(2)
  })
})
