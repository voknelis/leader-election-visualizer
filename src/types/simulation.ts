import type { NodeId, RaftNodeState, InFlightMessage } from './raft'

export interface SimulationConfig {
  nodeCount: number
  electionTimeoutMin: number
  electionTimeoutMax: number
  heartbeatInterval: number
  messageDelayMin: number
  messageDelayMax: number
  messageLossProbability: number
  /** Serialized as "N1:N2" meaning N1 cannot reach N2 (bidirectional pairs stored both ways) */
  partitions: Set<string>
}

export const DEFAULT_CONFIG: SimulationConfig = {
  nodeCount: 5,
  electionTimeoutMin: 15,
  electionTimeoutMax: 30,
  heartbeatInterval: 5,
  messageDelayMin: 3,
  messageDelayMax: 4,
  messageLossProbability: 0,
  partitions: new Set(),
}

export type RaftEventType =
  | 'election_timeout'
  | 'became_candidate'
  | 'vote_sent'
  | 'vote_received'
  | 'became_leader'
  | 'heartbeat_sent'
  | 'message_dropped'
  | 'term_incremented'
  | 'reverted_to_follower'
  | 'node_crashed'
  | 'node_restored'
  | 'partition_created'
  | 'partition_healed'
  | 'split_vote_detected'

export interface RaftEvent {
  tick: number
  type: RaftEventType
  nodeId: NodeId
  detail: Record<string, unknown>
}

export interface SimulationSnapshot {
  tick: number
  nodes: Map<NodeId, RaftNodeState>
  messages: InFlightMessage[]
  config: SimulationConfig
  events: RaftEvent[]
}
