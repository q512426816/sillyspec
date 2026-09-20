/**
 * run/complete-handlers.js（W6 Step5 从 run.js 抽出）。
 *
 * completeStep 的子 handler + archive 收尾（自洽叶子模块，仅被 completeStep 调用）：
 *   - handleArchiveConfirmStep：archive「确认归档」步骤 --confirm 门控 + 推荐文档校验
 *   - handlePlanGeneratePlanStep：plan「generate_plan」完成后动态插入 coordinator + postcheck 步骤
 *   - handleScanProjectListStep：scan step 2 完成后按项目展开 perProject 步骤（用 sanitizeProjectName/validateParsedProjects）
 *   - archiveChangeDirectory：归档移动变更目录（移动前所有权硬校验 + 未 apply 交付面门（--skip-apply 留痕）+ 6 处 process.exit(1) + worktree 清理；handleArchiveConfirmStep 内部调用）
 *     srcDir 缺失时走 findAlreadyArchivedDir 幂等自愈（issue archive-stage-physical-tracking-desync）；
 *     archiveChangeDirectory + findAlreadyArchivedDir 已 export 供 test 直接 import
 *   - sanitizeProjectName / validateParsedProjects：项目名清洗 + 列表校验纯函数（handleScanProjectListStep 专用）
 *   - assertWaveTasksComplete：execute「Wave N 执行」步骤 --done 前的完成度门（task-08 / FR-12——
 *     本 Wave 任一 task 的 tasks.md checkbox 未勾 → exit 1；completeStep 在 status='completed' 赋值前
 *     调用，异常 fail-open），实现收拢文件尾（同知识闭环段先例）
 *
 * 安全锚：run.js 始终 barrel。3 handler 由 run.js import 回来；sanitizeProjectName + validateParsedProjects
 * 被 test 直接 import（run-sanitize-project-name / run-scan-project-parse），run.js barrel re-export 契约保留。
 * 4 目标 handler 无 test 直接 import；archiveChangeDirectory + findAlreadyArchivedDir 供自愈 test 直接 import，无需 barrel re-export。completeStep（Step7 搬）将把 import 行带走。
 *   - 知识闭环收尾渲染（2026-09-14-knowledge-loop-close task-03）：归类提议（quick --done 进程内
 *     outputText 根因 × matchKnowledge）+ knowledge-baseline 棘轮（quick/archive 双宿主）+ archive
 *     抽审清单（近 7 天 classify 审计）；countUncategorizedEntries / checkKnowledgeBaselineRatchet /
 *     extractQuickCauseField export 供 test/knowledge-baseline.test.mjs 直接 import（实现收拢文件尾）。
 *
 * 路径修正（相对 src/run/）：
 *   - resolveChangeDir 从 './shared.js'；renameSyncRetry 从 '../fs-atomic.js'；stageRegistry 从 '../stages/index.js'
 *   - 动态 import './stages/plan.js' / './worktree.js' → '../'（src/ 下，退一层；真环依赖保留动态）
 *   - 删除 archiveChangeDirectory 内死代码 `const { renameSync } = await import('fs')`（renameSync 解构未用，实际走 renameSyncRetry）
 *
 * archiveChangeDirectory 的 6 处 process.exit 全 exit(1)：5 个顶层 guard 直接终止；L1325 在 catch 内主动 exit
 * （非被外层吞）；process.exit 不可被 try 捕获 → 搬迁行为完全等价。
 */
import { basename, dirname, join, resolve, relative, isAbsolute } from 'node:path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, rmSync, renameSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { renameSyncRetry, writeAtomicSync } from '../fs-atomic.js'
import { gitQuiet } from '../git-helper.js'
import { resolveChangeDir, resolveQuickSessionsDir, safeGit, auditQuickCompletion, triggerSync, isQuickMetadata, isQuicklogFileLineNoise, resolveRuntimeRoot, collectOtherQuickSessionDeclarations, mergeQuickBoundaryFiles, QUICK_SID_RE } from './shared.js'
import { detectConcurrentChanges, formatConcurrentWarning, resolveConcurrentAnchor } from './concurrent-detect.js'
import { stageRegistry } from '../stages/index.js'
import { SCAN_STATUS, POINTER_STATUS } from '../constants.js'
import { printQuickAuditReview, runQuickTestLintGate, printQuickTestLintGate, buildGateAuditNote } from './quick-audit.js'
import { validateQuickResult, allocateQuicklogEntry, appendQuicklogEntryWithId, findQuicklogEntry, completeQuicklogEntry, extractTitleFromResult, parseFileNotes, getQuickFileNotes, countQuicklogEntries, collectGuardReservedQuicklogIds } from '../quicklog.js'
import { getRule } from '../stage-contract-spec.js'
import { archiveDestDirName } from '../stage-contract.js'
import { collectNumstatByPath } from '../scope-audit.js'
import { recordFrictionEvent, consumeFrictionHint } from '../friction-tally.js'
import { mergeFrictionEntrySync } from '../friction-ledger.js'
import { resolveSessionIdentity } from '../progress.js'
// ql-20260915-001 修复④：chunkPaths（argv 分批）供归档窄化 add / minePaths 精确补暂存用。
// 无环：worktree-apply 静态闭包（worktree/task-review/quicklog 等）不引本文件；既有
// withMainRepoLock 走动态 import 是归档链防环的历史形态，chunkPaths 纯函数无此约束。
// checkDbScriptDeclarationGate（task-04 / FR-05）同排静态引入：门函数自身纯文件集 ×
// 文本声明对账（verify-probes 文法经 worktree-apply 顶层动态绑定），同样无环约束。
import { chunkPaths, checkDbScriptDeclarationGate } from '../worktree-apply.js'

/**
 * 清洗项目名：只保留 ASCII 字母/数字/横线/下划线/点，过滤中文和特殊字符。
 * - 必须含至少一个字母（拒绝纯数字 "0"/"7"/"07"，避免 scan-projects.json 脏数据）
 * - 长度必须 ≥ 2（拒绝单字符 "a"/"0"）
 * @param {string} name - 原始项目名候选
 * @returns {string | null} 合法项目名或 null（拒绝）
 */
export function sanitizeProjectName(name) {
  if (!name) return null
  const clean = String(name).replace(/[^a-zA-Z0-9_\-.]/g, '').trim()
  if (!clean) return null
  if (!/[a-zA-Z]/.test(clean)) return null    // 纯数字/符号拒绝（"0"/"7"/"07"）
  if (clean.length < 2) return null           // 单字符拒绝（"a"/"0"）
  return clean
}
/**
 * 校验从 step 2 解析出的项目列表。
 * 不通过则不落盘 projects/*.yaml、不展开 perProject 步骤。
 *
 * @param {Array<{id: string, path?: string}>} projects - 项目列表（含可选 path）
 * @param {string} sourceRoot - 源码根目录，用于 path 安全校验
 */
