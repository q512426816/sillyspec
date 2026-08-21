/**
 * tool-defect-audit-fixes.test.mjs — 2026-08-21 全量体检批次修复的回归测试。
 *
 * 覆盖（每节对应一个坑 ID，详见各修复点源码注释）：
 *   1. warnMissingUiPrototype（gates.js）：brainstorm 收尾步软提醒的触发/静默分支
 *   2. validateTaskCommands（plan-postcheck.js）：块列表（数组）形态的 verify/implementation
 *      不再空转——此前 typeof==='string' 只收标量，规范 TaskCard 恒落空，命令校验 no-op
 *   3. buildPlanSteps（plan.js）：taskNames 源迁 tasks.md（新契约 plan.md Wave 纯 ID 引用），
 *      coordinator 步骤任务清单不再空白
 *   4. validatePlanForExecute（execute.js）：task id 连续性在「不从 1 开始」时不再静默跳过
 *   5. getStageSteps（shared.js）：scan quick 档感知——持久化 scanProfile.mode=quick 时
 *      返回 3 步表（防 ensureStageSteps 3 vs 11 漂移重播种）
 *   6. resolve --take-platform（sync.js）：冲突文件缺 platform_progress 时不再 import 空对象
 *      清空本地进度（数据丢失）；--keep-local 在 platform_last_pushed_at=null 时不清空 base_ts
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { warnMissingUiPrototype } from '../src/run/gates.js'
import { validateTaskCommands } from '../src/stages/plan-postcheck.js'
import { buildPlanSteps } from '../src/stages/plan.js'
import { validatePlanForExecute } from '../src/stages/execute.js'
import { getStageSteps } from '../src/run/shared.js'
import { SyncManager } from '../src/sync.js'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
const tmp = (label) => mkdtempSync(join(tmpdir(), `sillyspec-audit-${label}-`))

// ── 1. warnMissingUiPrototype ──
console.log('=== 1. UI 原型软提醒（gates.js）===')
{
  const capture = []
  const origWarn = console.warn
  console.warn = (...a) => capture.push(a.join(' '))
  try {
    const base = tmp('uiwarn')
    const changeDir = join(base, 'changes', 'c1')
    mkdirSync(changeDir, { recursive: true })

    // design.md 命中 .tsx 且无 prototype → warn
    writeFileSync(join(changeDir, 'design.md'), '# 设计文档\n| 修改 | src/App.tsx | 新增列 |\n')
    capture.length = 0
    warnMissingUiPrototype('brainstorm', 'c1', '生成规范文件', base)
    assert(capture.length === 1 && /prototype/.test(capture[0]), '命中前端文件且无原型 → warn 一行')

    // prototype 存在 → 静默
    writeFileSync(join(changeDir, 'prototype-board.html'), '<html></html>')
    capture.length = 0
    warnMissingUiPrototype('brainstorm', 'c1', '生成规范文件', base)
    assert(capture.length === 0, '已有 prototype-*.html → 不 warn')

    // 纯后端 design → 静默
    const changeDir2 = join(base, 'changes', 'c2')
    mkdirSync(changeDir2, { recursive: true })
    writeFileSync(join(changeDir2, 'design.md'), '# 设计文档\n| 修改 | src/db.js | 索引 |\n')
    capture.length = 0
    warnMissingUiPrototype('brainstorm', 'c2', '生成规范文件', base)
    assert(capture.length === 0, '纯后端文件清单 → 不 warn')

    // 非目标步骤 / 非目标阶段 → 静默
    capture.length = 0
    warnMissingUiPrototype('brainstorm', 'c1', '写设计文档并自审', base)
    warnMissingUiPrototype('plan', 'c1', '生成规范文件', base)
    assert(capture.length === 0, '非目标步骤/阶段 → 不 warn')
  } finally {
    console.warn = origWarn
  }
}

// ── 2. validateTaskCommands 块列表形态 ──
console.log('\n=== 2. TaskCard 命令校验收数组（plan-postcheck.js）===')
{
  // 规范格式（taskcard.js 骨架同款）：verify/implementation 为 YAML 块列表
  const card = [
    '---',
    'id: task-01',
    'title: cmd check',
    'allowed_paths:',
    '  - src/app.js',
    'goal: 实现 X',
    'implementation:',
    '  - 修改 App 组件',
    'verify:',
    '  - pnpm run gen:types',
    'constraints: []',
    '---',
    '',
  ].join('\n')
  const changeDir = tmp('cmdarr')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), card)

  const rootMissing = tmp('cmdarr-root')
  mkdirSync(rootMissing, { recursive: true })
  writeFileSync(join(rootMissing, 'package.json'), JSON.stringify({ name: 'p', scripts: { build: 'x' } }))

  const r1 = validateTaskCommands(changeDir, rootMissing, null)
  assert(r1.ok === false && r1.errors.some(e => /gen:types/.test(e)),
    '块列表 verify 写不存在的 script → error（此前数组形态被跳过、校验空转）')

  const rootHas = tmp('cmdarr-root2')
  mkdirSync(rootHas, { recursive: true })
  writeFileSync(join(rootHas, 'package.json'), JSON.stringify({ name: 'p', scripts: { 'gen:types': 'tsc' } }))
  const r2 = validateTaskCommands(changeDir, rootHas, null)
  assert(r2.ok === true, 'script 存在 → 通过')
}

// ── 3. buildPlanSteps taskNames 源 = tasks.md ──
console.log('\n=== 3. plan 协调器步骤任务清单来自 tasks.md（plan.js）===')
{
  const changeDir = tmp('plansteps')
  mkdirSync(changeDir, { recursive: true })
  // 新契约：tasks.md 唯一真相（checkbox + 任务名）；plan.md Wave 段纯 ID 引用
  writeFileSync(join(changeDir, 'tasks.md'),
    '# 任务清单（Tasks）\n\n- [ ] task-01: 重构登录表单\n- [ ] task-02: 增加记住我选项\n')
  writeFileSync(join(changeDir, 'plan.md'),
    '# 计划\n\n## Wave 1\n\n- task-01\n- task-02\n')
  const steps = buildPlanSteps(changeDir)
  const coordinator = steps.find(s => /TaskCard|任务/.test(s.name) && (s.prompt || '').includes('task-01'))
  assert(!!coordinator, 'coordinator 步骤存在')
  assert((coordinator.prompt || '').includes('重构登录表单') && (coordinator.prompt || '').includes('记住我'),
    'coordinator prompt 含 tasks.md 任务名（此前新契约下恒空清单）')
}

// ── 4. validatePlanForExecute 连续性兼容契约（防回归）──
console.log('\n=== 4. task id 连续性：不从 1 开始=兼容放行（契约钉死，勿改）===')
{
  const tasks = '# 任务清单（Tasks）\n\n- [ ] task-02: 甲\n- [ ] task-03: 乙\n'
  const plan = '# 计划\n\n## Wave 1\n\n- task-02\n- task-03\n'
  const r = validatePlanForExecute(tasks, plan)
  assert(r.ok === true, 'task-02 起编号 → 放行（旧变更编号兼容，plan-execute-contract Case 10 同契约）')
  const tasks2 = '# 任务清单（Tasks）\n\n- [ ] task-01: 甲\n- [ ] task-03: 乙\n'
  const plan2 = '# 计划\n\n## Wave 1\n\n- task-01\n- task-03\n'
  const r2 = validatePlanForExecute(tasks2, plan2)
  assert(r2.ok === false, '从 1 起但跳号（缺 task-02）→ 拦截')
}

// ── 5. getStageSteps 感知 scan quick 档 ──
console.log('\n=== 5. getStageSteps scan quick 档返回 3 步表（shared.js）===')
{
  const progress = { stages: { scan: { scanProfile: { mode: 'quick' }, steps: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] } } }
  const steps = await getStageSteps('scan', tmp('scanquick'), progress, null)
  assert(Array.isArray(steps) && steps.length === 3, `quick 档 → 3 步（实际 ${steps.length}）`)
  assert(steps[0].name === '项目概览（自动探测）' && steps[1].name === '生成核心文档' && steps[2].name === '自检和提交',
    '3 步名与 applyScanProfileSteps 同源')
  const stepsNoProfile = await getStageSteps('scan', tmp('scandeep'), {}, null)
  assert(stepsNoProfile.length === 11, `无 profile → 注册表 11 步（实际 ${stepsNoProfile.length}）`)
}

// ── 6. resolve take-platform / keep-local ──
console.log('\n=== 6. resolve 空平台进度不 import + base_ts 不清空（sync.js）===')
{
  const base = tmp('resolve')
  const cwd = join(base, 'proj')
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'rt-change'), { recursive: true })
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.init(cwd)
  pm.initChange(cwd, 'rt-change')
  // 死端口平台地址：keep-local 自动重推失败走「未成功」分支，不影响断言
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'platform:\n  url: http://127.0.0.1:1\n  token: tok\n', 'utf8')
  // 手工落冲突文件（409 非 JSON body 场景的真实形态：platform_progress null）
  const cfPath = join(cwd, '.sillyspec', '.runtime', 'sync-conflict-rt-change.json')
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  writeFileSync(cfPath, JSON.stringify({
    change: 'rt-change',
    base_ts: '2026-08-10T02:00:00.000Z',
    local_modified_ts: '2026-08-10T03:00:00.000Z',
    platform_last_pushed_at: null,
    platform_progress: null,
    created_at: '2026-08-10T04:00:00.000Z',
  }), 'utf8')
  // 预置 base_ts：keep-local 场景断言「null 参数不清空已有值」
  const db = pm._ensureDB(cwd).getDb()
  db.prepare('UPDATE changes SET last_synced_platform_ts = ? WHERE name = ?').run('2026-08-10T02:00:00.000Z', 'rt-change')

  const sm = new SyncManager(cwd)
  const before = pm.read(cwd, 'rt-change')
  const r = await sm.resolve('rt-change', 'take-platform')
  const after = pm.read(cwd, 'rt-change')
  assert(r.ok === false && r.resolved === false, 'take-platform 缺 platform_progress → ok:false resolved:false')
  assert(after !== null && before !== null, '本地进度行仍在（未被空 import 清空）')
  assert(existsSync(cfPath), '冲突文件未清（失败路径不清文件）')

  const r2 = await sm.resolve('rt-change', 'keep-local')
  const baseTs = pm._ensureDB(cwd).getDb()
    .prepare('SELECT last_synced_platform_ts AS t FROM changes WHERE name = ?').get('rt-change')
  assert(r2.ok === true, 'keep-local resolve 成功')
  assert(baseTs && baseTs.t === '2026-08-10T02:00:00.000Z',
    `platform_last_pushed_at=null 不清空 base_ts（实际 ${baseTs && baseTs.t}）`)
}

console.log(`\n${'='.repeat(50)}\n${failed === 0 ? '✅ 全部通过' : '❌ 有失败'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
