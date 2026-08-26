/**
 * next.js — `sillyspec next` 项目状态探测（吸收 continue/resume 两个 skill 的手工探测表，
 * 2026-08-21 agent-手工产出审计第二批 G7/G8）。
 *
 * 两个 skill 各自维护一套「文件存在性状态机」推断表且内容重复，agent 每次手工跑
 * ls/cat 探测再查表——纯机械探测是 CLI 的本职。本模块输出「状态描述 + 下一步命令 +
 * 依据文件」，agent 按输出执行即可；skill 保留作兜底（CLI 不可用/输出异常时）。
 *
 * 纯 fs 探测（零 DB 依赖、零 token、快）：进度库的权威状态归 `sillyspec progress show`，
 * 本命令管「没有活跃进度时从产物文件反推该干什么」。决策表（两个 skill 合并）：
 *
 *   1. HANDOFF.json 存在 → 交接恢复
 *   2. 活跃变更（changes/ 非 archive）逐个推断：
 *      无文件→补 proposal / 无 design.md→brainstorm / 无 tasks.md→brainstorm 末步 /
 *      无 plan.md→plan / tasks.md 有未勾→execute / 全勾无 verify-result.md→verify /
 *      有 verify-result.md→archive
 *   3. 有 docs/<p>/scan/ 无活跃变更 → brainstorm（已扫描待开变更）
 *   4. 有 REQUIREMENTS.md/ROADMAP.md 无变更 → brainstorm（绿地已有需求）
 *   5. 什么都没有 → init（新项目）或 scan（棕地）
 */
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { resolveSpecDir } from './shared.js'

/**
 * 数 tasks.md checkbox：返回 { checked, total }（无文件 → {checked:0,total:0}）
 */
function countTasks(tasksPath) {
  if (!existsSync(tasksPath)) return { checked: 0, total: 0 }
  let checked = 0
  let total = 0
  for (const line of readFileSync(tasksPath, 'utf8').split('\n')) {
    const m = line.match(/^[-*]\s*\[([ xX])\]\s*task-\d+\b/)
    if (!m) continue
    total++
    if (m[1] !== ' ') checked++
  }
  return { checked, total }
}

/**
 * 单个活跃变更的产物推断：返回 { state, next, evidence }
 */
function inferChange(changeDir, name, specBase) {
  const has = (f) => existsSync(join(changeDir, f))
  // evidence 用真实 spec 根（平台模式=specRoot 绝对路径，此前硬编码 .sillyspec/ 前缀误导）
  const ev = (f) => join(specBase, 'changes', name, f)
  const t = countTasks(join(changeDir, 'tasks.md'))

  if (!has('proposal.md') && !has('design.md') && !has('tasks.md') && !has('plan.md')) {
    return { state: `${name}：变更目录为空`, next: 'sillyspec run brainstorm（完善 proposal）或清理该空目录', evidence: [ev('（无产物）')] }
  }
  if (!has('design.md')) {
    return { state: `${name}：有 proposal 缺 design.md`, next: `sillyspec run brainstorm --change ${name}（推进到设计产物）`, evidence: [ev('proposal.md')] }
  }
  if (!has('tasks.md')) {
    return { state: `${name}：有 design 缺 tasks.md`, next: `sillyspec run brainstorm --change ${name}（末步生成规范文件）`, evidence: [ev('design.md')] }
  }
  if (!has('plan.md')) {
    return { state: `${name}：有 tasks.md 缺 plan.md`, next: `sillyspec run plan --change ${name}`, evidence: [ev('tasks.md')] }
  }
  if (t.total > 0 && t.checked < t.total) {
    return {
      state: `${name}：执行中（task ${t.checked}/${t.total}）`,
      next: `sillyspec run execute --change ${name}`,
      evidence: [ev('plan.md'), ev('tasks.md')],
    }
  }
  if (!has('verify-result.md')) {
    return { state: `${name}：task 全勾，待验证`, next: `sillyspec run verify --change ${name}`, evidence: [ev('tasks.md'), ev('plan.md')] }
  }
  return { state: `${name}：已验证，待归档`, next: `sillyspec run archive --change ${name}`, evidence: [ev('verify-result.md')] }
}

/**
 * 探测当前项目状态与下一步命令。
 * @param {{ cwd: string, specDir?: string|null }} opts
 * @returns {{ state: string, next: string, evidence: string[], activeChanges: Array<{name,checked,total}> }}
 *   activeChanges 附带各变更 task 勾选进度（供 --json 消费）；evidence 为相对 spec 根的路径
 */
export function detectNextStep({ cwd, specDir = null }) {
  const specBase = resolveSpecDir(cwd, { specDir })
  const changesRoot = join(specBase, 'changes')

  // 1. HANDOFF 交接
  for (const handoff of [join(cwd, 'HANDOFF.json'), join(specBase, 'HANDOFF.json')]) {
    if (existsSync(handoff)) {
      return { state: '存在 HANDOFF.json（上次会话交接）', next: '读 HANDOFF.json 后从交接点继续（sillyspec progress show 看活跃进度）', evidence: [handoff], activeChanges: [] }
    }
  }

  // 2. 活跃变更（排除 archive）
  let active = []
  try {
    active = readdirSync(changesRoot, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name !== 'archive')
      .map(e => e.name)
      .sort()
  } catch { /* 无 changes/ 目录 */ }
  if (active.length > 0) {
    // 多活跃时逐个推断全报告，next 取第一个（字典序最前）的；调用方输出含全部状态行
    const inferences = active.map(name => inferChange(join(changesRoot, name), name, specBase))
    const progress = active.map((name, i) => {
      const t = countTasks(join(changesRoot, name, 'tasks.md'))
      return { name, checked: t.checked, total: t.total, state: inferences[i].state }
    })
    return { state: inferences.map(i => i.state).join('；'), next: inferences[0].next, evidence: inferences[0].evidence, activeChanges: progress }
  }

  // 3. 已扫描无变更
  const docsDir = join(specBase, 'docs')
  try {
    const scanned = readdirSync(docsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && existsSync(join(docsDir, e.name, 'scan')))
    if (scanned.length > 0) {
      return { state: `已扫描（${scanned.length} 个项目文档），无活跃变更`, next: 'sillyspec run brainstorm "你的想法"', evidence: [join('.sillyspec', 'docs', scanned[0].name, 'scan')], activeChanges: [] }
    }
  } catch { /* 无 docs/ */ }

  // 4. 绿地已有需求
  for (const f of ['REQUIREMENTS.md', 'ROADMAP.md']) {
    if (existsSync(join(specBase, f))) {
      return { state: `绿地项目已有 ${f}，无活跃变更`, next: 'sillyspec run brainstorm "你的想法"', evidence: [join('.sillyspec', f)], activeChanges: [] }
    }
  }

  // 5. 什么都没有
  return { state: '未初始化（无 .sillyspec 产物）', next: 'sillyspec init（新项目）或 sillyspec scan（棕地项目）', evidence: [], activeChanges: [] }
}
