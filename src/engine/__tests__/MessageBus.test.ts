import { describe, it, expect } from 'vitest'
import { MessageBus } from '../MessageBus'
import { NetworkPartition } from '../NetworkPartition'
import { createPrng } from '../prng'
import { RpcType } from '../../types/raft'

function makeBus(opts: { delayMin?: number; delayMax?: number; lossProbability?: number } = {}) {
  const partition = new NetworkPartition()
  const prng = createPrng(42)
  const bus = new MessageBus(
    {
      messageDelayMin: opts.delayMin ?? 2,
      messageDelayMax: opts.delayMax ?? 2,
      messageLossProbability: opts.lossProbability ?? 0,
    },
    partition,
    prng,
  )
  return { bus, partition, prng }
}

const samplePayload = {
  type: RpcType.REQUEST_VOTE as typeof RpcType.REQUEST_VOTE,
  term: 1,
  candidateId: 'N1',
  lastLogIndex: 0,
  lastLogTerm: 0,
}

describe('MessageBus', () => {
  it('delivers message at correct tick (sentAt + delay)', () => {
    const { bus } = makeBus({ delayMin: 3, delayMax: 3 })
    bus.enqueue('N1', 'N2', samplePayload, 5)

    expect(bus.tick(6)).toEqual([]) // too early
    expect(bus.tick(7)).toEqual([]) // still early
    const delivered = bus.tick(8) // sentAt=5 + delay=3
    expect(delivered.length).toBe(1)
    expect(delivered[0].from).toBe('N1')
    expect(delivered[0].to).toBe('N2')
  })

  it('updates progress correctly', () => {
    const { bus } = makeBus({ delayMin: 4, delayMax: 4 })
    bus.enqueue('N1', 'N2', samplePayload, 0)

    bus.tick(2)
    const msgs = bus.getMessages()
    expect(msgs.length).toBe(1)
    expect(msgs[0].progress).toBe(0.5) // 2/4
  })

  it('drops messages based on loss probability', () => {
    // With loss=1.0, every message should be dropped
    const partition = new NetworkPartition()
    const prng = createPrng(42)
    const bus = new MessageBus(
      { messageDelayMin: 1, messageDelayMax: 1, messageLossProbability: 1.0 },
      partition,
      prng,
    )

    bus.enqueue('N1', 'N2', samplePayload, 0)
    const delivered = bus.tick(1)
    expect(delivered).toEqual([])
  })

  it('does not deliver partitioned messages', () => {
    const { bus, partition } = makeBus({ delayMin: 1, delayMax: 1 })
    partition.block('N1', 'N2')
    bus.enqueue('N1', 'N2', samplePayload, 0)

    const delivered = bus.tick(1)
    expect(delivered).toEqual([])
  })

  it('delivers messages after partition is healed', () => {
    const { bus, partition } = makeBus({ delayMin: 2, delayMax: 2 })
    partition.block('N1', 'N2')
    bus.enqueue('N1', 'N2', samplePayload, 0)

    // Message sent while partitioned
    bus.tick(1)
    partition.unblock('N1', 'N2')
    // But it was already marked as in-flight — delivery check happens at deliverAt
    const delivered = bus.tick(2)
    // Since partition was active at enqueue time but check is at delivery time,
    // and we unblocked before delivery, it should deliver
    expect(delivered.length).toBe(1)
  })

  it('snapshot and restore preserves messages', () => {
    const { bus } = makeBus({ delayMin: 5, delayMax: 5 })
    bus.enqueue('N1', 'N2', samplePayload, 0)
    bus.tick(2)

    const snap = bus.snapshot()
    bus.clear()
    expect(bus.getMessages()).toEqual([])

    bus.restore(snap)
    expect(bus.getMessages().length).toBe(1)
    expect(bus.getMessages()[0].progress).toBe(0.4) // 2/5
  })
})
