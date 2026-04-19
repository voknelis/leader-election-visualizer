import type { NodeId, RpcPayload, RaftNodeState, LogEntry } from '../types/raft'
import { NodeState, RpcType } from '../types/raft'
import type { RaftEvent } from '../types/simulation'
import type { Prng } from './prng'
import { randomInt } from './prng'

export interface RaftNodeConfig {
  electionTimeoutMin: number
  electionTimeoutMax: number
  heartbeatInterval: number
}

export interface OutgoingMessage {
  to: NodeId
  payload: RpcPayload
}

/**
 * A single Raft node state machine. Pure logic — no I/O, no timers, no framework deps.
 * Call tick() each simulation tick and handleMessage() when a message arrives.
 * Collect outgoing messages and events after each call.
 */
export class RaftNode {
  id: NodeId
  state: NodeState = NodeState.FOLLOWER
  currentTerm = 0
  votedFor: NodeId | null = null
  votesReceived = new Set<NodeId>()
  electionTimeoutTicks: number
  electionTimeoutMax: number
  heartbeatTimeoutTicks = 0
  log: LogEntry[] = []
  commitIndex = 0
  lastApplied = 0
  nextIndex = new Map<NodeId, number>()
  matchIndex = new Map<NodeId, number>()

  private peers: NodeId[] = []
  private outbox: OutgoingMessage[] = []
  private events: RaftEvent[] = []
  private currentTick = 0
  private config: RaftNodeConfig
  private prng: Prng

  constructor(id: NodeId, config: RaftNodeConfig, prng: Prng) {
    this.config = config
    this.prng = prng
    this.id = id
    const timeout = randomInt(prng, config.electionTimeoutMin, config.electionTimeoutMax)
    this.electionTimeoutTicks = timeout
    this.electionTimeoutMax = timeout
  }

  setPeers(peers: NodeId[]): void {
    this.peers = peers.filter(p => p !== this.id)
  }

  /** Advance one tick. Returns outgoing messages to enqueue. */
  tick(tick: number): { messages: OutgoingMessage[]; events: RaftEvent[] } {
    this.currentTick = tick
    this.outbox = []
    this.events = []

    if (this.state === NodeState.CRASHED) {
      return { messages: [], events: [] }
    }

    if (this.state === NodeState.FOLLOWER || this.state === NodeState.CANDIDATE) {
      this.electionTimeoutTicks--
      if (this.electionTimeoutTicks <= 0) {
        this.startElection()
      }
    }

    if (this.state === NodeState.LEADER) {
      this.heartbeatTimeoutTicks--
      if (this.heartbeatTimeoutTicks <= 0) {
        this.sendHeartbeats()
      }
    }

    return { messages: this.outbox, events: this.events }
  }

  /** Handle a delivered message. Returns outgoing replies. */
  handleMessage(payload: RpcPayload, tick: number): { messages: OutgoingMessage[]; events: RaftEvent[] } {
    this.currentTick = tick
    this.outbox = []
    this.events = []

    if (this.state === NodeState.CRASHED) {
      return { messages: [], events: [] }
    }

    switch (payload.type) {
      case RpcType.REQUEST_VOTE:
        this.handleRequestVote(payload)
        break
      case RpcType.REQUEST_VOTE_REPLY:
        this.handleRequestVoteReply(payload)
        break
      case RpcType.APPEND_ENTRIES:
        this.handleAppendEntries(payload)
        break
      case RpcType.APPEND_ENTRIES_REPLY:
        this.handleAppendEntriesReply(payload)
        break
    }

    return { messages: this.outbox, events: this.events }
  }

  crash(): void {
    this.state = NodeState.CRASHED
    this.emitEvent('node_crashed', {})
  }

  restore(): void {
    this.state = NodeState.FOLLOWER
    this.currentTerm = 0
    this.votedFor = null
    this.votesReceived.clear()
    this.resetElectionTimeout()
    this.emitEvent('node_restored', {})
  }

  updateConfig(cfg: Partial<RaftNodeConfig>): void {
    Object.assign(this.config, cfg)
  }

  getState(): RaftNodeState {
    return {
      id: this.id,
      state: this.state,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      votesReceived: new Set(this.votesReceived),
      electionTimeoutTicks: this.electionTimeoutTicks,
      electionTimeoutMax: this.electionTimeoutMax,
      heartbeatTimeoutTicks: this.heartbeatTimeoutTicks,
      log: [...this.log],
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      nextIndex: new Map(this.nextIndex),
      matchIndex: new Map(this.matchIndex),
    }
  }

