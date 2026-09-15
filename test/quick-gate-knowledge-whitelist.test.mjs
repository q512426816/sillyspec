/**
 * 知识库文件白名单（2026-09-15 用户实测反馈：「用户实测反馈三连修」节奏下，登记知识条目是
 * quick 收尾常规动作，却被两道门禁反复拦截）：
 *
 *   1. 危险门——.sillyspec/knowledge/ 下 INDEX.md / known-issues.md / patterns.md /
 *      conventions.md / decisions/ 等非 isQuickMetadata 文件，窗口内改动即「危险文件变更」
 *      blocked，只能 --force-baseline；
 *   2. 分级门禁——知识文件留在 gateFiles（isQuicklogFileLineNoise 只滤 quicklog/.runtime/
 *      _module-map），perFileNotes 要求 --file-notes 逐文件覆盖（含顺手修的存量引用），
 *      L1 收尾反复拦截。
 *
 * 裁决：知识库是 CLI 自管面（knowledge classify append-only + validate 守门），与 quicklog
 * 同属 quick 自身元数据——.sillyspec/knowledge/ 整体纳入 isQuickMetadata 白名单，gateFiles
 * 补同口径过滤；predictProtectedQuickFiles 预告自动跟随。可追溯性不靠文件行，靠 quicklog
 * 结构化条目 + git diff + knowledge validate。
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { isQuickMetadata, auditQuickCompletion } from '../src/run.js'
import { predictProtectedQuickFiles } from '../src/run/shared.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `qkw-${prefix}-`))
  tmpRoots.push(d)
  return d
}

console.log('=== isQuickMetadata：.sillyspec/knowledge/ 整体白名单 ===\n')
{
  for (const f of [
    '.sillyspec/knowledge/INDEX.md',
    '.sillyspec/knowledge/known-issues.md',
    '.sillyspec/knowledge/patterns.md',
    '.sillyspec/knowledge/conventions.md',
    '.sillyspec/knowledge/decisions/2026-09-some-decision.md',
    '.sillyspec/knowledge/uncategorized.md',
  ]) {
    assert(isQuickMetadata(f, []) === true, `${f} → 元数据（反斜杠口径 ${isQuickMetadata(f.replace(/\//g, '\\'), []) === true ? '同' : '异'}）`)
  }
  // 负例：白名单不外溢
  assert(isQuickMetadata('.sillyspec/knowledge-base/INDEX.md', []) === false, 'knowledge-base/ 前缀相近目录不命中（尾斜杠边界）')
  assert(isQuickMetadata('docs/knowledge/INDEX.md', []) === false, '仓内其他 knowledge 目录不命中')
  assert(isQuickMetadata('.sillyspec/changes/x/design.md', []) === true, 'changes/ 非关联目录照旧放行（回归保护）')
  assert(isQuickMetadata('src/run/command.js', []) === false, '危险源码不命中（回归保护）')
}

console.log('\n=== predictProtectedQuickFiles：预告不再点名知识文件 ===\n')
{
  const r = predictProtectedQuickFiles(
    ['.sillyspec/knowledge/INDEX.md', '.sillyspec/knowledge/known-issues.md', 'src/run/command.js'],
    {},
  )
  assert(JSON.stringify(r) === JSON.stringify(['src/run/command.js']),
    `--files 声明含知识文件时预告只留真危险文件（实际 ${JSON.stringify(r)}）`)
}

// 仓库 fixture：.sillyspec/ 被跟踪（真实仓口径——本仓 quicklog/知识库均入库），知识文件 tracked
function makeRepo() {
  const d = mkTmp('repo')
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  mkdirSync(join(d, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'quicklog', 'test.md'), '# task\n')
  mkdirSync(join(d, '.sillyspec', 'knowledge'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'knowledge', 'INDEX.md'), '# INDEX\n## Known Issues\n')
  writeFileSync(join(d, '.sillyspec', 'knowledge', 'known-issues.md'), '# Known Issues\n')
  writeFileSync(join(d, 'package.json'), '{}\n')
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}

const baseGuard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: [] }

console.log('\n=== auditQuickCompletion：窗口内登记知识不再拦 ===\n')

// case 1: 改 tracked known-issues.md（登记条目）→ 不 blocked、无危险 reason
{
  const d = makeRepo()
  writeFileSync(join(d, '.sillyspec', 'knowledge', 'known-issues.md'), '# Known Issues\n\n## 新坑\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'safe', `改 known-issues.md → safe（实际 ${r.status}，reasons=${JSON.stringify(r.reasons)}）`)
  assert(!r.reasons.some(x => x.includes('危险')), `known-issues.md 不进危险 reasons`)
}

// case 2: INDEX.md 路由行同步改 → 不 blocked
{
  const d = makeRepo()
  writeFileSync(join(d, '.sillyspec', 'knowledge', 'INDEX.md'), '# INDEX\n## Known Issues\n- [新坑](known-issues.md#新坑)\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'safe', `改 INDEX.md → safe（实际 ${r.status}，reasons=${JSON.stringify(r.reasons)}）`)
}

// case 3: 新建知识条目文件（decisions/ 下 untracked）→ 不需 --allow-new
{
  const d = makeRepo()
  mkdirSync(join(d, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'knowledge', 'decisions', '2026-09-r.md'), '# 裁决\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(!r.reasons.some(x => x.includes('新增文件')), `新建 decisions 条目不报「新增文件（需 --allow-new）」（实际 ${JSON.stringify(r.reasons)}）`)
  assert(r.status === 'safe', `新建知识条目 → safe（实际 ${r.status}）`)
}

// case 4: perFileNotes——code 文件 + 知识文件同窗口，--file-notes 只注记 code 文件 → 覆盖判定通过
{
  const d = makeRepo()
  writeFileSync(join(d, 'feature.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-feature', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'feature.js'), 'export const x = 2\n') // tracked 修改（非新增，避开 --allow-new 噪声）
  writeFileSync(join(d, '.sillyspec', 'knowledge', 'known-issues.md'), '# Known Issues\n\n## 新坑\n')
  const r = await auditQuickCompletion(d, baseGuard, {
    fileNotes: [{ path: 'feature.js', note: '修边界' }],
  })
  assert(r.gateProfile != null, `门禁画像已计算（fail-open 不得静默 null）`)
  assert(r.gateProfile.checks.perFileNotes === true,
    `perFileNotes 只考 code 文件，知识文件不强制 --file-notes（实际 ${r.gateProfile.checks.perFileNotes}）`)
  assert(r.gateProfile.fileCount === 1,
    `gateFiles 剔除知识文件（fileCount 实际 ${r.gateProfile.fileCount}）`)
}

// case 5: 回归——危险源码仍拦（白名单不得外溢到非知识面）
{
  const d = makeRepo()
  mkdirSync(join(d, 'src', 'run'), { recursive: true })
  writeFileSync(join(d, 'src', 'run', 'command.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'run', 'command.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'blocked', `src/run/command.js 仍 blocked（回归保护，实际 ${r.status}）`)
}

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`)
if (failed > 0) {
  console.log('失败用例：')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
