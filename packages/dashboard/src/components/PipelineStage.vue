<template>
  <div class="relative">
    <div class="flex items-start gap-3">
      <!-- Node indicator -->
      <div class="flex flex-col items-center flex-shrink-0 pt-1.5">
        <div
          class="w-2 h-2 transition-colors duration-200"
          :style="nodeStyle"
          :class="{ 'animate-pulse-dot': isActive || status === 'in-progress' }"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 -mt-0.5">
        <!-- Stage Header -->
        <div class="flex items-center gap-2.5 mb-3">
          <span
            class="text-[12px] font-semibold font-[JetBrains_Mono,monospace] tracking-tight"
            :style="{ color: isActive ? '#FBBF24' : '#E4E4E7' }"
          >
            {{ title }}
          </span>
          <StageBadge :status="status" />
        </div>

        <!-- Steps -->
        <div class="space-y-1">
          <div v-if="steps.length === 0" class="text-[11px] italic py-1" style="color: #525252;">
            No steps yet
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
  name: { type: String, required: true },
  title: { type: String, required: true },
  steps: { type: Array, default: () => [] },
  status: { type: String, default: 'pending' },
  isActive: { type: Boolean, default: false },
  activeStep: { type: Object, default: null }
})

const emit = defineEmits(['select-step'])

const nodeStyle = computed(() => {
  if (props.isActive) return { background: '#FBBF24', boxShadow: '0 0 8px rgba(251,191,36,0.4)' }
  const colors = {
    'completed': '#34D399',
    'in-progress': '#FBBF24',
    'blocked': '#FB923C',
    'failed': '#EF4444',
    'pending': '#2A2A2D'
  }
  return { background: colors[props.status] || colors.pending }
})

function isActiveStep(step) {
  return props.activeStep?.id === step.id || props.activeStep?.name === step.name
}
</script>