export function validateParsedProjects(projects, sourceRoot) {
  const errors = []
  if (!projects || projects.length === 0) {
    return { ok: false, errors: ['项目列表为空'] }
  }
  if (projects.length > 10) {
    return { ok: false, errors: [`项目数量 ${projects.length} 超过上限 10，疑似误解析`] }
  }
  const safeRoot = resolve(sourceRoot)
  const seen = new Set()
  for (const proj of projects) {
    const id = proj.id || proj
    if (seen.has(id)) {
      errors.push(`重复项目名: ${id}`)
    }
    seen.add(id)
    // slug 合法性：只允许 a-z 0-9 _ - .，长度 2-64
    if (!/^[a-zA-Z][\w\-.]{1,63}$/.test(id)) {
      errors.push(`项目名 "${id}" 不合法（需 slug 格式：字母开头，只含 a-zA-Z0-9_-., 长度 2-64）`)
    }
    // path 安全校验（如果提供了 path）
    if (proj.path) {
      if (proj.path.includes('..')) {
        errors.push(`项目 "${id}" 的 path 包含 .. ，拒绝越界`)
      } else {
        const absPath = resolve(safeRoot, proj.path)
        const rel = relative(safeRoot, absPath)
        if (rel.startsWith('..') || isAbsolute(rel)) {
          errors.push(`项目 "${id}" 的 path "${proj.path}" 解析后超出 source_root`)
        }
        if (!existsSync(absPath)) {
          errors.push(`项目 "${id}" 的 path "${proj.path}" 不存在`)
        }
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, errors: [] }
}
/**
 * 在 changes/archive/ 下查找变更 <changeName> 是否已被归档（archive 脱钩自愈用）。
 *
 * 归档目录名 = 原变更名（直接移入 archive/，不重命名）。
 * 精确匹配 + 要求目录含 plan.md（归档必备产物，防止同名巧合误判）。
 * issue: archive-stage-physical-tracking-desync。
 *
 * @param {string} archiveDir - changes/archive 绝对路径
 * @param {string} changeName - 变更名（currentChange）
 * @returns {string|null} 命中的归档目录绝对路径，无则 null
 */
export function findAlreadyArchivedDir(archiveDir, changeName) {
  if (!existsSync(archiveDir)) return null
  let entries
  try {
    entries = readdirSync(archiveDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return null
  }
  // 精确原名命中
  const exact = entries.find((e) => e === changeName && existsSync(join(archiveDir, e, 'plan.md')))
  if (exact) return join(archiveDir, exact)
  return null
}

/**
 * reviewedFiles[0] → 归属变更名。契约为 `changes/<change>/<doc>`（stage-review.js
 * getLatestStageReviewRunId）。取 `changes/` 后第一路径段精确相等——`includes('changes/'+name+'/')`
 * 会让短名 login 命中 2026-08-01-login（坑 marker-suffix-overmatch 同类）。
 * @returns {string|null}
 */
function ownerFromReviewedFiles(reviewedFiles) {
  const r0 = Array.isArray(reviewedFiles) ? String(reviewedFiles[0] || '') : ''
  const m = r0.replace(/\\/g, '/').match(/(?:^|\/)changes\/([^/]+)\//)
  return m ? m[1] : null
}

/**
 * 归档后按 change 精确回收 .runtime 取证（ql-20260908-005-7549）。
 *
 * 调用时点：handleArchiveConfirmStep 已把 reconcile/apply-pathspec 吃进 delta.md 之后
 * （fail-soft 生成失败也不阻断——变更已终态，runtime 取证无读者）。自愈归档 / quick 轻量
 * 归档 / change-delete 无 delta 同样可删。
 *
 * 归属 fail-closed（禁 mtime 猜、禁后缀匹配）：
 *   apply-pathspec-<change>.txt 精确文件名
 *   prompt-inject-<change>.json 精确文件名（2026-09-18-preflight-slimming：注入分叉账本回收登记）
 *   execute-runs/<runId>/ 仅当 `change` 戳全等（无戳旧 run 留下，不按覆盖度启发式删）
 *   stage-reviews/<dir>/ 仅当 review.json reviewedFiles 首段 === changeName
 *   verify-runs/<ts>/ 仅当目录内 JSON 的 change 字段集合 size=1 且等于本变更
 * 本轮不扩 endpoint-baselines / contract-artifacts / last-delta.json。
 *
 * fail-open：卫生动作失败不抛，返回 { ok:true }。
 *
 * 台账兜底滚动（2026-09-15-tax-governance FR-02）：删 friction tally 前读残余
 * events[type].count（X-10：tally 结构 events:{type:{count,lastAt}}，无 counts 字段）merge
 * 进 <runtimeRoot>/friction-ledger.json 同 change 条目并落 archivedAt——verify 收尾 consume
 * 已滚主账，此处只兜残余（tally 缺失/全零/坏 JSON 跳过，归档照常）。走 mergeFrictionEntrySync
 * （同步契约：既有 {ok,removed} 消费方与测试直调，拿不了 async 锁；无锁读改写并发丢失按
 * design R-02 P3 容忍）。台账写失败 fail-soft 只反映在 ledgerAppend:false，不抛不阻断归档。
 *
 * @param {string} runtimeRoot
 * @param {string} changeName
 * @returns {{ ok: true, removed: number, ledgerAppend: boolean }}
 */
export function pruneArchivedChangeRuntime(runtimeRoot, changeName) {
  if (!runtimeRoot || !changeName || !existsSync(runtimeRoot)) return { ok: true, removed: 0, ledgerAppend: false }
  let removed = 0
  let ledgerAppend = false
  const gone = (p, recursive = false) => {
    try {
      if (recursive) rmSync(p, { recursive: true, force: true })
      else unlinkSync(p)
      removed++
    } catch { /* 单份失败不连坐，下次归档/删变更再收 */ }
  }

  try {
    const pathspec = join(runtimeRoot, `apply-pathspec-${changeName}.txt`)
    if (existsSync(pathspec)) gone(pathspec)
  } catch {}

  // prompt-inject 账本（2026-09-18-preflight-slimming Phase 2 / D-002，Grill 评审 fail②）：
  // .runtime/prompt-inject-<change>.json 是 change 级派生文件（阶段感知注入分叉的账本），
  // 变更归档/删除后无读者——不登记回收则按变更数累积孤儿。精确文件名，对齐上方
  // apply-pathspec / 下方 friction-tally 同款形态（禁 glob/后缀匹配）。
  try {
    const ledger = join(runtimeRoot, `prompt-inject-${changeName}.json`)
    if (existsSync(ledger)) gone(ledger)
  } catch {}

  // friction tally（friction-signal-hint FR-05）：摩擦计数随变更终态一并回收——真实变更的
  // friction-tally-<change>.json 落 runtimeRoot，变更归档/删除后无读者，残留即孤儿文件。
  // 删前残余先滚台账（tax-governance FR-02 兜底滚动点，见函数头注释）。
  try {
    const fp = join(runtimeRoot, `friction-tally-${changeName}.json`)
    if (existsSync(fp)) {
      const merged = mergeFrictionEntrySync(runtimeRoot, {
        change: changeName,
        counts: residualFrictionCounts(fp),
        archivedAt: new Date().toISOString(),
      })
      ledgerAppend = !!(merged && merged.ok && !merged.skipped)
      gone(fp)
    }
  } catch {}

  try {
    const execDir = join(runtimeRoot, 'execute-runs')
    if (existsSync(execDir)) {
      for (const runId of readdirSync(execDir)) {
        const stampFile = join(execDir, runId, 'change')
        if (!existsSync(stampFile)) continue
        let stamp = ''
        try { stamp = readFileSync(stampFile, 'utf8').trim() } catch { continue }
        if (stamp !== changeName) continue
        gone(join(execDir, runId), true)
      }
    }
  } catch {}

  try {
    const srDir = join(runtimeRoot, 'stage-reviews')
    if (existsSync(srDir)) {
      for (const entry of readdirSync(srDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const rjPath = join(srDir, entry.name, 'review.json')
        if (!existsSync(rjPath)) continue
        let owner = null
        try {
          const rj = JSON.parse(readFileSync(rjPath, 'utf8'))
          owner = ownerFromReviewedFiles(rj.reviewedFiles)
        } catch { continue }
        if (owner !== changeName) continue
        gone(join(srDir, entry.name), true)
      }
    }
  } catch {}

  try {
    const vrDir = join(runtimeRoot, 'verify-runs')
    if (existsSync(vrDir)) {
      for (const entry of readdirSync(vrDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const dir = join(vrDir, entry.name)
        let files = []
        try { files = readdirSync(dir).filter(f => f.endsWith('.json')) } catch { continue }
        const owners = new Set()
        for (const f of files) {
          try {
            const data = JSON.parse(readFileSync(join(dir, f), 'utf8'))
            if (data && typeof data.change === 'string' && data.change) owners.add(data.change)
          } catch { /* 单文件坏 JSON 跳过，不据此猜归属 */ }
        }
        if (owners.size === 1 && owners.has(changeName)) gone(dir, true)
      }
    }
  } catch {}

  return { ok: true, removed, ledgerAppend }
}

/**
 * 残余摩擦计数读取（tax-governance FR-02 prune 兜底用）：tally 的 events 结构是
 * { type: { count, lastAt } }（X-10——无 counts 字段），转成 mergeFrictionEntry 认的
 * counts 平面映射（只收三枚举类型且 count>0，与 consumeFrictionHint 的 counts 形态一致）。
 * 文件缺失/坏 JSON/脏型 → {}（跳过入账，归档照常）。
 */
function residualFrictionCounts(tallyPath) {
  try {
    const raw = JSON.parse(readFileSync(tallyPath, 'utf8'))
    const events = raw && typeof raw === 'object' && raw.events && typeof raw.events === 'object' && !Array.isArray(raw.events) ? raw.events : {}
    const counts = {}
    for (const type of ['gate_rollback', 'verify_run_failed', 'review_rejected']) {
      const n = Number(events[type] && events[type].count)
      if (Number.isFinite(n) && n > 0) counts[type] = n
    }
    return counts
  } catch {
    return {}
  }
}

/**
 * 归档时清理可能残留的 worktree（execute 自动清理未走到 / 有未 apply 变更被遗弃）。
 * 安全策略：有未 apply 变更时保留 worktree 并警告，避免误删用户未应用的代码。
 * 同时清理该变更的 execute / stage-review runId marker（只写不删的累积物，
 * 见 stage.js execute 启动固定 executeRunId / stage-review.js stageReviewMarkerPath）
 * 以及归档后无读者的 runtime 取证（pruneArchivedChangeRuntime）。
 * 从 archiveChangeDirectory 抽出，供正常归档 + 自愈归档复用。
 */
export async function archiveWorktreeCleanup(cwd, archiveChangeName, specBase, platformOpts = {}) {
  // ── 清理 runId marker：execute（current-execute-run-id-<change>）与 stage-review
  //    （current-stage-review-run-id-<stage>-<change>）。marker 只服务 execute→verify→archive
  //    期间，归档后无读者；不删则 .runtime 随变更数无限累积。runtimeRoot 解析同写入侧
  //    （resolveRuntimeRoot 锚主仓），避免平台模式清理错位置。
  try {
    const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
    if (existsSync(runtimeRoot)) {
      // stage-review marker 精确匹配（坑 marker-suffix-overmatch）：marker 名是
      // current-stage-review-run-id-<stage>-<change>，按 endsWith('-'+change) 后缀匹配会在归档
      // 手工短名变更（如 login）时误删自动日期前缀变更（2026-08-01-login 天然以 '-login' 结尾）
      // 的 marker。stage 集合与写入侧 stageReviewMarkerPath 的调用方一致。
      const REVIEW_STAGES = ['brainstorm', 'plan', 'execute', 'verify', 'archive']
      const markers = readdirSync(runtimeRoot).filter((f) =>
        f === `current-execute-run-id-${archiveChangeName}` ||
        REVIEW_STAGES.some(st => f === `current-stage-review-run-id-${st}-${archiveChangeName}`),
      )
      for (const m of markers) {
        try { unlinkSync(join(runtimeRoot, m)) } catch {}
      }
      if (markers.length > 0) {
        console.log(`🧹 归档清理 ${markers.length} 个 runId marker（execute/stage-review）`)
      }
      // 取证回收必须在下方 worktree 块的 `if (!meta) return` 之前：无 meta 早退是常态
      // （apply 已 cleanup），漏接就会让 execute-runs/verify-runs 继续按变更数累积。
      const pruned = pruneArchivedChangeRuntime(runtimeRoot, archiveChangeName)
      if (pruned.removed > 0) {
        console.log(`🧹 归档回收 ${pruned.removed} 项 runtime 取证（execute-runs/stage-reviews/verify-runs/apply-pathspec/prompt-inject，按 change 精确匹配）`)
      }
    }
  } catch (e) {
    console.warn(`⚠️  归档 runId marker 清理失败（不阻断归档）: ${e.message}`)
  }
  try {
    const { WorktreeManager } = await import('../worktree.js')
    const wm = new WorktreeManager({ cwd })
    const meta = wm.getMeta(archiveChangeName)
    if (!meta) {
      // 无 meta 兜底（坑 archive-cleanup-orphan-physical-dir，2026-08-21 实证）：meta 已被先行
      // 流程注销（apply 自动 cleanup / doctor 幽灵清理）时此前直接 return——若物理目录因中途
      // 失败残留下就是孤儿（无 meta=无锚定基准，残留即孤儿）。force 清理（幂等：什么都不存在
      // 时 cleanup 返回 skipped 零副作用）。
      const orphan = wm.cleanup(archiveChangeName, { force: true })
      if (orphan.result === 'cleaned' || orphan.result === 'force-cleaned' || orphan.result === 'partial') {
        console.log(`🧹 归档清理孤儿 worktree 残留（meta 已注销）: ${archiveChangeName}${orphan.residual?.length ? '（残留: ' + orphan.residual.join('; ') + '）' : ''}`)
      }
      return
    }
    const check = meta.mode !== 'in-place-fallback' ? wm.hasUnappliedChanges(archiveChangeName) : { hasChanges: false }
    if (check.hasChanges) {
      console.warn(`⚠️  归档时 worktree 仍有 ${check.changedFiles.length} 个未 apply 变更，保留 worktree`)
      console.warn(`   确认不需要后手动清理: sillyspec worktree cleanup ${archiveChangeName} --force`)
      return
    }
    const cleanResult = wm.cleanup(archiveChangeName)
    if (cleanResult.residual?.length > 0) {
      console.warn(`⚠️  归档 worktree 清理残留: ${cleanResult.residual.join('; ')}`)
      console.warn(`   手动处理: sillyspec worktree cleanup ${archiveChangeName} --force`)
    }
  } catch (e) {
    console.warn(`⚠️  归档 worktree 清理失败（不阻断归档）: ${e.message}`)
  }
}

/**
 * 提取 module-impact.md「更新结果」表中的未清文档同步死信行（债单 D-5）。
 *
 * 只在「## 更新结果」段内扫描表格行（| 分隔），状态判定取**末列** trim 后精确匹配
 * pending / 待办 / 未同步 / not-done（大小写不敏感）。不做全文 grep——
 * sync_manual_get_pending / pending_review / pending-leases 等代码标识符出现在
 * 矩阵摘要列是合法内容，不能误报（实证：archive 全量扫描唯一死信形态是末列 pending）。
 *
 * 纯函数：无 fs/git 调用，export 供 test 直接 import。
 * @param {string} content module-impact.md 全文（CRLF/LF 均容）
 * @returns {string[]} 死信行原文（去首尾空白），空数组 = 无死信
 */
export function extractPendingDocSyncRows(content) {
  if (!content || typeof content !== 'string') return []
  const normalized = content.replace(/\r\n/g, '\n')
  const sectionStart = normalized.search(/^#{2,3}\s*更新结果\s*$/m)
  if (sectionStart === -1) return []
  // 跳过标题行本身（matchFirstLine 吃掉标题），再找下一个章节边界
  const titleMatch = normalized.slice(sectionStart).match(/^#{2,3}\s*更新结果\s*$/m)
  const bodyStart = sectionStart + titleMatch[0].length
  const afterTitle = normalized.slice(bodyStart)
  const nextSection = afterTitle.search(/^#{1,3}\s/m)
  const section = nextSection === -1 ? afterTitle : afterTitle.slice(0, nextSection)
  const PENDING_STATUSES = new Set(['pending', '待办', '未同步', 'not-done', 'todo'])
  const rows = []
  for (const line of section.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.split('|').map(c => c.trim())
    // split 首尾产生空串（行首行尾的 |），真实单元格在中间；末列 = 最后一个非空单元格之后
    // 表格行结构 | 模块文档 | 操作 | 状态 | → cells = ['', '模块文档', '操作', '状态', '']
    const lastCell = cells[cells.length - 1]
    if (lastCell === '' && cells.length >= 2) cells.pop()
    const statusCell = cells[cells.length - 1]
    if (statusCell && PENDING_STATUSES.has(statusCell.toLowerCase())) rows.push(trimmed)
  }
  return rows
}

/**
 * 提取 module-impact.md「更新结果」表中的已完成（done）行声明的目标文档路径（债单 D-4 窄口径）。
 *
 * done 行首列是目标标识：`modules/<id>.md`（模块卡片）、`_module-map.yaml`（映射索引）、
 * `.sillyspec/docs/<project>/modules/<f>.md`（含仓库前缀的全路径）等。本函数提取首列里
 * 能解析出的文档路径 token，供调用方校验文件存在性——声明 done 但目标文件不存在 = 假申报。
 *
 * 提取规则（保守，宁可漏报不误报）：
 *   - 首列以反引号包裹或裸写的 `.md`/`.yaml` 结尾路径 token（含路径分隔符 /）
 *   - `modules/<id>.md` 相对写法解析为 `<specBase>/docs/<project>/modules/<id>.md`——但 project
 *     归属需读 _module-map，此处只返回原样 token，路径解析留给调用方（有 specBase 上下文）
 *   - `_module-map.yaml` 裸名跳过（存在性由 map 本身保证，且各项目都有）
 *
 * 纯函数：无 fs/git 调用，export 供 test 直接 import。
 * @param {string} content module-impact.md 全文
 * @returns {string[]} done 行声明的文档路径 token（去重）
 */
export function extractDoneDocTargets(content) {
  if (!content || typeof content !== 'string') return []
  const normalized = content.replace(/\r\n/g, '\n')
  const sectionStart = normalized.search(/^#{2,3}\s*更新结果\s*$/m)
  if (sectionStart === -1) return []
  const titleMatch = normalized.slice(sectionStart).match(/^#{2,3}\s*更新结果\s*$/m)
  const bodyStart = sectionStart + titleMatch[0].length
  const afterTitle = normalized.slice(bodyStart)
  const nextSection = afterTitle.search(/^#{1,3}\s/m)
  const section = nextSection === -1 ? afterTitle : afterTitle.slice(0, nextSection)
  const targets = new Set()
  for (const line of section.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.split('|').map(c => c.trim())
    if (cells.length >= 2) cells.pop() // 行尾空 cell
    const statusCell = cells[cells.length - 1]
    if (!statusCell || statusCell.toLowerCase() !== 'done') continue
    // 首个非空 cell（跳过 split 产生的行首空串）
    const firstCell = cells.slice(1).find(c => c !== '') || ''
    // 从首列提取 .md/.yaml 结尾且含 / 的路径 token（modules/x.md 或 a/b/c.yaml）；
    // 反引号包裹优先，裸写次之。_module-map.yaml 无 / 跳过（见 docstring）。
    const m = firstCell.match(/`([^`]*\.(?:md|yaml))`/) || firstCell.match(/(^|\s|（)([\w./-]+\/[\w./-]*\.(?:md|yaml))/)
    if (m) {
      const token = (m[2] !== undefined && m[2] !== null && m[1] !== '`') ? m[2] : m[1]
      if (token && !token.endsWith('_module-map.yaml')) targets.add(token)
    }
  }
  return [...targets]
}

/**
 * 归档 docs 侧窄化 add 的目标解析：module-impact「更新结果」done 行 token → 仓相对 POSIX 路径
 * （ql-20260915-001 修复④，坑 archive-git-add-sweeps-parallel-docs：2026-09-14 实证归档自动
 * git add 用目录级 pathspec .sillyspec/docs/ 把并行会话同目录未提交文件夹带进共享暂存区）。
 *
 * 解析规则（与 extractDoneDocTargets 的 token 形态对齐，保守宁漏勿误扫）：
 *   - `.sillyspec/docs/...` 全路径 token → 相对 cwd 解析，存在才收
 *   - `modules/<id>.md` 相对写法（module-impact 骨架的规范形态）→ 扫 <specBase>/docs/ 下各
 *     project 目录的 modules/<id>.md——project 归属不猜单值，多项目同名命中各自收（仍是
 *     确定性文件级，不回退目录级）
 *   - 其他形态 / 仓库外（relative 出 ..） / 不存在 → 跳过
 *
 * 纯函数（只读 fs），export 供 test 直接 import。
 * @param {string} cwd 仓库根
 * @param {string} specBase .sillyspec 绝对路径
 * @param {string[]} tokens extractDoneDocTargets 产物
 * @returns {string[]} 仓相对 POSIX 路径（去重）
 */
export function resolveArchiveDocAddPaths(cwd, specBase, tokens) {
  const out = new Set()
  const pushIfExists = (abs) => {
    try {
      if (abs && existsSync(abs)) {
        const rel = relative(cwd, abs).replace(/\\/g, '/')
        if (rel && !rel.startsWith('..')) out.add(rel)
      }
    } catch { /* 单 token 解析失败跳过（不收即不误 add） */ }
  }
  for (const t of (Array.isArray(tokens) ? tokens : [])) {
    if (!t || typeof t !== 'string') continue
    const norm = String(t).replace(/\\/g, '/')
    if (norm.startsWith('.sillyspec/docs/')) {
      pushIfExists(resolve(cwd, norm))
      continue
    }
    const m = /^modules\/(.+\.md)$/.exec(norm)
    if (m) {
      const docsDir = join(specBase, 'docs')
      if (!existsSync(docsDir)) continue
      let projEntries
      try { projEntries = readdirSync(docsDir, { withFileTypes: true }) } catch { continue }
      for (const proj of projEntries) {
        if (!proj.isDirectory()) continue
        pushIfExists(join(docsDir, proj.name, 'modules', m[1]))
      }
    }
  }
  return [...out]
}

/**
 * 归档收尾的窄化 git add（ql-20260915-001 修复④，坑 archive-git-add-sweeps-parallel-docs）。
 *
 * changes 侧：本变更归档目录精确 pathspec（closeSingleQuickLinkedChange 的 :1641 先例）——
 * 目录级 .sillyspec/changes/archive/ 会把并行会话停在 archive/ 下的未提交归档包一并扫进
 * 共享暂存区。docs 侧：从（已移动到归档目录的）module-impact.md「## 更新结果」done 行提取
 * 目标文档逐文件 add；提取失败（无表 / 读取异常）回退目录级 add，但前置 warning 列出将被
 * 扫入的未提交 docs 文件（git status --porcelain -- .sillyspec/docs/ 差集——回退态无本变更
 * 声明面，差集即全部未提交项），提示 agent 提交时改用精确 pathspec。表在且解析成功（含
 * 空集 = 无声明文档，docs 面零 add）不回退。幂等：git add 重复执行无有害副作用。
 *
 * 独立函数（非内联）+ export 供 test 直接构造双变更目录场景驱动（不依赖 process.exit 的
 * archiveChangeDirectory 主链）。
 *
 * @param {{ cwd: string, specBase: string, destDir: string, destName: string }} opts
 * @returns {{ docsAdded: string[]|null, fallbackDocs: boolean }} docsAdded=null 表示走了目录级回退
 */
export function archiveNarrowedGitAdd({ cwd, specBase, destDir, destName }) {
  // changes 侧：本变更归档目录精确收窄（quick 轻量归档 closeSingleQuickLinkedChange 同款）
  safeGit(cwd, ['add', '--', `.sillyspec/changes/archive/${destName}/`])

  // docs 侧：module-impact「更新结果」done 行 → 精确文件集。
  // 三态（对齐修复④要求）：
  //   - module-impact.md 无「## 更新结果」段 / 文件缺失 / 读取异常 → docPaths=null → 回退目录级
  //   - 表在但无 done 行（全 skipped / 只有表头）→ 精确空集 → docs 面零 add（不回退——
  //     本变更声明了不同步，目录级扫入他者文件才是错）
  //   - 表在有 done 行 → 逐文件精确 add
  let docPaths = null
  try {
    const impactPath = join(destDir, 'module-impact.md')
    if (existsSync(impactPath)) {
      const content = readFileSync(impactPath, 'utf8')
      // 段存在性判定与 extractDoneDocTargets/extractPendingDocSyncRows 同一标题正则口径
      if (/^#{2,3}\s*更新结果\s*$/m.test(content.replace(/\r\n/g, '\n'))) {
        docPaths = resolveArchiveDocAddPaths(cwd, specBase, extractDoneDocTargets(content))
      }
    }
  } catch (e) {
    docPaths = null
    console.warn(`⚠️ 归档 docs 精确 add 目标提取失败（${e && e.message ? e.message : e}）——回退目录级 .sillyspec/docs/ add`)
  }
  if (Array.isArray(docPaths)) {
    for (const batch of chunkPaths(docPaths)) {
      safeGit(cwd, ['add', '--', ...batch])
    }
    return { docsAdded: docPaths, fallbackDocs: false }
  }

  // 回退：目录级（旧行为），前置 warning 列将被扫入的未提交 docs 文件（unstaged/untracked 面）
  try {
    const raw = gitQuiet(cwd, ['status', '--porcelain', '--', '.sillyspec/docs/'], { trim: false })
    const swept = (raw ? String(raw).split('\n') : []).filter(Boolean)
      .filter(l => l.length > 3 && (l.slice(0, 2).includes('?') || l[1] !== ' '))
      .map(l => l.slice(3).trim().replace(/^"|"$/g, ''))
    if (swept.length > 0) {
      console.warn(`⚠️ 归档 git add 回退目录级 .sillyspec/docs/（module-impact.md 无「## 更新结果」表或读取失败）——以下 ${swept.length} 个未提交 docs 文件将被扫入共享暂存区（可能含并行会话在途文件），提交时请用精确 pathspec：`)
      for (const p of swept.slice(0, 10)) console.warn(`   - ${p}`)
      if (swept.length > 10) console.warn(`   … 共 ${swept.length} 个（git status --porcelain -- .sillyspec/docs/ 查看全量）`)
    }
  } catch { /* 差集探测失败不阻断 add 本身（advisory） */ }
  safeGit(cwd, ['add', '--', '.sillyspec/docs/'])
  return { docsAdded: null, fallbackDocs: true }
}

export async function archiveChangeDirectory(pm, cwd, progress, specBase, platformOpts = {}, gateOpts = {}) {
  const archiveChangeName = progress.currentChange
  if (!archiveChangeName) {
    console.error('❌ 归档失败：未找到当前变更名（currentChange）')
    process.exit(1)
  }
  const changesDir = join(specBase, 'changes')
  const archiveDir = join(changesDir, 'archive')
  const srcDir = join(changesDir, archiveChangeName)
  const date = new Date().toISOString().slice(0, 10)
  const destName = archiveDestDirName(date, archiveChangeName)
  const destDir = join(archiveDir, destName)

  if (!existsSync(srcDir)) {
    // 幂等自愈（issue archive-stage-physical-tracking-desync）：源目录已不存在，但变更可能已被
    // 手动 / 部分流程移到 changes/archive/ 并 commit，而 --done --confirm 从未正式跑完 → 进度 DB
    // 卡 archive 阶段、active 列表仍列此 change。检测到已归档则回填进度（unregisterChange）并
    // 成功返回，让收尾流程把 archive 阶段标完成，而非 exit(1) 死路（source 已移走无法重跑 move）。
    const alreadyArchivedDir = findAlreadyArchivedDir(archiveDir, archiveChangeName)
    if (alreadyArchivedDir) {
      console.log(`ℹ️  源目录不存在但变更已在 archive/（${basename(alreadyArchivedDir)}），判定已归档，自愈进度 DB`)
      // 终态一致化（坑 manual-archive-desync-status-only）：手动搬目录绕过标准归档后，本自愈路径
      // 不能只翻 status——同时收尾 archive 阶段（steps/stages/current_stage），否则推送平台的终态
      // 是「已归档 + 归档 0/5 + 停在 execute」的矛盾体，详情页渲染成「进度丢失」
      pm.unregisterChange(cwd, archiveChangeName, { archiveStepNames: typeof pm.archiveStepNamesForArchive === 'function' ? pm.archiveStepNamesForArchive() : null })
      await archiveWorktreeCleanup(cwd, archiveChangeName, specBase, platformOpts)
      console.log(`📦 已自愈归档：${archiveChangeName} → archive/${basename(alreadyArchivedDir)}/`)
      return alreadyArchivedDir
    }
    console.error(`❌ 归档失败：源目录不存在 ${srcDir}`)
    console.error(`   且 changes/archive/ 下未找到该变更的归档目录。若已手动归档请核对目录名；否则先补全变更产物。`)
    process.exit(1)
  }
  // ── 所有权护栏（2026-09-14-change-ownership-guards task-03 / FR-01 / D-001@v1 接线点）──
  // 归档=接管类操作（注销 change + 移目录 + 清 worktree），他人活跃 change 硬拒。判定在
  // withMainRepoLock 锁内（handleArchiveConfirmStep 调用点），判定-执行无 TOCTOU；放行分支
  // no-owner/takeover-stale 重写 owner=本会话（setChangeOwner 同事务刷新 last_active，心跳从
  // 接管时刻起算）。会话标识三级解析：--session > env SILLYSPEC_SESSION_ID > anon@host（降级
  // 时 resolveSessionIdentity 自带教学 warning）。消费 task-02 契约（assertChangeOwnership
  // 纯读不写库），不重复实现判定语义。
  {
    const { session } = resolveSessionIdentity({ flagSession: gateOpts.sessionFlag || null, cwd })
    const check = pm.assertChangeOwnership(cwd, archiveChangeName, { selfSession: session, nowMs: Date.now() })
    if (!check.allowed) {
      console.error(`🚫 归档失败：变更 ${archiveChangeName} 正被其他会话持有（owner: ${check.owner}，最后活跃: ${check.lastActive || '未知'}），活跃窗口 ${Math.round(check.heartbeatMs / 60000)} 分钟内拒绝归档`)
      console.error(`   等对方会话收尾后重试（窗口过后自动接管）；确认对方已放弃且本会话应接管：先经 sillyspec worktree apply/cleanup ${archiveChangeName} --takeover 显式接管（重写 owner 留痕）再归档`)
      process.exit(1)
    }
    if (check.action !== 'self') pm.setChangeOwner(cwd, archiveChangeName, session)
  }
  // ── 归档收口（2026-09-14-change-ownership-guards task-03 / FR-02 / D-002@v1）──
  // worktree 有未 apply 交付面 → 归档阻断：归档会注销 change + 清理 worktree（目录/分支/meta），
  // 交付物失去进主仓通道，形成「归档完成但交付物未进主仓」悬空态（troubleshooting §65 事件①
  // 的代劳窗口放大器）。只拦不代跑（design 非目标：脏重叠场景人确认更稳）。--skip-apply 显式
  // 跳过并留痕（控制台输出 + skip-apply.record.json 随归档包留存，可审计）。无 worktree
  // （meta 缺失/in-place/native）或零交付面 → 零行为变化。探测用 applyWorktree checkOnly
  // （只读零写盘，Gate 全收集不落盘、不短路）。
  try {
    const { WorktreeManager } = await import('../worktree.js')
    const wmGate = new WorktreeManager({ cwd })
    const gateMeta = wmGate.getMeta(archiveChangeName)
    if (gateMeta
      && gateMeta.mode !== 'in-place-fallback'
      && gateMeta.mode !== 'native-worktree'
      && gateMeta.worktreePath
      && existsSync(gateMeta.worktreePath)) {
      const { applyWorktree } = await import('../worktree-apply.js')
      const checkApply = applyWorktree(archiveChangeName, { cwd, checkOnly: true })
      const face = (checkApply && Array.isArray(checkApply.changedFiles)) ? checkApply.changedFiles : []
      if (face.length > 0) {
        const facePreview = `${face.slice(0, 5).join('、')}${face.length > 5 ? ' 等' : ''}`
        if (!gateOpts.skipApply) {
          console.error(`❌ 归档失败：worktree 存在未 apply 的交付面（${face.length} 个文件：${facePreview}）`)
          console.error(`   归档会清理 worktree（目录+分支+meta），交付物将失去进主仓的通道，形成「归档完成但交付物未进主仓」悬空态。`)
          console.error(`   先 apply 再归档: sillyspec worktree apply ${archiveChangeName}`)
          console.error(`   确认无需 apply（交付面已由其他会话落地/纯探索性变更等）: sillyspec run archive --done --confirm --skip-apply（显式跳过并留痕归档记录）`)
          process.exit(1)
        }
        console.warn(`⚠️  已按 --skip-apply 跳过未 apply 交付面检查（${face.length} 个文件未确认落地主仓：${facePreview}）——留痕归档记录`)
        writeFileSync(join(srcDir, 'skip-apply.record.json'), JSON.stringify({
          schemaVersion: 1,
          change: archiveChangeName,
          flag: '--skip-apply',
          skippedAt: new Date().toISOString(),
          deliverableCount: face.length,
          deliverableFiles: face,
          note: '归档时显式跳过未 apply 交付面检查（--skip-apply）：交付物未确认进主仓，本记录随归档包留存供审计',
        }, null, 2) + '\n')
      }
    }
  } catch (e) {
    // 探测自身异常 fail-open 留痕：归档主流程既有失败面（rename/git/清理）不叠加；正常路径
    // 的阻断语义不受影响（无异常时 face 判定照常生效）。
    console.warn(`⚠️  归档前未 apply 交付面探测失败（不阻断归档）: ${e && e.message ? e.message : e}`)
  }
  // 移动前硬校验：变更包必须含 plan.md，否则不该归档。
  // 在移动前阻断（而非移动后），目录尚未动，用户可直接修复后重试。
  if (!existsSync(join(srcDir, 'plan.md'))) {
    console.error(`❌ 归档失败：变更目录缺少 plan.md（${srcDir}）`)
    console.error(`   plan.md 是归档的必需产物。请先补全 plan 阶段产出再归档。`)
    process.exit(1)
  }
  // 移动前硬校验（债单 D-5）：module-impact.md「更新结果」表存在 pending 死信 → 阻断。
  // 修复场景：perf-remediation 类变更把文档同步显式推给 archive（「（execute 完成后由 archive
  // 阶段同步）| 待办 | pending」），archive 又没做 → 带 pending 归档且 verify 全 PASS，死信无人回填。
  // 只查「## 更新结果」段内表格行的状态列（末列）精确匹配 pending/待办/未同步——不做全文 grep，
  // 防 sync_manual_get_pending / pending_review 等代码标识符误报。
  const impactPath = join(srcDir, 'module-impact.md')
  if (existsSync(impactPath)) {
    const pendingRows = extractPendingDocSyncRows(readFileSync(impactPath, 'utf8'))
    if (pendingRows.length > 0) {
      console.error(`❌ 归档失败：module-impact.md「更新结果」表存在 ${pendingRows.length} 个未清 pending/待办项（死信）`)
      for (const row of pendingRows) console.error(`   - ${row}`)
      console.error(`   这些文档同步项从未落地。请先完成同步并回填状态为 done/skipped（说明原因），再归档。`)
      process.exit(1)
    }
  }
  if (existsSync(destDir)) {
    console.error(`❌ 归档失败：目标目录已存在 ${destDir}`)
    process.exit(1)
  }
  mkdirSync(archiveDir, { recursive: true })
  try {
    renameSyncRetry(srcDir, destDir)
  } catch (e) {
    console.error(`❌ 归档失败：移动变更目录时出错（${e.message}）`)
    console.error(`   常见原因：变更目录内文件被 IDE / 杀毒 / 索引占用，已重试 5 次仍失败。请关闭相关程序后重试。`)
    process.exit(1)
  }

  if (!existsSync(destDir) || existsSync(srcDir)) {
    console.error('❌ 归档校验失败：移动操作异常')
    process.exit(1)
  }

  // 正常路径同样走终态一致化（坑 manual-archive-desync-status-only）：标准 --done --confirm 流程
  // 中 completeStep 随后也会逐项完成，此处先收尾是幂等写同值——保证任何走出本函数的归档终态一致
  pm.unregisterChange(cwd, archiveChangeName, { archiveStepNames: typeof pm.archiveStepNamesForArchive === 'function' ? pm.archiveStepNamesForArchive() : null })

  // CLI 下沉 git add（坑4，FR-04）：确定性暂存归档目录 + 模块文档，不靠 step5 prompt 驱动。
  // step5 prompt 的 git add 保留作幂等兜底；POSIX 路径跨平台（git 接受正斜杠）。
  // safeGit 内部已 try-catch（返回 {value,error} 不抛），外层 try 兜底防御；失败不阻断归档
  // （目录已移动 + change 已注销），由 step5 prompt git add + agent git status 核对兜底。
  // ql-20260915-001 修复④（坑 archive-git-add-sweeps-parallel-docs，2026-09-14 实证：目录级
  // pathspec 把并行会话同目录未提交文件夹带进共享暂存区）：改为窄化——changes 侧只 add 本变更
  // 归档目录 archive/<destName>/，docs 侧按 module-impact「更新结果」done 行精确文件集（提取
  // 失败回退目录级 + 前置 warning，见 archiveNarrowedGitAdd）。
  try {
    archiveNarrowedGitAdd({ cwd, specBase, destDir, destName })
  } catch {}

  // ── 他者半归档残留探测（坑 archive-other-residual-rename，2026-08-21 实证）──
  // 并行变更的手动归档把 R 残留（源目录 rename 目标行）留在暂存区；本变更归档提交时
  // git status 显示它们，agent 会误判「还没提交完 / 要做第二次提交」。区分：
  //   本变更：未暂存的源侧移动（` D changes/<me>/...` + 未跟踪 archive/<me>/...）→ 补暂存
  //           让归档成单次原子提交；
  //   他者：已暂存的 rename（`R  changes/<他人>/... -> changes/archive/<他人>/...`）→ 只 warn
  //         提示归属（不 stage 不动——别人的归别人的）。
  try {
    const raw = gitQuiet(cwd, ['status', '--porcelain'], { trim: false, timeout: 30000 })
    if (raw && raw.trim()) {
      const changesPrefix = '.sillyspec/changes/'
      const minePaths = []
      const othersResidual = []
      for (const line of raw.split('\n')) {
        if (!line || line.length < 4) continue
        const x = line[0], y = line[1]
        const body = line.slice(3).trim()
        const arrow = body.indexOf(' -> ')
        const src = arrow !== -1 ? body.slice(0, arrow).replace(/^"|"$/g, '') : null
        const dst = (arrow !== -1 ? body.slice(arrow + 4) : body).replace(/^"|"$/g, '')
        if (x === 'R' && y === ' ' && arrow !== -1 && dst.startsWith(changesPrefix + 'archive/')) {
          // 已暂存 rename → 半归档残留；按目标目录名归属他者变更
          const m = /^\.sillyspec\/changes\/archive\/([^/]+)\//.exec(dst)
          const owner = m ? m[1] : '?'
          if (owner !== archiveChangeName) othersResidual.push(owner)
        } else if (x === ' ' && (y === 'D' || y === 'A' || y === 'M')) {
          // 未暂存的源侧移动：源目录 D / 新位置 A——指向本变更的补暂存
          const p = dst || src
          if (p && (p.startsWith(changesPrefix + archiveChangeName + '/')
                    || p.startsWith(changesPrefix + 'archive/' + archiveChangeName + '/'))) {
            minePaths.push(p)
          }
        }
      }
      if (minePaths.length > 0) {
        // ql-20260915-001 修复④：补暂存源侧移动改精确 pathspec（minePaths 已按本变更目录名
        // 过滤，chunkPaths 分批防 Windows argv 上限）——原 add -A -- .sillyspec/changes/ 目录级
        // 会顺带扫入并行会话在 changes/ 下的未提交文件（坑 archive-git-add-sweeps-parallel-docs
        // 同坑不同点；git add -- <已删路径> 即暂存删除，语义等价 -A 限本变更面）
        for (const batch of chunkPaths(minePaths)) {
          safeGit(cwd, ['add', '--', ...batch])
        }
        console.log(`🧾 已补暂存本变更归档的源侧移动（${minePaths.length} 项，归档成单次原子提交）`)
      }
      if (othersResidual.length > 0) {
        const owners = [...new Set(othersResidual)].filter(Boolean)
        console.warn(`⚠️  检测到「他者半归档」残留（暂存区存在其他变更的 rename 记录）：${owners.join('、')}`)
        console.warn(`   这些是别的变更此前手动归档留下的暂存项，不属于本次归档——git status 里看到它们是正常的，`)
        console.warn(`   本变更归档已完成，无需为其做第二次提交；如需清理走它们自己的收尾（或 git restore --staged 后核对）。`)
      }
    }
  } catch { /* 探测失败不阻断归档（advisory） */ }

  // 归档时清理可能残留的 worktree（自愈路径也复用，见上方 srcDir 缺失分支）。
  await archiveWorktreeCleanup(cwd, archiveChangeName, specBase, platformOpts)

  console.log(`📦 已归档：${archiveChangeName} → archive/${destName}/`)
  return destDir
}
/**
 * archive 阶段「确认归档」步骤的收尾处理器（从 completeStep 抽出，行为保持）。
 *
 * 两件事：
 *   1. --confirm 门控：缺 --confirm → 回退 step 状态、提示、返回 early-return 对象（completeStep 透传）
 *   2. --confirm 通过 → archiveChangeDirectory 移动变更目录 + 推荐文档（design.md / module-impact.md）校验
 *      （contracts.archive.validators 为空，两个 validator 生效窗口互斥；plan.md 已在移动前硬校验阻断）
 *
 * @returns {{stageCompleted:false,currentIdx,nextPendingIdx:number}|null}
 */
export async function handleArchiveConfirmStep({ stageName, steps, currentIdx, confirm, outputText, pm, cwd, progress, changeName, specBase, platformOpts = {}, isSkipApply = false, sessionFlag = null }) {
  if (stageName !== 'archive' || steps[currentIdx]?.name !== '确认归档') return null
  if (!confirm) {
    steps[currentIdx].status = 'pending'
    steps[currentIdx].completedAt = null
    if (outputText) steps[currentIdx].output = null
    pm._write(cwd, progress, changeName)
    console.log('⚠️  请添加 --confirm 确认归档，例如：sillyspec run archive --done --confirm --output "确认归档"')
    return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
  }
  // ── db/*.sql 声明门·归档前置（2026-09-17-pass-cap-semantics task-04 / FR-05 / D-007/D-012
  // 兜底第二门）── --confirm 已过、目录移动前：apply-manifest.json 的 files 过 worktree-apply
  // 同款门（对账 verify-result.md 声明，含 db-script handover 互斥）。缺失/互斥 → 复用 !
  // confirm 早退形态（status 回 pending + pm._write + early return），变更目录不动、输出修复
  // 指引；apply-manifest.json 缺失 → 门空转不阻断（无 apply 面，主门在 verify 侧事实③）；
  // manifest 读取/解析异常 → fail-open warn 放行（门异常不锁死归档）。
  const dbGateManifestPath = join(specBase, 'changes', changeName, 'apply-manifest.json')
  if (existsSync(dbGateManifestPath)) {
    try {
      const dbGateManifest = JSON.parse(readFileSync(dbGateManifestPath, 'utf8'))
      const dbGateFiles = (dbGateManifest && Array.isArray(dbGateManifest.files) ? dbGateManifest.files : [])
        .map((e) => (e && typeof e === 'object' ? e.path : e)).filter(Boolean)
      const dbGate = checkDbScriptDeclarationGate({ projectRoot: cwd, specBase, changeName, files: dbGateFiles })
      if (!dbGate.ok) {
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        pm._write(cwd, progress, changeName)
        console.error(`⛔ db 脚本执行声明对账未过（归档阻断，变更目录未移动）：\n${dbGate.error}`)
        return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
      }
      if (dbGate.warning) console.warn(`⚠️  ${dbGate.warning}`)
    } catch (e) {
      console.warn(`⚠️  db 声明门异常降级放行（apply-manifest.json 读取/解析失败，fail-open）: ${(e && e.message) || e}`)
    }
  }
  // Ceremony 双跑收口·第二出口（task-04 / FR-03 / D-003）：实现在文件尾 runArchiveCeremonyDualRunExit——mismatch 阻断级警告+记账+种子，不回滚归档（D-006）
  await runArchiveCeremonyDualRunExit({ cwd, specBase, changeName, sessionFlag, platformOpts, progress })
  // ── 归档前 delta.md 自动生成（P3d task-02，fail-soft 零阻断）──
  // 目录移走前在 changes/<name>/ 落一份 Before/Delta/After 三段式快照（四源采集容缺，
  // buildDeltaReport 见 ../archive-delta.js），随归档包留存。失败只 console.error 留痕、
  // 提示 sillyspec delta --change 手动补，绝不抛出——归档主流程既有失败面（rename/git/清理）
  // 一个不叠加。specRoot 同 complete.js :87 口径（specBase 已含 platform specRoot）；
  // runtimeRoot 同本文件 archiveWorktreeCleanup 既有用法 resolveRuntimeRoot(platformOpts, specBase)。
  const deltaChangeName = progress.currentChange || changeName
  if (deltaChangeName) {
    try {
      const { buildDeltaReport, writeLastDeltaSidecar } = await import('../archive-delta.js')
      const deltaChangeDir = join(specBase, 'changes', deltaChangeName)
      const deltaResult = buildDeltaReport({
        changeDir: deltaChangeDir,
        specRoot: specBase,
        // project 缺参可 null（loadModuleMap null 降级路径已支持，报告内逐段降级注记）
        project: progress?.project || null,
        runtimeRoot: resolveRuntimeRoot(platformOpts, specBase),
        // IR 回灌 sidecar（2026-09-07-ir-hardening D-006）：与手动补跑同源数据
        withSummary: true,
      })
      writeFileSync(join(deltaChangeDir, 'delta.md'), deltaResult.markdown)
      writeLastDeltaSidecar(resolveRuntimeRoot(platformOpts, specBase), deltaResult)
      console.log(`📊 归档前已生成 delta.md: ${join(deltaChangeDir, 'delta.md')}`)
    } catch (e) {
      console.error(`⚠️  归档前 delta.md 自动生成失败（不阻断归档）: ${e.message}`)
      console.error(`   可手动补: sillyspec delta --change ${deltaChangeName} --spec-dir ${specBase}`)
    }
  }
  // 主仓互斥锁（坑 main-repo-no-mutex 二批）：archiveChangeDirectory 改主仓共享状态（目录
  // rename + 共享 index 的 git add + marker 删除 + worktree 清理），与并行会话的 apply/cleanup
  // 互踩。exit 钩子兜底：其内部 guard 失败 exit(1) 时锁也会被清（见 withMainRepoLock）。
  const { withMainRepoLock } = await import('../worktree-apply.js')
  // gateOpts（task-03）：--skip-apply（归档收口跳过留痕）+ --session（所有权会话标识）随链
  // 透传——所有权硬校验与未 apply 交付面门都在 archiveChangeDirectory 内（即锁内）执行。
  const archivedDir = await withMainRepoLock(cwd, changeName, 'archive-finalize', () => archiveChangeDirectory(pm, cwd, progress, specBase, platformOpts, { skipApply: isSkipApply, sessionFlag }))
  if (archivedDir && existsSync(archivedDir)) {
    // 内存快照同步（坑 archive-progress-show-stale，2026-08-21 实证）：archiveChangeDirectory 内
    // unregisterChange 已在 DB 写 current_stage='archive'（终态一致化），但本进程 progress 是命令
    // 开始时读的旧快照——不同步的话，completeStep 后续 _write 会用旧值（如停在 verify）把
    // DB 覆盖回去，progress show 就一直显示归档前的阶段
    progress.currentStage = 'archive'
    const recommendedDocs = ['design.md', 'module-impact.md']
    const missingRecommended = recommendedDocs.filter(d => !existsSync(join(archivedDir, d)))
    if (missingRecommended.length > 0) {
      console.warn(`\n⚠️ 归档校验警告：归档目录缺少推荐文档`)
      for (const d of missingRecommended) console.warn(`   - ${d}（${archivedDir}）`)
    } else {
      console.log(`\n✅ 归档校验通过：核心文档齐全`)
    }
    // D-4 窄口径：更新结果表 done 行声明的目标文档存在性对账（warning 不阻断——
    // 目标路径写法多样（modules/x.md 相对/全路径）+ 语义对账推 sillyhub，此处只抓
    // 能确定性解析且确实不存在的假申报）。
    const impactContent = existsSync(join(archivedDir, 'module-impact.md'))
      ? readFileSync(join(archivedDir, 'module-impact.md'), 'utf8') : ''
    const doneTargets = extractDoneDocTargets(impactContent)
    if (doneTargets.length > 0) {
      const missing = doneTargets.filter(t => {
        // 相对 specBase 解析：modules/<x> → docs/<project>/modules/<x> 由 _module-map 归属，
        // CLI 不猜 project——只对全路径（.sillyspec/docs/ 开头或含 3+ 段路径）做存在性判定
        if (!t.includes('/')) return false
        const abs = isAbsolute(t) ? t : resolve(cwd, t)
        return !existsSync(abs)
      })
      if (missing.length > 0) {
        console.warn(`\n⚠️ 归档校验警告：module-impact「更新结果」声明 done 的文档路径不存在（假申报嫌疑）`)
        for (const t of missing) console.warn(`   - ${t}`)
        console.warn(`   相对写法（modules/<id>.md）不在此校验范围；全路径声明但文件不存在请核实。`)
      }
    }
  }
  // ── 知识闭环收尾渲染（2026-09-14-knowledge-loop-close task-03，X-006 定锚）──
  // ① knowledge-baseline 棘轮（FR-03/R-05）：与 quick --done 收尾同款三态（超线软警告不阻断 /
  //    降线自动收紧 / 基线缺失跳过），archive 时刻是归类清欠的另一自然卡点。
  renderKnowledgeBaselineRatchet(specBase)
  // ② 自动归类抽审清单：近 7 天 hits.jsonl 里 type:classify 的记录数——归类是机器提案经
  //    classify 落地，人闸收敛到归档时抽审（R-01：错误归类 revert 的发现面）。读实现为
  //    task-01 交付的 src/knowledge-hits.js（readKnowledgeHits 坏行容忍）；runtimeRoot 解析
  //    与本文件既有 delta sidecar 同源（resolveRuntimeRoot，平台模式对齐）。无记录/读失败零输出。
  try {
    const { readKnowledgeHits } = await import('../knowledge-hits.js')
    const classifyCount = readKnowledgeHits(resolveRuntimeRoot(platformOpts, specBase), { sinceDays: 7 })
      .filter((h) => h && h.type === 'classify').length
    if (classifyCount > 0) {
      console.log(`\n🧪 本周期自动归类 ${classifyCount} 条（近 7 天 knowledge classify 审计），建议抽审：sillyspec knowledge stats`)
    }
  } catch { /* 抽审清单读取失败不影响归档（advisory fail-open） */ }
  return null
}
/**
 * plan 阶段「generate_plan」步骤完成后，动态插入任务蓝图（coordinator）+ postcheck 步骤
 * （从 completeStep 抽出，行为保持）。使用稳定 id 匹配，不依赖中文标题。
 *
 * plan.md 已含任务时，buildPlanSteps 返回 [fixedPrefix(classify/generate_plan/review_plan),
 * coordinator, postcheck]；本函数把 generate_plan 之后的 coordinator+postcheck 插到当前步后。
 */
export async function handlePlanGeneratePlanStep({ stageName, steps, currentIdx, defStepsForCurrent, cwd, progress }) {
  if (stageName !== 'plan') return
  const currentStepDef = defStepsForCurrent?.[currentIdx]
  const currentStepEntry = steps[currentIdx]
  const stepId = currentStepDef?.id || currentStepEntry?.id || currentStepEntry?._stepId
  if (stepId !== 'generate_plan') return
  const changeDir = resolveChangeDir(cwd, progress)
  if (!changeDir) return
  const planFile = join(changeDir, 'plan.md')
  if (!existsSync(planFile)) return
  const planContent = readFileSync(planFile, 'utf8')
  const { buildPlanSteps, fixedPrefix, fixedSuffix } = await import('../stages/plan.js')
  const fullSteps = buildPlanSteps(changeDir, planContent)
  const prefixLen = fixedPrefix.length
  const suffixLen = fixedSuffix.length
  // 新结构：[...fixedPrefix, coordinatorStep?, postcheckStep?]；fixedSuffix 为空，coordinator+postcheck 都在 prefix 之后
  const coordinatorSteps = fullSteps.slice(prefixLen, suffixLen > 0 ? -suffixLen : undefined)
  if (coordinatorSteps.length === 0) return
  for (let i = 0; i < coordinatorSteps.length; i++) {
    const stepDef = coordinatorSteps[i]
    const stepEntry = {
      id: stepDef.id,
      name: stepDef.name,
      status: 'pending',
      prompt: stepDef.prompt || '',
      outputHint: stepDef.outputHint,
      optional: stepDef.optional
    }
    // 传递 noAI / _cliAction 属性
    if (stepDef.noAI) stepEntry.noAI = true
    if (stepDef._cliAction) stepEntry._cliAction = stepDef._cliAction
    steps.splice(currentIdx + 1 + i, 0, stepEntry)
  }
  console.log(`  📝 已动态插入 ${coordinatorSteps.length} 个步骤（${coordinatorSteps.map(s => s.name).join(', ')}）`)
}
/**
 * scan 阶段 step 2「构建扫描项目列表」完成后，按项目展开 perProject 步骤（从 completeStep 抽出，行为保持）。
 *
 * 只接受结构化输出（scan_projects YAML block 或 BEGIN_PROJECT_LIST 标记块），校验通过后
 * 自动注册 projects/<id>.yaml + 写 scan-projects.json + 把 perProject 步骤按项目展开。
 * 不展开 completeStep 提前 return（失败只记 validationError，由 completeStep 继续推进下一步）。
 */
export async function handleScanProjectListStep({ stageName, steps, currentIdx, outputText, stageData, specBase, cwd, platformOpts }) {
  if (stageName !== 'scan' || steps[currentIdx]?.name !== '构建扫描项目列表') return
  // 解析项目列表：只接受结构化输出（YAML block 或 BEGIN_PROJECT_LIST 标记）
  // 不再从自由文本猜测项目名——自由文本列表的误解析会导致垃圾项目落盘
  let parsedProjects = [] // Array<{id, path?}>
  let parsedFromStructuredOutput = false
  if (outputText) {
    // 格式 A: YAML block — 匹配 scan_projects: 下所有 - id: xxx 条目（含多行属性）
    const yamlBlock = outputText.match(/scan_projects:\s*\n([\s\S]+?)(?=$|\n[^\s])/)
    if (yamlBlock) {
      const entries = [...yamlBlock[1].matchAll(/-\s+id:\s*(\S+)(?:[\s\S]*?)(?=\n\s+-\s+id:|$)/g)]
      for (const m of entries) {
        const id = sanitizeProjectName(m[1])
        if (!id) continue
        // 提取可选 path 字段
        const pathMatch = m[0].match(/path:\s*(\S+)/)
        const entry = pathMatch ? { id, path: pathMatch[1].trim() } : { id }
        parsedProjects.push(entry)
      }
      parsedFromStructuredOutput = parsedProjects.length > 0
    }
    // 格式 B: BEGIN_PROJECT_LIST ... END_PROJECT_LIST 标记块
    if (!parsedFromStructuredOutput) {
      const blockMatch = outputText.match(/BEGIN_PROJECT_LIST\s*\n([\s\S]*?)\n*END_PROJECT_LIST/)
      if (blockMatch) {
        const raw = [...blockMatch[1].matchAll(/^-\s+(\S+)/gm)].map(m => m[1])
        parsedProjects = raw.map(s => sanitizeProjectName(s)).filter(Boolean).map(id => ({ id }))
        parsedFromStructuredOutput = parsedProjects.length > 0
      }
    }
  }

  const projectNames = parsedProjects.map(p => p.id)

  if (parsedFromStructuredOutput) {
    stageData.scanMeta = stageData.scanMeta || {}
    stageData.scanMeta.projectListParsed = true
  } else {
    // 结构化输出未解析到 → 回退读取已有 projects/*.yaml
    // 读取时也校验：path 不存在的 yaml 视为垃圾，直接跳过
    console.warn('⚠️  step 2 未输出结构化项目列表，回退扫描已注册项目')
    stageData.scanMeta = stageData.scanMeta || {}
    stageData.scanMeta.projectListParsed = false
    const projectsDir = join(specBase, 'projects')
    if (existsSync(projectsDir)) {
      const yamlFiles = readdirSync(projectsDir).filter(f => f.endsWith('.yaml'))
      const fallbackProjects = []
      const fallbackSkipped = []
      for (const yf of yamlFiles) {
        const pName = yf.replace(/\.yaml$/, '')
        const yamlContent = readFileSync(join(projectsDir, yf), 'utf8')
        const pathMatch = yamlContent.match(/^path:\s*(.+)/m)
        const pPath = pathMatch ? pathMatch[1].trim() : pName
        // 校验 path 是否存在且在 source_root 内。
        // 用 relative 判越界（与 validateParsedProjects 同口径）：startsWith 前缀比较
        // 无分隔符，C:\repo 会放行兄弟目录 C:\repository2（体检 BUG-13）
        const absPath = resolve(cwd, pPath)
        const rel = relative(resolve(cwd), absPath)
        if (rel.startsWith('..') || isAbsolute(rel)) {
          fallbackSkipped.push(`${pName} (path 越界: ${pPath})`)
          continue
        }
        if (!existsSync(absPath)) {
          fallbackSkipped.push(`${pName} (path 不存在: ${pPath})`)
          continue
        }
        fallbackProjects.push({ id: pName, path: pPath })
      }
      if (fallbackSkipped.length > 0) {
        console.warn(`⚠️  跳过 ${fallbackSkipped.length} 个垃圾/过期项目配置：${fallbackSkipped.join(', ')}`)
        console.warn('   建议清理 projects/ 下的无效 yaml 文件')
      }
      parsedProjects = fallbackProjects
      projectNames.length = 0
      projectNames.push(...fallbackProjects.map(p => p.id))
    }
    if (parsedProjects.length === 0) {
      // 无结构化输出 + 无合法已有项目 → step 2 失败
      console.error('❌ step 2 未输出结构化项目列表，且 projects/ 下无合法项目配置')
      console.error('   请在 --output 中输出 scan_projects YAML block 或 BEGIN_PROJECT_LIST 标记块')
      steps[currentIdx].validationError = '未输出结构化项目列表且无合法 fallback'
      // 不展开 perProject 步骤，直接跳到下一步
    }
  }

  // 校验解析出的项目列表（原子守卫：不通过就不落盘）
  const validation = validateParsedProjects(parsedProjects, cwd)
  if (!validation.ok) {
    console.error(`❌ 项目列表校验失败: ${validation.errors.join('; ')}`)
    console.error('   step 2 完成，但不展开 perProject 步骤。请检查 --output 中的项目列表。')
    steps[currentIdx].validationError = validation.errors.join('; ')
  }

  // 自动注册 + 保存 runtime + 展开 perProject 步骤（仅在校验通过时）
  const projectsDir = join(specBase, 'projects')
  if (validation.ok) {
    for (const proj of parsedProjects) {
      const pName = proj.id
      const projYaml = join(projectsDir, `${pName}.yaml`)
      if (!existsSync(projYaml)) {
        mkdirSync(projectsDir, { recursive: true })
        const candidates = [
          join(cwd, pName),
          join(cwd, 'backend', pName),
          join(cwd, 'packages', pName),
          join(cwd, 'apps', pName),
          join(cwd, 'services', pName),
        ]
        const detected = candidates.find(c => existsSync(c))
        const regPath = detected || join(cwd, pName)
        writeFileSync(projYaml, `name: ${pName}\npath: ${regPath}\nstatus: active\n`)
        console.log(`  📝 自动注册子项目: ${pName} → ${regPath}`)
      }
    }

    // 保存 runtime 状态
    const scanStatePath = join(specBase, '.runtime', 'scan-projects.json')
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
    let scanState = { projects: projectNames, expanded: false }
    if (existsSync(scanStatePath)) {
      try { scanState = JSON.parse(readFileSync(scanStatePath, 'utf8')) } catch {}
    }

    // 收集当前步骤之后所有 perProject 步骤
    const stageDef = stageRegistry[stageName]
    const allSteps = stageDef?.steps || []
    const perProjectSteps = allSteps.filter(s => s.perProject)

    // 防重复展开
    const alreadyExpanded = scanState.expanded || steps.some(s => s.name?.match(/\[.+\]\s*$/))
    if (!alreadyExpanded && perProjectSteps.length > 0) {
    // 找到当前步骤（step 2）在动态 steps 中的位置
    const insertBase = currentIdx + 1
    let insertPos = insertBase
    for (const pName of projectNames) {
      // 读取项目配置获取 projectRoot
      const projYaml = join(specBase, 'projects', `${pName}.yaml`)
      let projectRoot = '.'
      if (existsSync(projYaml)) {
        const yamlContent = readFileSync(projYaml, 'utf8')
        const pathMatch = yamlContent.match(/^path:\s*(.+)/m)
        if (pathMatch) projectRoot = pathMatch[1].trim()
      }
      const docOutputDir = platformOpts.specRoot ? `${specBase}/docs/${pName}` : `.sillyspec/docs/${pName}`
      const contextPrefix = `\n---\n## 当前项目\n- **项目名**: ${pName}\n- **项目路径**: ${projectRoot}\n- **文档输出**: ${docOutputDir}\n\n⚠️ 本步骤只处理上面这个项目，不要处理其他项目。\n---\n\n`

      for (const ppStep of perProjectSteps) {
        steps.splice(insertPos, 0, {
          name: `${ppStep.name} [${pName}]`,
          project: pName,
          status: 'pending',
          prompt: contextPrefix + ppStep.prompt,
          outputHint: ppStep.outputHint,
          optional: ppStep.optional
        })
        insertPos++
      }
    }
    // 移除原始的 perProject 步骤（未展开的版本）
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].perProject && !steps[i].name?.includes('[')) {
        steps.splice(i, 1)
      }
    }
    console.log(`  📝 已按项目展开 ${perProjectSteps.length} 个步骤 × ${projectNames.length} 个项目 = ${perProjectSteps.length * projectNames.length} 个项目步骤`)
    console.log(`  📁 扫描项目：${projectNames.join(', ')}`)
    // 标记已展开，防止 resume 重复插入
    scanState.expanded = true
    writeFileSync(scanStatePath, JSON.stringify(scanState))
  } // end !alreadyExpanded
  } // end validation.ok
}
/**
 * Workflow post_check（W6 Step6 从 completeStep 内联块抽出）：
 *   - scan「深度扫描」完成 → 跑 scan-docs workflow postcheck，失败阻断推进（early-return）
 *   - archive「extract-module-impact」完成 → 跑 archive-impact workflow postcheck（impact-analyzer 结果）
 * 返回 early-return 对象（{stageCompleted:false,...}）由 completeStep 透传；null = 放行。
 *
 * ctx 字段：stageName/steps/currentIdx/cwd/specBase/progress/platformOpts/changeName（completeStep 局部）。
 * 辅助函数直接 import：basename/join/existsSync/readdirSync（顶部静态）；loadWorkflow/runPostCheck/
 * formatCheckReport/saveWorkflowRun 动态 import ../workflow.js（真环依赖保留动态）。
 *
 *搬迁清理：删除死代码 `typeof change !== 'undefined'`（completeStep 作用域无 change 变量，恒 null）。
 */
export async function handleWorkflowPostCheck({ stageName, steps, currentIdx, cwd, specBase, progress, platformOpts, changeName }) {
  // Workflow post_check：scan 深度扫描完成后自动检查产物
  if (stageName === 'scan' && steps[currentIdx]?.name?.includes('深度扫描')) {
    try {
      const { loadWorkflow, runPostCheck, formatCheckReport, saveWorkflowRun } = await import('../workflow.js')
      const wf = loadWorkflow(cwd, 'scan-docs')
      if (wf) {
        // 确定当前项目（优先级链）：
        //   progress.project (dbProjectName，平台模式真实项目名，与 outputStep 占位符渲染对齐)
        //   > change?.project (变更对象的项目字段，平台模式 change 创建时传入)
        //   > steps[idx].project (perProject 展开标记，兼容旧模式)
        //   > steps[idx].name 正则提取 [xxx] 后缀
        //   > null（回退检查所有项目）
        // task-05 修复：日志显示项目名变 frontend 是 perProject 误展开 bug，
        // 用 progress.project（与 outputStep 占位符渲染路径一致）修正 myaaa/frontend 分裂。
        const currentProjectName = progress.project
          || steps[currentIdx].project
          || (steps[currentIdx].name.match(/\[([^\]]+)\]\s*$/) || [])[1]
          || null

        // 确定要检查的项目列表
        let projectsToCheck = []
        if (currentProjectName) {
          // 按项目展开模式：只检查当前项目
          projectsToCheck = [currentProjectName]
        } else {
          // 兼容旧模式（未展开）：检查所有项目
          const projectsDir = join(specBase, 'projects')
          const projectFiles = existsSync(projectsDir)
            ? readdirSync(projectsDir).filter(f => f.endsWith('.yaml'))
            : []
          projectsToCheck = projectFiles.map(f => f.replace(/\.yaml$/, ''))
        }

        let anyFailed = false
        for (const pName of projectsToCheck) {
          const result = runPostCheck(wf, cwd, pName, {}, specBase)
          const report = formatCheckReport(result)
          console.log(report)
          if (result.status === 'fail') {
            anyFailed = true
            // retry_prompts 由 _checkWorkflow 自动生成
            for (const rp of (result.retry_prompts || [])) {
              console.log(`\n🔄 重试提示（项目 ${pName}）：\n`)
              console.log(rp.prompt)
            }
          }
          const saved = saveWorkflowRun(result, {
            cwd,
            source: 'run.js',
            stage: 'scan',
            step: steps[currentIdx]?.name,
            ...(platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot } : {}),
            ...(platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId } : {})
          })
          if (saved) console.log(`📁 结果已归档：${saved}`)
        }
        if (anyFailed) {
          console.log(`\n⚠️ 存在检查失败项，请按上面的重试提示修复后再继续。`)
          // task-07: 阻断推进（与 task-06 平台模式 scan-postcheck 失败分支 return 结构对齐）
          // scan 深度扫描产物校验未通过时，不允许 clean success / 进入下一 step，
          // 让上层走"完成但不推进"分支，--done 被拒。
          return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
        }
      }
    } catch (e) {
      console.warn(`⚠️ workflow 检查跳过：${e.message}`)
    }
  }

  // Workflow post_check：archive extract-module-impact 完成后检查产物
  if (stageName === 'archive' && steps[currentIdx]?.name?.includes('extract-module-impact')) {
    try {
      const { loadWorkflow, runPostCheck, formatCheckReport, saveWorkflowRun } = await import('../workflow.js')
      const wf = loadWorkflow(cwd, 'archive-impact')
      if (wf && changeName) {
        const raw = JSON.stringify(wf)
        const resolved = JSON.parse(raw.replace(/<change-name>/g, changeName))
        const result = runPostCheck(resolved, cwd, progress.project || basename(cwd), {}, specBase)
        // 只报告 impact-analyzer 的结果（doc-syncer 是后续步骤）
        const impactResult = (result.roles || []).find(r => r.id === 'impact-analyzer')
        if (impactResult) {
          const icon = impactResult.status === 'pass' ? '✅' : '❌'
          console.log(`${icon} module-impact.md 检查${impactResult.status === 'pass' ? '通过' : '失败'}`)
          for (const f of (result.failures || []).filter(f => f.role_id === 'impact-analyzer')) {
            // f 是 {level,role_id,output,check,message} 对象——直接 ${f} 打印裸 [object Object]（ql-20260819-006）；
            // message 才是人类可读 detail（如「缺少章节: …」），缺字段时 stringify 兜底防再退化成不可诊断输出
            console.log(`   └─ ${f.message ?? JSON.stringify(f)}`)
          }
        }
        const saved = saveWorkflowRun(
          // 坑 archive-batch-31-tool-notes ①（2026-08-30 实证）：archive-impact workflow 的
          // 整体 status 含下一步 doc-syncer 角色（sync-module-docs 步才执行，本步恒 fail）——
          // 按整体 status 命名会把本步已通过的产物误标 -fail.json（与「✅ module-impact.md
          // 检查通过」矛盾，存量 75 个实证）。落盘记录按本步最终校验（impact-analyzer）定
          // status/文件名；doc-syncer 的角色明细保留在 roles/failures 字段（另记字段不丢信息），
          // status_scope 标注口径。impact-analyzer 角色缺失时维持整体 status（行为不变）。
          impactResult && impactResult.status !== result.status
            ? { ...result, status: impactResult.status, status_scope: 'step:extract-module-impact' }
            : result,
          {
          cwd,
          source: 'run.js',
          stage: 'archive',
          step: steps[currentIdx]?.name,
          ...(platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot } : {}),
          ...(platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId } : {})
        })
        if (saved) console.log(`📁 结果已归档：${saved}`)
      }
    } catch (e) {
      console.warn(`⚠️ workflow 检查跳过：${e.message}`)
    }
  }
  return null
}
/**
 * guard.linkedChanges/linkedChangesAuto 并入 --done 显式声明（R4-S-Q 缺陷 B 纯函数核）：
 * 持久化值 ∪ 显式值（去重保序，persisted 在前）；显式 ['none'] 语义为清空 manual 面（auto 不动）；
 * 无变化返回原对象引用（调用点以此判「是否需要回写」）。guard 非对象原样返回。
 */
export function mergeGuardLinkedChanges(guard, explicitLinked, explicitAuto) {
  if (!guard || typeof guard !== 'object') return guard
  const cur = Array.isArray(guard.linkedChanges) ? guard.linkedChanges : []
  const curAuto = Array.isArray(guard.linkedChangesAuto) ? guard.linkedChangesAuto : []
  const ex = (Array.isArray(explicitLinked) ? explicitLinked : []).filter(Boolean)
  const exAuto = (Array.isArray(explicitAuto) ? explicitAuto : []).filter(Boolean)
  const next = ex.length === 1 && ex[0] === 'none' ? [] : [...new Set([...cur, ...ex])]
  const nextAuto = exAuto.length === 0 ? curAuto : [...new Set([...curAuto, ...exAuto])]
  const unchanged = next.length === cur.length && next.every((v, i) => v === cur[i])
    && nextAuto.length === curAuto.length && nextAuto.every((v, i) => v === curAuto[i])
  if (unchanged) return guard
  return { ...guard, linkedChanges: next, linkedChangesAuto: nextAuto }
}

/**
 * quick 阶段完成收尾（W6 Step6b 从 completeStep 内联块抽出）：
 * 强校验 QUICKLOG 条目 + 审计（auditQuickCompletion）+ 结果摘要结构校验 + 翻状态/勾 tasks.md
 * （CLI 接管 QUICKLOG 分配/写入/收尾）。blocked → process.exit(1)（无 early-return，调用点纯 await）。
 *
 * ctx：stageName/steps/currentIdx/cwd/progress/changeName/specBase/outputText/confirm/
 * isForceBaseline/isAllowNew/platformOpts。辅助函数直接 import（safeGit/auditQuickCompletion ← shared，
 * printQuickAuditReview ← quick-audit，4 个 quicklog fns ← quicklog，unlinkSync/rmSync ← fs 静态）。
 */
export async function handleQuickStageCompletion({ stageName, steps, currentIdx, cwd, progress, changeName, specBase, outputText, confirm, isForceBaseline, isAllowNew, isAllowDelete, isNoDocs, sessionFlag = null, platformOpts, pm, quickFiles = [], linkedChanges = [], linkedChangesAuto = [] }) {
  // quick 收尾：强校验 QUICKLOG 条目 + 翻状态 + 勾 tasks.md（CLI 接管）
  if (stageName === 'quick') {
    // §4.6 从 session guard.json 读 guard（不依赖 progress.quickGuard）。
    // D-003@v1：progress._write 不持久化顶层 quickGuard，跨进程 --done 时读出的 progress 无 quickGuard，
    // 若仍用 if (progress.quickGuard) 驱动收尾会整体跳过，导致 .runtime/quick-sessions/<sessionId>/ 残留僵尸。
    // 改为从文件读 guard：优先 session 目录 guard.json，回退旧单文件 quick-guard.json（task-03 前兼容）。
    // sessionId == changeName == quick-<uuid8>（completeStep 作用域内 changeName 已解构自 options）。
    // session 目录经 resolveQuickSessionsDir 单一解析（multi-agent-review Q4）：与 stage.js 写入路径对齐，
    // 平台模式 runtimeRoot 与 specBase/.runtime 不同时不再读不到 guard。
    const sessionGuardFile = join(resolveQuickSessionsDir(platformOpts, specBase), changeName, 'guard.json')
    const legacyGuardFile = join(specBase, '.runtime', 'quick-guard.json')
    let guard = null
    try {
      guard = existsSync(sessionGuardFile)
        ? JSON.parse(readFileSync(sessionGuardFile, 'utf8'))
        : (existsSync(legacyGuardFile) ? JSON.parse(readFileSync(legacyGuardFile, 'utf8')) : null)
    } catch {}

    // R4-S-Q 缺陷 B：--done 时显式 --linked-changes 并入 guard（启动持久化值 ∪ 本次显式值，
    // 'none' 清空）再回写 sessionGuardFile。下游关账 closeQuickLinkedChanges / 资产尾蒸馏 /
    // quicklog「关联变更」渲染全读 guard——不并入则 --done 时声明的关联被静默丢弃（R4-S-Q
    // 实测：--linked-changes 两次都在命令行上，资产尾零触发 + 条目渲染「（无）」）。
    // guard 缺失（brownfield）不造对象——保持 D-3 无 guard 降级语义不变。
    try {
      if (guard && (linkedChanges.length > 0 || linkedChangesAuto.length > 0)) {
        const merged = mergeGuardLinkedChanges(guard, linkedChanges, linkedChangesAuto)
        if (merged !== guard) {
          guard = merged
          writeAtomicSync(sessionGuardFile, JSON.stringify(guard, null, 2))
          console.log(`🔗 --done 显式关联变更已并入 guard: ${(guard.linkedChanges ?? []).join(', ') || '（none 清空）'}`)
        }
      }
    } catch { /* 并入/回写失败不拦完成，guard 内存原值兜底 */ }

    // 强校验 / 收尾：本会话必须有一条真实 QUICKLOG 条目（治「报 SAFE 但漏写」bug）。
    // guard 缺失（brownfield：新代码前启动的会话）不阻断——兜底补写一条记录，保住「完成必有记录」不变量。
    const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
    let qlId = guard?.quicklogId || null
    const linkedChanges = Array.isArray(guard?.linkedChanges) ? guard.linkedChanges : []
    // 机器自动关联溯源（坑 quick-single-change-auto-link）：单候选信号门控命中自动关联的
    // 子集——归档闸消费（这类变更不触发轻量归档），显式 --linked-changes 关联不在此列
    const linkedChangesAuto = Array.isArray(guard?.linkedChangesAuto) ? guard.linkedChangesAuto : []
    // 审计结果（仅 guard 存在时填充）。提到 if(guard) 外声明，供下方回填 QUICKLOG 文件行复用
    // review.changedFiles；brownfield 无 guard 时保持 null → 文件行不回填（降级，不报错）。
    let review = null

    // --done --files 一步并入边界（坑 quick-audit-warning-no-guidance 2026-09-03，与
    // ql-20260713-002-7628 同族——flag 在 --done 被解析却不生效）：此前追加声明只能先
    // 「恢复会话带 --files」再 --done 两步走。并入语义与 stage.js 恢复路径同款（追加不
    // 替换、去重保序 + allowedFilesHash 记录），持久化回 guard.json——本轮审计与他者会话
    // 声明豁免同源消费。guard 缺失（brownfield）不补建，跳过并入。
    if (guard && Array.isArray(quickFiles) && quickFiles.filter(Boolean).length > 0) {
      const { added } = mergeQuickBoundaryFiles(guard, quickFiles, cwd)
      if (added.length > 0) {
        try { writeAtomicSync(sessionGuardFile, JSON.stringify(guard, null, 2)) } catch { /* 持久化失败降级：本轮审计仍用内存合并值 */ }
        console.log(`🛡️ quick 边界已追加: ${added.length} 个文件（累计 ${guard.allowedFiles.length} 个）: ${added.join(', ')}`)
      }
    }
    // --file-notes 路径同源并入边界（2026-09-08 用户反馈①：step3 只带 --file-notes 未带
    // --files 时，QUICKLOG 文件行写进了这些文件、审计却按「超出 allowedFiles + 未声明」
    // 拦——两条声明通道口径打架）。--file-notes 是显式的改动文件声明（路径部分参与落盘
    // 文件行），与 --files 同语义追加；括注只是展示不参与。读取用 getQuickFileNotes（与
    // 下方 completeQuicklogEntry 消费同一 per-process 值，读不清）。
    {
      const fileNotePaths = parseFileNotes(getQuickFileNotes()).map(n => n.path).filter(Boolean)
      if (guard && fileNotePaths.length > 0) {
        const { added } = mergeQuickBoundaryFiles(guard, fileNotePaths, cwd)
        if (added.length > 0) {
          try { writeAtomicSync(sessionGuardFile, JSON.stringify(guard, null, 2)) } catch { /* 同上：内存合并值兜底 */ }
          console.log(`🛡️ quick 边界已追加（--file-notes 声明与文件行同源）: ${added.length} 个文件（累计 ${guard.allowedFiles.length} 个）: ${added.join(', ')}`)
        }
      }
    }
    // 审计：仅在有 guard 时跑（brownfield 无 guard 跳过，兼容 D-003 brownfield 行为）。
    // task-02：mergedGuard 提升到 if 外声明，供下方并发预检钩子复用与 auditQuickCompletion
    // 同源的 guard 字段（baselineFiles/linkedChanges）。brownfield 无 guard 时保持 null，
    // 钩子 ownFiles/linkedChanges 走 ?? [] 兜底（D-003 不抛 TypeError）。
    let mergedGuard = null
    if (guard) {
      // --done 的 --force-baseline/--allow-new 并入 guard（与 step1 持久化值取或）。
      // 修复 ql-20260713-002-7628：旧代码解析了这两个 flag 但只传 {isConfirm} 给审计，
      // 致 --done --force-baseline 静默无效、用户被误导「重跑 --confirm」也无法解锁。
      mergedGuard = {
        ...guard,
        forceBaseline: guard.forceBaseline || isForceBaseline,
        allowNew: guard.allowNew || isAllowNew,
        allowDelete: guard.allowDelete || isAllowDelete,
        // O-1（docs-signals-o12）：specBase/projectName 透传给审计——docSyncHint 模块归属用
        // （平台模式 resolveSpecDir(cwd) 会 miss specRoot 静默丢信号，plan 审查 gap-5）
        specBase,
        projectName: progress?.project || null,
        // 他者 active 会话声明索引（坑 foreign-session-declared-false-block）：多 agent 并发时
        // 并行会话 --files 声明的文件退栈归该会话审计，不再误拦本会话。与上方 guard 读取同源
        // （resolveQuickSessionsDir 同参，平台模式 runtimeRoot 对齐）；fail-open：采集失败 → 空
        // → 回到无豁免现状。
        otherSessionsDeclared: collectOtherQuickSessionDeclarations(platformOpts, specBase, changeName),
      }
      review = await auditQuickCompletion(cwd, mergedGuard, {
        isConfirm: confirm,
        // task-02（FR-03）：--no-docs 豁免 + --file-notes 覆盖率透传进门禁画像（per-process 值与
        // 上方边界并入、下方 completeQuicklogEntry 消费同源；不传 → 纯默认画像）
        noDocs: isNoDocs === true,
        fileNotes: parseFileNotes(getQuickFileNotes()),
      })
      printQuickAuditReview(review)
      if (review.status === 'blocked') {
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        // 摩擦计数（friction-signal-hint task-04）：quick 审计被拦也是摩擦信号——exit 前记
        // 一笔（changeName=quick 会话 id，tally 落 session 目录，成功收尾 consume 后随目录清理）。
        await recordFrictionEvent({ cwd, changeName, platformOpts, type: 'gate_rollback', detail: 'quick-audit' })
        process.exit(1)
      }
      // P0-2（2026-09-02 跨 agent 工单）：触及 src/test 的 quick --done 内置 test+lint
      // 实测门禁——把 CLAUDE.md 规则 8 从 agent 自律下沉为 CLI 卡点（fail → step 回
      // pending + exit 1，重跑不丢进度；纯 doc/配置与未配置命令自动跳过不阻断）。
      // declaredFiles 兜底（2026-09-07）：倒推 B 模式（代码先行 --done 收尾）的文件全部
      // 早于会话启动被基线吸收 → 审计 changedFiles 空 → 此前静默 skip；声明边界触及
      // src/test 时实测仍应跑（quick-f9138c2f 实证）。
      const gate = await runQuickTestLintGate({
        cwd,
        specBase,
        changedFiles: review.changedFiles,
        declaredFiles: Array.isArray(mergedGuard?.allowedFiles) ? mergedGuard.allowedFiles : [],
        changeName,
      })
      printQuickTestLintGate(gate)
      if (gate.action === 'fail') {
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        // 摩擦计数（friction-signal-hint task-04）：test/lint 实测门禁拦下同记摩擦——exit 前
        // 落 session tally，与 quick-audit 同款静默降级。
        await recordFrictionEvent({ cwd, changeName, platformOpts, type: 'gate_rollback', detail: 'quick-test-lint' })
        process.exit(1)
      }
      progress.lastQuickReview = review
    }

    // ── quick 资产尾（2026-09-20-quick-asset-tail，D-001/D-002/D-005）：门禁过后三件机械
    // 事，agent 零新增命令/零写作义务，fail-open 全链（任何异常 warn 不拦 quick 完成）。
    // ① 薄通道蒸馏尾：linked 真变更（非 quick-<hex>）→ decision-distill + fr-index（幂等）
    //    + lite 归档（治「薄通道零资产 + 僵尸 brainstorm 态」——autocompact 对撞实证）。
    //    挂点在门禁后（D-002 时序：防未实现设计进索引）。
    // ② 模块 changelog 机械追加：changedFiles×moduleIndex join → 边车存在才 append 一行
    //    （纯 quick 的检索面——QUICKLOG 是时间流水账，模块边车是空间索引）。
    // ③ 根因 classify 提示：--cause 原文 × INDEX 关键词命中 → 打一行确切命令（非空提示）。
    try {
      // linkedChangesAuto 排除（S2 执行审查缺陷③）：auto-link 命中的他者中途/僵尸变更不走蒸馏
      // 尾（quick-single-change-auto-link §3 契约——即便 requirements.md 在场也不蒸馏不归档，
      // 防未实现设计进索引 + 误归档他者 brainstorm 进行中变更）
      const linkedChanges = Array.isArray(mergedGuard?.linkedChanges) ? mergedGuard.linkedChanges : []
      const autoLinked = new Set(Array.isArray(mergedGuard?.linkedChangesAuto) ? mergedGuard.linkedChangesAuto : [])
      const manualLinked = linkedChanges.filter((c) => c && !QUICK_SID_RE.test(c) && !autoLinked.has(c))
      const { distillLinkedChangeAssets } = await import('./complete-handlers.js')
      const tail = await distillLinkedChangeAssets({ pm, cwd, specBase, changeName, linkedChanges: manualLinked, platformOpts })
      for (const w of tail.warnings) console.warn(`⚠️ [资产尾] ${w}`)
    } catch (e) {
      console.warn(`⚠️ [资产尾] 蒸馏尾异常（fail-open 不拦 quick 完成）：${e && e.message ? e.message : e}`)
    }
    try {
      // ② changelog 边车追加——projectName 同源修复（S2 执行审查缺陷①a）：progress.project
      // （与 outputStep 占位符渲染同源，平台模式真实项目名）三级回退，不再硬编码 null。
      const projName = progress.project
        || steps[currentIdx].project
        || (steps[currentIdx].name.match(/\[([^\]]+)\]\s*$/) || [])[1]
        || null
      const { loadQuickModuleIndex } = await import('./shared.js')
      const moduleIndex2 = await loadQuickModuleIndex(specBase, projName)
      const changed2 = (progress.lastQuickReview?.changedFiles ?? []).map(f => String(f).replace(/\\/g, '/'))
      if (changed2.length > 0 && moduleIndex2 && projName) {
        const touchedMods = new Map()
        for (const [modId, mod] of Object.entries(moduleIndex2)) {
          const prefixes = [...(mod && Array.isArray(mod.paths) ? mod.paths : []), ...(mod && Array.isArray(mod.core_files) ? mod.core_files : [])]
          for (const raw of prefixes) {
            const p = String(raw).replace(/\\/g, '/').replace(/\/+$/, '')
            if (p && changed2.some(f => f === p || f.startsWith(p + '/'))) { touchedMods.set(modId, mod); break }
          }
        }
        // 修复①b：边车路径补 <project> 段——map 的 doc 字段相对 docs/<project>/（如 modules/x.md）
        const modulesDir = join(specBase, 'docs', projName)
        for (const [modId, mod] of touchedMods) {
          try {
            const docRel = mod && mod.doc
            if (!docRel) continue
            const docNorm = String(docRel).replace(/\\/g, '/')
            const sidecarRel = docNorm.replace(/\.md$/, '.changelog.md')
            const target = join(modulesDir, sidecarRel)
            if (!existsSync(target)) continue // 边车不存在静默跳过（建卡是 scan 职责）
            const line = `- ${changeName} | quick 机械留痕（${changed2.length} 文件触达 ${modId}；详账见 QUICKLOG）`
            appendFileSync(target, line + '\n')
            console.log(`🗂️ 模块留痕：${modId} changelog 边车 +1 行（${changeName}）`)
          } catch { /* 单模块失败不连坐 */ }
        }
      }
    } catch (e) {
      console.warn(`⚠️ [资产尾] changelog 追加异常（fail-open）：${e && e.message ? e.message : e}`)
    }
    // ③ 根因 classify 提示——S2 复审缺陷②终裁：**删除本块**。既有「待归类提议」块
    // （下方 extractQuickCauseField → matchKnowledge → 确切 classify 命令）已完全承担此职责
    // 且传参/qlId/文件路径全正确（1836-1844）；本块首版传对象给字符串参数（TypeError 被吞）
    // 二版仍是重复建设——机械件③的 classify 职责由既有块唯一承担，本变更不再另造。

    // task-02 并发预检（FR-05/FR-07，纯副作用 advisory）：auditQuickCompletion 返回后、推进前
    // 扫工作树，识别他者未提交改动 / 他者脏变更目录，有则 console.warn。不改 status/gate、
    // 不 exit、不 return early（FR-07 铁律）。ownFiles 必含 baselineFiles（D-001：脏工作树 quick
    // 完成时本会话 baseline 不被他者误报）；review/mergedGuard 均可能为 null（brownfield 无 guard，
    // D-003），用 ?. + ?? [] 兜底防 spread undefined 抛 TypeError（B-005）。整钩子 try/catch 隔离
    // ——detect 本就 fail-open，保守再包一层，任何异常只吞不 bubble，主完成流程不受影响。
    try {
      // ownFiles 锚点（2026-08-18 误归属修复）：声明会话 = baselineFiles ∪ allowedFiles（声明即归属），
      // 不再用 changedFiles 全量——他者窗口文件已被污染进 changedFiles，旧口径自吞致预检对
      // ql-20260818-003 形态结构性失明。未声明会话维持旧口径（changed ∪ baseline）：无声明无归属
      // 信息，收窄锚点会把自身未声明改动全误报他者。resolveConcurrentAnchor 纯函数（concurrent-detect）。
      const ownFiles = resolveConcurrentAnchor({
        changedFiles: review?.changedFiles ?? [],
        baselineFiles: mergedGuard?.baselineFiles ?? [],
        allowedFiles: mergedGuard?.allowedFiles ?? [],
      })
      const detected = detectConcurrentChanges(cwd, {
        changeName,
        linkedChanges: mergedGuard?.linkedChanges ?? [],
        ownFiles,
      })
      const warn = formatConcurrentWarning(detected)
      if (warn) console.warn(warn)
    } catch (e) {
      // fail-open：并发预检异常绝不阻断主完成流程（FR-07）。
    }

    // 结果摘要结构校验（最后一步、isDone 且带了 --output 时）：--output 是 QUICKLOG「结果：」
    // 归档的唯一来源，要求按 需求/根因/方案/结果 模板给全（见 stages/quick.js step3 prompt）。
    // 确定性校验：只查必填字段是否齐全，不判内容质量。缺字段 → 本次不完成（回滚 step 状态 +
    // exit 1），保留「进行中」条目，agent 补全 --output 后重跑 --done 即可，不丢进度。
    // 仅 completeQuicklogEntry 会实际持久化时才校验；前两个 step 的 --done output 不入 QUICKLOG，不校验。
    // Q6：quick 末步 --done 必须带 --output（四字段结果是 QUICKLOG「结果：」唯一来源）。缺则回退 pending +
    // exit(1)，不静默落空结果条目（原 if(outputText) 守卫致 outputText 为空时跳过校验，completeQuicklogEntry
    // 又用 outputText||'' 兜底 → 结果块为空却翻「已完成」）。handleQuickStageCompletion 仅在阶段完成（=末步）时触发。
    const isLastStep = currentIdx === steps.length - 1
    if (isLastStep && !outputText) {
      console.error('\n❌ quick 最后一步 --done 必须带 --output（四字段结果模板）。')
      console.error('   --output 是 QUICKLOG「结果：」归档的唯一来源。补全后重跑 --done（不丢进度），推荐四参数形式（CLI 自动合成，无嵌套冒号事故面）：')
      console.error('     sillyspec run quick --done --change <changeName> --req "一句话语义化短标题" --cause "为什么这样改" --solution "怎么改的" --result "验证情况（测试数 / lint / typecheck / 部署状态）"')
      console.error('   兼容旧形式：--output "需求：… 根因：… 方案：… 结果：…"')
      steps[currentIdx].status = 'pending'
      steps[currentIdx].completedAt = null
      process.exit(1)
    }
    if (outputText) {
      const resultCheck = validateQuickResult(outputText)
      if (!resultCheck.ok) {
        console.error('\n' + getRule('quick.result-labels').failMessage.replaceAll('${missing}', resultCheck.missing.join('、')))
        console.error(`   --output 是 QUICKLOG「结果：」归档的唯一来源，四个标签必须放在 --output 里（不是 --input）。`)
        console.error(`   补全后重跑 --done（不丢进度）。推荐四参数形式（CLI 自动合成结构化模板，避免旧形式嵌套全角冒号被拆分判定缺字段）：`)
        console.error(`     sillyspec run quick --done --change <changeName> --req "一句话语义化短标题（即 QUICKLOG 条目标题）" --cause "为什么这样改（纯新增/样式则写「无，纯新增/纯样式」）" --solution "怎么改的" --result "验证情况（测试数 / lint / typecheck / 部署状态）"`)
        console.error(`   或照抄旧形式模板：`)
        console.error(`     sillyspec run quick --done --change <changeName> --output "需求：用户/任务要什么`)
        console.error(`     根因：为什么这样改（纯新增/样式则写「无，纯新增/纯样式」）`)
        console.error(`     方案：怎么改的`)
        console.error(`     结果：验证情况（测试数 / lint / typecheck / 部署状态）"`)
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
      // ── 结果虚报提交核对（坑 quicklog-result-false-commit-claim，2026-09-18 实证：ql 条目
      // 写「已提交 <hash> 推送」但 git show 核查该提交不含本会话任何文件——代码滞留暂存区
      // 11 小时，台账账实不符）。advisory warn 不阻断（hash 可能是组合/merge 提交，命中判定
      // 模糊），但把 CLI 端能机械核实的部分摆上台面：结果文本声称提交（40 位 hex，或短 hash
      // 紧跟「已提交/已推送」类字样）且会话声明文件（guard.allowedFiles）无一命中该提交面 →
      // 醒目警告要求 git show 复核；确认是正常形态可照常落账（警告留痕即审计面）。
      try {
        const m40 = outputText.match(/\b[0-9a-f]{40}\b/)
        const mShort = outputText.match(/\b([0-9a-f]{7,12})\b(?=[^\n]{0,40}(?:已提交|已推送|推送|提交入库|落库))/)
        const claimed = m40 || mShort
        if (claimed) {
          const hash = m40 ? m40[0] : mShort[1]
          const declared = Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : []
          let commitFiles = null
          try {
            const out = safeGit(cwd, ['show', '--name-only', '--pretty=format:', hash])
            const raw = typeof out === 'string' ? out : (out && out.value) || ''
            commitFiles = String(raw).split('\n').map(s => s.trim()).filter(Boolean)
          } catch { /* 引用不存在/解析失败 → commitFiles 保持 null 走提示分支 */
          }
          if (Array.isArray(commitFiles) && commitFiles.length > 0 && declared.length > 0) {
            const hit = declared.some(f => commitFiles.includes(f)
              || commitFiles.some(c => c.endsWith('/' + f) || f.endsWith('/' + c) || c === f.replace(/^\.?\//, '')))
            if (!hit) {
              console.warn('')
              console.warn(`⚠️ 结果声称已提交 ${String(hash).slice(0, 12)}，但本会话声明的 ${declared.length} 个文件均不在该提交面内——疑似「计划提交的 hash」被当成「已提交的 hash」（git add 整体失败 / commit pathspec 漏文件的已知形态）。`)
              console.warn(`   核实：git show ${String(hash).slice(0, 12)} --stat 对照本会话文件；确未落库则补提交后重跑 --done 更正「结果：」。`)
              console.warn(`   组合/merge 提交等正常形态确认后照常落账（本警告留痕即审计面）。`)
            }
          } else if (commitFiles === null) {
            console.warn(`⚠️ 结果引用提交 ${String(hash).slice(0, 12)} 但该引用无法解析（git show 失败）——落账前请 git show 核实。`)
          }
        }
      } catch { /* 校验自身异常不阻断 --done（advisory） */ }
    }

    if (!qlId) {
      // 坑 platform-takeover-phantom-progress-db 同日变体：guard 缺失时兜底**优先复用启动
      // 分配的 ql-ID**（进度库 changes.quicklog_id，quick 启动时 stage.js 回填）——落码
      // 注释/模块文档的 ql-ID 是启动时就给出的，补分配新号必然制造引用劈叉（同一次会话
      // 两个 ID、两份 QUICKLOG 各半）。ID 的条目不在当前 specBase（启动/完成分裂库形态）
      // → 用原 ID 补建骨架，完成态落在同一 ID 上。库中也无（真 brownfield/极老会话）才
      // 补分配。
      try {
        const dbQlId = pm.getQuicklogId(cwd, changeName)
        if (dbQlId) {
          const re = await appendQuicklogEntryWithId(specBase, gitUser, dbQlId, {
            description: guard?.taskDescription || '(guard 缺失补建)',
            linkedChanges,
            allowedFiles: Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [],
          })
          qlId = dbQlId
          console.log(`📝 QUICKLOG 兜底补写复用启动 ql-ID: ${qlId}（guard 缺失，ID 取自进度库 quicklog_id${re.existed ? '' : '，条目已补建'}）`)
        }
      } catch { /* 读取/补建失败退回补分配，不阻断 */ }
    }
    if (!qlId) {
      // 无 ql-ID（库中也未回填，真 brownfield）：补分配后立即完成，不阻断。
      try {
        const alloc = await allocateQuicklogEntry(specBase, gitUser, {
          description: guard?.taskDescription || '(补分配)',
          linkedChanges,
          allowedFiles: Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [],
          // 他者 guard 预留让位（坑 ql-id-double-occupancy）：与启动分配同源
          sessionsDir: resolveQuickSessionsDir(platformOpts, specBase),
        })
        qlId = alloc.qlId
        console.log(`📝 QUICKLOG 兜底补写: ${qlId}（guard 缺失/brownfield 会话）`)
      } catch (e) {
        console.error(`\n❌ QUICKLOG 补分配失败: ${e.message}`)
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
    }
    // 占用校验（坑 ql-id-double-occupancy，2026-09-13 实证 007-1351 双占用）：启动预留 ql-ID
    // 写入 guard.json 后，QUICKLOG 条目丢失/分裂窗口内并行会话可分得同一 ID。--done 落最终
    // ID 前两级校验：
    //   ① 盘上同 ID 条目 ≥2 → 记录已损坏，fail-closed 硬拦（不猜哪条属于本会话，手工去重后重跑）
    //   ② 他者活跃会话 guard 仍预留同 ID → 本会话换新号完成（原 ID 让位他者，双方记录不混写）
    const sessionsDirForClaims = resolveQuickSessionsDir(platformOpts, specBase)
    const occupancy = countQuicklogEntries(specBase, qlId)
    if (occupancy.count >= 2) {
      console.error(`\n❌ QUICKLOG 条目 ${qlId} 双占用：${occupancy.count} 处命中（${occupancy.files.join('、')}）——分配竞态残留已损坏记录。`)
      console.error(`   手工去重：编辑上述文件，同 ID 只保留属于本会话的一条（对照时间戳/任务描述），删除其余后重跑 --done。`)
      steps[currentIdx].status = 'pending'
      steps[currentIdx].completedAt = null
      if (outputText) steps[currentIdx].output = null
      process.exit(1)
    }
    const claimants = (collectGuardReservedQuicklogIds(specBase, sessionsDirForClaims).get(qlId) || []).filter(s => s !== changeName)
    if (claimants.length > 0) {
      const oldId = qlId
      try {
        const alloc = await allocateQuicklogEntry(specBase, gitUser, {
          description: guard?.taskDescription || '(占用换号补分配)',
          linkedChanges,
          allowedFiles: Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [],
          sessionsDir: sessionsDirForClaims,
        })
        qlId = alloc.qlId
        console.warn(`⚠️ 预留 ql-ID ${oldId} 被并行会话占用（${claimants.join('、')}）——分配竞态残留（坑 ql-id-double-occupancy）。`)
        console.warn(`   本会话已换新号完成：${qlId}；原 ID 让位该会话（其 --done 正常落原条目），双方 QUICKLOG 记录不混写。`)
      } catch (e) {
        console.error(`\n❌ 占用换号失败: ${e.message}`)
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
    }
    // 最终 ID 回写 guard（坑 ql-id-double-occupancy 建议项）：换号/兜底分配路径下预留 ID ≠
    // 最终 ID 时对齐 guard 记录，会话期内 hook/审计读到的不说谎。
    if (guard && guard.quicklogId !== qlId) {
      guard.quicklogId = qlId
      try { writeAtomicSync(sessionGuardFile, JSON.stringify(guard, null, 2)) } catch { /* 回写失败降级：本进程内已对齐 */ }
    }
    // 条目缺失自愈（原硬拦改补建，坑 ql-id-double-occupancy 同族）：条目在会话期间丢失
    // （并行 git 操作回滚未提交 QUICKLOG 等）时，用最终 ID 补建「进行中」骨架再走完成翻态
    // ——与 guard 缺失分支同 cure（坑 platform-takeover-phantom-progress-db 分裂形态），
    // 消「检查后重跑」的人工一轮。占用校验已在前：补建不会压到他者条目/预留。
    if (!findQuicklogEntry(specBase, gitUser, qlId)) {
      try {
        await appendQuicklogEntryWithId(specBase, gitUser, qlId, {
          description: guard?.taskDescription || '(条目丢失补建)',
          linkedChanges,
          allowedFiles: Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [],
        })
        console.warn(`⚠️ QUICKLOG 条目 ${qlId} 会话期间丢失，已按原 ID 补建骨架（并行 git 操作回滚未提交 QUICKLOG 所致，详见坑 ql-id-double-occupancy）。`)
      } catch (e) {
        console.error(`\n❌ quick 阶段完成校验失败：QUICKLOG 条目 ${qlId} 不存在且补建失败（${e.message}）。`)
        console.error(`   请检查 .sillyspec/quicklog/ 后重跑 --done。`)
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
    }
    // 翻状态进行中→已完成 + 追加结果 + 勾选关联 tasks.md
    // resultText 不再截断：结构化结果块（需求/根因/方案/结果）完整落盘，多行写成字段化块。
    try {
      // 回填实际改动文件：review.changedFiles 含 quick 自身元数据（quicklog/.runtime 等），
      // 过滤掉只留真实业务文件——但**模块卡 + changelog sidecar 保留**（isQuicklogFileLineNoise，
      // 2026-09-08 用户反馈①：收尾必改项此前每回手工补录；审计豁免面与记录面分叉）。brownfield
      // 无 review → 空数组，文件行不动。
      // 归属口径（2026-08-18 误归属修复）：声明会话优先 attributedFiles（窗口∩声明∪同文件并发命中），
      // 他者窗口文件不进文件行；未声明会话/旧 review 无 attributedFiles → 兜底 changedFiles 全量。
      const auditFiles = Array.isArray(review?.attributedFiles)
        ? review.attributedFiles
        : (Array.isArray(review?.changedFiles) ? review.changedFiles : [])
      const realFiles = auditFiles.filter(f => !isQuicklogFileLineNoise(f, linkedChanges))
      // 软归属（2026-09-10 用户反馈：--file-notes 括注只落声明文件，同模块测试文件漏声明时文件行
      // 不自动补齐，连续多批手工核对）：auditQuickCompletion 判定的「窗口内未声明同模块测试文件」
      // → 补入文件行 bullet 带软归属括注；审计面单列 🔍 行（可追溯、错认可手工剔除），⚠️ 不进
      // attributedFiles——硬归属口径「声明即归属」不变（2026-08-18 误归属修复）。
      const softFiles = (Array.isArray(review?.softTestFiles) ? review.softTestFiles : [])
        .map(f => String(f).replace(/\\/g, '/')).filter(f => !isQuickMetadata(f, linkedChanges))
      // task-06（FR-04）：文件行/审计行并上 numstat 行数——attachQuickLineCounts 见文件尾（声明提升）
      const { annotatedRealFiles, annotatedSoftFiles, fmtLineCounts } = attachQuickLineCounts({ cwd, realFiles, softFiles, review, auditFiles, qlId })
      // D-8 落盘（2026-08-18 修）：advisory 欠账信号从「纯打印」升级为「随条目落盘」——修复
      // 「欠账已记录（QUICKLOG reasons）」的不实承诺（交叉审查实证 reasons 纯 stdout，事后不可审计）。
      // 两周实测（2026-08-31 裁决，doc-consistency-debt §七）需要分母：信号触发次数必须可追溯。
      const auditNotes = []
      if (review?.docSyncHint && review.docSyncHint.touchedSource > 0 && review.docSyncHint.docFiles.length === 0) {
        const mods = Array.isArray(review.docSyncHint.modules) && review.docSyncHint.modules.length > 0
          ? `（涉及模块：${review.docSyncHint.modules.map((m) => m.id).join(' · ')}）` : ''
        auditNotes.push(`📝 文档欠账（D-8）：${review.docSyncHint.touchedSource} 个源码文件改动未同步任何模块文档${mods}`)
      }
      if (review?.docsCheckHint && review.docsCheckHint.invalid > 0) {
        auditNotes.push(`📎 文档引用失效：${review.docsCheckHint.invalid}/${review.docsCheckHint.total} 处 file:line 失效（sillyspec docs check 可复现）`)
        // 逐条指名（2026-09-11 同 quick-audit 侧：门禁输出直接带文件:行号，封顶 5 保持注记紧凑）
        for (const i of (review.docsCheckHint.invalidRefs || []).slice(0, 5)) {
          auditNotes.push(`   ❌ [${i.doc}:${i.docLine}] ${i.ref} → ${i.reason}`)
        }
        // 行号漂移自动重锚（2026-09-08 用户反馈②：活文档 file:line 硬编码随任何插入失效，
        // 每回手跑 docs check --fix 是机械活）：autoReanchorDocRefs = --fix 主链路编程化封装
        // （fixable 唯一/优选命中才改 + 定点替换 + 同口径回执），只作用于本次改动的文档。
        // fail-open：重锚任何异常只退化为上方 advisory 文案，绝不阻断 --done。
        try {
          const deletedSet = new Set(review.deletedFiles || [])
          const mdChanged = (review.changedFiles || [])
            .filter(f => f.endsWith('.md') && !deletedSet.has(f) && !isQuickMetadata(f, linkedChanges))
          if (mdChanged.length > 0) {
            const { autoReanchorDocRefs, readDocsCheckConfig } = await import('../docs-check.js')
            let fixCfg = {}
            try { fixCfg = readDocsCheckConfig(cwd) || {} } catch { fixCfg = {} }
            const r = autoReanchorDocRefs(cwd, mdChanged, fixCfg)
            if (r.applied > 0) {
              auditNotes.push(`🔧 行号漂移已自动重锚 ${r.applied} 处（同口径复跑：${r.invalidBefore} → ${r.invalidAfter}；剩余 ${r.remaining} 处需人工 sillyspec docs check）`)
              console.log(`🔧 文档行号漂移自动重锚：${r.applied} 处已改写，剩余 ${r.remaining} 处需人工（sillyspec docs check 可复现）`)
            }
          }
        } catch { /* 自动重锚失败退化为纯 advisory（上方 auditNote 已落盘） */ }
      }
      // ── [gate] 分级门禁落账（FR-03，2026-09-14-quick-exit-tiered-gates task-02）：L1/L2 画像
      // 经 buildGateAuditNote 组装单行 [gate] 注记随既有 auditNotes 通道落 QUICKLOG（L1 每文件
      // 注记+测试增量；L2 模块文档认领+风险命中；--no-docs 豁免同通道留痕）；L0/无画像 → null
      // 零落账。纯 advisory：不阻断完成、不改 review.status 语义（D-003）；未声明脏文件维持上方
      // 归属切分注（⚖️/🔍）不并入文档认领判定（D-005）。
      const gateAuditNote = buildGateAuditNote(review?.gateProfile)
      if (gateAuditNote) auditNotes.push(gateAuditNote)
      // 归属切分注（2026-08-18 误归属修复）：窗口内未声明脏文件不进「文件：」行，但必须落盘可追溯
      // （多 agent 并发仓他者窗口改动 / 本会话漏声明均可能），防真实改动被静默挤走。
      // 软归属拆分（2026-09-10）：softFiles 中的同模块测试文件已补入文件行，不再占 ⚖️「未计入」
      // 文案（否则审计行与文件行自相矛盾），单列 🔍 行交代软归属依据与剔除指引。
      if (Array.isArray(review?.undeclaredFiles) && review.undeclaredFiles.length > 0) {
        const softSet = new Set(softFiles)
        const undeclared = review.undeclaredFiles.filter(f => !isQuickMetadata(f, linkedChanges) && !softSet.has(String(f).replace(/\\/g, '/')))
        if (undeclared.length > 0) {
          auditNotes.push(`⚖️ 归属切分：${undeclared.length} 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：${undeclared.map(f => `${f}${fmtLineCounts(f)}`).join(', ')}`)
        }
        if (softFiles.length > 0) {
          auditNotes.push(`🔍 软归属：${softFiles.length} 个窗口内未声明同模块测试文件已补入文件行（若属并行会话改动请手工剔除）：${annotatedSoftFiles.join(', ')}`)
          console.log(`🔍 软归属：${softFiles.length} 个窗口内未声明同模块测试文件已按软归属补入文件行（若属并行会话改动请手工剔除）：${annotatedSoftFiles.join(', ')}`)
        }
      }
      await completeQuicklogEntry(specBase, gitUser, qlId, {
        resultText: outputText || '',
        linkedChanges,
        changedFiles: annotatedRealFiles,
        auditNotes,
        softFiles,
      })
      console.log(`📝 QUICKLOG 条目 ${qlId} 已标记完成`)
      // 范围快照/patch 审计级落盘（quick-359a48f1）：quicklog/patches/<qlId>.json+.patch——按
      // ql-ID 对齐 QUICKLOG 条目（平台按条目抓取），json 冗余 sessionId 供 guard 清理后记录态
      // 反查（computeQuickAudit → findQuickPatchRecord 同链）。patch 为 --done 时点全量冻结
      // （HEAD 未提交窗口，untracked 自拼 hunk）。fail-soft：失败只提示，不阻断收尾。
      try {
        const { computeChangeScopeAudit, collectNumstatByPath, buildFrozenPatch } = await import('../scope-audit.js')
        // changeName == sessionId（handleQuickStageCompletion 作用域内，§4.6 注释同款约定）
        const snapResult = await computeChangeScopeAudit({ cwd, specBase, changeName, platformOpts, collectPatch: true })
        let quickRows = snapResult && snapResult.mode === 'quick' && Array.isArray(snapResult.rows)
          ? snapResult.rows.filter(r => r && r.attribution !== 'undeclared')
          : null
        let frozenPatch = snapResult ? snapResult.frozenPatch : undefined
        // 窗口空兜底（baseline 会话常态）：--files 声明文件是会话启动时预存脏（audit baseline
        // 剔除后窗口空，quickRows 空），但声明即归属——改用声明文件集构造 rows + patch（行数按
        // HEAD 未提交窗口采集，同口径）。
        if ((!quickRows || quickRows.length === 0) && Array.isArray(guard?.allowedFiles) && guard.allowedFiles.length > 0) {
          const sessionRoot = dirname(specBase)
          const declaredPosix = guard.allowedFiles.map(f => String(f).replace(/\\/g, '/')).filter(Boolean)
          const stats = collectNumstatByPath(sessionRoot, declaredPosix, { baseRef: 'HEAD' })
          quickRows = declaredPosix.filter(f => stats.has(f) || existsSync(join(sessionRoot, f)))
            .map(f => {
              const st = stats.get(f) || { additions: null, deletions: null, kind: existsSync(join(sessionRoot, f)) ? 'modified' : 'deleted' }
              return { path: f, declared: true, additions: st.additions, deletions: st.deletions, kind: st.kind, attribution: 'declared' }
            })
          frozenPatch = buildFrozenPatch(sessionRoot, quickRows.map(r => r.path), { baseRef: 'HEAD' })
        }
        if (quickRows && quickRows.length > 0) {
          const patchesDir = join(specBase, 'quicklog', 'patches')
          mkdirSync(patchesDir, { recursive: true })
          const { frozenPatch: _fp, ...snapRest } = snapResult || {}
          const snapObj = {
            ...snapRest,
            rows: quickRows,
            totals: { files: quickRows.length, additions: quickRows.reduce((n, r) => n + (Number.isFinite(r.additions) ? r.additions : 0), 0), deletions: quickRows.reduce((n, r) => n + (Number.isFinite(r.deletions) ? r.deletions : 0), 0) },
            qlId,
            sessionId: changeName,
            savedAt: new Date().toISOString(),
          }
          snapObj.note = 'quick --done 时点冻结（本文件落盘时采集）'
          if (typeof frozenPatch === 'string' && frozenPatch) {
            const patchText = frozenPatch.endsWith('\n') ? frozenPatch : frozenPatch + '\n'
            writeFileSync(join(patchesDir, `${qlId}.patch`), patchText)
            snapObj.patchSha256 = createHash('sha256').update(patchText.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
            snapObj.patchStatus = 'ok'
          } else if (frozenPatch === null) {
            snapObj.patchStatus = 'failed'
          }
          writeFileSync(join(patchesDir, `${qlId}.json`), JSON.stringify(snapObj, null, 2) + '\n')
          console.log(`📦 范围快照已落 quicklog/patches/${qlId}.json${snapObj.patchStatus === 'ok' ? ' + .patch（--done 时点冻结，sha256 已锚）' : snapObj.patchStatus === 'failed' ? '——patch 采集失败已留痕' : ''}`)
        }
      } catch (e) {
        console.warn(`   ⚠️ quick 范围快照落盘失败（不阻断收尾）：${e && e.message ? String(e.message).split('\n')[0] : e}`)
      }
      // 刷新 DB title：从 step3「需求：」提取（agent 可改 title 的途径），覆盖启动时的兜底快照。
      // 与 QUICKLOG 标题刷新（flipEntryInContent 内 extractTitleFromResult）同源，保持 DB↔QUICKLOG 一致。
      try {
        const refinedTitle = extractTitleFromResult(outputText || '');
        if (refinedTitle) pm.updateChangeMeta(cwd, changeName, { title: refinedTitle });
      } catch { /* title 刷新失败不阻断完成 */ }
    } catch (e) {
      console.warn(`⚠️ QUICKLOG 完成态写入失败: ${e.message}`)
    }

    // ── 归类提议（2026-09-14-knowledge-loop-close task-03，FR-01/D-001@v1）──
    // QUICKLOG 已落盘，用进程内已过四字段校验的 outputText（免读回盘）提取「根因：」拼查询串跑
    // matchKnowledge（复用 knowledge-match 既有引擎；INDEX.md 缺失/未命中 matched:false 全链路
    // no-op）。只渲染不自动执行：确认归类须 agent 显式跑 knowledge classify（R-01，错误归类靠
    // archive/doctor 抽审 revert）。根因为「无，纯新增/纯样式」形态（无坑可归）或未命中时不渲染
    // 任何提议（拿不准不写，零输出变化）。实现与口径见文件尾（函数声明提升 + B1 断言窗口约束）。
    try {
      const causeText = extractQuickCauseField(outputText)
      if (causeText && !PURE_NEW_CAUSE_RE.test(causeText)) {
        const { matchKnowledge } = await import('../knowledge-match.js')
        const km = matchKnowledge(join(specBase, 'knowledge'), causeText)
        if (km && km.matched && Array.isArray(km.entries) && km.entries.length > 0) {
          const hit = km.entries[0]
          const target = hit.anchor ? `${hit.file}#${hit.anchor}` : hit.file
          console.log(`\n📚 待归类提议：${qlId} 根因疑似命中 ${target}`)
          console.log(`   确认归类跑：sillyspec knowledge classify --ql ${qlId} --file ${hit.file}`)
        }
      }
    } catch { /* 提议渲染失败零副作用（advisory fail-open，不阻断 --done 收尾） */ }

    // 轻量归档任务已全勾选的关联真实变更
    try {
      // quickSessionName/sessionFlag（task-03 / FR-01）：quick 轻量归档链所有权校验入参——
      // quick 会话标识（changeName=quick-<hex>，三级解析第三层）+ --session 显式标识。
      const closeResult = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges, linkedChangesAuto, platformOpts, quickSessionName: changeName, sessionFlag })
      if (closeResult.closed.length > 0) {
        console.log(`📦 已自动归档 ${closeResult.closed.length} 个关联变更：${closeResult.closed.join(', ')}`)
      }
      if (closeResult.skipped.length > 0) {
        for (const s of closeResult.skipped) {
          console.log(`⏭️ 关联变更 ${s.name} 未归档：${s.reason}`)
        }
      }
    } catch (e) {
      console.warn(`⚠️ 关联变更轻量归档失败（不阻断 quick 完成）: ${e.message}`)
    }

    // 摩擦信号消费（friction-signal-hint task-04）：必须在 session 目录清理**前**——清理后
    // tally 随目录删除，晚于此就读不到。QUICKLOG 完成打印之后 consume，提示里的 postmortem
    // 建议有落点可循；全零/读失败零输出，摩擦提示失败不影响收尾。
    try {
      const fr = await consumeFrictionHint({ cwd, changeName, platformOpts })
      if (fr && fr.hint) console.log(`\n${fr.hint}`)
    } catch { /* 摩擦提示失败不影响收尾 */ }

    // 清理 session 目录（rmSync/unlinkSync 容忍不存在）。路径与写入对齐（Q4 resolveQuickSessionsDir）。
    try {
      if (changeName) {
        const sessionDir = join(resolveQuickSessionsDir(platformOpts, specBase), changeName)
        rmSync(sessionDir, { recursive: true, force: true })
      }
      if (existsSync(legacyGuardFile)) unlinkSync(legacyGuardFile)
    } catch {}

    // 注销 quick 会话注册的 changes 行（quick-<uuid8>），避免 active 行随每次 quick 单调累积污染
    // listChanges / doctor / resolveQuickLinkedChanges（multi-agent-review Q1）。quick 是收尾型会话，
    // 不走 archive，旧代码从不调 unregisterChange → DB 里 active 的 quick-<hex> 行只增不减。
    // 仅对 quick-<8hex> sessionId 注销——非 sessionId 形态的变更名是旧兼容路径/真实关联变更，
    // 误注销会把用户真实变更标 archived（与 command.js:569 sessionId 守卫同形正则）。
    if (changeName && /^quick-[0-9a-f]{8}$/.test(changeName)) {
      try {
        pm.unregisterChange(cwd, changeName)
      } catch (e) {
        console.warn(`⚠️ 注销 quick 会话 changes 行失败（不阻断完成）: ${e.message}`)
      }
    }

    // ── knowledge-baseline 棘轮（2026-09-14-knowledge-loop-close task-03，FR-03/R-05）──
    // uncategorized 待归类条数对比基线：超线 ⚠️ 软警告（不阻断不抛错）、降线自动收紧写回、
    // 基线文件缺失 = 未启用直接跳过（存量仓零迁移）。实现收拢文件尾（B1 断言窗口约束同上）。
    renderKnowledgeBaselineRatchet(specBase)
  }

  return null
}

/**
 * 判定变更 tasks.md 是否全部勾选完成。
 * 无 tasks.md 或有未勾选项均返回 false（保守策略）。
 *
 * @param {string} specBase - .sillyspec 根目录
 * @param {string} changeName - 变更名
 * @returns {boolean}
 */
function isChangeTasksComplete(specBase, changeName) {
  const tasksPath = join(specBase, 'changes', changeName, 'tasks.md')
  if (!existsSync(tasksPath)) return false
  try {
    const content = readFileSync(tasksPath, 'utf8').replace(/\r\n/g, '\n')
    return !/^-\s*\[\s*\]\s+/m.test(content)
  } catch {
    return false
  }
}

/**
 * 对单个已完成的关联真实变更执行轻量归档（不校验 plan.md/module-impact.md）。
 *
 * @param {Object} opts
 * @param {ProgressManager} opts.pm
 * @param {string} opts.cwd
 * @param {string} opts.specBase
 * @param {string} opts.changeName
 * @param {Object} [opts.platformOpts]
 * @returns {Promise<{closed:boolean, destDir?:string, reason?:string}>}
 */
async function closeSingleQuickLinkedChange({ pm, cwd, specBase, changeName, platformOpts = {} }) {
  const srcDir = join(specBase, 'changes', changeName)
  if (!existsSync(srcDir)) {
    return { closed: false, reason: '源目录不存在' }
  }
  const changesDir = join(specBase, 'changes')
  const archiveDir = join(changesDir, 'archive')
  const date = new Date().toISOString().slice(0, 10)
  const destName = archiveDestDirName(date, changeName)
  const destDir = join(archiveDir, destName)

  // 幂等：目标目录已存在或已在 archive/ 中
  if (existsSync(destDir) || findAlreadyArchivedDir(archiveDir, changeName)) {
    return { closed: false, reason: `目标目录已存在（${destName}）` }
  }

  mkdirSync(archiveDir, { recursive: true })
  try {
    renameSyncRetry(srcDir, destDir)
  } catch (e) {
    return { closed: false, reason: `移动目录失败：${e.message}` }
  }

  // 终态一致化同标准归档（坑 manual-archive-desync-status-only）：轻量归档路径不能只翻 status
  pm.unregisterChange(cwd, changeName, { archiveStepNames: typeof pm.archiveStepNamesForArchive === 'function' ? pm.archiveStepNamesForArchive() : null })
  await archiveWorktreeCleanup(cwd, changeName, specBase, platformOpts)
  safeGit(cwd, ['add', '--', `.sillyspec/changes/archive/${destName}/`])

  console.log(`📦 关联变更已自动归档：${changeName} → archive/${destName}/`)
  return { closed: true, destDir }
}

/**
 * quick 轻量归档的阶段闸允许集：仅「从未进入完整流程」的变更可被 quick --done 自动归档
 * （d192f89 原始场景：评估 small 转 quick、停在 brainstorm 的僵尸变更）。execute 完成后
 * tasks.md 必然全勾选而流程未收尾——不看 current_stage 会把 verify/中途的完整流程变更
 * 绕过 verify/archive 校验直接归档注销（quick-close-midflight 缺陷）。
 *
 * 阶段名允许集之外还有「阶段完成态」闸（ql-20260819-010，quick-done-autoarchive-misfire
 * 缺陷①）：current_stage=brainstorm 但该阶段 status=completed（brainstorm 收尾到 plan
 * 开始之间的空窗）≠ 僵尸变更——此时关联 quick --done 会把即将进 plan 的进行中变更误
 * 轻量归档。stage_status=completed 一律走原流程收尾。
 *
 * 转轨放行（2026-09-20 僵尸状态实证缺口）：缺陷①②两闸把 d192f89 的原始目标场景——
 * brainstorm 精判 scale:small、设计裁定实现路径即 `quick --linked-changes <本变更>` 的
 * 刻意转轨变更——也拦成了永真（brainstorm --done 必然置 completed、转轨间隔天然分钟级
 * 必中时近性闸），linked quick --done 后变更永留 active/brainstorm 成僵尸。识别信号用
 * brainstorm 末步已落盘的机器可读产物：current_stage=brainstorm + stage_status=completed
 * + design.md frontmatter scale:small（readDesignScale，gates.js）三条件齐 = 转轨变更，
 * 放行两闸且 tasks 判定按 quick 语义（无 tasks.md=无待办）；scale=large/未写 scale 的
 * 在途变更两闸原样生效（缺陷①②防护面不变）。
 */
const QUICK_CLOSE_ALLOWED_STAGES = new Set(['', 'scan', 'brainstorm'])

/** 时近性闸窗口（缺陷②复潮实现）：最近进度活动 60 分钟内的变更不自动归档——活跃会话
 * 步进间隔为分钟级（brainstorm 8 步通常 <1h），僵尸的最后活动以小时/天计。 */
const QUICK_CLOSE_ACTIVITY_WINDOW_MS = 60 * 60 * 1000

/**
 * quick --done 完成后，自动关闭任务已全部完成的关联真实变更。
 * quick-<hex> sessionId 自身不在此处理（由调用方单独注销）。
 * 单个归档失败 catch warn，不阻断 quick 完成。
 *
 * 阶段闸（fail-closed）：先查 changes.current_stage——无 DB 记录（未注册目录桩）或停在
 * scan/brainstorm 才继续 tasks 判定；plan/execute/verify/archive 一律 skip 走原流程收尾。
 * pm 缺 getChangeStage 接口或查询抛错同样 skip，不静默放行。
 *
 * 转轨放行：current_stage=brainstorm + stage_status=completed + design.md scale:small =
 * brainstorm 精判裁定走 quick 的刻意转轨变更（见 QUICK_CLOSE_ALLOWED_STAGES 上注释），
 * 豁免「阶段完成态」「时近性」两闸与「无 tasks.md」判定，linked quick --done 即收尾。
 *
 * @param {Object} opts
 * @param {ProgressManager} opts.pm
 * @param {string} opts.cwd
 * @param {string} opts.specBase
 * @param {string[]} [opts.linkedChanges]
 * @param {Object} [opts.platformOpts]
 * @param {string|null} [opts.quickSessionName] quick 会话名（quick-<hex>，所有权三级标识第三层）
 * @param {string|null} [opts.sessionFlag] --session 显式会话标识（所有权三级标识最高层）
 * @returns {Promise<{closed:string[], skipped:{name:string,reason:string}[]}>}
 */
export async function closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges = [], linkedChangesAuto = [], platformOpts = {}, quickSessionName = null, sessionFlag = null }) {
  const closed = []
  const skipped = []
  // 只处理真实变更，跳过 quick 会话 sessionId
  const realChanges = linkedChanges.filter((name) => !/^quick-[0-9a-f]{8}$/.test(name))
  for (const changeName of realChanges) {
    try {
      // 止血（坑 quick-single-change-auto-link 配套）：仅被机器自动关联（单候选信号门控命中
      // 的猜测，非 --linked-changes 显式协作声明）的变更不触发轻量归档——归档是破坏性动作，
      // 机器猜的关联声明不够格；显式关联的僵尸清理通道（D-002@v1/v2 契约）不受影响。
      if (linkedChangesAuto.includes(changeName)) {
        skipped.push({
          name: changeName,
          reason: '自动关联（信号命中机器猜测，非显式协作声明），不触发自动归档——确要归档请走原流程收尾（sillyspec progress show）',
        })
        continue
      }
      if (typeof pm.getChangeStage !== 'function') {
        skipped.push({ name: changeName, reason: '进度库接口缺失（getChangeStage），无法判定流程阶段，不自动归档' })
        continue
      }
      const stageInfo = pm.getChangeStage(cwd, changeName)
      if (stageInfo !== null && !QUICK_CLOSE_ALLOWED_STAGES.has(stageInfo.current_stage || '')) {
        skipped.push({
          name: changeName,
          reason: `变更处于完整流程「${stageInfo.current_stage}」阶段（tasks.md 全勾不等于流程收尾），不自动归档——请走原流程收尾（sillyspec progress show 查看进度）`,
        })
        continue
      }
      // 刻意转轨判定（见 QUICK_CLOSE_ALLOWED_STAGES 上注释「转轨放行」段）：scale:small 是
      // brainstorm 末步写进 design.md frontmatter 的精判产物（stages/brainstorm.js「生成规范
      // 文件」步），其设计实现路径就是本 quick 会话——linked quick --done 即本变更流程收尾点。
      // readDesignScale 动态导入破环（gates.js 静态导入本模块，其 :1175 反向动态 import 先例）；
      // 导入/执行异常 fail-safe 按「非转轨」走原闸，不废既有护栏。
      let quickHandoff = false
      if (stageInfo !== null && stageInfo.current_stage === 'brainstorm' && stageInfo.stage_status === 'completed') {
        try {
          const { readDesignScale } = await import('./gates.js')
          quickHandoff = readDesignScale(specBase, changeName) === 'small'
        } catch { /* fail-safe：识别不了按非转轨走原闸 */ }
      }
      // ql-20260819-010（quick-done-autoarchive-misfire 缺陷①）：当前阶段已完成 ≠
      // 从未进入完整流程的僵尸。brainstorm 收尾到 plan 开始之间的空窗里 current_stage
      // 仍读 brainstorm，只看阶段名会把即将进 plan 的变更误轻量归档（propose 骨架
      // tasks.md 除 quick 追加的 ql 行外没有任务行，「无未勾选框=全勾」恒真）。
      // stage_status=completed 一律原流程收尾；null（无阶段行/brownfield）与旧调用方
      // mock 缺字段（undefined）均按未完成放行，僵尸逃生通道行为不变。
      if (!quickHandoff && stageInfo !== null && stageInfo.stage_status === 'completed') {
        skipped.push({
          name: changeName,
          reason: `变更当前阶段「${stageInfo.current_stage || '(空)'}」已完成（推进/收尾中，非僵尸变更），不自动归档——请走原流程收尾（sillyspec progress show 查看进度）`,
        })
        continue
      }
      // 时近性闸（quick-done-autoarchive-misfire 缺陷②，D-002@v1 复潮，2026-09-11
      // cross-change-decision-guard 实证）：阶段态区分不了「活跃在途」与「启动后弃单」——
      // brainstorm in_progress + tasks.md 仅含他者 quick 行时「全勾」是空洞真值（完整流程
      // plan 前无自有任务行），关联 quick --done 勾掉 ql 行即触发在途变更被轻量归档。
      // 信号取时近性：最近一次 stage/step 完成时刻在窗口内 = 会话分钟级在推进（在途），
      // 不自动归档；僵尸的最后活动必然陈旧（或无完成步 → null），逃生通道语义不变
      //（既有「真·僵尸 in_progress→closed」行为保留）。pm 无此方法（旧 mock/旧进度库）
      // 按无近期活动放行——与 getChangeStage 缺失 skip 的 fail-safe 不同向：本闸误放行的
      // 最坏后果是回到缺陷②现状（有 D-002 防护兜底），误拦截则僵尸永不清——权衡取放行。
      // （转轨变更例外：brainstorm --done → quick 启动/--done 间隔天然分钟级，时近性对它
      // 是永真拦截信号——quickHandoff 已用 scale:small 坐实「等 quick 落地」，不在「在途」
      // 语义面内，放行。）
      if (!quickHandoff && typeof pm.getLatestActivityAt === 'function') {
        const latest = pm.getLatestActivityAt(cwd, changeName)
        if (latest && Date.now() - new Date(latest).getTime() < QUICK_CLOSE_ACTIVITY_WINDOW_MS) {
          skipped.push({
            name: changeName,
            reason: `变更 ${Math.round((Date.now() - new Date(latest).getTime()) / 60000)} 分钟内仍有进度活动（在途会话，非僵尸），不自动归档——确已弃单请走原流程收尾或窗口过后重试`,
          })
          continue
        }
      }
      // tasks 判定（转轨例外）：scale=small 按 brainstorm 末步约定不生成 tasks.md
      //（「proposal/requirements/tasks 对 quick 无用」）——转轨变更无 tasks.md = 无待办
      // 放行；文件存在（propose 骨架等）仍按全勾判定，未勾任务行照拦。
      const tasksComplete = quickHandoff && !existsSync(join(specBase, 'changes', changeName, 'tasks.md'))
        ? true
        : isChangeTasksComplete(specBase, changeName)
      if (!tasksComplete) {
        skipped.push({ name: changeName, reason: 'tasks.md 未全勾选或不存在' })
        continue
      }
      // ── 所有权护栏（2026-09-14-change-ownership-guards task-03 / FR-01 接线点）──
      // closeSingleQuickLinkedChange 归档移动前对 linked full-flow change 校验（消费 task-02
      // 契约，不重复实现）：他人活跃 → 跳过该 linked 归档 + warning（不炸 quick --done）；无主/
      // 窗口外/本会话自有 → 放行，接管分支重写 owner。quick 会话标识=quick-<hex>（三级解析
      // 第三层，quickChangeName 传入）；quick 面互斥恒 self（design 非目标声明），本闸只拦
      // full-flow change 的「他人活跃」态。pm 缺接口（旧 mock/旧进度库）fail-open 放行留痕
      //（同 command.js claim fail-open 先例：护栏退回 no-owner 语义，不废僵尸逃生通道）；
      // 校验自身异常则跳过该归档（fail-closed 不误归档）。
      if (typeof pm.assertChangeOwnership !== 'function') {
        console.warn(`⚠️ 进度库接口缺失（assertChangeOwnership），关联变更 ${changeName} 跳过所有权校验（fail-open 放行）`)
      } else {
        try {
          const { session } = resolveSessionIdentity({
            flagSession: sessionFlag || null,
            quickChangeName: quickSessionName || null,
            cwd,
          })
          const ownCheck = pm.assertChangeOwnership(cwd, changeName, { selfSession: session, nowMs: Date.now() })
          if (!ownCheck.allowed) {
            skipped.push({
              name: changeName,
              reason: `变更正被其他会话持有（owner: ${ownCheck.owner}，最后活跃: ${ownCheck.lastActive || '未知'}），跳过自动归档——由其会话自行收尾（sillyspec progress show 查看进度）`,
            })
            continue
          }
          if (ownCheck.action !== 'self') {
            try { pm.setChangeOwner(cwd, changeName, session) } catch { /* 接管写库失败不阻断放行语义 */ }
          }
        } catch (e) {
          skipped.push({ name: changeName, reason: `所有权校验异常（${e && e.message ? e.message : e}），跳过自动归档` })
          continue
        }
      }
      const result = await closeSingleQuickLinkedChange({ pm, cwd, specBase, changeName, platformOpts })
      if (result.closed) {
        closed.push(changeName)
      } else {
        skipped.push({ name: changeName, reason: result.reason || '未知原因' })
      }
    } catch (e) {
      console.warn(`⚠️ 关联变更 ${changeName} 轻量归档失败（不阻断 quick 完成）: ${e.message}`)
      skipped.push({ name: changeName, reason: e.message })
    }
  }
  return { closed, skipped }
}

/**
 * execute「Wave N 执行」步骤完成后扫 worktree 提取 provider endpoint artifact（W6 Step6c 从
 * completeStep 内联块抽出）。供 verify 阶段 parity 对账 + consumer task 上游契约注入。
 * 接线自 contract-matrix pipeline。step 级（每个 Wave 执行步骤后跑），无 early-return（try/catch warn）。
 *
 * ctx：stageName/steps/currentIdx/changeName/specBase/cwd。extractArtifactsForChange ← 动态 ../contract-matrix.js，
 * WorktreeManager ← 动态 ../worktree.js（真环依赖保留动态）。
 */
export async function handleExecuteWaveArtifact({ stageName, steps, currentIdx, changeName, specBase, cwd, platformOpts }) {
  if (stageName === 'execute' && /^Wave \d+ 执行$/.test(steps[currentIdx]?.name || '')) {
    try {
      const { extractArtifactsForChange } = await import('../contract-matrix.js')
      let worktreePath = null
      try {
        const { WorktreeManager } = await import('../worktree.js')
        const meta = new WorktreeManager({ cwd }).getMeta(changeName)
        if (meta?.worktreePath && existsSync(meta.worktreePath)) worktreePath = meta.worktreePath
      } catch {}
      // 写侧与读侧（gates.js verify parity / prompt.js consumer 注入）同走 resolveRuntimeRoot：
      // 平台模式 runtimeRoot ≠ specBase/.runtime，分裂时 artifact 写一处读另一处恒空
      const runtimeRoot = resolveRuntimeRoot(platformOpts || {}, specBase)
      const msg = extractArtifactsForChange({ changeDir: join(specBase, 'changes', changeName), specBase, changeName, worktreePath, runtimeRoot })
      if (msg) console.log(msg)
    } catch (e) { console.warn(`⚠️ 契约 artifact 提取跳过: ${e?.message || e}`) }
  }
  return null
}

/**
 * 聚合最新 execute run 各 task review.json 的 changedFiles（主仓 repo 过滤）。
 *
 * 复用 resolveLatestExecuteRunIdWithTasks（task-review.js:684，规避 marker 漂移）+ readReview。
 * 仅主仓 repo（review.repo 缺省或 'main'）的 changedFiles 参与主仓核验；跨仓 repo 的 task 文件
 * 由跨仓仓独立落地，不在主仓 worktree/分支，混入会误报 missing（Grill M11）。
 *
 * @param {{ runtimeRoot: string, changeName: string }} opts
 * @returns {Promise<string[]>} 主仓 changedFiles 聚合（去重保序）；无 run / 无 tasks / 读取失败 → []
 */
export async function collectExecuteChangedFiles({ runtimeRoot, changeName }) {
  if (!runtimeRoot || !changeName) return []
  const { resolveLatestExecuteRunIdWithTasks, readReview, normalizeRepoKey } = await import('../task-review.js')
  // changeName 透传：run 解析按 change 戳优先归属（坑 worktree-cleanup-marker-chain），
  // 避免 marker 断裂后聚合到其他变更 run 的 changedFiles 误报 missing
  const runId = resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName })
  if (!runId) return []
  const tasksDir = join(runtimeRoot, 'execute-runs', runId, 'tasks')
  if (!existsSync(tasksDir)) return []
  let taskIds
  try {
    taskIds = readdirSync(tasksDir)
  } catch {
    return []
  }
  const files = []
  for (const taskId of taskIds) {
    const r = readReview(join(tasksDir, taskId, 'review.json'))
    if (!r.ok || !r.review) continue
    // 跨仓 repo 过滤：仅主仓（repo 缺省视 'main'）参与主仓核验，避免误报
    if (normalizeRepoKey(r.review.repo) !== 'main') continue
    if (Array.isArray(r.review.changedFiles)) {
      for (const f of r.review.changedFiles) {
        // 交付物过滤（与 worktree.js hasUnappliedChanges isDeliverable 同口径）：.sillyspec/ 蓝图/
        // runtime 产物与 meta.json 不参与落盘核验——它们随主仓/并行 session 维护，不在 worktree 分支，
        // 混入会误报 missing
        if (typeof f !== 'string' || f.trim() === '') continue
        if (f.startsWith('.sillyspec/') || f === 'meta.json') continue
        files.push(f)
      }
    }
  }
  return [...new Set(files)]
}

/**
 * execute 阶段级核验（防空跑谎报，D-002@v1 / FR-04/05/06）：聚合最新 execute run 各 task review 声称的
 * 交付文件，用 findMissingDeliverables 核验其存在于 worktree 分支 tree 或 worktree 工作区。
 *
 * - missing 文件 → console.warn 列清单，提示"apply 将无源可复制"（宽松非阻断，不 exit 不 throw）。
 * - checked:false（worktree 目录 / 分支不存在）→ 保守提示"无法核验，请人工确认"。
 * - 与 Task Review Gate 既有校验（零改动伪造 / 不相交伪造，task-review.js:590-623）互补不重复拦截：
 *   本核验的真实增量窗口是「review 通过后文件被删且未 commit」+「无法核验时给人工确认提示」。
 *
 * 由 handleExecuteWorktreeCleanup 开头调用：核验发生在 worktree cleanup 之前，目录被清前先判定
 * 交付文件是否落盘。整个钩子 try/catch 兜底——任何异常只 warn，绝不影响 execute 完成（FR-07）。
 *
 * ctx：stageName/changeName/cwd。WorktreeManager + findMissingDeliverables ← 动态 ../worktree.js；
 * task-review 读取 ← 动态 ../task-review.js。runtimeRoot 用本地 specBase 解析（无 platformOpts 传入
 * 时平台 runtimeRoot 不在本函数作用域，降级为本仓 .runtime，读不到 review 则跳过，零误报）。
 */
export async function handleExecuteDeliverableCheck({ stageName, changeName, cwd }) {
  if (stageName !== 'execute' || !changeName) return null
  try {
    const { WorktreeManager, findMissingDeliverables } = await import('../worktree.js')
    const wm = new WorktreeManager({ cwd })
    const meta = wm.getMeta(changeName)
    if (!meta) return null // 无 worktree meta（非 worktree execute / 已清），无需核验
    const specBase = join(cwd, '.sillyspec')
    const runtimeRoot = resolveRuntimeRoot({}, specBase)
    const changedFiles = await collectExecuteChangedFiles({ runtimeRoot, changeName })
    if (changedFiles.length === 0) return null
    const { missing, checked } = findMissingDeliverables({
      worktreePath: meta.worktreePath,
      branch: meta.branch,
      changedFiles,
    })
    if (!checked) {
      console.warn('⚠️ execute 阶段级核验：无法核验（worktree 目录或分支不存在），请人工确认交付文件已落盘。')
      return null
    }
    if (missing.length > 0) {
      console.warn(`⚠️ execute 阶段级核验：以下 ${missing.length} 个声称实现的交付文件既不在分支也不在工作区，疑似空跑/从未落盘：`)
      for (const f of missing) console.warn(`   ${f}`)
      console.warn('   请检查子代理是否真实实现，或先 commit 到分支；apply 将无源可复制。')
    }
  } catch (e) {
    console.warn(`⚠️ execute 阶段级核验跳过: ${e?.message || e}`)
  }
  return null
}

/**
 * execute 阶段完成时条件性清理 worktree（W6 Step6c 从 completeStep 完成路径内联块抽出）。
 * 不依赖 AI agent 的完成确认步骤：有未 apply 变更 → 保留 worktree；否则 cleanup（含 in-place 安全清理）。
 * stage 级（execute 阶段全部完成时跑），无 early-return（try/catch warn）。
 *
 * ctx：stageName/changeName/cwd。WorktreeManager ← 动态 ../worktree.js。
 */
export async function handleExecuteWorktreeCleanup({ stageName, changeName, cwd }) {
  // 阶段级核验（D-002@v1，防空跑谎报）：cleanup 之前判定 review 声称实现的交付文件是否落盘。
  // 宽松非阻断：缺失 warn / 无法核验保守提示 / 异常只 warn，均不影响下方 cleanup 与 execute 完成。
  await handleExecuteDeliverableCheck({ stageName, changeName, cwd })
  if (stageName === 'execute' && changeName) {
    try {
      const { WorktreeManager } = await import('../worktree.js');
      const wm = new WorktreeManager({ cwd });
      const meta = wm.getMeta(changeName);
      if (!meta) {
        console.log('🔗 Worktree: n/a (no meta)');
      } else if (meta.mode === 'native-worktree') {
        console.log('🔗 Worktree: kept (外部隔离环境)');
      } else {
        // in-place 模式不再短路：cleanup 现在能安全处理 in-place（只清 meta，不碰主工作区）。
        // 主仓互斥锁（坑 main-repo-no-mutex 二批）：检查+清理与并行会话的 apply/cleanup 互斥
        // （防 TOCTOU：检查时他者正在 apply → 判定漂移）。best-effort：锁超时不阻断 execute
        // 完成，降级为保留 worktree + 手动清理指引。
        try {
          const { withMainRepoLock } = await import('../worktree-apply.js')
          const cleanResult = await withMainRepoLock(cwd, changeName, 'execute-cleanup', () => {
            const check = wm.hasUnappliedChanges(changeName);
            if (check.hasChanges) {
              return { kept: true, check }
            }
            return { kept: false, result: wm.cleanup(changeName) }
          })
          if (cleanResult.kept) {
            console.log(`🔗 Worktree: pending apply (${cleanResult.check.changedFiles.length} 个未应用变更)`);
            console.log(`   下一步: sillyspec worktree apply ${changeName}`);
          } else {
            console.log(`🔗 Worktree: ${cleanResult.result.result}`);
            // 正当清理回执（坑 deps-gate-cleanup-order，2026-08-28 实证：cleanup 后重试 --done 被
            // deps 门拦「worktree 不可用」，逼 doctor --align-execute-progress 手工对齐）：execute 完成时的
            // 正当清理（无未应用变更）落 durable 标记，enforceDepsGate 读它区分「正当收尾」与「意外丢失」。
            // apply 路径不写——apply-pathspec-<change>.txt 已是既定 apply 凭据，双标记冗余。
            if (['cleaned', 'force-cleaned', 'partial'].includes(cleanResult.result.result)) {
              try {
                const runtimeDir = join(cwd, '.sillyspec', '.runtime');
                mkdirSync(runtimeDir, { recursive: true });
                writeFileSync(join(runtimeDir, `execute-cleanup-${changeName}.json`), JSON.stringify({
                  change: changeName, cleanedAt: new Date().toISOString(),
                  reason: 'execute-completed-no-unapplied-changes',
                }, null, 2) + '\n', 'utf8');
              } catch { /* 回执失败只损失 deps 门的放行判据，不影响 cleanup 结果 */ }
            }
            if (cleanResult.result.residual?.length > 0) {
              console.warn(`   ⚠️ 清理残留: ${cleanResult.result.residual.join('; ')}`);
              console.warn(`   手动处理: sillyspec worktree cleanup ${changeName} --force`);
            } else if (cleanResult.result.details?.length > 0) {
              for (const d of cleanResult.result.details) {
                if (d.startsWith('⚠️')) console.log(`   ${d}`);
              }
            }
          }
        } catch (lockErr) {
          if (/互斥锁被占用/.test(String(lockErr.message))) {
            console.log(`🔗 Worktree 自动清理跳过（主仓互斥锁被他者会话持有）——稍后手动: sillyspec worktree cleanup ${changeName}`);
          } else {
            console.warn(`⚠️ worktree 清理异常（不阻断）: ${lockErr.message}`);
          }
        }
      }
    } catch (e) {
      console.warn(`🔗 Worktree: check failed — ${e.message}`);
    }
    // 跨仓 worktree（坑 cross-repo-no-worktree-isolation）：execute 完成时不自动清——交付还在
    // 跨仓 worktree 分支上未回落主工作副本，与主仓「pending apply」同语义，报状态 + 下一步指引
    try {
      const { listCrossWorktreeMetas } = await import('../worktree-cross.js')
      const specBase = join(cwd, '.sillyspec')
      for (const { repoKey, meta: cm } of listCrossWorktreeMetas(specBase, changeName)) {
        let pending = 0
        try {
          const d = safeGit(cm.worktreePath, ['diff', '--name-only', cm.baseHash], { timeout: 30000 })
          const u = safeGit(cm.worktreePath, ['ls-files', '--others', '--exclude-standard'], { timeout: 30000 })
          pending = ((d.value || '') + '\n' + (u.value || '')).split('\n').filter(Boolean).length
        } catch { /* 状态探测失败按未知处理 */ }
        if (pending > 0) {
          console.log(`🔗 跨仓 worktree repo=${repoKey}: pending apply (${pending} 个未回落变更)`)
          console.log(`   下一步: sillyspec worktree apply ${changeName}（跨仓与主仓一并回落）`)
        } else {
          console.log(`🔗 跨仓 worktree repo=${repoKey}: 无未回落变更（apply 时将自动清理）`)
        }
      }
    } catch { /* 跨仓状态报告 best-effort */ }
  }
  return null
}
/**
 * scan 阶段完成后处理（W6 Step6d 从 completeStep 完成路径内联块抽出）：
 *   - 平台模式（specRoot/runtimeRoot）：写 manifest.json + 跑 scan-postcheck + 结构化结果 +
 *     更新平台指针（SCAN_COMPLETED）+ failed_post_check 阻断（exit 1 / early-return）
 *   - 非平台模式：轻量 postcheck + 结构化结果写 .runtime/
 * 返回 early-return 对象（platform failed_post_check 非 exit 路径）由 completeStep 透传；null = 放行。
 *
 * ctx：stageName/currentIdx/cwd/progress/pm/stageData/changeName/outputText/platformOpts。
 * safeGit/triggerSync ← shared；writeAtomicSync ← fs-atomic；SCAN_STATUS/POINTER_STATUS ← constants；
 * mkdirSync/writeFileSync/readFileSync/unlinkSync/join ← 顶部静态；runScanPostCheck 等 ← 动态 ../scan-postcheck.js。
 *
 * 搬迁清理：删 4 个冗余动态 builtin import（fs/path/child_process，execSync 死代码）+ _readFileSync 别名改回 readFileSync。
 */
export async function handleScanStageCompleted({ stageName, currentIdx, cwd, progress, pm, stageData, changeName, outputText, platformOpts }) {
  // 平台模式：scan 完成后生成 manifest.json + post-check
  if (stageName === 'scan' && (platformOpts.specRoot || platformOpts.runtimeRoot)) {
    if (!platformOpts.specRoot) {
      // 只传 runtimeRoot 无 specRoot（command.js 允许的组合）：manifest 无处落盘。
      // 显式 fail-closed 报错——此前 mkdirSync(null) 抛 TypeError 被外层 catch 吞掉，
      // postcheck/指针升级/阻断全部静默跳过，scan 失败也"干净成功"（体检 BUG-12）
      console.error(`❌ 平台模式缺少 --spec-root，无法写 manifest.json（scan postcheck 中止）`)
      stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = false
      stageData.scanMeta.manifestError = 'missing specRoot'
      return
    }
    try {
      stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = false; // 默认失败
      const manifestDir = platformOpts.specRoot
      mkdirSync(manifestDir, { recursive: true })
      let sourceCommit = null
      let sourceCommitError = null
      try {
        const gitResult = safeGit(cwd, ['rev-parse', 'HEAD'])
        sourceCommit = gitResult.value
        sourceCommitError = gitResult.error
      } catch (e) {
        sourceCommitError = e.message
      }
      const manifest = {
        workspace_id: platformOpts.workspaceId || null,
        scan_run_id: platformOpts.scanRunId || null,
        source_root: cwd,
        spec_root: platformOpts.specRoot || null,
        runtime_root: platformOpts.runtimeRoot || null,
        source_commit: sourceCommit,
        source_commit_error: sourceCommit === null ? (sourceCommitError || 'unknown') : undefined,
        generated_at: new Date().toISOString(),
        schema_version: 1,
        scan_profile: stageData.scanProfile
          ? { mode: stageData.scanProfile.mode, reason: stageData.scanProfile.reason }
          : null,
        postcheck_result_path: null,
        workflow_runs_dir: platformOpts.runtimeRoot
          ? join(platformOpts.runtimeRoot, 'scan-runs', platformOpts.scanRunId || 'unknown', 'workflow-runs')
          : null,
        platform_pointer_path: join(cwd, '.sillyspec-platform.json'),
        platform_pointer_status: POINTER_STATUS.ACTIVE,
      }
      const manifestPath = join(manifestDir, 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`📄 manifest.json 已写入: ${manifestPath}`)
      stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = true;
      if (!sourceCommit) {
        console.log(`⚠️  source_commit 无法获取（可能非 git 目录），已设为 null`)
      }
      // 清理平台参数临时文件
      const platformOptsFile = join(manifestDir, '.runtime', 'platform-scan.json')
      try { unlinkSync(platformOptsFile) } catch {}

      // CLI 层 post-check（替代旧的简单检查）
      const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult, stampScanDocHeaders } = await import('../scan-postcheck.js')
      // ② frontmatter CLI 盖章（2026-09-05，幂等兜底——正常已在 scanFinalize / quick postcheck 盖过）
      stampScanDocHeaders({ cwd, specDir: platformOpts.specRoot, mode: stageData.scanProfile?.mode })
      const postResult = runScanPostCheck({
        cwd,
        specDir: platformOpts.specRoot,
        outputText,
        scanMeta: {
          projectListParsed: stageData.scanMeta?.projectListParsed ?? null,
          manifestWritten: stageData.scanMeta?.manifestWritten ?? null,
        },
        scanProfile: stageData.scanProfile || null,
      })
      printScanPostCheckResult(postResult)

      // 生成结构化 JSON 并写入 runtime（供 SillyHub 消费）
      const structured = formatStructuredResult(postResult, {
        workspace_id: platformOpts.workspaceId,
        scan_run_id: platformOpts.scanRunId,
        source_root: cwd,
        spec_root: platformOpts.specRoot,
        runtime_root: platformOpts.runtimeRoot,
      })
      const postcheckJsonPath = writeStructuredResult(structured, platformOpts.specRoot, {
        runtimeRoot: platformOpts.runtimeRoot,
        scanRunId: platformOpts.scanRunId,
      })
      if (postcheckJsonPath) {
        console.log(`📄 postcheck-result.json 已写入: ${postcheckJsonPath}`)
        manifest.postcheck_result_path = postcheckJsonPath
      }

      // 将 post-check 结果写入 manifest
      manifest.scan_post_check = {
        status: postResult.status,
        checks: postResult.checks,
      }
      // 更新 manifest
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`📄 manifest.json 已更新（含 post-check 结果）`)

      // 更新平台指针状态为 scan_completed
      const pointerPath = join(cwd, '.sillyspec-platform.json')
      try {
        const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'))
        pointer.status = POINTER_STATUS.SCAN_COMPLETED
        pointer.completedAt = new Date().toISOString()
        pointer.scanStatus = postResult.status
        writeAtomicSync(pointerPath, JSON.stringify(pointer, null, 2) + '\n')
      } catch (e) {
        // 不阻断 scan 主流程，但暴露失败——pointer 写失败会让平台看不到 scan_completed，
        // 与项目 fail-loud 原则一致：宁可可见地 warn，也不静默吞错。
        console.warn(`⚠️ 更新平台指针状态失败（scan_completed 可能未落盘）: ${e.message}`)
      }

      // failed_post_check 时强制阻止 clean success
      if (postResult.status === 'failed_post_check') {
        stageData.status = SCAN_STATUS.FAILED_POST_CHECK
        stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
        pm._write(cwd, progress, changeName)
        triggerSync(cwd, changeName, platformOpts)
        console.error(`\n❌ scan post-check 失败，状态设为 failed_post_check。不允许 clean success。`)
        console.error(`   请检查上方错误信息并修复后重新 scan。`)
        // 平台模式：exit(1) 让 daemon/SillyHub 感知非 0 退出码（manifest.json 已落盘，不会被撤销）
        if (platformOpts.specRoot || platformOpts.runtimeRoot) {
          console.error('   平台模式：CLI 将以 exit code 1 退出，通知 SillyHub scan 失败。')
          process.exit(1)
        }
        // 接口与 plan contract (run.js:2551 附近 plan 失败分支) 对齐：
        // 返回 { stageCompleted:false, currentIdx, nextPendingIdx: currentIdx }
        // 让上层 runStage 走"完成但不推进"分支，--done 被拒
        return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
      } else if (postResult.status === 'completed_with_warnings') {
        // 警告不阻止完成，但记录
        stageData.status = 'completed'
        stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
        pm._write(cwd, progress, changeName)
      }
    } catch (e) {
      console.warn(`⚠️  manifest.json 写入失败: ${e.message}`)
    }
  }

  // 非 platform 模式 scan 也做轻量 post-check + 结构化输出
  if (stageName === 'scan' && !platformOpts.specRoot && !platformOpts.runtimeRoot) {
    const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult, stampScanDocHeaders } = await import('../scan-postcheck.js')
    // ② frontmatter CLI 盖章（2026-09-05，幂等兜底）
    stampScanDocHeaders({ cwd, specDir: null, mode: stageData.scanProfile?.mode })
    const postResult = runScanPostCheck({ cwd, specDir: null, outputText, scanProfile: stageData.scanProfile || null })
    printScanPostCheckResult(postResult)
    // 结构化结果写入 .sillyspec/.runtime/
    const structured = formatStructuredResult(postResult, { source_root: cwd })
    const postcheckJsonPath = writeStructuredResult(structured, join(cwd, '.sillyspec'))
    if (postcheckJsonPath) {
      console.log(`📄 postcheck-result.json 已写入: ${postcheckJsonPath}`)
    }
  }
  return null
}

