<template>
  <div class="flex flex-col h-full" style="background: #0E0E10;">
    <!-- Header -->
    <div class="px-3 py-2 flex items-center gap-2" style="border-bottom: 1px solid #1F1F22;">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="filter logs..."
        class="flex-1 px-2 py-1 rounded-sm text-[10px] font-mono-log outline-none transition-colors duration-100"
        style="background: #141416; border: 1px solid #1F1F22; color: #8B8B8E;"
      />
      <button
        @click="clearLogs"
        class="px-2 py-1 text-[10px] rounded-sm transition-colors duration-100"
        style="color: #525252; border: 1px solid #1F1F22;"
      >
        clear
      </button>
      <button
        @click="toggleAutoScroll"
        class="px-2 py-1 text-[10px] rounded-sm font-mono-log transition-colors duration-100"
        :style="{
          color: autoScroll ? '#FBBF24' : '#525252',
          background: autoScroll ? 'rgba(251,191,36,0.08)' : 'transparent',
          border: autoScroll ? '1px solid rgba(251,191,36,0.2)' : '1px solid #1F1F22'
        }"
      >
        {{ autoScroll ? 'auto' : 'pause' }}
      </button>
    </div>

    <!-- Log output -->
    <div ref="logContainer" class="flex-1 overflow-y-auto px-2 py-1.5 font-mono-log text-[10px]" style="background: #0A0A0B;" @scroll="handleScroll">
      <div v-if="filteredLogs.length === 0" class="flex items-center justify-center h-full">
        <span class="font-mono-log" style="color: #2A2A2D;">{{ logs.length === 0 ? 'no logs' : 'no match' }}</span>
      </div>
      <div v-else class="space-y-px">
        <div v-for="log in filteredLogs" :key="log.id" class="px-1.5 py-px rounded-sm" :style="{ background: logBg(log.type) }">
          <span style="color: #3A3A3D;" class="select-none">[{{ formatTime(log.timestamp) }}]</span>
          <span :style="{ color: logColor(log.type) }">{{ escapeHtml(log.content) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-3 py-1 flex items-center justify-between text-[9px] font-mono-log" style="border-top: 1px solid #1F1F22; background: #0E0E10; color: #3A3A3D;">
      <span>{{ filteredLogs.length }}/{{ logs.length }}</span>
      <span v-if="!autoScroll" style="color: #FB923C;">paused</span>
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
function logColor(t) { return t === 'error' ? '#EF4444' : t === 'warn' ? '#FB923C' : t === 'debug' ? '#525252' : '#8B8B8E' }
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
