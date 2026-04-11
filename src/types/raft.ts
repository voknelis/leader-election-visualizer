export type NodeId = string // 'N1'…'N9'

export const NodeState = {
  FOLLOWER: 'follower',
  CANDIDATE: 'candidate',
  LEADER: 'leader',
  CRASHED: 'crashed',
} as const
export type NodeState = (typeof NodeState)[keyof typeof NodeState]

export const RpcType = {
  REQUEST_VOTE: 'RequestVote',
  REQUEST_VOTE_REPLY: 'RequestVoteReply',
  APPEND_ENTRIES: 'AppendEntries',
  APPEND_ENTRIES_REPLY: 'AppendEntriesReply',
} as const
export type RpcType = (typeof RpcType)[keyof typeof RpcType]

export interface LogEntry {
  term: number
  index: number
  command: string
}

export interface RequestVoteRpc {
  type: typeof RpcType.REQUEST_VOTE
  term: number
  candidateId: NodeId
  lastLogIndex: number
  lastLogTerm: number
}

export interface RequestVoteReplyRpc {
  type: typeof RpcType.REQUEST_VOTE_REPLY
  term: number
  voteGranted: boolean
}

export interface AppendEntriesRpc {
  type: typeof RpcType.APPEND_ENTRIES
  term: number
  leaderId: NodeId
  entries: LogEntry[]
  prevLogIndex: number
  prevLogTerm: number
  leaderCommit: number
}

export interface AppendEntriesReplyRpc {
  type: typeof RpcType.APPEND_ENTRIES_REPLY
  term: number
  success: boolean
}

export type RpcPayload =
  | RequestVoteRpc
  | RequestVoteReplyRpc
  | AppendEntriesRpc
  | AppendEntriesReplyRpc

export interface InFlightMessage {
  id: string
  from: NodeId
  to: NodeId
  payload: RpcPayload
  sentAt: number
  deliverAt: number
  /** 0→1 visual interpolation */
  progress: number
  /** Still travels visually, shown faded — pedagogical */
  dropped: boolean
}

export interface RaftNodeState {
  id: NodeId
  state: NodeState
  currentTerm: number
  votedFor: NodeId | null
  votesReceived: Set<NodeId>
  /** Ticks until election timeout fires */
  electionTimeoutTicks: number
  /** Original randomized value — for drawing the depletion arc */
  electionTimeoutMax: number
  /** Ticks until next heartbeat (leader only) */
  heartbeatTimeoutTicks: number
  log: LogEntry[]
  commitIndex: number
  lastApplied: number
  nextIndex: Map<NodeId, number>
  matchIndex: Map<NodeId, number>
}
