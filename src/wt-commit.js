/**
 * sillyspec wt-commit —— worktree 内 per-task 串行化提交（提交队列）
 *
 * 坑 wt-parallel-commit-race（2026-08-29 用户实证×2）：同 Wave 多个 task 子代理共享同一个
 * 主仓 worktree，各自裸跑 git add/commit 有两条竞态：① `git add -A` 把并行兄弟的 WIP 文件卷进
 * 自己的提交；② 并发写 index 撞 index.lock。两次都靠子代理自觉救回，属结构性风险——本命令把
 * 「自觉」换成「机制」：
 *
 * ① 文件锁串行化：withFileLock 排他锁 <mainRepo>/.sillyspec/.runtime/wt-commit-<change>.lock，
 *    同 change 的 wt-commit 全局排队（per-task 提交队列效果），锁内 add→commit 原子完成；
 * ② 强制显式 pathspec：-- 后逐路径（或 --pathspec-from-file）——命令语义上杜绝 add -A 扫入
 *    他人 WIP；commit 带同一 pathspec（--only 语义），不动其他并行者已暂存的内容。
 *
 * 边界：锁只约束 wt-commit 调用方；兄弟子代理若仍裸跑 git，靠 ② 的 pathspec 隔离兜底 + git 侧
 * index.lock 冲突时退避重试。跨仓 task 不走本命令（跨仓有独立 workdir / 直写主干，execute 指引
 * 要求显式 pathspec 提交）。锁文件在 .runtime（运行时目录，不入 git 历史）。
 *
 * 成功返回 HEAD hash（review.json 的 head 锚点直接可用）；无变更 → ok=true + skipped。
 */
