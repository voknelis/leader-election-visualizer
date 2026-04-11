import type { NodeId, RpcPayload, InFlightMessage } from '../types/raft'
import { RpcType } from '../types/raft'
import type { SimulationConfig, SimulationSnapshot, RaftEvent } from '../types/simulation'
import { DEFAULT_CONFIG } from '../types/simulation'
import { RaftNode } from './RaftNode'
import type { RaftNodeSnapshot } from './RaftNode'
import { MessageBus } from './MessageBus'
import { NetworkPartition } from './NetworkPartition'
import { createPrng } from './prng'
import type { Prng } from './prng'

export interface EngineSnapshot {
  tick: number
  nodes: RaftNodeSnapshot[]
  messages: InFlightMessage[]
  partitions: string[]
}

export class RaftEngine {
  private nodes = new Map<NodeId, RaftNode>()
  private bus: MessageBus
  private partition: NetworkPartition
  private prng: Prng
  private currentTick = 0
  private config: SimulationConfig

  constructor(config: Partial<SimulationConfig> = {}, seed = 42) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.prng = createPrng(seed)
    this.partition = new NetworkPartition()
    this.bus = new MessageBus(
      {
        messageDelayMin: this.config.messageDelayMin,
        messageDelayMax: this.config.messageDelayMax,
        messageLossProbability: this.config.messageLossProbability,
      },
      this.partition,
      this.prng,
    )

    // Create initial nodes
    for (let i = 1; i <= this.config.nodeCount; i++) {
      this.addNode(`N${i}`)
    }
    this.updatePeers()
  }

  /** Advance simulation by one tick. Returns snapshot of the current state. */
  tick(): SimulationSnapshot {
    this.currentTick++
    const allEvents: RaftEvent[] = []

    // 1. Deliver messages that have arrived
    const delivered = this.bus.tick(this.currentTick)
    for (const msg of delivered) {
      const node = this.nodes.get(msg.to)
      if (!node) continue

      // Patch voter ID into RequestVoteReply so the candidate can track who voted
      if (msg.payload.type === RpcType.REQUEST_VOTE_REPLY && msg.payload.voteGranted) {
        const candidate = this.nodes.get(msg.to)
        if (candidate) {
          candidate.addVote(msg.from)
        }
      }

      const { messages, events } = node.handleMessage(msg.payload, this.currentTick)
      allEvents.push(...events)

      // Enqueue outgoing messages from handling
      for (const out of messages) {
        this.bus.enqueue(msg.to, out.to, out.payload, this.currentTick)
      }
    }

    // 2. Tick all nodes
    for (const [nodeId, node] of this.nodes) {
      const { messages, events } = node.tick(this.currentTick)
      allEvents.push(...events)

      for (const out of messages) {
        this.bus.enqueue(nodeId, out.to, out.payload, this.currentTick)
      }
    }

    return this.getSnapshot(allEvents)
  }

  getSnapshot(events: RaftEvent[] = []): SimulationSnapshot {
    const nodeMap = new Map<NodeId, ReturnType<RaftNode['getState']>>()
    for (const [id, node] of this.nodes) {
      nodeMap.set(id, node.getState())
    }

    return {
      tick: this.currentTick,
      nodes: nodeMap,
      messages: this.bus.getMessages().map(m => ({ ...m })),
      config: { ...this.config, partitions: this.partition.toSet() },
      events,
    }
  }

  // --- Mutation API ---

  addNode(id?: NodeId): NodeId {
    const nodeId = id ?? `N${this.nodes.size + 1}`
    const node = new RaftNode(
      nodeId,
      {
        electionTimeoutMin: this.config.electionTimeoutMin,
        electionTimeoutMax: this.config.electionTimeoutMax,
        heartbeatInterval: this.config.heartbeatInterval,
      },
      this.prng,
    )
    this.nodes.set(nodeId, node)
    this.updatePeers()
    return nodeId
  }

  removeNode(id: NodeId): void {
    this.nodes.delete(id)
    this.updatePeers()
  }

  crashNode(id: NodeId): void {
    this.nodes.get(id)?.crash()
  }

  restoreNode(id: NodeId): void {
    this.nodes.get(id)?.restore()
  }

  setPartition(groupA: NodeId[], groupB: NodeId[]): void {
    this.partition.setPartition(groupA, groupB)
  }

  clearPartition(): void {
    this.partition.clear()
  }

  updateConfig(cfg: Partial<SimulationConfig>): void {
    Object.assign(this.config, cfg)
    this.bus.updateConfig({
      messageDelayMin: this.config.messageDelayMin,
      messageDelayMax: this.config.messageDelayMax,
      messageLossProbability: this.config.messageLossProbability,
    })
    for (const node of this.nodes.values()) {
      node.updateConfig({
        electionTimeoutMin: this.config.electionTimeoutMin,
        electionTimeoutMax: this.config.electionTimeoutMax,
        heartbeatInterval: this.config.heartbeatInterval,
      })
    }
  }

  getNodeIds(): NodeId[] {
    return [...this.nodes.keys()]
  }

  getCurrentTick(): number {
    return this.currentTick
  }

  /** Save full engine state for step-by-step restore */
  saveSnapshot(): EngineSnapshot {
    return {
      tick: this.currentTick,
      nodes: [...this.nodes.values()].map(n => n.snapshot()),
      messages: this.bus.snapshot(),
      partitions: [...this.partition.toSet()],
    }
  }

  /** Restore engine state from a snapshot */
  restoreSnapshot(snap: EngineSnapshot): void {
    this.currentTick = snap.tick
    for (const nodeSnap of snap.nodes) {
      const node = this.nodes.get(nodeSnap.id)
      if (node) node.restoreSnapshot(nodeSnap)
    }
    this.bus.restore(snap.messages)
    this.partition.fromSet(new Set(snap.partitions))
  }

  reset(seed?: number): void {
    if (seed !== undefined) {
      this.prng = createPrng(seed)
    }
    this.currentTick = 0
    this.bus.clear()
    this.partition.clear()
    this.nodes.clear()
    for (let i = 1; i <= this.config.nodeCount; i++) {
      this.addNode(`N${i}`)
    }
    this.updatePeers()
  }

  private updatePeers(): void {
    const ids = [...this.nodes.keys()]
    for (const node of this.nodes.values()) {
      node.setPeers(ids)
    }
  }
}
