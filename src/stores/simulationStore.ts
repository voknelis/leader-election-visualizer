import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { NodeId, RaftNodeState, InFlightMessage } from '../types/raft'
import type { RaftEvent, SimulationSnapshot } from '../types/simulation'

export const useSimulationStore = defineStore('simulation', () => {
  const tick = ref(0)
  const nodes = shallowRef<Map<NodeId, RaftNodeState>>(new Map())
  const messages = shallowRef<InFlightMessage[]>([])
  const events = shallowRef<RaftEvent[]>([])
  const partitions = shallowRef<Set<string>>(new Set())
  /** Accumulated event history for the log panel */
  const eventHistory = ref<RaftEvent[]>([])
  /**
   * Fraction (0–1) of elapsed time between the last engine tick and the next.
   * Updated on every rAF frame for smooth interpolation of visual elements.
   */
  const frameFraction = ref(0)

  function updateFromSnapshot(snapshot: SimulationSnapshot) {
    tick.value = snapshot.tick
    nodes.value = snapshot.nodes
    messages.value = snapshot.messages
    events.value = snapshot.events
    partitions.value = snapshot.config.partitions

    if (snapshot.events.length > 0) {
      eventHistory.value = [...eventHistory.value, ...snapshot.events].slice(-200)
    }
  }

  function clearHistory() {
    eventHistory.value = []
  }

  function truncateHistory(length: number) {
    if (length < eventHistory.value.length) {
      eventHistory.value = eventHistory.value.slice(0, length)
    }
  }

  return {
    tick,
    nodes,
    messages,
    events,
    partitions,
    eventHistory,
    frameFraction,
    updateFromSnapshot,
    clearHistory,
    truncateHistory,
  }
})
