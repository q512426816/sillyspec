<template>
  <div class="h-full flex flex-col noise-bg">
    <!-- Header -->
    <div class="relative z-10 px-5 pt-5 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-md flex items-center justify-center" style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); clip-path: polygon(0 0, 100% 0, 85% 100%, 15% 100%);">
          <span class="text-[10px] font-bold text-black font-[JetBrains_Mono,monospace]">S</span>
        </div>
        <img src="/logo.jpg" style="width:28px;height:28px;border-radius:6px;margin-right:8px;">
        <div class="flex-1">
          <h1 class="text-[13px] font-semibold tracking-tight font-[JetBrains_Mono,monospace]" style="color: #1C1C1E;">
            SillySpec
          </h1>
          <p class="text-[10px] tracking-widest uppercase" style="color: #6B7280;">控制台</p>
        </div>
        <!-- Scan paths gear button -->
        <n-button quaternary size="tiny" @click="showScanPanel = !showScanPanel" :type="showScanPanel ? 'primary' : 'default'">
          <template #icon>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </template>
        </n-button>
      </div>

      <!-- Scan paths panel (inline) -->
      <Transition name="slide">
        <div v-if="showScanPanel" class="mt-3 rounded-md p-3" style="background: #FFFFFF; border: 1px solid #F0F0F3;">
          <div class="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">扫描路径</div>

          <div v-if="scanPaths.length === 0" class="text-[10px] py-1" style="color: #D1D1D6;">暂无自定义路径</div>
          <div v-else class="space-y-1 mb-2">
            <div v-for="(p, i) in scanPaths" :key="i" class="flex items-center gap-2 text-[10px] group">
              <span class="flex-1 truncate font-mono-log" style="color: #636366;">{{ p }}</span>
              <n-button quaternary size="tiny" type="error" @click="removePath(p)">✕</n-button>
            </div>
          </div>

          <!-- Add path -->
          <div v-if="showAddInput" class="flex items-center gap-2">
            <n-input v-model:value="newPath" size="tiny" placeholder="输入目录路径..." @keydown.enter="addPath" @keydown.escape="showAddInput = false" ref="pathInput" />
            <n-button size="tiny" type="primary" @click="addPath">添加</n-button>
          </div>
          <n-button v-else size="tiny" dashed @click="showAddInput = true">+ 添加目录</n-button>
        </div>
      </Transition>
    </div>

    <!-- Divider -->
    <div class="mx-4 h-px" style="background: linear-gradient(90deg, transparent, #E5E5EA, transparent);"></div>

    <!-- Projects List -->
    <div class="flex-1 overflow-y-auto py-3 relative z-10">
      <!-- Loading skeleton -->
      <div v-if="isLoading" class="px-4 space-y-2">
        <n-card v-for="i in 4" :key="i" size="small" :bordered="false">
          <n-skeleton text :width="80" size="small" />
          <n-skeleton text :width="140" size="small" style="margin-top: 6px;" />
        </n-card>
        <p class="text-center text-[10px] mt-4 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">
          正在扫描项目...
        </p>
      </div>

      <!-- Empty state -->
      <n-empty v-else-if="projects.length === 0" description="未发现 SillySpec 项目" style="padding: 48px 0;" />

      <!-- Projects -->
      <div v-else class="px-3 space-y-0.5">
        <div
          v-for="project in projects"
          :key="project.path"
          :class="['relative rounded-md cursor-pointer transition-all duration-150 overflow-hidden group']"
          :style="{
            background: isActive(project) ? 'rgba(217,119,6,0.06)' : 'transparent',
            borderLeft: isActive(project) ? '2px solid #D97706' : '2px solid transparent',
          }"
          @mouseenter="$event.currentTarget.style.background = isActive(project) ? 'rgba(217,119,6,0.08)' : 'rgba(255,255,255,0.02)'"
          @mouseleave="$event.currentTarget.style.background = isActive(project) ? 'rgba(217,119,6,0.06)' : 'transparent'"
          @click="$emit('select', project)"
        >
          <div class="px-3 py-2.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h3
                  class="text-[12px] font-medium truncate transition-colors duration-150 font-[JetBrains_Mono,monospace]"
                  :style="{ color: isActive(project) ? '#D97706' : '#1C1C1E' }"
                >
                  {{ project.name }}
                </h3>
                <p class="text-[10px] mt-0.5 truncate font-mono-log" style="color: #6B7280;">
                  {{ project.path }}
                </p>
              </div>
              <n-tag
                v-if="project.state?.currentStage"
                :type="statusTagType(getProjectStatus(project))"
                size="small"
                :bordered="false"
                round
              >
                {{ stageLabel(project) }}
              </n-tag>
            </div>

            <!-- Progress -->
            <div v-if="project.state?.progress" class="mt-2 h-[2px] rounded-full overflow-hidden" style="background: #FFFFFF;">
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
    <div class="relative z-10 px-4 py-2.5" style="border-top: 1px solid #F0F0F3;">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-[JetBrains_Mono,monospace]" style="color: #6B7280;">{{ projects.length }} 个项目</span>
        <kbd class="text-[9px] px-1.5 py-0.5 rounded font-mono-log" style="color: #6B7280; background: #FFFFFF; border: 1px solid #E5E5EA;">⌘K</kbd>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  activeProject: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
  scanPaths: { type: Array, default: () => [] }
})

const emit = defineEmits(['select', 'scan:add-path', 'scan:remove-path'])

const showScanPanel = ref(false)
const showAddInput = ref(false)
const newPath = ref('')
const pathInput = ref(null)

watch(showAddInput, (v) => {
  if (v) nextTick(() => { pathInput.value?.focus() })
})

function isActive(project) {
  return props.activeProject?.path === project.path
}

function statusTagType(status) {
  const map = { 'in-progress': 'warning', 'completed': 'success', 'failed': 'error', 'blocked': 'warning' }
  return map[status] || 'default'
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

function addPath() {
  const p = newPath.value.trim()
  if (p) {
    emit('scan:add-path', p)
    newPath.value = ''
    showAddInput.value = false
  }
}

function removePath(p) {
  emit('scan:remove-path', p)
}
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 200ms ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; overflow: hidden; }
.slide-enter-to, .slide-leave-from { max-height: 300px; }
</style>
