/**
 * 2026-09-27-gate-face-binding-parity 防回归：
 *
 * ① faceOverride（R23-thin 实证盲区修复）：快照锚 HEAD + thin「先提交再收口」⇒ 仓内 diff
 *    只剩真未提交文件 ⇒ 无 override 时动态子集假空（dynamic-empty，文档化旧行为）；
 *    faceOverride 在场=调用方权威面（含已提交交付）⇒ 动态子集真跑已提交测试。
 * ② full 流程绑定面：ensureBindingSlots 单源行为（有 FR 块追加 / 已有槽 no-op / 无 FR 块
 *    追加 FR-01 槽 / requirements 缺席 no-op）——brainstorm --done 接线（gates.js）消费同一助手。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runVerifyTestCheck } from '../src/verify-postcheck.js'
import { ensureBindingSlots } from '../src/flow-draft.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function sh(args, cwd) { execFileSync(args[0], args.slice(1), { cwd, stdio: 'pipe' }) }

test('① faceOverride：commit-then-done 场景——无 override=dynamic-empty 假跳过；带 override=动态子集真跑已提交交付', () => {
  const root = mk('face-ov-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(join(root, 'test', 'impl.test.mjs'), "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('committed', () => { assert.ok(true) })\n")
  sh(['git', 'init', '-q'], root)
  sh(['git', 'config', 'user.email', 't@t'], root)
  sh(['git', 'config', 'user.name', 't'], root)
  sh(['git', 'add', '.'], root)
  sh(['git', 'commit', '-qm', 'init'], root)
  // commit-then-done + 脏文件在权威面内（R23-thin 真实形态：AGENTS.md 未提交且属变更面）——
  // 仓内推导只见未提交的 src/impl.js（已提交交付不可见），∩restrict 非空 → 不触发空回退 → 动态子集假空
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'impl.js'), 'export const x = 1\n')
  sh(['git', 'add', '.'], root)
  sh(['git', 'commit', '-qm', 'impl'], root)
  writeFileSync(join(root, 'src', 'impl.js'), 'export const x = 2\n') // 未提交触碰（脏且在面内）
  delete process.env.NODE_TEST_CONTEXT

  const authoritativeFace = ['test/impl.test.mjs', 'src/impl.js'] // flow done 主仓侧 baseline..HEAD 的权威面

  // 旧行为（无 override）：仓内推导=[src/impl.js]（已提交测试不进未提交面）→ deps 空 → dynamic-empty 假跳过（文档化）
  const blind = runVerifyTestCheck({ cwd: root, specBase, changeName: null, restrictFiles: authoritativeFace })
  assert.equal(blind.mode, 'dynamic-empty', `无 override 时盲区复现（文档化旧行为，实得 ${blind.mode}）`)

  // 修复：faceOverride 在场 → 已提交交付进动态子集真跑
  const r = runVerifyTestCheck({ cwd: root, specBase, changeName: null, restrictFiles: authoritativeFace, faceOverride: authoritativeFace })
  assert.equal(r.mode, 'dynamic-subset', `override 使动态子集真跑（实得 ${r.mode}）`)
  assert.equal(r.status, 'passed', `已提交测试实测通过（${r.reason || ''}）`)
  assert.match(String(r.command), /deps\(js1\)/, `权威面里的测试文件被执行（${r.command}）`)
})

test('① faceOverride 空/缺省：零行为变化（走既有仓内推导）', () => {
  const root = mk('face-ov2-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'test', 'a.test.mjs'), "import { test } from 'node:test'\ntest('a', () => {})\n")
  sh(['git', 'init', '-q'], root)
  sh(['git', 'config', 'user.email', 't@t'], root)
  sh(['git', 'config', 'user.name', 't'], root)
  sh(['git', 'add', '.'], root)
  sh(['git', 'commit', '-qm', 'i'], root)
  writeFileSync(join(root, 'test', 'a.test.mjs'), "import { test } from 'node:test'\ntest('a2', () => {})\n")
  delete process.env.NODE_TEST_CONTEXT
  const r = runVerifyTestCheck({ cwd: root, specBase, changeName: null, faceOverride: [] })
  assert.equal(r.mode, 'dynamic-subset', '空 override 视同缺省（未提交测试照常进面）')
  assert.equal(r.status, 'passed')
})

test('② ensureBindingSlots：full 流程绑定面单源行为', () => {
  const dir = mk('slots-')
  const req = join(dir, 'requirements.md')

  // 有 FR 块、无绑定面 → 按 FR 编号追加
  writeFileSync(req, '# 需求\n\n## FR-01: 行为一\n\n## FR-02: 行为二\n')
  const a = ensureBindingSlots({ changeDir: dir })
  assert.equal(a.appended, true)
  assert.equal(a.slots, 2)
  const text1 = readFileSync(req, 'utf8')
  assert.match(text1, /AGENT:测试绑定FR-01/, 'FR-01 槽在场')
  assert.match(text1, /AGENT:测试绑定FR-02/, 'FR-02 槽在场')

  // 幂等：已有槽 no-op
  const b = ensureBindingSlots({ changeDir: dir })
  assert.equal(b.appended, false, '已有绑定面 no-op')

  // 无 FR 块 → 追加 FR-01 槽（缺省槽）
  const dir2 = mk('slots2-')
  writeFileSync(join(dir2, 'requirements.md'), '# 需求\n\n正文无 FR 块\n')
  const c = ensureBindingSlots({ changeDir: dir2 })
  assert.equal(c.appended, true)
  assert.equal(c.slots, 1)

  // requirements 缺席 → no-op
  const d = ensureBindingSlots({ changeDir: mk('slots3-') })
  assert.equal(d.appended, false)
})
