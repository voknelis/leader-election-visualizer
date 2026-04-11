<script setup lang="ts">
import { computed } from 'vue'
import { useSimulationStore } from '../../stores/simulationStore'

const simStore = useSimulationStore()

const nodeTerms = computed(() => {
  const result: { id: string; term: number; state: string }[] = []
  for (const [id, node] of simStore.nodes) {
    result.push({ id, term: node.currentTerm, state: node.state })
  }
  return result.sort((a, b) => a.id.localeCompare(b.id))
})

const maxTerm = computed(() =>
  Math.max(1, ...nodeTerms.value.map(n => n.term))
)

function stateColor(state: string): string {
  switch (state) {
    case 'leader': return 'bg-green-500'
    case 'candidate': return 'bg-yellow-500'
    case 'follower': return 'bg-slate-500'
    case 'crashed': return 'bg-red-500'
    default: return 'bg-slate-600'
  }
}
</script>

<template>
  <div class="space-y-1.5">
    <div
      v-for="node in nodeTerms"
      :key="node.id"
      class="flex items-center gap-2"
    >
      <span class="text-xs text-slate-500 w-6">{{ node.id }}</span>
      <div class="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          :class="stateColor(node.state)"
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${(node.term / maxTerm) * 100}%` }"
        />
      </div>
      <span class="text-xs text-slate-400 w-5 text-right">T{{ node.term }}</span>
    </div>
  </div>
</template>
