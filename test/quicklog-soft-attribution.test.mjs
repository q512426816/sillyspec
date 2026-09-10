// 软归属（2026-09-10 用户反馈：--file-notes 括注只落声明文件，同模块测试文件漏声明时审计行有
// 提示但文件行不自动补齐，连续多批需手工核对）：
//   ① matchSameModuleTestFiles 纯函数：窗口内未声明测试文件 stem 对上声明 stem（相等/前缀+分隔符）
//   ② completeQuicklogEntry：softFiles 补入文件行 bullet 带「软归属」括注（fileNotes 模式追加 /
//     回退模式升级 bullet / fileNotes 已括注不重复）
//   ③ CLI 端到端：--files 声明 src、会话内改 src+test、--done 收尾 → 文件行含软归属 bullet +
//     审计行 🔍 单列、⚖️ 不再计软归属文件（防审计行与文件行自相矛盾）
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strict as assert } from 'node:assert'
import { matchSameModuleTestFiles } from '../src/run/shared.js'
import { allocateQuicklogEntry, completeQuicklogEntry, setQuickFileNotes } from '../src/quicklog.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function run(cmd) {
  try { return { out: execSync(cmd + ' 2>&1', { encoding: 'utf8', timeout: 90000, shell: true }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}

console.log('=== ① matchSameModuleTestFiles 纯函数 ===\n')
{
  assertTrue(
    JSON.stringify(matchSameModuleTestFiles(['src/change-list.js'], ['test/change-list-operation.test.mjs'])) === '["test/change-list-operation.test.mjs"]',
    'split 布局 + stem 前缀命中（src/change-list.js ↔ test/change-list-operation.test.mjs）')
  assertTrue(
    JSON.stringify(matchSameModuleTestFiles(['src/quicklog.js'], ['test/quicklog.test.mjs'])) === '["test/quicklog.test.mjs"]',
    'stem 精确相等命中（src/quicklog.js ↔ test/quicklog.test.mjs）')
  assertTrue(
    JSON.stringify(matchSameModuleTestFiles(['src/foo.ts'], ['src/foo.test.ts'])) === '["src/foo.test.ts"]',
    'co-located 命中（src/foo.ts ↔ src/foo.test.ts）')
  assertTrue(
    matchSameModuleTestFiles(['src/a.js'], ['test/b.test.mjs']).length === 0,
    '不同模块不命中（src/a.js vs test/b.test.mjs）')
  assertTrue(
    matchSameModuleTestFiles(['src/a.js'], ['src/b.js']).length === 0,
    '非测试文件不命中（src/b.js）')
  assertTrue(
    JSON.stringify(matchSameModuleTestFiles(['src/mod.py'], ['test/test_mod.py'])) === '["test/test_mod.py"]',
    '测试目录内前缀式命名命中（src/mod.py ↔ test/test_mod.py）')
  assertTrue(
    JSON.stringify(matchSameModuleTestFiles(['pkg/x.go'], ['pkg/x_test.go'])) === '["pkg/x_test.go"]',
    'Go 后缀式命中（pkg/x.go ↔ pkg/x_test.go）')
  assertTrue(
    matchSameModuleTestFiles(['src/utils.js'], ['src/test-utils.js']).length === 0,
    '测试目录外的 test- 前缀助手文件不误判（src/test-utils.js）')
  assertTrue(
    matchSameModuleTestFiles([], ['test/a.test.mjs']).length === 0,
    '无声明 → 空（未声明会话不做软归属猜测）')
  assertTrue(
    JSON.stringify(matchSameModuleTestFiles(['src/a.js'], ['test\\a.test.mjs'])) === '["test/a.test.mjs"]',
    '反斜杠路径归一正斜杠输出')
}

console.log('\n=== ② completeQuicklogEntry 文件行软归属 bullet ===\n')
const SOFT_MARK = '（软归属·同模块测试，未声明）'
function makeFixture() {
  const tmp = mkdtempSync(join(tmpdir(), `ql-soft-${process.pid}-`))
  const specBase = join(tmp, '.sillyspec')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  return { tmp, specBase }
}
function readQuicklog(specBase, gitUser) {
  const dir = join(specBase, 'quicklog')
  const f = readdirSync(dir).find((x) => x === `QUICKLOG-${gitUser}.md`)
  return readFileSync(join(dir, f), 'utf8')
}
const RESULT = '需求：a\n根因：b\n方案：c\n结果：d'
{
  // A. fileNotes 模式 + softFiles：声明 bullet 带括注 + 软归属 bullet 追加
  const { specBase } = makeFixture()
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: 'A 软归属追加' })
  setQuickFileNotes('src/change-list.js::修归属切分')
  await completeQuicklogEntry(specBase, 'qinyi', qlId, {
    resultText: RESULT, changedFiles: ['src/change-list.js'], softFiles: ['test/change-list-operation.test.mjs'],
  })
  const content = readQuicklog(specBase, 'qinyi')
  assertTrue(content.includes('- src/change-list.js（修归属切分）'), 'A: 声明文件 bullet 括注保留')
  assertTrue(content.includes(`- test/change-list-operation.test.mjs${SOFT_MARK}`), 'A: 软归属 bullet 追加（带标记）')
  assertTrue(content.includes('状态：已完成'), 'A: 状态正常翻转')
}
{
  // B. 回退模式（无 fileNotes）+ softFiles：单行升级 bullet，changedFiles 裸 bullet + 软归属标记
  const { specBase } = makeFixture()
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: 'B 回退升级' })
  await completeQuicklogEntry(specBase, 'qinyi', qlId, {
    resultText: RESULT, changedFiles: ['src/change-list.js'], softFiles: ['test/change-list-operation.test.mjs'],
  })
  const content = readQuicklog(specBase, 'qinyi')
  assertTrue(content.includes('- src/change-list.js\n'), 'B: 回退模式 changedFiles 升级为裸 bullet')
  assertTrue(content.includes(`- test/change-list-operation.test.mjs${SOFT_MARK}`), 'B: 软归属 bullet 带标记')
  assertTrue(!/^文件：.*test\/change-list-operation/m.test(content), 'B: 软归属文件不挤进单行「文件：」头行')
}
{
  // C. fileNotes 已显式括注软归属文件 → 不重复加 bullet
  const { specBase } = makeFixture()
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: 'C 去重' })
  setQuickFileNotes('src/a.js::逻辑 || test/a.test.mjs::补断言')
  await completeQuicklogEntry(specBase, 'qinyi', qlId, {
    resultText: RESULT, changedFiles: ['src/a.js'], softFiles: ['test/a.test.mjs'],
  })
  const content = readQuicklog(specBase, 'qinyi')
  assertTrue(content.includes('- test/a.test.mjs（补断言）'), 'C: 显式括注优先')
  assertTrue(!content.includes(SOFT_MARK), 'C: 已括注文件不重复加软归属 bullet')
}
{
  // D. 无 softFiles → 既有行为不变（fileNotes 模式 bullet / 回退单行）
  const { specBase } = makeFixture()
  const { qlId: q1 } = await allocateQuicklogEntry(specBase, 'qinyi', { description: 'D1' })
  setQuickFileNotes('src/a.js::note')
  await completeQuicklogEntry(specBase, 'qinyi', q1, { resultText: RESULT, changedFiles: ['src/a.js'] })
  const c1 = readQuicklog(specBase, 'qinyi')
  assertTrue(c1.includes('- src/a.js（note）') && !c1.includes(SOFT_MARK), 'D1: 无 softFiles 时 fileNotes 模式不变')
  const { qlId: q2 } = await allocateQuicklogEntry(specBase, 'qinyi', { description: 'D2' })
  await completeQuicklogEntry(specBase, 'qinyi', q2, { resultText: RESULT, changedFiles: ['src/a.js', 'src/b.js'] })
  const c2 = readQuicklog(specBase, 'qinyi')
  assertTrue(c2.includes('文件：src/a.js, src/b.js'), 'D2: 无 softFiles 时回退单行格式不变（向后兼容）')
}