// ── task-06（2026-09-10-change-scope-audit，FR-04）：quick 文件行/审计行 numstat 行数注入 ──
// collectNumstatByPath 与 scope-audit 命令同源采集（D-003 单一真相；R-03 单次 git 调用非逐文件）。
// 基点 'HEAD' = 未提交工作区窗口（D-004：quick 无 merge-base 锚，对未提交窗口采集语义自洽；
// untracked 新文件 wc-l 记全 + 行、binary 显 BIN）。纯展示列（advisory，D-006）：采集失败/行数
// 不可得 → 括注省略不出伪数据；不改 auditQuickCompletion 判定、runQuickTestLintGate 与任何门禁。
// 放文件尾（函数声明提升）而不内联进 handleQuickStageCompletion：docs/platform-interface-map
// 行号锚在上方（complete-handlers.js:1695 handleScanStageCompleted），内联大块会把 doc-ref 锚
// 推出关键词窗口。
//
// 消费分工（调用方 quick 收尾）：
//   - annotatedRealFiles → completeQuicklogEntry changedFiles（QUICKLOG「文件：」行/bullet 带括注；
//     fileNotes 模式下 realFiles 本就不渲染，括注只出现在回退渲染面）
//   - annotatedSoftFiles → 🔍 软归属审计行 + console；softFiles 传参保持**裸路径**——
//     flipEntryInContent 用它与 fileNotes.path 精确等值去重（带括注会不等值 → 同文件双 bullet）
//   - fmtLineCounts → ⚖️ 归属切分审计行逐文件括注（降级返回空串 → 原样不带）
//   - 已提交降级（D-004）：窗口空（改动已 commit/会话未产生改动）且 QUICKLOG 条目已存在 →
//     记录态提示读 QUICKLOG 条目文件行，不以空表冒充实时（与 scope-audit quick 模式 note 同口径）
function attachQuickLineCounts({ cwd, realFiles, softFiles, review, auditFiles, qlId }) {
  const posix = (f) => String(f).replace(/\\/g, '/')
  const lineCountFiles = [...new Set([...(realFiles || []).map(posix), ...(softFiles || [])])]
  let numstatByPath = new Map()
  if (lineCountFiles.length > 0) {
    try {
      numstatByPath = collectNumstatByPath(cwd, lineCountFiles, { baseRef: 'HEAD' })
    } catch { /* 采集异常 → 行数列整体降级省略（fail-soft） */ }
  }
  const fmtLineCounts = (f) => {
    const st = numstatByPath.get(posix(f))
    if (!st) return ''
    if (st.kind === 'binary') return '（BIN）'
    if (!Number.isFinite(st.additions) || !Number.isFinite(st.deletions)) return ''
    return `（+${st.additions}/-${st.deletions}）`
  }
  const annotatedRealFiles = (realFiles || []).map(f => `${f}${fmtLineCounts(f)}`)
  const annotatedSoftFiles = (softFiles || []).map(f => `${f}${fmtLineCounts(f)}`)
  if (lineCountFiles.length > 0) {
    console.log(`📊 变更行数（vs HEAD 未提交窗口）：${[...annotatedRealFiles, ...annotatedSoftFiles].join(', ')}`)
  } else if (review && Array.isArray(auditFiles) && auditFiles.length === 0) {
    console.log(`ℹ️ 本会话无未提交改动（窗口已提交或会话未产生改动）——实时行数不可采，文件行请读 QUICKLOG 条目 ${qlId}（记录态）`)
  }
  return { annotatedRealFiles, annotatedSoftFiles, fmtLineCounts }
}