import { join, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { withFileLock } from './quicklog.js'
import { safeGit } from './git-helper.js'
import { WorktreeManager } from './worktree.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * git 子操作退避重试：撞 index.lock / HEAD 锁（锁队列外裸跑 git 的兄弟进程短暂持锁）时等待重试。
 * 非 lock 类错误（路径不存在 / pathspec 不匹配 / 权限）直接抛，不空转。
 */
async function gitWithLockRetry(cwd, args, label, { retries = 6, waitMs = 1000 } = {}) {
  for (let i = 0; ; i++) {
    const { value, error } = safeGit(cwd, args, { timeout: 30000 })
    if (!error) return value
    const msg = String((error && error.message) || error)
    if (/index\.lock|HEAD\.lock|cannot lock ref/i.test(msg) && i < retries) {
      await sleep(waitMs)
      continue
    }
    throw new Error(`${label} 失败：${msg.split('\n')[0].trim()}`)
  }
}

/**
 * 执行 worktree 串行化提交。
 *
 * @param {object} opts
 * @param {string} opts.changeName - 变更名（worktree 名）
 * @param {string} opts.message - 提交信息（建议 "<task-NN 摘要>"）
 * @param {string[]} opts.pathspecs - 显式路径列表（必填，防 add -A 扫入并行兄弟 WIP）
 * @param {string|null} [opts.pathspecFile] - --pathspec-from-file：每行一个路径（与 pathspecs 二选一或叠加）
 * @param {string} [opts.cwd] - 调用方 cwd（主仓根或 worktree 内均可——WorktreeManager 经
 *   git-common-dir 反推主仓根，worktree 内调用同样定位正确）
 * @returns {Promise<{ok:boolean,skipped:boolean,head:string,shortHead:string,worktreePath:string,changeName:string,files:string[]}>}
 *   ok=false 时抛错（调用方打错误 + exit 1），skipped=无变更可提交（HEAD 不动，不算失败）。
 */
export async function runWtCommit({ changeName, message, pathspecs = [], pathspecFile = null, cwd = process.cwd() }) {
  if (!changeName) throw new Error('缺少 --change <变更名>（worktree 名；在 worktree 内运行时可省略，CLI 从 cwd 推断）')
  if (!message || !message.trim()) throw new Error('缺少 -m/--message <提交信息>（建议 "<task-NN 摘要>"）')

  // pathspec 汇总：显式路径 + 文件逐行（# 注释与空行忽略，与 git pathspec-from-file 习惯一致）
  const files = [...pathspecs.map(p => p.trim()).filter(Boolean)]
  if (pathspecFile) {
    if (!existsSync(pathspecFile)) throw new Error(`--pathspec-from-file 文件不存在: ${pathspecFile}`)
    for (const line of readFileSync(pathspecFile, 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (t && !t.startsWith('#')) files.push(t)
    }
  }
  if (files.length === 0) {
    throw new Error('缺少提交路径：`--` 后逐个给出本 task 的精确路径（或 --pathspec-from-file <file>）。wt-commit 刻意不支持 add -A / 空 pathspec——同 Wave 兄弟子代理共享本 worktree，整树 add 会把对方 WIP 卷进你的提交')
  }

  const wm = new WorktreeManager({ cwd })
  const worktreePath = wm.getWorktreePath(changeName)
  // 隔离模式（worktree 目录存在）→ 提交目标 = worktree 本体；in-place-fallback（meta 声明无
  // worktree 直改主仓）→ 主仓根（与 MultiRepoContext 主仓 entry 的 worktreePath 兜底口径一致）。
  // 顺序先看目录再看 meta：worktree 目录存在即隔离态，meta 缺失/损坏不改变目标（fail-safe）。
  let target = null
  if (existsSync(worktreePath)) {
    target = worktreePath
  } else {
    const meta = wm.getMeta(changeName)
    if (meta && meta.mode === 'in-place-fallback') {
      target = resolve(wm.worktreeBase, '..', '..', '..') // <main>/.sillyspec/.runtime/worktrees → <main>
    }
  }
  if (!target) {
    throw new Error(`worktree 不存在: ${worktreePath}（确认 --change 变更名；execute 尚未创建 worktree 时先跑 sillyspec run execute）`)
  }

  // 锁：主仓 .sillyspec/.runtime/ 下按 change 一把（in-place 模式同目录可达，零分叉）
  const lockPath = join(wm.worktreeBase, '..', `wt-commit-${changeName}.lock`)
  const envTimeout = parseInt(process.env.SILLYSPEC_WT_COMMIT_LOCK_TIMEOUT_MS || '', 10)
  const lockTimeoutMs = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 120000

  const result = await withFileLock(lockPath, async () => {
    const headBefore = safeGit(target, ['rev-parse', 'HEAD'], { timeout: 10000 }).value || ''
    await gitWithLockRetry(target, ['add', '--', ...files], 'git add')
    // pathspec 范围内是否有 staged 变更（vs HEAD）：空 = 无可提交（task 幂等重跑场景），
    // 跳过 commit 保持 skipped 语义——不靠解析 git commit 的 "nothing to commit" stdout
    // （safeGit 的 error 只保留命令首行，stdout 不可得）。
    const staged = safeGit(target, ['diff', '--cached', '--name-only', '--', ...files], { timeout: 10000 }).value || ''
    if (!staged.trim()) {
      return { ok: true, skipped: true, head: headBefore }
    }
    await gitWithLockRetry(target, ['commit', '-m', message, '--', ...files], 'git commit')
    const head = safeGit(target, ['rev-parse', 'HEAD'], { timeout: 10000 }).value || headBefore
    return { ok: true, skipped: false, head }
  }, {
    // 持有者语义：超时报错时能看出是谁卡着队列
    content: JSON.stringify({ pid: process.pid, changeName, purpose: 'wt-commit' }),
    staleMs: 120000, // 持锁进程崩溃残留的回收阈值（commit 通常秒级）
    timeoutMs: lockTimeoutMs, // 排队上限：同 Wave 并行 task 全走队列，给足余量
    retryMs: 200,
  })

  return {
    ok: true,
    skipped: !!result.skipped,
    head: result.head,
    shortHead: (result.head || '').slice(0, 8),
    worktreePath: target,
    changeName,
    files,
  }
}
