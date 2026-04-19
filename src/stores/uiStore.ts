import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { NodeId } from '../types/raft'
import router from '../router'

export type AppMode = 'demo' | 'step-by-step'

export const useUiStore = defineStore('ui', () => {
  const mode = computed<AppMode>(() =>
    router.currentRoute.value.path === '/learning' ? 'step-by-step' : 'demo',
  )
  const isPaused = ref(false)
  const selectedNodeId = ref<NodeId | null>(null)
  const highlightedNodes = ref<NodeId[]>([])
  const showInspector = ref(false)
  const showEventLog = ref(true)

  function selectNode(id: NodeId | null) {
    selectedNodeId.value = id
    showInspector.value = id !== null
  }

  function togglePause() {
    isPaused.value = !isPaused.value
  }

  function setMode(m: AppMode) {
    const target = m === 'step-by-step' ? '/learning' : '/'
    if (router.currentRoute.value.path !== target) {
      router.push(target)
    }
  }

  return {
    mode,
    isPaused,
    selectedNodeId,
    highlightedNodes,
    showInspector,
    showEventLog,
    selectNode,
    togglePause,
    setMode,
  }
})
