<script setup lang="ts">
import { inject } from 'vue'
import type { useSimulation } from '../../composables/useSimulation'
import SpeedSlider from './SpeedSlider.vue'
import MessageDelaySlider from './MessageDelaySlider.vue'
import MessageLossSlider from './MessageLossSlider.vue'
import NodeCountControl from './NodeCountControl.vue'
import PauseResumeButton from './PauseResumeButton.vue'
import PartitionControl from './PartitionControl.vue'
import NodeActions from './NodeActions.vue'

const sim = inject<ReturnType<typeof useSimulation>>('simulation')!

function handleReset() {
  sim.reset(Math.floor(Math.random() * 10000))
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-sm font-semibold text-slate-200">Demo Controls</h2>

    <PauseResumeButton />

    <div class="border-t border-slate-700 pt-3">
      <SpeedSlider />
    </div>

    <div class="border-t border-slate-700 pt-3">
      <NodeCountControl />
    </div>

    <div class="border-t border-slate-700 pt-3">
      <NodeActions />
    </div>

    <div class="border-t border-slate-700 pt-3">
      <PartitionControl />
    </div>

    <div class="border-t border-slate-700 pt-3">
      <MessageDelaySlider />
    </div>

    <div class="border-t border-slate-700 pt-3">
      <MessageLossSlider />
    </div>

    <div class="border-t border-slate-700 pt-3">
      <button
        class="w-full px-3 py-1.5 rounded bg-slate-600 text-white text-sm hover:bg-slate-500"
        @click="handleReset"
      >🔄 Reset (new seed)</button>
    </div>
  </div>
</template>
