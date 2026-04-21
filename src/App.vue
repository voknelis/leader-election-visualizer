<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useSimulation } from './composables/useSimulation'
import { useUiStore } from './stores/uiStore'
import { useSimulationStore } from './stores/simulationStore'
import { useTheme } from './composables/useTheme'
import GraphCanvas from './components/graph/GraphCanvas.vue'
import DemoControls from './components/controls/DemoControls.vue'
import StepPanel from './components/stepbystep/StepPanel.vue'
import NodeInspector from './components/inspector/NodeInspector.vue'
import MessageLog from './components/inspector/MessageLog.vue'
import TermTimeline from './components/inspector/TermTimeline.vue'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useScenarioRunner } from './composables/useScenarioRunner'
import { useModeSessions } from './composables/useModeSessions'

const ui = useUiStore()
const simStore = useSimulationStore()
const { preference, setTheme } = useTheme()
const sim = useSimulation()
provide('simulation', sim)
const runner = useScenarioRunner(sim)
provide('scenarioRunner', runner)
useKeyboardShortcuts(sim, runner)
useModeSessions(sim, runner)

onMounted(() => {
  sim.start()
})
</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- Top Bar -->
    <header class="flex items-center justify-between px-4 py-2 bg-panel border-b border-border">
      <h1 class="text-lg font-semibold text-heading">Raft Leader Election Visualizer</h1>
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="ui.mode === 'demo' ? 'bg-blue-600 text-white' : 'bg-card text-body hover:bg-btn'"
          @click="ui.setMode('demo')"
        >
          Demo
        </button>
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="ui.mode === 'step-by-step' ? 'bg-blue-600 text-white' : 'bg-card text-body hover:bg-btn'"
          @click="ui.setMode('step-by-step')"
        >
          Step-by-Step
        </button>
        <span class="text-xs text-label ml-4">Tick: {{ simStore.tick }}</span>

        <!-- Theme toggle -->
        <div class="flex items-center ml-3 rounded overflow-hidden border border-border">
          <button
            class="p-1.5 transition-colors"
            :class="preference === 'light' ? 'bg-blue-600 text-white' : 'bg-card text-label hover:bg-btn'"
            title="Light"
            @click="setTheme('light')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="8" cy="8" r="3"/>
              <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>
            </svg>
          </button>
          <button
            class="p-1.5 transition-colors"
            :class="preference === 'system' ? 'bg-blue-600 text-white' : 'bg-card text-label hover:bg-btn'"
            title="System"
            @click="setTheme('system')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="12" height="9" rx="1.5"/>
              <path d="M5.5 14h5M8 11v3"/>
            </svg>
          </button>
          <button
            class="p-1.5 transition-colors"
            :class="preference === 'dark' ? 'bg-blue-600 text-white' : 'bg-card text-label hover:bg-btn'"
            title="Dark"
            @click="setTheme('dark')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"/>
            </svg>
          </button>
        </div>

        <div class="relative ml-1 group">
          <button class="text-[11px] text-dim hover:text-body transition-colors px-1.5 py-0.5 rounded border border-border hover:border-dim">
            Shortcuts
          </button>
          <div class="hidden group-hover:block absolute right-0 top-full mt-1 bg-panel border border-border-dim rounded-lg shadow-xl p-3 z-50 w-60">
            <div class="text-xs text-body space-y-1.5">
              <div class="flex justify-between"><span class="text-label">Pause/Resume</span><kbd class="bg-card px-1.5 rounded text-body">Space</kbd></div>
              <div v-if="ui.mode === 'step-by-step'" class="flex justify-between"><span class="text-label">Tick once</span><kbd class="bg-card px-1.5 rounded text-body">T</kbd></div>
              <div class="flex justify-between"><span class="text-label">Next step</span><kbd class="bg-card px-1.5 rounded text-body">&rarr;</kbd></div>
              <div class="flex justify-between"><span class="text-label">Prev step</span><kbd class="bg-card px-1.5 rounded text-body">&larr;</kbd></div>
              <div v-if="ui.mode === 'step-by-step'" class="flex justify-between"><span class="text-label">Replay step</span><kbd class="bg-card px-1.5 rounded text-body">R</kbd></div>
              <div v-else class="flex justify-between"><span class="text-label">Reset</span><kbd class="bg-card px-1.5 rounded text-body">R</kbd></div>
              <div class="flex justify-between"><span class="text-label">Deselect</span><kbd class="bg-card px-1.5 rounded text-body">Esc</kbd></div>
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
        class="w-64 bg-panel border-r border-border p-4 overflow-y-auto"
      >
        <DemoControls />
      </aside>
      <aside
        v-else-if="ui.mode === 'step-by-step'"
        class="w-80 bg-panel border-r border-border overflow-y-auto"
      >
        <StepPanel />
      </aside>

      <!-- Graph area -->
      <div class="flex-1">
        <GraphCanvas />
      </div>

      <!-- Right panel: Inspector + Event Log -->
      <aside class="w-72 bg-panel border-l border-border overflow-y-auto flex flex-col">
        <!-- Node Inspector -->
        <div class="p-4 border-b border-border">
          <NodeInspector />
        </div>

        <!-- Term Timeline -->
        <div class="p-4 border-b border-border">
          <h3 class="text-xs font-semibold text-label uppercase tracking-wide mb-2">Terms</h3>
          <TermTimeline />
        </div>

        <!-- Event Log -->
        <div class="flex-1 p-4 overflow-y-auto">
          <h3 class="text-xs font-semibold text-label uppercase tracking-wide mb-2">Event Log</h3>
          <MessageLog />
        </div>
      </aside>
    </main>
  </div>
</template>
