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

    <!-- Timeline -->
    <div v-if="project?.state?.progress" class="p-4 border-t border-[#30363D] bg-[#0D1117]">
      <div class="text-xs text-[#8B949E] mb-2">时间线</div>
      <div class="flex items-center gap-1 overflow-x-auto">
        <div
          v-for="(step, index) in timelineSteps"
          :key="index"
          :class="[
            'flex-shrink-0 w-2 h-8 rounded-sm transition-all duration-300',
            getTimelineColor(step.status)
          ]"
          :title="`${step.title} · ${step.duration || '进行中'}`"
        />
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

const timelineSteps = computed(() => {
  const steps = []
  const stageNames = ['brainstorm', 'plan', 'execute', 'verify']

  for (const stageName of stageNames) {
    const stage = stages.value[stageName]
    if (stage?.steps) {
      for (const step of stage.steps) {
        steps.push({
          title: step.title || step.name,
          status: step.status || 'pending',
          duration: step.duration
        })
      }
    }
  }

  return steps
})

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

function getTimelineColor(status) {
  const colors = {
    'completed': 'bg-emerald-500',
    'in-progress': 'bg-teal-500',
    'blocked': 'bg-amber-500',
    'failed': 'bg-red-500',
    'pending': 'bg-gray-700'
  }
  return colors[status] || colors.pending
}

function handleSelectStep(step) {
  emit('select-step', step)
}
</script>
