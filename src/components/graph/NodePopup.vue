<script setup lang="ts">
import { computed, inject } from 'vue'
import { X } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'
import { useSimulationStore } from '../../stores/simulationStore'
import { NodeState } from '../../types/raft'
import type { useSimulation } from '../../composables/useSimulation'

const ui = useUiStore()
const simStore = useSimulationStore()
const sim = inject<ReturnType<typeof useSimulation>>('simulation')!

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

const stateDotClass = computed(() => {
  switch (node.value?.state) {
    case 'leader': return 'bg-leader'
    case 'candidate': return 'bg-candidate'
    case 'follower': return 'bg-follower'
    case 'crashed': return 'bg-crashed'
    default: return 'bg-follower'
  }
})

function crashNode() {
  if (ui.selectedNodeId) sim.crashNode(ui.selectedNodeId)
}

function restoreNode() {
  if (ui.selectedNodeId) sim.restoreNode(ui.selectedNodeId)
}

function close() {
  ui.selectNode(null)
}
</script>

<template>
  <div
    v-if="node"
    class="w-[260px] bg-overlay backdrop-blur-[16px] rounded-xl border border-border shadow-xl p-4"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full" :class="stateDotClass" />
        <span class="text-sm font-semibold text-heading">{{ node.id }}</span>
        <span :class="stateColorClass" class="text-xs font-medium capitalize">{{ node.state }}</span>
      </div>
      <button class="text-dim hover:text-body transition-colors" @click="close">
        <X :size="14" />
      </button>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-2 text-xs mb-3">
      <div class="bg-card/60 rounded p-2">
        <div class="text-dim">Term</div>
        <div class="text-heading font-semibold">{{ node.currentTerm }}</div>
      </div>
      <div class="bg-card/60 rounded p-2">
        <div class="text-dim">Voted For</div>
        <div class="text-heading">{{ node.votedFor ?? 'none' }}</div>
      </div>
      <div class="bg-card/60 rounded p-2">
        <div class="text-dim">Votes</div>
        <div class="text-heading font-semibold">{{ node.votesReceived.size }}</div>
      </div>
      <div class="bg-card/60 rounded p-2">
        <div class="text-dim">Election</div>
        <div class="text-heading">{{ node.electionTimeoutTicks }}/{{ node.electionTimeoutMax }}</div>
      </div>
      <div class="bg-card/60 rounded p-2">
        <div class="text-dim">Heartbeat</div>
        <div class="text-heading">{{ node.state === 'leader' ? node.heartbeatTimeoutTicks : '—' }}</div>
      </div>
      <div class="bg-card/60 rounded p-2">
        <div class="text-dim">Log</div>
        <div class="text-heading">{{ node.log.length }} (ci:{{ node.commitIndex }})</div>
      </div>
    </div>

    <!-- Action button -->
    <button
      v-if="node.state !== NodeState.CRASHED"
      class="w-full px-3 py-1.5 rounded text-xs font-medium bg-crashed/20 text-crashed-text hover:bg-crashed/30 transition-colors"
      @click="crashNode"
    >Kill Node</button>
    <button
      v-else
      class="w-full px-3 py-1.5 rounded text-xs font-medium bg-leader/20 text-leader-text hover:bg-leader/30 transition-colors"
      @click="restoreNode"
    >Restore Node</button>
  </div>
</template>
