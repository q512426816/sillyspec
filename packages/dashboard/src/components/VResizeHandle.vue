<template>
  <div
    class="v-resize-handle"
    :class="{ 'dragging': isDragging }"
    @mousedown="handleMouseDown"
  >
    <div class="drag-indicator"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  isDragging: { type: Boolean, default: false }
})

const emit = defineEmits(['drag-start', 'drag-end', 'resize'])

function handleMouseDown(e) {
  emit('drag-start', { type: 'vertical', startY: e.clientY })

  const onMove = (ev) => {
    emit('resize', { deltaY: ev.clientY - e.clientY })
  }

  const onUp = () => {
    emit('drag-end')
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.v-resize-handle {
  height: 6px;
  background: #2A3040;
  cursor: row-resize;
  position: relative;
  transition: background 0.2s;
}

.v-resize-handle:hover,
.v-resize-handle.dragging {
  background: #D97706;
}

.drag-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  pointer-events: none;
}
</style>
