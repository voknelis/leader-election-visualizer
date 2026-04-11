<script setup lang="ts">
import { computed } from 'vue'
import type { RaftNodeState } from '../../types/raft'
import { NodeState } from '../../types/raft'
import { useSimulationStore } from '../../stores/simulationStore'

const props = defineProps<{
  node: RaftNodeState
  x: number
  y: number
  selected: boolean
  dimmed: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
  mousedown: [e: MouseEvent]
}>()

const simStore = useSimulationStore()
const radius = 32

const stateColor = computed(() => {
  switch (props.node.state) {
    case NodeState.LEADER: return '#22c55e'
    case NodeState.CANDIDATE: return '#eab308'
    case NodeState.FOLLOWER: return '#64748b'
    case NodeState.CRASHED: return '#ef4444'
    default: return '#64748b'
  }
})

const stateLabel = computed(() => {
  switch (props.node.state) {
    case NodeState.LEADER: return 'L'
    case NodeState.CANDIDATE: return 'C'
    case NodeState.FOLLOWER: return 'F'
    case NodeState.CRASHED: return 'X'
    default: return '?'
  }
})

function describeArc(ratio: number): string {
  if (ratio <= 0 || ratio > 1) return ''
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + ratio * 2 * Math.PI
  const r = radius + 6
  const x1 = r * Math.cos(startAngle)
  const y1 = r * Math.sin(startAngle)
  const x2 = r * Math.cos(endAngle)
  const y2 = r * Math.sin(endAngle)
  const largeArc = ratio > 0.5 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

/** Smooth election timeout arc — interpolates with frameFraction */
const timeoutArc = computed(() => {
  if (props.node.state === NodeState.CRASHED || props.node.state === NodeState.LEADER) return ''
  const max = props.node.electionTimeoutMax
  if (max <= 0) return ''
  // Subtract frameFraction for smooth depletion between ticks
  const smoothTicks = Math.max(0, props.node.electionTimeoutTicks - simStore.frameFraction)
  const ratio = smoothTicks / max
  return describeArc(ratio)
})

/** Smooth heartbeat arc for leaders */
const heartbeatArc = computed(() => {
  if (props.node.state !== NodeState.LEADER) return ''
  const interval = 5
  const smoothTicks = Math.max(0, props.node.heartbeatTimeoutTicks - simStore.frameFraction)
  const ratio = smoothTicks / interval
  return describeArc(ratio)
})

const opacity = computed(() => props.dimmed ? 0.25 : 1)
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    :opacity="opacity"
    class="cursor-grab active:cursor-grabbing"
    @click="emit('click', node.id)"
    @mousedown="emit('mousedown', $event)"
  >
    <!-- Selection ring -->
    <circle
      v-if="selected"
      :r="radius + 10"
      fill="none"
      stroke="#3b82f6"
      stroke-width="2"
      stroke-dasharray="4 3"
    />

    <!-- Main circle -->
    <circle
      :r="radius"
      fill="#1e293b"
      :stroke="stateColor"
      stroke-width="3"
    />

    <!-- Election timeout arc -->
    <path
      v-if="timeoutArc"
      :d="timeoutArc"
      fill="none"
      :stroke="stateColor"
      stroke-width="3"
      stroke-linecap="round"
      opacity="0.7"
    />

    <!-- Heartbeat arc (leader) -->
    <path
      v-if="heartbeatArc"
      :d="heartbeatArc"
      fill="none"
      stroke="#22c55e"
      stroke-width="3"
      stroke-linecap="round"
      opacity="0.7"
    />

    <!-- Crashed X overlay -->
    <g v-if="node.state === 'crashed'" opacity="0.8">
      <line x1="-12" y1="-12" x2="12" y2="12" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
      <line x1="12" y1="-12" x2="-12" y2="12" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- Node ID -->
    <text
      y="4"
      text-anchor="middle"
      fill="#e2e8f0"
      font-size="14"
      font-weight="600"
    >{{ node.id }}</text>

    <!-- State badge -->
    <text
      :x="radius - 4"
      :y="-(radius - 4)"
      text-anchor="middle"
      :fill="stateColor"
      font-size="10"
      font-weight="700"
    >{{ stateLabel }}</text>

    <!-- Term badge -->
    <text
      y="20"
      text-anchor="middle"
      fill="#94a3b8"
      font-size="10"
    >T{{ node.currentTerm }}</text>

    <!-- Vote count (candidate only) -->
    <text
      v-if="node.state === 'candidate'"
      y="-18"
      text-anchor="middle"
      fill="#eab308"
      font-size="9"
    >votes: {{ node.votesReceived.size }}</text>
  </g>
</template>
