/**
 * 坑 taskcard-parallel-cli-lock 回归：TaskCard 骨架内建预生成（2026-08-25 用户实证）
 *
 * 背景：plan 生成 TaskCard 步骤让并行 batch 子代理各自跑 sillyspec taskcard CLI，多进程
 * 并发撞进度库 SQLite 锁；用户改为主代理预生成骨架 + 子代理只 Edit 才稳。ensureTaskcardSkeletons
 * 把该实践内建（plan gate 前主流程单进程调用，见 run/gates.js runStageCompletionGates）。
 *
 * 锁定语义：
 *   1. 注册表（tasks.md）有声明而 tasks/ 缺卡 → 补齐骨架（标题/depends_on 从注册表带出）
 *   2. 已存在的卡跳过不覆盖（幂等，重跑零新增）
 *   3. 无 tasks.md/plan.md 或注册表为空 → 无操作（none/light 级别无卡不炸）
 *   4. 变更目录不存在 → 无操作返回空
 *   5. 只补缺失卡：部分已存在时 created 只含缺的
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { ensureTaskcardSkeletons } from '../src/taskcard.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log('  ✅ ' + msg)) : (failed++, failures.push(msg), console.log('  ❌ ' + msg)) }

const tmpRoots = []
function makeProject() {
  const d = mkdtempSync(join(tmpdir(), 'tces-'))
  tmpRoots.push(d)
  execFileSync('git', ['init', '-q'], { cwd: d, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.email', 't@t.com'], { cwd: d, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: d, stdio: 'pipe' })
  mkdirSync(join(d, '.sillyspec', 'changes', 'c1'), { recursive: true })
  return d
}
const TASKS_MD = `# 任务清单

- [ ] task-01: 初版探针
- [ ] task-02: 契约对账 (depends_on: task-01)
- [ ] task-03: 文档同步
`

console.log('=== TaskCard 骨架内建预生成（坑 taskcard-parallel-cli-lock）===\n')

// 1+2. 缺卡补齐 + 幂等
{
  const d = makeProject()
  writeFileSync(join(d, '.sillyspec', 'changes', 'c1', 'tasks.md'), TASKS_MD)
  const r1 = ensureTaskcardSkeletons('c1', { cwd: d })
  assert(r1.created.length === 3 && r1.skipped.length === 0, `三张缺卡全部补齐（created=${r1.created.length}）`)
  const card2 = readFileSync(join(d, '.sillyspec', 'changes', 'c1', 'tasks', 'task-02.md'), 'utf8')
  assert(/depends_on: \['task-01'\]/.test(card2), 'depends_on 从注册表行内注解反填')
  assert(card2.includes('契约对账'), '标题从注册表带出')
  const r2 = ensureTaskcardSkeletons('c1', { cwd: d })
  assert(r2.created.length === 0 && r2.skipped.length === 3, '重跑幂等：零新增三跳过')
}
// 5. 部分已存在 → 只补缺的，已有内容不被覆盖
{
  const d = makeProject()
  writeFileSync(join(d, '.sillyspec', 'changes', 'c1', 'tasks.md'), TASKS_MD)
  const tdir = join(d, '.sillyspec', 'changes', 'c1', 'tasks')
  mkdirSync(tdir, { recursive: true })
  writeFileSync(join(tdir, 'task-01.md'), 'CUSTOM-CONTENT\n')
  const r = ensureTaskcardSkeletons('c1', { cwd: d })
  assert(r.created.length === 2 && r.created.every(f => !f.includes('task-01')), '只补 task-02/03（task-01 不在缺失集）')
  assert(readFileSync(join(tdir, 'task-01.md'), 'utf8') === 'CUSTOM-CONTENT\n', '已有卡内容零改动')
}
// 3. 注册表为空 → 无操作
{
  const d = makeProject()
  writeFileSync(join(d, '.sillyspec', 'changes', 'c1', 'tasks.md'), '# 空清单\n\n（无 checkbox 任务行）\n')
  const r = ensureTaskcardSkeletons('c1', { cwd: d })
  assert(r.created.length === 0 && !existsSync(join(d, '.sillyspec', 'changes', 'c1', 'tasks')), '空注册表 → 无操作不建目录')
}
// 4. 变更目录不存在 → 空返回不抛
{
  const d = makeProject()
  const r = ensureTaskcardSkeletons('no-such-change', { cwd: d })
  assert(r.created.length === 0 && r.skipped.length === 0, '变更目录不存在 → 空返回')
}
// 6. gates 接线自契：plan gate 前必须调用 ensureTaskcardSkeletons（防接线漂移）
{
  const gatesSrc = readFileSync(new URL('../src/run/gates.js', import.meta.url), 'utf8')
  assert(/stageName === 'plan' && changeName[\s\S]{0,400}ensureTaskcardSkeletons/.test(gatesSrc),
    'runStageCompletionGates 内 plan gate 前接线 ensureTaskcardSkeletons')
  const planSrc = readFileSync(new URL('../src/stages/plan.js', import.meta.url), 'utf8')
  assert(/主 agent[^\n]*一次性预生成全部骨架/.test(planSrc) && /禁止再运行 \\`sillyspec taskcard\\` CLI/.test(planSrc),
    'plan 步骤3 prompt：主代理预生成 + 子代理禁跑 CLI 双指令在位')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
