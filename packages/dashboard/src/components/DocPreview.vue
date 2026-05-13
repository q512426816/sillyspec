<template>
  <div class="doc-preview-shell">
    <div v-if="!content && !loading" class="doc-empty">
      <p>选择一个文档查看内容</p>
    </div>
    <div v-else-if="loading" class="doc-empty">
      <p>加载中...</p>
    </div>
    <template v-else>
      <div class="doc-toolbar">
        <div class="doc-title" :title="fileTitle">{{ fileTitle }}</div>
        <n-button size="tiny" type="primary" @click="isModalOpen = true">弹窗阅读</n-button>
      </div>
      <div class="doc-preview-scroll">
        <div class="doc-preview" v-html="renderedContent"></div>
      </div>
    </template>

    <n-modal
      v-model:show="isModalOpen"
      preset="card"
      :title="fileTitle"
      style="width: min(920px, calc(100vw - 48px));"
    >
      <div class="doc-modal-body">
        <div class="doc-preview doc-preview-large" v-html="renderedContent"></div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  selectedFile: { type: Object, default: null }
})

const isModalOpen = ref(false)

marked.setOptions({
  breaks: true,
  gfm: true
})

watch(() => props.selectedFile?.path, () => {
  isModalOpen.value = false
})

const fileTitle = computed(() => {
  return props.selectedFile?.title || props.selectedFile?.name || '文档'
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return marked.parse(props.content)
})
</script>

<style scoped>
.doc-preview-shell {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
}

.doc-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: #636366;
  font-family: 'JetBrains Mono', monospace;
}

.doc-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #F0F0F3;
}

.doc-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #1C1C1E;
}

.doc-preview-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 22px;
}

.doc-modal-body {
  max-height: min(72vh, 760px);
  overflow: auto;
  padding-right: 4px;
}

.doc-preview {
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
  overflow-wrap: anywhere;
}

.doc-preview-large {
  font-size: 14px;
  line-height: 1.75;
}

.doc-preview :deep(h1) {
  color: #D97706;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  border-bottom: 1px solid #E5E5EA;
  padding-bottom: 8px;
}

.doc-preview-large :deep(h1) {
  font-size: 22px;
}

.doc-preview :deep(h2) {
  color: #1C1C1E;
  font-size: 15px;
  font-weight: 600;
  margin: 20px 0 10px;
}

.doc-preview-large :deep(h2) {
  font-size: 17px;
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
