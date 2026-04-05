<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-[#30363D]">
      <h1 class="text-xl font-bold text-[#00D4AA]">SillySpec</h1>
      <p class="text-xs text-[#8B949E] mt-1">Dashboard</p>
    </div>

    <!-- Projects List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="projects.length === 0" class="p-4 text-center text-[#8B949E]">
        <div class="text-4xl mb-2">🔍</div>
        <p>未发现 SillySpec 项目</p>
        <p class="text-xs mt-1">在当前目录或 HOME 目录下的子目录中查找 .sillyspec</p>
      </div>

      <div v-else class="p-2 space-y-1">
        <div
          v-for="project in projects"
          :key="project.name"
          :class="[
            'p-3 rounded-lg cursor-pointer transition-all duration-200',
            'hover:bg-[#00D4AA]/10',
            isActive(project) ? 'bg-[#00D4AA]/20 ring-1 ring-[#00D4AA]/50' : 'bg-[#161B22]'
          ]"
          @click="$emit('select', project)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <h3
                :class="[
                  'font-medium truncate',
                  isActive(project) ? 'text-[#00D4AA]' : 'text-[#C9D1D9]'
                ]"
              >
                {{ project.name }}
              </h3>
              <p class="text-xs text-[#8B949E] mt-0.5 truncate">
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
            class="mt-2 h-1 bg-[#0D1117] rounded-full overflow-hidden"
          >
            <div
              :class="[
                'h-full transition-all duration-500',
                getProgressColor(project)
              ]"
              :style="{ width: getProjectProgress(project) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-3 border-t border-[#30363D] text-xs text-[#8B949E]">
      <div class="flex items-center justify-between">
        <span>{{ projects.length }} 个项目</span>
        <span class="text-[#00D4AA]">⌘K</span>
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

function getProgressColor(project) {
  const status = getProjectStatus(project)
  const colors = {
    'completed': 'bg-emerald-500',
    'in-progress': 'bg-teal-500',
    'blocked': 'bg-amber-500',
    'failed': 'bg-red-500',
    'pending': 'bg-gray-600'
  }
  return colors[status] || colors.pending
}
</script>
