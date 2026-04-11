<script setup lang="ts">
import { inject } from 'vue'
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
    <label class="text-xs text-slate-400 block mb-1">Nodes: {{ settings.nodeCount }}</label>
    <div class="flex gap-2">
      <button
        class="flex-1 px-2 py-1 rounded bg-slate-600 text-white text-sm hover:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="settings.nodeCount <= 2"
        @click="remove"
      >−</button>
      <button
        class="flex-1 px-2 py-1 rounded bg-slate-600 text-white text-sm hover:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="settings.nodeCount >= 9"
        @click="add"
      >+</button>
    </div>
  </div>
</template>
