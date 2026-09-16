/**
 * 平台双根统一回归夹具（坑族 platform-dual-root-*，2026-09-15 wp EHS 会话三天实证 + 2026-09-16 hunt）。
 *
 * 平台模式 specRoot（specBase）与 source_root（项目 <cwd>/.sillyspec）分离时，主仓 worktree
 * 的 meta.json/目录在项目侧、跨仓 worktree 在 specRoot 侧——单路径 join(specBase, ...) 的消费方
 * 在平台模式下必落空。本夹具统一模拟「specRoot≠cwd + 主仓 worktree 在项目侧」的形态，逐消费方
 * 断言双根感知。
 *
 * 消费方 → 覆盖地图（防第四个消费方再漏的锚点清单）：
 *   ① contract-matrix._readWorktreeMeta（双候选样板本体）—— test/plan-target-files.test.mjs P1-3 + retro-verify-friction-fixes.test.mjs A
 *   ② verify-postcheck resolveReconcileActualFiles（form 判定）—— 同上两处
 *   ③ register-repo 写目标 —— test/register-repo-platform-split-brain.test.mjs
 *   ④ design-facts validateDesignFileList 分仓核验 —— test/design-file-list-gate.test.mjs ④
 *   ⑤ verify-postcheck resolveEvidenceDualRoots（evidence 双根，2026-09-16 hunt 第四消费方）—— 本文件 §1
 *   ⑥ foreign-declared loadWorktreeLiveness（他者声明活性，hunt 第五消费方）—— 本文件 §2
 *   ⑦ docs-debt collectExecuteChangedFiles（改动集根，hunt 第六消费方）—— 本文件 §3
 *   ⑧ archive-delta —— 经 resolveVerifyChangedFiles 继承双候选（②同源），§4 同夹具下冒烟
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveEvidenceDualRoots, resolveVerifyChangedFiles } from '../src/verify-postcheck.js'
import { loadWorktreeLiveness } from '../src/foreign-declared.js'
import { collectExecuteChangedFiles } from '../src/docs-debt.js'

const tempDirs = []
after(() => { for (const d of tempDirs) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ } } })

function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(d)
  return d
}
function git(cwd, args) { execSync(`git ${args}`, { cwd, stdio: 'pipe' }) }

/**
 * 统一双根形态夹具：项目仓（cwd，含平台指针）+ 外部 specRoot + 主仓 worktree（git worktree，
 * meta 落项目侧 .sillyspec/.runtime/worktrees/<change>/，worktreePath 指向真实隔离工作区）。
 */
function makeDualRootFixture() {
  const project = mkTmp('pdr-proj-')
  git(project, 'init -q -b main')
  git(project, 'config user.email t@t.t')
  git(project, 'config user.name t')
  writeFileSync(join(project, 'README.md'), 'base\n')
  git(project, 'add .')
  git(project, 'commit -q -m init')
  const platformRoot = mkTmp('pdr-spec-')
  mkdirSync(join(platformRoot, '.runtime'), { recursive: true })
  // 主仓 worktree：真实 git worktree（分支 sillyspec/<change>），meta 落项目侧（平台模式主仓口径）
  const change = '2026-09-16-pdr-x'
  git(project, `worktree add -q -b sillyspec/${change} "${join(project, '.sillyspec', '.runtime', 'worktrees', change)}" HEAD`)
  const wtPath = join(project, '.sillyspec', '.runtime', 'worktrees', change)
  const metaDir = join(project, '.sillyspec', '.runtime', 'worktrees', change)
  mkdirSync(metaDir, { recursive: true }) // worktree add 已建，幂等
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: change, mode: 'worktree', worktreePath: wtPath, baselineCommit: 'HEAD',
  }))
  // worktree 内放一个 apply 前新文件（仅 worktree 可见）
  writeFileSync(join(wtPath, 'evidence-only-in-worktree.log'), 'ok\n')
  // 平台指针（progress.js resolvePlatformSpecDir 协议）
  writeFileSync(join(project, '.sillyspec-platform.json'), JSON.stringify({ specRoot: platformRoot }))
  return { project, platformRoot, change, wtPath }
}

