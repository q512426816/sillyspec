<template>
  <div
    :class="['group relative rounded-md cursor-pointer overflow-hidden transition-all duration-200']"
    :style="cardStyle"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @click="handleClick"
  >
    <!-- Left accent bar -->
    <div class="absolute left-0 top-0 bottom-0 w-[2px]" :style="{ background: barColor }" />

    <div class="pl-3.5 pr-3 py-2.5">
      <div class="flex items-center gap-2">
        <h3 class="text-[12px] font-medium transition-colors duration-150" :style="{ color: isActive ? '#FBBF24' : '#E4E4E7', fontFamily: '\'JetBrains Mono\', monospace' }">
          {{ step.title || step.name }}
        </h3>
        <StageBadge v-if="step.status" :status="step.status" :label="statusLabel" />
      </div>

      <!-- Hover summary -->
      <div
        v-if="step.summary || step.description"
        class="overflow-hidden transition-all duration-200"
        :style="{ maxHeight: hovered ? '60px' : '0', opacity: hovered ? 1 : 0 }"
      >
        <p class="mt-1.5 text-[11px] line-clamp-2" style="color: #8B8B8E;">
          {{ step.summary || step.description }}
        </p>
      </div>

      <!-- Active details -->
      <div v-if="isActive" class="mt-2 space-y-1">
        <p v-if="step.conclusion" class="text-[11px]" style="color: #E4E4E7;">
          <span style="color: #FBBF24; font-weight: 600;">结论:</span> {{ step.conclusion }}
        </p>
        <p v-if="step.decision" class="text-[11px]" style="color: #E4E4E7;">
          <span style="color: #FBBF24; font-weight: 600;">决策:</span> {{ step.decision }}
        </p>
        <p v-if="step.userQuery" class="text-[11px] italic" style="color: #8B8B8E;">
          "{{ step.userQuery }}"
        </p>
      </div>

      <div v-if="step.duration" class="mt-1 text-[10px] font-mono-log" style="color: #525252;">
        {{ step.duration }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({
  step: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  isClickable: { type: Boolean, default: true }
})

const emit = defineEmits(['select'])
const hovered = ref(false)

const barColor = computed(() => {
  const colors = { 'completed': '#34D399', 'in-progress': '#FBBF24', 'blocked': '#FB923C', 'failed': '#EF4444', 'pending': '#2A2A2D' }
  return colors[props.step.status] || colors.pending
})

const cardStyle = computed(() => ({
  background: props.isActive ? 'rgba(251,191,36,0.04)' : (hovered.value ? 'rgba(255,255,255,0.015)' : '#141416'),
  border: `1px solid ${props.isActive ? 'rgba(251,191,36,0.2)' : '#1F1F22'}`,
}))

const statusLabel = computed(() => {
  const labels = { 'completed': '完成', 'in-progress': '进行中', 'blocked': '阻塞', 'failed': '失败', 'pending': '待办' }
  return labels[props.step.status] || '待办'
})

function handleClick() { if (props.isClickable) emit('select', props.step) }
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
