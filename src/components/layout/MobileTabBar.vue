<script setup lang="ts">
import { SlidersHorizontal, Network, Search } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <nav class="flex md:hidden shrink-0 border-t border-border bg-panel h-11">
    <button
      class="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
      :class="ui.mobileTab === 'controls' ? 'text-accent' : 'text-label'"
      @click="ui.mobileTab = 'controls'"
    >
      <SlidersHorizontal :size="16" />
      <span>Controls</span>
    </button>
    <button
      class="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
      :class="ui.mobileTab === 'graph' ? 'text-accent' : 'text-label'"
      @click="ui.mobileTab = 'graph'"
    >
      <Network :size="16" />
      <span>Graph</span>
    </button>
    <button
      class="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
      :class="ui.mobileTab === 'inspector' ? 'text-accent' : 'text-label'"
      @click="ui.mobileTab = 'inspector'"
    >
      <Search :size="16" />
      <span>Inspector</span>
    </button>
  </nav>
</template>