test('§1 evidence 双根（hunt 第四消费方）：平台 specBase 下 meta 落项目侧 → roots 含 worktreePath', () => {
  const { project, platformRoot, change, wtPath } = makeDualRootFixture()
  // 修复前：单查 join(specBase=platformRoot) 必落空 → roots 恒 [cwd]，worktree 内 evidence 误报缺失
  const warnings = []
  const roots = resolveEvidenceDualRoots({ cwd: project, specBase: platformRoot, changeName: change, warnings })
  assert.deepEqual(roots, [project, wtPath], `双候选应命中项目侧 meta（实际：${roots}）`)
  assert.equal(warnings.length, 0)
  // 兜底回归：meta 不存在的变更 → 单根 [cwd]
  const rootsNone = resolveEvidenceDualRoots({ cwd: project, specBase: platformRoot, changeName: '2026-09-16-no-such', warnings: [] })
  assert.deepEqual(rootsNone, [project])
})

test('§2 他者声明活性（hunt 第五消费方）：主仓 worktree 只在项目侧 → 双根扫描可见 isolated', () => {
  const { project, platformRoot, change } = makeDualRootFixture()
  // 修复前：单扫 specRoot 目录 → 主仓 worktree 变更不可见 → 声明被误判 stale → 文件误归属当前变更
  const liveness = loadWorktreeLiveness(platformRoot, project)
  assert.notEqual(liveness, null, '项目侧目录可读 → 非 fail-closed null')
  const entry = liveness.get(change)
  assert.ok(entry && entry.isolated === true, `主仓 worktree（项目侧）应被识别为 isolated（实际：${JSON.stringify(entry)}）`)
  // 无任何可读 worktrees 目录 → null（fail-closed：消费方保留全部声明，不放大放行面——语义锁定）
  const none = loadWorktreeLiveness(platformRoot, platformRoot)
  assert.equal(none, null, '两根均不可读应返回 null（fail-closed）')
})

test('§3 docs-debt 改动集根（hunt 第六消费方）：meta 在项目侧 → root 取 worktree 而非主仓 cwd', () => {
  const { project, platformRoot, change, wtPath } = makeDualRootFixture()
  // worktree 内制造脏文件（主仓保持干净）——修复前 root 退 cwd → 收进空集/主仓脏集
  mkdirSync(join(wtPath, 'src'), { recursive: true })
  writeFileSync(join(wtPath, 'src', 'only-in-worktree.js'), 'x')
  const collected = collectExecuteChangedFiles({ specBase: platformRoot, changeName: change, cwd: project })
  assert.ok(collected.changedFiles.some(f => String(f).includes('only-in-worktree')),
    `worktree 脏文件应被收集（实际 root=${collected.root}，changed=${JSON.stringify([...collected.changedFiles])}）`)
  assert.ok(collected.root.includes(join('.sillyspec', '.runtime', 'worktrees')), 'root 应锚到 worktree')
})

test('§4 archive-delta 继承冒烟：resolveVerifyChangedFiles 在同夹具下并入 worktree 面', () => {
  const { project, platformRoot, change, wtPath } = makeDualRootFixture()
  mkdirSync(join(wtPath, 'src2'), { recursive: true })
  writeFileSync(join(wtPath, 'src2', 'delta-file.js'), 'x')
  const files = resolveVerifyChangedFiles(project, change, null, { includeWorkingTree: true, specBase: platformRoot })
  assert.ok((files || []).some(f => String(f).includes('evidence-only-in-worktree') || String(f).includes('delta-file')),
    `worktree 内文件应进 changed 集（实际：${JSON.stringify(files)}）`)
})
