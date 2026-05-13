<template>
  <div
    class="h-resize-handle"
    :class="{ 'dragging': isDragging }"
    @mousedown="handleMouseDown"
  ></div>
</template>

<script setup>
const props = defineProps({
  isDragging: { type: Boolean, default: false },
  colIndex: { type: Number, required: true }
})

const emit = defineEmits(['drag-start', 'drag-end', 'resize'])

function handleMouseDown(e) {
  e.preventDefault()
  emit('drag-start', { type: 'horizontal', colIndex: props.colIndex, startX: e.clientX })

  const onMove = (ev) => {
    emit('resize', { deltaX: ev.clientX - e.clientX })
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
.h-resize-handle {
  width: 4px;
  background: #E5E7EB;
  cursor: col-resize;
  transition: background 0.2s;
}

.h-resize-handle:hover,
.h-resize-handle.dragging {
  background: #D97706;
}
</style>
