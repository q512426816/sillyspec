<template>
  <n-modal :show="isOpen" @update:show="$emit('close')" :mask-closable="true" transform-origin="center" style="max-width: 480px;">
    <div class="overflow-hidden rounded-md" style="background: #FFFFFF; border: 1px solid #E5E5EA; box-shadow: 0 25px 60px rgba(0,0,0,0.1);">
      <!-- Search -->
      <div class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
        <n-input v-model:value="searchQuery" placeholder="搜索项目或命令..." ref="searchInput" @keydown="handleKeydown" size="small">
          <template #prefix>
            <svg class="w-3.5 h-3.5" style="color: #6B7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </template>
        </n-input>
      </div>

      <!-- Results -->
      <div class="max-h-72 overflow-y-auto">
        <n-empty v-if="filteredItems.length === 0" description="无结果" style="padding: 40px 0;" />
        <div v-else class="py-0.5">
          <div
            v-for="(item, index) in filteredItems"
            :key="item.id"
            :class="['px-4 py-2.5 cursor-pointer transition-colors duration-100 flex items-center gap-3']"
            :style="{ background: selectedIndex === index ? 'rgba(217,119,6,0.06)' : 'transparent' }"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = index"
          >
            <div class="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-[JetBrains_Mono,monospace] flex-shrink-0" style="background: #F0F0F3; border: 1px solid #F0F0F3; color: #6B7280;">
              {{ item.type === 'project' ? '□' : '◇' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[12px] font-medium truncate font-[JetBrains_Mono,monospace]" style="color: #1C1C1E;">{{ item.title }}</div>
              <div class="text-[10px] truncate" style="color: #6B7280;">{{ item.subtitle }}</div>
            </div>
            <StageBadge v-if="item.status" :status="item.status" size="sm" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-2 flex items-center gap-4 text-[9px] font-mono-log" style="border-top: 1px solid #F0F0F3; color: #D1D1D6;">
        <span><kbd class="px-1 rounded-sm" style="background: #F0F0F3; border: 1px solid #F0F0F3;">↑↓</kbd> 导航</span>
        <span><kbd class="px-1 rounded-sm" style="background: #F0F0F3; border: 1px solid #F0F0F3;">↵</kbd> 打开</span>
        <span><kbd class="px-1 rounded-sm" style="background: #F0F0F3; border: 1px solid #F0F0F3;">esc</kbd> 关闭</span>
      </div>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import StageBadge from './StageBadge.vue'

const props = defineProps({ isOpen: { type: Boolean, default: false }, projects: { type: Array, default: () => [] } })
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
    const pm = !searchQuery.value || project.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || project.path.toLowerCase().includes(searchQuery.value.toLowerCase())
    if (pm) items.push({ id: `project-${project.name}`, type: 'project', title: project.name, subtitle: project.path, data: project, status: getProjectStatus(project) })
    for (const stage of stageNames) {
      const sm = !searchQuery.value || stage.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || stage.id.toLowerCase().includes(searchQuery.value.toLowerCase())
      if (sm || pm) items.push({ id: `stage-${project.name}-${stage.id}`, type: 'stage', title: `${project.name} / ${stage.name}`, subtitle: `Jump to ${stage.name}`, data: { project, stage: stage.id }, status: getStageStatus(project, stage.id) })
    }
  }
  return items
})

function getProjectStatus(p) { const s = p.state?.progress?.stages?.[p.state?.currentStage]?.steps || []; if (s.some(x => x.status === 'failed')) return 'failed'; if (s.some(x => x.status === 'in-progress')) return 'in-progress'; if (s.every(x => x.status === 'completed')) return 'completed'; return 'pending' }
function getStageStatus(p, id) { const s = p.state?.progress?.stages?.[id]?.steps || []; if (!s.length) return 'pending'; if (s.some(x => x.status === 'failed')) return 'failed'; if (s.some(x => x.status === 'in-progress')) return 'in-progress'; if (s.every(x => x.status === 'completed')) return 'completed'; return 'pending' }
function close() { searchQuery.value = ''; selectedIndex.value = 0; emit('close') }
function selectItem(item) { if (item.type === 'project') emit('select-project', item.data); else emit('select-stage', item.data); close() }
function handleKeydown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex.value = Math.max(selectedIndex.value - 1, 0) }
  else if (e.key === 'Enter') { e.preventDefault(); if (filteredItems.value[selectedIndex.value]) selectItem(filteredItems.value[selectedIndex.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); close() }
}
watch(filteredItems, () => { selectedIndex.value = 0 })
watch(() => props.isOpen, (v) => { if (v) { nextTick(() => { searchInput.value?.focus() }) } })
</script>
