<template>
  <div
    :class="[
      'group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer',
      'hover:shadow-lg hover:scale-[1.02]',
      isActive ? 'ring-2 ring-[#00D4AA] bg-[#00D4AA]/5' : 'bg-[#0D1117] border-[#30363D]',
      isClickable && 'hover:border-[#00D4AA]/50'
    ]"
    @click="handleClick"
  >
    <!-- Default: Title only -->
    <div class="flex items-center gap-2">
      <span class="text-lg">{{ statusIcon }}</span>
      <h3 class="font-medium text-[#C9D1D9] group-hover:text-[#00D4AA] transition-colors">
        {{ step.title || step.name }}
      </h3>
      <StageBadge v-if="step.status" :status="step.status" :label="statusLabel" />
    </div>

    <!-- Hover: Summary reveal -->
    <div
      v-if="step.summary || step.description"
      class="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden"
    >
      <p class="mt-2 text-sm text-[#8B949E] line-clamp-2">
        {{ step.summary || step.description }}
      </p>
    </div>

    <!-- Active: Full details -->
    <div v-if="isActive" class="mt-3 space-y-2">
      <p v-if="step.conclusion" class="text-sm text-[#C9D1D9]">
        <span class="text-[#00D4AA] font-medium">结论:</span> {{ step.conclusion }}
      </p>
      <p v-if="step.decision" class="text-sm text-[#C9D1D9]">
        <span class="text-[#00D4AA] font-medium">决策:</span> {{ step.decision }}
      </p>
      <p v-if="step.userQuery" class="text-sm text-[#8B949E] italic">
        "{{ step.userQuery }}"
      </p>
    </div>

    <!-- Timeline indicator for active step -->
    <div v-if="step.duration" class="mt-2 text-xs text-[#8B949E]">
      ⏱ {{ step.duration }}
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

const statusIcon = computed(() => {
  const status = props.step.status || 'pending'
  const icons = {
    'completed': '✅',
    'in-progress': '⏳',
    'blocked': '🟡',
    'failed': '🔴',
    'pending': '⬜'
  }
  return icons[status] || '⬜'
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
