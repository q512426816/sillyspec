<template>
  <div class="h-full overflow-y-auto px-6 py-4">
    <div v-if="!content && !loading" class="flex items-center justify-center h-full">
      <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #636366;">选择一个文档查看内容</p>
    </div>
    <div v-else-if="loading" class="flex items-center justify-center h-full">
      <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #636366;">加载中...</p>
    </div>
    <div v-else class="doc-preview" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

marked.setOptions({
  breaks: true,
  gfm: true
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return marked.parse(props.content)
})
</script>

<style scoped>
.doc-preview {
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
}

.doc-preview :deep(h1) {
  color: #D97706;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  border-bottom: 1px solid #E5E5EA;
  padding-bottom: 8px;
}

.doc-preview :deep(h2) {
  color: #1C1C1E;
  font-size: 15px;
  font-weight: 600;
  margin: 20px 0 10px;
}

.doc-preview :deep(h3) {
  color: #D97706;
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 8px;
}

.doc-preview :deep(p) {
  margin: 8px 0;
}

.doc-preview :deep(strong) {
  color: #1C1C1E;
  font-weight: 600;
}

.doc-preview :deep(a) {
  color: #D97706;
  text-decoration: none;
}

.doc-preview :deep(a:hover) {
  text-decoration: underline;
}

.doc-preview :deep(code) {
  background: #E5E5EA;
  color: #1C1C1E;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
}

.doc-preview :deep(pre) {
  background: #1C1C1E;
  color: #E5E5E7;
  border: 1px solid #E5E5EA;
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 12px;
  margin: 8px 0;
  line-height: 1.5;
}

.doc-preview :deep(pre code) {
  background: none;
  color: inherit;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

.doc-preview :deep(ul),
.doc-preview :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
  color: #374151;
}

.doc-preview :deep(li) {
  margin: 4px 0;
}

.doc-preview :deep(blockquote) {
  border-left: 3px solid #D97706;
  padding-left: 12px;
  margin: 12px 0;
  color: #636366;
  font-style: italic;
}

.doc-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 12px;
}

.doc-preview :deep(thead th) {
  background: #F0F0F3;
  color: #1C1C1E;
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid #E5E5EA;
}

.doc-preview :deep(tbody td) {
  padding: 6px 12px;
  border: 1px solid #E5E5EA;
  color: #374151;
}

.doc-preview :deep(tbody tr:hover) {
  background: #F9FAFB;
}

.doc-preview :deep(hr) {
  border: none;
  border-top: 1px solid #E5E5EA;
  margin: 16px 0;
}
</style>
