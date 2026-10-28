/**
 * 2026-10-26 坑 target-files-worktree-docs-mismatch 回归：主仓治理文档救赎
 *
 * 坑实证（2026-10-26-session-stage-progress verify 门）：模块卡路径按 CLI 铁律写主仓
 * （.sillyspec/docs/<project>/modules/*.md，绝不写 worktree 副本），而 worktree 形态
 * actual = worktree:diff-base..HEAD + worktree:status-porcelain 结构性看不见主仓侧改动
 * → 声明主仓治理路径恒落②类假红（missing_declared 阻断 verify）。「写 worktree=产物蒸发，
 * 写主仓=对账 missing」两规则打架，此前只能 target_files: [] + 行内注释绕行。
 *
 * 覆盖：
 *   ① 真 linked worktree + 主仓未提交模块卡编辑 → 声明经主仓治理面救赎命中（missing 清零、
 *      notes 带「主仓治理文档救赎」、undeclared 面不被扩）
 *   ② 主仓基线后已提交的治理文档 → baseline..HEAD diff 臂同样命中
 *   ③ 主仓侧无该改动 → 不虚造 matched（missing 如实在场——救赎只对真实改动面生效）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { reconcileTargetFiles } = await import(pathToFileURL(join(ROOT, '..', 'src', 'verify-postcheck.js')).href)

const tmpRoots = []
function fx(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const CHG = '2026-10-26-tfmd-x'
const MODCARD = '.sillyspec/docs/multi-agent-platform/modules/session-stage.md'

function git(dir, args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/** 建主仓（base 提交）+ 真 linked worktree（分支上带 src 交付提交）+ meta.json + 声明卡。 */
function buildFixture() {
  const main = fx('tfmd-main-')
  git(main, ['init', '-q', '-b', 'main'])
  git(main, ['config', 'user.email', 't@t'])
  git(main, ['config', 'user.name', 't'])
  mkdirSync(join(main, 'src'), { recursive: true })
  writeFileSync(join(main, 'base.txt'), 'base\n')
  writeFileSync(join(main, 'src', 'a.js'), 'a\n')
  git(main, ['add', '.'])
  git(main, ['commit', '-q', '-m', 'base'])
  const baseSha = git(main, ['rev-parse', 'HEAD'])
  // 真 linked worktree：分支 sillyspec/<change>，其上交付 src/b.js（worktree 面可见）
  const wt = join(fx('tfmd-wt-'), 'wt')
  mkdirSync(join(wt, '..'), { recursive: true })
  git(main, ['worktree', 'add', '-q', '-b', `sillyspec/${CHG}`, wt])
  writeFileSync(join(wt, 'src', 'b.js'), 'b\n')
  git(wt, ['add', '.'])
  git(wt, ['commit', '-q', '-m', `feat: wt 交付 (${CHG}) (task-01)`])
  // meta.json（_readWorktreeMeta 双候选之一：specBase/.runtime/worktrees/<change>/）
  const specBase = join(main, '.sillyspec')
  const metaDir = join(specBase, '.runtime', 'worktrees', CHG)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: CHG, worktreePath: wt, baselineCommit: baseSha, branch: `sillyspec/${CHG}`,
  }))
  // 声明卡：src/b.js（worktree 面）+ 模块卡路径（主仓治理面）
  const taskDir = join(specBase, 'changes', CHG, 'tasks')
  mkdirSync(taskDir, { recursive: true })
  writeFileSync(join(taskDir, 'task-01.md'), `---\ntask: task-01\ngoal: g\ntarget_files: [src/b.js, ${MODCARD}]\n---\n\n# task-01\n`)
  return { main, wt, specBase, baseSha }
}

test('① 主仓未提交模块卡编辑 → 救赎命中：missing 清零 + notes 披露 + undeclared 不扩', () => {
  const { main, specBase } = buildFixture()
  // 主仓侧模块卡编辑（未提交——铁律承载面）
  const cardDir = join(main, '.sillyspec', 'docs', 'multi-agent-platform', 'modules')
  mkdirSync(cardDir, { recursive: true })
  writeFileSync(join(cardDir, 'session-stage.md'), '# 模块卡\n更新结果：done\n')
  const r = reconcileTargetFiles({ cwd: main, specBase, changeName: CHG })
  assert.equal(r.form, 'worktree', `应判 worktree 形态（实际 ${r.form}，sources=${JSON.stringify(r.sources)}）`)
  assert.equal(r.missing.length, 0, `模块卡路径应经主仓治理面救赎（missing=${JSON.stringify(r.missing)}）`)
  assert.ok(r.matched.includes(MODCARD), `模块卡路径应进 matched（matched=${JSON.stringify(r.matched)}）`)
  assert.ok(r.matched.includes('src/b.js'), 'worktree 交付文件照常匹配')
  assert.ok(r.notes.some((n) => n.includes('主仓治理文档救赎')), `notes 应披露救赎（notes=${JSON.stringify(r.notes)}）`)
  // 救赎不扩 undeclared：主仓 .sillyspec 编辑不因救赎进③类（actual.files 未动）
  assert.ok(!r.undeclared.some((u) => u.path.startsWith('.sillyspec/')), `undeclared 不得混入主仓治理路径（${JSON.stringify(r.undeclared)}）`)
})

test('② 主仓已提交治理文档（baseline..HEAD）→ diff 臂同样救赎', () => {
  const { main, specBase } = buildFixture()
  const cardDir = join(main, '.sillyspec', 'docs', 'multi-agent-platform', 'modules')
  mkdirSync(cardDir, { recursive: true })
  writeFileSync(join(cardDir, 'session-stage.md'), '# 模块卡\n更新结果：done\n')
  git(main, ['add', '.sillyspec/docs'])
  git(main, ['commit', '-q', '-m', `docs: 模块卡 (${CHG}) (task-01)`])
  const r = reconcileTargetFiles({ cwd: main, specBase, changeName: CHG })
  assert.equal(r.missing.length, 0, `已提交治理文档应经 baseline..HEAD diff 臂救赎（missing=${JSON.stringify(r.missing)}）`)
  assert.ok(r.matched.includes(MODCARD), '模块卡路径进 matched')
})

test('③ 主仓侧无该改动 → 不虚造 matched（missing 如实在场）', () => {
  const { main, specBase } = buildFixture()
  const r = reconcileTargetFiles({ cwd: main, specBase, changeName: CHG })
  assert.ok(r.missing.length > 0 && r.missing.some((m) => String(m.path).includes('session-stage.md')), '主仓无改动 → 模块卡声明保持 missing（救赎不虚造）')
  assert.ok(!r.notes.some((n) => n.includes('主仓治理文档救赎')), '无救赎发生时 notes 不出现救赎行')
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/target-files-main-docs-rescue.test.mjs'),
    'test:core 必须包含 test/target-files-main-docs-rescue.test.mjs',
  )
})
