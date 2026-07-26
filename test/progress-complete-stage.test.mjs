/**
 * progress.completeStage characterization — 五层结构快照（W6 Step9 必改，先冻结）
 *
 * completeStage（progress.js:979-1066）的五层：
 *   1. resolve   — VALID_STAGES 校验 + changeName 推断（listChanges 取唯一活跃）
 *   2. validate  — _validateStageArtifacts → runValidators；!ok&&!force 拒绝 / !ok&&force warn+audit / ok&&force audit
 *   3. tx        — db.transaction 内 UPDATE stages/steps/changes
 *   4. history   — read 重读 → writeAtomicSync <cn>-<stage>-<ts>.json（ts=ISO 去标点 17 位）
 *   5. print     — console.log ✅
 *
 * 副作用全在 DB（不写 progress.json）+ history JSON + audit.log（仅 force）+ console。不 process.exit 不抛。
 * W6 Step9 要拆 ConsistencyDoctor/ChangeRegistry/StepStore/StageMachine，本测试冻结 completeStage 对外契约。
 *
 * 断言三件套：DB（pm.read）+ stdout（runCapturing）+ 文件系统（history/audit.log）。
 */
import { writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// verify 产物齐全（与 run-complete-step-verify 同源，runValidators 能放行）
function writeVerifyArtifacts(changeDir) {
  writeFileSync(join(changeDir, 'design.md'),
    `# Design: 列表排序\n\n## 背景\n默认最新在前。\n\n## 总体方案\nservice 兜底。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序 |\n`)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'),
    `# 验证报告\n\n## 结论\n\nPASS\n\n所有任务通过。\n`)
}

console.log('=== progress.completeStage characterization: 五层结构 ===\n')

// ── Case 1: resolve 层 — 未知 stage → 拒绝（return，不写盘）──
console.log('--- resolve 层：未知 stage → 拒绝 ---')
{
  const { cwd, specBase } = makeRepo('cs-stage-resolve-')
  const cn = '2026-07-25-stage-unknown'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [{ name: '状态检查', status: 'completed' }])

  const r = await runCapturing(() => pm.completeStage(cwd, 'nonexistent-stage', cn))

  assert(!r.error, '未知 stage 不应 process.exit/抛错')
  assert(r.stdout.includes('❌ 未知阶段: nonexistent-stage'), 'stdout 含「未知阶段」')
  const after = await pm.read(cwd, cn)
  assert(!after.stages.nonexistent_stage, 'DB 未创建未知 stage 行（resolve 层提前 return）')
}

// ── Case 2: validate 层 — 产物缺失 + 无 force → 拒绝（不写盘）──
console.log('\n--- validate 层：产物缺失无 force → 拒绝 ---')
{
  const { cwd, specBase } = makeRepo('cs-stage-validate-')
  const cn = '2026-07-25-stage-noforce'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [{ name: '状态检查', status: 'pending' }])
  // 故意不写产物 → runValidators(verify) 失败

  const r = await runCapturing(() => pm.completeStage(cwd, 'verify', cn))

  assert(!r.error, 'validate 拒绝不应 process.exit/抛错')
  assert(r.stdout.includes('❌ complete-stage 被拒绝：阶段 verify 产物校验未通过'), 'stdout 含「complete-stage 被拒绝」')
  assert(r.stdout.includes('请修复产物后重试'), 'stdout 含修复提示')
  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status !== 'completed', 'DB: status 未推进（仍非 completed）')
}

