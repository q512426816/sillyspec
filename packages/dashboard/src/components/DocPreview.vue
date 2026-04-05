<template>
  <div class="h-full overflow-y-auto px-6 py-4">
    <div v-if="!content && !loading" class="flex items-center justify-center h-full">
      <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #525252;">选择一个文档查看内容</p>
    </div>
    <div v-else-if="loading" class="flex items-center justify-center h-full">
      <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #525252;">加载中...</p>
    </div>
    <div v-else class="doc-preview" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return simpleMarkdown(props.content)
})

function simpleMarkdown(md) {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="color:#FBBF24;font-size:14px;font-weight:600;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#E5E5E5;font-size:15px;font-weight:600;margin:20px 0 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#FBBF24;font-size:18px;font-weight:700;margin:0 0 16px;">$1</h1>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#0A0A0B;border:1px solid #1F1F22;border-radius:6px;padding:12px;overflow-x:auto;font-size:12px;margin:8px 0;"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:#0A0A0B;padding:1px 4px;border-radius:3px;font-size:11px;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#E5E5E5;">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#FBBF24;">$1</a>')
    .replace(/^- \[x\] (.+)$/gm, '<div style="color:#34D399;">☑ $1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="color:#8B8B8E;">☐ $1</div>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px;color:#8B8B8E;">• $1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
  return html
}
</script>
