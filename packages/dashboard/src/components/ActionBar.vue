<template>
  <div class="h-14 bg-[#161B22] border-t border-[#30363D] flex items-center justify-between px-4">
    <!-- Left: Status -->
    <div class="flex items-center gap-4">
      <div v-if="project" class="flex items-center gap-2">
        <span class="text-sm text-[#8B949E]">{{ project.name }}</span>
        <span class="text-[#30363D]">·</span>
        <StageBadge
          v-if="project.state?.currentStage"
          :status="getProjectStatus()"
          :label="stageLabel()"
        />
      </div>
      <div v-else class="text-sm text-[#8B949E]">
        未选择项目
      </div>
    </div>

    <!-- Center: Execution Status -->
    <div class="flex items-center gap-2">
      <div v-if="isExecuting" class="flex items-center gap-2">
        <div class="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
        <span class="text-sm text-teal-400">执行中...</span>
      </div>
      <div v-else-if="executionResult" class="flex items-center gap-2">
        <span :class="[
          'text-sm',
          executionResult.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'
        ]">
          {{ executionResult.exitCode === 0 ? '✓ 完成' : `✕ 失败 (${executionResult.exitCode})` }}
        </span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
      <!-- Toggle Panel -->
      <button
        @click="$emit('toggle-panel')"
        :class="[
          'p-2 rounded transition-colors',
          'text-[#8B949E] hover:text-[#00D4AA] hover:bg-[#00D4AA]/10'
        ]"
        title="切换详情面板"
      >
        <svg :class="['w-5 h-5 transition-transform', { 'rotate-180': !isPanelOpen }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Kill Process -->
      <button
        v-if="isExecuting"
        @click="$emit('kill')"
        class="px-3 py-1.5 bg-red-950/30 border border-red-700/50 rounded text-sm text-red-400 hover:bg-red-950/50 transition-colors"
        title="终止执行"
      >
        停止
      </button>

      <!-- Next Step -->
      <button
        v-else-if="canExecute"
        @click="$emit('execute')"
        :class="[
          'px-4 py-1.5 rounded text-sm font-medium transition-all',
          'bg-[#00D4AA] text-[#0D1117]',
          'hover:bg-[#00D4AA]/80 hover:shadow-lg hover:shadow-[#00D4AA]/20'
        ]"
        title="执行下一步"
      >
        下一步
      </button>

      <!-- Command Palette -->
      <button
        @click="$emit('open-palette')"
        class="p-2 rounded transition-colors text-[#8B949E] hover:text-[#00D4AA] hover:bg-[#00D4AA]/10"
        title="命令面板 (⌘K)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
