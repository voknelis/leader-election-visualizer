<script setup lang="ts">
import { computed, onMounted, provide } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { useSimulation } from './composables/useSimulation'
import { useUiStore } from './stores/uiStore'
import { useStepStore } from './stores/stepStore'
import GraphCanvas from './components/graph/GraphCanvas.vue'
import DemoControls from './components/controls/DemoControls.vue'
import StepPanel from './components/stepbystep/StepPanel.vue'
import NodeInspector from './components/inspector/NodeInspector.vue'
import MessageLog from './components/inspector/MessageLog.vue'
import TermTimeline from './components/inspector/TermTimeline.vue'
import TopBar from './components/layout/TopBar.vue'
import BottomDock from './components/layout/BottomDock.vue'
import MobileTabBar from './components/layout/MobileTabBar.vue'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useScenarioRunner } from './composables/useScenarioRunner'
import { useModeSessions } from './composables/useModeSessions'

const ui = useUiStore()
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

onMounted(() => {
  sim.start()
})
</script>

<template>
  <div class="flex flex-col h-screen">
    <TopBar />

    <!-- DEMO MODE: Desktop = full-width graph + bottom dock; Mobile = tabbed -->
    <template v-if="ui.mode === 'demo'">
      <!-- Desktop demo -->
      <main class="hidden md:flex flex-col flex-1 min-h-0">
        <div class="flex-1 min-h-0">
          <GraphCanvas />
        </div>
        <BottomDock />
      </main>

      <!-- Mobile demo: tabbed layout -->
      <main class="flex flex-col flex-1 min-h-0 md:hidden">
        <div v-if="ui.mobileTab === 'controls'" class="flex-1 overflow-y-auto bg-panel p-4">
          <DemoControls />
        </div>
        <div v-else-if="ui.mobileTab === 'graph'" class="flex-1 min-h-0">
          <GraphCanvas />
        </div>
        <div v-else class="flex-1 overflow-y-auto bg-panel">
          <div class="p-4 border-b border-border">
            <NodeInspector />
          </div>
          <div class="p-4 border-b border-border">
            <h3 class="text-xs font-semibold text-label uppercase tracking-wide mb-2">Terms</h3>
            <TermTimeline />
          </div>
          <div class="p-4">
            <h3 class="text-xs font-semibold text-label uppercase tracking-wide mb-2">Event Log</h3>
            <MessageLog />
          </div>
        </div>
      </main>

      <MobileTabBar />
    </template>

    <!-- STEP-BY-STEP MODE -->
    <template v-else>
      <!-- Mobile step-by-step mini-header -->
      <div
        v-if="stepStore.currentScenario"
        class="md:hidden shrink-0 bg-panel border-b border-border px-4 py-2 flex items-center gap-3"
      >
        <button
          class="shrink-0 text-xs text-body bg-card hover:bg-btn px-2 py-1 rounded transition-colors"
          @click="runner.cancelAllTimers(); stepStore.currentScenario = null"
        ><ArrowLeft :size="12" class="inline" /> All</button>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium text-body truncate">{{ stepStore.currentScenario.title }}</div>
          <div class="flex items-center gap-2 mt-1">
            <div class="flex-1 bg-card rounded-full h-1">
              <div class="bg-accent h-1 rounded-full transition-all duration-300" :style="{ width: `${progressPercent}%` }" />
            </div>
            <span class="text-[10px] text-dim shrink-0">{{ stepStore.currentStepIndex + 1 }} / {{ stepStore.totalSteps }}</span>
          </div>
        </div>
      </div>

      <!-- Desktop step-by-step: left panel + graph -->
      <main class="flex-1 flex min-h-0">
        <aside class="hidden md:flex md:flex-col md:w-[340px] bg-panel border-r border-border shrink-0">
          <StepPanel />
        </aside>
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0">
            <GraphCanvas />
          </div>
          <!-- Mobile: step panel below graph -->
          <aside class="md:hidden flex-[2] min-h-0 bg-panel border-t border-border">
            <StepPanel />
          </aside>
        </div>
      </main>
    </template>
  </div>
</template>
