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
 * 证据解析（2026-10-12-tick-evidence-multi-anchor）：自由文本或 @路径 引用——@file 读文件内容
 * （帽 8KB，超帽截断留痕）；读取失败 fail-soft 原样登记「@路径」文本并告警（不拒翻格——证据是
 * 自愿补录面，不进门禁判据）。dogfood 驱动：限流截断场景构建回执（/tmp 日志 exit 0）无法补录，
 * 恢复后只能重跑构建。
 */
export function resolveTickEvidence({ evidence }) {
  const raw = String(evidence ?? '').trim()
  if (!raw) return { text: null, warning: null }
  if (!raw.startsWith('@')) return { text: raw, warning: null }
  const path = raw.slice(1)
  try {
    let content = readFileSync(path, 'utf8')
    if (Buffer.byteLength(content, 'utf8') > 8192) {
      content = Buffer.from(content, 'utf8').subarray(0, 8192).toString('utf8') + '…（超 8KB 截断）'
    }
    const text = `@${path}\n${content.trim()}`
    if (!content.trim()) return { text: `@${path}（空文件）`, warning: `⚠️ 证据文件 ${path} 为空——原样登记引用` }
    return { text, warning: null }
  } catch (e) {
    return { text: raw, warning: `⚠️ 证据文件 ${path} 读取失败（${e && e.code ? e.code : '不可读'}）——原样登记引用文本，未拒翻格` }
  }
}

/**
 * IO 编排（index.js 分派入口）：定位变更目录 → tickTasksMd → 原子写盘 → 回显。
 * exit 0=翻格/幂等；exit 2=未知 id / 缺 tasks.md / 已归档。
 * evidence（可选）：自愿证据补录——翻格成功后追加 task-evidence.jsonl（幂等重勾零追加）。
 */
export async function runTaskTick({ changeName, cwd, taskId, specBase, evidence = null }) {
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
  // 证据预解析（翻格前展开 @file——证据不先于事实：翻格失败不产生证据行）
  const ev = resolveTickEvidence({ evidence })
  if (ev.warning) console.warn(ev.warning)
  if (r.kind === 'ticked') {
    const { writeAtomicSync } = await import('./fs-atomic.js')
    writeAtomicSync(tasksPath, r.tasksMd)
    // 证据补录（2026-10-12-tick-evidence-multi-anchor）：翻格成功后追加四键 JSONL——
    // 幂等重勾零追加（already 分支不进此块）；自愿面不接任何收口门判据。
    if (ev.text) {
      try {
        appendFileSync(join(changesRoot, changeName, 'task-evidence.jsonl'), JSON.stringify({
          ts: Date.now(), task: normalizeTaskId(taskId) || taskId, evidence: ev.text, source: 'task-tick',
        }) + '\n', 'utf8')
        console.log(`📎 证据已登记：${join(changesRoot, changeName, 'task-evidence.jsonl')}（task ${normalizeTaskId(taskId) || taskId}）`)
      } catch (e) {
        console.warn(`⚠️ 证据登记失败（${e && e.message ? e.message : e}）——翻格不受影响`)
      }
    }
    // 事件直写（2026-10-07-thin-tasks-v3）：精确单格跳进事件流，节奏门按 source 去重采样合并跳。
    try {
      const { resolveRuntimeRoot } = await import('./run/shared.js')
      const runtimeRoot = resolveRuntimeRoot({}, specBase)
      const eventsPath = join(runtimeRoot, `watcher-events-${changeName}.jsonl`)
      const from = Math.max(0, r.checked - 1)
      appendFileSync(eventsPath, JSON.stringify({
        ts: Date.now(), kind: 'task-done', stage: 'tasks',
        detail: `checked ${from}→${r.checked}`, provisional: true, source: 'task-tick',
        ...(ev.text ? { evidence: ev.text.slice(0, 300) } : {}), // 事件面截 300 字符（全文在 task-evidence.jsonl）
      }) + '\n', 'utf8')
    } catch { /* 事件 best-effort：写失败翻格不受影响（节奏门退回采样判） */ }
    // 侧车勾选留痕（2026-10-14-timeline-ticktime-anchor-scope）：{ts,task,source} 追加进 change 目录
    // 的 task-ticks.jsonl——勾选时刻的事实源（timeline 任务面精确时刻），落 change 目录随归档进 git
    // 跨机可读，不随 .runtime 机本位/观测盲窗蒸发（2026-10-14-deploy-release-notes 实证：盲窗内
    // 勾选两个记录面全空）。事件面不带任务 id（节奏门只读 checked N→M），id 口径以本侧车为权威。
    // best-effort：写失败仅告警，翻格不受影响（timeline 退事件流推断）。
    try {
      appendFileSync(join(changesRoot, changeName, 'task-ticks.jsonl'), JSON.stringify({
        ts: Date.now(), task: normalizeTaskId(taskId) || taskId, source: 'task-tick',
      }) + '\n', 'utf8')
    } catch (e) {
      console.warn(`⚠️ 勾选留痕写失败（task-ticks.jsonl：${e && e.code ? e.code : e}）——翻格不受影响，timeline 勾选时刻退事件流推断`)
    }
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
  if (r.kind === 'ticked') {
    // 勾选随交付入库教学（2026-10-17-tick-timing-source，坑 tick-timing-squash-blindspot 根因 1/3
    // 断链处）：翻格后给现成提交命令——pathspec 含 tasks.md 与侧车（勾选修改与任务交付同一提交
    // 入库，消息占位带 task-NN token），把纪律变成可抄的命令；并当场提醒「此前勾选仍未进
    // git」（已勾 ≥2 格且 tasks.md 零提交）——反馈不再等到 flow done 终点。best-effort：
    // git 不可用（非 git 目录/失败返回 null）只给命令不给提醒，失败不影响翻格与 exit code。
    try {
      const { relative } = await import('node:path')
      const rel = (p) => relative(cwd, p).split('\\').join('/')
      const sidecar = join(changesRoot, changeName, 'task-ticks.jsonl')
      console.log(`📦 勾选随交付入库（同一提交 pathspec）：`)
      console.log(`   git commit -m "<本任务交付概括> (${normalizeTaskId(taskId) || taskId})" -- <交付文件…> ${rel(tasksPath)}${existsSync(sidecar) ? ` ${rel(sidecar)}` : ''}`)
      const { gitQuiet } = await import('./git-helper.js')
      const touched = gitQuiet(cwd, ['log', '-n', '1', '--format=%h', '--', tasksPath])
      if (r.checked >= 2 && touched === '') {
        console.log(`ℹ️ tasks.md 尚无任何提交（此前勾选未随交付入库）——上面的命令已把它带进 pathspec，照抄即闭环`)
      }
    } catch { /* 教学面 best-effort：失败不影响翻格 */ }
  }
  return r
}

export default { tickTasksMd, runTaskTick, normalizeTaskId, resolveTickEvidence }
