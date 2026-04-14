<script setup lang="ts">
import { computed, inject } from 'vue'
import { marked } from 'marked'
import { useStepStore } from '../../stores/stepStore'
import { useUiStore } from '../../stores/uiStore'
import type { useScenarioRunner } from '../../composables/useScenarioRunner'
import ScenarioSelector from './ScenarioSelector.vue'
import type { Scenario } from '../../types/scenario'

marked.setOptions({ breaks: true, gfm: true })

const stepStore = useStepStore()
const ui = useUiStore()
const runner = inject<ReturnType<typeof useScenarioRunner>>('scenarioRunner')!

const progressPercent = computed(() => {
  if (stepStore.totalSteps === 0) return 0
  return ((stepStore.currentStepIndex + 1) / stepStore.totalSteps) * 100
})

const renderedNarration = computed(() =>
  marked.parse(stepStore.currentStep?.narration ?? '') as string,
)

const autoRunTotal = computed(() => stepStore.currentStep?.autoRunTicks ?? 0)
const autoRunProgress = computed(() => {
  if (autoRunTotal.value === 0) return 0
  const done = autoRunTotal.value - stepStore.autoRunTicksRemaining
  return Math.max(0, Math.min(100, (done / autoRunTotal.value) * 100))
})

const isAutoAdvancing = computed(() => stepStore.autoRunTicksRemaining > 0)
const isAwaitingCondition = computed(
  () =>
    stepStore.isAutoPlaying &&
    !isAutoAdvancing.value &&
    !!stepStore.currentStep?.advanceCondition &&
    !ui.isPaused,
)

function handleSelectScenario(scenario: Scenario) {
  runner.loadScenario(scenario)
}

function handleClose() {
  runner.stopAutoPlay()
  stepStore.currentScenario = null
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
        <button
          class="mb-3 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded transition-colors"
          title="Back to scenario list"
          @click="handleClose"
        >
          <span>←</span>
          <span>All scenarios</span>
        </button>
        <h2 class="text-sm font-semibold text-slate-200">{{ stepStore.currentScenario.title }}</h2>
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

      <!-- Step list -->
      <div class="border-b border-slate-700 max-h-40 overflow-y-auto">
        <ol class="text-xs">
          <li
            v-for="(step, idx) in stepStore.currentScenario.steps"
            :key="step.id"
          >
            <button
              class="w-full text-left px-4 py-1.5 flex items-center gap-2 transition-colors"
              :class="[
                idx === stepStore.currentStepIndex
                  ? 'bg-blue-900/40 text-blue-200'
                  : stepStore.visitedSteps.has(idx)
                    ? 'text-slate-300 hover:bg-slate-700/60'
                    : 'text-slate-600 cursor-not-allowed',
              ]"
              :disabled="!stepStore.visitedSteps.has(idx) && idx !== stepStore.currentStepIndex"
              :title="!stepStore.visitedSteps.has(idx) && idx !== stepStore.currentStepIndex ? 'Advance through steps to unlock' : 'Jump to step'"
              @click="runner.jumpToStep(idx)"
            >
              <span class="w-5 text-center font-mono">{{ idx + 1 }}</span>
              <span class="flex-1 truncate">{{ step.title }}</span>
              <span
                v-if="idx === stepStore.currentStepIndex"
                class="text-[10px] uppercase tracking-wide text-blue-400"
              >now</span>
            </button>
          </li>
        </ol>
      </div>

      <!-- Step content -->
      <div class="flex-1 p-4 overflow-y-auto">
        <h3 class="text-base font-semibold text-white mb-2">
          {{ stepStore.currentStep?.title }}
        </h3>
        <div
          class="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none"
          v-html="renderedNarration"
        />
      </div>

      <!-- Auto-run status strip -->
      <div
        v-if="isAutoAdvancing || isAwaitingCondition"
        class="px-4 py-2 border-t border-slate-700 bg-slate-900/40 text-xs text-slate-400"
      >
        <template v-if="isAutoAdvancing">
          <div class="flex items-center justify-between mb-1">
            <span>Auto-advancing…</span>
            <span class="font-mono text-slate-500">{{ stepStore.autoRunTicksRemaining }} / {{ autoRunTotal }} ticks</span>
          </div>
          <div class="w-full bg-slate-700 rounded-full h-1">
            <div
              class="bg-amber-500 h-1 rounded-full transition-all"
              :style="{ width: `${autoRunProgress}%` }"
            />
          </div>
        </template>
        <template v-else-if="isAwaitingCondition">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Waiting for condition…</span>
          </div>
        </template>
      </div>

      <!-- Navigation -->
      <div class="p-4 border-t border-slate-700 space-y-2">
        <div class="flex gap-2">
          <button
            class="flex-1 px-3 py-2 rounded text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="stepStore.isFirstStep"
            @click="runner.prevStep()"
          >← Prev</button>
          <button
            class="px-3 py-2 rounded text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
            title="Replay current step (R)"
            @click="runner.replayCurrentStep()"
          >↻</button>
          <button
            class="flex-1 px-3 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="stepStore.isLastStep"
            @click="runner.nextStep()"
          >Next →</button>
        </div>
        <button
          class="w-full px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :class="stepStore.isAutoPlaying
            ? 'bg-amber-600 text-white hover:bg-amber-500'
            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'"
          :disabled="stepStore.isLastStep && !stepStore.isAutoPlaying"
          @click="runner.toggleAutoPlay()"
        >
          {{ stepStore.isAutoPlaying ? '⏸ Pause auto-play' : '▶ Auto-play scenario' }}
        </button>
      </div>
    </div>
  </div>
</template>
