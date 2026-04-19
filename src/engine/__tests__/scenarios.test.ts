import { describe, it, expect } from 'vitest'
import { NodeState } from '../../types/raft'
import type { SimulationSnapshot } from '../../types/simulation'
import { DEFAULT_CONFIG } from '../../types/simulation'
import { scenarios, normalElectionScenario, splitVoteScenario, leaderCrashScenario, networkPartitionScenario } from '../scenarios'
import { RaftEngine } from '../RaftEngine'

function makeSnapshot(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    tick: 0,
    nodes: new Map(),
    messages: [],
    config: { ...DEFAULT_CONFIG },
    events: [],
    ...overrides,
  }
}

function nodesFromStates(states: Record<string, string>): SimulationSnapshot['nodes'] {
  const map = new Map()
  for (const [id, state] of Object.entries(states)) {
    map.set(id, {
      id,
      state,
      currentTerm: 1,
      votedFor: null,
      votesReceived: new Set(),
      electionTimeoutTicks: 10,
      electionTimeoutMax: 10,
      heartbeatTimeoutTicks: 5,
      log: [],
      commitIndex: 0,
      lastApplied: 0,
      nextIndex: new Map(),
      matchIndex: new Map(),
    })
  }
  return map
}

describe('scenario definitions', () => {
  it('scenarios array exports all four scenarios', () => {
    expect(scenarios).toHaveLength(4)
    const ids = scenarios.map(s => s.id)
    expect(ids).toContain('normal-election')
    expect(ids).toContain('split-vote')
    expect(ids).toContain('leader-crash')
    expect(ids).toContain('network-partition')
  })

  for (const scenario of scenarios) {
    describe(scenario.title, () => {
      it('has non-empty id, title, description, and at least 2 steps', () => {
        expect(scenario.id).toBeTruthy()
        expect(scenario.title).toBeTruthy()
        expect(scenario.description).toBeTruthy()
        expect(scenario.steps.length).toBeGreaterThanOrEqual(2)
      })

      it('every step has unique id and non-empty title + narration', () => {
        const ids = scenario.steps.map(s => s.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const step of scenario.steps) {
          expect(step.title).toBeTruthy()
          expect(step.narration).toBeTruthy()
        }
      })

      it('every step has either autoRunTicks, advanceCondition, or engineActions', () => {
        for (const step of scenario.steps) {
          const hasWork = (step.autoRunTicks ?? 0) > 0
            || !!step.advanceCondition
            || (step.engineActions?.length ?? 0) > 0
          expect(hasWork).toBe(true)
        }
      })
    })
  }
})

describe('normalElection advanceConditions', () => {
  it('step "timeout-fires" triggers when a candidate appears', () => {
    const step = normalElectionScenario.steps.find(s => s.id === 'timeout-fires')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.CANDIDATE, N2: NodeState.FOLLOWER, N3: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })

  it('step "timeout-fires" does not trigger with only followers', () => {
    const step = normalElectionScenario.steps.find(s => s.id === 'timeout-fires')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.FOLLOWER, N2: NodeState.FOLLOWER, N3: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(false)
  })

  it('step "leader-elected" triggers when a leader exists', () => {
    const step = normalElectionScenario.steps.find(s => s.id === 'leader-elected')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.LEADER, N2: NodeState.FOLLOWER, N3: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })
})

describe('splitVote advanceConditions', () => {
  it('step "two-candidates" triggers with at least 1 candidate', () => {
    const step = splitVoteScenario.steps.find(s => s.id === 'two-candidates')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.CANDIDATE, N2: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })

  it('step "reelection" triggers when leader emerges', () => {
    const step = splitVoteScenario.steps.find(s => s.id === 'reelection')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.LEADER, N2: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })
})

describe('leaderCrash advanceConditions', () => {
  it('step "stable" triggers when leader exists', () => {
    const step = leaderCrashScenario.steps.find(s => s.id === 'stable')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.LEADER, N2: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })

  it('step "timeout-detection" triggers when candidate appears', () => {
    const step = leaderCrashScenario.steps.find(s => s.id === 'timeout-detection')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.CRASHED, N2: NodeState.CANDIDATE }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })

  it('step "new-leader" requires both a leader and a crashed node', () => {
    const step = leaderCrashScenario.steps.find(s => s.id === 'new-leader')!
    const both = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.CRASHED, N2: NodeState.LEADER }),
    })
    expect(step.advanceCondition!(both)).toBe(true)

    const leaderOnly = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.FOLLOWER, N2: NodeState.LEADER }),
    })
    expect(step.advanceCondition!(leaderOnly)).toBe(false)
  })
})

describe('networkPartition advanceConditions', () => {
  it('step "stable-5" triggers when leader exists', () => {
    const step = networkPartitionScenario.steps.find(s => s.id === 'stable-5')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.LEADER, N2: NodeState.FOLLOWER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })

  it('step "majority-elects" triggers when at least 1 leader appears', () => {
    const step = networkPartitionScenario.steps.find(s => s.id === 'majority-elects')!
    const snap = makeSnapshot({
      nodes: nodesFromStates({ N1: NodeState.LEADER, N2: NodeState.FOLLOWER, N3: NodeState.LEADER }),
    })
    expect(step.advanceCondition!(snap)).toBe(true)
  })
})

describe('scenario engine integration', () => {
  it('normalElection reaches a leader within 50 ticks', () => {
    const engine = new RaftEngine({ nodeCount: 3 }, 42)
    let leaderFound = false
    for (let i = 0; i < 50; i++) {
      const snap = engine.tick()
      if ([...snap.nodes.values()].some(n => n.state === NodeState.LEADER)) {
        leaderFound = true
        break
      }
    }
    expect(leaderFound).toBe(true)
  })

  it('leaderCrash: crashing the leader eventually produces a new one', () => {
    const engine = new RaftEngine({ nodeCount: 3 }, 42)
    // elect first leader
    for (let i = 0; i < 50; i++) engine.tick()
    const snap = engine.getSnapshot()
    const leaderId = [...snap.nodes.entries()].find(([, n]) => n.state === NodeState.LEADER)?.[0]
    expect(leaderId).toBeTruthy()

    engine.crashNode(leaderId!)
    let newLeader = false
    for (let i = 0; i < 60; i++) {
      const s = engine.tick()
      const leaders = [...s.nodes.values()].filter(n => n.state === NodeState.LEADER)
      if (leaders.length > 0 && leaders[0].id !== leaderId) {
        newLeader = true
        break
      }
    }
    expect(newLeader).toBe(true)
  })
})
