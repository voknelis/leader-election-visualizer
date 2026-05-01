<script setup lang="ts">
import { inject } from 'vue'
import { Play, Pause, Sun, Moon, Monitor, Keyboard } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'
import { useSimulationStore } from '../../stores/simulationStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTheme } from '../../composables/useTheme'
import type { useSimulation } from '../../composables/useSimulation'

const ui = useUiStore()
const simStore = useSimulationStore()
const settings = useSettingsStore()
const { preference, setTheme } = useTheme()
const sim = inject<ReturnType<typeof useSimulation>>('simulation')!

const speeds = [0.25, 0.5, 1, 2, 4, 8]

function cycleTheme() {
  if (preference.value === 'system') setTheme('dark')
  else if (preference.value === 'dark') setTheme('light')
  else setTheme('system')
}

function handleReset() {
  sim.reset(Math.floor(Math.random() * 10000))
}
</script>

<template>
  <header class="flex items-center gap-3 px-4 h-12 bg-panel border-b border-border shrink-0">
    <!-- Title -->
    <h1 class="text-sm font-bold text-heading tracking-tight hidden md:block">Raft Leader Election</h1>
    <h1 class="text-sm font-bold text-heading tracking-tight md:hidden">Raft</h1>

    <!-- Mode tabs -->
    <div class="flex gap-1 ml-1">
      <button
        class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
        :class="ui.mode === 'demo' ? 'bg-accent text-white' : 'bg-card text-body hover:bg-btn'"
        @click="ui.setMode('demo')"
      >Demo</button>
      <button
        class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
        :class="ui.mode === 'step-by-step' ? 'bg-accent text-white' : 'bg-card text-body hover:bg-btn'"
        @click="ui.setMode('step-by-step')"
      >Step-by-Step</button>
    </div>

    <div class="flex-1" />

    <!-- Play/Pause -->
    <button
      v-if="ui.mode === 'demo'"
      class="w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors"
      :class="ui.isPaused ? 'bg-leader hover:bg-leader/80' : 'bg-candidate hover:bg-candidate/80'"
      @click="ui.togglePause()"
    >
      <Play v-if="ui.isPaused" :size="14" class="text-white ml-0.5" />
      <Pause v-else :size="14" class="text-white" />
    </button>

    <!-- Speed slider (desktop) -->
    <div v-if="ui.mode === 'demo'" class="hidden md:flex items-center gap-2">
      <input
        type="range"
        :min="0"
        :max="speeds.length - 1"
        :value="speeds.indexOf(settings.speedMultiplier)"
        class="w-20 h-1 bg-btn rounded-lg appearance-none cursor-pointer accent-accent"
        @input="settings.speedMultiplier = speeds[+($event.target as HTMLInputElement).value]"
      >
      <span class="text-xs font-mono text-label w-8">{{ settings.speedMultiplier }}x</span>
    </div>

    <!-- Tick counter (desktop) -->
    <span v-if="ui.mode === 'demo'" class="hidden md:inline text-xs font-mono text-dim">
      T:{{ simStore.tick }}
    </span>

    <!-- Reset -->
    <button
      v-if="ui.mode === 'demo'"
      class="hidden md:block text-xs text-dim hover:text-body px-2 py-1 rounded border border-border hover:border-dim transition-colors"
      @click="handleReset"
    >Reset</button>

    <!-- Theme toggle -->
    <button
      class="p-1.5 rounded border border-border bg-card text-label hover:bg-btn transition-colors"
      :title="`Theme: ${preference}`"
      @click="cycleTheme"
    >
      <Monitor v-if="preference === 'system'" :size="14" />
      <Moon v-else-if="preference === 'dark'" :size="14" />
      <Sun v-else :size="14" />
    </button>

    <!-- Shortcuts popover (desktop) -->
    <div class="relative group hidden md:flex">
      <button class="p-1.5 rounded border border-border bg-card text-label hover:bg-btn transition-colors">
        <Keyboard :size="14" />
      </button>
      <div class="hidden group-hover:block absolute right-0 top-full mt-1 bg-panel border border-border-dim rounded-lg shadow-xl p-3 z-50 w-56">
        <div class="text-xs text-body space-y-1.5">
          <div class="flex justify-between"><span class="text-label">Pause/Resume</span><kbd class="bg-card px-1.5 rounded text-body">Space</kbd></div>
          <div v-if="ui.mode === 'step-by-step'" class="flex justify-between"><span class="text-label">Tick once</span><kbd class="bg-card px-1.5 rounded text-body">T</kbd></div>
          <div class="flex justify-between"><span class="text-label">Next step</span><kbd class="bg-card px-1.5 rounded text-body">&rarr;</kbd></div>
          <div class="flex justify-between"><span class="text-label">Prev step</span><kbd class="bg-card px-1.5 rounded text-body">&larr;</kbd></div>
          <div v-if="ui.mode === 'step-by-step'" class="flex justify-between"><span class="text-label">Replay step</span><kbd class="bg-card px-1.5 rounded text-body">R</kbd></div>
          <div v-else class="flex justify-between"><span class="text-label">Reset</span><kbd class="bg-card px-1.5 rounded text-body">R</kbd></div>
          <div class="flex justify-between"><span class="text-label">Deselect</span><kbd class="bg-card px-1.5 rounded text-body">Esc</kbd></div>
        </div>
      </div>
    </div>
  </header>
</template>
