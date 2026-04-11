import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { NodeId, RaftNodeState, InFlightMessage } from '../types/raft'
import type { RaftEvent } from '../types/simulation'

export const useSimulationStore = defineStore('simulation', () => {
  const tick = ref(0)
  const nodes = shallowRef<Map<NodeId, RaftNodeState>>(new Map())
  const messages = shallowRef<InFlightMessage[]>([])
  const events = shallowRef<RaftEvent[]>([])
  /** Accumulated event history for the log panel */
  const eventHistory = ref<RaftEvent[]>([])
  /**
   * Fraction (0–1) of elapsed time between the last engine tick and the next.
   * Updated on every rAF frame for smooth interpolation of visual elements.
   */
  const frameFraction = ref(0)

  function updateFromSnapshot(snapshot: {
    tick: number
    nodes: Map<NodeId, RaftNodeState>
    messages: InFlightMessage[]
    events: RaftEvent[]
  }) {
    tick.value = snapshot.tick
    nodes.value = snapshot.nodes
    messages.value = snapshot.messages
    events.value = snapshot.events

    if (snapshot.events.length > 0) {
      eventHistory.value = [...eventHistory.value, ...snapshot.events].slice(-200)
    }
  }

  function clearHistory() {
    eventHistory.value = []
  }

  return {
    tick,
    nodes,
    messages,
    events,
    eventHistory,
    frameFraction,
    updateFromSnapshot,
    clearHistory,
  }
})
