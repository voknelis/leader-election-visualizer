<script setup lang="ts">
import { computed } from 'vue'
import { useSimulationStore } from '../../stores/simulationStore'
import type { RaftEvent } from '../../types/simulation'

const simStore = useSimulationStore()

const recentEvents = computed(() =>
  simStore.eventHistory.slice(-80).reverse()
)

function eventColor(event: RaftEvent): string {
  switch (event.type) {
    case 'became_leader': return 'text-green-400'
    case 'became_candidate': return 'text-yellow-400'
    case 'reverted_to_follower': return 'text-slate-400'
    case 'node_crashed': return 'text-red-400'
    case 'node_restored': return 'text-blue-400'
    case 'election_timeout': return 'text-orange-400'
    case 'heartbeat_sent': return 'text-green-300'
    case 'vote_sent': return 'text-blue-300'
    case 'vote_received': return 'text-blue-200'
    case 'message_dropped': return 'text-red-300'
    case 'term_incremented': return 'text-purple-400'
    default: return 'text-slate-400'
  }
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ')
}
</script>

<template>
  <div class="space-y-0.5 text-xs font-mono">
    <div
      v-for="(event, idx) in recentEvents"
      :key="idx"
      class="py-0.5 flex gap-1.5 leading-tight"
    >
      <span class="text-slate-600 w-8 text-right shrink-0">{{ event.tick }}</span>
      <span class="text-slate-400 w-6 shrink-0">{{ event.nodeId }}</span>
      <span :class="eventColor(event)">{{ formatType(event.type) }}</span>
    </div>
    <div v-if="recentEvents.length === 0" class="text-slate-600 italic">
      No events yet
    </div>
  </div>
</template>
