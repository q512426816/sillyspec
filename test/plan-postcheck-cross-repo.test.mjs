/**
 * plan-postcheck-cross-repo.test.mjs — task-03 约束③ pathOwners (repo,path) 二元组聚合
 *
 * design §5.3 约束③ + D-008：跨仓 task 与主仓 task 同名路径不误判同 Wave 冲突。
 * pathOwners 键从单 path 改为 `repo|path` 二元组（repo 缺省='main'）。
 *
 * 覆盖：
 *   1. 跨仓 task 与主仓 task 同名路径、同 Wave → 不误判冲突（约束③核心）
 *   2. 跨仓 task 之间同 repo 同路径、同 Wave → 仍判冲突（二元组键同 → 真冲突）
 *   3. 单仓场景（全 repo=main）零回归：同 Wave 同文件仍判冲突（plan-optimization Test 5d 同款）
 *   4. 单仓场景：跨 Wave 同文件 → 警告不阻断（Test 5e 同款）
 *   5. dogfood 自指保护：两 task repo 不同但物理同路径 → 视为不同键不冲突（D-011 不自指前提）
 *
 * 依据：design.md §5.3 约束③ / decisions.md D-008 / tasks/task-03.md acceptance。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateBlueprintConsistency } from '../src/stages/plan-postcheck.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// 字段齐全的 task 卡（frontmatter），repo 由参数注入（缺省=单仓 main）
function taskMd(id, { repo = null, path = 'src/service.py', title = id } = {}) {
  const lines = ['---', `id: ${id}`, `title: ${title}`, 'depends_on: []']
  if (repo) lines.push(`repo: ${repo}`)
  lines.push(
    'allowed_paths:',
    `  - ${path}`,
    'goal: >', `  ${id} goal`,
    'implementation: 修改',
    'acceptance: ok',
    'verify: npm test',
    'constraints: none',
    '---', '',
    '## 验收标准', '',
    '- ok', '',
  )
  return lines.join('\n') + '\n'
}

function setupTasks(tasks, planMd) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'pc-cross-'))
  mkdirSync(join(tmpDir, 'tasks'), { recursive: true })
  for (const t of tasks) {
    writeFileSync(join(tmpDir, 'tasks', `${t.id}.md`), taskMd(t.id, t))
  }
  if (planMd !== undefined) writeFileSync(join(tmpDir, 'plan.md'), planMd)
  return tmpDir
}

console.log('=== plan-postcheck pathOwners (repo,path) 二元组（task-03 约束③）===\n')

// ── 1: 跨仓 task 与主仓 task 同名路径、同 Wave → 不误判冲突（约束③核心）──
// 修复前：pathOwners 单 path 键 → src/task-review.js 被 2 task 共享 → 同 Wave 阻断
// 修复后：键 main|src/task-review.js vs sillyspec|src/task-review.js → 不同键 → 通过
console.log('--- 场景 1：跨仓 task 与主仓 task 同名路径、同 Wave → 不误判冲突 ---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, path: 'src/task-review.js' },                  // 主仓（无 repo）
      { id: 'task-02', repo: 'sillyspec', path: 'src/task-review.js' },           // 跨仓 sillyspec
    ],
    `# Plan\n\n## Wave 1\n- [ ] task-01: 主仓改\n- [ ] task-02: 跨仓改\n`,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(r.ok, `跨仓同名路径同 Wave 应通过（不误判冲突），errors: ${JSON.stringify(r.errors)}`)
  assert(!r.errors.some(e => e.includes('src/task-review.js') && e.includes('Wave 1')),
    `不应有 src/task-review.js 的 Wave 1 冲突 error`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 2: 跨仓 task 之间同 repo 同路径、同 Wave → 仍判冲突（二元组键同 = 真冲突）──
console.log('\n--- 场景 2：同 repo（sillyspec）同路径同 Wave → 仍判冲突 ---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: 'sillyspec', path: 'src/foo.js' },
      { id: 'task-02', repo: 'sillyspec', path: 'src/foo.js' },
    ],
    `# Plan\n\n## Wave 1\n- [ ] task-01: a\n- [ ] task-02: b\n`,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(!r.ok, `同 repo 同路径同 Wave 应判冲突（ok=false），errors: ${JSON.stringify(r.errors)}`)
  assert(r.errors.some(e => e.includes('src/foo.js') && e.includes('Wave 1')),
    `error 应提到 src/foo.js + Wave 1`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 3: 单仓零回归 — 同 Wave 同文件仍判冲突（plan-optimization Test 5d 同款）──
console.log('\n--- 场景 3：单仓（全 main）同 Wave 同文件 → 仍判冲突（零回归）---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, path: 'src/service.py' },
      { id: 'task-02', repo: null, path: 'src/service.py' },
    ],
    `# Plan\n\n## Wave 1\n- [ ] task-01: a\n- [ ] task-02: b\n`,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(!r.ok, `单仓同 Wave 同文件应判冲突（零回归），errors: ${JSON.stringify(r.errors)}`)
  assert(r.errors.some(e => e.includes('Wave 1') && e.includes('src/service.py')),
    `error 应提到 Wave 1 + service.py`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 4: 单仓零回归 — 跨 Wave 同文件 → 警告不阻断（Test 5e 同款）──
console.log('\n--- 场景 4：单仓跨 Wave 同文件 → 警告不阻断（零回归）---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, path: 'src/service.py' },
      { id: 'task-02', repo: null, path: 'src/service.py' },
    ],
    `# Plan\n\n## Wave 1\n- [ ] task-01: a\n\n## Wave 2\n- [ ] task-02: b\n`,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(r.ok, `单仓跨 Wave 同文件应通过（串行安全），errors: ${JSON.stringify(r.errors)}`)
  assert(r.warnings.some(w => w.includes('跨 Wave') && w.includes('src/service.py')),
    `warning 应提到跨 Wave + service.py`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 5: 单仓零回归 — 无 plan.md 共享路径 → 阻断（全并行口径，Test 5f 同款）──
console.log('\n--- 场景 5：单仓无 plan.md 共享路径 → 阻断（全并行口径，零回归）---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, path: 'src/service.py' },
      { id: 'task-02', repo: null, path: 'src/service.py' },
    ],
    undefined,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(!r.ok, `无 plan.md 共享路径应阻断（全并行），errors: ${JSON.stringify(r.errors)}`)
  assert(r.errors.some(e => e.includes('无显式 Wave') && e.includes('src/service.py')),
    `error 应提到无显式 Wave + service.py`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 6: 跨仓同路径无 plan.md → 不误判（全并行口径下两 repo 是不同键）──
// 修复前会判冲突（单 path 键），修复后两 repo 不同键 → 即使全并行也不冲突
console.log('\n--- 场景 6：跨仓同名路径无 plan.md（全并行口径）→ 不误判 ---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, path: 'src/task-review.js' },
      { id: 'task-02', repo: 'sillyspec', path: 'src/task-review.js' },
    ],
    undefined,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(r.ok, `跨仓同名路径无 plan.md 应通过（二元组键不同），errors: ${JSON.stringify(r.errors)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 7: 三仓混合 — 主仓 + sillyspec + multi-agent-platform 同名路径同 Wave → 全不冲突 ──
console.log('\n--- 场景 7：三仓混合同名路径同 Wave → 全不冲突（二元组隔离）---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, path: 'src/index.js' },
      { id: 'task-02', repo: 'sillyspec', path: 'src/index.js' },
      { id: 'task-03', repo: 'multi-agent-platform', path: 'src/index.js' },
    ],
    `# Plan\n\n## Wave 1\n- [ ] task-01: a\n- [ ] task-02: b\n- [ ] task-03: c\n`,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(r.ok, `三仓同名路径同 Wave 应全通过（三元组键各异），errors: ${JSON.stringify(r.errors)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
