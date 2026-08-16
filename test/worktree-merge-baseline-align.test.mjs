/**
 * worktree-merge-baseline-align.test.mjs — applyByMerge baseline 预对齐（D-002@v1 / task-02）
 *
 * 背景：baseline checkpoint 把 execute 启动时主仓 dirty 的并行会话文件快照进 worktree 分支
 * （worktree.js _overlayBaselineFiles + _createBaselineCheckpoint）。apply --merge 时主仓常已
 * 推进同批文件（并行会话落 commit），分支旧快照 vs main 新版 add/add → merge 冲突。
 * preAlignBaselineToMain 在 merge 前把过滤集内文件 checkout 成 main 版提交到分支，消除冲突主因。
 *
 * 过滤集四条件（全满足才对齐）：baseline checkpoint 文件集 ∩ main 已推进集 ∖ 分支已变更集
 * ∖ worktree 工作区 dirty 集（另排除两侧 HEAD 同内容文件）。
 *
 * 场景：
 *  1. baseline 并行文件 A（main 已推进且内容分叉）+ 交付文件 B → 预对齐 A → merge 干净：
 *     A 取 main 版、B 保留交付、warnings 可追溯、分支含 align commit
 *  2. 过滤集内文件 C 在 worktree 工作区 dirty → C 跳过预对齐（内容不被覆盖）、A 仍对齐、
 *     merge 在 C 上冲突 → abort 回滚（worktree/分支保留）
 *  3a. 过滤集为空（main 未推进 baseline 文件）→ 无预对齐、merge 行为不变
 *  3b. 无 baseline checkpoint（baselineCommit=null）→ 直接 merge，行为与原路径一致
 *  4. 预对齐 git 步骤失败（meta.baseHash 指向不存在 rev）→ console.warn 降级 + warning 落
 *     result.warnings + 原merge 路径继续执行（不阻断）
 *
 * 构造：tmp git 仓 + git worktree add -b sillyspec/<change> + 手动模拟 baseline overlay/checkpoint
 * + 手写 meta.json（沿用 worktree-apply-merge-fallback.test.mjs fixture 模式，绕过 WorktreeManager.create）。
 * core.autocrlf=false 钉死换行（防全局 autocrlf=true 使工作区 CRLF 与断言字面量不符）。
 * 注：git log --grep 而非 HEAD^2 取 align commit（^ 是 cmd.exe 转义符，Windows shell 不安全）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree } from '../src/worktree-apply.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function shOut(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim() }
function read(d, f) { return fs.readFileSync(path.join(d, f), 'utf8') }
function hasAlignWarning(r) { return (r.warnings || []).some(w => w.includes('预对齐')) }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wma-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t && git config core.autocrlf false', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add .gitignore && git commit -m gitignore', d)
  // _resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir')，该命令返回相对 .git；
  // existsSync 相对 process.cwd()。生产时 cwd=主仓库正确，测试时需 chdir 到 d 让解析落在临时仓库。
  process.chdir(d)
  return d
}

/**
 * 构造「baseline checkpoint 含并行文件」场景：
 *   主仓 untracked 并行文件（并行会话 dirty 快照）→ worktree 分支 sillyspec/tc；
 *   快照复制进 wt（模拟 overlay）→ baseline checkpoint C1（add -A 含 meta.json，同真实流程）；
 *   交付文件 B 提交 → C2（分支 tip）；main 推进并行文件 → M1。
 * @param {object} p
 * @param {Record<string,string>} p.parallel    并行文件名 → overlay 快照内容（写入主仓+wt）
 * @param {boolean} [p.advance=true]            main 是否 commit 并行文件（false=main 未推进）
 * @param {boolean} [p.advanceDiverges=true]    推进时内容是否与快照分叉（false=commit 同内容）
 * @param {Record<string,string>} [p.dirtyInWt] wt 工作区 dirty 文件 → 内容（不 commit）
 * @returns {{ d: string, wtDir: string, M0: string, C1: string, C2: string }}
 */
