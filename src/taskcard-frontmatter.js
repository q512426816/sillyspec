/**
 * taskcard-frontmatter.js — task 卡 frontmatter 单一解析源（2026-09-20-taskcard-yaml-hardgate）
 *
 * 背景：坏 YAML 曾被三个消费点各自静默吞——plan-postcheck.js parseTaskContracts 的 catch 返回
 * 空对象冒充「无契约字段」→ 契约门禁空真过门；verify-probes.js parseTaskAcceptance 的 catch
 * 返回空数组 → 探针 7 假防御文案；且两侧 frontmatter 提取口径不一致（一侧 \r 容错一侧不容）。
 * 本模块把「提取 + jsYaml 解析 + 错误定位（文件行:列）」收敛为一处，plan 与 verify 两侧共同消费。
 *
 * 防环铁律：本模块除 js-yaml 外零依赖（不 import 仓内任何模块）——plan-postcheck 与
 * worktree-apply 存在既有依赖边（knowledge patterns），共享逻辑放新模块两侧 import。
 */
import jsYaml from 'js-yaml'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

/**
 * 提取 task 卡 frontmatter。界定口径与 verify-probes.js parseTaskAcceptance 原实现同款
 * （首行 --- 起、闭合 --- 行止，\r\n 容错——Windows 编辑器文本模式写卡不炸提取）。
 * @param {string} content task 卡全文
 * @returns {{ has: boolean, yamlText: string|null, yamlStartLine: number }}
 *   yamlStartLine = YAML 内容在文件中的起始行号（1 基）：首行是 ---，YAML 自第 2 行起，恒为 2
 */
export function splitFrontmatter(content) {
  const m = String(content ?? '').match(FRONTMATTER_RE)
  if (!m) return { has: false, yamlText: null, yamlStartLine: 2 }
  return { has: true, yamlText: m[1], yamlStartLine: 2 }
}

/**
 * 解析 task 卡 frontmatter（单一真相源）。
 * @param {string} content task 卡全文
 * @returns {{ ok: boolean, hasFrontmatter: boolean, fm: object|null,
 *   error: { message: string, line: number, column: number }|null }}
 *   - 无 frontmatter：{ ok: true, hasFrontmatter: false, fm: null, error: null }——不是错误，
 *     「无 frontmatter」由各消费方按自身语义处理（plan-postcheck 结构检查另有拦截）
 *   - jsYaml 抛错：{ ok: false, hasFrontmatter: true, fm: null, error: {...} }。
 *     error.line = e.mark.line + yamlStartLine：js-yaml mark.line 是 YAML 文本内 0 基行号，
 *     +2 后即文件 1 基行号（首行 ---，YAML 第 1 行 = 文件第 2 行）；mark 缺席回退 1。
 *     error.column = e.mark.column + 1（0 基 → 1 基；mark 缺席回退 1）。
 *     error.message 取异常首行（js-yaml 原始 message 含多行上下文，单行化便于门禁文案）。
 *   - 合法：{ ok: true, hasFrontmatter: true, fm, error: null }（空文档回退 {}）
 */
export function parseTaskFrontmatter(content) {
  const { has, yamlText, yamlStartLine } = splitFrontmatter(content)
  if (!has) return { ok: true, hasFrontmatter: false, fm: null, error: null }
  let fm
  try {
    fm = jsYaml.load(yamlText) || {}
  } catch (e) {
    const mark = e && e.mark
    const line = mark && typeof mark.line === 'number' ? mark.line + yamlStartLine : 1
    const column = mark && typeof mark.column === 'number' ? mark.column + 1 : 1
    const message = String((e && e.message) || e).split('\n')[0]
    return { ok: false, hasFrontmatter: true, fm: null, error: { message, line, column } }
  }
  return { ok: true, hasFrontmatter: true, fm, error: null }
}
