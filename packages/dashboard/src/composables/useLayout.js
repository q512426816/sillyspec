/**
 * 布局管理 Composable
 * 管理双层布局的概览/详情比例和三栏宽度
 */
import { reactive, ref, onMounted } from 'vue'

const STORAGE_KEY = 'dashboard-layout-v2'

// 默认值
const DEFAULT_OVERVIEW_HEIGHT = 30 // 概览区域百分比
const DEFAULT_COLUMN_WIDTHS = [33.33, 33.33, 33.33] // 三栏宽度百分比

// 最小值限制
const MIN_OVERVIEW_HEIGHT = 15
const MAX_OVERVIEW_HEIGHT = 75
const MIN_COLUMN_WIDTH = 10

/**
 * 布局管理 Hook
 */
export function useLayout() {
  // 布局状态
  const layout = reactive({
    overviewHeight: DEFAULT_OVERVIEW_HEIGHT,
    columnWidths: [...DEFAULT_COLUMN_WIDTHS]
  })

  // 拖动状态
  const isDragging = ref(false)
  const dragType = ref(null) // 'vertical' | 'horizontal'

  /**
   * 加载保存的布局
   */
  function loadLayout() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.overviewHeight !== undefined) {
          layout.overviewHeight = Math.max(MIN_OVERVIEW_HEIGHT, Math.min(MAX_OVERVIEW_HEIGHT, parsed.overviewHeight))
        }
        if (Array.isArray(parsed.columnWidths) && parsed.columnWidths.length === 3) {
          layout.columnWidths = parsed.columnWidths
        }
      }
    } catch (e) {
      console.error('Failed to load layout:', e)
      // 使用默认值
      resetLayout()
    }
  }

  /**
   * 保存布局到 localStorage
   */
  function saveLayout() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        overviewHeight: layout.overviewHeight,
        columnWidths: layout.columnWidths
      }))
    } catch (e) {
      console.error('Failed to save layout:', e)
    }
  }

  /**
   * 重置布局为默认值
   */
  function resetLayout() {
    layout.overviewHeight = DEFAULT_OVERVIEW_HEIGHT
    layout.columnWidths = [...DEFAULT_COLUMN_WIDTHS]
    saveLayout()
  }

  /**
   * 设置概览区域高度（百分比）
   */
  function setOverviewHeight(percent) {
    layout.overviewHeight = Math.max(MIN_OVERVIEW_HEIGHT, Math.min(MAX_OVERVIEW_HEIGHT, percent))
    saveLayout()
  }

  /**
   * 设置列宽度（索引，百分比）
   */
  function setColumnWidth(index, percent) {
    if (index >= 0 && index < 3) {
      layout.columnWidths[index] = Math.max(MIN_COLUMN_WIDTH, percent)
      saveLayout()
    }
  }

  /**
   * 开始拖动
   */
  function startDrag(type) {
    isDragging.value = true
    dragType.value = type
    document.body.classList.add('resizing')
  }

  /**
   * 结束拖动
   */
  function endDrag() {
    isDragging.value = false
    dragType.value = null
    document.body.classList.remove('resizing')
    saveLayout()
  }

  // 组件挂载时加载布局
  onMounted(() => {
    loadLayout()
  })

  return {
    layout,
    isDragging,
    dragType,
    loadLayout,
    saveLayout,
    resetLayout,
    setOverviewHeight,
    setColumnWidth,
    startDrag,
    endDrag
  }
}
