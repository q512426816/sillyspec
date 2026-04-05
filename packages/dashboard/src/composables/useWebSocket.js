import { ref, onMounted, onUnmounted } from 'vue'

/**
 * WebSocket connection composable with auto-reconnect
 * @returns {object} WebSocket API
 */
export function useWebSocket() {
  const ws = ref(null)
  const connected = ref(false)
  const reconnectTimeout = ref(null)
  const handlers = new Map()

  /**
   * Connect to WebSocket server
   */
  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.host}`

    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      connected.value = true
      console.log('WebSocket connected')
    }

    ws.value.onclose = () => {
      connected.value = false
      console.log('WebSocket disconnected, reconnecting in 3s...')

      // Auto-reconnect after 3 seconds
      reconnectTimeout.value = setTimeout(() => {
        connect()
      }, 3000)
    }

    ws.value.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, data } = message

        // Call registered handlers for this message type
        const typeHandlers = handlers.get(type) || []
        typeHandlers.forEach(handler => handler(data))

        // Call wildcard handlers
        const wildcardHandlers = handlers.get('*') || []
        wildcardHandlers.forEach(handler => handler(message))
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }
  }

  /**
   * Register event handler for a message type
   * @param {string} type - Message type
   * @param {function} handler - Handler function
   * @returns {function} Unsubscribe function
   */
  function on(type, handler) {
    if (!handlers.has(type)) {
      handlers.set(type, [])
    }
    handlers.get(type).push(handler)

    // Return unsubscribe function
    return () => {
      const typeHandlers = handlers.get(type)
      if (typeHandlers) {
        const index = typeHandlers.indexOf(handler)
        if (index > -1) {
          typeHandlers.splice(index, 1)
        }
      }
    }
  }

  /**
   * Send message to server
   * @param {object} data - Message data
   */
  function send(data) {
    if (ws.value && connected.value) {
      ws.value.send(JSON.stringify(data))
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }

  /**
   * Disconnect WebSocket
   */
  function disconnect() {
    if (reconnectTimeout.value) {
      clearTimeout(reconnectTimeout.value)
      reconnectTimeout.value = null
    }

    if (ws.value) {
      ws.value.close()
      ws.value = null
    }

    connected.value = false
  }

  // Auto-connect on mount
  onMounted(() => {
    connect()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    on,
    send,
    disconnect,
    reconnect: connect
  }
}
