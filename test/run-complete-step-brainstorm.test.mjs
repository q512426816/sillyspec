/**
 * brainstorm 阶段收尾 CLI 行为测试（run brainstorm --done）。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试：通过 sillyspec run brainstorm --done
 * 驱动末步完成，断言对外可观察行为（退出码 / DB 状态 / stdout / 产物文件）。
 *
 * 锁住的行为：
 *   - runValidators('brainstorm') 通过（四件套齐全 + design 无生命周期关键词）
 *   - Stage Review Gate：design 变更文件 ≤3 → tier=self，降级自审放行（不需 review.json）
 *   - stageData.status='completed' + completedAt + user-inputs.md 追加
 *   - scale=small → 下一步提示 quick --linked-changes（历史 bug：曾误推 plan）
 *   - --reopen --from-step N 后 --done：stale 步骤同步回填 completed
 *
 * 中间状态用 ProgressManager 注入（与 wait-gates.test.mjs 同款：先让 CLI init 步骤 schema，
 * 再 read→tweak step status→write），避免逐步 --done 的输出文件细节耦合。
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
function brainstormStepsWithLastPending() {
  return BRAINSTORM_STEPS.map((name, i) => ({
    name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending',
  }))
}

// 让 CLI 初始化 brainstorm 步骤 schema（首次 run brainstorm 会在 DB 建步骤），
// 再用 seedStage 覆盖为「前 N-1 completed + 末步 pending」。
async function seedBrainstormToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  // 先跑一次 run brainstorm 让 CLI 建步骤骨架（确保 step name 与 definition 一致）
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'brainstorm', brainstormStepsWithLastPending())
}

console.log('=== brainstorm 收尾 CLI 行为：happy path（末步 --done → 阶段完成）===\n')

console.log('--- 末步 + 四件套齐全 + design≤3 文件 → 阶段完成（exit 0）---')
{
  const { cwd, specBase } = makeRepo('cli-brainstorm-')
  const cn = '2026-07-25-brainstorm-ok'
  await seedBrainstormToLast(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 列表默认最新在前\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  // design.md：含文件变更清单（≤3 文件 → tier=self），无生命周期关键词
  writeFileSync(join(changeDir, 'design.md'),
    '# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底 order_by。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序兜底 |\n\n## 风险登记\n低风险。\n\n## 自审\n已核对。\n')

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })

  assert(r.status === 0, `exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('brainstorm 阶段已完成') || r.combined.includes('阶段已完成'), 'stdout 含「阶段已完成」')
  assert(r.combined.includes('tier=self') || r.combined.includes('self'), 'Stage Review tier=self（≤3 文件降级自审）')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', 'DB: stage.status=completed')
  assert(!!after.stages.brainstorm.completedAt, 'DB: completedAt 已落盘')

  // user-inputs.md 追加（共享行为：完成时把 output 落到 .runtime/user-inputs.md）
  const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
  assert(existsSync(inputsPath), 'user-inputs.md 已创建')
  const inputs = readFileSync(inputsPath, 'utf8')
  assert(inputs.includes('生成规范完成'), 'user-inputs.md 含本次 output')
}

console.log('\n--- design.md scale=small → 下一步 quick --linked-changes（修历史 bug：曾硬编码 plan） ---')
{
  const { cwd, specBase } = makeRepo('cli-brainstorm-scale-')
  const cn = '2026-07-25-brainstorm-small'
  await seedBrainstormToLast(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: x\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  // design.md 头部带 frontmatter scale: small，文件清单 1 文件
  writeFileSync(join(changeDir, 'design.md'),
    '---\nauthor: test\ncreated_at: 2026-07-25\nscale: small\n---\n# Design: 小改\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/a.js | x |\n\n## 自审\n已核对。\n')

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })

  assert(r.status === 0, `scale=small exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('下一步：sillyspec run quick') || r.combined.includes('run quick'), 'scale=small → 下一步提示 quick')
  assert(r.combined.includes(`--linked-changes ${cn}`) || r.combined.includes('--linked-changes'), 'quick 用 --linked-changes 而非 --change')
  assert(!r.combined.includes('run plan'), 'scale=small 不应再提示 plan（历史 bug 已修）')
  assert(!r.combined.includes('run scan'), 'brainstorm 完成不再误推 scan')
}

console.log('\n--- reopen --from-step N 后 --done：FR-01 门控——无 confirm 阻断不回填，--confirm 回填收尾 ---')
{
  const { cwd, specBase } = makeRepo('cli-brainstorm-reopen-')
  const cn = '2026-07-25-brainstorm-reopen'
  await seedBrainstormToLast(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 列表默认最新在前\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  writeFileSync(join(changeDir, 'design.md'),
    '# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底 order_by。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序兜底 |\n\n## 风险登记\n低风险。\n\n## 自审\n已核对。\n')

  const pm = new ProgressManager({ specDir: specBase })
  // CLI --reopen --from-step 6：step 6 → pending，step 7/8 → stale
  const reopen6 = runCLI(['--dir', cwd, 'run', 'brainstorm', '--reopen', '--from-step', '6', '--change', cn], { cwd })
  assert(reopen6.status === 0, `reopen --from-step 6 exit 0（实际 ${reopen6.status}）`)

  const reopened = await pm.read(cwd, cn)
  const rsteps = reopened.stages.brainstorm.steps
  assert(rsteps[5].status === 'pending', 'reopen 后 step 6 应为 pending（待重做）')
  assert(rsteps[6].status === 'stale' && rsteps[7].status === 'stale', 'reopen 后 step 7/8 应为 stale')

  // --done 完成 step 6（当前 pending）：FR-01 后不再静默回填——阻断 + 两条出路指引
  const r = runStage('brainstorm', cn, cwd, { done: true, output: '修订决策章节完成', answer: '确认' })

  assert(r.status === 0, `reopen 后 --done exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(!r.combined.includes('阶段校验跳过'), '不应再有「状态不同步」警告')
  assert(r.combined.includes('stale 步骤') && r.combined.includes('--confirm'), 'FR-01: 输出含 stale 检测与 --confirm 出路指引')

  const afterMid = await pm.read(cwd, cn)
  assert(afterMid.stages.brainstorm.status !== 'completed', 'FR-01: 无 confirm 阶段不完成')
  const msteps = afterMid.stages.brainstorm.steps
  assert(msteps[5].status === 'completed', 'step 6 本次 --done 已完成')
  assert(msteps[6].status === 'stale' && msteps[7].status === 'stale', 'FR-01: stale step 7/8 保持未回填')

  // --done --confirm 逃生门：首个 stale 拉回完成管线 → 回填门控收尾其余 stale → 阶段完成
  const rc = runStage('brainstorm', cn, cwd, { done: true, confirm: true, output: '确认方案未变，回填收尾' })

  assert(rc.status === 0, `--done --confirm exit 0（实际 ${rc.status}，输出尾：${rc.combined.slice(-150)}）`)

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', 'stage.status=completed（confirm 回填收尾）')
  const asteps = after.stages.brainstorm.steps
  assert(asteps[6].status === 'completed', 'stale step 7 已回填 completed')
  assert(asteps[7].status === 'completed', 'stale step 8 已回填 completed')
  assert(asteps.every(s => s.status === 'completed'), '全部 8 步 completed，无 stale 残留、无状态矛盾')
}

cleanup()
report(count.passed, count.failed, count.failures)
