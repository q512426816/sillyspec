/**
 * completeStep characterization — brainstorm 阶段 happy path（完整收尾）
 *
 * 锁住 completeStep 在 brainstorm 末步完成、产物齐全时的现有行为：
 *   - runValidators('brainstorm') 通过（四件套齐全 + design 无生命周期关键词）
 *   - Stage Review Gate：design 变更文件 ≤3 → tier=self，降级自审放行（不需 review.json）
 *   - stageData.status='completed' + completedAt + triggerSync + user-inputs.md 追加
 *   - 返回 {stageCompleted:true, nextPendingIdx:-1}
 *
 * 断言三件套：DB（status=completed）+ stdout（阶段已完成）+ 产物（user-inputs.md 追加）。
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '状态检查', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '用户确认并生成规范文件',
]
function brainstormStepsWithLastPending() {
  return BRAINSTORM_STEPS.map((name, i) => ({
    name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending',
  }))
}

console.log('=== completeStep characterization: brainstorm happy path ===\n')

console.log('--- 末步 + 四件套齐全 + design≤3 文件 → 阶段完成 ---')
{
  const { cwd, specBase } = makeRepo('cs-brainstorm-')
  const cn = '2026-07-25-brainstorm-ok'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 列表默认最新在前\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  // design.md：含文件变更清单（≤3 文件 → tier=self），无生命周期关键词（session/daemon/lifecycle 等）
  writeFileSync(join(changeDir, 'design.md'),
    `# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底 order_by。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序兜底 |\n\n## 风险登记\n低风险。\n\n## 自审\n已核对。\n`)
  const progress = await seedStage(pm, cwd, cn, 'brainstorm', brainstormStepsWithLastPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'brainstorm', cwd, '生成规范完成', '用户拍板',
      { changeName: cn, printNext: false, doneAnswer: '确认' }))

  assert(!r.error, 'happy path 不应 process.exit')
  assert(r.result && r.result.stageCompleted === true, 'stageCompleted:true')
  assert(r.result && r.result.nextPendingIdx === -1, 'nextPendingIdx:-1（无待办）')
  assert(r.stdout.includes('brainstorm 阶段已完成'), 'stdout 含「brainstorm 阶段已完成」')
  assert(r.stdout.includes('tier=self'), 'Stage Review tier=self（≤3 文件降级自审）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', 'DB: stage.status=completed')
  assert(!!after.stages.brainstorm.completedAt, 'DB: completedAt 已落盘')

  // user-inputs.md 追加（共享行为：完成时把 output 落到 .runtime/user-inputs.md）
  const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
  assert(existsSync(inputsPath), 'user-inputs.md 已创建')
  const inputs = readFileSync(inputsPath, 'utf8')
  assert(inputs.includes('生成规范完成'), 'user-inputs.md 含本次 output')
  assert(inputs.includes('用户拍板'), 'user-inputs.md 含本次 input')
}

console.log('--- design.md scale=small → 下一步 quick --linked-changes（修历史 bug：曾硬编码 plan） ---')
{
  const { cwd, specBase } = makeRepo('cs-brainstorm-scale-')
  const cn = '2026-07-25-brainstorm-small'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: x\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  // design.md 头部带 frontmatter scale: small（brainstorm 末步写入），文件清单 1 文件
  writeFileSync(join(changeDir, 'design.md'),
    '---\nauthor: test\ncreated_at: 2026-07-25\nscale: small\n---\n# Design: 小改\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/a.js | x |\n\n## 自审\n已核对。\n')
  const progress = await seedStage(pm, cwd, cn, 'brainstorm', brainstormStepsWithLastPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'brainstorm', cwd, '生成规范完成', '用户拍板',
      { changeName: cn, printNext: false, doneAnswer: '确认' }))

  assert(!r.error, 'scale=small happy path 不应 process.exit')
  assert(r.result && r.result.stageCompleted === true, 'scale=small stageCompleted:true')
  assert(r.stdout.includes('下一步：sillyspec run quick'), 'scale=small → 下一步提示 quick')
  assert(r.stdout.includes(`--linked-changes ${cn}`), 'quick 用 --linked-changes 而非 --change')
  assert(!r.stdout.includes('run plan'), 'scale=small 不应再提示 plan（历史 bug 已修）')
  assert(!r.stdout.includes('run scan'), 'brainstorm 完成不再误推 scan（修 _getNextSuggestion 回头路 bug）')
}

cleanup()
report(count.passed, count.failed, count.failures)
