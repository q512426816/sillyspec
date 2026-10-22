/**
 * flow-verify-drafts.test.mjs — spec 面起草自查只读命令（2026-10-23-flow-verify-drafts）
 *
 * verify-drafts 与 approve 批准门同判定同源（computeSpecFaceChecks 单一源）：
 *   ① 骨架未答 → exit 1 一次全列违规+零写盘；答齐 → exit 0 通过行（FR-01）
 *   ③ --json 与人类渲染同判定同退出码（FR-02）
 *   ④ 变更缺失/非法名 → exit 2（FR-03；approve 零变化由 approve-gate-tick/approve-channel-attest
 *      既有套件零改动全绿作回归锚，不在此重复）
 *   ⑤ flow start 横幅断点① 含自查指引行（FR-04）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'vd-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0', SILLYSPEC_SESSION_ID: 'vd-test' } })
  return { cwd, cli }
}

const INPUT = '起草自查只读命令的面\n成功标准：\n- 行为 X\n- 行为 Y'

/** 把 v2 骨架工件答齐：design 四节各答一行 + requirements FR 行为句 + 绑定行（approve-gate-tick 同款形态）。 */
function answerDocs(dir) {
  const d = readFileSync(join(dir, 'design.md'), 'utf8')
  const withAnswers = d
    .replace(/(## 做法概述\n)/, '$1复用批准门同源校验，只读自查。\n')
    .replace(/(## 接口契约\n)/, '$1新增只读子命令，approve 签名零变化。\n')
    .replace(/(## 边界与并发（盲维四问——每问必答，答不了即设计缺口）\n)/, '$11. 乱序成立：时点快照。\n2. 并发：零写盘无冲突。\n3. 切换：无状态副作用。\n4. 作用域：ledger 机本位降级同源。\n')
    .replace(/(## 风险与死路\n)/, '$1最大风险是判定漂移，单一源+回归锚保底。\n')
  writeFileSync(join(dir, 'design.md'), withAnswers)
  const r = readFileSync(join(dir, 'requirements.md'), 'utf8')
  writeFileSync(join(dir, 'requirements.md'), r
    .replace(/- （待撰写[^）]*）/g, '- 变更落地后必须满足行为 X。')
    .replace(/^(FR-\d{2}): （待填[^）]*）$/gm, (m, n) => `${n}: test/flow-verify-drafts.test.mjs「用例」`))
}

test('① 骨架未答自查：exit 1 一次全列违规 + 零写盘', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-vd-1', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-vd-1')
  const before = ['design.md', 'requirements.md', 'proposal.md', 'tasks.md', 'flow-state.yaml']
    .map((f) => [f, readFileSync(join(dir, f), 'utf8')])
  const s = cli(['flow', 'verify-drafts', '--change', '2026-09-01-vd-1'])
  assert.equal(s.status, 1, `exit 1（实际 ${s.status}）`)
  const out = s.stdout + s.stderr
  assert.match(out, /spec 面自查未通过/, '自查失败标题')
  assert.match(out, /修复后重跑/, '修复指引在场')
  assert.ok((out.match(/^   - /gm) || []).length >= 3, `一次全列（实际违规行 ${(out.match(/^   - /gm) || []).length}）`)
  for (const [f, text] of before) assert.equal(readFileSync(join(dir, f), 'utf8'), text, `${f} 字节不变（只读自查）`)
  rmSync(cwd, { recursive: true, force: true })
})

test('② 答齐通过：exit 0 通过行 + 批准指引（通过≠批准，无 spec_approved 落盘）', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-vd-2', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-vd-2')
  answerDocs(dir)
  const s = cli(['flow', 'verify-drafts', '--change', '2026-09-01-vd-2'])
  assert.equal(s.status, 0, `exit 0（实际 ${s.status}）输出：${(s.stdout + s.stderr).slice(0, 600)}`)
  const out = s.stdout + s.stderr
  assert.match(out, /spec 面自查通过/, '通过行')
  assert.match(out, /flow approve --change 2026-09-01-vd-2/, '指引下一步 approve')
  assert.doesNotMatch(readFileSync(join(dir, 'flow-state.yaml'), 'utf8'), /^spec_approved:/m, '通过≠批准：无批准落盘')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ --json 同判定同退出码：fail 态单对象 / pass 态 passed:true', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-vd-3', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-vd-3')
  const fail = cli(['flow', 'verify-drafts', '--change', '2026-09-01-vd-3', '--json'])
  assert.equal(fail.status, 1, 'fail 态 exit 1')
  const jf = JSON.parse(fail.stdout)
  assert.equal(jf.change, '2026-09-01-vd-3')
  assert.equal(jf.passed, false)
  assert.equal(jf.applicable, true)
  assert.ok(Array.isArray(jf.violations) && jf.violations.length > 0, 'violations 数组非空')
  for (const k of ['schema', 'advisories', 'skipDesign', 'degraded', 'v1EmptySlots']) assert.ok(k in jf, `字段 ${k} 在场`)
  answerDocs(dir)
  const pass = cli(['flow', 'verify-drafts', '--change', '2026-09-01-vd-3', '--json'])
  assert.equal(pass.status, 0, 'pass 态 exit 0')
  assert.equal(JSON.parse(pass.stdout).passed, true)
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 变更缺失 exit 2 + 文案给出路；非法变更名 exit 2', () => {
  const { cwd, cli } = makeRepo()
  const miss = cli(['flow', 'verify-drafts', '--change', '2026-09-01-vd-missing'])
  assert.equal(miss.status, 2, `missing exit 2（实际 ${miss.status}）`)
  assert.match(miss.stdout + miss.stderr, /变更不存在.*flow start/, '文案指向 flow start')
  const jsonMiss = cli(['flow', 'verify-drafts', '--change', '2026-09-01-vd-missing', '--json'])
  assert.equal(jsonMiss.status, 2, 'missing --json 同退出码')
  assert.equal(JSON.parse(jsonMiss.stdout).status, 'missing')
  const bad = cli(['flow', 'verify-drafts', '--change', '../evil'])
  assert.equal(bad.status, 2, '非法名 exit 2')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ flow start 横幅断点① 含 verify-drafts 自查指引行', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['flow', 'start', '--change', '2026-09-01-vd-5', '--input', INPUT])
  assert.equal(s.status, 0)
  const idx = s.stdout.indexOf('三断点纪律')
  assert.ok(idx !== -1, '断点块在场')
  const seg = s.stdout.slice(idx, idx + 500)
  assert.ok(seg.includes('flow verify-drafts --change 2026-09-01-vd-5'), `断点① 含自查指引行（段：${seg.slice(0, 200)}）`)
  rmSync(cwd, { recursive: true, force: true })
})
