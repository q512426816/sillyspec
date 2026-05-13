<template>
  <div class="overview-section">
    <!-- 头部 -->
    <div class="section-header">
      <h1 class="section-title">
        项目概览
        <span class="badge">{{ projects.length }} 个项目</span>
      </h1>
      <div class="section-actions">
        <button class="btn btn-icon" title="刷新" @click="refresh">↻</button>
        <button class="btn btn-secondary" @click="resetLayout">重置布局</button>
      </div>
    </div>

    <!-- 卡片容器 -->
    <div class="cards-container">
      <ProjectCard
        v-for="project in projects"
        :key="project.name"
        :project="project"
        :is-selected="activeProject?.name === project.name"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import ProjectCard from './ProjectCard.vue'
import { useLayout } from '../composables/useLayout.js'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  activeProject: { type: Object, default: null }
})

const emit = defineEmits(['select'])

const { resetLayout } = useLayout()

function handleSelect(project) {
  emit('select', project)
}

function refresh() {
  // TODO: 实现刷新逻辑
  window.location.reload()
}

function resetLayout() {
  if (confirm('确定要重置布局吗？')) {
    useLayout().resetLayout()
  }
}
</script>

<style scoped>
.overview-section {
  height: 100%;
  background: #FFFFFF;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  background: #E5E7EB;
  border-radius: 10px;
  color: #6B7280;
  font-weight: 500;
}

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: #E5E7EB;
  color: #374151;
}

.btn-icon {
  padding: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border-radius: 6px;
}

.btn-icon:hover {
  background: #E5E7EB;
}

.cards-container {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
}

.cards-container::-webkit-scrollbar {
  height: 8px;
}

.cards-container::-webkit-scrollbar-track {
  background: #F3F4F6;
  border-radius: 4px;
}

.cards-container::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 4px;
}
</style>
