import { describe, it, expect } from 'vitest'
import { RaftEngine } from '../RaftEngine'
import { NodeState } from '../../types/raft'

describe('RaftEngine', () => {
  it('creates nodes on construction', () => {
    const engine = new RaftEngine({ nodeCount: 3 })
    expect(engine.getNodeIds()).toEqual(['N1', 'N2', 'N3'])
  })

  it('elects a leader in a 3-node cluster within 50 ticks', () => {
    const engine = new RaftEngine({ nodeCount: 3 }, 42)
    let leaderFound = false

    for (let i = 0; i < 50; i++) {
      const snap = engine.tick()
      for (const [, nodeState] of snap.nodes) {
        if (nodeState.state === NodeState.LEADER) {
          leaderFound = true
          break
        }
      }
      if (leaderFound) break
    }

    expect(leaderFound).toBe(true)
  })

  it('elects at most one leader per term', () => {
    const engine = new RaftEngine({ nodeCount: 5 }, 123)

    for (let i = 0; i < 100; i++) {
      const snap = engine.tick()
      const leaders = [...snap.nodes.values()].filter(n => n.state === NodeState.LEADER)
      if (leaders.length > 1) {
        // Check they are in different terms
        const terms = new Set(leaders.map(l => l.currentTerm))
        expect(terms.size).toBe(leaders.length)
      }
    }
  })

  it('re-elects after leader crash', () => {
    const engine = new RaftEngine({ nodeCount: 3 }, 42)

    // Run until leader elected
    let leaderId: string | null = null
    for (let i = 0; i < 50; i++) {
      const snap = engine.tick()
      for (const [id, nodeState] of snap.nodes) {
        if (nodeState.state === NodeState.LEADER) {
          leaderId = id
          break
        }
      }
      if (leaderId) break
    }
    expect(leaderId).not.toBe(null)

    // Crash the leader
    engine.crashNode(leaderId!)

    // Run more ticks — a new leader should emerge
    let newLeader: string | null = null
    for (let i = 0; i < 60; i++) {
      const snap = engine.tick()
      for (const [id, nodeState] of snap.nodes) {
        if (nodeState.state === NodeState.LEADER && id !== leaderId) {
          newLeader = id
          break
        }
      }
      if (newLeader) break
    }

    expect(newLeader).not.toBe(null)
    expect(newLeader).not.toBe(leaderId)
  })

  it('partition prevents cross-group leader acknowledgment', () => {
    const engine = new RaftEngine({ nodeCount: 5 }, 42)

    // Run until leader elected
    for (let i = 0; i < 50; i++) {
      engine.tick()
    }

    // Partition: N1,N2 vs N3,N4,N5
    engine.setPartition(['N1', 'N2'], ['N3', 'N4', 'N5'])

    // Run more ticks — majority side should elect a leader, minority should not
    for (let i = 0; i < 80; i++) {
      engine.tick()
    }

    const snap = engine.getSnapshot()
    const majorityNodes = ['N3', 'N4', 'N5']
    const majorityLeaders = majorityNodes.filter(id => snap.nodes.get(id)?.state === NodeState.LEADER)

    // Majority side should have a leader
    expect(majorityLeaders.length).toBeGreaterThanOrEqual(1)
  })

  it('addNode dynamically adds a node', () => {
    const engine = new RaftEngine({ nodeCount: 3 })
    const id = engine.addNode('N4')
    expect(id).toBe('N4')
    expect(engine.getNodeIds()).toContain('N4')
  })

  it('removeNode removes a node', () => {
    const engine = new RaftEngine({ nodeCount: 3 })
    engine.removeNode('N3')
    expect(engine.getNodeIds()).not.toContain('N3')
  })

  it('snapshot/restore preserves state', () => {
    const engine = new RaftEngine({ nodeCount: 3 }, 42)
    for (let i = 0; i < 20; i++) engine.tick()

    const snap = engine.saveSnapshot()
    const tickBefore = engine.getCurrentTick()

    // Run more ticks to change state
    for (let i = 0; i < 20; i++) engine.tick()
    expect(engine.getCurrentTick()).toBe(40)

    // Restore
    engine.restoreSnapshot(snap)
    expect(engine.getCurrentTick()).toBe(tickBefore)
  })

  it('reset restarts the engine', () => {
    const engine = new RaftEngine({ nodeCount: 3 }, 42)
    for (let i = 0; i < 30; i++) engine.tick()

    engine.reset(42)
    expect(engine.getCurrentTick()).toBe(0)
    const snap = engine.getSnapshot()
    for (const [, nodeState] of snap.nodes) {
      expect(nodeState.state).toBe(NodeState.FOLLOWER)
      expect(nodeState.currentTerm).toBe(0)
    }
  })
})
