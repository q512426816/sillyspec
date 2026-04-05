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
        class="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl z-50"
      >
        <div class="bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl overflow-hidden">
          <!-- Search input -->
          <div class="p-4 border-b border-[#30363D]">
            <div class="flex items-center gap-3">
              <span class="text-[#00D4AA] text-xl">⌘</span>
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="搜索项目或阶段..."
                class="flex-1 bg-transparent border-none outline-none text-[#C9D1D9] placeholder-[#8B949E]"
                @keydown="handleKeydown"
              />
              <span v-if="searchQuery" class="text-xs text-[#8B949E]">ESC 关闭</span>
            </div>
          </div>

          <!-- Results -->
          <div class="max-h-80 overflow-y-auto">
            <div v-if="filteredItems.length === 0" class="p-8 text-center text-[#8B949E]">
              <div class="text-4xl mb-2">🔍</div>
              <p>没有找到结果</p>
            </div>

            <div v-else class="py-2">
              <div
                v-for="(item, index) in filteredItems"
                :key="item.id"
                :class="[
                  'px-4 py-3 cursor-pointer transition-colors',
                  'flex items-center gap-3',
                  selectedIndex === index
                    ? 'bg-[#00D4AA]/10'
                    : 'hover:bg-[#0D1117]'
                ]"
                @click="selectItem(item)"
                @mouseenter="selectedIndex = index"
              >
                <span class="text-xl">{{ item.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-[#C9D1D9] truncate">{{ item.title }}</div>
                  <div class="text-xs text-[#8B949E] truncate">{{ item.subtitle }}</div>
                </div>
                <StageBadge v-if="item.status" :status="item.status" size="sm" />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-2 border-t border-[#30363D] flex items-center justify-between text-xs text-[#8B949E]">
            <div class="flex items-center gap-4">
              <span><kbd class="px-1.5 py-0.5 bg-[#0D1117] rounded">↑↓</kbd> 选择</span>
              <span><kbd class="px-1.5 py-0.5 bg-[#0D1117] rounded">Enter</kbd> 打开</span>
              <span><kbd class="px-1.5 py-0.5 bg-[#0D1117] rounded">ESC</kbd> 关闭</span>
            </div>
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
  { id: 'brainstorm', name: '头脑风暴', icon: '💡' },
  { id: 'plan', name: '规划', icon: '📋' },
  { id: 'execute', name: '执行', icon: '⚙️' },
  { id: 'verify', name: '验证', icon: '✅' }
]

const filteredItems = computed(() => {
  if (!searchQuery.value) {
    // Show all projects and stages
    const items = []

    for (const project of props.projects) {
      items.push({
        id: `project-${project.name}`,
        type: 'project',
        icon: '📁',
        title: project.name,
        subtitle: project.path,
        data: project,
        status: getProjectStatus(project)
      })

      // Add stages for this project
      for (const stage of stageNames) {
        items.push({
          id: `stage-${project.name}-${stage.id}`,
          type: 'stage',
          icon: stage.icon,
          title: `${project.name} - ${stage.name}`,
          subtitle: `跳转到 ${stage.name} 阶段`,
          data: { project, stage: stage.id },
          status: getStageStatus(project, stage.id)
        })
      }
    }

    return items
  }

  // Filter by search query
  const query = searchQuery.value.toLowerCase()
  const items = []

  for (const project of props.projects) {
    const projectMatch = project.name.toLowerCase().includes(query) ||
                        project.path.toLowerCase().includes(query)

    if (projectMatch) {
      items.push({
        id: `project-${project.name}`,
        type: 'project',
        icon: '📁',
        title: project.name,
        subtitle: project.path,
        data: project,
        status: getProjectStatus(project)
      })
    }

    // Search stages
    for (const stage of stageNames) {
      const stageMatch = stage.name.toLowerCase().includes(query) ||
                        stage.id.toLowerCase().includes(query)

      if (stageMatch || projectMatch) {
        items.push({
          id: `stage-${project.name}-${stage.id}`,
          type: 'stage',
          icon: stage.icon,
          title: `${project.name} - ${stage.name}`,
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

// Reset selection when filtered items change
watch(filteredItems, () => {
  selectedIndex.value = 0
})

// Focus input when opened
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})
</script>

<style scoped>
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.2s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.palette-enter-active,
.palette-leave-active {
  transition: all 0.2s ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

kbd {
  font-family: inherit;
  font-size: 0.75rem;
}
</style>
