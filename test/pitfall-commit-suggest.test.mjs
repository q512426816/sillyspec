/**
 * 2026-10-15-pitfall-batch-clearance FR-11 — commit 建议 type 加权修复
 *
 * 坑 probe-noise-and-commit-suggest-quality 坑B（消费仓实证）：归档提交（已勾 task×4 + archive
 * 产物 + 模块卡 + knowledge）被建议成 `fix: quick 修复 + 阶段产出`——type 误判 + 「quick」凭空
 * 出现（并行会话 QUICKLOG 噪声）+ body 四行重复。
 * 锁死契约：quick 来源锚定「quicklog 文件 ∈ 本次变更集」；归档 tasks.md 在变更集时 task 面在
 * 场（feat 优先）；纯阶段产出建议 chore（不再捏造 quick）；subject 已列标题不进 body。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { collectCommitContext } from '../src/commit-suggest.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

function baseRepo(prefix) {
  const cwd = mk('pcs-')
  git(cwd, ['init', '-q', '-b', 'main'])
  writeFileSync(join(cwd, 'readme.md'), 'r\n')
  git(cwd, ['add', '.'])
  git(cwd, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'])
  return { cwd, specBase: join(cwd, '.sillyspec') }
}

const QUICK_MD = (time, titles) => [
  `# QUICKLOG`, '',
  ...titles.flatMap((t, i) => [`## ql-2026${i} | ${time} | ${t}`, '', '状态：已完成', '']),
].join('\n')

test('FR-11：并行会话 QUICKLOG 不在变更集 → 不劫持归档提交（task 面 feat）', () => {
  const f = baseRepo('pcs-arch-')
  // 归档产物在变更集（untracked）
  mkdirSync(join(f.specBase, 'changes', 'archive', 'mychange'), { recursive: true })
  writeFileSync(join(f.specBase, 'changes', 'archive', 'mychange', 'tasks.md'), '- [x] task-01: a\n- [x] task-02: b\n')
  mkdirSync(join(f.specBase, 'knowledge'), { recursive: true })
  writeFileSync(join(f.specBase, 'knowledge', 'INDEX.md'), 'idx\n')
  // 并行会话 quick 噪声：QUICKLOG 文件不在本次变更集（在别处，不 add 不动）——但时间窗内
  const noiseDir = mk('pcs-noise-')
  mkdirSync(join(noiseDir, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(noiseDir, '.sillyspec', 'quicklog', 'QUICKLOG-t.md'), QUICK_MD('2026-10-15 23:00:00', ['他侧 quick 修复']))
  // 本仓 specBase 下也有一个不在变更集的 quicklog（未修改 → 不出现在 porcelain）
  mkdirSync(join(f.specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(f.specBase, 'quicklog', 'QUICKLOG-t.md'), QUICK_MD('2026-10-14 00:00:00', ['旧条目']))

  const cc = collectCommitContext({ cwd: f.cwd })
  assert.ok(cc.suggestion, '有建议')
  assert.equal(cc.suggestion.type, 'feat', `归档 task 面在场 → feat（got ${JSON.stringify(cc.suggestion)}）`)
  assert.ok(cc.suggestion.subject.includes('mychange'), 'subject 指向变更')
  assert.ok(!cc.suggestion.subject.includes('quick') && !cc.suggestion.body.includes('quick'), '无凭空 quick 字样')
})

test('FR-11：quicklog 文件在变更集 → fix 语义保留；subject 已列标题不进 body 重复', () => {
  const f = baseRepo('pcs-quick-')
  mkdirSync(join(f.specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(f.specBase, 'quicklog', 'QUICKLOG-t.md'), QUICK_MD('2026-10-15 23:00:00', ['修一处', '再修一处']))
  const cc = collectCommitContext({ cwd: f.cwd })
  assert.equal(cc.suggestion.type, 'fix', 'quick 文件在变更集 → fix')
  assert.ok(cc.suggestion.subject.includes('修一处') && cc.suggestion.subject.includes('再修一处'), 'subject 全列标题')
  // 去重契约：标题不重复进 body（body 保留 qlId 审计锚行——QUICKLOG 对账锚点）
  assert.ok(!cc.suggestion.body.includes('修一处') && !cc.suggestion.body.includes('再修一处'),
    `body 不重复标题（got body: ${JSON.stringify(cc.suggestion.body)}）`)
  const bodyQuick = cc.suggestion.body.split('\n').filter(l => l.startsWith('- quick '))
  assert.equal(bodyQuick.length, 2, 'body 保留 2 条 qlId 锚行')
})

test('FR-11：纯阶段产出（无 task 无 quick）→ chore 归档语义（不再捏造 quick 修复）', () => {
  const f = baseRepo('pcs-chore-')
  mkdirSync(join(f.specBase, 'knowledge'), { recursive: true })
  writeFileSync(join(f.specBase, 'knowledge', 'INDEX.md'), 'idx\n')
  const cc = collectCommitContext({ cwd: f.cwd })
  assert.equal(cc.suggestion.type, 'chore', `纯阶段产出 → chore（got ${JSON.stringify(cc.suggestion)}）`)
  assert.ok(cc.suggestion.subject.includes('knowledge'), 'subject 列阶段产出')
  assert.ok(!cc.suggestion.subject.includes('quick'), '不出现 quick 字样')
})
