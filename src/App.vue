<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useSimulation } from './composables/useSimulation'
import { useUiStore } from './stores/uiStore'
import { useSimulationStore } from './stores/simulationStore'
import GraphCanvas from './components/graph/GraphCanvas.vue'

const ui = useUiStore()
const simStore = useSimulationStore()
const sim = useSimulation()
provide('simulation', sim)

onMounted(() => {
  sim.start()
})
</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- Top Bar -->
    <header class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
      <h1 class="text-lg font-semibold text-white">Raft Leader Election Visualizer</h1>
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="ui.mode === 'demo' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
          @click="ui.setMode('demo')"
        >
          Demo
        </button>
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="ui.mode === 'step-by-step' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
          @click="ui.setMode('step-by-step')"
        >
          Step-by-Step
        </button>
        <span class="text-xs text-slate-400 ml-4">Tick: {{ simStore.tick }}</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Graph area -->
      <div class="flex-1">
        <GraphCanvas />
      </div>

      <!-- Side panel placeholder -->
      <aside class="w-72 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
        <h2 class="text-sm font-semibold text-slate-300 mb-3">Event Log</h2>
        <div class="space-y-1 text-xs text-slate-400 max-h-full overflow-y-auto">
          <div
            v-for="event in simStore.eventHistory.slice(-50).reverse()"
            :key="event.tick + event.type + event.nodeId"
            class="py-0.5"
          >
            <span class="text-slate-500">[{{ event.tick }}]</span>
            <span class="ml-1">{{ event.nodeId }}</span>
            <span class="ml-1 text-slate-300">{{ event.type }}</span>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>
