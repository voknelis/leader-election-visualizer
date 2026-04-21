<script setup lang="ts">
import { useSettingsStore } from '../../stores/settingsStore'

const settings = useSettingsStore()
const speeds = [0.25, 0.5, 1, 2, 4, 8]
</script>

<template>
  <div>
    <label class="text-xs text-label block mb-1">Speed: {{ settings.speedMultiplier }}x</label>
    <input
      type="range"
      :min="0"
      :max="speeds.length - 1"
      :value="speeds.indexOf(settings.speedMultiplier)"
      class="w-full h-1.5 bg-btn rounded-lg appearance-none cursor-pointer accent-blue-500"
      @input="settings.speedMultiplier = speeds[+($event.target as HTMLInputElement).value]"
    >
    <div class="flex justify-between text-[9px] text-dim mt-0.5">
      <span>0.25x</span>
      <span>8x</span>
    </div>
  </div>
</template>
