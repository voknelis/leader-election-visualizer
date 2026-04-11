import { describe, it, expect } from 'vitest'
import { RaftNode } from '../RaftNode'
import { NodeState, RpcType } from '../../types/raft'
import { createPrng } from '../prng'

function makeNode(id = 'N1', seed = 1) {
  const prng = createPrng(seed)
  const node = new RaftNode(id, {
    electionTimeoutMin: 10,
    electionTimeoutMax: 20,
    heartbeatInterval: 5,
  }, prng)
  node.setPeers(['N2', 'N3'])
  return node
}

describe('RaftNode', () => {
  it('starts as follower', () => {
    const node = makeNode()
    expect(node.state).toBe(NodeState.FOLLOWER)
    expect(node.currentTerm).toBe(0)
    expect(node.votedFor).toBe(null)
  })

  it('becomes candidate after election timeout', () => {
    const node = makeNode()
    // Tick until election fires
    for (let i = 1; i <= 25; i++) {
      const { events } = node.tick(i)
      if (node.state === NodeState.CANDIDATE) {
        expect(node.currentTerm).toBe(1)
        expect(node.votedFor).toBe('N1')
        expect(node.votesReceived.has('N1')).toBe(true)
        const becameCandidate = events.find(e => e.type === 'became_candidate')
        expect(becameCandidate).toBeDefined()
        return
      }
    }
    throw new Error('Node never became candidate within 25 ticks')
  })

  it('sends RequestVote to all peers on becoming candidate', () => {
    const node = makeNode()
    let voteMessages: any[] = []
    for (let i = 1; i <= 25; i++) {
      const { messages } = node.tick(i)
      if (messages.length > 0) {
        voteMessages = messages
        break
      }
    }
    expect(voteMessages.length).toBe(2) // one per peer
    expect(voteMessages[0].payload.type).toBe(RpcType.REQUEST_VOTE)
    expect(voteMessages[0].payload.candidateId).toBe('N1')
  })

  it('grants vote when eligible', () => {
    const node = makeNode('N2', 2)
    const { messages } = node.handleMessage({
      type: RpcType.REQUEST_VOTE,
      term: 1,
      candidateId: 'N1',
      lastLogIndex: 0,
      lastLogTerm: 0,
    }, 1)

    expect(messages.length).toBe(1)
    expect(messages[0].payload.type).toBe(RpcType.REQUEST_VOTE_REPLY)
    expect((messages[0].payload as any).voteGranted).toBe(true)
    expect(node.votedFor).toBe('N1')
  })

  it('rejects vote if already voted for different candidate this term', () => {
    const node = makeNode('N2', 2)
    // Vote for N1 first
    node.handleMessage({
      type: RpcType.REQUEST_VOTE,
      term: 1,
      candidateId: 'N1',
      lastLogIndex: 0,
      lastLogTerm: 0,
    }, 1)

    // Try N3 same term
    const { messages } = node.handleMessage({
      type: RpcType.REQUEST_VOTE,
      term: 1,
      candidateId: 'N3',
      lastLogIndex: 0,
      lastLogTerm: 0,
    }, 2)

    expect((messages[0].payload as any).voteGranted).toBe(false)
  })

  it('rejects vote for stale term', () => {
    const node = makeNode('N2', 2)
    // Manually set term
    node.handleMessage({
      type: RpcType.APPEND_ENTRIES,
      term: 5,
      leaderId: 'N1',
      entries: [],
      prevLogIndex: 0,
      prevLogTerm: 0,
      leaderCommit: 0,
    }, 1)

    const { messages } = node.handleMessage({
      type: RpcType.REQUEST_VOTE,
      term: 3,
      candidateId: 'N3',
      lastLogIndex: 0,
      lastLogTerm: 0,
    }, 2)

    expect((messages[0].payload as any).voteGranted).toBe(false)
  })

  it('becomes leader after quorum votes', () => {
    const node = makeNode('N1', 1)
    // Force become candidate
    for (let i = 1; i <= 25; i++) {
      node.tick(i)
      if (node.state === NodeState.CANDIDATE) break
    }
    expect(node.state).toBe(NodeState.CANDIDATE)

    // Add vote from N2
    node.addVote('N2')
    node.handleMessage({
      type: RpcType.REQUEST_VOTE_REPLY,
      term: node.currentTerm,
      voteGranted: true,
    }, 26)

    // N1 voted for self + N2 = 2 out of 3 = majority
    expect(node.state).toBe(NodeState.LEADER)
  })

  it('reverts to follower on higher term message', () => {
    const node = makeNode('N1', 1)
    // Force to candidate
    for (let i = 1; i <= 25; i++) {
      node.tick(i)
      if (node.state === NodeState.CANDIDATE) break
    }

    node.handleMessage({
      type: RpcType.APPEND_ENTRIES,
      term: 10,
      leaderId: 'N3',
      entries: [],
      prevLogIndex: 0,
      prevLogTerm: 0,
      leaderCommit: 0,
    }, 30)

    expect(node.state).toBe(NodeState.FOLLOWER)
    expect(node.currentTerm).toBe(10)
    expect(node.votedFor).toBe(null)
  })

  it('leader sends heartbeats at configured interval', () => {
    const node = makeNode('N1', 1)
    // Force to leader state
    for (let i = 1; i <= 25; i++) {
      node.tick(i)
      if (node.state === NodeState.CANDIDATE) break
    }
    node.addVote('N2')
    node.handleMessage({
      type: RpcType.REQUEST_VOTE_REPLY,
      term: node.currentTerm,
      voteGranted: true,
    }, 26)
    expect(node.state).toBe(NodeState.LEADER)

    // Tick until heartbeat fires
    let heartbeatMessages: any[] = []
    for (let i = 27; i <= 35; i++) {
      const { messages } = node.tick(i)
      if (messages.length > 0) {
        heartbeatMessages = messages
        break
      }
    }

    expect(heartbeatMessages.length).toBe(2) // one per peer
    expect(heartbeatMessages[0].payload.type).toBe(RpcType.APPEND_ENTRIES)
    expect(heartbeatMessages[0].payload.entries).toEqual([])
  })

  it('follower resets election timeout on heartbeat', () => {
    const node = makeNode('N2', 2)
    // Tick 8 times to significantly reduce timeout
    for (let i = 1; i <= 8; i++) node.tick(i)
    const timeoutBefore = node.electionTimeoutTicks
    expect(timeoutBefore).toBeLessThanOrEqual(12) // was reduced from initial

    node.handleMessage({
      type: RpcType.APPEND_ENTRIES,
      term: 1,
      leaderId: 'N1',
      entries: [],
      prevLogIndex: 0,
      prevLogTerm: 0,
      leaderCommit: 0,
    }, 9)

    // Timeout was reset — should now be within [min, max] range again
    expect(node.electionTimeoutTicks).toBeGreaterThanOrEqual(10)
    expect(node.electionTimeoutTicks).toBeLessThanOrEqual(20)
  })

  it('crash stops all processing', () => {
    const node = makeNode()
    node.crash()
    expect(node.state).toBe(NodeState.CRASHED)

    const { messages, events } = node.tick(1)
    expect(messages).toEqual([])
    expect(events).toEqual([])

    const result = node.handleMessage({
      type: RpcType.REQUEST_VOTE,
      term: 1,
      candidateId: 'N2',
      lastLogIndex: 0,
      lastLogTerm: 0,
    }, 2)
    expect(result.messages).toEqual([])
  })

  it('restore returns to fresh follower', () => {
    const node = makeNode()
    // Become candidate
    for (let i = 1; i <= 25; i++) {
      node.tick(i)
      if (node.state === NodeState.CANDIDATE) break
    }
    node.crash()
    node.restore()

    expect(node.state).toBe(NodeState.FOLLOWER)
    expect(node.currentTerm).toBe(0)
    expect(node.votedFor).toBe(null)
  })
})
