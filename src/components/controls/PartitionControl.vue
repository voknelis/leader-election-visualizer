<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import { useSimulationStore } from '../../stores/simulationStore'
import type { useSimulation } from '../../composables/useSimulation'

const sim = inject<ReturnType<typeof useSimulation>>('simulation')!
const simStore = useSimulationStore()
const partitionActive = ref(false)
const splitAfter = ref(2)

const nodeIds = computed(() => [...simStore.nodes.keys()])
const maxSplit = computed(() => Math.max(1, nodeIds.value.length - 1))

function applyPartition() {
  const ids = nodeIds.value
  const groupA = ids.slice(0, splitAfter.value)
  const groupB = ids.slice(splitAfter.value)
  if (groupA.length > 0 && groupB.length > 0) {
    sim.setPartition(groupA, groupB)
    partitionActive.value = true
  }
}

function healPartition() {
  sim.clearPartition()
  partitionActive.value = false
}
</script>

<template>
  <div>
    <label class="text-xs text-label block mb-1">Network Partition</label>
    <div v-if="!partitionActive" class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-dim">Split after node</span>
        <input
          type="number"
          :min="1"
          :max="maxSplit"
          v-model.number="splitAfter"
          class="w-12 px-1 py-0.5 bg-card border border-border-dim rounded text-xs text-heading text-center"
        >
      </div>
      <button
        class="w-full px-2 py-1 rounded bg-red-700 text-white text-sm hover:bg-red-600"
        @click="applyPartition"
      >Split Network</button>
    </div>
    <div v-else class="space-y-2">
      <p class="text-xs text-crashed-text">Network partitioned</p>
      <button
        class="w-full px-2 py-1 rounded bg-green-700 text-white text-sm hover:bg-green-600"
        @click="healPartition"
      >Heal Partition</button>
    </div>
  </div>
</template>
