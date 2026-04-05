<template>
  <div class="flex flex-col h-full">
    <!-- Header with search -->
    <div class="px-3 py-2.5 border-b border-border flex items-center gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索日志..."
        class="flex-1 px-2.5 py-1 bg-bg border border-border rounded-lg text-[11px] text-text placeholder-text-secondary focus:outline-none focus:border-primary/50 transition-colors duration-100"
      />
      <button
        @click="clearLogs"
        class="px-2.5 py-1 text-[11px] bg-transparent border border-border rounded-lg text-text-secondary hover:border-primary/50 hover:text-primary transition-colors duration-100"
      >
        清空
      </button>
      <button
        @click="toggleAutoScroll"
        :class="[
          'px-2.5 py-1 text-[11px] border rounded-lg transition-colors duration-100',
          autoScroll
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-transparent border-border text-text-secondary hover:border-primary/50'
        ]"
      >
        {{ autoScroll ? '自动' : '暂停' }}
      </button>
    </div>

    <!-- Log output -->
    <div
      ref="logContainer"
      class="flex-1 overflow-y-auto px-2 py-2 font-mono-log text-[11px] bg-bg"
      @scroll="handleScroll"
    >
      <div v-if="filteredLogs.length === 0" class="flex items-center justify-center h-full">
        <span class="text-text-secondary text-[11px]">{{ logs.length === 0 ? '暂无日志' : '没有匹配的日志' }}</span>
      </div>

      <div v-else class="space-y-px">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          :class="[
            'px-2 py-0.5 rounded transition-opacity',
            getLogTypeClass(log.type)
          ]"
        >
          <span class="text-text-secondary select-none">[{{ formatTime(log.timestamp) }}]</span>
          <span :class="getLogContentClass(log.type)">{{ escapeHtml(log.content) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-3 py-1.5 border-t border-border bg-bg text-[10px] text-text-secondary flex items-center justify-between">
      <span>{{ filteredLogs.length }} / {{ logs.length }}</span>
      <span v-if="!autoScroll" class="text-warning">自动滚动已暂停</span>
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
  if (!searchQuery.value) return props.logs
  const query = searchQuery.value.toLowerCase()
  return props.logs.filter(log => log.content.toLowerCase().includes(query))
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
  const classes = { 'error': 'bg-danger/5', 'warn': 'bg-warning/5', 'info': '', 'debug': 'opacity-60' }
  return classes[type] || ''
}

function getLogContentClass(type) {
  const classes = { 'error': 'text-danger', 'warn': 'text-warning', 'info': 'text-text', 'debug': 'text-text-secondary' }
  return classes[type] || classes.info
}

function clearLogs() { emit('clear') }

function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) scrollToBottom()
}

function handleScroll() {
  if (!logContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
  if (!isAtBottom && autoScroll.value) autoScroll.value = false
  else if (isAtBottom && !autoScroll.value) autoScroll.value = true
}

function scrollToBottom() {
  nextTick(() => {
    if (logContainer.value && autoScroll.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

watch(() => props.logs.length, () => { scrollToBottom() }, { flush: 'post' })
watch(logContainer, () => { scrollToBottom() }, { once: true })
</script>
