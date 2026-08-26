/**
 * run/complete-handlers.js（W6 Step5 从 run.js 抽出）。
 *
 * completeStep 的子 handler + archive 收尾（自洽叶子模块，仅被 completeStep 调用）：
 *   - handleArchiveConfirmStep：archive「确认归档」步骤 --confirm 门控 + 推荐文档校验
 *   - handlePlanGeneratePlanStep：plan「generate_plan」完成后动态插入 coordinator + postcheck 步骤
 *   - handleScanProjectListStep：scan step 2 完成后按项目展开 perProject 步骤（用 sanitizeProjectName/validateParsedProjects）
 *   - archiveChangeDirectory：归档移动变更目录（6 处 process.exit(1) + worktree 清理；handleArchiveConfirmStep 内部调用）
 *     srcDir 缺失时走 findAlreadyArchivedDir 幂等自愈（issue archive-stage-physical-tracking-desync）；
 *     archiveChangeDirectory + findAlreadyArchivedDir 已 export 供 test 直接 import
 *   - sanitizeProjectName / validateParsedProjects：项目名清洗 + 列表校验纯函数（handleScanProjectListStep 专用）
 *
 * 安全锚：run.js 始终 barrel。3 handler 由 run.js import 回来；sanitizeProjectName + validateParsedProjects
 * 被 test 直接 import（run-sanitize-project-name / run-scan-project-parse），run.js barrel re-export 契约保留。
 * 4 目标 handler 无 test 直接 import；archiveChangeDirectory + findAlreadyArchivedDir 供自愈 test 直接 import，无需 barrel re-export。completeStep（Step7 搬）将把 import 行带走。
 *
 * 路径修正（相对 src/run/）：
 *   - resolveChangeDir 从 './shared.js'；renameSyncRetry 从 '../fs-atomic.js'；stageRegistry 从 '../stages/index.js'
 *   - 动态 import './stages/plan.js' / './worktree.js' → '../'（src/ 下，退一层；真环依赖保留动态）
 *   - 删除 archiveChangeDirectory 内死代码 `const { renameSync } = await import('fs')`（renameSync 解构未用，实际走 renameSyncRetry）
 *
 * archiveChangeDirectory 的 6 处 process.exit 全 exit(1)：5 个顶层 guard 直接终止；L1325 在 catch 内主动 exit
 * （非被外层吞）；process.exit 不可被 try 捕获 → 搬迁行为完全等价。
 */
import { basename, join, resolve, relative, isAbsolute } from 'node:path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, rmSync } from 'node:fs'
import { renameSyncRetry, writeAtomicSync } from '../fs-atomic.js'
import { gitQuiet } from '../git-helper.js'
import { resolveChangeDir, resolveQuickSessionsDir, safeGit, auditQuickCompletion, triggerSync, isQuickMetadata, resolveRuntimeRoot, collectOtherQuickSessionDeclarations } from './shared.js'
import { detectConcurrentChanges, formatConcurrentWarning, resolveConcurrentAnchor } from './concurrent-detect.js'
import { stageRegistry } from '../stages/index.js'
import { SCAN_STATUS, POINTER_STATUS } from '../constants.js'
import { printQuickAuditReview } from './quick-audit.js'
import { validateQuickResult, allocateQuicklogEntry, findQuicklogEntry, completeQuicklogEntry, extractTitleFromResult } from '../quicklog.js'
import { getRule } from '../stage-contract-spec.js'
import { archiveDestDirName } from '../stage-contract.js'

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
 * 归档时清理可能残留的 worktree（execute 自动清理未走到 / 有未 apply 变更被遗弃）。
 * 安全策略：有未 apply 变更时保留 worktree 并警告，避免误删用户未应用的代码。
 * 同时清理该变更的 execute / stage-review runId marker（只写不删的累积物，
 * 见 stage.js execute 启动固定 executeRunId / stage-review.js stageReviewMarkerPath）。
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

