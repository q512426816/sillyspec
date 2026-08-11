/**
 * classify-change 测试 — auto_mode 接线（2026-08-11）+ 非法正则加固（review-2026-08-09 #30）。
 *
 * 覆盖：
 * 1. readAutoModeFromLocalYaml：缺文件/无段/空数组 → null；有效段归一化；非数组/非字符串过滤；非法 yaml 不抛。
 * 2. classifyChange(localConfig)：force_full/quick 匹配生效；无匹配默认；explicitMode 覆盖；无 localConfig 默认行为不变。
 * 3. 非法正则跳过不崩（try/catch 加固）。
 */
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { classifyChange, readAutoModeFromLocalYaml } from '../src/classify-change.js'

let failed = 0
let total = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

function makeTmp(prefix) { return mkdtempSync(join(tmpdir(), prefix)) }
function writeLocalYaml(dir, content) {
  mkdirSync(join(dir, '.sillyspec'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), content)
}
const tmpRoots = []

// ── 1. readAutoModeFromLocalYaml ──
console.log('\n--- 1. readAutoModeFromLocalYaml ---')
{
  const d1 = makeTmp('am-1-'); tmpRoots.push(d1)
  assert(readAutoModeFromLocalYaml(d1) === null, '无 local.yaml → null')

  const d2 = makeTmp('am-2-'); tmpRoots.push(d2); writeLocalYaml(d2, 'project:\n  type: nodejs\n')
  assert(readAutoModeFromLocalYaml(d2) === null, '无 auto_mode 段 → null')

  const d3 = makeTmp('am-3-'); tmpRoots.push(d3); writeLocalYaml(d3, 'auto_mode:\n  force_full_patterns: []\n  force_quick_patterns: []\n')
  assert(readAutoModeFromLocalYaml(d3) === null, 'auto_mode 两数组皆空 → null')

  const d4 = makeTmp('am-4-'); tmpRoots.push(d4)
  writeLocalYaml(d4, 'auto_mode:\n  force_full_patterns:\n    - 数据库|migration\n  force_quick_patterns:\n    - fix typo\n')
  const r4 = readAutoModeFromLocalYaml(d4)
  assert(r4 !== null, '有效 auto_mode → 非 null')
  assert(r4 && r4.force_full_patterns.length === 1, 'force_full_patterns 1 条')
  assert(r4 && r4.force_quick_patterns[0] === 'fix typo', 'force_quick_patterns 内容正确')

  // 非数组值归一为 []（仍返回，因另一键有效）
  const d5 = makeTmp('am-5-'); tmpRoots.push(d5)
  writeLocalYaml(d5, 'auto_mode:\n  force_full_patterns: "not-an-array"\n  force_quick_patterns:\n    - fix typo\n')
  const r5 = readAutoModeFromLocalYaml(d5)
  assert(r5 !== null, '部分非数组仍返回（quick 有效）')
  assert(r5 && Array.isArray(r5.force_full_patterns) && r5.force_full_patterns.length === 0, '非数组 force_full 归一为 []')

  // 非字符串条目过滤
  const d7 = makeTmp('am-7-'); tmpRoots.push(d7)
  writeLocalYaml(d7, 'auto_mode:\n  force_full_patterns:\n    - 123\n    - 数据库\n')
  const r7 = readAutoModeFromLocalYaml(d7)
  assert(r7 && r7.force_full_patterns.length === 1 && r7.force_full_patterns[0] === '数据库', '非字符串条目（123）过滤掉')

  // 非法 yaml → null 不抛
  const d6 = makeTmp('am-6-'); tmpRoots.push(d6); writeLocalYaml(d6, 'auto_mode: [unclosed\n')
  let threw = false
  try { readAutoModeFromLocalYaml(d6) } catch { threw = true }
  assert(!threw, '非法 yaml 不抛')
  assert(readAutoModeFromLocalYaml(d6) === null, '非法 yaml → null')
}

// ── 2. classifyChange(localConfig) 接线 ──
console.log('\n--- 2. classifyChange(localConfig) auto_mode 接线 ---')
{
  const lc = { force_full_patterns: ['数据库|migration'], force_quick_patterns: ['fix typo'] }
  assert(classifyChange({ description: '迁移数据库 schema', localConfig: lc }).mode === 'full', 'force_full 匹配 → full')
  assert(classifyChange({ description: 'fix typo in readme', localConfig: lc }).mode === 'quick', 'force_quick 匹配 → quick')
  assert(classifyChange({ description: 'add login feature', localConfig: lc }).mode === 'auto', '无匹配 → 默认 auto')

  // explicitMode 覆盖 localConfig
  assert(classifyChange({ description: '迁移数据库', explicitMode: 'quick', localConfig: lc }).mode === 'quick', 'explicitMode 覆盖 localConfig')

  // 无 localConfig → 默认关键词行为不变
  assert(classifyChange({ description: 'fix typo' }).mode === 'quick', '无 localConfig：命中默认 quick 关键词')
  assert(classifyChange({ description: '随便一个新功能' }).mode === 'auto', '无 localConfig 无关键词 → auto')
}

// ── 3. 非法正则跳过不崩（review-2026-08-09 #30 加固）──
console.log('\n--- 3. 非法正则 try/catch 加固 ---')
{
  // 首条非法 '(unclosed' 跳过，第二条 '数据库' 仍尝试匹配
  const lcBad = { force_full_patterns: ['(unclosed', '数据库'], force_quick_patterns: ['[invalid'] }
  let threw = false
  let r
  try { r = classifyChange({ description: '数据库迁移', localConfig: lcBad }) } catch { threw = true }
  assert(!threw, '含非法正则不抛')
  assert(r && r.mode === 'full', '非法正则跳过后合法正则仍匹配 → full')

  // 全非法 + 无匹配 → 不崩，默认 auto
  const r2 = classifyChange({ description: 'something unrelated', localConfig: { force_full_patterns: ['(bad'], force_quick_patterns: ['[alsobad'] } })
  assert(r2.mode === 'auto', '全非法正则 + 无匹配 → 默认 auto 不崩')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
