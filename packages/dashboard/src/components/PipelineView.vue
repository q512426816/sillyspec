<template>
  <div class="flex flex-col h-full" style="background: #F5F5F7;">
    <!-- Header with Tabs -->
    <div class="px-6 pt-4 pb-0" style="border-bottom: 1px solid #F0F0F3;">
      <div class="flex items-center gap-6">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] font-[JetBrains_Mono,monospace]" style="color: #6B7280;">
          {{ project?.name || '项目' }}
        </h2>
        <n-tabs :value="activeTab" type="segment" size="small" @update:value="$emit('switch-tab', $event)" style="max-width: 200px;">
          <n-tab name="pipeline">流水线</n-tab>
          <n-tab name="docs">文档</n-tab>
        </n-tabs>
      </div>
    </div>

    <!-- Pipeline Tab -->
    <div v-if="activeTab === 'pipeline'" class="flex flex-col flex-1 overflow-hidden">
      <div v-if="project && currentStage" class="px-6 pt-4 pb-2">
        <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #636366;">
          <span style="color: #D97706;">{{ currentStage }}</span>
        </p>
      </div>

      <!-- Empty state -->
      <n-empty v-if="!project || !project.state" description="选择一个项目查看流水线" style="margin: auto;" />

      <!-- Stages -->
      <div v-else class="flex-1 overflow-y-auto px-6 pb-5 space-y-5">
        <PipelineStage name="brainstorm" title="头脑风暴" :steps="getStageSteps('brainstorm')" :status="getStageStatus('brainstorm')" :is-active="currentStage === 'brainstorm'" :active-step="activeStep" @select-step="handleSelectStep" />
        <div v-if="hasStage('plan')" class="flex items-center pl-[3px]"><div class="w-px h-4" style="background: #F0F0F3;" /></div>
        <PipelineStage name="plan" title="规划" :steps="getStageSteps('plan')" :status="getStageStatus('plan')" :is-active="currentStage === 'plan'" :active-step="activeStep" @select-step="handleSelectStep" />
        <div v-if="hasStage('execute')" class="flex items-center pl-[3px]"><div class="w-px h-4" style="background: #F0F0F3;" /></div>
        <PipelineStage name="execute" title="执行" :steps="getStageSteps('execute')" :status="getStageStatus('execute')" :is-active="currentStage === 'execute'" :active-step="activeStep" @select-step="handleSelectStep" />
        <div v-if="hasStage('verify')" class="flex items-center pl-[3px]"><div class="w-px h-4" style="background: #F0F0F3;" /></div>
        <PipelineStage name="verify" title="验证" :steps="getStageSteps('verify')" :status="getStageStatus('verify')" :is-active="currentStage === 'verify'" :active-step="activeStep" @select-step="handleSelectStep" />
      </div>

      <!-- Activity Log -->
      <div v-if="project?.state?.progress" style="border-top: 1px solid #F0F0F3; background: rgba(0,0,0,0.03);">
        <div class="px-6 py-2.5 flex items-center justify-between">
          <div class="text-[9px] font-semibold uppercase tracking-[0.25em] font-[JetBrains_Mono,monospace]" style="color: #6B7280;">活动日志</div>
          <div class="text-[10px] font-mono-log" style="color: #D1D1D6;">{{ activityLogs.length }}</div>
        </div>
        <div class="px-6 pb-3 max-h-32 overflow-y-auto">
          <n-timeline size="small">
            <n-timeline-item
              v-for="(log, i) in activityLogs"
              :key="i"
              :type="log.status === 'completed' ? 'success' : 'warning'"
            >
              <template #default>
                <span class="text-[11px]" style="color: #636366;">{{ log.description }}</span>
              </template>
              <template #time>
                <span class="text-[10px] font-mono-log" style="color: #D1D1D6;">{{ log.time }}</span>
              </template>
            </n-timeline-item>
          </n-timeline>
          <div v-if="activityLogs.length === 0" class="text-[10px] py-1" style="color: #D1D1D6;">暂无活动记录</div>
        </div>
      </div>
    </div>

    <!-- Docs Tab -->
    <div v-if="activeTab === 'docs'" class="flex-1 flex overflow-hidden">
      <div class="w-[200px] flex-shrink-0 overflow-hidden" style="border-right: 1px solid #F0F0F3;">
        <DocTree :groups="docs.groups" :selected-file="selectedDocFile" @select-file="$emit('select-doc-file', $event)" />
      </div>
      <div class="flex-1 overflow-hidden">
        <DocPreview :content="docContent" :loading="docLoading" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PipelineStage from './PipelineStage.vue'
import DocTree from './DocTree.vue'
import DocPreview from './DocPreview.vue'

const props = defineProps({
  project: { type: Object, default: null },
  activeStep: { type: Object, default: null },
  activeTab: { type: String, default: 'pipeline' },
  docs: { type: Object, default: () => ({ groups: [] }) },
  selectedDocFile: { type: Object, default: null },
  docContent: { type: String, default: '' },
  docLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['select-step', 'switch-tab', 'select-doc-file'])

const currentStage = computed(() => props.project?.state?.currentStage || '')
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