console.log('\n=== ③ CLI 端到端：声明 src 漏声明同模块测试 → 软归属补入 + 审计行拆分 ===\n')
{
  const d = join(os.tmpdir(), `ql-soft-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  fs.mkdirSync(join(d, 'src'), { recursive: true })
  fs.mkdirSync(join(d, 'test'), { recursive: true })
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t && git config user.name t', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  // 既有 src + 既有同模块测试都进基线提交：用户场景是「修改既有测试文件漏声明」；
  // 若是全新未跟踪文件，porcelain 把整个 test/ 目录折叠成 `?? test/`（目录 token），
  // 审计 changedFiles 拿不到文件级路径，软归属无从匹配（折叠是既有口径，非本特性范围）。
  fs.writeFileSync(join(d, 'src', 'a.js'), 'export const a = 0\n')
  fs.writeFileSync(join(d, 'test', 'a.test.mjs'), 'import assert from "node:assert"\n')
  execSync('git add -A && git commit -qm base', { cwd: d, stdio: 'pipe' })
  run(`node "${binCLI}" --dir "${d}" init`)
  // 启动声明 --files src/a.js（测试文件故意不声明 = 用户反馈场景）
  const start = run(`node "${binCLI}" --dir "${d}" run quick --input "修软归属" --files src/a.js`)
  const sidM = start.out.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  assertTrue(!!sidM, 'quick 会话已启动')
  const sid = sidM[1]
  run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step1 完成"`)
  // 会话窗口内：改声明文件 + 改同模块测试文件（漏声明）
  fs.writeFileSync(join(d, 'src', 'a.js'), 'export const a = 1\n')
  fs.writeFileSync(join(d, 'test', 'a.test.mjs'), 'import assert from "node:assert"\nassert.ok(true)\n')
  run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --output "step2 完成"`)
  const r3 = run(`node "${binCLI}" --dir "${d}" run quick --done --change ${sid} --file-notes "src/a.js::修逻辑" --output "需求：软归属 根因：漏声明 方案：stem 匹配 结果：绿"`)
  assertTrue(r3.status === 0, `末步 --done 成功（status=${r3.status}）`)
  assertTrue(r3.out.includes('🔍 软归属'), 'stdout 打出 🔍 软归属提示（console 可见）')
  const ql = readFileSync(join(d, '.sillyspec', 'quicklog', 'QUICKLOG-t.md'), 'utf8')
  assertTrue(ql.includes('- src/a.js（修逻辑）'), '文件行：声明文件括注保留')
  assertTrue(ql.includes(`- test/a.test.mjs${SOFT_MARK}`), '文件行：漏声明测试文件软归属补入（带标记）')
  assertTrue(ql.includes('审计：🔍 软归属：1 个窗口内未声明同模块测试文件已补入文件行'), '审计行：🔍 软归属单列落盘')
  assertTrue(!ql.includes('⚖️ 归属切分'), '审计行：软归属文件不再占 ⚖️「未计入文件行」文案（不自相矛盾）')
  try { fs.rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
