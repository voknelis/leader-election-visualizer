<script setup lang="ts">
import { Play, Pause } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <button
    class="w-full px-3 py-2 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
    :class="ui.isPaused ? 'bg-leader hover:bg-leader/80 text-white' : 'bg-candidate hover:bg-candidate/80 text-white'"
    @click="ui.togglePause()"
  >
    <Play v-if="ui.isPaused" :size="14" />
    <Pause v-else :size="14" />
    {{ ui.isPaused ? 'Resume' : 'Pause' }}
  </button>
</template>
