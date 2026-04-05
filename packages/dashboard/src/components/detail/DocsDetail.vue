<template>
  <div v-if="data?.length" class="px-4 py-3">
    <div v-for="group in data" :key="group.key" class="mb-4">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">
        {{ group.icon }} {{ group.label }} ({{ group.files.length }})
      </h4>
      <div class="space-y-1">
        <div
          v-for="f in group.files"
          :key="f.path"
          class="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] cursor-pointer hover:bg-[#FEF3C7] transition-colors"
          @click="$emit('open-file', f)"
        >
          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span class="truncate" style="color: #1C1C1E;">{{ f.name }}</span>
          <span class="ml-auto flex-shrink-0 font-mono text-[10px]" style="color: #9CA3AF;">{{ formatSize(f.size) }}</span>
          <span class="flex-shrink-0 text-[10px]" style="color: #9CA3AF;">{{ relativeTime(f.mtime) }}</span>
        </div>
      </div>
    </div>
  </div>
  <n-empty v-else description="无文档" style="padding: 48px 0;" />
</template>

<script setup>
defineProps({ data: { type: Array, default: () => [] } })
defineEmits(['open-file'])

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
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
