import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const nodeCount = ref(5)
  const speedMultiplier = ref(1)
  const messageDelayMin = ref(1)
  const messageDelayMax = ref(3)
  const messageLossProbability = ref(0)
  const electionTimeoutMin = ref(15)
  const electionTimeoutMax = ref(30)
  const heartbeatInterval = ref(5)
  /** Milliseconds per tick at 1x speed */
  const msPerTick = ref(100)

  return {
    nodeCount,
    speedMultiplier,
    messageDelayMin,
    messageDelayMax,
    messageLossProbability,
    electionTimeoutMin,
    electionTimeoutMax,
    heartbeatInterval,
    msPerTick,
  }
})
