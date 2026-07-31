/**
 * verify-deletion-check.test.mjs — verify 删除探针（advisory）单测
 *
 * 用真实 git 临时仓模拟「apply 后工作树状态」：apply（git apply --3way）不 commit，
 * 删除的文件在工作树消失但仍在 HEAD → `git diff --name-status HEAD` 显示 D。
 *
 * 覆盖：高风险（声明修改却删）/ 合规（声明删除）/ 未声明 / 无删除→skipped /
 *       design 无清单 / filterDeliverableFiles（.sillyspec/ 不计）/ base 已 commit→skipped / glob 容差
 */
import { execSync } from 'child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { runVerifyDeletionCheck } from '../src/verify-postcheck.js'

let passed = 0
let failed = 0
function assert(name, cond, detail = '') {
  if (cond) { console.log(`✅ PASS: ${name}`); passed++ }
  else { console.error(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString()
}

function mkRepoWithFiles(files) {
  const dir = mkdtempSync(join(tmpdir(), 'vdel-'))
  git(dir, 'init -q')
  git(dir, 'config user.email t@t.t')
  git(dir, 'config user.name t')
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(p)), { recursive: true })
    writeFileSync(join(dir, p), c)
  }
  git(dir, 'add -A')
  git(dir, 'commit -q -m base')
  return dir
}

function writeDesign(dir, change, body) {
  const p = join(dir, '.sillyspec', 'changes', change, 'design.md')
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, body)
}

const SECTION = (table) => `# x\n\n## 文件变更清单\n\n${table}\n`
const run = (dir, change) =>
  runVerifyDeletionCheck({ cwd: dir, specBase: join(dir, '.sillyspec'), changeName: change })

// case A: 高风险（声明修改却整文件删除）
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n' })
  try {
    rmSync(join(dir, 'src/a.js'))
    writeDesign(dir, 'c-a', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | x |\n'))
    const r = run(dir, 'c-a')
    assert('A 高风险：status=warning', r.status === 'warning', `status=${r.status}`)
    assert('A 高风险：highRisk 含 src/a.js(修改)', r.highRisk.some(h => h.path === 'src/a.js' && h.declaredOp === '修改'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case B: 合规（声明删除）
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n' })
  try {
    rmSync(join(dir, 'src/a.js'))
    writeDesign(dir, 'c-b', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 删除 | src/a.js | 已替代 |\n'))
    const r = run(dir, 'c-b')
    assert('B 合规：status=passed', r.status === 'passed', `status=${r.status}`)
    assert('B 合规：compliant 含 src/a.js', r.compliant.some(c => c.path === 'src/a.js'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case C: 未声明删除
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n', 'src/b.js': 'old\n' })
  try {
    rmSync(join(dir, 'src/b.js'))
    writeDesign(dir, 'c-c', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | x |\n'))
    const r = run(dir, 'c-c')
    assert('C 未声明：status=warning', r.status === 'warning', `status=${r.status}`)
    assert('C 未声明：mediumRisk 含 src/b.js', r.mediumRisk.some(m => m.path === 'src/b.js'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case D: 无删除（只有修改）→ skipped
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n' })
  try {
    writeFileSync(join(dir, 'src/a.js'), 'new content\n')
    writeDesign(dir, 'c-d', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | x |\n'))
    const r = run(dir, 'c-d')
    assert('D 无删除：status=skipped', r.status === 'skipped', `status=${r.status} reason=${r.reason}`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case E: design 无清单章节 → 所有删除归未声明
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n' })
  try {
    rmSync(join(dir, 'src/a.js'))
    writeDesign(dir, 'c-e', '# x\n\n## 概述\n\n无文件清单章节\n')
    const r = run(dir, 'c-e')
    assert('E 无清单：status=warning', r.status === 'warning', `status=${r.status}`)
    assert('E 无清单：mediumRisk 含 src/a.js（未声明）', r.mediumRisk.some(m => m.path === 'src/a.js'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case F: filterDeliverableFiles（.sillyspec/ 删除不计入 → skipped）
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n', '.sillyspec/notes/doc.md': 'n\n' })
  try {
    rmSync(join(dir, '.sillyspec', 'notes', 'doc.md')) // 只删 .sillyspec/ 文件
    writeDesign(dir, 'c-f', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/a.js | x |\n'))
    const r = run(dir, 'c-f')
    assert('F 过滤：.sillyspec/ 删除被过滤 → skipped', r.status === 'skipped',
      `status=${r.status}（若 warning 说明 .sillyspec/ 未被过滤）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case G: 删除已被 commit（HEAD 推进）→ diff 空 → skipped
{
  const dir = mkRepoWithFiles({ 'src/a.js': 'old\n' })
  try {
    rmSync(join(dir, 'src/a.js'))
    git(dir, 'add -A'); git(dir, 'commit -q -m remove')
    writeDesign(dir, 'c-g', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 删除 | src/a.js | x |\n'))
    const r = run(dir, 'c-g')
    assert('G 已 commit：status=skipped（diff 无锚点）', r.status === 'skipped', `status=${r.status} reason=${r.reason}`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// case I: glob/目录前缀容差（design 写 src/old/**，删 src/old/x.js 命中）
{
  const dir = mkRepoWithFiles({ 'src/old/x.js': 'old\n' })
  try {
    rmSync(join(dir, 'src/old/x.js'))
    writeDesign(dir, 'c-i', SECTION('| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/old/** | x |\n'))
    const r = run(dir, 'c-i')
    assert('I glob 容差：status=warning', r.status === 'warning', `status=${r.status}`)
    assert('I glob 容差：highRisk 含 src/old/x.js', r.highRisk.some(h => h.path === 'src/old/x.js'),
      `highRisk=${JSON.stringify(r.highRisk)}`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}`)
console.log(`❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
process.exit(failed > 0 ? 1 : 0)
