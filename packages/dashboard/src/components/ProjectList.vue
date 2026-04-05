<template>
  <div class="h-full flex flex-col bg-surface">
    <!-- Header -->
    <div class="px-5 pt-5 pb-4 border-b border-border">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-sm font-semibold text-text tracking-tight">SillySpec</h1>
          <p class="text-[10px] text-text-secondary">Dashboard</p>
        </div>
      </div>
    </div>

    <!-- Projects List -->
    <div class="flex-1 overflow-y-auto py-2">
      <div v-if="projects.length === 0" class="px-4 py-12 text-center">
        <div class="w-10 h-10 rounded-full bg-border/50 flex items-center justify-center mx-auto mb-3">
          <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <p class="text-xs text-text-secondary">未发现 SillySpec 项目</p>
        <p class="text-[10px] text-muted mt-1">查找 .sillyspec 配置目录</p>
      </div>

      <div v-else class="px-2 space-y-0.5">
        <div
          v-for="project in projects"
          :key="project.name"
          :class="[
            'relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100',
            'border border-transparent',
            isActive(project)
              ? 'bg-primary/8 border-primary/20'
              : 'hover:bg-white/[0.03] hover:border-border'
          ]"
          @click="$emit('select', project)"
        >
          <!-- Active indicator -->
          <div
            v-if="isActive(project)"
            class="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-primary"
          />

          <div class="flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
              <h3
                :class="[
                  'text-[13px] font-medium truncate transition-colors duration-100',
                  isActive(project) ? 'text-primary' : 'text-text'
                ]"
              >
                {{ project.name }}
              </h3>
              <p class="text-[11px] text-text-secondary mt-0.5 truncate font-mono-log">
                {{ project.path }}
              </p>
            </div>
            <StageBadge
              v-if="project.state?.currentStage"
              :status="getProjectStatus(project)"
              :label="stageLabel(project)"
              size="sm"
            />
          </div>

          <!-- Progress indicator -->
          <div
            v-if="project.state?.progress"
            class="mt-2 h-[3px] bg-bg rounded-full overflow-hidden"
          >
            <div
              class="h-full rounded-full transition-all duration-500 progress-gradient"
              :style="{ width: getProjectProgress(project) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-border">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-text-secondary">{{ projects.length }} 个项目</span>
        <kbd class="text-[10px] text-muted px-1.5 py-0.5 rounded bg-bg border border-border font-mono-log">⌘K</kbd>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  activeProject: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select'])

function isActive(project) {
  return props.activeProject?.name === project.name
}

function getProjectStatus(project) {
  const stage = project.state?.currentStage
  if (!stage) return 'pending'
  const stageData = project.state?.progress?.stages?.[stage]
  if (!stageData) return 'pending'
  const steps = stageData.steps || []
  if (steps.length === 0) return 'pending'
  if (steps.some(s => s.status === 'failed')) return 'failed'
  if (steps.some(s => s.status === 'blocked')) return 'blocked'
  if (steps.some(s => s.status === 'in-progress')) return 'in-progress'
  if (steps.every(s => s.status === 'completed')) return 'completed'
  return 'pending'
}

function stageLabel(project) {
  const stage = project.state?.currentStage
  const labels = {
    'brainstorm': '头脑风暴',
    'plan': '规划',
    'execute': '执行',
    'verify': '验证'
  }
  return labels[stage] || stage || '未知'
}

function getProjectProgress(project) {
  const progress = project.state?.progress
  if (!progress) return 0
  const stages = progress.stages || {}
  const stageNames = ['brainstorm', 'plan', 'execute', 'verify']
  let totalSteps = 0
  let completedSteps = 0
  for (const stageName of stageNames) {
    const stage = stages[stageName]
    if (stage?.steps) {
      totalSteps += stage.steps.length
      completedSteps += stage.steps.filter(s => s.status === 'completed').length
    }
  }
  if (totalSteps === 0) return 0
  return Math.round((completedSteps / totalSteps) * 100)
}
</script>
