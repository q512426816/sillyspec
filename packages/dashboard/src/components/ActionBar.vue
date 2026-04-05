<template>
  <div class="h-12 flex items-center justify-between px-5 relative" style="background: rgba(17,17,19,0.9); backdrop-filter: blur(20px); border-top: 1px solid #1F1F22;">
    <!-- Ambient top glow -->
    <div class="absolute inset-x-0 top-0 h-px" style="background: linear-gradient(90deg, transparent, rgba(251,191,36,0.1), transparent);"></div>

    <!-- Left: Status -->
    <div class="flex items-center gap-3">
      <div v-if="project" class="flex items-center gap-2">
        <span class="text-[11px] font-[JetBrains_Mono,monospace]" style="color: #525252;">{{ project.name }}</span>
        <span style="color: #1F1F22;">|</span>
        <StageBadge v-if="project.state?.currentStage" :status="getProjectStatus()" :label="stageLabel()" />
      </div>
      <div v-else class="text-[10px] font-[JetBrains_Mono,monospace]" style="color: #3A3A3D;">
        no project
      </div>
    </div>

    <!-- Center: Execution -->
    <div class="flex items-center gap-2">
      <div v-if="isExecuting" class="flex items-center gap-2">
        <div class="w-1 h-1 rounded-full animate-pulse-dot" style="background: #FBBF24;" />
        <span class="text-[10px] font-[JetBrains_Mono,monospace]" style="color: #FBBF24;">running</span>
      </div>
      <div v-else-if="executionResult" class="flex items-center gap-1.5">
        <span class="text-[10px] font-[JetBrains_Mono,monospace]" :style="{ color: executionResult.exitCode === 0 ? '#34D399' : '#EF4444' }">
          {{ executionResult.exitCode === 0 ? '● done' : `● exit ${executionResult.exitCode}` }}
        </span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-1">
      <button
        @click="$emit('toggle-panel')"
        class="p-1.5 rounded-sm transition-colors duration-100"
        style="color: #525252;"
        @mouseenter="$event.target.style.color='#FBBF24';$event.target.style.background='rgba(251,191,36,0.06)'"
        @mouseleave="$event.target.style.color='#525252';$event.target.style.background='transparent'"
        title="Toggle detail panel"
      >
        <svg :class="['w-3.5 h-3.5 transition-transform duration-200', { 'rotate-180': !isPanelOpen }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button
        v-if="isExecuting"
        @click="$emit('kill')"
        class="px-2.5 py-1 rounded-sm text-[10px] font-[JetBrains_Mono,monospace] transition-colors duration-100"
        style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #EF4444;"
      >
        kill
      </button>

      <button
        @click="$emit('open-palette')"
        class="p-1.5 rounded-sm transition-colors duration-100"
        style="color: #525252;"
        @mouseenter="$event.target.style.color='#FBBF24';$event.target.style.background='rgba(251,191,36,0.06)'"
        @mouseleave="$event.target.style.color='#525252';$event.target.style.background='transparent'"
        title="Command palette (⌘K)"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({
  project: { type: Object, default: null },
  isExecuting: { type: Boolean, default: false },
  executionResult: { type: Object, default: null },
  isPanelOpen: { type: Boolean, default: true }
})

const emit = defineEmits(['execute', 'kill', 'toggle-panel', 'open-palette'])

function getProjectStatus() {
  if (!props.project?.state) return 'pending'
  const stage = props.project.state.currentStage
  const steps = props.project.state.progress?.stages?.[stage]?.steps || []
  if (steps.some(s => s.status === 'failed')) return 'failed'
  if (steps.some(s => s.status === 'blocked')) return 'blocked'
  if (steps.some(s => s.status === 'in-progress')) return 'in-progress'
  if (steps.every(s => s.status === 'completed')) return 'completed'
  return 'pending'
}

function stageLabel() {
  const stage = props.project?.state?.currentStage
  const labels = { 'brainstorm': '头脑风暴', 'plan': '规划', 'execute': '执行', 'verify': '验证' }
  return labels[stage] || stage || '未知'
}
</script>
