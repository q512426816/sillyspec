<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        @click="close"
      />
    </Transition>

    <Transition name="palette">
      <div
        v-if="isOpen"
        class="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg z-50"
      >
        <div class="bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          <!-- Search input -->
          <div class="px-4 py-3.5 border-b border-border">
            <div class="flex items-center gap-3">
              <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="搜索项目或阶段..."
                class="flex-1 bg-transparent border-none outline-none text-[13px] text-text placeholder-text-secondary"
                @keydown="handleKeydown"
              />
              <kbd v-if="searchQuery" class="text-[10px] text-muted px-1.5 py-0.5 rounded-md bg-bg border border-border font-mono-log">ESC</kbd>
            </div>
          </div>

          <!-- Results -->
          <div class="max-h-72 overflow-y-auto">
            <div v-if="filteredItems.length === 0" class="py-10 text-center">
              <p class="text-xs text-text-secondary">没有找到结果</p>
            </div>

            <div v-else class="py-1">
              <div
                v-for="(item, index) in filteredItems"
                :key="item.id"
                :class="[
                  'px-4 py-2.5 cursor-pointer transition-colors duration-100',
                  'flex items-center gap-3',
                  selectedIndex === index
                    ? 'bg-primary/8'
                    : 'hover:bg-white/[0.03]'
                ]"
                @click="selectItem(item)"
                @mouseenter="selectedIndex = index"
              >
                <div class="w-7 h-7 rounded-lg bg-bg border border-border flex items-center justify-center text-xs text-text-secondary flex-shrink-0">
                  {{ item.type === 'project' ? '◉' : '◈' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[13px] font-medium text-text truncate">{{ item.title }}</div>
                  <div class="text-[11px] text-text-secondary truncate">{{ item.subtitle }}</div>
                </div>
                <StageBadge v-if="item.status" :status="item.status" size="sm" />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-2 border-t border-border flex items-center gap-4 text-[11px] text-text-secondary">
            <span><kbd class="px-1 py-0.5 bg-bg rounded border border-border text-[10px] font-mono-log">↑↓</kbd> 选择</span>
            <span><kbd class="px-1 py-0.5 bg-bg rounded border border-border text-[10px] font-mono-log">↵</kbd> 打开</span>
            <span><kbd class="px-1 py-0.5 bg-bg rounded border border-border text-[10px] font-mono-log">esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  projects: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'select-project', 'select-stage'])

const searchQuery = ref('')
const searchInput = ref(null)
const selectedIndex = ref(0)

const stageNames = [
  { id: 'brainstorm', name: '头脑风暴' },
  { id: 'plan', name: '规划' },
  { id: 'execute', name: '执行' },
  { id: 'verify', name: '验证' }
]

const filteredItems = computed(() => {
  const items = []
  for (const project of props.projects) {
    const projectMatch = !searchQuery.value ||
      project.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      project.path.toLowerCase().includes(searchQuery.value.toLowerCase())

    if (projectMatch) {
      items.push({
        id: `project-${project.name}`,
        type: 'project',
        title: project.name,
        subtitle: project.path,
        data: project,
        status: getProjectStatus(project)
      })
    }

    for (const stage of stageNames) {
      const stageMatch = !searchQuery.value ||
        stage.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        stage.id.toLowerCase().includes(searchQuery.value.toLowerCase())

      if (stageMatch || projectMatch) {
        items.push({
          id: `stage-${project.name}-${stage.id}`,
          type: 'stage',
          title: `${project.name} / ${stage.name}`,
          subtitle: `跳转到 ${stage.name} 阶段`,
          data: { project, stage: stage.id },
          status: getStageStatus(project, stage.id)
        })
      }
    }
  }
  return items
})

function getProjectStatus(project) {
  const stage = project.state?.currentStage
  if (!stage) return 'pending'
  const stageData = project.state?.progress?.stages?.[stage]
  const steps = stageData?.steps || []
  if (steps.some(s => s.status === 'failed')) return 'failed'
  if (steps.some(s => s.status === 'blocked')) return 'blocked'
  if (steps.some(s => s.status === 'in-progress')) return 'in-progress'
  if (steps.every(s => s.status === 'completed')) return 'completed'
  return 'pending'
}

function getStageStatus(project, stageId) {
  const stageData = project.state?.progress?.stages?.[stageId]
  const steps = stageData?.steps || []
  if (steps.length === 0) return 'pending'
  if (steps.some(s => s.status === 'failed')) return 'failed'
  if (steps.some(s => s.status === 'blocked')) return 'blocked'
  if (steps.some(s => s.status === 'in-progress')) return 'in-progress'
  if (steps.every(s => s.status === 'completed')) return 'completed'
  return 'pending'
}

function close() {
  searchQuery.value = ''
  selectedIndex.value = 0
  emit('close')
}

function selectItem(item) {
  if (item.type === 'project') {
    emit('select-project', item.data)
  } else if (item.type === 'stage') {
    emit('select-stage', item.data)
  }
  close()
}

function handleKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (filteredItems.value[selectedIndex.value]) {
      selectItem(filteredItems.value[selectedIndex.value])
    }
  } else if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

watch(filteredItems, () => { selectedIndex.value = 0 })
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) { nextTick(() => { searchInput.value?.focus() }) }
})
</script>

<style scoped>
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 150ms ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.palette-enter-active,
.palette-leave-active {
  transition: all 150ms ease;
}
.palette-enter-from,
.palette-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
