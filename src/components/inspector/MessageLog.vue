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
    case 'became_leader': return 'text-leader-text'
    case 'became_candidate': return 'text-candidate-text'
    case 'reverted_to_follower': return 'text-follower-text'
    case 'node_crashed': return 'text-crashed-text'
    case 'node_restored': return 'text-evt-restored'
    case 'election_timeout': return 'text-evt-timeout'
    case 'heartbeat_sent': return 'text-evt-heartbeat'
    case 'vote_sent': return 'text-evt-vote-sent'
    case 'vote_received': return 'text-evt-vote-recv'
    case 'message_dropped': return 'text-evt-msg-drop'
    case 'term_incremented': return 'text-evt-term-inc'
    default: return 'text-follower-text'
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
      <span class="text-faint w-8 text-right shrink-0">{{ event.tick }}</span>
      <span class="text-label w-6 shrink-0">{{ event.nodeId }}</span>
      <span :class="eventColor(event)">{{ formatType(event.type) }}</span>
    </div>
    <div v-if="recentEvents.length === 0" class="text-faint italic">
      No events yet
    </div>
  </div>
</template>