function buildBaselineScenario({ parallel = {}, advance = true, advanceDiverges = true, dirtyInWt = {} }) {
  const d = setupRepo()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  // 主仓并行会话 dirty 文件（untracked 快照）
  for (const [f, content] of Object.entries(parallel)) fs.writeFileSync(path.join(d, f), content)
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  const M0 = shOut('git rev-parse HEAD', d)
  // overlay：把主仓 dirty 快照复制进 wt（模拟 _overlayBaselineFiles）
  for (const [f, content] of Object.entries(parallel)) fs.writeFileSync(path.join(wtDir, f), content)
  // meta.json 先写（真实流程 create 时写入，被 baseline checkpoint add -A 收编 → tracked、被
  // filterDeliverableFiles 排除出 changedFiles）；baselineCommit 先占位 null，checkpoint 后回填
  const meta = {
    name_zh: 'worktree 元数据', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: M0, baselineHash: 'fake-baseline-hash', baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: Object.keys(parallel),
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  // baseline checkpoint C1（_createBaselineCheckpoint 同款 --no-verify）
  sh('git add -A && git commit --no-verify -m "sillyspec: baseline checkpoint for tc"', wtDir)
  const C1 = shOut('git rev-parse HEAD', wtDir)
  // 交付文件 B（本变更真实交付，显式 add 提交到分支）
  fs.writeFileSync(path.join(wtDir, 'B.txt'), 'deliver-b\n')
  sh('git add B.txt && git commit -m deliver-b', wtDir)
  const C2 = shOut('git rev-parse HEAD', wtDir)
  // meta.baselineCommit 回填 C1（真实流程 create 返回时记录）
  meta.baselineCommit = C1
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  // main 推进并行文件（并行会话继续改后 commit；分叉=与 overlay 快照不同内容 → add/add 冲突源）
  if (advance) {
    for (const f of Object.keys(parallel)) {
      if (advanceDiverges) fs.writeFileSync(path.join(d, f), read(d, f) + 'main-v2\n')
      sh(`git add ${f} && git commit -m "advance ${f}"`, d)
    }
  }
  // wt 工作区 dirty（未提交）
  for (const [f, content] of Object.entries(dirtyInWt)) fs.writeFileSync(path.join(wtDir, f), content)
  return { d, wtDir, M0, C1, C2 }
}

console.log('=== applyByMerge baseline 预对齐（D-002@v1 / task-02）===\n')

// ── 场景 1: baseline 并行文件 A（main 已推进分叉）+ 交付 B → 预对齐后 merge 干净 ──
console.log('--- 场景 1: 预对齐 A → merge 无冲突，A 取 main 版、B 保留交付 ---')
{
  const { d, wtDir } = buildBaselineScenario({ parallel: { 'A.txt': 'a-v1\n' } })
  // 无预对齐时该场景必然 add/add 冲突（main A='a-v1\nmain-v2\n' vs 分支 A='a-v1\n'）
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === true, '1: result.merged === true')
  assertTrue(r.ok === true, '1: result.ok === true')
  assertTrue(r.errors.length === 0, `1: 无 error（实际 ${r.errors.length}: ${r.errors.join(';')}）`)
  assertTrue(read(d, 'A.txt') === 'a-v1\nmain-v2\n', '1: A.txt 取 main 版（预对齐生效）')
  assertTrue(read(d, 'B.txt') === 'deliver-b\n', '1: B.txt 保留分支交付内容')
  assertTrue(hasAlignWarning(r), `1: warnings 记录预对齐（可追溯）`)
  assertTrue((r.warnings || []).some(w => w.includes('A.txt')), '1: warning 含对齐文件名 A.txt')
  // align commit 落在分支历史（merge 成功后分支被 cleanup 删除，但从 main 历史可达）
  const alignLog = shOut('git log --format=%s --grep="align baseline files to main"', d)
  assertTrue(alignLog.includes('sillyspec: align baseline files to main (pre-merge, 1 files)'), '1: 分支历史含 align commit（1 files）')
  const alignHash = shOut('git log --format=%H --grep="align baseline files to main"', d).split('\n')[0]
  // shOut 会 trim（去掉 blob 尾部换行），比较用 trim 后字面量
  assertTrue(alignHash && shOut(`git show ${alignHash}:A.txt`, d) === 'a-v1\nmain-v2', '1: align commit 中 A.txt == main 版')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 2: 过滤集内文件 C 在 worktree 工作区 dirty → 跳过预对齐、内容不被覆盖 ──
console.log('--- 场景 2: dirty 文件 C 跳过预对齐（不覆盖），merge 在 C 冲突 abort ---')
{
  const { d, wtDir } = buildBaselineScenario({
    parallel: { 'A.txt': 'a-v1\n', 'C.txt': 'c-v1\n' },
    dirtyInWt: { 'C.txt': 'wt-dirty-c\n' },
  })
  const mainHeadBefore = shOut('git rev-parse HEAD', d)
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === false, '2: merge 冲突 → result.merged === false')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('冲突'), '2: error 含「冲突」')
  assertTrue(errText.includes('C.txt'), '2: 冲突文件列表含 C.txt')
  assertTrue(read(wtDir, 'C.txt') === 'wt-dirty-c\n', '2: worktree 的 C.txt 保持 dirty 内容（未被 checkout 覆盖）')
  assertTrue(read(wtDir, 'A.txt') === 'a-v1\nmain-v2\n', '2: 干净的 A.txt 仍被预对齐到 main 版')
  // A 对齐但 C 冲突 → align commit 只含 A（1 files，不含 C）；merge 失败不 cleanup，分支保留。
  // align commit 只在分支上可达（merge 已 abort，main HEAD 不含）→ 从 wtDir 查分支历史
  const alignLog = shOut('git log --format=%s --grep="align baseline files to main" sillyspec/tc', wtDir)
  assertTrue(alignLog.includes('(pre-merge, 1 files)'), `2: align commit 仅 1 文件（A，不含 dirty 的 C）`)
  assertTrue(shOut('git rev-parse --verify sillyspec/tc', d) !== '', '2: merge 失败未 cleanup（分支保留）')
  assertTrue(shOut('git rev-parse HEAD', d) === mainHeadBefore, '2: main HEAD 未变（abort 回滚，无半成品）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 3a: 过滤集为空（main 未推进 baseline 文件）→ 直接 merge，行为不变 ──
console.log('--- 场景 3a: main 未推进并行文件 → 无预对齐、merge 行为不变 ---')
{
  const { d } = buildBaselineScenario({ parallel: { 'A.txt': 'a-v1\n' }, advance: false })
  // main 未推进：并行会话的 untracked A 移除（否则 untracked 挡 merge，与预对齐无关）
  fs.rmSync(path.join(d, 'A.txt'))
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === true && r.ok === true, '3a: merge 成功（ok + merged）')
  assertTrue(r.errors.length === 0, `3a: 无 error`)
  assertTrue(!hasAlignWarning(r), '3a: 无预对齐 warning（过滤集空）')
  assertTrue(shOut('git log --format=%s --grep="align baseline files to main"', d) === '', '3a: 无 align commit')
  assertTrue(read(d, 'A.txt') === 'a-v1\n' && read(d, 'B.txt') === 'deliver-b\n', '3a: 分支内容正常合并（A=快照版、B=交付）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 3b: 无 baseline checkpoint（baselineCommit=null）→ 直接 merge，行为不变 ──
console.log('--- 场景 3b: 无 baseline checkpoint → 直接 merge ---')
{
  const d = setupRepo()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  const M0 = shOut('git rev-parse HEAD', d)
  const meta = {
    name_zh: 'worktree 元数据', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: M0, baselineHash: 'fake-baseline-hash', baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  fs.writeFileSync(path.join(wtDir, 'B.txt'), 'deliver-b\n')
  sh('git add B.txt && git commit -m deliver-b', wtDir)
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === true && r.ok === true, '3b: merge 成功（ok + merged）')
  assertTrue(r.errors.length === 0, '3b: 无 error')
  assertTrue(!hasAlignWarning(r), '3b: 无预对齐 warning（baselineCommit=null 静默跳过）')
  assertTrue(read(d, 'B.txt') === 'deliver-b\n', '3b: 交付 B 正常合并')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 4: 预对齐 git 步骤失败 → console.warn 降级 + 原merge 路径继续（不阻断）──
console.log('--- 场景 4: 预对齐失败 → 降级走原 merge（不阻断）---')
{
  // main commit 与快照同内容（advanceDiverges=false）→ 即使无预对齐 merge 也干净，
  // 从而单测「预对齐失败后原 merge 路径完整执行成功」（失败不阻断、不污染结果）
  const { d, wtDir } = buildBaselineScenario({ parallel: { 'A.txt': 'a-v1\n' }, advanceDiverges: false })
  // 破坏 meta.baseHash（指向不存在的 rev）→ 预对齐步骤 (a) git diff 抛错 → 降级。
  // applyWorktree 主流程 diffBase=baselineCommit 不受影响（baseHash 仅预对齐使用）。
  const meta = JSON.parse(read(wtDir, 'meta.json'))
  meta.baseHash = '0'.repeat(40)
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.ok === true && r.merged === true, '4: 降级后原 merge 路径完整执行（ok + merged）')
  assertTrue(r.errors.length === 0, `4: 无 error（实际 ${r.errors.length}: ${r.errors.join(';')}）`)
  assertTrue((r.warnings || []).some(w => w.includes('预对齐失败') && w.includes('降级')), '4: warning 记录预对齐失败+降级（可追溯）')
  assertTrue(shOut('git log --format=%s --grep="align baseline files to main"', d) === '', '4: 无 align commit（预对齐未执行任何变更）')
  assertTrue(read(d, 'B.txt') === 'deliver-b\n', '4: 交付 B 正常合并')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 27
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
