<template>
  <div class="relative">
    <!-- Connector line + node -->
    <div class="flex items-start gap-3">
      <!-- Vertical connector -->
      <div class="flex flex-col items-center flex-shrink-0 pt-1">
        <div
          :class="[
            'w-2.5 h-2.5 rounded-full border-2 transition-colors duration-100',
            nodeClass
          ]"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 -mt-0.5">
        <!-- Stage Header -->
        <div class="flex items-center gap-2.5 mb-3">
          <span :class="['font-medium text-[13px]', isActive ? 'text-primary' : 'text-text']">
            {{ title }}
          </span>
          <StageBadge :status="status" />
        </div>

        <!-- Steps List -->
        <div class="space-y-1.5">
          <div v-if="steps.length === 0" class="text-xs text-text-secondary italic py-1">
            暂无步骤
          </div>
          <StepCard
            v-for="step in steps"
            :key="step.id || step.name"
            :step="step"
            :is-active="isActiveStep(step)"
            @select="$emit('select-step', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StageBadge from './StageBadge.vue'
import StepCard from './StepCard.vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  steps: {
    type: Array,
    default: () => []
  },
  status: {
    type: String,
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  activeStep: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-step'])

const nodeClass = computed(() => {
  if (props.isActive) return 'border-primary bg-primary animate-pulse-dot'
  const colors = {
    'completed': 'border-primary bg-primary',
    'in-progress': 'border-primary bg-primary',
    'blocked': 'border-warning bg-warning',
    'failed': 'border-danger bg-danger',
    'pending': 'border-border bg-transparent'
  }
  return colors[props.status] || colors.pending
})

function isActiveStep(step) {
  return props.activeStep?.id === step.id || props.activeStep?.name === step.name
}
</script>
