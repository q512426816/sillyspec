/**
 * worktree apply --stash-dirty 测试（坑 apply-main-dirty-no-first-class / stash-pop-silent-noop，
 * 2026-08-24 用户反馈四期①②）。
 *
 * 场景：主仓有并行在途改动时默认 / --skip-overlap（全重叠）/ --merge 三路死锁，用户被迫手工
 * stash→3way→pop。--stash-dirty 内置该流程。诚实语义：
 *   - 非重叠脏（最常见）：stash → apply → apply --index 恢复（保暂存区状态），栈清空；
 *   - 重叠脏：apply 落地 worktree 版本；恢复时 stashed 内容与之三方合并——非重叠文件干净恢复
 *     （含 staged 状态），重叠文本撞车留冲突标记 + stash 条目保留（绝不自动丢弃），SHA 兜底输出；
 *   - 主仓干净 / checkOnly：零 stash 副作用。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { applyWorktree } from '../src/worktree-apply.js'

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

function read(dir, f) { return readFileSync(join(dir, f), 'utf8') }
function stashCount(dir) { return git(dir, ['stash', 'list']).out.split('\n').filter(Boolean).length }

function makeFixture() {
  const d = mkdtempSync(join(tmpdir(), 'sd-'))
  git(d, ['init', '-q', '-b', 'main'])
  git(d, ['config', 'user.email', 't@t.local'])
  git(d, ['config', 'user.name', 't'])
  git(d, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(d, 'src-app.js'), 'app v1\n')
  writeFileSync(join(d, 'other.js'), 'other v1\n')
  git(d, ['add', '.'])
  git(d, ['commit', '-q', '-m', 'base'])
  const base = git(d, ['rev-parse', 'HEAD']).out.trim()

  const changeName = 'tc'
  const wt = join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  git(d, ['worktree', 'add', '-q', wt, '-b', `sillyspec/${changeName}`])
  // meta：baselineHash 为假值（≠任何真树）激活 4.5 dirty 探针分支
  writeFileSync(join(wt, 'meta.json'), JSON.stringify({
    name: changeName, branch: `sillyspec/${changeName}`, worktreePath: wt,
    baseHash: base, actualBaseHash: base, baselineCommit: base,
    baselineHash: 'f'.repeat(40), mode: 'worktree',
  }))
  const cd = join(d, '.sillyspec', 'changes', changeName)
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  writeFileSync(join(cd, 'design.md'), [
    '# D', '', '## 文件变更清单', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    '| 修改 | src-app.js | 改动 |', '',
  ].join('\n'))
  writeFileSync(join(cd, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: t', 'title_zh: 任务', 'allowed_paths:', '  - src-app.js',
    'goal: >', '  实现。', 'implementation:', '  - 步骤', 'acceptance:', '  - 验收',
    'verify:', '  - node --version', 'constraints:', '  - 无', '---', '',
  ].join('\n'))
  return { d, wt, changeName }
}

function captureApply(changeName, d, opts) {
  const logs = []
  const origErr = console.error, origLog = console.log, origWarn = console.warn
  console.error = (...a) => logs.push(a.map(String).join(' '))
  console.log = (...a) => logs.push(a.map(String).join(' '))
  console.warn = (...a) => logs.push(a.map(String).join(' '))
  try {
    return { r: applyWorktree(changeName, { cwd: d, ...opts }), out: logs.join('\n') }
  } finally {
    console.error = origErr; console.log = origLog; console.warn = origWarn
  }
}

console.log('--- 1. 非重叠脏（最常见）+ --stash-dirty：apply 落盘 + 脏恢复 + 栈清空 ---')
{
  const { d, wt, changeName } = makeFixture()
  writeFileSync(join(d, 'other.js'), 'other dirty\n') // 非重叠（不在清单）
  writeFileSync(join(wt, 'src-app.js'), 'app v2 by change\n')
  const { r, out } = captureApply(changeName, d, { stashDirty: true })
  assert(r.ok === true, `apply 成功（errors: ${JSON.stringify(r.errors)}）`)
  assert(read(d, 'src-app.js') === 'app v2 by change\n', 'worktree 版本已落地主仓')
  assert(read(d, 'other.js') === 'other dirty\n', '非重叠脏文件已恢复（内容无损）')
  assert(stashCount(d) === 0, `stash 栈已清空（实际 ${stashCount(d)}）`)
  assert(out.includes('已恢复') && out.includes('stash'), '输出注明恢复动作')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 2. staged 内容保真（--index 优先，互斥时诚实降级普通恢复）---')
{
  const { d, wt, changeName } = makeFixture()
  writeFileSync(join(d, 'other.js'), 'other staged\n')
  git(d, ['add', 'other.js']) // staged（非重叠）
  writeFileSync(join(wt, 'src-app.js'), 'app v2 by change\n')
  const { r, out } = captureApply(changeName, d, { stashDirty: true })
  assert(r.ok === true, `apply 成功（errors: ${JSON.stringify(r.errors)}）`)
  // staged 状态尽力保留：--index 成功则仍在 index；与 apply 落地的未提交变更互斥时退普通恢复
  // （内容保真、staged 扁平化 + 明示提示）——两种形态都算过，丢内容才算败
  const staged = git(d, ['diff', '--cached', '--name-only']).out
  const stagedPreserved = staged.includes('other.js')
  const honestDegrade = out.includes('扁平化为 unstaged')
  assert(stagedPreserved || honestDegrade, `staged 保真或诚实降级其一成立（staged=${JSON.stringify(staged.trim())}，degrade=${honestDegrade}）`)
  assert(read(d, 'other.js') === 'other staged\n', 'staged 文件内容恢复（无丢失）')
  assert(stashCount(d) === 0, 'stash 栈清空')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 3. 重叠脏：apply 落地 + 部分恢复 + 冲突标记 + 条目保留 + SHA 兜底 ---')
{
  const { d, wt, changeName } = makeFixture()
  writeFileSync(join(d, 'src-app.js'), 'app main-dirty\n') // 与变更同文件真撞车
  writeFileSync(join(d, 'other.js'), 'other dirty\n')      // 非重叠可干净恢复
  writeFileSync(join(wt, 'src-app.js'), 'app v2 by change\n')
  const { r, out } = captureApply(changeName, d, { stashDirty: true })
  assert(r.ok === true, `apply 本身成功（errors: ${JSON.stringify(r.errors)}）`)
  assert(read(d, 'src-app.js').includes('<<<<<<<') && read(d, 'src-app.js').includes('app v2 by change'),
    '重叠文件恢复走三方合并——冲突标记保留双方内容（无丢失）')
  assert(read(d, 'other.js') === 'other dirty\n', '非重叠部分干净恢复')
  assert(stashCount(d) === 1, `冲突时 stash 条目保留（实际 ${stashCount(d)} 条）`)
  assert(out.includes('stash 恢复失败') && out.includes('未丢弃'), '输出明确「条目保留未丢弃」')
  assert(/SHA 兜底：[0-9a-f]{7,40}/.test(out), '输出含 SHA 兜底（可审计可找回）')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 4. 主仓干净 + flag：零 stash 直接 apply ---')
{
  const { d, wt, changeName } = makeFixture()
  writeFileSync(join(wt, 'src-app.js'), 'app v2 by change\n')
  const { r } = captureApply(changeName, d, { stashDirty: true })
  assert(r.ok === true && stashCount(d) === 0, `干净仓 flag 零副作用（ok=${r.ok}, stash=${stashCount(d)}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 5. checkOnly + flag + 脏：只读绝不 stash ---')
{
  const { d, wt, changeName } = makeFixture()
  writeFileSync(join(d, 'other.js'), 'other dirty\n')
  writeFileSync(join(wt, 'src-app.js'), 'app v2 by change\n')
  captureApply(changeName, d, { checkOnly: true, stashDirty: true })
  assert(stashCount(d) === 0, `checkOnly 不 stash（实际 ${stashCount(d)} 条）`)
  assert(read(d, 'src-app.js') === 'app v1\n', 'checkOnly 不落盘')
  rmSync(d, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
