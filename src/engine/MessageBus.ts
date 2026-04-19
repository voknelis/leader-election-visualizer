import type { NodeId, RpcPayload, InFlightMessage } from '../types/raft'
import type { NetworkPartition } from './NetworkPartition'
import type { Prng } from './prng'
import { randomInt } from './prng'

let msgCounter = 0

export interface MessageBusConfig {
  messageDelayMin: number
  messageDelayMax: number
  messageLossProbability: number
}

export class MessageBus {
  private messages: InFlightMessage[] = []
  private config: MessageBusConfig
  private partition: NetworkPartition
  private prng: Prng

  constructor(config: MessageBusConfig, partition: NetworkPartition, prng: Prng) {
    this.config = config
    this.partition = partition
    this.prng = prng
  }

  enqueue(from: NodeId, to: NodeId, payload: RpcPayload, currentTick: number): void {
    const delay = randomInt(this.prng, this.config.messageDelayMin, this.config.messageDelayMax)
    const dropped = this.prng() < this.config.messageLossProbability
    this.messages.push({
      id: `msg-${++msgCounter}`,
      from,
      to,
      payload,
      sentAt: currentTick,
      deliverAt: currentTick + Math.max(delay, 1),
      progress: 0,
      dropped,
    })
  }

  /**
   * Advance message positions. Returns messages ready for delivery (not dropped, not partitioned).
   */
  tick(currentTick: number): InFlightMessage[] {
    const toDeliver: InFlightMessage[] = []
    const remaining: InFlightMessage[] = []

    for (const msg of this.messages) {
      const total = msg.deliverAt - msg.sentAt
      msg.progress = Math.min((currentTick - msg.sentAt) / total, 1)

      if (currentTick >= msg.deliverAt) {
        if (!msg.dropped && !this.partition.isBlocked(msg.from, msg.to)) {
          toDeliver.push(msg)
        }
        // Dropped or partitioned messages are removed after they reach destination visually
        // We keep them one extra tick so they can flash at target, then discard
      } else {
        remaining.push(msg)
      }
    }

    // Keep in-flight; delivered ones get removed
    this.messages = remaining
    // Also keep dropped/partitioned messages until they visually arrive
    // (already removed above since we only push non-delivered to remaining)

    return toDeliver
  }

  /** All in-flight messages including dropped ones (for visualization) */
  getMessages(): InFlightMessage[] {
    return this.messages
  }

  updateConfig(cfg: Partial<MessageBusConfig>): void {
    Object.assign(this.config, cfg)
  }

  clear(): void {
    this.messages = []
  }

  /** Deep clone for snapshot save/restore */
  snapshot(): InFlightMessage[] {
    return this.messages.map(m => ({ ...m }))
  }

  restore(msgs: InFlightMessage[]): void {
    this.messages = msgs.map(m => ({ ...m }))
  }
}
