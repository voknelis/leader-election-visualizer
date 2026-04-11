/**
 * Mulberry32 — fast, seedable 32-bit PRNG.
 * All random numbers in the engine go through this so scenarios are reproducible.
 */
export function createPrng(seed: number) {
  let s = seed >>> 0
  return function random(): number {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

export type Prng = ReturnType<typeof createPrng>

/** Returns integer in [min, max] inclusive */
export function randomInt(prng: Prng, min: number, max: number): number {
  return min + Math.floor(prng() * (max - min + 1))
}
