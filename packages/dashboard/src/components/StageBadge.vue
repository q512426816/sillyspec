<template>
  <span
    :class="['inline-flex items-center gap-1.5 rounded-sm text-[10px] font-medium font-[JetBrains_Mono,monospace] uppercase tracking-wider transition-colors duration-150', sizeClass]"
    :style="badgeStyle"
  >
    <span :class="['w-1 h-1 rounded-full', dotClass]" :style="dotStyle" />
    <span>{{ displayLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'pending' },
  label: { type: String, default: '' },
  size: { type: String, default: 'md' }
})

const displayLabel = computed(() => {
  if (props.label) return props.label
  const labels = { 'completed': 'done', 'in-progress': 'running', 'blocked': 'blocked', 'failed': 'error' }
  return labels[props.status] || ''
})

const sizeClass = computed(() => props.size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1')

const badgeStyle = computed(() => {
  const styles = {
    'completed': { background: 'rgba(22,163,74,0.1)', color: '#16A34A' },
    'in-progress': { background: 'rgba(251,191,36,0.1)', color: '#D97706' },
    'blocked': { background: 'rgba(251,146,60,0.1)', color: '#EA580C' },
    'failed': { background: 'rgba(239,68,68,0.1)', color: '#DC2626' },
    'pending': { background: 'rgba(82,82,82,0.15)', color: '#6B7280' }
  }
  return styles[props.status] || styles.pending
})

const dotClass = computed(() => {
  return props.status === 'in-progress' ? 'animate-pulse-dot' : ''
})

const dotStyle = computed(() => {
  const colors = {
    'completed': '#16A34A',
    'in-progress': '#D97706',
    'blocked': '#EA580C',
    'failed': '#DC2626',
    'pending': '#6B7280'
  }
  return { background: colors[props.status] || '#6B7280' }
})
</script>
