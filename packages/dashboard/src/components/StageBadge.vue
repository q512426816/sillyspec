<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      'border transition-colors duration-200',
      statusClasses
    ]"
  >
    <span class="text-sm">{{ statusIcon }}</span>
    <span>{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'pending',
    validator: (value) => ['completed', 'in-progress', 'blocked', 'failed', 'pending'].includes(value)
  },
  label: {
    type: String,
    default: ''
  }
})

const statusIcon = computed(() => {
  const icons = {
    'completed': '✓',
    'in-progress': '◐',
    'blocked': '◑',
    'failed': '✕',
    'pending': '○'
  }
  return icons[props.status] || '○'
})

const statusClasses = computed(() => {
  const classes = {
    'completed': 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400',
    'in-progress': 'bg-teal-950/30 border-teal-700/50 text-teal-400',
    'blocked': 'bg-amber-950/30 border-amber-700/50 text-amber-400',
    'failed': 'bg-red-950/30 border-red-700/50 text-red-400',
    'pending': 'bg-gray-800/30 border-gray-700/50 text-gray-400'
  }
  return classes[props.status] || classes.pending
})
</script>
