<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'

const settings = useSettingsStore()

const delayMs = computed({
  get: () => settings.messageDelayMax * settings.msPerTick,
  set: (ms: number) => {
    const ticks = Math.max(1, Math.round(ms / settings.msPerTick))
    settings.messageDelayMin = Math.max(1, ticks - 1)
    settings.messageDelayMax = ticks
  },
})
</script>

<template>
  <div>
    <label class="text-xs text-slate-400 block mb-1">Message Delay: {{ delayMs }}ms</label>
    <input
      type="range"
      min="100"
      max="2000"
      step="100"
      :value="delayMs"
      class="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
      @input="delayMs = +($event.target as HTMLInputElement).value"
    >
    <div class="flex justify-between text-[9px] text-slate-500 mt-0.5">
      <span>100ms</span>
      <span>2000ms</span>
    </div>
  </div>
</template>
