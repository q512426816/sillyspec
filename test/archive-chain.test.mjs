/**
 * archive-chain.test.mjs — 归档执行链抽取（R7 切片二 task-02 / FR-05）
 *
 * 覆盖验收面：
 *   ① runArchiveChain 可导入、happy path 端到端（目录搬移+unregisterChange 终态一致化）；
 *   ② skipPlanCheck 两态：false（既有语义）缺 plan.md → 子进程 exit 1（移动前硬校验）；
 *      true（flow 薄工件面旁路）缺 plan.md → 归档成功；
 *   ③ 既有语义零变化：plan.md 在场 + skipPlanCheck=false → 正常归档（缺省路径回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const { runArchiveChain } = await import('../src/run/complete-handlers.js')

function makeFixture(withPlan) {
  const root = mkdtempSync(join(tmpdir(), 'ac-'))
  const specBase = join(root, '.sillyspec')
  const srcDir = join(specBase, 'changes', 'c1')
  mkdirSync(srcDir, { recursive: true })
  if (withPlan) writeFileSync(join(srcDir, 'plan.md'), '# plan\n')
  writeFileSync(join(srcDir, 'proposal.md'), '# p\n')
  const destDir = join(specBase, 'changes', 'archive', '2026-09-22-c1')
  const pm = { unregisterChangeCalls: [], unregisterChange(cwd, name, opts) { this.unregisterChangeCalls.push({ cwd, name, opts }) } }
  return { root, specBase, srcDir, destDir, pm }
}

test('happy path: plan.md 在场 + skipPlanCheck 缺省 false → 目录搬移 + 终态一致化（既有语义回归）', async () => {
  const { root, specBase, srcDir, destDir, pm } = makeFixture(true)
  await runArchiveChain({ pm, cwd: root, specBase, changeName: 'c1', srcDir, destDir })
  assert.equal(existsSync(srcDir), false, '源目录已搬走')
  assert.equal(existsSync(join(destDir, 'plan.md')), true, '归档目录就位')
  assert.equal(pm.unregisterChangeCalls.length, 1)
  assert.equal(pm.unregisterChangeCalls[0].name, 'c1')
  rmSync(root, { recursive: true, force: true })
})

test('skipPlanCheck=true: 薄工件面（无 plan.md）旁路硬校验 → 归档成功（task-03 消费入口）', async () => {
  const { root, specBase, srcDir, destDir, pm } = makeFixture(false)
  await runArchiveChain({ pm, cwd: root, specBase, changeName: 'c1', srcDir, destDir, skipPlanCheck: true })
  assert.equal(existsSync(srcDir), false)
  assert.equal(existsSync(join(destDir, 'proposal.md')), true)
  assert.equal(pm.unregisterChangeCalls.length, 1)
  rmSync(root, { recursive: true, force: true })
})

test('skipPlanCheck=false: 缺 plan.md → 移动前硬校验阻断 exit 1（子进程验证，纯搬运不改 exit 语义）', () => {
  const { root, specBase, srcDir, destDir, pm } = makeFixture(false)
  const modUrl = new URL('../src/run/complete-handlers.js', import.meta.url).href
  const code = `import(${JSON.stringify(modUrl)}).then(async (m) => {`
    + ` await m.runArchiveChain({ pm: { unregisterChange() {} }, cwd: ${JSON.stringify(root)}, specBase: ${JSON.stringify(specBase)},`
    + ` changeName: 'c1', srcDir: ${JSON.stringify(srcDir)}, destDir: ${JSON.stringify(destDir)} }) }).catch((e) => { console.error(e && e.message); process.exit(3) })`
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 60_000 })
  assert.equal(r.status, 1, `期望 exit 1，实际 ${r.status}；stderr: ${r.stderr}`)
  assert.equal(existsSync(srcDir), true, '移动前阻断：源目录未动')
  assert.equal(existsSync(destDir), false, '目标未产生')
  rmSync(root, { recursive: true, force: true })
})
