<template>
  <div class="flex flex-col h-full">
    <!-- Header with search -->
    <div class="p-3 border-b border-[#30363D] flex items-center gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索日志..."
        class="flex-1 px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded text-sm text-[#C9D1D9] placeholder-[#8B949E] focus:outline-none focus:border-[#00D4AA]"
      />
      <button
        @click="clearLogs"
        class="px-3 py-1.5 text-xs bg-[#161B22] border border-[#30363D] rounded text-[#8B949E] hover:border-[#00D4AA] hover:text-[#00D4AA] transition-colors"
      >
        清空
      </button>
      <button
        @click="toggleAutoScroll"
        :class="[
          'px-3 py-1.5 text-xs border rounded transition-colors',
          autoScroll
            ? 'bg-[#00D4AA]/20 border-[#00D4AA] text-[#00D4AA]'
            : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:border-[#00D4AA]'
        ]"
      >
        {{ autoScroll ? '自动滚动' : '暂停' }}
      </button>
    </div>

    <!-- Log output -->
    <div
      ref="logContainer"
      class="flex-1 overflow-y-auto p-3 font-mono text-xs bg-[#0D1117]"
      @scroll="handleScroll"
    >
      <div v-if="filteredLogs.length === 0" class="text-center text-[#8B949E] py-8">
        <div v-if="logs.length === 0">暂无日志</div>
        <div v-else>没有匹配的日志</div>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          :class="[
            'animate-fade-in px-2 py-1 rounded',
            getLogTypeClass(log.type)
          ]"
        >
          <span class="text-[#8B949E] select-none">[{{ formatTime(log.timestamp) }}]</span>
          <span :class="getLogContentClass(log.type)">{{ escapeHtml(log.content) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-3 py-2 border-t border-[#30363D] bg-[#0D1117] text-xs text-[#8B949E] flex items-center justify-between">
      <span>{{ filteredLogs.length }} / {{ logs.length }} 行</span>
      <span v-if="!autoScroll" class="text-amber-400">⚠️ 自动滚动已暂停</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['clear'])

const searchQuery = ref('')
const autoScroll = ref(true)
const logContainer = ref(null)

const filteredLogs = computed(() => {
  if (!searchQuery.value) {
    return props.logs
  }
  const query = searchQuery.value.toLowerCase()
  return props.logs.filter(log =>
    log.content.toLowerCase().includes(query)
  )
})

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getLogTypeClass(type) {
  const classes = {
    'error': 'bg-red-950/20',
    'warn': 'bg-amber-950/20',
    'info': '',
    'debug': 'opacity-70'
  }
  return classes[type] || ''
}

function getLogContentClass(type) {
  const classes = {
    'error': 'text-red-400',
    'warn': 'text-amber-400',
    'info': 'text-[#C9D1D9]',
    'debug': 'text-[#8B949E]'
  }
  return classes[type] || classes.info
}

function clearLogs() {
  emit('clear')
}

function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

function handleScroll() {
  if (!logContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

  if (!isAtBottom && autoScroll.value) {
    autoScroll.value = false
  } else if (isAtBottom && !autoScroll.value) {
    autoScroll.value = true
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (logContainer.value && autoScroll.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

// Auto-scroll when new logs arrive
watch(() => props.logs.length, () => {
  scrollToBottom()
}, { flush: 'post' })

// Initial scroll
watch(logContainer, () => {
  scrollToBottom()
}, { once: true })
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.15s ease-out;
}
</style>
