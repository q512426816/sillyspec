<template>
  <div class="h-14 bg-surface/80 backdrop-blur-xl border-t border-border flex items-center justify-between px-5">
    <!-- Left: Status -->
    <div class="flex items-center gap-3">
      <div v-if="project" class="flex items-center gap-2.5">
        <span class="text-xs text-text-secondary">{{ project.name }}</span>
        <span class="text-border">·</span>
        <StageBadge
          v-if="project.state?.currentStage"
          :status="getProjectStatus()"
          :label="stageLabel()"
        />
      </div>
      <div v-else class="text-xs text-text-secondary">
        未选择项目
      </div>
    </div>

    <!-- Center: Execution Status -->
    <div class="flex items-center gap-2">
      <div v-if="isExecuting" class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />
        <span class="text-xs text-primary">执行中...</span>
      </div>
      <div v-else-if="executionResult" class="flex items-center gap-2">
        <span :class="[
          'text-xs',
          executionResult.exitCode === 0 ? 'text-primary' : 'text-danger'
        ]">
          {{ executionResult.exitCode === 0 ? '● 完成' : `● 失败 (${executionResult.exitCode})` }}
        </span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-1.5">
      <!-- Toggle Panel -->
      <button
        @click="$emit('toggle-panel')"
        class="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-white/[0.05] transition-colors duration-100"
        title="切换详情面板"
      >
        <svg :class="['w-4 h-4 transition-transform duration-100', { 'rotate-180': !isPanelOpen }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Kill Process -->
      <button
        v-if="isExecuting"
        @click="$emit('kill')"
        class="px-3 py-1.5 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger hover:bg-danger/20 transition-colors duration-100"
        title="终止执行"
      >
        停止
      </button>

      <!-- Next Step -->
      <button
        v-else-if="canExecute"
        @click="$emit('execute')"
        class="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 bg-primary text-bg hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
        title="执行下一步"
      >
        下一步
      </button>

      <!-- Command Palette -->
      <button
        @click="$emit('open-palette')"
        class="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-white/[0.05] transition-colors duration-100"
        title="命令面板 (⌘K)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  project: {
    type: Object,
    default: null
  },
  isExecuting: {
    type: Boolean,
    default: false
  },
  executionResult: {
    type: Object,
    default: null
  },
  isPanelOpen: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['execute', 'kill', 'toggle-panel', 'open-palette'])

const canExecute = computed(() => {
  return props.project?.state?.nextStep !== null
})

function getProjectStatus() {
  if (!props.project?.state) return 'pending'
  const stage = props.project.state.currentStage
  const stageData = props.project.state.progress?.stages?.[stage]
  const steps = stageData?.steps || []
  if (steps.some(s => s.status === 'failed')) return 'failed'
  if (steps.some(s => s.status === 'blocked')) return 'blocked'
  if (steps.some(s => s.status === 'in-progress')) return 'in-progress'
  if (steps.every(s => s.status === 'completed')) return 'completed'
  return 'pending'
}

function stageLabel() {
  const stage = props.project?.state?.currentStage
  const labels = {
    'brainstorm': '头脑风暴',
    'plan': '规划',
    'execute': '执行',
    'verify': '验证'
  }
  return labels[stage] || stage || '未知'
}
</script>
