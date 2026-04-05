<template>
  <div class="flex flex-col h-full">
    <div v-if="groups.length === 0" class="flex items-center justify-center h-full">
      <p class="text-[12px] font-[JetBrains_Mono,monospace]" style="color: #8B8FA3;">暂无文档</p>
    </div>
    <div v-else class="overflow-y-auto px-4 py-3 space-y-4">
      <div v-for="group in groups" :key="group.key">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] font-[JetBrains_Mono,monospace] mb-2" style="color: #8B8FA3;">
          {{ group.label }}
        </div>
        <div class="space-y-0.5">
          <button
            v-for="file in group.files"
            :key="file.path"
            @click="$emit('select-file', file)"
            class="w-full text-left px-2.5 py-1.5 rounded text-[12px] font-[JetBrains_Mono,monospace] transition-colors"
            :style="{
              color: selectedFile?.path === file.path ? '#FBBF24' : '#A0A4B5',
              background: selectedFile?.path === file.path ? 'rgba(251,191,36,0.08)' : 'transparent'
            }"
          >
            📄 {{ file.title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  groups: { type: Array, default: () => [] },
  selectedFile: { type: Object, default: null }
})
defineEmits(['select-file'])
</script>
