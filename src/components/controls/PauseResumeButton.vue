<script setup lang="ts">
import { useUiStore } from '../../stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <button
    class="w-full px-3 py-2 rounded font-medium text-sm transition-colors"
    :class="ui.isPaused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'"
    @click="ui.togglePause()"
  >
    {{ ui.isPaused ? '▶ Resume' : '⏸ Pause' }}
  </button>
</template>
