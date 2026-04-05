<template>
  <div
    :class="['flex flex-col transition-all duration-300', isOpen ? 'w-[340px]' : 'w-0 opacity-0 overflow-hidden']"
    style="background: #111113;"
  >
    <!-- Header -->
    <div class="px-4 py-3 flex items-center justify-between flex-shrink-0" style="border-bottom: 1px solid #1F1F22;">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] font-[JetBrains_Mono,monospace]" style="color: #525252;">详情</h2>
      <button
        @click="$emit('close')"
        class="p-1 rounded-sm transition-colors duration-100 hover:bg-white/5"
        style="color: #525252;"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Empty state -->
      <div v-if="!activeStep" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-10 h-10 mx-auto mb-3 rounded-md flex items-center justify-center" style="border: 1px dashed #2A2A2D; transform: rotate(45deg);">
            <svg class="w-4 h-4" style="color: #3A3A3D; transform: rotate(-45deg);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-[11px] font-[JetBrains_Mono,monospace]" style="color: #3A3A3D;">选择一个步骤</p>
        </div>
      </div>

      <!-- Step detail -->
      <div v-else>
        <!-- Title -->
        <div class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h3 class="text-[13px] font-semibold font-[JetBrains_Mono,monospace]" style="color: #FBBF24;">
            {{ activeStep.title || activeStep.name }}
          </h3>
          <div v-if="activeStep.status" class="mt-2">
            <StageBadge :status="activeStep.status" />
          </div>
        </div>

        <!-- Description -->
        <div v-if="activeStep.description || activeStep.summary" class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #525252;">描述</h4>
          <p class="text-[11px] leading-relaxed" style="color: #8B8B8E;">{{ activeStep.description || activeStep.summary }}</p>
        </div>

        <!-- Conclusion -->
        <div v-if="activeStep.conclusion" class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #525252;">结论</h4>
          <p class="text-[11px] leading-relaxed" style="color: #E4E4E7;">{{ activeStep.conclusion }}</p>
        </div>

        <!-- Decision -->
        <div v-if="activeStep.decision" class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #525252;">决策</h4>
          <p class="text-[11px] leading-relaxed" style="color: #E4E4E7;">{{ activeStep.decision }}</p>
        </div>

        <!-- User Query -->
        <div v-if="activeStep.userQuery" class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #525252;">用户提问</h4>
          <div class="px-3 py-2 rounded-md" style="background: #0E0E10; border: 1px solid #1F1F22;">
            <p class="text-[11px] italic" style="color: #8B8B8E;">"{{ activeStep.userQuery }}"</p>
          </div>
        </div>

        <!-- Metadata -->
        <div v-if="activeStep.duration || activeStep.timestamp" class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #525252;">元信息</h4>
          <div class="space-y-1 text-[11px]" style="color: #525252;">
            <div v-if="activeStep.duration"><span style="color: #8B8B8E;">耗时：</span> {{ activeStep.duration }}</div>
            <div v-if="activeStep.timestamp"><span style="color: #8B8B8E;">时间：</span> {{ formatTimestamp(activeStep.timestamp) }}</div>
          </div>
        </div>

        <!-- Output -->
        <div v-if="activeStep.output || activeStep.files" class="px-4 py-3" style="border-bottom: 1px solid #1F1F22;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #525252;">输出</h4>
          <div v-if="activeStep.output" class="px-3 py-2 rounded-md max-h-40 overflow-y-auto" style="background: #0E0E10; border: 1px solid #1F1F22;">
            <pre class="text-[10px] whitespace-pre-wrap font-mono-log" style="color: #8B8B8E;">{{ activeStep.output }}</pre>
          </div>
          <div v-if="activeStep.files" class="mt-2 space-y-1">
            <div v-for="(file, i) in activeStep.files" :key="i" class="flex items-center gap-2 text-[10px]" style="color: #525252;">
              <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="truncate">{{ file }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Stream -->
    <div class="flex-shrink-0" style="height: 200px; border-top: 1px solid #1F1F22;">
      <LogStream :logs="logs" @clear="$emit('clear-logs')" />
    </div>
  </div>
</template>

<script setup>
import StageBadge from './StageBadge.vue'
import LogStream from './LogStream.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: true },
  activeStep: { type: Object, default: null },
  logs: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'clear-logs'])

function formatTimestamp(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>
