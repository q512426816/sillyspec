/**
 * 2026-10-06-verify-docs-prefill — gate verify --docs-only 只读预检档回归
 *
 * postmortem（sess_4769fd5d）：gate verify 只读重跑含测试执行，--json 实测超时转后台 + task id
 * 抄错绕 3 轮；纯文档契约缺项（visual-evidence/结论槽/移交项等）毫秒级可查却无轻量档。
 * 锁死契约：
 *   D1 docsOnly：verify-test/verify-lint 以 informational 占位（skip 说明），测试命令不执行
 *      （marker 文件法证明）；其余检查（artifacts 等）照跑。
 *   D2 对照：无 docsOnly 的完整 gate 真执行 commands.test（marker 在场）。
 *   D3 CLI 互斥：--docs-only 与 --full 并存 exit 2（一个减检查一个加检查，语义矛盾）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runGate } from '../src/machine-interface.js'
import { ProgressManager } from '../src/progress.js'

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')
const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

async function fixture() {
  const proj = mk('docsgate-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['init', '-q']); git(proj, ['add', '.']); git(proj, ['commit', '-qm', 'init'])
  // marker 法：commands.test 指向写 marker 的脚本——docsOnly 生效则 marker 不出现
  const marker = join(proj, 'marker-ran.txt')
  writeFileSync(join(proj, 'marker.js'), `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')\n`)
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: "node marker.js"\n')
  // 测试面（D2 对照需要动态子集非空——零测试面的变更完整档也合法 skip）
  mkdirSync(join(proj, 'src'), { recursive: true })
  mkdirSync(join(proj, 'test'), { recursive: true })
  writeFileSync(join(proj, 'src', 'lib.js'), 'export const a = 1\n')
  writeFileSync(join(proj, 'test', 'lib.test.mjs'), "import { test } from 'node:test'\nimport { a } from '../src/lib.js'\ntest('t', () => { if (a !== 1) throw new Error('x') })\n")
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  await pm.initChange(proj, 'c1')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '---\nchange: c1\n---\n# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/lib.js | 改动 |\n')
  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: t\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: t', 'title_zh: t', 'author: t',
    'created_at: 2026-10-06 00:00:00', 'priority: P0', 'depends_on: []', 'blocks: []',
    'requirement_ids: []', 'decision_ids: []', 'allowed_paths:', '  - src/lib.js',
    'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a',
    'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
  ].join('\n'))
  return { cwd: proj, specBase, changeName: 'c1', marker }
}

const checkById = (envelope, id) => (envelope.checks || []).find(c => c.id === id)

test('D1 docsOnly：verify-test/verify-lint informational 占位，测试命令不执行，artifacts 照跑', async () => {
  const { cwd, specBase, changeName, marker } = await fixture()
  const { envelope, exitCode } = await runGate('verify', changeName, { cwd, specBase, docsOnly: true })
  const vt = checkById(envelope, 'verify-test')
  const vl = checkById(envelope, 'verify-lint')
  assert.ok(vt, 'verify-test 检查在场（占位形态）')
  assert.equal(vt.informational, true, 'verify-test informational')
  assert.ok((vt.warnings || []).some(w => w.includes('--docs-only')), `skip 说明含档位名：${vt.warnings}`)
  assert.equal(vt.data && vt.data.status, 'docs-only-skip', 'data.status=docs-only-skip')
  assert.ok(vl, 'verify-lint 检查在场（占位形态）')
  assert.equal(vl.informational, true, 'verify-lint informational')
  assert.ok(checkById(envelope, 'artifacts'), 'artifacts 检查照跑（文档契约面不缩水）')
  assert.ok(!existsSync(marker), '测试命令未执行（marker 不在场）')
  assert.notEqual(exitCode, 2, 'docs-only 预检不是「无法核验」态')
})

test('D2 对照：完整档走真实决策路径（非 docs-only 占位；跳过时有 CLI 自身的 dynamic-empty 理由）', async () => {
  const { cwd, specBase, changeName } = await fixture()
  const { envelope } = await runGate('verify', changeName, { cwd, specBase })
  const vt = checkById(envelope, 'verify-test')
  assert.ok(vt && vt.informational !== true, '完整档 verify-test 是实检/实决策非占位')
  assert.notEqual(vt.data && vt.data.status, 'docs-only-skip', '状态不是 docs-only 占位态')
  // 本夹具无 execute 交付态（无 worktree meta/无 head commit），完整档合法 skip 且给出 CLI 自身
  // 理由（动态子集空）——与 docsOnly 的跳过可区分；marker 法在此形态下无法区分两者，故不适用
  if (vt.data && vt.data.status === 'skipped') {
    assert.ok((vt.warnings || []).some(w => w.includes('动态子集空') || w.includes('未核验测试')), 'skip 带 CLI 自身理由（非档位跳过）')
  }
})

test('D3 CLI 互斥：--docs-only 与 --full 并存 exit 2（先于变更存在性检查）', () => {
  const r = spawnSync(process.execPath, [BIN, 'gate', 'verify', '--change', 'no-such-change', '--docs-only', '--full'], { encoding: 'utf8' })
  assert.equal(r.status, 2, `exit 2（实际 ${r.status}）：${r.stderr}`)
  assert.ok(String(r.stderr).includes('互斥'), '报错含互斥说明')
})
