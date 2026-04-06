<template>
  <div
    :class="['flex flex-col transition-all duration-300', isOpen ? 'w-[340px]' : 'w-0 opacity-0 overflow-hidden']"
    style="background: #F5F5F7;"
  >
    <!-- Header -->
    <div class="px-4 py-3 flex items-center justify-between flex-shrink-0" style="border-bottom: 1px solid #F0F0F3;">
      <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] font-[JetBrains_Mono,monospace]" style="color: #6B7280;">{{ detailType ? detailTitle : '详情' }}</h2>
      <n-button quaternary size="tiny" @click="handleClose">
        <template #icon>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </template>
      </n-button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Empty state -->
      <n-empty v-if="!activeStep && !detailType" description="选择一个步骤" style="margin: auto; padding: 48px 0;" />

      <!-- Detail views -->
      <template v-if="detailType === 'git'">
        <GitDetail :data="detailData" />
      </template>
      <template v-else-if="detailType === 'tech'">
        <TechDetail :data="detailData" />
      </template>
      <template v-else-if="detailType === 'docs'">
        <DocsDetail :data="detailData" @open-file="$emit('open-doc-file', $event)" />
      </template>

      <!-- Step detail (original) -->
      <div v-else-if="activeStep">
        <!-- Title -->
        <div class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h3 class="text-[13px] font-semibold font-[JetBrains_Mono,monospace]" style="color: #D97706;">
            {{ activeStep.title || activeStep.name }}
          </h3>
          <div v-if="activeStep.status" class="mt-2">
            <StageBadge :status="activeStep.status" />
          </div>
        </div>

        <!-- Description -->
        <div v-if="activeStep.description || activeStep.summary" class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">描述</h4>
          <p class="text-[11px] leading-relaxed" style="color: #636366;">{{ activeStep.description || activeStep.summary }}</p>
        </div>

        <!-- Conclusion -->
        <div v-if="activeStep.conclusion" class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">结论</h4>
          <p class="text-[11px] leading-relaxed" style="color: #1C1C1E;">{{ activeStep.conclusion }}</p>
        </div>

        <!-- Decision -->
        <div v-if="activeStep.decision" class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">决策</h4>
          <p class="text-[11px] leading-relaxed" style="color: #1C1C1E;">{{ activeStep.decision }}</p>
        </div>

        <!-- User Query -->
        <div v-if="activeStep.userQuery" class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">用户提问</h4>
          <div class="px-3 py-2 rounded-md" style="background: #F5F5F7; border: 1px solid #F0F0F3;">
            <p class="text-[11px] italic" style="color: #636366;">"{{ activeStep.userQuery }}"</p>
          </div>
        </div>

        <!-- Metadata -->
        <div v-if="activeStep.duration || activeStep.timestamp" class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">元信息</h4>
          <div class="space-y-1 text-[11px]" style="color: #6B7280;">
            <div v-if="activeStep.duration"><span style="color: #636366;">耗时：</span> {{ activeStep.duration }}</div>
            <div v-if="activeStep.timestamp"><span style="color: #636366;">时间：</span> {{ formatTimestamp(activeStep.timestamp) }}</div>
          </div>
        </div>

        <!-- Output -->
        <div v-if="activeStep.output || activeStep.files" class="px-4 py-3" style="border-bottom: 1px solid #F0F0F3;">
          <h4 class="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5 font-[JetBrains_Mono,monospace]" style="color: #6B7280;">输出</h4>
          <n-code v-if="activeStep.output" :code="activeStep.output" language="text" word-wrap style="max-height: 300px; overflow-y: auto; padding: 8px; border-radius: 4px; background: #F5F5F7;" />
          <div v-if="activeStep.files" class="mt-2 space-y-1">
            <div v-for="(file, i) in activeStep.files" :key="i" class="flex items-center gap-2 text-[10px]" style="color: #6B7280;">
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
    <div class="flex-shrink-0" style="height: 200px; border-top: 1px solid #F0F0F3;">
      <LogStream :logs="logs" @clear="$emit('clear-logs')" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StageBadge from './StageBadge.vue'
import LogStream from './LogStream.vue'
import GitDetail from './detail/GitDetail.vue'
import TechDetail from './detail/TechDetail.vue'
import DocsDetail from './detail/DocsDetail.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: true },
  activeStep: { type: Object, default: null },
  logs: { type: Array, default: () => [] },
  detailType: { type: String, default: null },
  detailData: { type: [Object, Array], default: null }
})

const emit = defineEmits(['close', 'clear-logs', 'open-doc-file'])

const detailTitle = computed(() => {
  if (props.detailType === 'git') return 'Git 详情'
  if (props.detailType === 'tech') return '技术栈详情'
  if (props.detailType === 'docs') return '文档列表'
  return '详情'
})

function handleClose() {
  emit('close')
}

function formatTimestamp(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>
