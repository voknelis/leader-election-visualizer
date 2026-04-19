import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSimulationStore } from '../simulationStore'
import { DEFAULT_CONFIG } from '../../types/simulation'
import type { SimulationSnapshot } from '../../types/simulation'

function makeSnapshot(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    tick: 1,
    nodes: new Map([['N1', { id: 'N1', state: 'follower' } as any]]),
    messages: [],
    config: { ...DEFAULT_CONFIG },
    events: [{ tick: 1, type: 'became_leader', nodeId: 'N1', detail: {} }],
    ...overrides,
  }
}

describe('simulationStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts empty', () => {
    const store = useSimulationStore()
    expect(store.tick).toBe(0)
    expect(store.nodes.size).toBe(0)
    expect(store.messages).toEqual([])
    expect(store.events).toEqual([])
    expect(store.partitions.size).toBe(0)
    expect(store.eventHistory).toEqual([])
    expect(store.frameFraction).toBe(0)
  })

  it('updateFromSnapshot sets all fields', () => {
    const store = useSimulationStore()
    const partitions = new Set(['N1:N2'])
    const snap = makeSnapshot({ config: { ...DEFAULT_CONFIG, partitions } })
    store.updateFromSnapshot(snap)
    expect(store.tick).toBe(1)
    expect(store.nodes.has('N1')).toBe(true)
    expect(store.partitions).toBe(partitions)
    expect(store.events).toHaveLength(1)
  })

  it('updateFromSnapshot appends events to eventHistory', () => {
    const store = useSimulationStore()
    store.updateFromSnapshot(makeSnapshot({
      events: [{ tick: 1, type: 'became_leader', nodeId: 'N1', detail: {} }],
    }))
    store.updateFromSnapshot(makeSnapshot({
      tick: 2,
      events: [{ tick: 2, type: 'heartbeat_sent', nodeId: 'N1', detail: {} }],
    }))
    expect(store.eventHistory).toHaveLength(2)
  })

  it('updateFromSnapshot caps eventHistory at 200', () => {
    const store = useSimulationStore()
    for (let i = 0; i < 210; i++) {
      store.updateFromSnapshot(makeSnapshot({
        tick: i,
        events: [{ tick: i, type: 'heartbeat_sent', nodeId: 'N1', detail: {} }],
      }))
    }
    expect(store.eventHistory.length).toBeLessThanOrEqual(200)
  })

  it('updateFromSnapshot skips history append when events empty', () => {
    const store = useSimulationStore()
    store.updateFromSnapshot(makeSnapshot({ events: [] }))
    expect(store.eventHistory).toEqual([])
  })

  it('clearHistory empties eventHistory', () => {
    const store = useSimulationStore()
    store.updateFromSnapshot(makeSnapshot())
    store.clearHistory()
    expect(store.eventHistory).toEqual([])
  })

  it('truncateHistory slices to given length', () => {
    const store = useSimulationStore()
    store.updateFromSnapshot(makeSnapshot({
      events: [
        { tick: 1, type: 'became_leader', nodeId: 'N1', detail: {} },
        { tick: 2, type: 'heartbeat_sent', nodeId: 'N1', detail: {} },
      ],
    }))
    expect(store.eventHistory).toHaveLength(2)
    store.truncateHistory(1)
    expect(store.eventHistory).toHaveLength(1)
  })

  it('truncateHistory no-ops if length >= current', () => {
    const store = useSimulationStore()
    store.updateFromSnapshot(makeSnapshot())
    const len = store.eventHistory.length
    store.truncateHistory(len + 10)
    expect(store.eventHistory).toHaveLength(len)
  })
})
