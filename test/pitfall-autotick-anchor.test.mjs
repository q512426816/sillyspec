/**
 * 2026-10-15-pitfall-batch-clearance FR-08 — full-autopilot 代勾实现事实锚
 *
 * 坑 wt-commit-auto-tick-unimplemented-tasks（消费仓 Wave1/2 两次实证）：task-01 的 wt-commit
 * 正文提及 task-02/03/04 → 全被机器代勾 [x]，批量完成判定与续跑跳过双失真。
 * 锁死契约：代勾证据 = 提交 subject 行的 task-NN token ×（卡面在场时）提交触及面与
 * allowed_paths 交叠；正文散文提及不勾；subject 在场但触及面零交叠不勾（无锚不勾）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { autoTickTasksFromCommitSubjects } from '../src/run/complete.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args, opts = {}) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', ...opts })

async function fixture(prefix, changeName) {
  const proj = mk('atk-')
  git(proj, ['init', '-q', '-b', 'main'])
  git(proj, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'base.txt'), 'base\n')
  git(proj, ['add', '.'])
  git(proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'])
  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: a\n- [ ] task-02: b\n- [ ] task-03: c\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '---\ntask: task-01\nallowed_paths:\n  - src/a.js\n---\n')
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), '---\ntask: task-02\nallowed_paths:\n  - src/b.js\n---\n')
  writeFileSync(join(changeDir, 'tasks', 'task-03.md'), '---\ntask: task-03\nallowed_paths:\n  - src/c.js\n---\n')
  return { proj, specBase, changeName }
}

test('FR-08：正文散文提及不勾；subject × allowed_paths 交叠才勾；零交叠不勾', async () => {
  const f = await fixture('atk-main-', 'atk-x')
  // c1：subject 含 task-01 且触及 src/a.js（卡面声明面）→ 应勾
  mkdirSync(join(f.proj, 'src'), { recursive: true })
  writeFileSync(join(f.proj, 'src', 'a.js'), 'a\n')
  git(f.proj, ['add', '.'])
  git(f.proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', '(task-01) impl a'])
  // c2：subject 不含 task 号，正文提及 task-02/03 —— 修复前 %B 全文提 token 会误勾
  writeFileSync(join(f.proj, 'docs.md'), 'doc\n')
  git(f.proj, ['add', '.'])
  git(f.proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'chore: docs', '-m', '说明：后续 (task-02)(task-03) 待实现'])
  // c3：subject 含 task-03 但触及面与 task-03 卡 allowed_paths（src/c.js）零交叠 → 无锚不勾
  writeFileSync(join(f.proj, 'docs2.md'), 'doc2\n')
  git(f.proj, ['add', '.'])
  git(f.proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', '(task-03) stray touch'])

  const out = await autoTickTasksFromCommitSubjects({ changeName: f.changeName, cwd: f.proj, specBase: f.specBase, platformOpts: {} })
  const md = readFileSync(join(f.specBase, 'changes', f.changeName, 'tasks.md'), 'utf8')
  assert.ok(/^- \[x\] task-01/m.test(md), `task-01 被代勾（subject × allowed_paths 交叠）\n${md}`)
  assert.ok(/^- \[ \] task-02/m.test(md), `task-02 不被代勾（正文散文提及非证据）\n${md}`)
  assert.ok(/^- \[ \] task-03/m.test(md), `task-03 不被代勾（触及面与声明面零交叠）\n${md}`)
  assert.equal(out.ticked, 1, 'ticked=1')
  assert.equal(out.skippedNoAnchor, 1, 'skippedNoAnchor=1（task-03 零交叠留痕）')
})

test('FR-08：无卡面时退化为仅 subject token（合法兜底不误伤）', async () => {
  const f = await fixture('atk-nocard-', 'atk-y')
  mkdirSync(join(f.proj, 'src'), { recursive: true })
  writeFileSync(join(f.proj, 'src', 'b.js'), 'b\n')
  git(f.proj, ['add', '.'])
  git(f.proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', '(task-02) impl b'])
  // 移除卡面（无 allowed_paths 可依）→ subject token 即锚
  rmSync(join(f.specBase, 'changes', f.changeName, 'tasks'), { recursive: true, force: true })
  const out = await autoTickTasksFromCommitSubjects({ changeName: f.changeName, cwd: f.proj, specBase: f.specBase, platformOpts: {} })
  const md = readFileSync(join(f.specBase, 'changes', f.changeName, 'tasks.md'), 'utf8')
  assert.ok(/^- \[x\] task-02/m.test(md), '无卡面：subject token 退化锚生效')
  assert.ok(/^- \[ \] task-01/m.test(md), '无提交证据的 task 不动')
  assert.equal(out.ticked, 1, 'ticked=1')
})
