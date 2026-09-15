/**
 * 坑 mixed-baseline-drift-hint（ql-20260915-004）committed-drift 混合基线提示测试。
 *
 * 背景（用户 2026-09-15 实证）：worktree 内基于快照写的测试断言（旧 id），主仓已合入 id
 * 统一修复 → verify 测试门红——测试源=worktree 快照、被测源=主仓 HEAD 的混合基线漂移无提示。
 *
 * 锁定语义（真 git 临时仓）：
 *   1. detectCommittedDrift 纯检测：基点后推进 ∩ touched（精确 + .test./.spec. 变体双向）、
 *      excludeFiles 剔除、head 参数（preMergeHead 锚点）、零交集 → drift:false、
 *      baseHash 缺失 / 非仓库 / 坏 ref → null fail-open
 *   2. 挂点一（applyWorktree 成功尾声）：主仓基点后提交推进触及本变更测试变体 → apply 成功
 *      + console.warn 混合基线提示 + result.committedDrift 留痕；零交集零输出零留痕
 *   3. 挂点二（verify 测试门前）：apply-manifest 基点后推进触及测试变体 → CLI verify --done
 *      输出提示（advisory 不阻断，阶段照常完成）；无 manifest / 零交集零输出
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { detectCommittedDrift, formatCommittedDriftWarning } from '../src/run/concurrent-detect.js'
import { applyWorktree } from '../src/worktree-apply.js'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const tmpRoots = []
function mk(prefix) { const d = join(tmpdir(), prefix + '-' + Math.random().toString(36).slice(2, 8)); mkdirSync(d, { recursive: true }); tmpRoots.push(d); return d }
function git(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function gitOk(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return r.status === 0
}

/** 捕获 console.warn（挂点输出断言用） */
async function captureWarn(fn) {
  const orig = console.warn
  const lines = []
  console.warn = (...a) => { lines.push(a.join(' ')) }
  try { return { result: await fn(), warns: lines } } finally { console.warn = orig }
}

