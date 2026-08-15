/**
 * plan-postcheck 块列表正则 + 报错聚合回归测试（坑6）
 *
 * 坑6①：parseAllowedPaths / parseDependsOn 原块正则 `\s*\n` 中 \s 贪婪吃换行+前导空白，
 *   标准 YAML 顶格块列表（`allowed_paths:\n- src/a.js`）永远失配 → 静默判「缺 allowed_paths /
 *   无依赖」。修复：`[ \t]*\n` + 行内 `[ \t]*-[ \t]+` 顶格缩进通吃。
 * 坑6②补全：外部调用方（worktree-apply / task-review 等）原生 readFileSync 喂 CRLF 内容时
 *   `^---\n` 锚点失配——解析器入口统一 CRLF→LF 归一。
 * 坑6③：executePlanPostcheck 六个检查原「失败一个抛一个」，一轮 --done 只露一类错；
 *   修复：全部跑完聚合输出（failing classes 一次全列）。
 *
 * 关联：multi-agent-platform/docs/sillyspec/坑6-plan-postcheck-隐性格式契约.md
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseAllowedPaths, validatePlanFeasibility, executePlanPostcheck } from '../src/stages/plan-postcheck.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const fm = body => `---\n${body}\n---\n`

console.log('=== 坑6：parseAllowedPaths 块列表形态回归 ===\n')

// ── 1. 顶格块列表（坑6①核心：修复前返回 []）──
{
  const r = parseAllowedPaths(fm('id: task-01\nallowed_paths:\n- src/a.js\n- src/b.js'))
  assert(JSON.stringify(r) === JSON.stringify(['src/a.js', 'src/b.js']), `顶格块列表被解析（实际: ${JSON.stringify(r)}）`)
}

// ── 2. 缩进块列表（原有行为回归）──
{
  const r = parseAllowedPaths(fm('id: task-01\nallowed_paths:\n  - src/a.js\n  - src/b.js'))
  assert(JSON.stringify(r) === JSON.stringify(['src/a.js', 'src/b.js']), `缩进块列表仍被解析（实际: ${JSON.stringify(r)}）`)
}

// ── 3. inline 数组（原有行为回归）──
{
  const r = parseAllowedPaths(fm('id: task-01\nallowed_paths: [src/a.js, src/b.js]'))
  assert(JSON.stringify(r) === JSON.stringify(['src/a.js', 'src/b.js']), `inline 数组仍被解析（实际: ${JSON.stringify(r)}）`)
}

// ── 4. 顶格 + 缩进混合 ──
{
  const r = parseAllowedPaths(fm('id: task-01\nallowed_paths:\n- src/a.js\n  - src/b.js'))
  assert(r.length === 2 && r[0] === 'src/a.js' && r[1] === 'src/b.js', `混合缩进通吃（实际: ${JSON.stringify(r)}）`)
}

// ── 5. 反引号包裹（坑7家族：js-yaml 失败 / 路径带 ` 匹配失败报未覆盖）──
{
  const r = parseAllowedPaths(fm('id: task-01\nallowed_paths:\n- `src/a.js`\n- "src/b.js"'))
  assert(JSON.stringify(r) === JSON.stringify(['src/a.js', 'src/b.js']), `反引号/引号包裹被剥离（实际: ${JSON.stringify(r)}）`)
}

// ── 6. CRLF 原始内容直接喂（坑6②补全：外部调用方不经 LF 包装 readFileSync）──
{
  const crlf = fm('id: task-01\nallowed_paths:\n- src/a.js\n  - src/b.js').replace(/\n/g, '\r\n')
  const r = parseAllowedPaths(crlf)
  assert(r.length === 2 && r[0] === 'src/a.js', `CRLF 内容入口归一后仍解析（实际: ${JSON.stringify(r)}）`)
}

// ── 7. 非列表内容不误吞（allowed_paths: 后跟普通字段行）──
{
  const r = parseAllowedPaths(fm('id: task-01\nallowed_paths: []\ngoal: x'))
  assert(JSON.stringify(r) === JSON.stringify([]), `空 inline 不产出路径（实际: ${JSON.stringify(r)}）`)
}

console.log('\n=== 坑6：depends_on 顶格块列表（经 feasibility 行为验证）===\n')

// ── 8. depends_on 顶格块引用不存在 task → 报错（修复前静默 [] 不报，等于依赖被吞）──
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pit6-dep-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  const card = [
    '---',
    'id: task-01',
    'title: dep test',
    'title_zh: dep test',
    'allowed_paths:',
    '- src/app.js',
    'depends_on:',
    '- task-99',
    'goal: x',
    'implementation: 修改',
    'acceptance: ok',
    'verify: npm test',
    'constraints: none',
    '---',
    '',
    '## 验收标准',
    '',
    '- ok',
    '',
  ].join('\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), card)
  const r = validatePlanFeasibility(changeDir)
  assert(r.errors.some(e => e.includes('task-99')), `顶格 depends_on 引用不存在 → 报错（实际 errors: ${JSON.stringify(r.errors)}）`)
}

console.log('\n=== 坑6③：executePlanPostcheck 报错聚合（一轮全量输出）===\n')

// ── 9. 多类失败一次全列：feasibility 缺字段 + design 覆盖对账失败同轮出现 ──
{
  const cwd = mkdtempSync(join(tmpdir(), 'pit6-agg-'))
  const specDir = join(cwd, '.sillyspec')
  const changeDir = join(specDir, 'changes', '2026-08-16-agg-fixture')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  // plan.md 无 checkbox（避免 D-2b 对账干扰）；design 无「文件变更清单」章节（触发覆盖对账 error）
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n')
  writeFileSync(join(changeDir, 'design.md'), '# D\n\n## 目标\n\n做某事。\n')
  // 卡片：blueprint 基础字段齐（顶格 allowed_paths + body 验收标准），feasibility 五字段缺 4（goal 留）
  const card = [
    '---',
    'id: task-01',
    'title: agg',
    'title_zh: 聚合测试',
    'allowed_paths:',
    '- src/app.js',
    'goal: 只有 goal',
    '---',
    '',
    '## 验收标准',
    '',
    '- ok',
    '',
    '## 验证',
    '',
    '- npm test',
    '',
  ].join('\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), card)

  // 捕获 console.error（聚合输出走 stderr）
  const errs = []
  const origErr = console.error, origWarn = console.warn
  console.error = (...a) => errs.push(a.map(String).join(' '))
  console.warn = () => {}
  let msg = null
  try {
    await executePlanPostcheck({ cwd, resolveChangeDir: () => null, progress: null })
  } catch (e) {
    msg = String(e.message)
  } finally {
    console.error = origErr
    console.warn = origWarn
  }
  const out = errs.join('\n')
  assert(msg !== null && msg.includes('planPostcheck:'), `postcheck 抛错（实际: ${msg}）`)
  assert(out.includes('Plan 可行性校验'), `同一轮输出含「Plan 可行性校验」失败（实际输出: ${out.slice(0, 400)}）`)
  assert(out.includes('design.md 文件覆盖对账'), `同一轮输出含「design.md 文件覆盖对账」失败（聚合生效，非一次一类）`)
  assert(msg.includes('组校验失败'), `错误消息带聚合统计（实际: ${msg}）`)
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
