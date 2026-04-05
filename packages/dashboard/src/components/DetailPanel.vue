<template>
  <div
    :class="[
      'flex flex-col bg-surface border-l border-border transition-all duration-200',
      isOpen ? 'w-[320px]' : 'w-0 opacity-0 overflow-hidden'
    ]"
  >
    <!-- Header -->
    <div class="px-4 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
      <h2 class="text-sm font-semibold text-text">详情</h2>
      <button
        @click="$emit('close')"
        class="p-1 rounded-md text-text-secondary hover:text-primary hover:bg-white/[0.05] transition-colors duration-100"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Step Details -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="!activeStep" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-10 h-10 rounded-full bg-border/30 flex items-center justify-center mx-auto mb-3">
            <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-xs text-text-secondary">选择一个步骤查看详情</p>
        </div>
      </div>

      <div v-else class="divide-y divide-border">
        <!-- Title Section -->
        <div class="px-4 py-3.5">
          <h3 class="text-[13px] font-semibold text-primary">
            {{ activeStep.title || activeStep.name }}
          </h3>
          <div v-if="activeStep.status" class="mt-2">
            <StageBadge :status="activeStep.status" />
          </div>
        </div>

        <!-- Description -->
        <div v-if="activeStep.description || activeStep.summary" class="px-4 py-3">
          <h4 class="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1.5">描述</h4>
          <p class="text-xs text-text leading-relaxed">
            {{ activeStep.description || activeStep.summary }}
          </p>
        </div>

        <!-- Conclusion -->
        <div v-if="activeStep.conclusion" class="px-4 py-3">
          <h4 class="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1.5">结论</h4>
          <p class="text-xs text-text leading-relaxed">{{ activeStep.conclusion }}</p>
        </div>

        <!-- Decision -->
        <div v-if="activeStep.decision" class="px-4 py-3">
          <h4 class="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1.5">决策</h4>
          <p class="text-xs text-text leading-relaxed">{{ activeStep.decision }}</p>
        </div>

        <!-- User Query -->
        <div v-if="activeStep.userQuery" class="px-4 py-3">
          <h4 class="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1.5">用户原话</h4>
          <div class="px-3 py-2 bg-bg rounded-lg border border-border">
            <p class="text-xs text-text italic">"{{ activeStep.userQuery }}"</p>
          </div>
        </div>

        <!-- Metadata -->
        <div v-if="activeStep.duration || activeStep.timestamp" class="px-4 py-3">
          <h4 class="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1.5">元数据</h4>
          <div class="space-y-1 text-[11px] text-text-secondary">
            <div v-if="activeStep.duration">
              <span class="text-text">耗时:</span> {{ activeStep.duration }}
            </div>
            <div v-if="activeStep.timestamp">
              <span class="text-text">时间:</span> {{ formatTimestamp(activeStep.timestamp) }}
            </div>
          </div>
        </div>

        <!-- Output -->
        <div v-if="activeStep.output || activeStep.files" class="px-4 py-3">
          <h4 class="text-[10px] font-medium text-text-secondary uppercase tracking-wider mb-1.5">输出</h4>
          <div v-if="activeStep.output" class="px-3 py-2 bg-bg rounded-lg border border-border max-h-40 overflow-y-auto">
            <pre class="text-[11px] text-text whitespace-pre-wrap font-mono-log">{{ activeStep.output }}</pre>
          </div>
          <div v-if="activeStep.files" class="mt-2 space-y-1">
            <div
              v-for="(file, index) in activeStep.files"
              :key="index"
              class="flex items-center gap-2 text-[11px] text-text"
            >
              <svg class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="truncate">{{ file }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Stream -->
    <div class="border-t border-border flex-shrink-0" style="height: 200px;">
      <LogStream :logs="logs" @clear="$emit('clear-logs')" />
    </div>
  </div>
</template>

<script setup>
import StageBadge from './StageBadge.vue'
import LogStream from './LogStream.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true
  },
  activeStep: {
    type: Object,
    default: null
  },
  logs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'clear-logs'])

function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
