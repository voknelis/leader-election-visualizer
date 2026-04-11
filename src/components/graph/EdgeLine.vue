<script setup lang="ts">
defineProps<{
  x1: number
  y1: number
  x2: number
  y2: number
  partitioned: boolean
}>()
</script>

<template>
  <line
    :x1="x1"
    :y1="y1"
    :x2="x2"
    :y2="y2"
    :stroke="partitioned ? '#ef4444' : '#334155'"
    :stroke-width="partitioned ? 1.5 : 1"
    :stroke-dasharray="partitioned ? '4 4' : 'none'"
    :opacity="partitioned ? 0.5 : 0.3"
  />
</template>
