<template>
  <div v-if="data" class="px-4 py-3">
    <!-- Branch -->
    <div class="mb-4">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">当前分支</h4>
      <div class="text-[18px] font-bold font-[JetBrains_Mono,monospace]" style="color: #D97706;">{{ data.branch || '—' }}</div>
    </div>

    <!-- Commits -->
    <div v-if="data.commits?.length" class="mb-4">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">最近提交</h4>
      <div class="space-y-2">
        <div v-for="c in data.commits" :key="c.hash" class="px-3 py-2 rounded-md" style="background: #F5F5F7;">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-mono font-semibold" style="color: #D97706;">{{ c.hash }}</span>
            <span class="text-[11px] flex-1 truncate" style="color: #1C1C1E;">{{ c.message }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1 text-[10px]" style="color: #6B7280;">
            <span>{{ c.author }}</span>
            <span>·</span>
            <span>{{ relativeTime(c.date) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Untracked -->
    <div v-if="data.untracked?.length">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">未提交文件</h4>
      <div class="space-y-1">
        <div v-for="f in data.untracked" :key="f.file" class="flex items-center gap-2 px-2 py-1 rounded text-[11px] font-[JetBrains_Mono,monospace]">
          <span class="font-semibold w-5 text-center" :style="{ color: statusColor(f.status) }">{{ f.status }}</span>
          <span class="truncate" style="color: #1C1C1E;">{{ f.file }}</span>
        </div>
      </div>
    </div>
  </div>
  <n-empty v-else description="无 Git 信息" style="padding: 48px 0;" />
</template>

<script setup>
defineProps({ data: { type: Object, default: null } })

function statusColor(s) {
  if (s.includes('M')) return '#F59E0B'
  if (s.includes('A') || s === '?') return '#10B981'
  if (s.includes('D')) return '#EF4444'
  return '#9CA3AF'
}

function relativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>
