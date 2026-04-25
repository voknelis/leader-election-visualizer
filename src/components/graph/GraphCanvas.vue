<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { select, zoom, type ZoomBehavior } from 'd3'
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

const panZoom = ref({ x: 0, y: 0, k: 1 })
const transformAttr = computed(() =>
  `translate(${panZoom.value.x},${panZoom.value.y}) scale(${panZoom.value.k})`
)
const nodeRadius = computed(() => (width.value < 550 ? 22 : 32))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zoomBehavior: ZoomBehavior<SVGSVGElement, any> | null = null

const nodeIds = computed(() => [...simStore.nodes.keys()])

const { positions, resize, dragStart, dragMove, dragEnd } = useD3Layout(
  () => nodeIds.value,
  () => width.value,
  () => height.value,
)

// --- Drag handling ---
const dragging = ref(false)
let dragMoved = false
let dragStartX = 0
let dragStartY = 0

function toSvgCoords(e: MouseEvent): { x: number; y: number } {
  const svg = svgRef.value
  if (!svg) return { x: e.clientX, y: e.clientY }
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: e.clientX, y: e.clientY }
  const svgPt = pt.matrixTransform(ctm.inverse())
  // Convert from SVG space to <g> (simulation) space accounting for pan/zoom
  const t = panZoom.value
  return { x: (svgPt.x - t.x) / t.k, y: (svgPt.y - t.y) / t.k }
}

let pendingDragId: string | null = null

function handleNodeMousedown(id: string, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation() // prevent D3 zoom from intercepting this as a pan
  dragging.value = true
  dragMoved = false
  dragStartX = e.clientX
  dragStartY = e.clientY
  pendingDragId = id
}

function handleMousemove(e: MouseEvent) {
  if (!dragging.value) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  if (!dragMoved && dx * dx + dy * dy > 9) {
    dragMoved = true
    if (pendingDragId) {
      dragStart(pendingDragId)
      pendingDragId = null
    }
  }
  if (dragMoved) {
    const { x, y } = toSvgCoords(e)
    dragMove(x, y)
  }
}

function handleMouseup() {
  if (!dragging.value) return
  dragging.value = false
  pendingDragId = null
  if (dragMoved) dragEnd()
}

function handleNodeClick(id: string) {
  // Only select if the mouse didn't move (not a drag)
  if (!dragMoved) {
    ui.selectNode(id)
  }
}

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

function isPartitioned(a: string, b: string): boolean {
  return simStore.partitions.has(`${a}:${b}`)
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

  if (svgRef.value) {
    zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        panZoom.value = { x: event.transform.x, y: event.transform.y, k: event.transform.k }
      })
    select(svgRef.value).call(zoomBehavior)
  }
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
      class="w-full h-full touch-none"
      @mousemove="handleMousemove"
      @mouseup="handleMouseup"
      @mouseleave="handleMouseup"
    >
      <!-- Pan/zoom group: all graph content transforms together -->
      <g :transform="transformAttr">
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

        <!-- Messages in flight (skip if either endpoint was removed) -->
        <MessagePacket
          v-for="msg in simStore.messages"
          v-show="positions.has(msg.from) && positions.has(msg.to)"
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
          :radius="nodeRadius"
          :selected="ui.selectedNodeId === id"
          :dimmed="ui.highlightedNodes.length > 0 && !ui.highlightedNodes.includes(id)"
          @click="handleNodeClick(id)"
          @mousedown="handleNodeMousedown(id, $event)"
        />
      </g>
    </svg>

    <!-- Legend -->
    <div class="absolute bottom-4 left-4 bg-overlay rounded px-3 py-2 text-xs text-label space-y-1">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-follower inline-block"></span> Follower
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-candidate inline-block"></span> Candidate
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-leader inline-block"></span> Leader
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-crashed inline-block"></span> Crashed
      </div>
      <div class="mt-2 border-t border-border pt-1">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-rpc-vote inline-block"></span> RequestVote
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-rpc-append inline-block"></span> AppendEntries
        </div>
      </div>
    </div>
  </div>
</template>
