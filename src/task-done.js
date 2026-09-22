/**
 * task-done.js — `sillyspec task done` 四合一（r5l-forensic-verdict 方案 1 / 评审护栏#3）。
 *
 * 背景（R5-L 法证桶①）：13 任务 × 每任务 4 连往返（task start → 实现 → review write →
 * task finish，wt-commit 另计）≈ 52 次 CLI 调用纯属可合并——每次往返按当时全量上下文计费，
 * 合并后每次省一次 ~300K 重发。本命令把收尾三连（review write 落 review.json + tasks.md
 * 自动勾选 → task finish 清进行中标记 → 可选 wt-commit）收进单进程串行执行，输出合并为
 * 分段结果行（一次调用一段可 grep 的结果，不再三条命令三段散落）。
 *
 * 原子性（评审护栏#3，硬约束）：
 *   - 每子步先查自身完成标记，幂等跳过——review.json 已在且 verdict 指纹一致 → 跳过该步；
 *     finish 标记不在 → 已完工跳过；wt-commit 无变更自然 skip（runWtCommit 既有语义）。
 *   - 中段失败精确报告已完成子步（哪些已落盘、断在哪），重入直接重跑同命令从断点续。
 *   - verdict 指纹不一致的已存在 review（改判场景）默认拒改写——继承 writeTaskReview 拒覆盖
 *     语义，显式 --force 越过（与 review write 单独通道同款逃生门）。
 *
 * ownership 继承：不新增判定也不旁路既有判定——writeTaskReview 的拒覆盖/evidence 硬校验、
 * runWtCommit 的 worktree 定位/文件锁/显式 pathspec 纪律原样生效（本模块只做编排）。
 * `task start` 的受影响测试族注入不在本命令面（开工前置提示，保留不动）。
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @param {{
 *   changeName: string, cwd: string, taskId: string, verdict: string,
 *   notes?: string, evidence?: string|null,
 *   commitMessage?: string|null, pathspecs?: string[], pathspecFile?: string|null,
 *   markerDir?: string|null, platformOpts?: object, force?: boolean,
 * }} opts
 * @returns {{ok: boolean, steps: Array<{name: string, status: string, detail: string}>}}
 */
