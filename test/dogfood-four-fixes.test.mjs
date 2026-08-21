/**
 * 四坑回归：provision 静默假 installed / 验证 task 零 diff 通道 / Wave 漏识别 / taskcard 反填
 *
 * 坑（2026-08-21 用户实证）：
 *   ① doctor --fix 报 re-provisioned: installed 但 node_modules junction 实际没建（Windows 静默）
 *   ② 验证型 task（task-10/11）无代码 diff，review gate changedFiles∩diff 校验必误杀
 *   ③ plan 6 个 Wave 只解析 5 个，末两 task 落进「运行测试」步靠批量完成兜住
 *   ④ task 卡骨架字段与 design 冲突需逐卡裁决——tasks.md 注解可反填的应自动反填
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { provisionDeps } from '../src/worktree-deps.js'
import { validateTaskReviews } from '../src/task-review.js'
import { buildExecuteSteps } from '../src/stages/execute.js'
import { buildTaskcardSkeleton, cmdTaskcard } from '../src/taskcard.js'
import { validatePlanForExecute } from '../src/stages/execute.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
const NOW = '2026-08-21 12:00:00'

console.log('=== ① provision 后验证：假 installed 显式化（坑 provision-silent-fake-installed）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'prov-verify-'))
  const main = path.join(d, 'main'); const wt = path.join(d, 'wt'); const spec = path.join(d, 'spec')
  fs.mkdirSync(main); fs.mkdirSync(wt); fs.mkdirSync(spec)
  fs.writeFileSync(path.join(main, 'package-lock.json'), 'lock')
  fs.writeFileSync(path.join(wt, 'package-lock.json'), 'lock-DIFF')
  // 声明依赖的 package.json——后验证仅对「有声明依赖」的 installed 状态校验 node_modules
  // （空 deps 项目 npm install 合法地不产生 node_modules）
  fs.writeFileSync(path.join(wt, 'package.json'), '{"name":"wt","dependencies":{"left-pad":"1.0.0"}}')
  fs.writeFileSync(path.join(spec, 'local.yaml'), 'project:\n  type: nodejs\ncommands:\n  install: "npm --version"\n')
  // npm --version 退出 0 但不装任何东西——不预建 node_modules，后验证应识破
  const r = provisionDeps(wt, main, { specBase: spec })
  assertTrue(r.depsStatus === 'failed', `假 installed 被后验证识破为 failed（实得 ${r.depsStatus}）`)
  assertTrue((r.depsError || '').includes('后验证失败'), 'depsError 含后验证说明')
  assertTrue((r.depsError || '').includes('New-Item -ItemType Junction'), '给 PowerShell junction 手动兜底命令')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ② 验证 task 零 diff 通道（坑 verification-task-zero-diff）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'veri-task-'))
  // git 仓保持干净（change/runtime 放仓外）——emptyDiff 判定会并入 working-tree 未提交改动，
  // fixture 若把 review/tasks 留在仓内会污染 emptyDiff 触发条件
  const repo = path.join(d, 'repo'); const changeDir = path.join(d, 'change'); const runtimeRoot = path.join(d, 'runtime')
  fs.mkdirSync(repo); fs.mkdirSync(path.join(changeDir, 'tasks'), { recursive: true }); fs.mkdirSync(runtimeRoot, { recursive: true })
  sh('git init -q && git config user.email t@t && git config user.name t', repo)
  fs.writeFileSync(path.join(repo, 'f.txt'), 'x\n')
  sh('git add -A && git commit -qm base', repo)
  const base = execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim()
  // task-10 声明纯验证；review pass + requiredEvidence 披露 + base==head（零 diff）
  fs.writeFileSync(path.join(changeDir, 'tasks', 'task-10.md'),
    '---\nid: task-10\ntask_type: verification\n---\n# 验证任务\n')
  const reviewDir = path.join(runtimeRoot, 'execute-runs', 'exec-1', 'tasks', 'task-10')
  fs.mkdirSync(reviewDir, { recursive: true })
  fs.writeFileSync(path.join(reviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-10', base, head: base, changedFiles: [],
    specVerdict: 'pass', qualityVerdict: 'pass', requiredEvidence: ['verify 区间 03:00-03:10，sweeper 协程拉起日志 L120-L180'],
  }))
  const plan = '- [x] task-10: 部署验证\n'
  const r1 = validateTaskReviews({ planContent: plan, runtimeRoot, executeRunId: 'exec-1', changeDir, gitDir: repo })
  assertTrue(r1.ok === true, `声明 task_type: verification + 披露 requiredEvidence → 零 diff 放行（errors: ${r1.errors.join('; ')})`)
  assertTrue(r1.warnings.some(w => w.includes('纯验证任务')), '放行走 warning 披露通道（非静默）')

  // 声明了 verification 但 requiredEvidence 空 → 仍拦（声明不能替代披露）
  fs.writeFileSync(path.join(reviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-10', base, head: base, changedFiles: [],
    specVerdict: 'pass', qualityVerdict: 'pass',
  }))
  const r2 = validateTaskReviews({ planContent: plan, runtimeRoot, executeRunId: 'exec-1', changeDir, gitDir: repo })
  assertTrue(r2.ok === false && r2.errors.some(e => e.includes('缺 requiredEvidence')), '空 requiredEvidence 仍拦（披露义务不豁免）')

  // 未声明的普通 task 零 diff → 原伪造判定不变（零回归）
  fs.writeFileSync(path.join(changeDir, 'tasks', 'task-11.md'), '---\nid: task-11\n---\n')
  const reviewDir11 = path.join(runtimeRoot, 'execute-runs', 'exec-1', 'tasks', 'task-11')
  fs.mkdirSync(reviewDir11, { recursive: true })
  fs.writeFileSync(path.join(reviewDir11, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-11', base, head: base, changedFiles: [],
    specVerdict: 'pass', qualityVerdict: 'pass', requiredEvidence: ['x'],
  }))
  const r3 = validateTaskReviews({ planContent: plan + '- [x] task-11: 普通\n', runtimeRoot, executeRunId: 'exec-1', changeDir, gitDir: repo })
  assertTrue(r3.ok === false && r3.errors.some(e => e.includes('疑似伪造')), '未声明 verification 的零 diff 仍判伪造（零回归）')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ③ Wave 标题漏识别（坑 wave-heading-undercount）===\n')
{
  const tmpPlan = path.join(os.tmpdir(), `wave-plan-${Date.now()}.md`)
  const tmpTasks = path.join(os.tmpdir(), `wave-tasks-${Date.now()}.md`)
  // 6 个 Wave，最后一个写成 "Wave 6:"（旧正则要求 Wave+空格+数字，"Wave6" 漏）——用 Wave6 无空格形态
  fs.writeFileSync(tmpTasks, '- [ ] task-01: a\n- [ ] task-02: b\n- [ ] task-03: c\n')
  fs.writeFileSync(tmpPlan,
    '---\nplan_level: full\n---\n# Plan\n\n## Wave 1\n\n- task-01\n\n## Wave 2\n\n- task-02\n\n## Wave6\n\n- task-03\n')
  const steps = buildExecuteSteps(tmpPlan, {})
  const waveSteps = steps.filter(s => /^Wave \d+ 执行$/.test(s.name))
  assertTrue(waveSteps.length === 3, `宽容正则收容 "Wave6"（3 个 Wave 步，实际 ${waveSteps.length}）`)

  // 「波次」类仍不识别但 execute 侧 warn 点名（运行时防线）
  const plan2 = '---\nplan_level: full\n---\n# Plan\n\n## Wave 1\n\n- task-01\n\n## 波次2\n\n- task-02\n'
  fs.writeFileSync(tmpPlan, plan2)
  const captured = (() => { const orig = console.warn; let buf = ''; console.warn = (...a) => { buf += a.join(' ') }; try { buildExecuteSteps(tmpPlan, {}) } finally { console.warn = orig } return buf })()
  assertTrue(captured.includes('疑似 Wave 标题但未被识别'), `运行时漂移告警点名漏网标题（实得 ${JSON.stringify(captured.slice(0, 80))}）`)
  assertTrue(captured.includes('波次2'), '告警列出具体漏网行')

  // plan 完成门 0.9：部分识别 + 部分漏 → error 阻断
  const v = validatePlanForExecute(fs.readFileSync(tmpTasks, 'utf8'), plan2)
  assertTrue(v.ok === false && v.errors.some(e => e.includes('疑似 Wave 标题但未被识别')), `plan --done 门拦截漏识别（errors: ${v.errors.filter(e => e.includes('Wave')).join('; ').slice(0, 80)}）`)
  fs.rmSync(tmpPlan, { force: true }); fs.rmSync(tmpTasks, { force: true })
}

console.log('\n=== ④ taskcard 反填 depends_on + --set（坑 taskcard-design-field-conflicts）===\n')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-fill-'))
  const cn = '2026-08-21-tc-fill'
  const changeDir = path.join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(path.join(changeDir), { recursive: true })
  fs.writeFileSync(path.join(changeDir, 'tasks.md'),
    '- [ ] task-01: 基础模块\n- [ ] task-02: 上层功能 (depends_on: task-01)\n- [ ] task-03: 联动 (depends_on: task-01,02)\n')
  const r = cmdTaskcard(cn, { cwd: d, taskIds: 'all', sets: { priority: 'P1' } })
  assertTrue(r.created.length === 3, '三卡生成')
  const c2 = fs.readFileSync(path.join(changeDir, 'tasks', 'task-02.md'), 'utf8')
  assertTrue(c2.includes("depends_on: ['task-01']"), `task-02 反填 depends_on（实际含 ${c2.split('\n')[6]}）`)
  const c3 = fs.readFileSync(path.join(changeDir, 'tasks', 'task-03.md'), 'utf8')
  assertTrue(c3.includes("depends_on: ['task-01', 'task-02']"), 'task-03 多依赖反填')
  const c1 = fs.readFileSync(path.join(changeDir, 'tasks', 'task-01.md'), 'utf8')
  assertTrue(c1.includes('depends_on: []'), '无注解 task 保持空数组')
  assertTrue(c1.includes("priority: 'P1'"), '--set priority=P1 生效（yamlScalar 转义）')
  // title 仍从注册表带出
  assertTrue(c2.includes("title: '上层功能'"), '标题照常从 tasks.md 带出')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