console.log('=== 1. detectCommittedDrift 纯检测 ===')
{
  const proj = mk('cd-pure')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'src'), { recursive: true }); mkdirSync(join(proj, 'test'), { recursive: true })
  writeFileSync(join(proj, 'src', 'foo.js'), 'export const id = 1\n')
  writeFileSync(join(proj, 'test', 'foo.test.js'), 'assert(id === 1)\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  // 基点后推进（他者）：改测试变体 + 无关文件
  writeFileSync(join(proj, 'test', 'foo.test.js'), 'assert(id === 2)\n')
  mkdirSync(join(proj, 'docs'), { recursive: true })
  writeFileSync(join(proj, 'docs', 'other.md'), 'x\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'foreign advance'])

  console.log('--- 1.1 命中三形态 ---')
  const dVar = detectCommittedDrift({ projectRoot: proj, baseHash, touchedFiles: ['src/foo.js'] })
  assert(dVar.drift === true && dVar.files.length === 1 && dVar.files[0] === 'test/foo.test.js',
    `变体命中：touched=src/foo.js，推进 test/foo.test.js（实际 ${JSON.stringify(dVar && dVar.files)}）`)
  const dExact = detectCommittedDrift({ projectRoot: proj, baseHash, touchedFiles: ['test/foo.test.js', 'docs/other.md'] })
  assert(dExact.drift === true && dExact.files.includes('test/foo.test.js') && dExact.files.includes('docs/other.md'),
    `精确命中：推进文件本身在 touched 内（实际 ${JSON.stringify(dExact && dExact.files)}）`)
  const dNone = detectCommittedDrift({ projectRoot: proj, baseHash, touchedFiles: ['src/unrelated.js'] })
  assert(dNone.drift === false && dNone.files.length === 0, '零交集 → drift:false')
  const dNonTestStem = detectCommittedDrift({ projectRoot: proj, baseHash, touchedFiles: ['docs/zzz.md'] })
  assert(dNonTestStem.drift === false, '非测试形态的同名 stem（docs/other.md stem≠zzz）不误报——无关文件零交集')

  console.log('--- 1.2 反向变体（推进源文件、touched 测试）---')
  {
    const p2 = mk('cd-rev')
    git(p2, ['init', '-q']); git(p2, ['config', 'user.email', 't@t.local']); git(p2, ['config', 'user.name', 't'])
    writeFileSync(join(p2, '.gitignore'), '.sillyspec/\n')
    mkdirSync(join(p2, 'src'), { recursive: true })
    writeFileSync(join(p2, 'src', 'svc.js'), 'export const v = 1\n')
    git(p2, ['add', '.']); git(p2, ['commit', '-q', '-m', 'base'])
    const b2 = git(p2, ['rev-parse', 'HEAD'])
    writeFileSync(join(p2, 'src', 'svc.js'), 'export const v = 2  // id 统一修复\n')
    git(p2, ['add', '.']); git(p2, ['commit', '-q', '-m', 'fix'])
    // 场景③旗舰形态：本变更只写测试（worktree 快照断言旧 id），主仓合入源修复
    const dRev = detectCommittedDrift({ projectRoot: p2, baseHash: b2, touchedFiles: ['test/svc.test.js'] })
    assert(dRev.drift === true && dRev.files[0] === 'src/svc.js',
      `touched=测试文件，推进其源文件 → 变体命中（实际 ${JSON.stringify(dRev && dRev.files)}）`)
    // excludeFiles（verify 挂点防自污染）：推进面剔除自身面后仅剩变体信号
    const dExcl = detectCommittedDrift({ projectRoot: p2, baseHash: b2, touchedFiles: ['src/svc.js', 'test/svc.test.js'], excludeFiles: ['src/svc.js', 'test/svc.test.js'] })
    assert(dExcl.drift === false, 'exclude 自身面后推进面为空 → 不误报（apply 已提交形态防自污染）')
    // head 参数（preMergeHead 锚点语义）：以 base 自身为 head → 无推进
    const dHead = detectCommittedDrift({ projectRoot: p2, baseHash: b2, touchedFiles: ['src/svc.js'], head: b2 })
    assert(dHead.drift === false, 'head=基点 → 零推进 drift:false')
  }

  console.log('--- 1.3 fail-open 三态 ---')
  assert(detectCommittedDrift({ projectRoot: proj, baseHash: '', touchedFiles: ['src/foo.js'] }) === null, 'baseHash 缺失 → null')
  assert(detectCommittedDrift({ projectRoot: proj, baseHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', touchedFiles: ['src/foo.js'] }) === null, '坏 ref → null（git 异常 fail-open）')
  assert(detectCommittedDrift({ projectRoot: mk('cd-nogit'), baseHash: 'abc123', touchedFiles: ['x.js'] }) === null, '非 git 仓 → null')
  assert(detectCommittedDrift({ projectRoot: proj, baseHash, touchedFiles: [] }) === null, 'touchedFiles 空 → null（未检测）')

  console.log('--- 1.4 文案格式化 ---')
  const w = formatCommittedDriftWarning(dVar)
  assert(w.includes('⚠️ 混合基线提示') && w.includes('test/foo.test.js') && w.includes('复跑相关测试'), 'warning 含提示头+文件+建议')
  assert(formatCommittedDriftWarning(dNone) === null, '无漂移 → null（调用点零输出）')
  assert(formatCommittedDriftWarning(null) === null, '未检测 → null')
}

console.log('=== 2. 挂点一：applyWorktree 成功尾声 ===')
{
  /** 主仓 + 真实 worktree：基点后主仓提交推进触及本变更相关文件（a/b 区空行分隔防相邻 hunk 假冲突） */
  const setupApply = ({ foreignFile, foreignContent, foreignSrcContent }) => {
    const proj = mk('cd-apply')
    git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    mkdirSync(join(proj, 'src'), { recursive: true }); mkdirSync(join(proj, 'test'), { recursive: true }); mkdirSync(join(proj, 'docs'), { recursive: true })
    writeFileSync(join(proj, 'src', 'foo.js'), 'export const a = 1\n\nexport const pad1 = 1\nexport const pad2 = 2\n\nexport const b = 2\n')
    writeFileSync(join(proj, 'test', 'foo.test.js'), 'export const t = 1\n')
    git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
    const baseHash = git(proj, ['rev-parse', 'HEAD'])
    const wtDir = mk('cd-apply-wt'); rmSync(wtDir, { recursive: true, force: true })
    git(proj, ['worktree', 'add', '-q', wtDir, '-b', 'wt-branch'])
    // 基点后主仓**已提交**推进（他者）：触及本变更相关文件
    writeFileSync(join(proj, foreignFile), foreignSrcContent || foreignContent)
    git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'foreign advance'])
    // worktree 交付：改 src/foo.js 的 b 区（与推进不重叠区域 → --3way 干净落地）
    writeFileSync(join(wtDir, 'src', 'foo.js'), 'export const a = 1\n\nexport const pad1 = 1\nexport const pad2 = 2\n\nexport const b = 200  // 本变更交付\n')
    const metaDir = join(proj, '.sillyspec', '.runtime', 'worktrees', 'c1')
    mkdirSync(metaDir, { recursive: true })
    writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
      changeName: 'c1', baseHash, baselineCommit: baseHash, baselineHash: baseHash, mode: 'native-worktree', worktreePath: wtDir,
    }))
    return { proj, wtDir, baseHash }
  }

  console.log('--- 2.1 推进触及测试变体 → 提示 + committedDrift 留痕 ---')
  {
    const { proj } = setupApply({ foreignFile: 'test/foo.test.js', foreignContent: 'export const t = 2  // 他者推进\n' })
    const { result, warns } = await captureWarn(() => applyWorktree('c1', { cwd: proj }))
    assert(result.ok === true, `apply 成功（errors=${JSON.stringify(result.errors || [])}）`)
    assert(warns.some(w => w.includes('⚠️ 混合基线提示') && w.includes('test/foo.test.js')),
      `console.warn 混合基线提示 + 触及文件（实际 ${JSON.stringify(warns)}）`)
    assert(result.committedDrift && result.committedDrift.drift === true
      && result.committedDrift.files.includes('test/foo.test.js'), 'result.committedDrift 留痕')
  }

  console.log('--- 2.2 推进触及交付文件本身（精确命中）→ 提示 ---')
  {
    const { proj } = setupApply({
      foreignFile: 'src/foo.js',
      foreignContent: 'export const a = 100  // 他者推进\n\nexport const pad1 = 1\nexport const pad2 = 2\n\nexport const b = 2\n',
    })
    const { result, warns } = await captureWarn(() => applyWorktree('c1', { cwd: proj }))
    assert(result.ok === true, `apply 成功（--3way 合并他者推进；errors=${JSON.stringify(result.errors || [])}）`)
    assert(warns.some(w => w.includes('混合基线提示') && w.includes('src/foo.js')), '精确命中 → 提示')
  }

  console.log('--- 2.3 零交集 → 零输出零留痕（零回归形态）---')
  {
    const { proj } = setupApply({ foreignFile: 'docs/unrelated.md', foreignContent: '他者无关推进\n' })
    const { result, warns } = await captureWarn(() => applyWorktree('c1', { cwd: proj }))
    assert(result.ok === true, 'apply 成功')
    assert(!warns.some(w => w.includes('混合基线提示')), '零交集零提示')
    assert(result.committedDrift === undefined, 'committedDrift 不留痕')
  }
}

