import type { NodeId } from '../types/raft'

/**
 * Tracks which node pairs cannot communicate.
 * Partitions are stored bidirectionally: blocking N1→N2 also blocks N2→N1.
 */
export class NetworkPartition {
  private blocked = new Set<string>()

  private key(a: NodeId, b: NodeId): string {
    return `${a}:${b}`
  }

  block(a: NodeId, b: NodeId): void {
    this.blocked.add(this.key(a, b))
    this.blocked.add(this.key(b, a))
  }

  unblock(a: NodeId, b: NodeId): void {
    this.blocked.delete(this.key(a, b))
    this.blocked.delete(this.key(b, a))
  }

  isBlocked(from: NodeId, to: NodeId): boolean {
    return this.blocked.has(this.key(from, to))
  }

  /** Replace all partitions with a new partition between two groups */
  setPartition(groupA: NodeId[], groupB: NodeId[]): void {
    this.clear()
    for (const a of groupA) {
      for (const b of groupB) {
        this.block(a, b)
      }
    }
  }

  clear(): void {
    this.blocked.clear()
  }

  toSet(): Set<string> {
    return new Set(this.blocked)
  }

  fromSet(s: Set<string>): void {
    this.blocked = new Set(s)
  }
}