export async function runTaskDone({ changeName, cwd, taskId, verdict, notes = '', evidence = null,
  commitMessage = null, pathspecs = [], pathspecFile = null, markerDir = null, platformOpts = {}, force = false,
  baseOverride = null, headOverride = null, changedFilesOverride = null }) {
  const steps = []
  const step = (name, status, detail) => { steps.push({ name, status, detail }) }
  const specBase = (platformOpts && platformOpts.specRoot) || join(cwd, '.sillyspec')
  const { resolveRuntimeRoot } = await import('./run/shared.js')
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  const { writeTaskReview, resolveLatestExecuteRunIdWithTasks, isValidExecuteRunId } = await import('./task-review.js')
  // review.json 路径锚（子步 1 落定；子步 4 提交后回填 head 用——坑 task-done-head-premature：
  // review 写在 wt-commit 之前，head 快照停在基线 → Task Review Gate 的 base..head 路径切片
  // 为空被误判「零改动伪造」（R7 会话 5 份手工重对的机制化根治，2026-09-22）。
  let reviewPathForBackfill = null

  // ── 子步 1：review.json（幂等标记 = 同 executeRunId 同 task 同双 verdict 已在）──
  // executeRunId 解析与 writeTaskReview 同源：marker 文件优先，缺省回退最新含 tasks 的 run。
  let reviewWritten = false
  let reviewSkipped = false
  try {
    let runId = ''
    const markerFile = join(runtimeRoot, 'current-execute-run-id-' + changeName)
    try {
      if (existsSync(markerFile)) {
        const c = readFileSync(markerFile, 'utf8').trim()
        if (isValidExecuteRunId(c)) runId = c
      }
    } catch { /* 读失败走回退 */ }
    if (!runId) runId = resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName }) || ''
    const existingPath = runId ? join(runtimeRoot, 'execute-runs', runId, 'tasks', taskId, 'review.json') : null
    if (existingPath) reviewPathForBackfill = existingPath
    if (existingPath && existsSync(existingPath)) {
      let existing = null
      try { existing = JSON.parse(readFileSync(existingPath, 'utf8')) } catch { /* 损坏按不存在处理 */ }
      if (existing && existing.specVerdict === verdict && existing.qualityVerdict === verdict) {
        reviewSkipped = true
        step('review.json', 'skipped', `已在且 verdict 指纹一致（spec=${verdict} quality=${verdict}，${existingPath}）——幂等跳过`)
      } else if (!force) {
        step('review.json', 'failed', `已存在但 verdict 不一致（现存 spec=${existing ? existing.specVerdict : '?'} quality=${existing ? existing.qualityVerdict : '?'} ≠ 请求 ${verdict}）：${existingPath}——改判需显式 --force（保护既有 reviewer 结论，与 review write 拒覆盖同款）`)
        return finishReport({ ok: false, steps, changeName, taskId })
      }
    }
    if (!reviewSkipped) {
      const preExisting = existingPath ? existsSync(existingPath) : false
      const r = await writeTaskReview({
        changeName, cwd, taskId,
        specVerdict: verdict, qualityVerdict: verdict,
        reviewerNotes: notes || '',
        requiredEvidence: evidence ? [evidence] : [],
        baseOverride, headOverride, changedFilesOverride,
        force, platformOpts,
      })
      if (r.ok) {
        reviewWritten = true
        reviewPathForBackfill = r.reviewPath || reviewPathForBackfill
        step('review.json', 'done', `${preExisting ? '覆盖写入（--force）' : '写入'} ${r.reviewPath}（executeRunId=${r.executeRunId}）`)
      } else {
        step('review.json', 'failed', r.errors.join('；'))
        return finishReport({ ok: false, steps, changeName, taskId })
      }
    }
  } catch (e) {
    step('review.json', 'failed', `解析/写入异常：${e && e.message ? e.message : e}`)
    return finishReport({ ok: false, steps, changeName, taskId })
  }

  // ── 子步 2：tasks.md checkbox 自动勾选（review write 单通道同款内嵌；幂等重跑无害）──
  // task 真源归一（P2-f）：review.json verdict 是唯一真源，tasks.md 勾选是显示态，CLI 唯一勾选者。
  try {
    const { autoCheckPlanFromReviews } = await import('./run/complete.js')
    const ac = await autoCheckPlanFromReviews({ stageName: 'execute', changeName, cwd, platformOpts })
    if (ac.autoChecked && ac.checkedCount > 0) {
      step('tasks.md 勾选', 'done', `按 review verdict 自动勾选 ${ac.checkedCount} 个（task 真源 = review.json，勿手动勾选）`)
    } else {
      step('tasks.md 勾选', 'skipped', '无可新勾选项（已勾/无卡——autoCheck 幂等）')
    }
  } catch (e) {
    // 勾选 fail-soft（review write 单通道同款语义）：execute --done 时 autoCheck 兜底
    step('tasks.md 勾选', 'skipped', `勾选降级（fail-soft，--done 时 autoCheck 兜底）：${e && e.message ? e.message : e}`)
  }

  // ── 子步 3：task finish（幂等标记 = 进行中标记文件不在 → 已完工跳过）──
  const markerPath = markerDir ? join(markerDir, `${taskId}.json`) : null
  if (markerPath && existsSync(markerPath)) {
    try {
      unlinkSync(markerPath)
      step('task finish', 'done', `进行中标记已清除（${markerPath}）`)
    } catch (e) {
      step('task finish', 'failed', `标记清除失败：${e && e.message ? e.message : e}`)
      return finishReport({ ok: false, steps, changeName, taskId })
    }
  } else {
    step('task finish', 'skipped', markerPath ? '无进行中标记（已完工或从未 start）' : '无 markerDir（非 task start 流程，跳过）')
  }

  // ── 子步 4：wt-commit（可选；runWtCommit 自带 worktree 定位/文件锁/无变更 skip）──
  if (!commitMessage) {
    step('wt-commit', 'skipped', '未请求 --commit（如需提交工作区改动：加 --commit -m "<信息>" -- <精确路径>')
  } else {
    try {
      const { runWtCommit } = await import('./wt-commit.js')
      const r = await runWtCommit({ changeName, message: commitMessage, pathspecs, pathspecFile, cwd })
      // head 回填（坑 task-done-head-premature 根治）：review 先于 commit 写入，head 停在基线
      // → Task Review Gate base..head 切片空误判零改动。提交成功（HEAD 前移）即把 review.head
      // 重锚为本提交全哈希+headBackfilledAt 审计戳；fail-soft（回填失败只警示不改判提交结果）。
      let backfillNote = ''
      if (!r.skipped && r.head && reviewPathForBackfill && existsSync(reviewPathForBackfill)) {
        try {
          const rev = JSON.parse(readFileSync(reviewPathForBackfill, 'utf8'))
          if (rev && rev.head !== r.head) {
            rev.head = r.head
            rev.headBackfilledAt = new Date().toISOString()
            const { writeAtomicSync } = await import('./fs-atomic.js')
            writeAtomicSync(reviewPathForBackfill, JSON.stringify(rev, null, 2) + '\n')
            backfillNote = `；review.head 已回填 ${r.shortHead}（提交后重锚）`
          }
        } catch (e) {
          backfillNote = `；review.head 回填失败（fail-soft）: ${(e && e.message) || e}`
        }
      }
      step('wt-commit', r.skipped ? 'skipped' : 'done',
        r.skipped ? `无变更跳过（HEAD 不动）：${r.shortHead}` : `${r.shortHead}（${r.files.length} 文件，worktree=${r.worktreePath}）${backfillNote}`)
    } catch (e) {
      step('wt-commit', 'failed', `${e && e.message ? e.message : e}`)
      return finishReport({ ok: false, steps, changeName, taskId })
    }
  }

  return finishReport({ ok: true, steps, changeName, taskId })
}

/** 统一报告渲染：四段结果行 + 失败时已完成子步精确点名与重入指引 */
function finishReport({ ok, steps, changeName, taskId }) {
  const icon = (s) => (s.status === 'done' ? '✅' : s.status === 'skipped' ? '⏭️ ' : '❌')
  if (ok) {
    console.log(`✅ task done [${taskId}] @ ${changeName}：${steps.length} 个子步全部完成（done/skipped 均为终态）`)
  } else {
    console.error(`❌ task done [${taskId}] @ ${changeName} 中断：`)
  }
  steps.forEach((s, i) => {
    const line = `   ${i + 1}. [${s.name}] ${icon(s)} ${s.status}——${s.detail}`
    if (ok) console.log(line); else console.error(line)
  })
  if (!ok) {
    const done = steps.filter((s) => s.status === 'done' || s.status === 'skipped')
    console.error(`   已完成子步：${done.length > 0 ? done.map((s) => s.name).join('、') : '（无——首子步即失败）'}`)
    console.error(`   重入：修复失败原因后重跑同一条命令——已完成子步幂等跳过，从断点续（review verdict 指纹一致即跳过写入）`)
  }
  return { ok, steps }
}
