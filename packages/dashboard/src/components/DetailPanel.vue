<template>
  <div
    :class="[
      'flex flex-col bg-[#161B22] border-l border-[#30363D] transition-all duration-300',
      isOpen ? 'w-[320px]' : 'w-0 opacity-0'
    ]"
  >
    <!-- Header -->
    <div class="p-4 border-b border-[#30363D] flex items-center justify-between flex-shrink-0">
      <h2 class="font-semibold text-[#C9D1D9]">详情</h2>
      <button
        @click="$emit('close')"
        class="p-1 text-[#8B949E] hover:text-[#00D4AA] transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Step Details -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="!activeStep" class="p-4 text-center text-[#8B949E]">
        <div class="text-4xl mb-2">📋</div>
        <p>选择一个步骤查看详情</p>
      </div>

      <div v-else class="p-4 space-y-4">
        <!-- Step Title -->
        <div>
          <h3 class="text-lg font-semibold text-[#00D4AA]">
            {{ activeStep.title || activeStep.name }}
          </h3>
          <StageBadge
            v-if="activeStep.status"
            :status="activeStep.status"
            class="mt-2"
          />
        </div>

        <!-- Step Description/Summary -->
        <div v-if="activeStep.description || activeStep.summary" class="space-y-2">
          <h4 class="text-sm font-medium text-[#8B949E] uppercase tracking-wide">描述</h4>
          <p class="text-sm text-[#C9D1D9]">
            {{ activeStep.description || activeStep.summary }}
          </p>
        </div>

        <!-- Step Conclusion -->
        <div v-if="activeStep.conclusion" class="space-y-2">
          <h4 class="text-sm font-medium text-[#8B949E] uppercase tracking-wide">结论</h4>
          <p class="text-sm text-[#C9D1D9]">{{ activeStep.conclusion }}</p>
        </div>

        <!-- Step Decision -->
        <div v-if="activeStep.decision" class="space-y-2">
          <h4 class="text-sm font-medium text-[#8B949E] uppercase tracking-wide">决策</h4>
          <p class="text-sm text-[#C9D1D9]">{{ activeStep.decision }}</p>
        </div>

        <!-- User Query -->
        <div v-if="activeStep.userQuery" class="space-y-2">
          <h4 class="text-sm font-medium text-[#8B949E] uppercase tracking-wide">用户原话</h4>
          <div class="p-3 bg-[#0D1117] rounded border border-[#30363D]">
            <p class="text-sm text-[#C9D1D9] italic">"{{ activeStep.userQuery }}"</p>
          </div>
        </div>

        <!-- Step Metadata -->
        <div v-if="activeStep.duration || activeStep.timestamp" class="space-y-2">
          <h4 class="text-sm font-medium text-[#8B949E] uppercase tracking-wide">元数据</h4>
          <div class="space-y-1 text-xs text-[#8B949E]">
            <div v-if="activeStep.duration">
              <span class="text-[#C9D1D9]">耗时:</span> {{ activeStep.duration }}
            </div>
            <div v-if="activeStep.timestamp">
              <span class="text-[#C9D1D9]">时间:</span> {{ formatTimestamp(activeStep.timestamp) }}
            </div>
          </div>
        </div>

        <!-- Step Output/Files -->
        <div v-if="activeStep.output || activeStep.files" class="space-y-2">
          <h4 class="text-sm font-medium text-[#8B949E] uppercase tracking-wide">输出</h4>
          <div v-if="activeStep.output" class="p-3 bg-[#0D1117] rounded border border-[#30363D] max-h-40 overflow-y-auto">
            <pre class="text-xs text-[#C9D1D9] whitespace-pre-wrap">{{ activeStep.output }}</pre>
          </div>
          <div v-if="activeStep.files" class="space-y-1">
            <div
              v-for="(file, index) in activeStep.files"
              :key="index"
              class="flex items-center gap-2 text-xs text-[#C9D1D9]"
            >
              <span>📄</span>
              <span class="truncate">{{ file }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Stream -->
    <div class="border-t border-[#30363D] flex-shrink-0" style="height: 200px;">
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