  /** Snapshot for save/restore */
  snapshot(): RaftNodeSnapshot {
    return {
      id: this.id,
      state: this.state,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      votesReceived: [...this.votesReceived],
      electionTimeoutTicks: this.electionTimeoutTicks,
      electionTimeoutMax: this.electionTimeoutMax,
      heartbeatTimeoutTicks: this.heartbeatTimeoutTicks,
      log: [...this.log],
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
    }
  }

  restoreSnapshot(snap: RaftNodeSnapshot): void {
    this.state = snap.state as NodeState
    this.currentTerm = snap.currentTerm
    this.votedFor = snap.votedFor
    this.votesReceived = new Set(snap.votesReceived)
    this.electionTimeoutTicks = snap.electionTimeoutTicks
    this.electionTimeoutMax = snap.electionTimeoutMax
    this.heartbeatTimeoutTicks = snap.heartbeatTimeoutTicks
    this.log = [...snap.log]
    this.commitIndex = snap.commitIndex
    this.lastApplied = snap.lastApplied
  }

  // --- Private ---

  private startElection(): void {
    this.currentTerm++
    this.state = NodeState.CANDIDATE
    this.votedFor = this.id
    this.votesReceived.clear()
    this.votesReceived.add(this.id)
    this.resetElectionTimeout()

    this.emitEvent('election_timeout', { term: this.currentTerm })
    this.emitEvent('became_candidate', { term: this.currentTerm })

    // Check if single-node cluster — immediately win
    if (this.peers.length === 0) {
      this.becomeLeader()
      return
    }

    // Check quorum with self-vote only (1-node majority)
    if (this.hasQuorum()) {
      this.becomeLeader()
      return
    }

    // Send RequestVote to all peers
    for (const peer of this.peers) {
      this.outbox.push({
        to: peer,
        payload: {
          type: RpcType.REQUEST_VOTE,
          term: this.currentTerm,
          candidateId: this.id,
          lastLogIndex: this.getLastLogIndex(),
          lastLogTerm: this.getLastLogTerm(),
        },
      })
      this.emitEvent('vote_sent', { to: peer, term: this.currentTerm })
    }
  }

  private handleRequestVote(rpc: { type: typeof RpcType.REQUEST_VOTE; term: number; candidateId: NodeId; lastLogIndex: number; lastLogTerm: number }): void {
    // If term is higher, revert to follower
    if (rpc.term > this.currentTerm) {
      this.stepDown(rpc.term)
    }

    let voteGranted = false

    if (rpc.term >= this.currentTerm) {
      const canVote = this.votedFor === null || this.votedFor === rpc.candidateId
      const logOk = this.isLogUpToDate(rpc.lastLogIndex, rpc.lastLogTerm)

      if (canVote && logOk) {
        this.votedFor = rpc.candidateId
        voteGranted = true
        this.resetElectionTimeout()
      }
    }

    this.outbox.push({
      to: rpc.candidateId,
      payload: {
        type: RpcType.REQUEST_VOTE_REPLY,
        term: this.currentTerm,
        voteGranted,
      },
    })
  }

  private handleRequestVoteReply(rpc: { type: typeof RpcType.REQUEST_VOTE_REPLY; term: number; voteGranted: boolean }): void {
    if (rpc.term > this.currentTerm) {
      this.stepDown(rpc.term)
      return
    }

    if (this.state !== NodeState.CANDIDATE || rpc.term !== this.currentTerm) {
      return
    }

    if (rpc.voteGranted) {
      // We don't have the voter's ID in the reply, use a unique placeholder per reply
      // In a real Raft the vote reply would contain the voter's ID.
      // For visualization we track votes by simply counting.
      // We'll use a workaround: engine patches voter ID before delivery.
      this.emitEvent('vote_received', { term: this.currentTerm })
    }

    if (this.hasQuorum()) {
      this.becomeLeader()
    }
  }

  /** Called by the engine to add voter ID context (since Raft reply doesn't carry it) */
  addVote(voterId: NodeId): void {
    this.votesReceived.add(voterId)
  }

