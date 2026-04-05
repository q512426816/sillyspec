<template>
  <div class="h-full flex flex-col noise-bg">
    <!-- Header -->
    <div class="relative z-10 px-5 pt-5 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-md flex items-center justify-center" style="background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%); clip-path: polygon(0 0, 100% 0, 85% 100%, 15% 100%);">
          <span class="text-[10px] font-bold text-black font-[JetBrains_Mono,monospace]">S</span>
        </div>
        <div>
          <h1 class="text-[13px] font-semibold tracking-tight font-[JetBrains_Mono,monospace]" style="color: #E4E4E7;">
            SillySpec
          </h1>
          <p class="text-[10px] tracking-widest uppercase" style="color: #525252;">Dashboard</p>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-4 h-px" style="background: linear-gradient(90deg, transparent, #2A2A2D, transparent);"></div>

    <!-- Projects List -->
    <div class="flex-1 overflow-y-auto py-3 relative z-10">
      <!-- Loading skeleton -->
      <div v-if="isLoading" class="px-4 space-y-2">
        <div v-for="i in 4" :key="i" class="rounded-lg p-3" style="background: #141416;">
          <div class="h-3 rounded w-20 skeleton-shimmer mb-2"></div>
          <div class="h-2 rounded w-32 skeleton-shimmer"></div>
        </div>
        <p class="text-center text-[10px] mt-4 font-[JetBrains_Mono,monospace]" style="color: #525252;">
          scanning projects...
        </p>
      </div>

      <!-- Empty state -->
      <div v-else-if="projects.length === 0" class="px-4 py-12 text-center">
        <div class="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center" style="border: 1px dashed #2A2A2D;">
          <svg class="w-4 h-4" style="color: #525252;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <p class="text-[11px]" style="color: #8B8B8E;">No projects found</p>
        <p class="text-[10px] mt-1" style="color: #525252;">Looking for .sillyspec dirs</p>
      </div>

      <!-- Projects -->
      <div v-else class="px-3 space-y-0.5">
        <div
          v-for="project in projects"
          :key="project.name"
          :class="[
            'relative rounded-md cursor-pointer transition-all duration-150 overflow-hidden group',
          ]"
          :style="{
            background: isActive(project) ? 'rgba(251,191,36,0.06)' : 'transparent',
            borderLeft: isActive(project) ? '2px solid #FBBF24' : '2px solid transparent',
          }"
          @mouseenter="$event.currentTarget.style.background = isActive(project) ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)'"
          @mouseleave="$event.currentTarget.style.background = isActive(project) ? 'rgba(251,191,36,0.06)' : 'transparent'"
          @click="$emit('select', project)"
        >
          <div class="px-3 py-2.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h3
                  :class="['text-[12px] font-medium truncate transition-colors duration-150 font-[JetBrains_Mono,monospace]']"
                  :style="{ color: isActive(project) ? '#FBBF24' : '#E4E4E7' }"
                >
                  {{ project.name }}
                </h3>
                <p class="text-[10px] mt-0.5 truncate font-mono-log" style="color: #525252;">
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

            <!-- Progress -->
            <div v-if="project.state?.progress" class="mt-2 h-[2px] rounded-full overflow-hidden" style="background: #1C1C1F;">
              <div
                class="h-full rounded-full transition-all duration-500 progress-gradient"
                :style="{ width: getProjectProgress(project) + '%' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="relative z-10 px-4 py-2.5" style="border-top: 1px solid #1F1F22;">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-[JetBrains_Mono,monospace]" style="color: #525252;">{{ projects.length }} proj</span>
        <kbd class="text-[9px] px-1.5 py-0.5 rounded font-mono-log" style="color: #525252; background: #141416; border: 1px solid #2A2A2D;">⌘K</kbd>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  activeProject: { type: Object, default: null },
  isLoading: { type: Boolean, default: false }
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
  const labels = { 'brainstorm': '头脑风暴', 'plan': '规划', 'execute': '执行', 'verify': '验证' }
  return labels[stage] || stage || '未知'
}

function getProjectProgress(project) {
  const progress = project.state?.progress
  if (!progress) return 0
  const stages = progress.stages || {}
  const stageNames = ['brainstorm', 'plan', 'execute', 'verify']
  let total = 0, done = 0
  for (const s of stageNames) {
    const st = stages[s]
    if (st?.steps) { total += st.steps.length; done += st.steps.filter(x => x.status === 'completed').length }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}
</script>
