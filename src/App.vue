<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useSimulation } from './composables/useSimulation'
import { useUiStore } from './stores/uiStore'
import { useSimulationStore } from './stores/simulationStore'
import { useStepStore } from './stores/stepStore'
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

const stepStore = useStepStore()
const progressPercent = computed(() =>
  stepStore.totalSteps === 0 ? 0 : ((stepStore.currentStepIndex + 1) / stepStore.totalSteps) * 100,
)

const mobileTab = ref<'controls' | 'graph' | 'inspector'>('graph')

function cycleTheme() {
  if (preference.value === 'system') setTheme('dark')
  else if (preference.value === 'dark') setTheme('light')
  else setTheme('system')
}

onMounted(() => {
  sim.start()
})
</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- Top Bar -->
    <header class="flex items-center justify-between px-3 md:px-4 py-2 bg-panel border-b border-border">
      <h1 class="text-sm md:text-lg font-semibold text-heading">Raft Leader Election Visualizer</h1>
      <div class="flex items-center gap-1.5 md:gap-3 shrink-0 ml-2">
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap"
          :class="ui.mode === 'demo' ? 'bg-blue-600 text-white' : 'bg-card text-body hover:bg-btn'"
          @click="ui.setMode('demo')"
        >
          Demo
        </button>
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap"
          :class="ui.mode === 'step-by-step' ? 'bg-blue-600 text-white' : 'bg-card text-body hover:bg-btn'"
          @click="ui.setMode('step-by-step')"
        >
          Step-by-Step
        </button>
        <span class="hidden md:inline text-xs text-label ml-4">Tick: {{ simStore.tick }}</span>

        <!-- Theme toggle (cycles system → dark → light → system) -->
        <button
          class="ml-2 p-1.5 rounded border border-border bg-card text-label hover:bg-btn transition-colors"
          :title="`Theme: ${preference} — click to cycle`"
          @click="cycleTheme"
        >
          <svg v-if="preference === 'system'" class="w-4 h-4"  viewBox="0 0 16 16" fill="currentColor">
            <path d="M 7.914062 1.085938 C 7.664062 1.1875 7.726562 1.675781 8.0625 2.289062 C 8.425781 2.914062 8.648438 3.0625 9.011719 2.875 C 9.335938 2.699219 9.3125 2.4375 8.914062 1.761719 C 8.488281 1.011719 8.324219 0.914062 7.914062 1.085938 Z M 7.914062 1.085938 "/>
            <path d="M 10.136719 1.175781 C 10.050781 1.273438 10 1.5625 10.023438 1.824219 C 10.101562 2.726562 10.898438 2.726562 10.976562 1.824219 C 11.023438 1.3125 10.835938 1 10.5 1 C 10.375 1 10.210938 1.074219 10.136719 1.175781 Z M 10.136719 1.175781 "/>
            <path d="M 12.550781 1.101562 C 12.351562 1.238281 11.75 2.3125 11.75 2.539062 C 11.75 2.789062 12.164062 3.023438 12.425781 2.925781 C 12.675781 2.824219 13.25 1.800781 13.25 1.4375 C 13.25 1.074219 12.863281 0.886719 12.550781 1.101562 Z M 12.550781 1.101562 "/>
            <path d="M 6.0625 2.625 C 3.125 3.226562 1 5.800781 1 8.75 C 1 11.625 3.148438 14.273438 5.976562 14.863281 C 9.476562 15.585938 12.898438 13.175781 13.425781 9.585938 C 13.585938 8.488281 12.925781 8.25 12.324219 9.1875 C 11.9375 9.8125 11.488281 10.1875 10.625 10.636719 C 10.164062 10.875 9.863281 10.925781 9 10.925781 C 8.101562 10.925781 7.835938 10.875 7.300781 10.601562 C 6.363281 10.113281 5.960938 9.726562 5.488281 8.851562 C 5.101562 8.125 5.0625 7.976562 5.0625 7 C 5.0625 6.011719 5.101562 5.875 5.511719 5.125 C 5.824219 4.550781 6.164062 4.148438 6.664062 3.773438 C 7.363281 3.238281 7.511719 2.9375 7.226562 2.648438 C 7.0625 2.488281 6.800781 2.476562 6.0625 2.625 Z M 4.460938 4.960938 C 4.101562 5.738281 4.0625 5.925781 4.0625 7.011719 C 4.0625 8.136719 4.085938 8.25 4.523438 9.148438 C 5.085938 10.289062 5.8125 10.988281 6.976562 11.539062 C 7.738281 11.898438 7.925781 11.9375 9 11.9375 C 10.074219 11.9375 10.261719 11.898438 11.039062 11.539062 C 11.5 11.3125 11.875 11.175781 11.875 11.238281 C 11.875 11.289062 11.613281 11.648438 11.289062 12.050781 C 8.75 15.164062 3.851562 14.375 2.351562 10.625 C 2.136719 10.085938 2.074219 9.6875 2.074219 8.75 C 2.074219 7.386719 2.324219 6.601562 3.0625 5.601562 C 3.449219 5.074219 4.539062 4.136719 4.773438 4.125 C 4.824219 4.125 4.6875 4.5 4.460938 4.960938 Z M 4.460938 4.960938 "/>
            <path d="M 9.648438 3.136719 C 9.050781 3.3125 8.289062 4.136719 8.113281 4.773438 C 7.824219 5.886719 8.261719 7.050781 9.210938 7.636719 C 9.925781 8.085938 11.136719 8.0625 11.835938 7.601562 C 12.613281 7.085938 12.9375 6.476562 12.9375 5.5 C 12.9375 4.539062 12.613281 3.914062 11.875 3.425781 C 11.335938 3.0625 10.3125 2.9375 9.648438 3.136719 Z M 11.550781 4.488281 C 11.875 4.824219 11.9375 4.976562 11.9375 5.5 C 11.9375 6.039062 11.875 6.175781 11.523438 6.523438 C 11.175781 6.875 11.039062 6.9375 10.5 6.9375 C 9.960938 6.9375 9.824219 6.875 9.476562 6.523438 C 9.125 6.175781 9.0625 6.039062 9.0625 5.511719 C 9.0625 4.863281 9.375 4.363281 9.9375 4.113281 C 10.398438 3.914062 11.136719 4.074219 11.550781 4.488281 Z M 11.550781 4.488281 "/>
            <path d="M 13.488281 3.1875 C 13.074219 3.414062 12.960938 3.6875 13.125 4.011719 C 13.289062 4.300781 13.511719 4.3125 13.988281 4.0625 C 14.414062 3.851562 14.550781 3.5625 14.375 3.238281 C 14.210938 2.960938 13.9375 2.9375 13.488281 3.1875 Z M 13.488281 3.1875 "/>
            <path d="M 6.148438 5.148438 C 5.738281 5.5625 6.125 6.039062 6.824219 5.976562 C 7.363281 5.925781 7.636719 5.625 7.425781 5.273438 C 7.261719 5.011719 6.375 4.925781 6.148438 5.148438 Z M 6.148438 5.148438 "/>
            <path d="M 13.648438 5.148438 C 13.449219 5.351562 13.460938 5.6875 13.675781 5.863281 C 13.949219 6.101562 15.25 5.988281 15.425781 5.710938 C 15.523438 5.5625 15.523438 5.4375 15.425781 5.273438 C 15.25 5.011719 13.898438 4.898438 13.648438 5.148438 Z M 13.648438 5.148438 "/>
            <path d="M 6.988281 6.9375 C 6.574219 7.164062 6.460938 7.4375 6.625 7.761719 C 6.789062 8.050781 7.011719 8.0625 7.488281 7.8125 C 7.914062 7.601562 8.050781 7.3125 7.875 6.988281 C 7.710938 6.710938 7.4375 6.6875 6.988281 6.9375 Z M 6.988281 6.9375 "/>
            <path d="M 13.125 6.988281 C 12.949219 7.3125 13.085938 7.601562 13.511719 7.8125 C 13.988281 8.0625 14.210938 8.050781 14.375 7.761719 C 14.550781 7.4375 14.414062 7.148438 13.988281 6.9375 C 13.511719 6.6875 13.289062 6.699219 13.125 6.988281 Z M 13.125 6.988281 "/>
            <path d="M 8.488281 8.148438 C 8.1875 8.398438 7.75 9.238281 7.75 9.5625 C 7.75 9.875 8.074219 10.0625 8.386719 9.9375 C 8.601562 9.863281 9.25 8.738281 9.25 8.449219 C 9.25 8.351562 9.136719 8.199219 9.011719 8.125 C 8.710938 7.960938 8.710938 7.960938 8.488281 8.148438 Z M 8.488281 8.148438 "/>
            <path d="M 10.136719 8.675781 C 9.925781 8.9375 10.011719 9.761719 10.289062 9.925781 C 10.625 10.136719 10.925781 9.863281 10.976562 9.324219 C 11.023438 8.8125 10.835938 8.5 10.5 8.5 C 10.375 8.5 10.210938 8.574219 10.136719 8.675781 Z M 10.136719 8.675781 "/>
          </svg>
          <svg v-else-if="preference === 'dark'" class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>
          </svg>
        </button>

        <div class="relative ml-1 group hidden md:flex">
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
    <main class="flex-1 flex flex-col overflow-hidden md:flex-row">
      <!-- Mobile step-by-step mini-header: back + progress (shown above graph) -->
      <div
        v-if="ui.mode === 'step-by-step' && stepStore.currentScenario"
        class="order-1 md:hidden shrink-0 bg-panel border-b border-border px-4 py-2 flex items-center gap-3"
      >
        <button
          class="shrink-0 text-xs text-body bg-card hover:bg-btn px-2 py-1 rounded flex items-center gap-1 transition-colors"
          @click="runner.cancelAllTimers(); stepStore.currentScenario = null"
        >&larr; All</button>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium text-body truncate">{{ stepStore.currentScenario.title }}</div>
          <div class="flex items-center gap-2 mt-1">
            <div class="flex-1 bg-card rounded-full h-1">
              <div class="bg-blue-500 h-1 rounded-full transition-all duration-300" :style="{ width: `${progressPercent}%` }" />
            </div>
            <span class="text-[10px] text-dim shrink-0">{{ stepStore.currentStepIndex + 1 }} / {{ stepStore.totalSteps }}</span>
          </div>
        </div>
      </div>

      <!-- Left panel: Demo controls or Step-by-step -->
      <aside
        v-if="ui.mode === 'demo'"
        class="bg-panel border-r border-border p-4 md:flex-none md:w-64 md:overflow-y-auto"
        :class="mobileTab === 'controls' ? 'flex flex-col flex-1 overflow-y-auto' : 'hidden md:flex md:flex-col'"
      >
        <DemoControls />
      </aside>
      <aside
        v-else-if="ui.mode === 'step-by-step'"
        class="order-3 md:order-first bg-panel border-t border-border md:border-t-0 md:border-r flex flex-col flex-[2] min-h-0 md:flex-none md:w-80"
      >
        <StepPanel />
      </aside>

      <!-- Graph area -->
      <div
        class="overflow-hidden"
        :class="ui.mode === 'step-by-step'
          ? 'order-2 md:order-none flex-[3] min-h-0 md:flex-1'
          : (mobileTab === 'graph' ? 'flex-1' : 'hidden md:flex md:flex-1')"
      >
        <GraphCanvas />
      </div>

      <!-- Right panel: Inspector + Event Log -->
      <aside
        class="bg-panel border-l border-border md:flex-none md:w-72"
        :class="(ui.mode !== 'step-by-step' && mobileTab === 'inspector') ? 'flex flex-col flex-1 overflow-y-auto' : 'hidden md:flex md:flex-col md:overflow-y-auto'"
      >
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

    <!-- Mobile tab bar (demo mode only) -->
    <nav v-if="ui.mode !== 'step-by-step'" class="flex md:hidden shrink-0 border-t border-border bg-panel">
      <button
        class="flex-1 py-2.5 text-xs font-medium transition-colors"
        :class="mobileTab === 'controls' ? 'text-blue-500' : 'text-label'"
        @click="mobileTab = 'controls'"
      >Controls</button>
      <button
        class="flex-1 py-2.5 text-xs font-medium transition-colors"
        :class="mobileTab === 'graph' ? 'text-blue-500' : 'text-label'"
        @click="mobileTab = 'graph'"
      >Graph</button>
      <button
        class="flex-1 py-2.5 text-xs font-medium transition-colors"
        :class="mobileTab === 'inspector' ? 'text-blue-500' : 'text-label'"
        @click="mobileTab = 'inspector'"
      >Inspector</button>
    </nav>
  </div>
</template>