console.log('=== 3. 挂点二：verify 测试门前（CLI 实测 commands.test 前）===')
{
  const VERIFY_STEPS = ['状态检查', '加载规范并锚定', '逐项检查任务', '对照设计检查', '任务蓝图验收', '运行测试和质量扫描', '输出验证报告']
  const writeCoreDocs = (changeDir) => {
    writeFileSync(join(changeDir, 'design.md'),
      '# Design\n\n## 背景\nx\n\n## 总体方案\ny\n\n## 决策\nD-001@v1: z\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序 |\n')
    writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
    writeFileSync(join(changeDir, 'verify-result.md'), '# 验证报告\n\n## 结论\n\n结论枚举：PASS\n\n所有任务通过。\n')
  }

  console.log('--- 3.1 manifest 基点后推进触及测试变体 → 输出提示且不阻断 ---')
  {
    const { cwd, specBase } = makeRepo('cli-drift-verify-')
    const cn = '2026-07-25-drift-verify'
    mkdirSync(join(cwd, 'src'), { recursive: true }); mkdirSync(join(cwd, 'test'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'list.js'), 'export const sort = () => {}\n')
    git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'base'])
    const baseHash = git(cwd, ['rev-parse', 'HEAD'])
    // 基点后主仓推进（他者改测试变体）
    writeFileSync(join(cwd, 'test', 'list.test.js'), 'export const t = 2  // 他者 id 修复\n')
    git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'foreign'])
    // apply-manifest（apply 已发生，基点 + 交付面）
    const pm = await initChange(cwd, specBase, cn)
    const changeDir = join(specBase, 'changes', cn)
    writeCoreDocs(changeDir)
    writeFileSync(join(changeDir, 'apply-manifest.json'), JSON.stringify({
      schemaVersion: 1, change: cn, appliedAt: new Date().toISOString(), baseHash,
      files: [{ path: 'src/list.js', sha256: 'x' }],
    }, null, 2))
    const progress = await pm.read(cwd, cn)
    progress.currentChange = cn
    progress.stages = progress.stages || {}
    progress.stages.verify = { status: 'in-progress', startedAt: '2026/7/25 00:00:00', completedAt: null, steps: VERIFY_STEPS.map((name, i) => ({ name, status: i < VERIFY_STEPS.length - 1 ? 'completed' : 'pending' })) }
    await pm._write(cwd, progress, cn)

    const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })
    assert(r.status === 0, `exit 0（实际 ${r.status}，尾 ${r.combined.slice(-120)}）`)
    assert(r.combined.includes('混合基线提示') && r.combined.includes('test/list.test.js') && r.combined.includes('先做合并态归因'),
      `stdout 含混合基线提示 + 变体文件 + 归因注（实际片段：${r.combined.slice(Math.max(0, r.combined.indexOf('混合基线提示')) - 40, r.combined.indexOf('混合基线提示') + 200)}）`)
    const { ProgressManager } = await import('../src/progress.js')
    const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
    assert(after.stages.verify.status === 'completed', 'advisory 不阻断（stage completed）')
  }

  console.log('--- 3.2 无 manifest / 零交集 → 零输出（零回归形态）---')
  {
    const { cwd, specBase } = makeRepo('cli-drift-none-')
    const cn = '2026-07-25-drift-none'
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'list.js'), 'export const sort = () => {}\n')
    git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'base'])
    const pm = await initChange(cwd, specBase, cn)
    const changeDir = join(specBase, 'changes', cn)
    writeCoreDocs(changeDir)
    // 无 apply-manifest（in-place 变更形态）→ 挂点 no-op
    const progress = await pm.read(cwd, cn)
    progress.currentChange = cn
    progress.stages = progress.stages || {}
    progress.stages.verify = { status: 'in-progress', startedAt: '2026/7/25 00:00:00', completedAt: null, steps: VERIFY_STEPS.map((name, i) => ({ name, status: i < VERIFY_STEPS.length - 1 ? 'completed' : 'pending' })) }
    await pm._write(cwd, progress, cn)
    const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })
    assert(r.status === 0 && !r.combined.includes('混合基线提示'), '无 manifest → 零输出零阻断')
  }
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
cleanup()
report(count.passed, count.failed, count.failures)
