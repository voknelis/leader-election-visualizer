import { describe, it, expect } from 'vitest'
import { createPrng, randomInt } from '../prng'

describe('createPrng', () => {
  it('produces deterministic sequence for the same seed', () => {
    const a = createPrng(42)
    const b = createPrng(42)
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createPrng(1)
    const b = createPrng(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('returns values in [0, 1)', () => {
    const prng = createPrng(123)
    for (let i = 0; i < 1000; i++) {
      const v = prng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('returns values in [min, max] inclusive', () => {
    const prng = createPrng(7)
    const results = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const v = randomInt(prng, 3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
      results.add(v)
    }
    expect(results).toEqual(new Set([3, 4, 5, 6, 7]))
  })

  it('returns min when min === max', () => {
    const prng = createPrng(42)
    for (let i = 0; i < 10; i++) {
      expect(randomInt(prng, 5, 5)).toBe(5)
    }
  })
})
