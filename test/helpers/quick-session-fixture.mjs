/**
 * quick 在途会话夹具（2026-09-25-quick-channel-retire 配套）
 *
 * quick 通道退役后新会话被双层门拒绝（index.js 预门 + stage.js 兜底），既有 quick 测试
 * 不能再靠 `runCommand(['quick', <任务>, ...])` 真实启动会话。本夹具按退役前 runStage
 * 新会话分支的规范形状预置「升级前已在途」的会话态，供收尾链路（渲染/续跑/--done/--cancel）
 * 测试使用：
 *   1. allocateQuicklogEntry（真实函数）——分配 ql-ID + 写 QUICKLOG「进行中」条目 + 关联
 *      变更 tasks.md 挂载行（与生产同源，防夹具形状漂移）
 *   2. guard.json——逐字段复刻 stage.js 已删除的新会话写入形状（sessionId/specDir/name_zh/
 *      baselineCommit/baselineFiles/allowedFiles/allowedFilesHash/allowNew/allowDelete/
 *      forceBaseline/linkedChanges/linkedChangesAuto/quicklogId/taskDescription/startedAt）
 *
 * 首次渲染（run quick --change <sid>）时 progress 行由 command.js auxiliary 分支自动
 * initChange，无需夹具预置；owner.json 缺省走核验 fail-open 放行，同样无需预置。
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { allocateQuicklogEntry, deriveTitleFromLinkedChange } from '../../src/quicklog.js'
import { safeGit } from '../../src/run/shared.js'

export function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

export function initGitRepo(dir) {
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test']); git(dir, ['config', 'commit.gpgsign', 'false'])
}

const tmpRoots = []
export function makeTmpDir(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
export function cleanupTmpDirs() {
  for (const dir of tmpRoots) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
}

/**
 * 预置一个「升级前已在途」的 quick 会话。
 * @param {string} repo 仓库根（须已 git init + 有初始提交）
 * @param {object} [opts]
 * @param {string} [opts.specBase] spec 根（缺省 <repo>/.sillyspec；平台模式分离目录时显式传）
 * @param {string} [opts.sid] 会话 ID（quick-<8hex>）；缺省生成
 * @param {string} [opts.taskDescription] 任务描述（落 guard，--input 语义）
 * @param {string[]} [opts.linkedChanges] 关联变更（须已存在 changes/<名>/ 目录）
 * @param {string[]} [opts.allowedFiles] 声明边界文件（--files 语义）
 * @param {boolean} [opts.allowNew] / [opts.allowDelete] / [opts.forceBaseline] 危险面预声明
 * @param {string} [opts.gitUser] QUICKLOG 用户名（缺省 test）
 * @returns {Promise<{sid: string, qlId: string, guardFile: string, specBase: string}>}
 */
export async function seedQuickSession(repo, opts = {}) {
  const specBase = opts.specBase || join(repo, '.sillyspec')
  const sid = opts.sid || ('quick-' + randomUUID().slice(0, 8))
  const linkedChanges = Array.isArray(opts.linkedChanges) ? opts.linkedChanges : []
  const allowedFiles = Array.isArray(opts.allowedFiles) ? opts.allowedFiles : []
  // 标题回退与退役前启动块同源：无任务描述但有关联变更时从 proposal 提取语义标题
  let taskDescription = opts.taskDescription || ''
  if (!taskDescription && linkedChanges.length > 0) {
    try { taskDescription = deriveTitleFromLinkedChange(specBase, linkedChanges[0]) || '' } catch { /* 读不到回退空 */ }
  }
  // baseline 采集与被删除的 runStage 新会话分支同口径：当前 porcelain 快照 + HEAD + now
  const baselineFiles = String(safeGit(repo, ['status', '--porcelain'], { trim: false }).value || '')
    .split('\n').filter(Boolean).map(l => l.replace(/^..\s+/, '').replace(/^"|"$/g, ''))
    .filter(Boolean)
  const { qlId } = await allocateQuicklogEntry(specBase, opts.gitUser || 'test', {
    description: taskDescription,
    linkedChanges,
    allowedFiles,
    sessionsDir: join(specBase, '.runtime', 'quick-sessions'),
  })
  const guard = {
    sessionId: sid,
    specDir: specBase,
    name_zh: '快速任务守卫',
    baselineCommit: safeGit(repo, ['rev-parse', 'HEAD']).value,
    baselineFiles,
    allowedFiles,
    allowedFilesHash: Object.fromEntries(allowedFiles.flatMap(f => {
      try { return [[f, createHash('sha256').update(readFileSync(join(repo, f))).digest('hex')]] }
      catch { return [] }
    })),
    allowNew: opts.allowNew || false,
    allowDelete: opts.allowDelete || false,
    forceBaseline: opts.forceBaseline || false,
    linkedChanges,
    linkedChangesAuto: Array.isArray(opts.linkedChangesAuto) ? opts.linkedChangesAuto : [],
    quicklogId: qlId,
    taskDescription,
    startedAt: new Date().toISOString(),
  }
  const guardFile = join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json')
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', sid), { recursive: true })
  writeFileSync(guardFile, JSON.stringify(guard, null, 2))
  // progress 行：预置 DB changes 行（真实首渲染由 command.js auxiliary 分支 initChange 创建，
  // 此处显式建等价态，调用方首次渲染即走「续跑」而非「首次 init」，与升级前在途会话一致）。
  // quicklog_id 回填与退役前启动块同源（updateChangeMeta：--done 兜底「复用启动 ql-ID」的读取源）
  const { ProgressManager } = await import('../../src/progress.js')
  const pm = new ProgressManager({ specDir: specBase })
  try { await pm.init(repo) } catch { /* 已 init 的仓忽略 */ }
  pm.initChange(repo, sid, { title: taskDescription || sid })
  try { pm.updateChangeMeta(repo, sid, { title: taskDescription || sid, quicklogId: qlId }) } catch { /* 回填失败不阻断夹具 */ }
  return { sid, qlId, guardFile, specBase }
}
