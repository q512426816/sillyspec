<template>
  <div class="flex flex-col h-full" style="background: #0E0E10;">
    <!-- Header -->
    <div class="px-6 pt-6 pb-4" style="border-bottom: 1px solid #1F1F22;">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] font-[JetBrains_Mono,monospace]" style="color: #525252;">
        项目流水线
      </h2>
      <p v-if="project" class="text-[12px] mt-1.5 font-[JetBrains_Mono,monospace]" style="color: #8B8B8E;">
        {{ project.name }} <span style="color: #2A2A2D;">/</span> <span style="color: #FBBF24;">{{ currentStage }}</span>
      </p>
    </div>

    <!-- Stages -->
    <div class="flex-1 overflow-y-auto px-6 py-5">
      <!-- Empty state -->
      <div v-if="!project || !project.state" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-14 h-14 mx-auto mb-4 rounded-md flex items-center justify-center" style="border: 1px dashed #2A2A2D; transform: rotate(45deg);">
            <svg class="w-5 h-5" style="color: #525252; transform: rotate(-45deg);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #525252;">选择一个项目查看流水线</p>
        </div>
      </div>

      <div v-else class="space-y-5">
        <PipelineStage name="brainstorm" title="头脑风暴" :steps="getStageSteps('brainstorm')" :status="getStageStatus('brainstorm')" :is-active="currentStage === 'brainstorm'" :active-step="activeStep" @select-step="handleSelectStep" />
        <div v-if="hasStage('plan')" class="flex items-center pl-[3px]"><div class="w-px h-4" style="background: #1F1F22;" /></div>
        <PipelineStage name="plan" title="规划" :steps="getStageSteps('plan')" :status="getStageStatus('plan')" :is-active="currentStage === 'plan'" :active-step="activeStep" @select-step="handleSelectStep" />
        <div v-if="hasStage('execute')" class="flex items-center pl-[3px]"><div class="w-px h-4" style="background: #1F1F22;" /></div>
        <PipelineStage name="execute" title="执行" :steps="getStageSteps('execute')" :status="getStageStatus('execute')" :is-active="currentStage === 'execute'" :active-step="activeStep" @select-step="handleSelectStep" />
        <div v-if="hasStage('verify')" class="flex items-center pl-[3px]"><div class="w-px h-4" style="background: #1F1F22;" /></div>
        <PipelineStage name="verify" title="验证" :steps="getStageSteps('verify')" :status="getStageStatus('verify')" :is-active="currentStage === 'verify'" :active-step="activeStep" @select-step="handleSelectStep" />
      </div>
    </div>

    <!-- Activity Log -->
    <div v-if="project?.state?.progress" style="border-top: 1px solid #1F1F22; background: rgba(10,10,11,0.6);">
      <div class="px-6 py-2.5 flex items-center justify-between">
        <div class="text-[9px] font-semibold uppercase tracking-[0.25em] font-[JetBrains_Mono,monospace]" style="color: #525252;">活动日志</div>
        <div class="text-[10px] font-mono-log" style="color: #3A3A3D;">{{ activityLogs.length }}</div>
      </div>
      <div class="px-6 pb-3 space-y-0.5 max-h-32 overflow-y-auto">
        <div v-for="(log, i) in activityLogs" :key="i" class="flex items-start gap-2.5 text-[11px] py-0.5">
          <span class="w-10 font-mono-log flex-shrink-0" style="color: #3A3A3D;">{{ log.time }}</span>
          <span :style="{ color: log.status === 'completed' ? '#34D399' : '#FBBF24' }">›</span>
          <span style="color: #8B8B8E;">{{ log.description }}</span>
        </div>
        <div v-if="activityLogs.length === 0" class="text-[10px] py-1" style="color: #3A3A3D;">暂无活动记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PipelineStage from './PipelineStage.vue'

const props = defineProps({
  project: { type: Object, default: null },
  activeStep: { type: Object, default: null }
})

const emit = defineEmits(['select-step'])

const currentStage = computed(() => props.project?.state?.currentStage || 'unknown')
const progress = computed(() => props.project?.state?.progress || {})
const stages = computed(() => progress.value.stages || {})

const stageNameMap = {
  brainstorm: '头脑风暴',
  plan: '规划',
  execute: '执行',
  verify: '验证'
}

const activityLogs = computed(() => {
  if (!props.project?.state) return []
  const logs = []
  for (const [name, data] of Object.entries(progress.value.stages || {})) {
    const label = stageNameMap[name] || name
    if (data.status === 'completed') logs.push({ time: data.completedAt ? formatTime(data.completedAt) : '--:--', status: 'completed', description: `${label} 已完成` })
    else if (data.status === 'in-progress') logs.push({ time: '--:--', status: 'in-progress', description: `${label} 运行中` })
  }
  return logs.reverse()
})

function formatTime(iso) { try { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` } catch { return '--:--' } }
function hasStage(n) { return !!stages.value[n] }
function getStageSteps(n) { return stages.value[n]?.steps || [] }
function getStageStatus(n) {
  const s = stages.value[n]; if (!s) return 'pending'
  const steps = s.steps || []
  if (steps.some(x => x.status === 'failed')) return 'failed'
  if (steps.some(x => x.status === 'blocked')) return 'blocked'
  if (steps.some(x => x.status === 'in-progress')) return 'in-progress'
  if (steps.every(x => x.status === 'completed')) return 'completed'
  return 'pending'
}
function handleSelectStep(step) { emit('select-step', step) }
</script>
