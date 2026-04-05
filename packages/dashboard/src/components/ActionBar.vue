<template>
  <div class="h-12 flex items-center justify-between px-5 relative" style="background: rgba(17,17,19,0.9); backdrop-filter: blur(20px); border-top: 1px solid #F0F0F3;">
    <!-- Ambient top glow -->
    <div class="absolute inset-x-0 top-0 h-px" style="background: linear-gradient(90deg, transparent, rgba(251,191,36,0.1), transparent);"></div>

    <!-- Left: Status -->
    <div class="flex items-center gap-3">
      <div v-if="project" class="flex items-center gap-2">
        <span class="text-[11px] font-[JetBrains_Mono,monospace]" style="color: #6B7280;">{{ project.name }}</span>
        <span style="color: #F0F0F3;">|</span>
        <StageBadge v-if="project.state?.currentStage" :status="getProjectStatus()" :label="stageLabel()" />
      </div>
      <div v-else class="text-[10px] font-[JetBrains_Mono,monospace]" style="color: #D1D1D6;">
        未选择项目
      </div>
    </div>

    <!-- Center: Execution -->
    <div class="flex items-center gap-2">
      <div v-if="isExecuting" class="flex items-center gap-2">
        <div class="w-1 h-1 rounded-full animate-pulse-dot" style="background: #D97706;" />
        <span class="text-[10px] font-[JetBrains_Mono,monospace]" style="color: #D97706;">执行中...</span>
      </div>
      <div v-else-if="executionResult" class="flex items-center gap-1.5">
        <span class="text-[10px] font-[JetBrains_Mono,monospace]" :style="{ color: executionResult.exitCode === 0 ? '#16A34A' : '#DC2626' }">
          {{ executionResult.exitCode === 0 ? '● 完成' : `● 失败 (${executionResult.exitCode})` }}
        </span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-1">
      <n-button quaternary size="tiny" @click="$emit('toggle-panel')" title="切换详情面板">
        <template #icon>
          <svg :class="['w-3.5 h-3.5 transition-transform duration-200', { 'rotate-180': !isPanelOpen }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </template>
      </n-button>

      <n-button v-if="isExecuting" size="tiny" type="error" @click="$emit('kill')">
        停止
      </n-button>

      <n-button quaternary size="tiny" @click="$emit('open-palette')" title="命令面板 (⌘K)">
        <template #icon>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup>
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
