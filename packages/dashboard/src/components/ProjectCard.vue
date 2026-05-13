<template>
  <div
    class="project-card"
    :class="{ selected: isSelected }"
    @click="$emit('select', project)"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <span class="project-name">{{ project.name }}</span>
      <span class="last-active">{{ formatTime(project.lastActive) }}</span>
    </div>

    <!-- 阶段标签 -->
    <div>
      <span class="stage-badge" :class="stageClass">{{ stageLabel }}</span>
    </div>

    <!-- 进度条 -->
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :class="stageClass" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="progress-text">{{ progressPercent }}%</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  project: { type: Object, required: true },
  isSelected: { type: Boolean, default: false }
})

defineEmits(['select'])

const stageLabel = computed(() => {
  const stage = props.project?.state?.currentStage
  if (!stage) return '未开始'
  const stageNames = {
    brainstorm: '需求探索',
    plan: '实现计划',
    execute: '波次执行',
    verify: '验证确认'
  }
  return stageNames[stage] || stage
})

const stageClass = computed(() => {
  const stage = props.project?.state?.currentStage
  if (!stage) return 'pending'
  const progress = props.project?.state?.progress?.stages?.[stage]
  if (progress?.status === 'completed') return 'completed'
  if (progress?.status === 'in-progress') return 'in-progress'
  return 'pending'
})

const progressPercent = computed(() => {
  const stage = props.project?.state?.currentStage
  if (!stage) return 0
  const progress = props.project?.state?.progress?.stages?.[stage]
  if (!progress) return 0
  if (progress.completedSteps !== undefined && progress.steps !== undefined) {
    return Math.round((progress.completedSteps / progress.steps) * 100)
  }
  if (progress.status === 'completed') return 100
  if (progress.status === 'in-progress') return 50
  return 0
})

function formatTime(iso) {
  if (!iso) return '昨天'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  if (diffMs < 60000) return '刚刚'
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`
  return '昨天'
}
</script>

<style scoped>
.project-card {
  width: 280px;
  height: 120px;
  background: white;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.project-card:hover {
  border-color: #D97706;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15);
}

.project-card.selected {
  border-color: #D97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.last-active {
  font-size: 11px;
  color: #9CA3AF;
}

.stage-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.stage-badge.in-progress {
  background: #DBEAFE;
  color: #1D4ED8;
}

.stage-badge.completed {
  background: #D1FAE5;
  color: #047857;
}

.stage-badge.pending {
  background: #F3F4F6;
  color: #6B7280;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #E5E7EB;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-fill.in-progress {
  background: #3B82F6;
}

.progress-fill.completed {
  background: #10B981;
}

.progress-fill.pending {
  background: #9CA3AF;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
</style>
