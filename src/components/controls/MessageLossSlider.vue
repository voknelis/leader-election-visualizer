<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'

const settings = useSettingsStore()

const lossPercent = computed({
  get: () => Math.round(settings.messageLossProbability * 100),
  set: (pct: number) => { settings.messageLossProbability = pct / 100 },
})
</script>

<template>
  <div>
    <label class="text-xs text-label block mb-1">Message Loss: {{ lossPercent }}%</label>
    <input
      type="range"
      min="0"
      max="100"
      step="5"
      :value="lossPercent"
      class="w-full h-1.5 bg-btn rounded-lg appearance-none cursor-pointer accent-orange-500"
      @input="lossPercent = +($event.target as HTMLInputElement).value"
    >
    <div class="flex justify-between text-[9px] text-dim mt-0.5">
      <span>0%</span>
      <span>100%</span>
    </div>
  </div>
</template>
