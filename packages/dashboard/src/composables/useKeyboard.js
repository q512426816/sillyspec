import { onMounted, onUnmounted } from 'vue'

/**
 * Keyboard shortcuts composable
 * @param {object} options - Configuration options
 * @returns {object} Keyboard API
 */
export function useKeyboard(options = {}) {
  const {
    onCmdK = null,
    onJ = null,
    onK = null,
    onEscape = null,
    onEnter = null,
    onArrowUp = null,
    onArrowDown = null,
    disabled = false
  } = options

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    if (disabled) return

    // Ignore if in input field
    const target = event.target
    if (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true') {
      return
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

    // Cmd/Ctrl + K
    if (cmdOrCtrl && event.key === 'k') {
      event.preventDefault()
      if (onCmdK) onCmdK()
    }

    // J - navigate down
    if (event.key === 'j' && !cmdOrCtrl) {
      event.preventDefault()
      if (onJ) onJ()
    }

    // K - navigate up
    if (event.key === 'k' && !cmdOrCtrl) {
      event.preventDefault()
      if (onK) onK()
    }

    // Escape
    if (event.key === 'Escape') {
      event.preventDefault()
      if (onEscape) onEscape()
    }

    // Enter
    if (event.key === 'Enter' && !cmdOrCtrl) {
      event.preventDefault()
      if (onEnter) onEnter()
    }

    // Arrow Up
    if (event.key === 'ArrowUp' && !cmdOrCtrl) {
      event.preventDefault()
      if (onArrowUp) onArrowUp()
    }

    // Arrow Down
    if (event.key === 'ArrowDown' && !cmdOrCtrl) {
      event.preventDefault()
      if (onArrowDown) onArrowDown()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    disable: () => { disabled = true },
    enable: () => { disabled = false }
  }
}

/**
 * Global keyboard shortcuts for dashboard
 * @param {object} callbacks - Callback functions for each shortcut
 * @returns {object} Keyboard API
 */
export function useDashboardKeyboard(callbacks = {}) {
  const {
    onOpenCommandPalette,
    onNavigateDown,
    onNavigateUp,
    onClose,
    onSelect,
    onPanelToggle
  } = callbacks

  return useKeyboard({
    onCmdK: onOpenCommandPalette,
    onJ: onNavigateDown,
    onK: onNavigateUp,
    onEscape: onClose,
    onEnter: onSelect
  })
}
