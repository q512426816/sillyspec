/**
 * plan-adopt-waves.js — `sillyspec plan-adopt-waves` 把 plan.md 的 Wave 段一键重排为
 * depends_on 拓扑分组（坑 wave-manual-mismatch-noise，2026-08-24 用户反馈二期：主控手排
 * Wave 与 CLI 拓扑比对不一致只能手动改；依赖方向违规修复后，本命令给一条零手写出路）。
 *
 * 行为：
 *   - depMap（tasks/*.md 的 depends_on，collectTaskDepMap 与 postcheck 同源）→ topoSortWaves
 *   - 重写 plan.md 的 `## Wave N` 段块（段内按编号排序；首段「并行，无依赖」、其余「依赖前序 Wave」）
 *   - 无显式 Wave 标题 → 插在「## 任务总表」前（无总表则文末追加）
 *   - best-effort 同步任务总表的 W 列（仅认 7 列模板行；不匹配的行 warn 不强改）
 *   - Wave 段内若含非引用内容（正文/表格）→ 拒绝重写（防误删），提示先手动整理
 *   - 写后复跑 validateBlueprintConsistency 打印结果（防 adopt 把手工安全串行收敛出
 *     同 Wave 共享路径冲突——topo 只看依赖不看文件重叠）
 *   - --dry-run 只打印将写入的 Wave 段不落盘；幂等（重复跑产出相同结构）；行尾统一 LF
 */
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { topoSortWaves, collectTaskDepMap, validateBlueprintConsistency } from './stages/plan-postcheck.js'

const WAVE_HEADING_RE = /^#+\s*Wave\s+\d+/i
const TASK_REF_RE = /^[-*]\s+(?:\[[ x]\]\s*)?task-\d+\s*[:：\s]*$/i
const LEGACY_TASK_REF_RE = /^[-*]\s*\[[ x]\]\s*task-\d+/i
const SUMMARY_HEADING_RE = /^#+\s*任务总表/

/** 渲染标准 Wave 段块（段落间空行分隔，结尾不带多余空行——由调用方控制拼接） */
function renderWaveBlock(waves) {
  const L = []
  waves.forEach((wave, i) => {
    const sorted = [...wave].sort((a, b) =>
      parseInt(String(a).replace(/\D/g, ''), 10) - parseInt(String(b).replace(/\D/g, ''), 10))
    L.push(`## Wave ${i + 1}（${i === 0 ? '并行，无依赖' : '依赖前序 Wave'}）`)
    for (const t of sorted) L.push(`- ${t}`)
    if (i < waves.length - 1) L.push('')
  })
  return L
}

/** best-effort 更新任务总表 W 列：仅认 `| task-XX | … | W1 | … |` 形态的 7+ 列模板行 */
function updateSummaryWaveColumn(lines, waveOf) {
  let inSummary = false
  let updated = 0
  let skipped = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^#+\s/.test(line)) { inSummary = SUMMARY_HEADING_RE.test(line); continue }
    if (!inSummary) continue
    const m = line.match(/^\|\s*task-(\d+)\s*\|/)
    if (!m) continue
    const cells = line.split('|')
    // 模板 7 列：| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 | → split 后首尾空串
    if (cells.length < 8 || !/^\s*W\d+\s*$/.test(cells[3] || '')) { skipped++; continue }
    const taskId = `task-${String(m[1]).padStart(2, '0')}`
    const waveIdx = waveOf.get(taskId)
    if (waveIdx === undefined) { skipped++; continue }
    cells[3] = ` W${waveIdx + 1} `
    lines[i] = cells.join('|')
    updated++
  }
  return { updated, skipped }
}

/**
 * @param {{ changeDir: string, dryRun?: boolean }} opts
 * @returns {{ ok: boolean, error?: string, waves?: string[][], planPath: string, dryRun: boolean,
 *             waveBlock?: string[], tableRowsUpdated?: number, tableRowsSkipped?: number,
 *             postcheck?: { errors: string[], warnings: string[] } }}
 */
export function adoptPlanWaves({ changeDir, dryRun = false }) {
  const planPath = join(changeDir, 'plan.md')
  if (!existsSync(planPath)) return { ok: false, error: `plan.md 不存在: ${planPath}`, planPath, dryRun }
  const tasksDir = join(changeDir, 'tasks')
  if (!existsSync(tasksDir)) return { ok: false, error: `tasks/ 目录不存在: ${tasksDir}`, planPath, dryRun }
  const depMap = collectTaskDepMap(tasksDir)
  if (depMap.size === 0) return { ok: false, error: 'tasks/ 下没有 task-NN.md 卡片，无从推导 Wave 分组', planPath, dryRun }

  const { waves, error: topoError } = topoSortWaves(depMap)
  if (topoError) return { ok: false, error: `拓扑排序失败: ${topoError}`, planPath, dryRun }

  const original = readFileSync(planPath, 'utf8')
  const lines = original.split(/\r?\n/)
  const waveBlock = renderWaveBlock(waves)
  const waveOf = new Map()
  waves.forEach((ws, i) => { for (const t of ws) waveOf.set(t, i) })

  const firstWaveIdx = lines.findIndex(l => WAVE_HEADING_RE.test(l))
  if (firstWaveIdx >= 0) {
    // Wave 段块末尾 = 最后一个 Wave 标题之后连续的任务引用行（空行容忍但不断段；
    // 遇非 Wave 标题即止）。段内混入非引用内容 → 拒绝重写（防误删正文/表格）。
    let endIdx = firstWaveIdx
    for (let i = firstWaveIdx; i < lines.length; i++) {
      if (WAVE_HEADING_RE.test(lines[i])) { endIdx = i; continue }
      if (TASK_REF_RE.test(lines[i]) || LEGACY_TASK_REF_RE.test(lines[i])) { endIdx = i; continue }
      if (lines[i].trim() === '') continue
      if (/^#+\s/.test(lines[i])) break
      return { ok: false, error: `Wave 段内含非引用内容（第 ${i + 1} 行「${lines[i].slice(0, 40)}」）——为防误删拒绝重写，请先把 Wave 段整理为纯 "- task-XX" 引用行`, planPath, dryRun }
    }
    lines.splice(firstWaveIdx, endIdx - firstWaveIdx + 1, ...waveBlock)
  } else {
    // 无显式 Wave 标题：插在「## 任务总表」前；无总表则文末追加
    const summaryIdx = lines.findIndex(l => SUMMARY_HEADING_RE.test(l))
    if (summaryIdx >= 0) {
      lines.splice(summaryIdx, 0, ...waveBlock, '')
    } else {
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
      lines.push('', ...waveBlock)
    }
  }

  const { updated, skipped } = updateSummaryWaveColumn(lines, waveOf)
  const content = lines.join('\n').replace(/\n*$/, '\n')

  if (dryRun) {
    return { ok: true, waves, planPath, dryRun: true, waveBlock, tableRowsUpdated: updated, tableRowsSkipped: skipped }
  }

  writeFileSync(planPath, content, 'utf8')
  // 复跑 blueprint 一致性（advisory 打印）：topo 只看依赖不看文件重叠——adopt 可能把手工
  // 安全串行收敛出同 Wave 共享路径冲突，立即暴露而非留到 execute 撞
  let postcheck = null
  try {
    postcheck = validateBlueprintConsistency(changeDir)
  } catch (e) {
    postcheck = { errors: [`复跑校验异常: ${e?.message || e}`], warnings: [] }
  }
  return { ok: true, waves, planPath, dryRun: false, waveBlock, tableRowsUpdated: updated, tableRowsSkipped: skipped, postcheck }
}
