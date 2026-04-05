<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
      'border transition-colors duration-100',
      statusClasses
    ]"
  >
    <span :class="['w-1.5 h-1.5 rounded-full', dotClass]" />
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
  },
  size: {
    type: String,
    default: 'md'
  }
})

const dotClass = computed(() => {
  const classes = {
    'completed': 'bg-primary',
    'in-progress': 'bg-primary animate-pulse-dot',
    'blocked': 'bg-warning',
    'failed': 'bg-danger',
    'pending': 'bg-muted'
  }
  return classes[props.status] || classes.pending
})

const statusClasses = computed(() => {
  const classes = {
    'completed': 'bg-primary/10 border-primary/20 text-primary',
    'in-progress': 'bg-primary/10 border-primary/20 text-primary',
    'blocked': 'bg-warning/10 border-warning/20 text-warning',
    'failed': 'bg-danger/10 border-danger/20 text-danger',
    'pending': 'bg-white/[0.03] border-border text-muted'
  }
  return classes[props.status] || classes.pending
})
</script>