export async function archiveChangeDirectory(pm, cwd, progress, specBase, platformOpts = {}) {
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
  try {
    safeGit(cwd, ['add', '--', '.sillyspec/changes/archive/'])
    safeGit(cwd, ['add', '--', '.sillyspec/docs/'])
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
        try { safeGit(cwd, ['add', '-A', '--', changesPrefix]) } catch {}
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
export async function handleArchiveConfirmStep({ stageName, steps, currentIdx, confirm, outputText, pm, cwd, progress, changeName, specBase, platformOpts = {} }) {
  if (stageName !== 'archive' || steps[currentIdx]?.name !== '确认归档') return null
  if (!confirm) {
    steps[currentIdx].status = 'pending'
    steps[currentIdx].completedAt = null
    if (outputText) steps[currentIdx].output = null
    pm._write(cwd, progress, changeName)
    console.log('⚠️  请添加 --confirm 确认归档，例如：sillyspec run archive --done --confirm --output "确认归档"')
    return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
  }
  // 主仓互斥锁（坑 main-repo-no-mutex 二批）：archiveChangeDirectory 改主仓共享状态（目录
  // rename + 共享 index 的 git add + marker 删除 + worktree 清理），与并行会话的 apply/cleanup
  // 互踩。exit 钩子兜底：其内部 guard 失败 exit(1) 时锁也会被清（见 withMainRepoLock）。
  const { withMainRepoLock } = await import('../worktree-apply.js')
  const archivedDir = await withMainRepoLock(cwd, changeName, 'archive-finalize', () => archiveChangeDirectory(pm, cwd, progress, specBase, platformOpts))
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
        const saved = saveWorkflowRun(result, {
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
 * quick 阶段完成收尾（W6 Step6b 从 completeStep 内联块抽出）：
 * 强校验 QUICKLOG 条目 + 审计（auditQuickCompletion）+ 结果摘要结构校验 + 翻状态/勾 tasks.md
 * （CLI 接管 QUICKLOG 分配/写入/收尾）。blocked → process.exit(1)（无 early-return，调用点纯 await）。
 *
 * ctx：stageName/steps/currentIdx/cwd/progress/changeName/specBase/outputText/confirm/
 * isForceBaseline/isAllowNew/platformOpts。辅助函数直接 import（safeGit/auditQuickCompletion ← shared，
 * printQuickAuditReview ← quick-audit，4 个 quicklog fns ← quicklog，unlinkSync/rmSync ← fs 静态）。
 */
export async function handleQuickStageCompletion({ stageName, steps, currentIdx, cwd, progress, changeName, specBase, outputText, confirm, isForceBaseline, isAllowNew, isAllowDelete, platformOpts, pm }) {
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

    // 强校验 / 收尾：本会话必须有一条真实 QUICKLOG 条目（治「报 SAFE 但漏写」bug）。
    // guard 缺失（brownfield：新代码前启动的会话）不阻断——兜底补写一条记录，保住「完成必有记录」不变量。
    const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
    let qlId = guard?.quicklogId || null
    const linkedChanges = Array.isArray(guard?.linkedChanges) ? guard.linkedChanges : []
    // 审计结果（仅 guard 存在时填充）。提到 if(guard) 外声明，供下方回填 QUICKLOG 文件行复用
    // review.changedFiles；brownfield 无 guard 时保持 null → 文件行不回填（降级，不报错）。
    let review = null

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
      review = await auditQuickCompletion(cwd, mergedGuard, { isConfirm: confirm })
      printQuickAuditReview(review)
      if (review.status === 'blocked') {
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
      progress.lastQuickReview = review
    }

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
    }

    if (!qlId) {
      // 无 ql-ID（guard 缺失或 brownfield 无 quicklogId）：补分配后立即完成，不阻断。
      try {
        const alloc = await allocateQuicklogEntry(specBase, gitUser, {
          description: guard?.taskDescription || '(补分配)',
          linkedChanges,
          allowedFiles: Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [],
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
    if (!findQuicklogEntry(specBase, gitUser, qlId)) {
      console.error(`\n❌ quick 阶段完成校验失败：QUICKLOG 条目 ${qlId} 不存在。`)
      console.error(`   会话期间记录被删除或从未写入。请检查 .sillyspec/quicklog/ 后重跑 --done。`)
      steps[currentIdx].status = 'pending'
      steps[currentIdx].completedAt = null
      if (outputText) steps[currentIdx].output = null
      process.exit(1)
    }
    // 翻状态进行中→已完成 + 追加结果 + 勾选关联 tasks.md
    // resultText 不再截断：结构化结果块（需求/根因/方案/结果）完整落盘，多行写成字段化块。
    try {
      // 回填实际改动文件：review.changedFiles 含 quick 自身元数据（quicklog/.runtime/modules 等），
      // 用 isQuickMetadata 过滤掉，只留真实业务文件。brownfield 无 review → 空数组，文件行不动。
      // 归属口径（2026-08-18 误归属修复）：声明会话优先 attributedFiles（窗口∩声明∪同文件并发命中），
      // 他者窗口文件不进文件行；未声明会话/旧 review 无 attributedFiles → 兜底 changedFiles 全量。
      const auditFiles = Array.isArray(review?.attributedFiles)
        ? review.attributedFiles
        : (Array.isArray(review?.changedFiles) ? review.changedFiles : [])
      const realFiles = auditFiles.filter(f => !isQuickMetadata(f, linkedChanges))
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
      }
      // 归属切分注（2026-08-18 误归属修复）：窗口内未声明脏文件不进「文件：」行，但必须落盘可追溯
      // （多 agent 并发仓他者窗口改动 / 本会话漏声明均可能），防真实改动被静默挤走。
      if (Array.isArray(review?.undeclaredFiles) && review.undeclaredFiles.length > 0) {
        const undeclared = review.undeclaredFiles.filter(f => !isQuickMetadata(f, linkedChanges))
        if (undeclared.length > 0) {
          auditNotes.push(`⚖️ 归属切分：${undeclared.length} 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：${undeclared.join(', ')}`)
        }
      }
      await completeQuicklogEntry(specBase, gitUser, qlId, {
        resultText: outputText || '',
        linkedChanges,
        changedFiles: realFiles,
        auditNotes,
      })
      console.log(`📝 QUICKLOG 条目 ${qlId} 已标记完成`)
      // 刷新 DB title：从 step3「需求：」提取（agent 可改 title 的途径），覆盖启动时的兜底快照。
      // 与 QUICKLOG 标题刷新（flipEntryInContent 内 extractTitleFromResult）同源，保持 DB↔QUICKLOG 一致。
      try {
        const refinedTitle = extractTitleFromResult(outputText || '');
        if (refinedTitle) pm.updateChangeMeta(cwd, changeName, { title: refinedTitle });
      } catch { /* title 刷新失败不阻断完成 */ }
    } catch (e) {
      console.warn(`⚠️ QUICKLOG 完成态写入失败: ${e.message}`)
    }

    // 轻量归档任务已全勾选的关联真实变更
    try {
      const closeResult = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges, platformOpts })
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
 */
const QUICK_CLOSE_ALLOWED_STAGES = new Set(['', 'scan', 'brainstorm'])

/**
 * quick --done 完成后，自动关闭任务已全部完成的关联真实变更。
 * quick-<hex> sessionId 自身不在此处理（由调用方单独注销）。
 * 单个归档失败 catch warn，不阻断 quick 完成。
 *
 * 阶段闸（fail-closed）：先查 changes.current_stage——无 DB 记录（未注册目录桩）或停在
 * scan/brainstorm 才继续 tasks 判定；plan/execute/verify/archive 一律 skip 走原流程收尾。
 * pm 缺 getChangeStage 接口或查询抛错同样 skip，不静默放行。
 *
 * @param {Object} opts
 * @param {ProgressManager} opts.pm
 * @param {string} opts.cwd
 * @param {string} opts.specBase
 * @param {string[]} [opts.linkedChanges]
 * @param {Object} [opts.platformOpts]
 * @returns {Promise<{closed:string[], skipped:{name:string,reason:string}[]}>}
 */
export async function closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges = [], platformOpts = {} }) {
  const closed = []
  const skipped = []
  // 只处理真实变更，跳过 quick 会话 sessionId
  const realChanges = linkedChanges.filter((name) => !/^quick-[0-9a-f]{8}$/.test(name))
  for (const changeName of realChanges) {
    try {
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
      // ql-20260819-010（quick-done-autoarchive-misfire 缺陷①）：当前阶段已完成 ≠
      // 从未进入完整流程的僵尸。brainstorm 收尾到 plan 开始之间的空窗里 current_stage
      // 仍读 brainstorm，只看阶段名会把即将进 plan 的变更误轻量归档（propose 骨架
      // tasks.md 除 quick 追加的 ql 行外没有任务行，「无未勾选框=全勾」恒真）。
      // stage_status=completed 一律原流程收尾；null（无阶段行/brownfield）与旧调用方
      // mock 缺字段（undefined）均按未完成放行，僵尸逃生通道行为不变。
      if (stageInfo !== null && stageInfo.stage_status === 'completed') {
        skipped.push({
          name: changeName,
          reason: `变更当前阶段「${stageInfo.current_stage || '(空)'}」已完成（推进/收尾中，非僵尸变更），不自动归档——请走原流程收尾（sillyspec progress show 查看进度）`,
        })
        continue
      }
      if (!isChangeTasksComplete(specBase, changeName)) {
        skipped.push({ name: changeName, reason: 'tasks.md 未全勾选或不存在' })
        continue
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
      const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult } = await import('../scan-postcheck.js')
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
    const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult } = await import('../scan-postcheck.js')
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

