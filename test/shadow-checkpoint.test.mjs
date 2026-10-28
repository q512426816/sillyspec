/**
 * 影子存档（task tick 快照）测试 — 2026-10-28-shadow-checkpoint
 *
 * 覆盖矩阵（对齐 requirements 测试绑定 FR-01..FR-07）：
 *   create 落档       tracked+untracked 进树、ref 建立、链式父指（FR-01）
 *   共享 index 零触碰 staged 面前后一致 + 临时索引 finally 清理 + 会话隔离（FR-01 双会话断言）
 *   no-op             无变化零对象零翻转（FR-02）
 *   list/preview/restore  列链、diff 预览、按路径选择性恢复仅写工作区（FR-03）
 *   体积护栏          超阈值早停跳过留痕，tick 不阻断（FR-04）
 *   change-delete     确认删除后 ref 清除（FR-05）
 *   配置开关          enabled=false 不落档；缺省/解析失败 fail-open 开启（FR-06）
 *   零依赖/硬排除     src 零 npm 依赖断言 + 硬排除清单不进快照（FR-07/FR-01）
 *   worktree 跳过     worktree 会话 v1 不存档（design 边界）
 *   tick 集成         翻格成功自动落档、护栏触发 tick 仍 exit 0（fail-open）
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { makeRepo, initChange, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { gitQuiet } from '../src/git-helper.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
const CN = '2026-10-28-cp-fixture'
const refOf = (cn) => `refs/sillyspec/checkpoints/${cn}`

// ═══════════════════════════════════════════════════════════════════════════
// 模块级：create / 零污染 / no-op / 链式 / 硬排除（FR-01/02/07）
// ═══════════════════════════════════════════════════════════════════════════
{
  const { cwd } = makeRepo('cp-core-'); tmpRoots.push(cwd)
  const { createCheckpoint, listCheckpoints } = await import('../src/checkpoint.js')

  // FR-01 create：tracked 改动 + untracked 新文件都进树
  writeFileSync(join(cwd, 'README.md'), 'changed\n')
  writeFileSync(join(cwd, 'new-file.txt'), 'untracked content\n')
  const r1 = await createCheckpoint({ repoRoot: cwd, changeName: CN, session: 'sess-a', taskId: 'task-01' })
  assert(r1.kind === 'created', `create 落档（实际 ${r1.kind}${r1.detail ? ' ' + r1.detail : ''}）`)
  const refSha1 = gitQuiet(cwd, ['rev-parse', '--verify', refOf(CN)])
  assert(Boolean(refSha1), 'ref refs/sillyspec/checkpoints/<change> 已建立')
  const treeFiles = git(cwd, ['ls-tree', '-r', '--name-only', refOf(CN)]).split('\n')
  assert(treeFiles.includes('new-file.txt'), 'untracked 新文件进快照树')
  assert(treeFiles.includes('README.md'), 'tracked 文件进快照树')
  const blob = git(cwd, ['show', `${refOf(CN)}:README.md`])
  assert(blob === 'changed', '快照树内容=工作区当前态（非 HEAD 旧内容；git() trim 后比对）')

  // FR-01 共享 index 零触碰（双会话断言）：他者 staged 面 + 主 index 前后逐字节一致
  writeFileSync(join(cwd, 'staged-keep.txt'), 'other session staged\n')
  git(cwd, ['add', 'staged-keep.txt'])
  const stagedBefore = git(cwd, ['diff', '--cached', '--name-only'])
  const indexBytesBefore = readFileSync(join(cwd, '.git', 'index'))
  const r2 = await createCheckpoint({ repoRoot: cwd, changeName: CN, session: 'sess-b' }) // 不同会话
  const stagedAfter = git(cwd, ['diff', '--cached', '--name-only'])
  assert(stagedBefore === stagedAfter && stagedAfter.includes('staged-keep.txt'), `共享 staged 面前后一致（他者条目仍在：${stagedAfter.trim()}）`)
  assert(Buffer.compare(indexBytesBefore, readFileSync(join(cwd, '.git', 'index'))) === 0, '共享 index 文件字节级未动')
  const leftover = readdirSync(join(cwd, '.git')).filter((f) => f.startsWith('sillyspec-cp-index-'))
  assert(leftover.length === 0, `临时索引 finally 清理（残留：${leftover.join(',') || '无'}）`)

  // FR-02 no-op：无变化时零对象零翻转
  const refBefore = git(cwd, ['rev-parse', refOf(CN)])
  const r3 = await createCheckpoint({ repoRoot: cwd, changeName: CN, session: 'sess-a' })
  const refAfter = git(cwd, ['rev-parse', refOf(CN)])
  assert(r3.kind === 'noop', `无变化 create 返回 noop（实际 ${r3.kind}）`)
  assert(refBefore === refAfter, 'noop 时 ref 不翻转')

  // 链式父指：第二档（有新变化）parent=第一档
  writeFileSync(join(cwd, 'README.md'), 'changed again\n')
  const r4 = await createCheckpoint({ repoRoot: cwd, changeName: CN, session: 'sess-a', taskId: 'task-02' })
  assert(r4.kind === 'created', '有变化再落档 created')
  const parent = git(cwd, ['log', '--format=%P', '-n', '1', refOf(CN)])
  assert(parent === refBefore, `链式父指：新档 parent=上一档（${parent.slice(0, 8)} vs ${refBefore.slice(0, 8)}）`)
  const list = await listCheckpoints({ repoRoot: cwd, changeName: CN })
  assert(list.length === 3, `列链 3 档（task-01、sess-b 无 taskId、task-02；实际 ${list.length}）`)
  assert(list[0].taskId === 'task-02' && list[2].taskId === 'task-01' && list[1].taskId === null, '列链 taskId 解析正确（新→旧，无 taskId 档为 null）')

  // FR-07 硬排除：常见产物目录与 .env* 不进快照（不改变树 → noop）
  mkdirSync(join(cwd, 'node_modules', 'pkg'), { recursive: true })
  writeFileSync(join(cwd, 'node_modules', 'pkg', 'x.js'), 'x')
  mkdirSync(join(cwd, 'dist'), { recursive: true })
  writeFileSync(join(cwd, 'dist', 'a.js'), 'a')
  writeFileSync(join(cwd, '.env.local'), 'SECRET=1')
  const r5 = await createCheckpoint({ repoRoot: cwd, changeName: CN, session: 'sess-a' })
  assert(r5.kind === 'noop', `硬排除文件不改变快照 → noop（实际 ${r5.kind}${r5.detail ? ' ' + r5.detail : ''}）`)
  const treeFiles5 = git(cwd, ['ls-tree', '-r', '--name-only', refOf(CN)]).split('\n')
  assert(!treeFiles5.some((f) => f.includes('node_modules/') || f.startsWith('dist/') || f === '.env.local'),
    'node_modules/dist/.env.local 硬排除不进快照')

  // FR-03 restore：预览 + 按路径选择性恢复（仅写工作区）
  const { previewRestore, restoreCheckpoint } = await import('../src/checkpoint.js')
  writeFileSync(join(cwd, 'README.md'), 'JUNK broken\n')
  writeFileSync(join(cwd, 'new-file.txt'), 'also junked\n')
  const pv = await previewRestore({ repoRoot: cwd, sha: refSha1, paths: ['README.md'] })
  assert(pv.patch.includes('JUNK broken'), '预览 patch 含工作区侧改崩内容')
  const rr = await restoreCheckpoint({ repoRoot: cwd, sha: refSha1, changeName: CN, paths: ['README.md'] })
  assert(rr.ok, '按路径读档 ok')
  const norm = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n') // core.autocrlf 仓 checkout 带 CRLF，归一后比对
  assert(norm(join(cwd, 'README.md')) === 'changed\n', '目标文件回到存档内容（CRLF 归一）')
  assert(norm(join(cwd, 'new-file.txt')) === 'also junked\n', '未选路径不受影响（仍是改崩态）')
  assert(git(cwd, ['diff', '--cached', '--name-only']).includes('staged-keep.txt'), '读档后他者 staged 面不受影响（restore 不碰 index）')
  const rrAll = await restoreCheckpoint({ repoRoot: cwd, sha: refSha1, changeName: CN, all: true })
  assert(rrAll.ok && norm(join(cwd, 'new-file.txt')) === 'untracked content\n', '--all 整树读档恢复全部')
  const rrBad = await restoreCheckpoint({ repoRoot: cwd, sha: '0'.repeat(40), changeName: CN, paths: ['README.md'] })
  assert(!rrBad.ok && /存档链/.test(rrBad.reason), '链外 SHA 拒绝读档')
}

// ═══════════════════════════════════════════════════════════════════════════
// 配置面：开关 / 护栏 / 解析 fail-open（FR-04/06）
// ═══════════════════════════════════════════════════════════════════════════
{
  const { cwd } = makeRepo('cp-cfg-'); tmpRoots.push(cwd)
  const { createCheckpoint, readCheckpointConfig } = await import('../src/checkpoint.js')
  const CNc = '2026-10-28-cp-cfg'

  // FR-06 enabled=false：不落档
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'checkpoint:\n  enabled: false\n')
  const rc1 = await createCheckpoint({ repoRoot: cwd, changeName: CNc })
  assert(rc1.kind === 'skipped' && rc1.reason === 'checkpoint-disabled', `enabled=false 跳过（实际 ${rc1.kind}/${rc1.reason}）`)
  assert(!gitQuiet(cwd, ['rev-parse', '--verify', refOf(CNc)]), 'enabled=false 零 ref 写入')
  const cfg1 = readCheckpointConfig(cwd)
  assert(cfg1.enabled === false, '配置读取 enabled=false')

  // FR-06 解析失败 fail-open：结构异常回退缺省开启
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'checkpoint: [broken\n  enabled: false\n')
  writeFileSync(join(cwd, 'a.txt'), 'a\n')
  const rc2 = await createCheckpoint({ repoRoot: cwd, changeName: CNc })
  assert(rc2.kind === 'created', `解析失败 fail-open 取缺省开启（实际 ${rc2.kind}/${rc2.reason}）`)

  // FR-04 体积护栏：超阈值早停跳过留痕
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'checkpoint:\n  maxUntrackedMB: 0.001\n')
  writeFileSync(join(cwd, 'big.bin'), 'x'.repeat(4096))
  const rc3 = await createCheckpoint({ repoRoot: cwd, changeName: CNc })
  assert(rc3.kind === 'skipped' && rc3.reason === 'untracked-size-over-limit', `超阈值跳过留痕（实际 ${rc3.kind}/${rc3.reason}）`)
  assert(Boolean(rc3.detail), 'skip detail 带量级明细')
  // 硬排除目录不计入护栏：小阈值下仅 node_modules 巨物不触发跳过（且树不变 → noop，
  // 硬排除文件对快照零影响——比 created 更强的排除证据）
  rmSync(join(cwd, 'big.bin'))
  mkdirSync(join(cwd, 'node_modules', 'huge'), { recursive: true })
  writeFileSync(join(cwd, 'node_modules', 'huge', 'lib.js'), 'x'.repeat(8192))
  const rc4 = await createCheckpoint({ repoRoot: cwd, changeName: CNc })
  assert(rc4.kind === 'noop', `护栏只计真会进快照的文件（硬排除不计入，树不变 → noop；实际 ${rc4.kind}）`)

  // FR-07 零依赖断言：src/checkpoint.js 只 import 内置模块与仓内模块
  const src = readFileSync(new URL('../src/checkpoint.js', import.meta.url), 'utf8')
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
  assert(imports.every((s) => s.startsWith('./') || s === 'fs' || s === 'path'), `零 npm 依赖（imports: ${imports.join(', ')}）`)
}

// ═══════════════════════════════════════════════════════════════════════════
// 集成面：tick 自动落档 / fail-open 不阻断 / CLI 动词（FR-01/03/04 + 任务卡口径）
// ═══════════════════════════════════════════════════════════════════════════
{
  const { cwd, specBase } = makeRepo('cp-tick-'); tmpRoots.push(cwd)
  const CNt = '2026-10-28-cp-tick'
  // 真实 sillyspec 仓 .sillyspec 是 tracked（台账进快照）；fixture 默认忽略它——清空
  // gitignore 让本用例验证「快照含翻格后的 tasks.md（内容级断点）」
  writeFileSync(join(cwd, '.gitignore'), '')
  const changesDir = join(specBase, 'changes', CNt)
  mkdirSync(changesDir, { recursive: true })
  writeFileSync(join(changesDir, 'tasks.md'), `# 任务注册表\n\n- [ ] task-01: 做事甲\n- [ ] task-02: 做事乙\n`)
  const cliEnv = { ...process.env, SILLYSPEC_SESSION_ID: 'tick-sess' }

  // tick 成功 → 自动落档（含 tasks.md 翻格态——快照=勾选后内容级状态）
  writeFileSync(join(cwd, 'deliver.js'), 'console.log(1)\n')
  const t1 = runCLI(['task', 'tick', '--change', CNt, '--task', 'task-01'], { cwd, env: cliEnv })
  assert(t1.status === 0, `tick exit 0（实际 ${t1.status}）`)
  assert(t1.combined.includes('影子存档'), `tick 回显含影子存档行（输出尾：…${t1.combined.slice(-160).replace(/\n/g, ' ')}）`)
  const refShaT = gitQuiet(cwd, ['rev-parse', '--verify', refOf(CNt)])
  assert(Boolean(refShaT), 'tick 自动落档 ref 建立')
  const tickTasks = git(cwd, ['show', `${refOf(CNt)}:.sillyspec/changes/${CNt}/tasks.md`])
  assert(tickTasks.includes('[x] task-01') && !tickTasks.includes('[x] task-02'), '快照树含翻格后的 tasks.md（内容级断点）')

  // FR-04 fail-open：护栏触发跳过但 tick 照常 exit 0
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true }) // makeRepo 已建（.gitignore 只忽略内容不阻止写盘）
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'checkpoint:\n  maxUntrackedMB: 0.001\n')
  writeFileSync(join(cwd, 'big2.bin'), 'x'.repeat(4096))
  const t2 = runCLI(['task', 'tick', '--change', CNt, '--task', 'task-02'], { cwd, env: cliEnv })
  assert(t2.status === 0, `护栏触发 tick 仍 exit 0（实际 ${t2.status}）`)
  assert(t2.combined.includes('影子存档跳过'), 'tick 回显跳过留痕')
  assert(git(cwd, ['rev-parse', refOf(CNt)]) === refShaT, '跳过时 ref 不变')

  // CLI 列链 / 恢复纪律（FR-03）：缺 --yes 拒绝
  const cList = runCLI(['checkpoint', '--change', CNt], { cwd })
  assert(cList.status === 0 && cList.stdout.includes(refShaT.slice(0, 8)), 'checkpoint 列链输出含 SHA')
  const cNo = runCLI(['checkpoint', '--change', CNt, '--restore', refShaT, '--path', 'deliver.js'], { cwd })
  assert(cNo.status === 2, `--restore 缺 --yes 拒绝（实际 ${cNo.status}）`)
  const cDiff = runCLI(['checkpoint', '--change', CNt, '--diff', refShaT, '--path', 'deliver.js'], { cwd })
  assert(cDiff.status === 0 && (cDiff.stdout.includes('deliver.js') || cDiff.stdout.includes('无差异')), '--diff 预览 exit 0')
  const cDel = runCLI(['checkpoint', '--change', CNt, '--delete-ref'], { cwd })
  assert(cDel.status === 0 && !gitQuiet(cwd, ['rev-parse', '--verify', refOf(CNt)]), '--delete-ref 清链')
}

// ═══════════════════════════════════════════════════════════════════════════
// worktree 会话跳过（design 边界：v1 主仓形态）
// ═══════════════════════════════════════════════════════════════════════════
{
  const { cwd } = makeRepo('cp-wt-'); tmpRoots.push(cwd)
  const wtPath = cwd + '-wt'
  git(cwd, ['worktree', 'add', '-q', wtPath, '-b', 'wt-probe'])
  const { createCheckpoint } = await import('../src/checkpoint.js')
  const rw = await createCheckpoint({ repoRoot: wtPath, changeName: '2026-10-28-cp-wt' })
  assert(rw.kind === 'skipped' && rw.reason === 'worktree-session', `worktree 会话跳过（实际 ${rw.kind}/${rw.reason}）`)
  git(cwd, ['worktree', 'remove', '--force', wtPath])
}

// ═══════════════════════════════════════════════════════════════════════════
// FR-05：change-delete 确认删除后 ref 清除（DB 走 initChange 真链路）
// ═══════════════════════════════════════════════════════════════════════════
{
  const { cwd, specBase } = makeRepo('cp-cdel-'); tmpRoots.push(cwd)
  const CNd = '2026-10-28-cp-cdel'
  await initChange(cwd, specBase, CNd)
  writeFileSync(join(cwd, 'src-x.js'), 'x\n')
  const { createCheckpoint, hasCheckpointRef } = await import('../src/checkpoint.js')
  const rd = await createCheckpoint({ repoRoot: cwd, changeName: CNd, session: 'cdel', taskId: 'task-01' })
  assert(rd.kind === 'created', 'change-delete 前置：存档已落')
  assert(hasCheckpointRef(cwd, CNd), 'change-delete 前置：ref 在场')
  const { deleteChange } = await import('../src/change-delete.js')
  const dry = await deleteChange({ cwd, specDir: specBase, changeName: CNd, confirm: false })
  assert(dry.ok && dry.action === 'dry_run' && dry.checkpoints && dry.checkpoints.count === 1, 'dry-run 报存档链规模')
  const del = await deleteChange({ cwd, specDir: specBase, changeName: CNd, confirm: true })
  assert(del.ok && del.checkpoints_removed === true, `确认删除后 ref 清除（checkpoints_removed=${del.checkpoints_removed}）`)
  assert(!hasCheckpointRef(cwd, CNd), 'ref 已不存在')
  // Windows 句柄：关静态池连接再删目录
  try {
    const { ProgressManager } = await import('../src/progress.js')
    const key = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
    const db = ProgressManager._dbPool.get(key)
    if (db) { try { db.close() } catch {} ProgressManager._dbPool.delete(key) }
  } catch { /* 池里无实例 */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// 收尾
// ═══════════════════════════════════════════════════════════════════════════
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
cleanup()
report(count.passed, count.failed, count.failures)
