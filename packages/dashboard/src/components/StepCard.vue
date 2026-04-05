<template>
  <div
    :class="[
      'group relative rounded-xl border transition-all duration-100 cursor-pointer overflow-hidden',
      isActive
        ? 'border-primary/40 bg-primary/[0.06]'
        : 'border-border bg-bg hover:border-border hover:-translate-y-px hover:shadow-lg hover:shadow-black/20',
      isClickable && 'hover:border-primary/30'
    ]"
    @click="handleClick"
  >
    <!-- Left color bar -->
    <div
      :class="[
        'absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl',
        barColor
      ]"
    />

    <div class="pl-4 pr-3 py-3">
      <div class="flex items-center gap-2.5">
        <h3 class="text-[13px] font-medium text-text group-hover:text-primary transition-colors duration-100">
          {{ step.title || step.name }}
        </h3>
        <StageBadge v-if="step.status" :status="step.status" :label="statusLabel" />
      </div>

      <!-- Hover: Summary -->
      <div
        v-if="step.summary || step.description"
        class="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-200 overflow-hidden"
      >
        <p class="mt-1.5 text-xs text-text-secondary line-clamp-2">
          {{ step.summary || step.description }}
        </p>
      </div>

      <!-- Active: Full details -->
      <div v-if="isActive" class="mt-2.5 space-y-1.5">
        <p v-if="step.conclusion" class="text-xs text-text">
          <span class="text-primary font-medium">结论:</span> {{ step.conclusion }}
        </p>
        <p v-if="step.decision" class="text-xs text-text">
          <span class="text-primary font-medium">决策:</span> {{ step.decision }}
        </p>
        <p v-if="step.userQuery" class="text-xs text-text-secondary italic">
          "{{ step.userQuery }}"
        </p>
      </div>

      <div v-if="step.duration" class="mt-1.5 text-[11px] text-text-secondary">
        ⏱ {{ step.duration }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({
  step: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isClickable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['select'])

const barColor = computed(() => {
  const status = props.step.status || 'pending'
  const colors = {
    'completed': 'bg-primary',
    'in-progress': 'bg-primary',
    'blocked': 'bg-warning',
    'failed': 'bg-danger',
    'pending': 'bg-muted'
  }
  return colors[status] || colors.pending
})

const statusLabel = computed(() => {
  const status = props.step.status || 'pending'
  const labels = {
    'completed': '完成',
    'in-progress': '进行中',
    'blocked': '阻塞',
    'failed': '失败',
    'pending': '待办'
  }
  return labels[status] || '待办'
})

function handleClick() {
  if (props.isClickable) {
    emit('select', props.step)
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