  private handleAppendEntries(rpc: { type: typeof RpcType.APPEND_ENTRIES; term: number; leaderId: NodeId; entries: LogEntry[]; prevLogIndex: number; prevLogTerm: number; leaderCommit: number }): void {
    if (rpc.term > this.currentTerm) {
      this.stepDown(rpc.term)
    }

    if (rpc.term < this.currentTerm) {
      this.outbox.push({
        to: rpc.leaderId,
        payload: {
          type: RpcType.APPEND_ENTRIES_REPLY,
          term: this.currentTerm,
          success: false,
        },
      })
      return
    }

    // Valid leader heartbeat/append — reset timer, acknowledge leader
    if (this.state === NodeState.CANDIDATE) {
      this.state = NodeState.FOLLOWER
      this.emitEvent('reverted_to_follower', { reason: 'received_append_entries', term: this.currentTerm })
    }
    this.resetElectionTimeout()

    // Simplified: accept heartbeats, update commit index
    if (rpc.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(rpc.leaderCommit, this.log.length)
    }

    this.outbox.push({
      to: rpc.leaderId,
      payload: {
        type: RpcType.APPEND_ENTRIES_REPLY,
        term: this.currentTerm,
        success: true,
      },
    })
  }

  private handleAppendEntriesReply(_rpc: { type: typeof RpcType.APPEND_ENTRIES_REPLY; term: number; success: boolean }): void {
    if (_rpc.term > this.currentTerm) {
      this.stepDown(_rpc.term)
    }
    // Stretch goal: update nextIndex/matchIndex for log replication
  }

  private becomeLeader(): void {
    this.state = NodeState.LEADER
    this.heartbeatTimeoutTicks = 1 // Send heartbeat immediately next tick
    this.emitEvent('became_leader', { term: this.currentTerm })

    // Initialize nextIndex/matchIndex
    for (const peer of this.peers) {
      this.nextIndex.set(peer, this.getLastLogIndex() + 1)
      this.matchIndex.set(peer, 0)
    }
  }

  private sendHeartbeats(): void {
    this.heartbeatTimeoutTicks = this.config.heartbeatInterval
    for (const peer of this.peers) {
      this.outbox.push({
        to: peer,
        payload: {
          type: RpcType.APPEND_ENTRIES,
          term: this.currentTerm,
          leaderId: this.id,
          entries: [],
          prevLogIndex: this.getLastLogIndex(),
          prevLogTerm: this.getLastLogTerm(),
          leaderCommit: this.commitIndex,
        },
      })
    }
    this.emitEvent('heartbeat_sent', { term: this.currentTerm, peerCount: this.peers.length })
  }

  private stepDown(newTerm: number): void {
    this.currentTerm = newTerm
    this.state = NodeState.FOLLOWER
    this.votedFor = null
    this.votesReceived.clear()
    this.resetElectionTimeout()
    this.emitEvent('reverted_to_follower', { term: newTerm })
    this.emitEvent('term_incremented', { term: newTerm })
  }

  private resetElectionTimeout(): void {
    const timeout = randomInt(this.prng, this.config.electionTimeoutMin, this.config.electionTimeoutMax)
    this.electionTimeoutTicks = timeout
    this.electionTimeoutMax = timeout
  }

  private getLastLogIndex(): number {
    return this.log.length
  }

  private getLastLogTerm(): number {
    return this.log.length > 0 ? this.log[this.log.length - 1].term : 0
  }

  private isLogUpToDate(lastLogIndex: number, lastLogTerm: number): boolean {
    const myLastTerm = this.getLastLogTerm()
    if (lastLogTerm !== myLastTerm) return lastLogTerm > myLastTerm
    return lastLogIndex >= this.getLastLogIndex()
  }

  private hasQuorum(): boolean {
    const totalNodes = this.peers.length + 1
    const majority = Math.floor(totalNodes / 2) + 1
    return this.votesReceived.size >= majority
  }

  private emitEvent(type: RaftEvent['type'], detail: Record<string, unknown>): void {
    this.events.push({ tick: this.currentTick, type, nodeId: this.id, detail })
  }
}

export interface RaftNodeSnapshot {
  id: NodeId
  state: string
  currentTerm: number
  votedFor: NodeId | null
  votesReceived: NodeId[]
  electionTimeoutTicks: number
  electionTimeoutMax: number
  heartbeatTimeoutTicks: number
  log: LogEntry[]
  commitIndex: number
  lastApplied: number
}
