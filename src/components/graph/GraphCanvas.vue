<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useSimulationStore } from '../../stores/simulationStore'
import { useUiStore } from '../../stores/uiStore'
import { useD3Layout } from '../../composables/useD3Layout'
import NodeCircle from './NodeCircle.vue'
import EdgeLine from './EdgeLine.vue'
import MessagePacket from './MessagePacket.vue'

const simStore = useSimulationStore()
const ui = useUiStore()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const width = ref(800)
const height = ref(600)

const nodeIds = computed(() => [...simStore.nodes.keys()])

const { positions, resize } = useD3Layout(
  () => nodeIds.value,
  () => width.value,
  () => height.value,
)

// Generate all unique edges between nodes
const edges = computed(() => {
  const ids = nodeIds.value
  const result: { from: string; to: string }[] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      result.push({ from: ids[i], to: ids[j] })
    }
  }
  return result
})

// Check if an edge is partitioned
function isPartitioned(a: string, b: string): boolean {
  const partitions = simStore.nodes.size > 0
    ? (simStore as any)._rawPartitions
    : new Set<string>()
  // Check from config in snapshot — we need to read this from messages
  // For now, approximate by checking if there are no messages between these nodes
  return false // Will be properly wired in Phase 4 with partition overlay
}

function handleResize() {
  if (containerRef.value) {
    width.value = containerRef.value.clientWidth
    height.value = containerRef.value.clientHeight
    resize()
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div ref="containerRef" class="w-full h-full relative">
    <svg
      ref="svgRef"
      :width="width"
      :height="height"
      class="w-full h-full"
    >
      <!-- Edges -->
      <EdgeLine
        v-for="edge in edges"
        :key="`${edge.from}-${edge.to}`"
        :x1="positions.get(edge.from)?.x ?? 0"
        :y1="positions.get(edge.from)?.y ?? 0"
        :x2="positions.get(edge.to)?.x ?? 0"
        :y2="positions.get(edge.to)?.y ?? 0"
        :partitioned="isPartitioned(edge.from, edge.to)"
      />

      <!-- Messages in flight -->
      <MessagePacket
        v-for="msg in simStore.messages"
        :key="msg.id"
        :message="msg"
        :from-pos="positions.get(msg.from) ?? { x: 0, y: 0 }"
        :to-pos="positions.get(msg.to) ?? { x: 0, y: 0 }"
      />

      <!-- Nodes -->
      <NodeCircle
        v-for="[id, node] in simStore.nodes"
        :key="id"
        :node="node"
        :x="positions.get(id)?.x ?? 0"
        :y="positions.get(id)?.y ?? 0"
        :selected="ui.selectedNodeId === id"
        :dimmed="ui.highlightedNodes.length > 0 && !ui.highlightedNodes.includes(id)"
        @click="ui.selectNode(id)"
      />
    </svg>

    <!-- Legend -->
    <div class="absolute bottom-4 left-4 bg-slate-800/80 rounded px-3 py-2 text-xs text-slate-400 space-y-1">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-slate-500 inline-block"></span> Follower
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Candidate
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Leader
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Crashed
      </div>
      <div class="mt-2 border-t border-slate-700 pt-1">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> RequestVote
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> AppendEntries
        </div>
      </div>
    </div>
  </div>
</template>
