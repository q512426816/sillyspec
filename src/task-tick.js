/**
 * task-tick.js — `sillyspec task tick` 轻量勾选动词（2026-10-03-voluntary-task-tick）。
 *
 * 定位：让「边干边勾」成为最顺手路径——做完一个任务单元，一条命令翻格并立即拿到机器
 * 确认（进度 N/M + 下一任务指针）。翻格产生的 tasks.md 变更由 watcher 既有 task-done
 * 事件链实时上平台——闭环确认是 OpenSpec apply 循环「勾后重询」的本地对等物（2026-10-03
 * local-usage-caliber-fix 0/12 事故的自愿路径修复：正反馈替代验证强制）。
 *
 * 事件直写（2026-10-07-thin-tasks-v3）：翻格成功后向本变更 watcher 事件流追加分级精确
 * task-done 事件（source:'task-tick'，checked N→M 逐格口径）——watcher 3s 轮询对快速连续
 * tick 只能采样出合并跳，收口节奏门以 CLI 精确事件为权威去重（detectBatchCheckCadence）。
 * best-effort：事件写失败不阻断翻格（节奏门退回采样判，fail 方向安全）。
 *
 * 边界：
 *   - 纯簿记动词：无 review/verdict/ownership 仪式（与 task done 四合一的分界——那是厚档
 *     任务卡的收尾件；本动词对 thin 工作分解面与覆写面同样适用，自愿使用不违 D-007）。
 *   - 幂等：已勾再勾走 already 分支（exit 0，零事件直写）——并发/重放零副作用；写盘走 writeAtomicSync。
 *   - 行内替换只动 checkbox 态字符，其余字节（含 CRLF）逐字保留。
 *   - 归档件只读：变更已归档时拒收（exit 2）。
 */
import { existsSync, readFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

/** 任务行（宽容缩进/星号有序标记，与哨兵判集行锚同口径 + 缩进容差）。 */
const TASK_ROW_RE = /^(\s*[-*] \[)( |x|X)(\] task-(\d+):)(.*)$/

/** 归一 task id：task-1 → task-01（与 governance-autopilot 勾选 token 归一同口径）。 */
export function normalizeTaskId(id) {
  const m = /^task-(\d+)$/.exec(String(id || '').trim())
  return m ? `task-${String(Number(m[1])).padStart(2, '0')}` : null
}

/** 任务行清单（行序即文档序）：[{id, checked, desc}]。 */
function collectRows(md) {
  const rows = []
  for (const line of String(md || '').split(/\r?\n/)) {
    const m = line.match(TASK_ROW_RE)
    if (m) rows.push({ id: `task-${String(Number(m[4])).padStart(2, '0')}`, checked: m[2].toLowerCase() === 'x', desc: (m[5] || '').trim() })
  }
  return rows
}

/**
 * 纯函数：翻格 + 进度回显材料。
 * @param {{tasksMd:string, taskId:string}} opts
 * @returns {{kind:'ticked'|'already', tasksMd:string, checked:number, total:number, next:{id:string,desc:string}|null}
 *   |{kind:'unknown', available:string[]}}
 */
export function tickTasksMd({ tasksMd, taskId }) {
  const id = normalizeTaskId(taskId)
  if (!id) return { kind: 'unknown', available: [] }
  const rows = collectRows(tasksMd)
  const target = rows.find((r) => r.id === id)
  if (!target) return { kind: 'unknown', available: rows.map((r) => r.id) }
  let out = String(tasksMd || '')
  if (!target.checked) {
    const re = new RegExp(`^(\\s*[-*] \\[) (\\] ${id}:)`, 'm')
    out = out.replace(re, '$1x$2')
  }
  const after = collectRows(out)
  const checked = after.filter((r) => r.checked).length
  const pending = after.find((r) => !r.checked)
  return {
    kind: target.checked ? 'already' : 'ticked',
    tasksMd: out,
    checked,
    total: after.length,
    next: pending ? { id: pending.id, desc: pending.desc } : null,
  }
}

/**
 * IO 编排（index.js 分派入口）：定位变更目录 → tickTasksMd → 原子写盘 → 回显。
 * exit 0=翻格/幂等；exit 2=未知 id / 缺 tasks.md / 已归档。
 */
export async function runTaskTick({ changeName, cwd, taskId, specBase }) {
  const changesRoot = join(specBase, 'changes')
  const tasksPath = join(changesRoot, changeName, 'tasks.md')
  if (!existsSync(tasksPath)) {
    if (existsSync(join(changesRoot, 'archive', changeName))) {
      console.error(`❌ 变更 ${changeName} 已归档——归档件只读，不勾选`)
    } else {
      console.error(`❌ 未找到 ${tasksPath}——task tick 面向在途变更的任务注册表（确认 --change）`)
    }
    process.exit(2)
  }
  const r = tickTasksMd({ tasksMd: readFileSync(tasksPath, 'utf8'), taskId })
  if (r.kind === 'unknown') {
    const ids = (r.available || []).join('、') || '（tasks.md 无任务行）'
    console.error(`❌ tasks.md 中无 ${taskId}——可选任务：${ids}`)
    process.exit(2)
  }
  if (r.kind === 'ticked') {
    const { writeAtomicSync } = await import('./fs-atomic.js')
    writeAtomicSync(tasksPath, r.tasksMd)
    // 事件直写（2026-10-07-thin-tasks-v3）：精确单格跳进事件流，节奏门按 source 去重采样合并跳。
    try {
      const { resolveRuntimeRoot } = await import('./run/shared.js')
      const runtimeRoot = resolveRuntimeRoot({}, specBase)
      const eventsPath = join(runtimeRoot, `watcher-events-${changeName}.jsonl`)
      const from = Math.max(0, r.checked - 1)
      appendFileSync(eventsPath, JSON.stringify({
        ts: Date.now(), kind: 'task-done', stage: 'tasks',
        detail: `checked ${from}→${r.checked}`, provisional: true, source: 'task-tick',
      }) + '\n', 'utf8')
    } catch { /* 事件 best-effort：写失败翻格不受影响（节奏门退回采样判） */ }
    // 工件即时重推（2026-10-07-allticked-gate-docs-resync）：翻格即任务面变更——顺带触发
    // spec-sync，平台不再停留 start 时点快照（真实会话实证：改写后平台恒显初稿）。best-effort。
    try {
      const { triggerSync } = await import('./run/shared.js')
      await triggerSync(cwd, changeName, { specRoot: specBase })
    } catch { /* 重推 best-effort：失败不影响翻格主流程 */ }
  }
  const nextTip = r.next
    ? `｜下一任务：${r.next.id} ${r.next.desc.slice(0, 40)}${r.next.desc.length > 40 ? '…' : ''}`
    : `｜🎉 ${r.total}/${r.total} 全勾——可收口：sillyspec flow done --change ${changeName}`
  console.log(`${r.kind === 'ticked' ? '✅ 已勾' : 'ℹ️ 已是勾选态（幂等跳过写盘）'}（${r.checked}/${r.total}）${nextTip}`)
  return r
}

export default { tickTasksMd, runTaskTick, normalizeTaskId }
