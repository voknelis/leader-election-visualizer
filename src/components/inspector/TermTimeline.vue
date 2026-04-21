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
    case 'leader': return 'bg-leader'
    case 'candidate': return 'bg-candidate'
    case 'follower': return 'bg-follower'
    case 'crashed': return 'bg-crashed'
    default: return 'bg-btn'
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
      <span class="text-xs text-dim w-6">{{ node.id }}</span>
      <div class="flex-1 bg-card rounded-full h-2.5 overflow-hidden">
        <div
          :class="stateColor(node.state)"
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${(node.term / maxTerm) * 100}%` }"
        />
      </div>
      <span class="text-xs text-label w-5 text-right">T{{ node.term }}</span>
    </div>
  </div>
</template>
