<script setup lang="ts">
import { computed } from 'vue'
import { useStepStore } from '../../stores/stepStore'
import { useScenarioRunner } from '../../composables/useScenarioRunner'
import ScenarioSelector from './ScenarioSelector.vue'
import type { Scenario } from '../../types/scenario'

const stepStore = useStepStore()
const runner = useScenarioRunner()

const progressPercent = computed(() => {
  if (stepStore.totalSteps === 0) return 0
  return ((stepStore.currentStepIndex + 1) / stepStore.totalSteps) * 100
})

function handleSelectScenario(scenario: Scenario) {
  runner.loadScenario(scenario)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- No scenario loaded -->
    <div v-if="!stepStore.currentScenario" class="p-4">
      <h2 class="text-sm font-semibold text-slate-200 mb-3">Step-by-Step Mode</h2>
      <p class="text-xs text-slate-400 mb-4">Select a scenario to begin a guided walkthrough of Raft leader election.</p>
      <ScenarioSelector @select="handleSelectScenario" />
    </div>

    <!-- Scenario active -->
    <div v-else class="flex flex-col h-full">
      <!-- Header -->
      <div class="p-4 border-b border-slate-700">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-sm font-semibold text-slate-200">{{ stepStore.currentScenario.title }}</h2>
          <button
            class="text-xs text-slate-500 hover:text-slate-300"
            @click="stepStore.currentScenario = null"
          >✕ Close</button>
        </div>
        <!-- Progress bar -->
        <div class="w-full bg-slate-700 rounded-full h-1.5 mt-2">
          <div
            class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <div class="text-xs text-slate-500 mt-1">
          Step {{ stepStore.currentStepIndex + 1 }} of {{ stepStore.totalSteps }}
        </div>
      </div>

      <!-- Step content -->
      <div class="flex-1 p-4 overflow-y-auto">
        <h3 class="text-base font-semibold text-white mb-2">
          {{ stepStore.currentStep?.title }}
        </h3>
        <div
          class="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none"
          v-html="renderMarkdown(stepStore.currentStep?.narration ?? '')"
        />
      </div>

      <!-- Navigation -->
      <div class="p-4 border-t border-slate-700 flex gap-2">
        <button
          class="flex-1 px-3 py-2 rounded text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="stepStore.isFirstStep"
          @click="runner.prevStep()"
        >← Prev</button>
        <button
          class="flex-1 px-3 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="stepStore.isLastStep"
          @click="runner.nextStep()"
        >Next →</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Simple markdown renderer (bold, code, newlines)
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded text-xs">$1</code>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n(\d+)\./g, '</p><p class="mt-1">$1.')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}

export default {
  methods: { renderMarkdown },
}
</script>