// ── 知识闭环收尾渲染（2026-09-14-knowledge-loop-close task-03，FR-01/FR-03）──
// 放文件尾（函数声明提升，同 attachQuickLineCounts 先例）：归类提议/棘轮渲染挂在 quick --done 与
// archive 收尾两处，插码位置受 concurrent-preflight-hooks.test.mjs B1 源码文本级断言窗口约束
// （detectConcurrentChanges ±[200,600] 字符内禁 process.exit、须保 try/catch）——实现收拢在此，
// 调用点只留小段调用，避免大段内联把断言锚推出窗口。全段 fail-open：任何异常只吞不阻断收尾。

/**
 * 数 knowledge/uncategorized.md 待归类条目数。计数正则与 `sillyspec knowledge` validate 同款
 * /^#{2,3}\s+\S/gm（X-010 口径对齐，防双数字打架）；文件缺失算 0（未启用知识库的仓不警告）。
 * 已 export 供 test/knowledge-baseline.test.mjs 直接断言计数口径。
 */
export function countUncategorizedEntries(knowledgeDir) {
  const uncPath = join(knowledgeDir, 'uncategorized.md')
  if (!existsSync(uncPath)) return 0
  try {
    return (readFileSync(uncPath, 'utf8').match(/^#{2,3}\s+\S/gm) || []).length
  } catch {
    return 0
  }
}

/**
 * 读 .sillyspec/knowledge-baseline 单整数（uncategorized 条数上限，语义/读写形态对齐
 * docs-check-baseline：trim 后 parseInt，非负整数才有效）。缺失/不可解析 → null（未启用）。
 */
function readKnowledgeBaseline(specBase) {
  try {
    const baselinePath = join(specBase, 'knowledge-baseline')
    if (!existsSync(baselinePath)) return null
    const n = parseInt(readFileSync(baselinePath, 'utf8').trim(), 10)
    return Number.isInteger(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

/**
 * knowledge-baseline 棘轮三态对比（FR-03/R-05）：
 *   - 基线缺失 → { status:'disabled' }（未启用，调用方零输出零写盘）
 *   - count > baseline → { status:'over' }（软警告，不阻断——棘轮起步只警告）
 *   - count < baseline → 自动收紧：基线文件改写为当前值（writeAtomicSync，Windows 兼容），
 *     → { status:'tightened' }；写盘失败降级 steady（下次收尾再试，不谎报收紧）
 *   - count == baseline → { status:'steady' }
 * 已 export 供 test/knowledge-baseline.test.mjs 断言三态与收紧副作用。
 */
export function checkKnowledgeBaselineRatchet(specBase) {
  const baseline = readKnowledgeBaseline(specBase)
  const count = countUncategorizedEntries(join(specBase, 'knowledge'))
  if (baseline === null) return { status: 'disabled', count, baseline: null }
  if (count > baseline) return { status: 'over', count, baseline }
  if (count < baseline) {
    try {
      writeAtomicSync(join(specBase, 'knowledge-baseline'), `${count}\n`)
      return { status: 'tightened', count, baseline }
    } catch {
      return { status: 'steady', count, baseline }
    }
  }
  return { status: 'steady', count, baseline }
}

/**
 * 棘轮对比 + console 渲染（quick --done 与 archive 收尾共用）：over → ⚠️ 软警告（条数 +
 * 建议 knowledge classify 清单，不阻断不抛错）；tightened → 📉 单行留痕；disabled/steady
 * 零输出。自身 try/catch fail-open（R-05：棘轮误伤的兜底就是什么都不做）。
 */
function renderKnowledgeBaselineRatchet(specBase) {
  try {
    const r = checkKnowledgeBaselineRatchet(specBase)
    if (r && r.status === 'over') {
      console.warn(`\n⚠️  knowledge/uncategorized.md 待归类 ${r.count} 条，超 knowledge-baseline 基线 ${r.baseline}（软警告不阻断）`)
      console.warn(`   建议跑 sillyspec knowledge classify 逐条归类（待归类清单见 knowledge/uncategorized.md），条数降后基线自动收紧。`)
    } else if (r && r.status === 'tightened') {
      console.log(`📉 knowledge-baseline 已自动收紧：${r.baseline} → ${r.count}（uncategorized 待归类条数下降）`)
    }
  } catch { /* 棘轮渲染失败零副作用（fail-open，R-05） */ }
}

/** 根因「无，纯新增/纯样式」形态：无坑可归，归类提议不渲染（拿不准不写）。 */
const PURE_NEW_CAUSE_RE = /^无(?:[，,].*)?$/

/**
 * 从 quick --done 四字段 outputText 提取「根因：」字段值（归类提议的查询串来源；进程内已过
 * validateQuickResult 校验，免读回盘）。多行字段块与单行压缩形态都支持；根因块内嵌套子字段
 * 列表行（- 现象：/- 根因： 等 D-004@v1 合法形态）随正文保留——只是匹配查询串，多文本无害。
 * 提取失败/无根因字段返回 ''。已 export 供测试断言提取口径。
 */
export function extractQuickCauseField(outputText) {
  const text = String(outputText || '')
  const m = text.match(/根因\s*[：:]\s*([\s\S]*?)(?=(?:^|\n|\s)(?:方案|结果)\s*[：:]|$)/)
  if (!m) return ''
  return m[1].replace(/\s+/g, ' ').trim()
}

// ── Wave 步骤完成度门（2026-09-17-pass-cap-semantics task-08 / FR-12 / D-013@v1）──
// 动机锚：2026-09-17 本变更执行中 Wave 2 越位实证——review write 退出码被 shell 管道吞掉后
// --done 落在下一 Wave，「Wave 2 执行」步骤被静默标 completed；既有防护（--step 意图断言
// 可选、并发 60s 横幅仅 warn）均非阻断。本门 fail-closed 补执行期缺口，放文件尾（函数声明
// 提升 + B1 源码文本级断言窗口约束，同知识闭环段先例——门内含 process.exit，收拢在此避免
// 推挪 handleQuickStageCompletion 附近 detectConcurrentChanges ±[200,600] 的断言锚）。

/**
 * 解析 plan.md 第 seq 个显式 Wave 段的任务 ID 列表。
 *
 * 同源口径孪生（不造第二套解析）：src/stages/execute.js 的 parseWavesFromPlan 未导出，且
 * execute.js 不在本任务 allowed_paths，无法直接 import——正则与段边界守卫逐字对齐：
 *   - Wave 标题 /^#+\s*Wave\s*(\d+)/i（空格可选、编号后缀任意——解析侧宁可多收不可静默丢）
 *   - 引用行 /^[-*]\s+task-(\d+)\s*$/i → 归一 task-NN（padStart(2,'0')）
 *   - 任何非 Wave 标题行（/^#{1,6}\s+/）退出当前段（「## 自检」等后续段的行不收）
 *   - 段序 = 出现顺序（buildExecuteSteps 的步骤名 `Wave ${i+1} 执行` 取 waves 数组位次，
 *     非段内编号——显式段存在时两者通常一致，乱序编号时位次与 prompt 实际下发任务一致）
 * 差异（有意）：不做 parseWavesFromPlan 的隐式 Wave 合成——门只核对显式段，plan 无显式段
 * 一律 null 交由调用方 warn 放行（D-003@v1 隐式串行语义无段可核对，不误伤）。
 * 漂移风险由 test/wave-task-complete-gate.test.mjs 断言锁定。
 *
 * @param {string} planContent plan.md 全文
 * @param {number} seq 1-based 显式段位次（步骤名编号同源）
 * @returns {string[]|null} 该段 task ID 列表；null = 显式段不足 seq 个（隐式/light/兜底形态）
 */
function parseExplicitWaveTaskIds(planContent, seq) {
  const WAVE_HEADING_RE = /^#+\s*Wave\s*(\d+)/i   // ← execute.js parseWavesFromPlan 同源正则
  const waveRefRe = /^[-*]\s+task-(\d+)\s*$/i     // ← execute.js parseWavesFromPlan 同源正则
  const sections = []   // [{ index, ids }] 按出现顺序（不合成隐式 Wave）
  let current = null
  for (const rawLine of String(planContent || '').split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const waveMatch = line.match(WAVE_HEADING_RE)
    if (waveMatch) {
      current = { index: parseInt(waveMatch[1], 10), ids: [] }
      sections.push(current)
      continue
    }
    if (/^#{1,6}\s+/.test(line)) { current = null; continue }
    const refMatch = line.match(waveRefRe)
    if (refMatch && current) current.ids.push(`task-${refMatch[1].padStart(2, '0')}`)
  }
  const target = sections[seq - 1]
  return target ? target.ids : null
}

/**
 * Wave 步骤完成度门（task-08 / FR-12 / D-013@v1）：execute 阶段名为「Wave N 执行」的步骤
 * --done 时 fail-closed 核对本 Wave 全部 task 的 tasks.md checkbox 已勾（勾选唯一真源是
 * CLI：review write 落盘即勾 + autoCheckPlanFromReviews 兜底）。任一未勾 → console.error
 * 列未勾清单与两条出路 + process.exit(1)，步骤保持待完成（接线点在 completeStep 的
 * status='completed' 赋值之前，exit 时 DB 不落假完成态）。
 *
 * 生效面与放行面：
 *   - 仅 steps[currentIdx].name 匹配 /^Wave (\d+) 执行$/ 时生效，其他步骤名直接 return（零行为）
 *   - ① autoCheckPlanFromReviews 幂等先行（review pass 自动勾选——先补勾再核对，「review 已
 *     pass 但 checkbox 未回填」形态不误拦；该函数自身全路径 try/catch 从不抛）
 *   - plan.md 无第 N 个显式 Wave 段（隐式 Wave/light 计划）→ warn 放行（D-003@v1 不误伤）
 *   - plan.md/tasks.md 缺失或读取失败 → warn 放行（fail-open，文档瞬态不锁死流程）
 *   - 门自身意外异常不在本函数内吞——上抛给接线层（complete.js）fail-open warn 放行；
 *     正常判定路径（读到未勾）必须硬拦，process.exit 不受 try/catch 影响
 *
 * @param {{ steps: Array<{name:string}>, currentIdx: number, changeName: string, cwd: string, specBase?: string, platformOpts?: object }} opts
 *   changeDir 锚定与 autoCheckPlanFromReviews 写入侧同口径（driftAnchor > specRoot > specBase >
 *   cwd/.sillyspec）——tasks.md 是 autoCheck 写的，门必须读同一份，防双真源分裂。
 */
export async function assertWaveTasksComplete({ steps, currentIdx, changeName, cwd, specBase, platformOpts = {} }) {
  const stepName = String(steps?.[currentIdx]?.name || '')
  const waveMatch = /^Wave (\d+) 执行$/.exec(stepName)
  if (!waveMatch) return   // 非「Wave N 执行」步骤：零行为（其他 execute 步骤 / 其他阶段不门）
  const waveSeq = parseInt(waveMatch[1], 10)
  if (!changeName || !cwd) {
    console.warn(`⚠️ [wave-complete-gate] 缺 changeName/cwd，跳过「${stepName}」完成度核对（fail-open）`)
    return
  }

  // ① autoCheck 幂等先行（D-013）：兜底 catch 仅防动态 import 自身失败——warn 后继续核对
  //   （checkbox 才是门的判定依据；勾选补偿失败留给两条出路①重跑 --done 再试，不锁死）。
  //   autoCheckPlanFromReviews 定义于 ./complete.js（grep 实证 :1172 export；任务卡原文写
  //   ../task-review.js 系定位笔误，该文件仅有引用注释无定义）；动态 import 防顶层环
  //   （complete.js 静态 import 本文件，运行时调用时 complete.js 已在模块缓存，无死锁）。
  try {
    const { autoCheckPlanFromReviews } = await import('./complete.js')
    await autoCheckPlanFromReviews({ stageName: 'execute', changeName, cwd, platformOpts })
  } catch (e) {
    console.warn(`⚠️ [wave-complete-gate] autoCheck 先行勾选失败，按 tasks.md 现状继续核对: ${(e && e.message) || e}`)
  }

  const gateSpecBase = platformOpts?.specDriftAnchor || platformOpts?.specRoot || specBase || join(cwd, '.sillyspec')
  const changeDir = join(gateSpecBase, 'changes', changeName)
  const planPath = join(changeDir, 'plan.md')
  const tasksPath = join(changeDir, 'tasks.md')

  let planContent, tasksContent
  try {
    if (!existsSync(planPath) || !existsSync(tasksPath)) {
      console.warn(`⚠️ [wave-complete-gate] plan.md/tasks.md 缺失（${changeDir}），跳过「${stepName}」完成度核对（fail-open 放行）`)
      return
    }
    planContent = readFileSync(planPath, 'utf8')
    tasksContent = readFileSync(tasksPath, 'utf8')
  } catch (e) {
    console.warn(`⚠️ [wave-complete-gate] plan.md/tasks.md 读取失败（${(e && e.message) || e}），跳过核对（fail-open 放行）`)
    return
  }

  // ② 本 Wave 任务 ID 列表（parseExplicitWaveTaskIds：execute.js parseWavesFromPlan 同源孪生）
  const waveTaskIds = parseExplicitWaveTaskIds(planContent, waveSeq)
  if (waveTaskIds === null) {
    console.warn(`⚠️ [wave-complete-gate] plan.md 无第 ${waveSeq} 个显式 Wave 段（隐式 Wave/light 计划无显式段头），跳过完成度核对（fail-open 放行——D-003@v1 隐式串行语义不误伤）`)
    return
  }
  if (waveTaskIds.length === 0) {
    // 段在但无引用行：execute 启动时 validatePlanForExecute 已拦（空 Wave 段诊断），不重复拦
    return
  }

  // ③ tasks.md checkbox 逐 ID 核对（parseTaskRegistry 是 execute.js 导出的同源解析，复用不另造）
  const { parseTaskRegistry } = await import('../stages/execute.js')
  const registry = parseTaskRegistry(tasksContent)
  const regById = new Map(registry.map(t => [t.id, t]))
  const unchecked = waveTaskIds.filter(id => regById.get(id)?.done !== true)

  if (unchecked.length > 0) {
    // ④ fail-closed 硬拦：沿用仓内 console.error + process.exit(1) 既有形态（错误信息
    //    process.exit 前同步打印完整——Windows 下 UV_HANDLE_CLOSING 退出码坑不复现）
    console.error(`❌ Wave ${waveSeq} 完成度门未过：本 Wave ${waveTaskIds.length} 个 task 中 ${unchecked.length} 个的 tasks.md checkbox 未勾——本次 --done 未完成，步骤「${stepName}」保持待完成。`)
    console.error('   未勾任务：')
    for (const id of unchecked) {
      const reg = regById.get(id)
      console.error(`   - ${id}${reg && reg.name ? `（${reg.name}）` : '（tasks.md 注册表无此行——plan 悬空引用）'}`)
    }
    console.error('   两条出路：')
    console.error(`   ① 任务确未完成：补实现与 review write（sillyspec review write --change ${changeName} --task <task-NN> --spec pass --quality pass --force --changed-files <文件>）后重跑 --done——review pass 落盘即自动勾选`)
    console.error(`   ② 确属误推进（步骤被越位标完成）：sillyspec run execute --reopen --from-step ${currentIdx + 1}${changeName ? ` --change ${changeName}` : ''} 退回本步重走完成`)
    process.exit(1)
  }
  console.log(`🛡️ 「${stepName}」完成度门通过：${waveTaskIds.length} 个 task checkbox 全勾（${waveTaskIds.join('、')}）`)
}

/**
 * Ceremony 双跑收口·第二出口（2026-09-18-ceremony-risk-pricing task-04 / FR-03 / D-003）：
 * archive confirm（--confirm 已过）目录移动前，与 verify --done 出口同款检查函数对账——
 * 实际 diff 经 resolveReconcileActualFiles 单点重跑 blast+span，vs .runtime/ceremony-tier-
 * <change>.json 开跑声明档。mismatch → 阻断级警告（⛔ console.error 列声明档/事实档/超阈
 * 分量）+ 摩擦账 + 事实面预价种子——但只警告不回滚归档步骤（archive=终态铁律，D-006 防复潮：
 * 不 reopen、不改归档终态语义，与上方 db 门「回 pending 阻断」刻意不同形）。显式降级被
 * 事实面支持 → 放行并在 warning 披露（D-004）；skipped（档位文件缺失等）/ degraded
 * （git 不可用）零噪音放行；检查整体 fail-soft，异常降级放行不阻断归档。
 *
 * 检查实现 + 记账 + 种子全部收敛在 verify-postcheck.runCeremonyDualRunCheck 单点（两出口
 * 同一实现），本函数只做接线 + 会话标识（resolveSessionIdentity 同 :604 所有权护栏三级口径：
 * --session > env > anon@host；warn:false——机器消费路径，教学 warning 归所有权护栏面）。
 * 动态 import 是 gates.js 消费 verify-postcheck 的既有防环形态（verify-probes 闭包含
 * run/shared）。实现放文件尾与 assertWaveTasksCompleted 同一考量：platform-interface-map.md
 * 锚 handleScanStageCompleted 于 [2216,2223] 行窗（doc-ref-check 层2），handleArchiveConfirmStep
 * 内联大块会把锚推出窗口——调用点只留两行，注释与实现全落此处。
 */
async function runArchiveCeremonyDualRunExit({ cwd, specBase, changeName, platformOpts = {}, sessionFlag = null, progress = null }) {
  try {
    const { runCeremonyDualRunCheck, printCeremonyDualRunCheck } = await import('../verify-postcheck.js')
    const ceremonyChangeName = (progress && progress.currentChange) || changeName
    if (!ceremonyChangeName) return
    const { session: ceremonySession } = resolveSessionIdentity({ flagSession: sessionFlag || null, cwd, warn: false })
    const ceremonyCheck = await runCeremonyDualRunCheck({
      cwd, specBase, changeName: ceremonyChangeName,
      runtimeRoot: resolveRuntimeRoot(platformOpts, specBase),
      session: ceremonySession,
    })
    printCeremonyDualRunCheck(ceremonyCheck)
  } catch (e) {
    console.warn(`⚠️  Ceremony 双跑对账异常降级放行（不阻断归档，fail-soft）: ${(e && e.message) || e}`)
  }
}


// ── quick 资产尾（2026-09-20-quick-asset-tail，D-001/D-002/D-004）─────────────────

/**
 * lite 归档（D-004）：薄通道（brainstorm→linked quick）变更的轻量收口——所有权 assert →
 * 命名 → rename → unregisterChange。不复用 archiveChangeDirectory 的 9 处重门（未 apply
 * 交付面等 worktree 导向，linked quick 变更无 worktree 语义会被误拦）；重件
 * （module-impact/ROADMAP/delta）明确豁免。自愈：源目录缺失但已在 archive/ 时补
 * unregister 不留永久 skipped（与重路径 586-604 同款语义）。
 * @returns {Promise<{archivedTo: string}|{skipped: string}>}
 */
export async function liteArchiveChange({ pm, cwd, specBase, changeName, platformOpts = {} }) {
  const changesDir = join(specBase, 'changes')
  const archiveDir = join(changesDir, 'archive')
  const srcDir = join(changesDir, changeName)
  // 所有权（同重路径语义：他人活跃拒；self/stale/forced 放行并接管）
  const { session } = resolveSessionIdentity({ flagSession: platformOpts.sessionFlag || null, cwd })
  const check = pm.assertChangeOwnership(cwd, changeName, { selfSession: session, nowMs: Date.now() })
  if (!check.allowed) return { skipped: `所有权拒（owner=${check.owner}，活跃窗内）` }
  if (check.action !== 'self') pm.setChangeOwner(cwd, changeName, session)
  // 自愈：目录已被手动/前次部分流程移到 archive/ → 只补 unregister（不留永久 desync）
  if (!existsSync(srcDir)) {
    // lite 变更目录常无 plan.md（findAlreadyArchivedDir 精确命中的硬条件）——本场景放宽：
    // archive/ 下有以变更名为末段的目录且含 requirements.md 或 decisions.md 即认自愈
    const already = (() => {
      try {
        const entries = readdirSync(archiveDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
        const hit = entries.find(e => (e === changeName || e.endsWith('-' + changeName)) &&
          (existsSync(join(archiveDir, e, 'requirements.md')) || existsSync(join(archiveDir, e, 'decisions.md'))))
        return hit ? join(archiveDir, hit) : null
      } catch { return null }
    })()
    if (already) {
      pm.unregisterChange(cwd, changeName, { archiveStepNames: typeof pm.archiveStepNamesForArchive === 'function' ? pm.archiveStepNamesForArchive() : null })
      console.log(`📦 lite 自愈归档：${changeName} 已在 archive/（${basename(already)}），补注销 DB 行`)
      return { archivedTo: already }
    }
    return { skipped: `源目录不存在且 archive/ 无此变更（requirements/decisions 均缺的空关联）` }
  }
  const destName = archiveDestDirName(new Date().toISOString().slice(0, 10), changeName)
  const destDir = join(archiveDir, destName)
  mkdirSync(archiveDir, { recursive: true })
  renameSync(srcDir, destDir) // 先 rename 后 unregister：失败时 change 留 active 可重试（D-004 顺序保证）
  pm.unregisterChange(cwd, changeName, { archiveStepNames: typeof pm.archiveStepNamesForArchive === 'function' ? pm.archiveStepNamesForArchive() : null })
  console.log(`📦 lite 归档：${changeName} → archive/${destName}/（薄通道轻收口：蒸馏已先行，module-impact/ROADMAP 豁免）`)
  return { archivedTo: destDir }
}

/**
 * 薄通道蒸馏尾（D-001/D-002）：quick --done 门禁过后对 linked 真变更（非 quick-<hex>）跑
 * decision-distill + fr-index（均幂等）→ lite 归档。挂点在质量闸后（D-002：防未实现设计进
 * 索引——quick 中途废弃永不 --done 永不蒸馏）；两文件均缺失零打扰跳过；fail-open 全链
 * （任何异常 warn 留痕不拦 quick 完成）。
 * @returns {Promise<{distilled: boolean, frCount: number, decisionCount: number, archived: boolean, warnings: string[]}>}
 */
export async function distillLinkedChangeAssets({ pm, cwd, specBase, changeName, linkedChanges = [], platformOpts = {} }) {
  const out = { distilled: false, frCount: 0, decisionCount: 0, archived: false, warnings: [] }
  const realChanges = (linkedChanges || []).filter((c) => c && !QUICK_SID_RE.test(c))
  if (realChanges.length === 0) return out // 纯 quick：无关联真变更，零打扰
  try {
    const knowledgeRoot = join(specBase, 'knowledge')
    let anyDistilled = false
    for (const linked of realChanges) {
      const changeDir = join(specBase, 'changes', linked)
      if (!existsSync(changeDir)) { out.warnings.push(`linked 变更目录缺失：${linked}`); continue }
      const hasReqs = existsSync(join(changeDir, 'requirements.md'))
      const hasDecisions = existsSync(join(changeDir, 'decisions.md'))
      if (!hasReqs && !hasDecisions) continue // quick/scale:small 无索引义务（fr-index 既有语义对齐）
      // 决策蒸馏（decisions.md → knowledge/decisions/，幂等；无文件内部自跳过）
      if (hasDecisions) {
        try {
          const { distillIntoKnowledge } = await import('../decision-distill.js')
          const r = distillIntoKnowledge(changeDir, knowledgeRoot, '')
          const writtenCount = r && Array.isArray(r.written) ? r.written.length : 0
          if (writtenCount > 0) { out.decisionCount += writtenCount; anyDistilled = true }
        } catch (e) { out.warnings.push(`decision-distill ${linked} 异常跳过：${e && e.message ? e.message : e}`) }
      }
      // FR 索引（requirements.md → knowledge/fr/，幂等：同变更名 no-op）
      if (hasReqs) {
        try {
          const { indexRequirements } = await import('../fr-index.js')
          const r = indexRequirements({ changeDir, knowledgeRoot, headHash: '' })
          if (r && Array.isArray(r.written) && r.written.length > 0) { out.frCount += r.written.length; anyDistilled = true }
        } catch (e) { out.warnings.push(`fr-index ${linked} 异常跳过：${e && e.message ? e.message : e}`) }
      }
    }
    out.distilled = anyDistilled
    // lite 归档（蒸馏后；仅四件套容器变更——requirements.md 在场=brainstorm 承接的薄通道形态；
    // 纯信号自动关联的 proposal-only 变更不归档〔quick-single-change-auto-link §3 契约钉死〕）
    for (const linked of realChanges) {
      if (!existsSync(join(specBase, 'changes', linked, 'requirements.md'))) continue
      try {
        const r = await liteArchiveChange({ pm, cwd, specBase, changeName: linked, platformOpts })
        if (r.archivedTo) out.archived = true
        else if (r.skipped) out.warnings.push(`lite 归档 ${linked}：${r.skipped}`)
      } catch (e) { out.warnings.push(`lite 归档 ${linked} 异常跳过：${e && e.message ? e.message : e}`) }
    }
    if (anyDistilled || out.archived) {
      console.log(`📚 quick 资产尾：${out.frCount} 条 FR 入索引、${out.decisionCount} 条决策入 knowledge${out.archived ? '、linked 变更 lite 归档' : ''}（门禁后自动，agent 零新增命令）`)
    }
  } catch (e) {
    out.warnings.push(`蒸馏尾异常（fail-open 不拦 quick 完成）：${e && e.message ? e.message : e}`)
  }
  return out
}
