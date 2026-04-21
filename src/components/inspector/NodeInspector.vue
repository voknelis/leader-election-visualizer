<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/uiStore'
import { useSimulationStore } from '../../stores/simulationStore'

const ui = useUiStore()
const simStore = useSimulationStore()

const node = computed(() => {
  if (!ui.selectedNodeId) return null
  return simStore.nodes.get(ui.selectedNodeId) ?? null
})

const stateColorClass = computed(() => {
  switch (node.value?.state) {
    case 'leader': return 'text-leader-text'
    case 'candidate': return 'text-candidate-text'
    case 'follower': return 'text-follower-text'
    case 'crashed': return 'text-crashed-text'
    default: return 'text-follower-text'
  }
})
</script>

<template>
  <div v-if="node" class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-heading">{{ node.id }}</h3>
      <button
        class="text-xs text-dim hover:text-body"
        @click="ui.selectNode(null)"
      >&#10005;</button>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="bg-card/50 rounded p-2">
        <div class="text-dim">State</div>
        <div :class="stateColorClass" class="font-semibold capitalize">{{ node.state }}</div>
      </div>
      <div class="bg-card/50 rounded p-2">
        <div class="text-dim">Term</div>
        <div class="text-heading font-semibold">{{ node.currentTerm }}</div>
      </div>
      <div class="bg-card/50 rounded p-2">
        <div class="text-dim">Voted For</div>
        <div class="text-heading">{{ node.votedFor ?? 'none' }}</div>
      </div>
      <div class="bg-card/50 rounded p-2">
        <div class="text-dim">Votes</div>
        <div class="text-heading">{{ node.votesReceived.size }}</div>
      </div>
      <div class="bg-card/50 rounded p-2">
        <div class="text-dim">Election Timeout</div>
        <div class="text-heading">{{ node.electionTimeoutTicks }}/{{ node.electionTimeoutMax }}</div>
      </div>
      <div class="bg-card/50 rounded p-2">
        <div class="text-dim">Heartbeat</div>
        <div class="text-heading">{{ node.state === 'leader' ? node.heartbeatTimeoutTicks : '&#8212;' }}</div>
      </div>
      <div class="bg-card/50 rounded p-2 col-span-2">
        <div class="text-dim">Log Length</div>
        <div class="text-heading">{{ node.log.length }} (commit idx: {{ node.commitIndex }})</div>
      </div>
    </div>
  </div>
  <div v-else class="text-xs text-dim italic">
    Click a node to inspect
  </div>
</template>
