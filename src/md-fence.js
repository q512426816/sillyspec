/**
 * md-fence.js — Markdown 代码围栏感知扫描（2026-11-04-fence-aware-task-rows）。
 *
 * 定位：给「逐行正则解析 Markdown 结构」的模块（task-tick 等）提供围栏状态——
 * 代码围栏内的示例任务行（如文档示例 `- [ ] task-99:`）不得被当真实结构行。
 * 依据：superpowers #2436（未闭合围栏把 177 行任务吞成 1159 行五任务简报）同型事故。
 *
 * 语法取 CommonMark 实用子集：
 *   - 开栏：行首 ≤3 空格缩进的 ``` 或 ~~~（可带信息串）；
 *   - 闭栏：同字符、长度不小于开栏、行内仅空白的栏线（闭栏行本身计入围栏）；
 *   - 开栏期间异字符栏线（``` 内的 ~~~ 或反之）视为内容，不互闭；
 *   - 未闭合：按「开栏即入栏直到文件尾」处理（CommonMark 语义，fail-safe 方向）。
 *
 * 纯函数无状态；行索引与 String.split('\n') 对齐（CRLF 的 \r 留在行尾，\s*$ 吸收）。
 */

/** 开栏行：≤3 空格缩进 + ≥3 个 ` 或 ~ + 任意信息串。 */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/

/** 闭栏行：≤3 空格缩进 + 同字符 ≥3 个 + 行内仅空白（\s*$ 同时吸收 CRLF 的 \r）。 */
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})\s*$/

/**
 * 扫描 Markdown 文本的围栏状态。
 * @param {string} md 文本（LF 或 CRLF）
 * @returns {{ inFence: boolean[], unclosed: boolean, fenceStartLine: number|null }}
 *   inFence 按行（split('\n') 口径）标记是否处于围栏内（含开/闭栏行本身）；
 *   unclosed=文件尾仍有未闭合开栏；fenceStartLine=该未闭合开栏的 1 基行号（未闭合为 false 时 null）。
 */
export function fenceScan(md) {
  const lines = String(md || '').split('\n')
  const inFence = new Array(lines.length).fill(false)
  let open = null
  let currentStart = 0
  let unclosed = false
  let fenceStartLine = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (open) {
      const closeMatch = FENCE_CLOSE_RE.exec(line)
      if (closeMatch && closeMatch[1][0] === open.ch && closeMatch[1].length >= open.len) {
        inFence[i] = true
        open = null
        currentStart = 0
      } else {
        inFence[i] = true
      }
      continue
    }
    const openMatch = FENCE_OPEN_RE.exec(line)
    if (openMatch) {
      open = { ch: openMatch[1][0], len: openMatch[1].length }
      currentStart = i + 1
      inFence[i] = true
    }
  }
  if (open) {
    unclosed = true
    fenceStartLine = currentStart
  }
  return { inFence, unclosed, fenceStartLine }
}

export default { fenceScan }
