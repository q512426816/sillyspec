/**
 * plan-postcheck-cross-repo-path-base.test.mjs — 跨仓 allowed_paths 路径口径校验
 *
 * 坑 cross-repo-allowed-path-base（2026-08-26 实证）：跨仓变更的 TaskCard 把仓库名前缀
 * （sub-grid-security/src/...）或绝对盘符路径写进 allowed_paths，而 design.md 清单用仓根
 * 相对路径——review 归属对账（git -C <仓根> diff 仓根相对路径）与 design 覆盖对账
 * （「## <repo> 仓变更」段内相对路径）双双永不命中，task 改完被判「无归属」，
 * 错误信号在下游且误导。本组校验把根因拦在 plan --done 前置入口。
 *
 * 覆盖：
 *   1. 绝对路径（unix /、盘符 C:/、UNC \\\\）→ error（无注册表依赖）
 *   2. 自仓前缀（repo: X + 路径 X/... 开头）→ error（无注册表依赖）
 *   3. 其他注册键前缀 + 传入 repoRegistry → warning 不阻断（主仓同名目录罕见合法布局）
 *   4. repo: 键未注册 + 传入 repoRegistry → error（报错附 register-repo 命令）
 *   5. 正确形态（repo: X + 仓根相对路径）+ 注册表 → 通过，零路径口径类 error/warning
 *   6. 旧签名零回归：不传 opts 的单仓调用（plan-adopt-waves 路径）相对路径照常通过
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

// 字段齐全的 task 卡（frontmatter），repo/paths 由参数注入（缺省=单仓 main）
function taskMd(id, { repo = null, paths = ['src/service.py'], title = id } = {}) {
  const lines = ['---', `id: ${id}`, `title: ${title}`, 'depends_on: []']
  if (repo) lines.push(`repo: ${repo}`)
  lines.push(
    'allowed_paths:',
    ...paths.map(p => `  - ${p}`),
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
  const tmpDir = mkdtempSync(join(tmpdir(), 'pc-xrepo-path-'))
  mkdirSync(join(tmpDir, 'tasks'), { recursive: true })
  for (const t of tasks) {
    writeFileSync(join(tmpDir, 'tasks', `${t.id}.md`), taskMd(t.id, t))
  }
  if (planMd !== undefined) writeFileSync(join(tmpDir, 'plan.md'), planMd)
  return tmpDir
}

const PLAN_ONE_TASK = `# Plan\n\n## Wave 1\n- [ ] task-01: a\n`

console.log('=== plan-postcheck 跨仓 allowed_paths 路径口径校验（cross-repo-allowed-path-base）===\n')

// ── 1: 绝对路径 → error（三种形态，无注册表依赖）──
console.log('--- 场景 1：绝对路径（unix / 盘符 C:/ UNC \\\\\\\\）→ error ---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: 'sub-grid-security', paths: ['/repo/src/routes/x.js', 'C:/Users/qinyi/repo/src/models/y.js', '\\\\\\\\server\\\\share\\\\src/z.js'] },
    ],
    PLAN_ONE_TASK,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(!r.ok, `绝对路径应阻断（ok=false），errors: ${JSON.stringify(r.errors)}`)
  assert(r.errors.filter(e => e.includes('绝对路径')).length === 3,
    `三种绝对形态各报一条，实际: ${JSON.stringify(r.errors)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 2: 自仓前缀（repo: X + 路径以 X/ 开头）→ error，无需注册表 ──
// 实证场景：TaskCard 写 sub-grid-security/src/... 而 design.md 用 src/... → 对账不上
console.log('\n--- 场景 2：自仓前缀 repo: sub-grid-security + sub-grid-security/src/... → error ---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: 'sub-grid-security', paths: ['sub-grid-security/src/routes/Home.vue'] },
    ],
    PLAN_ONE_TASK,
  )
  const r = validateBlueprintConsistency(tmpDir) // 不传 opts：自仓前缀不依赖注册表
  assert(!r.ok, `自仓前缀应阻断（ok=false），errors: ${JSON.stringify(r.errors)}`)
  assert(r.errors.some(e => e.includes('自仓前缀') && e.includes('src/routes/Home.vue')),
    `error 应点出前缀问题 + 去前缀后的路径，实际: ${JSON.stringify(r.errors)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 3: 其他注册键前缀 + 注册表 → warning 不阻断 ──
// 主仓 task 路径首段命中注册键：可能是漏 repo: 声明的跨仓 task，也可能是主仓内同名目录
console.log('\n--- 场景 3：主仓 task 路径首段=注册键（sub-grid-security/...）→ warning ---')
{
  const registry = new Map([['sub-grid-security', 'C:/x/sub-grid-security']])
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, paths: ['sub-grid-security/src/routes/Home.vue'] },
    ],
    PLAN_ONE_TASK,
  )
  const r = validateBlueprintConsistency(tmpDir, { repoRegistry: registry })
  assert(r.ok, `他仓键前缀只 warning 不阻断，errors: ${JSON.stringify(r.errors)}`)
  assert(r.warnings.some(w => w.includes('sub-grid-security') && w.includes('repo:')),
    `warning 应提示补 repo: 声明并去前缀，实际: ${JSON.stringify(r.warnings)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 4: repo: 键未注册 + 注册表 → error（报错附 register-repo 命令）──
console.log('\n--- 场景 4：repo: pollute 未注册 → error 附注册命令 ---')
{
  const registry = new Map([['sub-grid-security', 'C:/x/sub-grid-security']])
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: 'pollute', paths: ['pollute-service/src/main/java/App.java'] },
    ],
    PLAN_ONE_TASK,
  )
  const r = validateBlueprintConsistency(tmpDir, { repoRegistry: registry })
  assert(!r.ok, `未注册 repo 应阻断（ok=false），errors: ${JSON.stringify(r.errors)}`)
  assert(r.errors.some(e => e.includes('repo: pollute') && e.includes('local register-repo pollute')),
    `error 应附 register-repo 修复命令，实际: ${JSON.stringify(r.errors)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 5: 正确形态（repo: X + 仓根相对路径）+ 注册表 → 通过 ──
console.log('\n--- 场景 5：repo: sub-grid-security + src/... 仓根相对 → 通过 ---')
{
  const registry = new Map([['sub-grid-security', 'C:/x/sub-grid-security']])
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: 'sub-grid-security', paths: ['src/routes/Home.vue', 'src/router.js'] },
    ],
    PLAN_ONE_TASK,
  )
  const r = validateBlueprintConsistency(tmpDir, { repoRegistry: registry })
  assert(r.ok, `正确形态应通过，errors: ${JSON.stringify(r.errors)}`)
  assert(r.warnings.length === 0, `不应有路径口径 warning，实际: ${JSON.stringify(r.warnings)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 6: 旧签名零回归 — 不传 opts 的单仓调用（plan-adopt-waves 路径）──
console.log('\n--- 场景 6：不传 opts（旧签名）单仓相对路径 → 通过（零回归）---')
{
  const tmpDir = setupTasks(
    [
      { id: 'task-01', repo: null, paths: ['src/service.py'] },
    ],
    PLAN_ONE_TASK,
  )
  const r = validateBlueprintConsistency(tmpDir)
  assert(r.ok, `旧签名单仓应通过，errors: ${JSON.stringify(r.errors)}`)
  assert(r.warnings.length === 0, `旧签名单仓不应有 warning，实际: ${JSON.stringify(r.warnings)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
