<script setup lang="ts">
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'
import { useSimulationStore } from '../../stores/simulationStore'
import SpeedSlider from '../controls/SpeedSlider.vue'
import MessageDelaySlider from '../controls/MessageDelaySlider.vue'
import MessageLossSlider from '../controls/MessageLossSlider.vue'
import NodeCountControl from '../controls/NodeCountControl.vue'
import PartitionControl from '../controls/PartitionControl.vue'
import TermTimeline from '../inspector/TermTimeline.vue'
import MessageLog from '../inspector/MessageLog.vue'

const ui = useUiStore()
const simStore = useSimulationStore()

function clearLog() {
  simStore.eventHistory.length = 0
}
</script>

<template>
  <div class="hidden md:flex flex-col bg-panel border-t border-border transition-all duration-200 shrink-0"
    :style="{ height: ui.bottomDockCollapsed ? '32px' : '252px' }"
  >
    <!-- Collapse bar -->
    <div class="flex items-center justify-between px-4 h-8 shrink-0 border-b border-border-dim">
      <span class="text-[10px] font-medium text-dim uppercase tracking-wider">Controls & Logs</span>
      <button
        class="p-0.5 rounded text-dim hover:text-body transition-colors"
        @click="ui.toggleBottomDock()"
      >
        <ChevronDown v-if="!ui.bottomDockCollapsed" :size="14" />
        <ChevronUp v-else :size="14" />
      </button>
    </div>

    <!-- Content (hidden when collapsed) -->
    <div v-show="!ui.bottomDockCollapsed" class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Section 1: Controls -->
      <div class="w-[380px] shrink-0 border-r border-border-dim p-3 overflow-y-auto">
        <div class="grid grid-cols-2 gap-3">
          <div><NodeCountControl /></div>
          <div><SpeedSlider /></div>
          <div><MessageDelaySlider /></div>
          <div><MessageLossSlider /></div>
          <div class="col-span-2"><PartitionControl /></div>
        </div>
      </div>

      <!-- Section 2: Term Timeline -->
      <div class="w-[280px] shrink-0 border-r border-border-dim p-3 overflow-y-auto">
        <h3 class="text-[10px] font-semibold text-dim uppercase tracking-wider mb-2">Term Timeline</h3>
        <TermTimeline />
      </div>

      <!-- Section 3: Event Log -->
      <div class="flex-1 min-w-0 p-3 flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-[10px] font-semibold text-dim uppercase tracking-wider">Event Log</h3>
          <button
            class="text-dim hover:text-body transition-colors p-0.5 rounded"
            title="Clear log"
            @click="clearLog"
          >
            <RotateCcw :size="12" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <MessageLog />
        </div>
      </div>
    </div>
  </div>
</template>
