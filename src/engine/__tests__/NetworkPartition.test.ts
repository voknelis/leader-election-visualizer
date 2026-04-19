import { describe, it, expect } from 'vitest'
import { NetworkPartition } from '../NetworkPartition'

describe('NetworkPartition', () => {
  it('starts with no blocked pairs', () => {
    const p = new NetworkPartition()
    expect(p.isBlocked('N1', 'N2')).toBe(false)
  })

  it('block is bidirectional', () => {
    const p = new NetworkPartition()
    p.block('N1', 'N2')
    expect(p.isBlocked('N1', 'N2')).toBe(true)
    expect(p.isBlocked('N2', 'N1')).toBe(true)
    expect(p.isBlocked('N1', 'N3')).toBe(false)
  })

  it('unblock removes both directions', () => {
    const p = new NetworkPartition()
    p.block('N1', 'N2')
    p.unblock('N1', 'N2')
    expect(p.isBlocked('N1', 'N2')).toBe(false)
    expect(p.isBlocked('N2', 'N1')).toBe(false)
  })

  it('setPartition blocks cross-group pairs and clears previous', () => {
    const p = new NetworkPartition()
    p.block('N1', 'N5')
    p.setPartition(['N1', 'N2'], ['N3', 'N4'])
    expect(p.isBlocked('N1', 'N3')).toBe(true)
    expect(p.isBlocked('N1', 'N4')).toBe(true)
    expect(p.isBlocked('N2', 'N3')).toBe(true)
    expect(p.isBlocked('N2', 'N4')).toBe(true)
    // intra-group not blocked
    expect(p.isBlocked('N1', 'N2')).toBe(false)
    expect(p.isBlocked('N3', 'N4')).toBe(false)
    // old partition cleared
    expect(p.isBlocked('N1', 'N5')).toBe(false)
  })

  it('clear removes all partitions', () => {
    const p = new NetworkPartition()
    p.setPartition(['N1'], ['N2', 'N3'])
    p.clear()
    expect(p.isBlocked('N1', 'N2')).toBe(false)
    expect(p.isBlocked('N1', 'N3')).toBe(false)
  })

  it('toSet / fromSet round-trips', () => {
    const p = new NetworkPartition()
    p.setPartition(['N1', 'N2'], ['N3'])
    const saved = p.toSet()

    const p2 = new NetworkPartition()
    p2.fromSet(saved)
    expect(p2.isBlocked('N1', 'N3')).toBe(true)
    expect(p2.isBlocked('N2', 'N3')).toBe(true)
    expect(p2.isBlocked('N1', 'N2')).toBe(false)
  })
})
