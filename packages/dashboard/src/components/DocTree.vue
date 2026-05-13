<template>
  <div class="doc-tree">
    <div class="doc-tree-search">
      <n-input
        v-model:value="query"
        size="small"
        clearable
        placeholder="搜索文档"
      />
    </div>

    <n-empty v-if="groups.length === 0" description="暂无文档" style="margin: auto;" />
    <n-empty v-else-if="treeData.length === 0" description="无匹配文档" style="margin: auto;" />
    <n-tree
      v-else
      class="doc-tree-list"
      :data="treeData"
      :selected-keys="selectedKeys"
      :default-expand-all="true"
      selectable
      block-line
      @update:selected-keys="handleSelect"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  selectedFile: { type: Object, default: null }
})

const emit = defineEmits(['select-file'])
const query = ref('')

const selectedKeys = computed(() => {
  return props.selectedFile?.path ? [props.selectedFile.path] : []
})

const groupIcons = {
  design: '📋',
  plan: '🧾',
  archive: '📦',
  changes: '⚙️',
  scan: '🔍',
  quicklog: '⚡'
}

const treeData = computed(() => {
  const keyword = query.value.trim().toLowerCase()

  return props.groups
    .map(group => {
      const groupLabel = group.project ? `${group.label} (${group.project})` : group.label
      const groupMatched = !keyword || groupLabel.toLowerCase().includes(keyword)
      const files = group.files.filter(file => {
        if (groupMatched) return true
        return `${file.title || ''} ${file.name || ''}`.toLowerCase().includes(keyword)
      })

      if (files.length === 0) return null

      return {
        key: `group-${group.key}`,
        label: groupLabel,
        prefix: () => groupIcons[group.key] || '📄',
        children: files.map(file => ({
          key: file.path,
          label: file.title || file.name,
          prefix: () => '📄',
          data: file
        }))
      }
    })
    .filter(Boolean)
})

function handleSelect(keys, option) {
  if (option?.[0]?.data) {
    emit('select-file', option[0].data)
  }
}
</script>

<style scoped>
.doc-tree {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
}

.doc-tree-search {
  flex-shrink: 0;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #F0F0F3;
}

.doc-tree-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px 14px;
}

.doc-tree-list :deep(.n-tree-node-content__text) {
  white-space: normal;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
</style>
