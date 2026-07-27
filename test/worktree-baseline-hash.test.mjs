/**
 * computeBaselineHash 排除规则测试（坑 execute-worktree-assess-baseline-drift-by-metadata）
 *
 * 验证 baseline hash 排除 execute 流程自身会改的元数据目录：
 *   - .sillyspec/（原有）：plan/design 蓝图 + runtime
 *   - docs/sillyspec/（本次修复新增）：工具坑文件
 * 只对比源码 baseline。否则 execute 写元数据会 baseline 漂移 → apply BLOCKED。
 * 同时验证保护未削弱：源码 / docs 下非 sillyspec 改动仍被检测。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { computeBaselineHash } from '../src/worktree.js'

let failed = 0
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'blh-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -m init', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  process.chdir(d)
  return d
}

console.log('=== computeBaselineHash 排除规则（坑 baseline-drift）===\n')

const d = setupRepo()

const h0 = computeBaselineHash(d)
assertTrue(typeof h0 === 'string' && h0.length === 16, `初始 hash 16 位（${h0}）`)

// ── .sillyspec/ 改动 → hash 不变（原有排除）──
console.log('\n--- .sillyspec/ 改动 → 不漂移 ---')
{
  fs.mkdirSync(path.join(d, '.sillyspec', 'changes', 'x'), { recursive: true })
  fs.writeFileSync(path.join(d, '.sillyspec', 'changes', 'x', 'plan.md'), '# plan\n')
  const h = computeBaselineHash(d)
  assertTrue(h === h0, `.sillyspec/ 改动后 hash 不变（${h} === ${h0}）`)
}

// ── docs/sillyspec/ 改动 → hash 不变（本次修复新增）──
console.log('\n--- docs/sillyspec/ 改动 → 不漂移（修复项）---')
{
  fs.mkdirSync(path.join(d, 'docs', 'sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, 'docs', 'sillyspec', 'a-pit.md'), '# pit\n')
  const h = computeBaselineHash(d)
  assertTrue(h === h0, `docs/sillyspec/ 改动后 hash 不变（${h} === ${h0}）`)
}

// ── 源码改动 → hash 变（保护未削弱）──
console.log('\n--- 源码改动 → 仍漂移（保护未削弱）---')
{
  fs.writeFileSync(path.join(d, 'src-real.txt'), 'real change\n')
  const h = computeBaselineHash(d)
  assertTrue(h !== h0, `源码改动后 hash 变化（${h} !== ${h0}）`)
}

// ── docs/ 下非 sillyspec 改动 → hash 变（只排 sillyspec 坑目录，非整个 docs/）──
console.log('\n--- docs/ 非 sillyspec 改动 → 仍漂移（精确排除）---')
{
  const before = computeBaselineHash(d)
  fs.mkdirSync(path.join(d, 'docs', 'design'), { recursive: true })
  fs.writeFileSync(path.join(d, 'docs', 'design', 'spec.md'), '# design\n')
  const h = computeBaselineHash(d)
  assertTrue(h !== before, `docs/design/ 改动后 hash 变化（${h} !== ${before}，只排 docs/sillyspec/）`)
}

process.chdir(os.tmpdir())
fs.rmSync(d, { recursive: true, force: true })

console.log(`\n==================================================`)
console.log(failed === 0 ? '✅ 全部通过' : `❌ 失败: ${failed}`)
console.log(`==================================================`)
process.exit(failed === 0 ? 0 : 1)
