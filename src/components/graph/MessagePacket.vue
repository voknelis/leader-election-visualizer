<script setup lang="ts">
import { computed } from 'vue'
import type { InFlightMessage } from '../../types/raft'
import { RpcType } from '../../types/raft'
import type { NodePosition } from '../../composables/useD3Layout'
import { useSimulationStore } from '../../stores/simulationStore'

const props = defineProps<{
  message: InFlightMessage
  fromPos: NodePosition
  toPos: NodePosition
}>()

const simStore = useSimulationStore()

const packetColor = computed(() => {
  switch (props.message.payload.type) {
    case RpcType.REQUEST_VOTE: return 'var(--color-rpc-vote)'
    case RpcType.REQUEST_VOTE_REPLY: return 'var(--color-rpc-vote-reply)'
    case RpcType.APPEND_ENTRIES: return 'var(--color-rpc-append)'
    case RpcType.APPEND_ENTRIES_REPLY: return 'var(--color-rpc-append-reply)'
    default: return 'var(--color-label)'
  }
})

/** Smooth progress: engine progress + fractional interpolation toward next tick */
const smoothProgress = computed(() => {
  const msg = props.message
  const totalTicks = msg.deliverAt - msg.sentAt
  if (totalTicks <= 0) return 1
  // Add frameFraction to get sub-tick interpolation
  const elapsed = (simStore.tick - msg.sentAt) + simStore.frameFraction
  return Math.min(Math.max(elapsed / totalTicks, 0), 1)
})

const x = computed(() => props.fromPos.x + (props.toPos.x - props.fromPos.x) * smoothProgress.value)
const y = computed(() => props.fromPos.y + (props.toPos.y - props.fromPos.y) * smoothProgress.value)

const opacity = computed(() => props.message.dropped ? 0.2 : 0.9)
const packetRadius = computed(() => {
  const isReply = props.message.payload.type === RpcType.REQUEST_VOTE_REPLY ||
    props.message.payload.type === RpcType.APPEND_ENTRIES_REPLY
  return isReply ? 4 : 6
})
</script>

<template>
  <circle
    :cx="x"
    :cy="y"
    :r="packetRadius"
    :style="{ fill: packetColor }"
    :opacity="opacity"
  />
</template>
