<template>
  <div class="flex flex-col h-full" style="background: #F5F5F7;">
    <!-- Header -->
    <div class="px-3 py-2 flex items-center gap-2" style="border-bottom: 1px solid #F0F0F3;">
      <n-input v-model:value="searchQuery" size="tiny" placeholder="过滤日志..." clearable style="flex: 1;" />
      <n-button size="tiny" @click="clearLogs">清空</n-button>
      <n-button size="tiny" :type="autoScroll ? 'primary' : 'default'" @click="toggleAutoScroll">
        {{ autoScroll ? '自动' : '暂停' }}
      </n-button>
    </div>

    <!-- Log output -->
    <div ref="logContainer" class="flex-1 overflow-y-auto px-2 py-1.5 font-mono-log text-[10px]" style="background: #F0F0F3;" @scroll="handleScroll">
      <div v-if="filteredLogs.length === 0" class="flex items-center justify-center h-full">
        <span class="font-mono-log" style="color: #E5E5EA;">{{ logs.length === 0 ? '暂无日志' : '无匹配' }}</span>
      </div>
      <div v-else class="space-y-px">
        <div v-for="log in filteredLogs" :key="log.id" class="px-1.5 py-px rounded-sm" :style="{ background: logBg(log.type) }">
          <span style="color: #D1D1D6;" class="select-none">[{{ formatTime(log.timestamp) }}]</span>
          <span :style="{ color: logColor(log.type) }">{{ escapeHtml(log.content) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-3 py-1 flex items-center justify-between text-[9px] font-mono-log" style="border-top: 1px solid #F0F0F3; background: #F5F5F7; color: #D1D1D6;">
      <span>{{ filteredLogs.length }}/{{ logs.length }}</span>
      <span v-if="!autoScroll" style="color: #EA580C;">已暂停</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({ logs: { type: Array, default: () => [] } })
const emit = defineEmits(['clear'])

const searchQuery = ref('')
const autoScroll = ref(true)
const logContainer = ref(null)

const filteredLogs = computed(() => {
  if (!searchQuery.value) return props.logs
  const q = searchQuery.value.toLowerCase()
  return props.logs.filter(l => l.content.toLowerCase().includes(q))
})

function formatTime(ts) { if (!ts) return ''; const d = new Date(ts); return d.toLocaleTimeString('zh-CN', { hour12: false }) }
function escapeHtml(t) { if (!t) return ''; return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function logBg(t) { return t === 'error' ? 'rgba(239,68,68,0.05)' : t === 'warn' ? 'rgba(251,146,60,0.05)' : 'transparent' }
function logColor(t) { return t === 'error' ? '#DC2626' : t === 'warn' ? '#EA580C' : t === 'debug' ? '#6B7280' : '#636366' }
function clearLogs() { emit('clear') }
function toggleAutoScroll() { autoScroll.value = !autoScroll.value; if (autoScroll.value) scrollToBottom() }
function handleScroll() {
  if (!logContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value
  const atBottom = scrollHeight - scrollTop - clientHeight < 50
  if (!atBottom && autoScroll.value) autoScroll.value = false
  else if (atBottom && !autoScroll.value) autoScroll.value = true
}
function scrollToBottom() { nextTick(() => { if (logContainer.value && autoScroll.value) logContainer.value.scrollTop = logContainer.value.scrollHeight }) }
watch(() => props.logs.length, () => { scrollToBottom() }, { flush: 'post' })
watch(logContainer, () => { scrollToBottom() }, { once: true })
</script>
