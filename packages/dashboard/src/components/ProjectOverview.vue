<template>
  <div v-if="project" class="project-overview">
    <!-- Name + Path -->
    <div class="ov-section">
      <span class="ov-name">{{ project.name }}</span>
      <span class="ov-path">{{ shortPath }}</span>
    </div>
    <div class="ov-divider" />

    <!-- Tech Stack -->
    <div class="ov-section ov-clickable" @click="$emit('show-detail', 'tech')">
      <span class="ov-label">技术栈</span>
      <span v-for="t in overview.techStack" :key="t" class="ov-tag">{{ t }}</span>
    </div>
    <div class="ov-divider" />

    <!-- Stage -->
    <div v-if="project.state?.currentStage" class="ov-section">
      <span class="ov-label">阶段</span>
      <span class="ov-value">{{ project.state.currentStage }}</span>
    </div>
    <div v-else-if="project.state" class="ov-section">
      <span class="ov-label">阶段</span>
      <span class="ov-value" style="color:#9CA3AF;">未执行</span>
    </div>
    <div v-if="project.state?.currentStage" class="ov-divider" />

    <!-- Last Active -->
    <div v-if="overview.lastActive" class="ov-section">
      <span class="ov-label">最近活跃</span>
      <span class="ov-value">{{ formatTime(overview.lastActive) }}</span>
    </div>
    <div v-if="overview.lastActive" class="ov-divider" />

    <!-- Doc Stats -->
    <div v-if="overview.docStats.total > 0" class="ov-section ov-clickable" @click="$emit('show-detail', 'docs')">
      <span class="ov-label">文档</span>
      <span class="ov-value">{{ docSummary }}</span>
    </div>
    <div v-if="overview.docStats.total > 0" class="ov-divider" />

    <!-- Git -->
    <div class="ov-section ov-git ov-clickable" @click="$emit('show-detail', 'git')">
      <span v-if="overview.git.branch" class="ov-branch">{{ overview.git.branch }}</span>
      <span v-if="overview.git.lastCommit" class="ov-commit" :title="overview.git.lastCommit">{{ truncate(overview.git.lastCommit, 40) }}</span>
      <span v-if="overview.git.dirtyCount > 0" class="ov-dirty">{{ overview.git.dirtyCount }} 未提交</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  project: { type: Object, default: null }
})

defineEmits(['show-detail'])

const overview = computed(() => props.project?.overview || { techStack: [], lastActive: null, docStats: { design: 0, plan: 0, archive: 0, changes: 0, scan: 0, quicklog: 0, total: 0 }, git: { branch: '', lastCommit: '', dirtyCount: 0 } })

const shortPath = computed(() => {
  const p = props.project?.path || ''
  return p.replace(/^\/Users\/[^/]+/, '~')
})

const docSummary = computed(() => {
  const s = overview.value.docStats
  const parts = []
  if (s.design) parts.push(`设计 ${s.design}`)
  if (s.plan) parts.push(`计划 ${s.plan}`)
  if (s.archive) parts.push(`归档 ${s.archive}`)
  if (s.changes) parts.push(`变更 ${s.changes}`)
  return parts.join(' / ') || `${s.total} 篇`
})

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  if (diffMs < 60000) return '刚刚'
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} 分钟前`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} 小时前`
  if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s
}
</script>

<style scoped>
.project-overview {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5EA;
  padding: 8px 16px;
  min-height: 48px;
  gap: 8px;
  flex-shrink: 0;
  overflow-x: auto;
}
.ov-section {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.ov-clickable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;
  margin: -2px -6px;
  transition: background 0.15s;
}
.ov-clickable:hover {
  background: rgba(217,119,6,0.06);
}
.ov-name {
  font-weight: 600;
  font-size: 13px;
  color: #1C1C1E;
}
.ov-path {
  font-size: 11px;
  color: #636366;
}
.ov-label {
  font-size: 11px;
  color: #636366;
}
.ov-value {
  font-size: 12px;
  color: #1C1C1E;
  font-weight: 500;
}
.ov-tag {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(217,119,6,0.08);
  color: #D97706;
  font-weight: 500;
}
.ov-divider {
  width: 1px;
  height: 20px;
  background: #E5E5EA;
  flex-shrink: 0;
}
.ov-git {
  margin-left: auto;
  gap: 10px;
}
.ov-branch {
  font-size: 11px;
  color: #636366;
  background: #F5F5F7;
  padding: 1px 8px;
  border-radius: 4px;
}
.ov-commit {
  font-size: 11px;
  color: #636366;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ov-dirty {
  font-size: 11px;
  color: #D97706;
  font-weight: 500;
}
</style>
