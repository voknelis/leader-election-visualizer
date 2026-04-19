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
const autoRunCompleted = computed(() =>
  Math.max(0, autoRunTotal.value - stepStore.autoRunTicksRemaining),
)
const autoRunPercent = computed(() => {
  if (autoRunTotal.value === 0) return 0
  return Math.max(0, Math.min(100, (autoRunCompleted.value / autoRunTotal.value) * 100))
})

const hasAutoRun = computed(() => autoRunTotal.value > 0)
const hasCondition = computed(() => !!stepStore.currentStep?.advanceCondition)
const showStatusStrip = computed(() => hasAutoRun.value || hasCondition.value)
const autoRunDone = computed(
  () => hasAutoRun.value && stepStore.autoRunTicksRemaining === 0,
)

const conditionMet = runner.conditionMet

const tickButtonDisabled = computed(() => !runner.canTickNow.value)

type StripState = {
  label: string
  detail: string
  bar: 'amber' | 'muted' | 'empty' | 'none'
  pulse: boolean
}

const statusStrip = computed<StripState>(() => {
  const manual = !stepStore.autoAdvance

  if (hasAutoRun.value) {
    const detail = `${autoRunCompleted.value} / ${autoRunTotal.value} ticks`
    if (autoRunDone.value) {
      return { label: 'Done', detail, bar: 'muted', pulse: false }
    }
    if (manual) {
      return { label: 'Manual', detail, bar: 'empty', pulse: false }
    }
    return { label: 'Running…', detail, bar: 'amber', pulse: false }
  }

  // condition-only step
  if (conditionMet.value) {
    return { label: 'Condition met', detail: '', bar: 'none', pulse: false }
  }
  if (manual) {
    return { label: 'Manual', detail: 'waiting for condition', bar: 'none', pulse: false }
  }
  return { label: 'Waiting for condition…', detail: '', bar: 'none', pulse: true }
})

function handleSelectScenario(scenario: Scenario) {
  runner.loadScenario(scenario)
}

function handleClose() {
  runner.cancelAllTimers()
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

      <!-- Auto-run status strip (always visible when step has autoRun or condition) -->
      <div
        v-if="showStatusStrip"
        class="px-4 py-2 border-t border-slate-700 bg-slate-900/40 text-xs text-slate-400"
      >
        <div class="flex items-center justify-between mb-1.5 gap-2">
          <span class="flex items-center gap-2 min-w-0">
            <span
              v-if="statusStrip.pulse"
              class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0"
            />
            <span class="truncate">
              {{ statusStrip.label }}
              <span v-if="statusStrip.detail" class="text-slate-500">· {{ statusStrip.detail }}</span>
            </span>
          </span>
          <span v-if="hasAutoRun" class="font-mono text-slate-500 flex-shrink-0">
            {{ autoRunCompleted }} / {{ autoRunTotal }}
          </span>
        </div>
        <div v-if="hasAutoRun" class="w-full bg-slate-700 rounded-full h-1">
          <div
            class="h-1 rounded-full transition-all"
            :class="statusStrip.bar === 'amber'
              ? 'bg-amber-500'
              : statusStrip.bar === 'muted'
                ? 'bg-slate-500'
                : 'bg-slate-600/40'"
            :style="{ width: `${autoRunPercent}%` }"
          />
        </div>
      </div>

      <!-- Auto-advance toggle + manual tick + replay -->
      <div class="px-4 py-2 border-t border-slate-700 bg-slate-900/30">
        <div class="flex items-center justify-between gap-3">
          <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none min-w-0">
            <input
              type="checkbox"
              class="accent-blue-500 flex-shrink-0"
              :checked="stepStore.autoAdvance"
              @change="stepStore.autoAdvance = ($event.target as HTMLInputElement).checked"
            />
            <span class="truncate">Auto-advance ticks</span>
          </label>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              v-if="!stepStore.autoAdvance && showStatusStrip"
              class="px-2.5 py-1 rounded text-xs font-medium bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Tick once (T)"
              :disabled="tickButtonDisabled"
              @click="runner.tickOnce()"
            >▶ Tick once</button>
            <button
              class="w-6 h-6 flex items-center justify-center rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
              title="Replay current step (R)"
              @click="runner.replayCurrentStep()"
            >↻</button>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="p-4 border-t border-slate-700">
        <div class="flex gap-2">
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
  </div>
</template>
