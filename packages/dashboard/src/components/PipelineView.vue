<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 border-b border-[#30363D]">
      <h2 class="text-lg font-semibold text-[#C9D1D9]">Pipeline</h2>
      <p v-if="project" class="text-sm text-[#8B949E] mt-1">
        {{ project.name }} · {{ currentStage }}
      </p>
    </div>

    <!-- Pipeline Stages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <div v-if="!project || !project.state" class="text-center text-[#8B949E] py-8">
        选择一个项目查看 Pipeline
      </div>

      <div v-else class="space-y-8">
        <!-- Brainstorm Stage -->
        <PipelineStage
          name="brainstorm"
          title="💡 头脑风暴"
          :steps="getStageSteps('brainstorm')"
          :status="getStageStatus('brainstorm')"
          :is-active="currentStage === 'brainstorm'"
          @select-step="handleSelectStep"
        />

        <!-- Plan Stage -->
        <PipelineStage
          name="plan"
          title="📋 规划"
          :steps="getStageSteps('plan')"
          :status="getStageStatus('plan')"
          :is-active="currentStage === 'plan'"
          @select-step="handleSelectStep"
        />

        <!-- Execute Stage -->
        <PipelineStage
          name="execute"
          title="⚙️ 执行"
          :steps="getStageSteps('execute')"
          :status="getStageStatus('execute')"
          :is-active="currentStage === 'execute'"
          @select-step="handleSelectStep"
        />

        <!-- Verify Stage -->
        <PipelineStage
          name="verify"
          title="✅ 验证"
          :steps="getStageSteps('verify')"
          :status="getStageStatus('verify')"
          :is-active="currentStage === 'verify'"
          @select-step="handleSelectStep"
        />
      </div>
    </div>

    <!-- Activity Log -->
    <div v-if="project?.state?.progress" class="p-4 border-t border-[#30363D] bg-[#0D1117]">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs text-[#8B949E]">活动日志</div>
        <div class="text-xs text-[#6B7280]">{{ activityLogs.length }} 条记录</div>
      </div>
      <div class="space-y-1 max-h-40 overflow-y-auto">
        <div v-for="(log, index) in activityLogs" :key="index"
             class="flex items-start gap-2 text-xs py-1">
          <span class="text-[#6B7280] flex-shrink-0 w-12">{{ log.time }}</span>
          <span :class="getStatusIcon(log.status)">{{ getStatusEmoji(log.type) }}</span>
          <span class="text-[#C9D1D9]">{{ log.description }}</span>
        </div>
        <div v-if="activityLogs.length === 0" class="text-xs text-[#6B7280] py-2">
          暂无活动记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PipelineStage from './PipelineStage.vue'

const props = defineProps({
  project: {
    type: Object,
    default: null
  },
  activeStep: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-step'])

const currentStage = computed(() => {
  return props.project?.state?.currentStage || 'unknown'
})

const progress = computed(() => {
  return props.project?.state?.progress || {}
})

const stages = computed(() => {
  return progress.value.stages || {}
})

const activityLogs = computed(() => {
  if (!props.project?.state) return []

  const logs = []
  const stageIcons = {
    init: '🚀', explore: '🔍', quick: '⚡', scan: '📊',
    brainstorm: '💡', propose: '📝', plan: '📋',
    execute: '⚙️', verify: '✅', archive: '📦', resume: '🔄'
  }

  const allStages = progress.value.stages || {}
  for (const [stageName, stageData] of Object.entries(allStages)) {
    if (stageData.status === 'completed') {
      logs.push({
        time: stageData.completedAt ? formatTime(stageData.completedAt) : '--:--',
        type: stageName,
        status: 'completed',
        description: `${stageIcons[stageName] || '📌'} ${stageName} 完成`
      })
    } else if (stageData.status === 'in-progress') {
      logs.push({
        time: '--:--',
        type: stageName,
        status: 'in-progress',
        description: `${stageIcons[stageName] || '📌'} ${stageName} 进行中`
      })
    }
  }

  return logs.reverse()
})

function formatTime(isoString) {
  try {
    const d = new Date(isoString)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch { return '--:--' }
}

function getStatusEmoji(type) { return '' }
function getStatusIcon(status) {
  return status === 'completed' ? 'text-[#00D4AA]' : 'text-[#F59E0B]'
}

function getStageSteps(stageName) {
  const stage = stages.value[stageName]
  return stage?.steps || []
}

function getStageStatus(stageName) {
  const stage = stages.value[stageName]
  if (!stage) return 'pending'

  const steps = stage.steps || []
  if (steps.length === 0) return 'pending'

  const hasFailed = steps.some(s => s.status === 'failed')
  if (hasFailed) return 'failed'

  const hasBlocked = steps.some(s => s.status === 'blocked')
  if (hasBlocked) return 'blocked'

  const hasInProgress = steps.some(s => s.status === 'in-progress')
  if (hasInProgress) return 'in-progress'

  const allCompleted = steps.every(s => s.status === 'completed')
  if (allCompleted) return 'completed'

  return 'pending'
}

function handleSelectStep(step) {
  emit('select-step', step)
}
</script>
