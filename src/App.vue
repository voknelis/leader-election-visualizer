<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useSimulation } from './composables/useSimulation'
import { useUiStore } from './stores/uiStore'
import { useSimulationStore } from './stores/simulationStore'
import GraphCanvas from './components/graph/GraphCanvas.vue'
import DemoControls from './components/controls/DemoControls.vue'
import StepPanel from './components/stepbystep/StepPanel.vue'
import NodeInspector from './components/inspector/NodeInspector.vue'
import MessageLog from './components/inspector/MessageLog.vue'
import TermTimeline from './components/inspector/TermTimeline.vue'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

const ui = useUiStore()
const simStore = useSimulationStore()
const sim = useSimulation()
provide('simulation', sim)
useKeyboardShortcuts()

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
        <div class="relative ml-3 group">
          <button class="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500">
            Shortcuts
          </button>
          <div class="hidden group-hover:block absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 z-50 w-52">
            <div class="text-xs text-slate-300 space-y-1.5">
              <div class="flex justify-between"><span class="text-slate-400">Pause/Resume</span><kbd class="bg-slate-700 px-1.5 rounded text-slate-300">Space</kbd></div>
              <div class="flex justify-between"><span class="text-slate-400">Next step</span><kbd class="bg-slate-700 px-1.5 rounded text-slate-300">N / →</kbd></div>
              <div class="flex justify-between"><span class="text-slate-400">Prev step</span><kbd class="bg-slate-700 px-1.5 rounded text-slate-300">P / ←</kbd></div>
              <div class="flex justify-between"><span class="text-slate-400">Reset</span><kbd class="bg-slate-700 px-1.5 rounded text-slate-300">R</kbd></div>
              <div class="flex justify-between"><span class="text-slate-400">Deselect</span><kbd class="bg-slate-700 px-1.5 rounded text-slate-300">Esc</kbd></div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left panel: Demo controls or Step-by-step -->
      <aside
        v-if="ui.mode === 'demo'"
        class="w-64 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto"
      >
        <DemoControls />
      </aside>
      <aside
        v-else-if="ui.mode === 'step-by-step'"
        class="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto"
      >
        <StepPanel />
      </aside>

      <!-- Graph area -->
      <div class="flex-1">
        <GraphCanvas />
      </div>

      <!-- Right panel: Inspector + Event Log -->
      <aside class="w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto flex flex-col">
        <!-- Node Inspector -->
        <div class="p-4 border-b border-slate-700">
          <NodeInspector />
        </div>

        <!-- Term Timeline -->
        <div class="p-4 border-b border-slate-700">
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Terms</h3>
          <TermTimeline />
        </div>

        <!-- Event Log -->
        <div class="flex-1 p-4 overflow-y-auto">
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Event Log</h3>
          <MessageLog />
        </div>
      </aside>
    </main>
  </div>
</template>
