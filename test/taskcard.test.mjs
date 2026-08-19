/**
 * taskcard 骨架生成测试 — Windows 安全骨架（LF/闭合/硬校验 9 字段）+ cmdTaskcard 行为
 *
 * 背景：LLM 子代理手写 frontmatter 不可靠（CRLF/漏闭合 ---/缺硬校验字段 → postcheck 反复拒），
 * sillyspec taskcard 由 CLI 直写骨架从源头消灭。覆盖：
 *   A. normalizeTaskId 归一（task-1 / 1 / task-01 → task-01，非法报错）
 *   B. buildTaskcardSkeleton 纯函数（无 \r、闭合 ---、硬校验 9 字段齐全、占位符注入）
 *   C. cmdTaskcard 行为（plan.md 带标题 / 已存在跳过 / --force / 多任务 / --all / 错误分支）
 *   D. 集成：生成的骨架直接过 validatePlanFeasibility 硬校验（0 error）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { buildTaskcardSkeleton, cmdTaskcard, normalizeTaskId } from '../src/taskcard.js'
import { validatePlanFeasibility } from '../src/stages/plan-postcheck.js'

let passed = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function assertThrows(fn, msg, match = null) {
  try {
    fn()
    assertTrue(false, `${msg}（未抛错）`)
  } catch (e) {
    assertTrue(!match || e.message.includes(match), `${msg}（抛错: ${e.message.slice(0, 80)}）`)
  }
}

const PLAN_MD = `# Plan

## Tasks

- [ ] task-01: 实现错误常量模块
- [ ] task-02: 接入展示层组件
- [ ] task-03: 回归验证入口
`

function setup(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'taskcard-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  const changeDir = path.join(d, '.sillyspec', 'changes', 'tc')
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(path.join(changeDir, 'plan.md'), PLAN_MD)
  return { d, changeDir }
}
function cleanup(d) {
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('=== A. normalizeTaskId 归一 ===\n')
{
  assertTrue(normalizeTaskId('task-01') === 'task-01', 'task-01 原样保留')
  assertTrue(normalizeTaskId('task-1') === 'task-01', 'task-1 补零 → task-01')
  assertTrue(normalizeTaskId('1') === 'task-01', '裸数字 1 → task-01')
  assertTrue(normalizeTaskId('12') === 'task-12', '两位数字 12 → task-12（不截断）')
  assertThrows(() => normalizeTaskId('task-x'), '非数字任务号报错')
  assertThrows(() => normalizeTaskId(''), '空任务号报错')
}

console.log('\n=== B. buildTaskcardSkeleton 纯函数（Windows 安全骨架）===\n')
{
  const s = buildTaskcardSkeleton({
    taskId: 'task-07', title: 'Add error constants', titleZh: '新增错误常量',
    author: 'alice', now: '2026-08-20 10:00:00',
  })
  assertTrue(!s.includes('\r'), '骨架无 \\r（纯 LF，Windows 安全）')
  assertTrue(s.startsWith('---\n'), '以 --- 行开始')
  assertTrue(/\n---\n/.test(s), '含闭合 ---（frontmatter 提取正则 /^---\\n([\\s\\S]*?)\\n---/ 可命中）')
  assertTrue(s.endsWith('\n'), '文件以换行结束')
  // 硬校验 9 字段（plan-postcheck feasibility 同清单）
  for (const field of ['id:', 'title:', 'title_zh:', 'allowed_paths:', 'goal:', 'implementation:', 'acceptance:', 'verify:', 'constraints:']) {
    assertTrue(s.includes(`\n${field}`), `硬校验字段 ${field} 就位`)
  }
  // 规范约定字段（缺失不阻断但骨架应齐全）
  for (const field of ['author:', 'created_at:', 'priority:', 'depends_on:', 'blocks:']) {
    assertTrue(s.includes(`\n${field}`), `规范字段 ${field} 就位`)
  }
  assertTrue(s.includes('id: task-07'), 'id 占位符已填充')
  assertTrue(s.includes('title: Add error constants'), 'title 已填充')
  assertTrue(s.includes('title_zh: 新增错误常量'), 'title_zh 已填充')
  assertTrue(s.includes('author: alice'), 'author 已填充')
  assertTrue(s.includes('created_at: 2026-08-20 10:00:00'), 'created_at 已填充')
  assertTrue(/allowed_paths:\n\s+- /.test(s), 'allowed_paths 块式写法（每项一行 "  - 路径"，与校验器一致）')
  // frontmatter 正则提取 + YAML 可解析（jsYaml 层面合法性）
  const fm = s.match(/^---\n([\s\S]*?)\n---/)?.[1]
  assertTrue(!!fm, 'frontmatter 可被 postcheck 同款正则提取')
}

console.log('\n=== C. cmdTaskcard 行为 ===\n')

console.log('--- C1: 单任务生成（标题从 plan.md checkbox 行带出）---')
{
  const { d, changeDir } = setup('tc-single-')
  const r = cmdTaskcard('tc', { cwd: d, taskIds: ['task-01'] })
  assertTrue(r.created.length === 1 && r.skipped.length === 0, `created=1/skipped=0（实际 ${r.created.length}/${r.skipped.length}）`)
  const card = fs.readFileSync(path.join(changeDir, 'tasks', 'task-01.md'), 'utf8')
  assertTrue(card.includes('id: task-01'), '卡片 id=task-01')
  assertTrue(card.includes('title: 实现错误常量模块'), 'title 自动取自 plan.md 任务名')
  assertTrue(card.includes('title_zh: 实现错误常量模块'), 'title_zh 自动取自 plan.md 任务名')
  assertTrue(card.includes('author: t'), 'author 取 git config user.name')
  assertTrue(/created_at: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(card), 'created_at 为时间戳格式')
  cleanup(d)
}

console.log('--- C2: 已存在跳过 + --force 覆盖 ---')
{
  const { d, changeDir } = setup('tc-force-')
  const cardPath = path.join(changeDir, 'tasks', 'task-01.md')
  cmdTaskcard('tc', { cwd: d, taskIds: ['task-01'] })
  fs.writeFileSync(cardPath, '---\nid: task-01\n---\n\n已填充的内容，不应被覆盖\n')
  const rSkip = cmdTaskcard('tc', { cwd: d, taskIds: ['task-01'] })
  assertTrue(rSkip.skipped.length === 1 && rSkip.created.length === 0, '无 --force 时已存在跳过（防误覆盖已填好的卡）')
  assertTrue(fs.readFileSync(cardPath, 'utf8').includes('不应被覆盖'), '跳过时文件内容未动')
  const rForce = cmdTaskcard('tc', { cwd: d, taskIds: ['task-01'], force: true })
  assertTrue(rForce.created.length === 1, '--force 覆盖重新生成')
  assertTrue(!fs.readFileSync(cardPath, 'utf8').includes('不应被覆盖'), '--force 后为骨架内容')
  cleanup(d)
}

console.log('--- C3: 多任务逗号分隔 ---')
{
  const { d, changeDir } = setup('tc-multi-')
  const r = cmdTaskcard('tc', { cwd: d, taskIds: ['task-01', 'task-02'] })
  assertTrue(r.created.length === 2, `两卡均生成（实际 ${r.created.length}）`)
  assertTrue(fs.existsSync(path.join(changeDir, 'tasks', 'task-01.md')), 'task-01.md 存在')
  assertTrue(fs.existsSync(path.join(changeDir, 'tasks', 'task-02.md')), 'task-02.md 存在')
  assertTrue(fs.readFileSync(path.join(changeDir, 'tasks', 'task-02.md'), 'utf8').includes('title: 接入展示层组件'), 'task-02 标题各自带出')
  cleanup(d)
}

console.log('--- C4: --all 从 plan.md 取全部任务 ---')
{
  const { d, changeDir } = setup('tc-all-')
  const r = cmdTaskcard('tc', { cwd: d, taskIds: 'all' })
  assertTrue(r.created.length === 3, `plan.md 3 任务全生成（实际 ${r.created.length}）`)
  assertTrue(fs.existsSync(path.join(changeDir, 'tasks', 'task-03.md')), 'task-03.md 存在（编号连续）')
  cleanup(d)
}

console.log('--- C5/C6/C7: 错误分支 ---')
{
  const { d, changeDir } = setup('tc-err-')
  assertThrows(() => cmdTaskcard('tc', { cwd: d, taskIds: 'all', title: 'x' }),
    '--all（多任务）+ --title 报错', '仅在')
  assertThrows(() => cmdTaskcard('tc', { cwd: d, taskIds: ['task-01', 'task-02'], title: 'x' }),
    '多任务 + --title 报错')
  assertThrows(() => cmdTaskcard('no-such-change', { cwd: d, taskIds: ['task-01'] }),
    '变更目录不存在报错', '不存在')
  assertThrows(() => cmdTaskcard('../evil', { cwd: d, taskIds: ['task-01'] }),
    '路径穿越变更名被拒（assertSafeChangeName）')
  // --all 且无 plan.md
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-noplan-'))
  sh('git init -q -b main', d2)
  fs.mkdirSync(path.join(d2, '.sillyspec', 'changes', 'empty'), { recursive: true })
  assertThrows(() => cmdTaskcard('empty', { cwd: d2, taskIds: 'all' }),
    '--all 无 plan.md 报错', 'checkbox')
  // plan.md 无 checkbox 行
  fs.writeFileSync(path.join(d2, '.sillyspec', 'changes', 'empty', 'plan.md'), '# Plan\n\n无任务\n')
  assertThrows(() => cmdTaskcard('empty', { cwd: d2, taskIds: 'all' }),
    '--all plan.md 无 checkbox 行报错', '未解析到')
  cleanup(d); cleanup(d2)
  void changeDir
}

console.log('\n=== D. 集成：骨架直接过 validatePlanFeasibility 硬校验 ===\n')
{
  const { d, changeDir } = setup('tc-feas-')
  cmdTaskcard('tc', { cwd: d, taskIds: 'all' })
  // projectRoot 传 null 跳过 allowed_paths 存在性探测（骨架占位路径必然不存在，只应产生 warning 而非 error）
  const r = validatePlanFeasibility(changeDir, null)
  assertTrue(r.errors.length === 0, `骨架过 feasibility 0 error（实际: ${JSON.stringify(r.errors)}）`)
  assertTrue(r.ok === true, '骨架过 feasibility ok=true')
  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
