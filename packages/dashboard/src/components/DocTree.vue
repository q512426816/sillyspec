<template>
  <div class="flex flex-col h-full">
    <n-empty v-if="groups.length === 0" description="暂无文档" style="margin: auto;" />
    <n-tree
      v-else
      :data="treeData"
      :selected-keys="selectedKeys"
      :default-expand-all="true"
      selectable
      block-line
      @update:selected-keys="handleSelect"
      style="padding: 8px 12px;"
    />
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import { NIcon } from 'naive-ui'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  selectedFile: { type: Object, default: null }
})

const emit = defineEmits(['select-file'])

const selectedKeys = computed(() => {
  return props.selectedFile?.path ? [props.selectedFile.path] : []
})

const groupIcons = {
  '设计文档': '📋',
  '实现计划': '📐',
  '归档': '📦',
  ' proposals': '📝'
}

const treeData = computed(() => {
  return props.groups.map(group => ({
    key: `group-${group.key}`,
    label: group.label,
    prefix: () => groupIcons[group.label] || '📄',
    children: group.files.map(file => ({
      key: file.path,
      label: file.title,
      prefix: () => '📄',
      data: file
    }))
  }))
})

function handleSelect(keys, option) {
  if (option?.[0]?.data) {
    emit('select-file', option[0].data)
  }
}
</script>
