<script setup lang="ts">
import { scenarios } from '../../engine/scenarios'
import type { Scenario } from '../../types/scenario'

const emit = defineEmits<{
  select: [scenario: Scenario]
}>()
</script>

<template>
  <div class="space-y-2">
    <h3 class="text-xs font-semibold text-label uppercase tracking-wide">Choose Scenario</h3>
    <button
      v-for="scenario in scenarios"
      :key="scenario.id"
      class="w-full text-left px-3 py-2 rounded bg-card hover:bg-btn transition-colors"
      @click="emit('select', scenario)"
    >
      <div class="text-sm font-medium text-heading">{{ scenario.title }}</div>
      <div class="text-xs text-label mt-0.5">{{ scenario.description }}</div>
    </button>
  </div>
</template>
