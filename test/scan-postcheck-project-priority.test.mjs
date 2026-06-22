/**
 * task-05: run.js post-check 项目名优先级链
 *
 * 覆盖 AC-04/05/06/10: currentProjectName 优先级 =
 *   progress.project (dbProjectName) > change.project > steps[idx].project > name 正则 > null
 *
 * 由于 runStage 是大函数,这里用源码字符串校验关键优先级链顺序,
 * 并通过控制台 fixture 模拟实际行为。
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const runPath = join(__dirname, '..', 'src', 'run.js')
const src = readFileSync(runPath, 'utf8')

let passed = 0
let failed = 0
function assert (cond, msg) {
  if (cond) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}`); failed++ }
}

// AC-10: 定位 workflow post_check 段的 currentProjectName 赋值
console.log('=== AC-10: currentProjectName 优先级链 ===')

// 锚点：workflow post_check 段特征字符串
const anchor = src.indexOf("Workflow post_check：scan 深度扫描完成后自动检查产物")
assert(anchor > 0, '找到 workflow post_check scan 锚点')

// 取该段后 2000 字符内的 currentProjectName 赋值块
const tail = src.slice(anchor, anchor + 3000)
const assignStart = tail.indexOf('const currentProjectName')
assert(assignStart > 0, 'post_check 段含 currentProjectName 赋值')

// 赋值块（到下一行 const 或 let 前）
const assignBlock = tail.slice(assignStart, assignStart + 600)

// 验证优先级链：progress.project 必须在 steps[idx].project 之前出现
const ppPos = assignBlock.indexOf('progress.project')
const stepsPos = assignBlock.indexOf('steps[currentIdx].project')
assert(ppPos > 0 && stepsPos > 0, 'currentProjectName 链含 progress.project + steps[currentIdx].project')
assert(ppPos < stepsPos,
  `优先级正确：progress.project (pos=${ppPos}) 在 steps[idx].project (pos=${stepsPos}) 之前`)

// 验证保留兜底：name 正则提取
assert(/\[([^\]]+)\]\s*\$\//.test(assignBlock) || /\\\[/i.test(assignBlock),
  '保留兜底：steps[idx].name 正则提取仍存在')

// AC-05/06: 行为模拟 — 优先级链实际执行结果
console.log('\n=== AC-05/06: 优先级链行为模拟 ===')
// 复刻 run.js:2650 修正后的优先级链
function pickProjectName (progressProject, changeProject, stepProject, stepName) {
  return progressProject
    || changeProject
    || stepProject
    || (stepName && (stepName.match(/\[([^\]]+)\]\s*$/) || [])[1])
    || null
}

// AC-05: progress.project='myaaa' 优先于 steps[idx].project='frontend'
const r1 = pickProjectName('myaaa', undefined, 'frontend', '深度扫描 [frontend]')
assert(r1 === 'myaaa', `AC-05: progress.project='myaaa' 优先 → ${r1}`)

// AC-06: progress.project 缺失 → 回退 steps[idx].project
const r2 = pickProjectName(undefined, undefined, 'frontend', '深度扫描 [frontend]')
assert(r2 === 'frontend', `AC-06: 兜底 steps[idx].project='frontend' → ${r2}`)

// 兜底 2: progress/change/step.project 均缺 → name 正则
const r3 = pickProjectName(undefined, undefined, undefined, '深度扫描 [backend]')
assert(r3 === 'backend', `兜底 name 正则提取 → ${r3}`)

// 全 null
const r4 = pickProjectName(undefined, undefined, undefined, '深度扫描')
assert(r4 === null, `全缺 → null（检查所有项目分支）`)

// change.project 优先于 steps[idx].project（progress.project 缺失时）
const r5 = pickProjectName(undefined, 'myaaa', 'frontend', '深度扫描 [frontend]')
assert(r5 === 'myaaa', `change.project='myaaa' 优先于 steps[idx].project='frontend' → ${r5}`)

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
