<script setup lang="ts">
import { inject } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'
import { useSettingsStore } from '../../stores/settingsStore'
import type { useSimulation } from '../../composables/useSimulation'

const settings = useSettingsStore()
const sim = inject<ReturnType<typeof useSimulation>>('simulation')!

function add() {
  if (settings.nodeCount < 9) {
    sim.addNode()
  }
}

function remove() {
  if (settings.nodeCount > 2) {
    sim.removeNode(`N${settings.nodeCount}`)
  }
}
</script>

<template>
  <div>
    <label class="text-xs text-label block mb-1">Nodes: {{ settings.nodeCount }}</label>
    <div class="flex gap-2">
      <button
        class="flex-1 px-2 py-1 rounded bg-btn text-heading text-sm hover:bg-btn/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        :disabled="settings.nodeCount <= 2"
        @click="remove"
      ><Minus :size="14" /></button>
      <button
        class="flex-1 px-2 py-1 rounded bg-btn text-heading text-sm hover:bg-btn/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
        :disabled="settings.nodeCount >= 9"
        @click="add"
      ><Plus :size="14" /></button>
    </div>
  </div>
</template>
