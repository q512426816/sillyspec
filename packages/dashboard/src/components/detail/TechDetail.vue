<template>
  <div v-if="data" class="px-4 py-3">
    <!-- Frameworks -->
    <div v-if="data.frameworks?.length" class="mb-4">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">识别框架</h4>
      <div class="flex flex-wrap gap-2">
        <n-tag v-for="f in data.frameworks" :key="f" type="warning" size="small" round>{{ f }}</n-tag>
      </div>
    </div>

    <!-- Dependencies -->
    <div v-if="depEntries.length" class="mb-4">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">dependencies ({{ depEntries.length }})</h4>
      <div class="space-y-1">
        <div v-for="[name, ver] in depEntries" :key="name" class="flex items-center gap-2 px-2 py-1 rounded text-[11px]" style="background: #F5F5F7;">
          <span class="font-mono font-medium truncate" style="color: #1C1C1E;">{{ name }}</span>
          <span class="font-mono ml-auto flex-shrink-0" style="color: #9CA3AF;">{{ ver }}</span>
        </div>
      </div>
    </div>

    <!-- Dev Dependencies -->
    <div v-if="devDepEntries.length">
      <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">devDependencies ({{ devDepEntries.length }})</h4>
      <div class="space-y-1">
        <div v-for="[name, ver] in devDepEntries" :key="name" class="flex items-center gap-2 px-2 py-1 rounded text-[11px]" style="background: #F5F5F7;">
          <span class="font-mono font-medium truncate" style="color: #1C1C1E;">{{ name }}</span>
          <span class="font-mono ml-auto flex-shrink-0" style="color: #9CA3AF;">{{ ver }}</span>
        </div>
      </div>
    </div>
  </div>
  <n-empty v-else description="无依赖信息" style="padding: 48px 0;" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ data: { type: Object, default: null } })

const depEntries = computed(() => props.data ? Object.entries(props.data.dependencies || {}) : [])
const devDepEntries = computed(() => props.data ? Object.entries(props.data.devDependencies || {}) : [])
</script>
