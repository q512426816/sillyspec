<template>
  <div
    :class="[
      'relative',
      isActive && 'before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-1 before:bg-[#00D4AA] before:rounded-r'
    ]"
  >
    <!-- Stage Header -->
    <div
      :class="[
        'flex items-center gap-3 mb-3 pb-2 border-b',
        isActive ? 'border-[#00D4AA]/50' : 'border-[#30363D]'
      ]"
    >
      <span class="text-xl">{{ title.split(' ')[0] }}</span>
      <span class="font-medium text-[#C9D1D9]">{{ title.split(' ').slice(1).join(' ') }}</span>
      <StageBadge :status="status" />
    </div>

    <!-- Steps List -->
    <div class="space-y-2 pl-4">
      <div v-if="steps.length === 0" class="text-sm text-[#8B949E] italic">
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

function isActiveStep(step) {
  return props.activeStep?.id === step.id || props.activeStep?.name === step.name
}
</script>
