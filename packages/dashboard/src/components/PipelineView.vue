<template>
  <div class="flex flex-col h-full bg-surface">
    <!-- Header -->
    <div class="px-5 pt-5 pb-4 border-b border-border">
      <h2 class="text-sm font-semibold text-text">Pipeline</h2>
      <p v-if="project" class="text-xs text-text-secondary mt-1">
        {{ project.name }} · {{ currentStage }}
      </p>
    </div>

    <!-- Pipeline Stages -->
    <div class="flex-1 overflow-y-auto px-5 py-4">
      <div v-if="!project || !project.state" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-border/30 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <p class="text-xs text-text-secondary">选择一个项目查看 Pipeline</p>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Stage connector layout -->
        <PipelineStage
          name="brainstorm"
          title="头脑风暴"
          :steps="getStageSteps('brainstorm')"
          :status="getStageStatus('brainstorm')"
          :is-active="currentStage === 'brainstorm'"
          @select-step="handleSelectStep"
        />

        <!-- Connector -->
        <div v-if="hasStage('plan')" class="flex items-center gap-3 pl-[5px]">
          <div class="w-[1px] h-4 bg-border" />
        </div>

        <PipelineStage
          name="plan"
          title="规划"
          :steps="getStageSteps('plan')"
          :status="getStageStatus('plan')"
          :is-active="currentStage === 'plan'"
          @select-step="handleSelectStep"
        />

        <div v-if="hasStage('execute')" class="flex items-center gap-3 pl-[5px]">
          <div class="w-[1px] h-4 bg-border" />
        </div>

        <PipelineStage
          name="execute"
          title="执行"
          :steps="getStageSteps('execute')"
          :status="getStageStatus('execute')"
          :is-active="currentStage === 'execute'"
          @select-step="handleSelectStep"
        />

        <div v-if="hasStage('verify')" class="flex items-center gap-3 pl-[5px]">
          <div class="w-[1px] h-4 bg-border" />
        </div>

        <PipelineStage
          name="verify"
          title="验证"
          :steps="getStageSteps('verify')"
          :status="getStageStatus('verify')"
          :is-active="currentStage === 'verify'"
          @select-step="handleSelectStep"
        />
      </div>
    </div>

    <!-- Activity Log -->
    <div v-if="project?.state?.progress" class="border-t border-border bg-bg/50 backdrop-blur-sm">
      <div class="px-5 py-3 flex items-center justify-between">
        <div class="text-[11px] text-text-secondary font-medium uppercase tracking-wider">活动日志</div>
        <div class="text-[11px] text-muted">{{ activityLogs.length }} 条记录</div>
      </div>
      <div class="px-5 pb-3 space-y-1 max-h-36 overflow-y-auto">
        <div v-for="(log, index) in activityLogs" :key="index"
             class="flex items-start gap-2.5 text-[11px] py-1">
          <span class="text-muted flex-shrink-0 w-10 font-mono-log">{{ log.time }}</span>
          <span :class="log.status === 'completed' ? 'text-primary' : 'text-warning'">
            {{ log.status === 'completed' ? '●' : '◐' }}
          </span>
          <span class="text-text">{{ log.description }}</span>
        </div>
        <div v-if="activityLogs.length === 0" class="text-[11px] text-muted py-1">
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
  const allStages = progress.value.stages || {}
  for (const [stageName, stageData] of Object.entries(allStages)) {
    if (stageData.status === 'completed') {
      logs.push({
        time: stageData.completedAt ? formatTime(stageData.completedAt) : '--:--',
        type: stageName,
        status: 'completed',
        description: `${stageName} 完成`
      })
    } else if (stageData.status === 'in-progress') {
      logs.push({
        time: '--:--',
        type: stageName,
        status: 'in-progress',
        description: `${stageName} 进行中`
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

function hasStage(name) {
  return !!stages.value[name]
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
  if (steps.some(s => s.status === 'failed')) return 'failed'
  if (steps.some(s => s.status === 'blocked')) return 'blocked'
  if (steps.some(s => s.status === 'in-progress')) return 'in-progress'
  if (steps.every(s => s.status === 'completed')) return 'completed'
  return 'pending'
}

function handleSelectStep(step) {
  emit('select-step', step)
}
</script>
