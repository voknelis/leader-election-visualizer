<script setup lang="ts">
import { computed } from 'vue'
import type { InFlightMessage } from '../../types/raft'
import { RpcType } from '../../types/raft'
import type { NodePosition } from '../../composables/useD3Layout'

const props = defineProps<{
  message: InFlightMessage
  fromPos: NodePosition
  toPos: NodePosition
}>()

const packetColor = computed(() => {
  switch (props.message.payload.type) {
    case RpcType.REQUEST_VOTE: return '#3b82f6'
    case RpcType.REQUEST_VOTE_REPLY: return '#93c5fd'
    case RpcType.APPEND_ENTRIES: return '#22c55e'
    case RpcType.APPEND_ENTRIES_REPLY: return '#86efac'
    default: return '#94a3b8'
  }
})

const x = computed(() => props.fromPos.x + (props.toPos.x - props.fromPos.x) * props.message.progress)
const y = computed(() => props.fromPos.y + (props.toPos.y - props.fromPos.y) * props.message.progress)

const opacity = computed(() => props.message.dropped ? 0.2 : 0.9)
const packetRadius = computed(() => {
  // Replies are smaller
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
    :fill="packetColor"
    :opacity="opacity"
    class="transition-opacity duration-100"
  />
</template>
