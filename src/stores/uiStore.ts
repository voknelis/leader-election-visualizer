import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NodeId } from '../types/raft'

export type AppMode = 'demo' | 'step-by-step'

export const useUiStore = defineStore('ui', () => {
  const mode = ref<AppMode>('demo')
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
    mode.value = m
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
