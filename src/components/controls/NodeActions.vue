<script setup lang="ts">
import { inject, computed } from 'vue'
import { useUiStore } from '../../stores/uiStore'
import { useSimulationStore } from '../../stores/simulationStore'
import type { useSimulation } from '../../composables/useSimulation'
import { NodeState } from '../../types/raft'

const ui = useUiStore()
const simStore = useSimulationStore()
const sim = inject<ReturnType<typeof useSimulation>>('simulation')!

const selectedNode = computed(() => {
  if (!ui.selectedNodeId) return null
  return simStore.nodes.get(ui.selectedNodeId) ?? null
})

function crashSelected() {
  if (ui.selectedNodeId) sim.crashNode(ui.selectedNodeId)
}

function restoreSelected() {
  if (ui.selectedNodeId) sim.restoreNode(ui.selectedNodeId)
}
</script>

<template>
  <div v-if="selectedNode">
    <label class="text-xs text-label block mb-1">Node {{ selectedNode.id }} Actions</label>
    <div class="flex gap-2">
      <button
        v-if="selectedNode.state !== NodeState.CRASHED"
        class="flex-1 px-2 py-1 rounded bg-red-700 text-white text-xs hover:bg-red-600"
        @click="crashSelected"
      >Kill</button>
      <button
        v-if="selectedNode.state === NodeState.CRASHED"
        class="flex-1 px-2 py-1 rounded bg-green-700 text-white text-xs hover:bg-green-600"
        @click="restoreSelected"
      >Restore</button>
    </div>
  </div>
  <div v-else>
    <p class="text-xs text-dim italic">Click a node to select it</p>
  </div>
</template>