// ── Case 3: validate 层 — 产物缺失 + force → warn + audit + 推进 ──
console.log('\n--- validate 层：force 强制放行（warn + audit.log + 推进）---')
{
  const { cwd, specBase } = makeRepo('cs-stage-force-')
  const cn = '2026-07-25-stage-force'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [{ name: '状态检查', status: 'pending' }])
  // 不写产物 → 校验失败，靠 force 放行

  const r = await runCapturing(() => pm.completeStage(cwd, 'verify', cn, { force: true }))

  assert(!r.error, 'force 放行不应 process.exit/抛错')
  assert(r.stdout.includes('⚠️  --force 强制完成阶段 verify'), 'stdout 含 force warn')
  assert(r.stdout.includes('已记录审计日志'), 'stdout 提示已记审计')

  // audit.log 落地（仅 force 时写）
  const auditPath = join(specBase, '.runtime', 'audit.log')
  assert(existsSync(auditPath), 'audit.log 创建（force 专属副作用）')
  const auditContent = readFileSync(auditPath, 'utf8')
  const lines = auditContent.trim().split('\n')
  const lastEntry = JSON.parse(lines[lines.length - 1])
  assert(lastEntry.action === 'complete-stage --force', 'audit.log action=complete-stage --force')
  assert(lastEntry.stage === 'verify', 'audit.log stage=verify')
  assert(lastEntry.change === cn, 'audit.log change=' + cn)
  assert(Array.isArray(lastEntry.validationErrors) && lastEntry.validationErrors.length > 0, 'audit.log 含非空 validationErrors（force 因校验失败）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status === 'completed', 'DB: force 推进 status=completed')
}

// ── Case 4: happy path — verify 产物齐全 → tx + history + print ──
console.log('\n--- happy path：产物齐全 → tx 推进 + history 落地 + print ✅ ---')
{
  const { cwd, specBase } = makeRepo('cs-stage-happy-')
  const cn = '2026-07-25-stage-happy'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [
    { name: '状态检查', status: 'completed' },
    { name: '输出验证报告', status: 'pending' },
  ])
  writeVerifyArtifacts(join(specBase, 'changes', cn))

  const r = await runCapturing(() => pm.completeStage(cwd, 'verify', cn))

  assert(!r.error, 'happy path 不应 process.exit/抛错')
  assert(r.stdout.includes('✅ 阶段 verify 已标记为完成（不自动推进，下一步由你决定）'), 'print 层：✅ 已标记完成')

  // tx 层：DB status + pending 步骤全 completed
  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status === 'completed', 'DB tx: stage.status=completed')
  assert(after.stages.verify.steps.every(s => s.status === 'completed'), 'DB tx: 所有 pending 步骤 → completed')

  // history 层：.runtime/history/<cn>-verify-<17digit>.json
  const historyDir = join(specBase, '.runtime', 'history')
  assert(existsSync(historyDir), 'history 目录创建')
  const historyFiles = readdirSync(historyDir)
  const match = historyFiles.find(f => new RegExp(`^${cn}-verify-\\d{17}\\.json$`).test(f))
  assert(!!match, `history 文件名格式 <cn>-<stage>-<17位ISO去标点时间戳>.json（实际: ${historyFiles.join(',') || '无'}）`)
  if (match) {
    const hist = JSON.parse(readFileSync(join(historyDir, match), 'utf8'))
    assert(hist.change === cn && hist.stage === 'verify', 'history JSON 含 change + stage')
    assert(hist.completedAt != null, 'history JSON 含 completedAt')
  }
}

// ── Case 5: resolve 层 — changeName 推断（不传 cn，单活跃变更自动取）──
console.log('\n--- resolve 层：changeName 推断（单活跃变更）---')
{
  const { cwd, specBase } = makeRepo('cs-stage-infer-')
  const cn = '2026-07-25-stage-infer'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [{ name: '状态检查', status: 'pending' }])
  writeVerifyArtifacts(join(specBase, 'changes', cn))

  // 不传 changeName，靠 listChanges 取唯一活跃变更
  const r = await runCapturing(() => pm.completeStage(cwd, 'verify'))

  assert(!r.error, '推断路径不应 process.exit/抛错')
  assert(r.stdout.includes('✅ 阶段 verify 已标记为完成'), '推断成功 → print ✅')
  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status === 'completed', 'DB: 推断到唯一 change 并推进')
}

cleanup()
report(count.passed, count.failed, count.failures)
