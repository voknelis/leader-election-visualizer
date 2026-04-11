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
    case 'leader': return 'text-green-400'
    case 'candidate': return 'text-yellow-400'
    case 'follower': return 'text-slate-400'
    case 'crashed': return 'text-red-400'
    default: return 'text-slate-400'
  }
})
</script>

<template>
  <div v-if="node" class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-white">{{ node.id }}</h3>
      <button
        class="text-xs text-slate-500 hover:text-slate-300"
        @click="ui.selectNode(null)"
      >✕</button>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="bg-slate-700/50 rounded p-2">
        <div class="text-slate-500">State</div>
        <div :class="stateColorClass" class="font-semibold capitalize">{{ node.state }}</div>
      </div>
      <div class="bg-slate-700/50 rounded p-2">
        <div class="text-slate-500">Term</div>
        <div class="text-white font-semibold">{{ node.currentTerm }}</div>
      </div>
      <div class="bg-slate-700/50 rounded p-2">
        <div class="text-slate-500">Voted For</div>
        <div class="text-white">{{ node.votedFor ?? 'none' }}</div>
      </div>
      <div class="bg-slate-700/50 rounded p-2">
        <div class="text-slate-500">Votes</div>
        <div class="text-white">{{ node.votesReceived.size }}</div>
      </div>
      <div class="bg-slate-700/50 rounded p-2">
        <div class="text-slate-500">Election Timeout</div>
        <div class="text-white">{{ node.electionTimeoutTicks }}/{{ node.electionTimeoutMax }}</div>
      </div>
      <div class="bg-slate-700/50 rounded p-2">
        <div class="text-slate-500">Heartbeat</div>
        <div class="text-white">{{ node.state === 'leader' ? node.heartbeatTimeoutTicks : '—' }}</div>
      </div>
      <div class="bg-slate-700/50 rounded p-2 col-span-2">
        <div class="text-slate-500">Log Length</div>
        <div class="text-white">{{ node.log.length }} (commit idx: {{ node.commitIndex }})</div>
      </div>
    </div>
  </div>
  <div v-else class="text-xs text-slate-500 italic">
    Click a node to inspect
  </div>
</template>
