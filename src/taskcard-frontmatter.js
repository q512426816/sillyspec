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

/**
 * js-yaml 报错分诊（2026-10-06-verify-friction-fix task-03）：消息 + 出错行内容双信号映射中文
 * 修复动作。背景：分诊知识长期躺在 templates/prompts/taskcard-rules.md L19-23 未接进门禁报错，
 * 厚流程实证 agent 连撞 6 轮 YAML 门禁；且 js-yaml v4 真实消息与文档措辞有漂移（实证
 * `title: A: B` 报 bad indentation 而非 mapping values），只匹配消息文本不可靠——先看出错行
 * 的首字符是否保留指示符，再看行内是否「冒号+空格」，消息文本作家族归类兜底。
 * @param {string} message js-yaml 异常 message（单行化后）
 * @param {string} [errorLineText] 出错行原文（文件 1 基行内容；缺省只按消息分诊）
 * @returns {string} 中文修复动作（非空）
 */
export function diagnoseTaskYamlError(message, errorLineText = '') {
  const msg = String(message || '')
  const line = String(errorLineText || '').replace(/\r$/, '')
  // 剥列表项/缩进前缀后看首个 token 字符：反引号/@/% 是 YAML 保留指示符，js-yaml 对其报的
  // 消息家族不稳定（实测反引号列表项报 bad indentation of a sequence entry），行内容才是可靠信号
  const itemBody = line.replace(/^\s*(?:-\s*)?/, '')
  if (/^[`@%]/.test(itemBody)) {
    return '列表项/值以 YAML 保留指示符开头（反引号 `、@、%）——行首加普通文字前缀（如「执行 」）或给整行值加单引号包裹'
  }
  if (/quoted scalar/i.test(msg)) return '引号不成对——补齐成对引号，或改用中文引号/去掉引号'
  if (/duplicated mapping key/i.test(msg)) return '同一字段写了两次——保留正确一处删除其余（骨架已反填的键勿重复手填）'
  if (/expected ',' or ']'/i.test(msg)) return '方括号流序列内有裸特殊字符——改块式列表（键名换行后每项一行「  - 路径」）；空 [] 占位不受影响'
  if (/expected ',' or '}'/i.test(msg)) return '花括号且内部含冒号或引号（JS 对象/模板字面量）——改用不含这些字符的中文描述'
  if (/mapping values are not allowed|bad indentation/i.test(msg)) {
    if (/: /.test(line)) return '值含「冒号+空格」（如 A: B、url: http://x）被当成嵌套映射键——去掉冒号后的空格（写 A:B）或改写为不含「: 」的中文描述'
    return '缩进或映射结构错——块式列表项保持两空格缩进、与上级键名对齐；值含「: 」时改写描述'
  }
  if (/cannot start any token/i.test(msg)) return '行内含 YAML 无法起始 token 的字符（如反引号/@ 开头）——加文字前缀或用引号包裹该值'
  return '值含特殊字符——给值加单引号、去掉「: 」冒号空格，或改块式列表（规则全表见 templates/prompts/taskcard-rules.md）'
}
