<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'

const settings = useSettingsStore()

const delayMs = computed({
  get: () => settings.messageDelayMax * settings.msPerTick,
  set: (ms: number) => {
    const ticks = Math.max(2, Math.round(ms / settings.msPerTick))
    settings.messageDelayMin = Math.max(2, ticks - 1)
    settings.messageDelayMax = ticks
  },
})
</script>

<template>
  <div>
    <label class="text-xs text-label block mb-1">Message Delay: {{ delayMs }}ms</label>
    <input
      type="range"
      min="400"
      max="4000"
      step="200"
      :value="delayMs"
      class="w-full h-1.5 bg-btn rounded-lg appearance-none cursor-pointer accent-blue-500"
      @input="delayMs = +($event.target as HTMLInputElement).value"
    >
    <div class="flex justify-between text-[9px] text-dim mt-0.5">
      <span>400ms</span>
      <span>4000ms</span>
    </div>
  </div>
</template>
