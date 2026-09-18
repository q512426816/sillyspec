/**
 * doctor archive_integrity 归档完整性重扫测试（OpenSpec validate --archived 对标，能力③）
 *
 * 覆盖（detectArchiveIntegrity 经 runDoctorDiagnostics 出口，走公开 API 测行为）：
 *   1. 无权威 specDir（无 .sillyspec）→ pass + 跳过注记（不误报）
 *   2. 无 changes/archive 目录 → pass + 跳过注记（新仓/未归档不误报）
 *   3. 完整归档（tasks.md 全勾 + plan.md 在场）→ pass
 *   4. 有未勾任务 → WARNING + offenders 明细（含未勾数）
 *   5. legacy 归档（无 tasks.md，plan.md checkbox 全勾）→ pass（读侧回退兼容，同 D5 语义）
 *   6. plan.md 缺失 → WARNING（findAlreadyArchivedDir 自愈基准文件在场性）
 *   7. tasks.md 存在但不可读（同名目录模拟 EISDIR）→ WARNING 不静默
 *      （OpenSpec #205 教训：读不了 ≠ 没任务，检查不许在什么都没看的情况下装通过）
 *   8. 隐藏目录（.tmp）忽略
 *   9. 无 task-NN checkbox 行但 plan.md 在场 → pass（无任务视为完备，同 OpenSpec 语义）
 *  10. CLI 端到端：sillyspec doctor --json dimensions 含 archive_integrity
 *  11. legacy 完成源切换：tasks.md 0 勾 + plan.md 全勾 → pass（2026-08-20-task-truth-unify
 *      前完成态在 plan.md；真实仓 sqlite-migration tasks 0/15 + plan 15/15 首扫实证）
 *  12. tasks 与 plan 都 0 勾 → 仍报未勾（完成源切换不许洗白真欠账）
 *  13. 无 tasks.md + plan.md 全勾 → pass（纯 plan 旧契约，防回归）
 *
 * 风格：自研 assert + tmp fixture（同 doctor-lifecycle-doc.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { runDoctorDiagnostics } from '../src/doctor-diagnostics.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

function sh(cmd, cwd) {
  return execFileSync(cmd, { cwd, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function getDim(result) {
  return result.dimensions.find((d) => d.name === 'archive_integrity')
}

/** 在 fixture 的 changes/archive/ 下造一份归档。tasks:'dir' 模拟不可读（同名目录 → readFileSync EISDIR）。 */
function makeArchive(root, name, { tasks, plan } = {}) {
  const dir = join(root, '.sillyspec', 'changes', 'archive', name)
  mkdirSync(dir, { recursive: true })
  if (tasks === 'dir') mkdirSync(join(dir, 'tasks.md'))
  else if (tasks != null) writeFileSync(join(dir, 'tasks.md'), tasks)
  if (plan === true) writeFileSync(join(dir, 'plan.md'), '# 计划\nlegacy 占位（无 checkbox）\n')
  else if (typeof plan === 'string') writeFileSync(join(dir, 'plan.md'), plan)
  return dir
}

const ALL_CHECKED_TASKS = '- [x] task-01: 实现功能\n- [x] task-02: 补测试收尾\n'
const PARTIAL_TASKS = '- [x] task-01: 实现功能\n- [ ] task-02: 补测试收尾\n'
const LEGACY_PLAN_ALL_CHECKED = '# 计划\n\n- [x] task-01: 实现功能\n- [x] task-02: 收尾\n'

// ── 1. 无权威 specDir → pass 跳过 ──
{
  const root = makeTmpDir('dr-arch-1-')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '1a 无 .sillyspec → pass')
  assert((dim.findings || []).some((f) => f.includes('跳过')), '1b 跳过注记在场')
}

// ── 2. 无 changes/archive → pass 跳过 ──
{
  const root = makeTmpDir('dr-arch-2-')
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '2a 无 archive 目录 → pass')
  assert((dim.findings || []).some((f) => f.includes('跳过') || f.includes('空')), '2b 跳过/空注记在场')
}

// ── 3. 完整归档 → pass ──
{
  const root = makeTmpDir('dr-arch-3-')
  makeArchive(root, '2026-01-01-ok-change', { tasks: ALL_CHECKED_TASKS, plan: true })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '3a tasks 全勾 + plan 在场 → pass')
  assert(dim.archive_count === 1 && (dim.offenders || []).length === 0, '3b archive_count=1 无 offender')
}

// ── 4. 有未勾任务 → WARNING + 明细 ──
{
  const root = makeTmpDir('dr-arch-4-')
  makeArchive(root, '2026-01-02-unfinished', { tasks: PARTIAL_TASKS, plan: true })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false, '4a 未勾 → pass=false')
  assert(dim.severity === 'warning', '4b severity=warning（advisory 不阻断）')
  const offender = (dim.offenders || [])[0]
  assert(offender && offender.name === '2026-01-02-unfinished', '4c offender 记名')
  assert(offender && offender.reasons.some((r) => r.includes('1') && (r.includes('未勾') || r.includes('unchecked'))), '4d 明细含未勾数')
}

// ── 5. legacy 归档（plan.md checkbox 回退）→ pass ──
{
  const root = makeTmpDir('dr-arch-5-')
  makeArchive(root, '2026-05-31-legacy', { plan: LEGACY_PLAN_ALL_CHECKED })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '5a 无 tasks.md 回退 plan.md 全勾 → pass')
}

// ── 6. plan.md 缺失 → WARNING ──
{
  const root = makeTmpDir('dr-arch-6-')
  makeArchive(root, '2026-01-03-no-plan', { tasks: ALL_CHECKED_TASKS })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false, '6a plan.md 缺失 → pass=false')
  const offender = (dim.offenders || [])[0]
  assert(offender && offender.reasons.some((r) => r.includes('plan.md')), '6b reason 指名 plan.md 缺失')
}

// ── 7. 注册表存在但不可读 → WARNING 不静默（#205 教训） ──
{
  const root = makeTmpDir('dr-arch-7-')
  makeArchive(root, '2026-01-04-unreadable', { tasks: 'dir', plan: true })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false, '7a tasks.md 不可读 → pass=false（不许当无任务放行）')
  const offender = (dim.offenders || [])[0]
  assert(offender && offender.reasons.some((r) => r.includes('不可读') || r.includes('unreadable')), '7b reason 指名不可读')
}

// ── 8. 隐藏目录忽略 ──
{
  const root = makeTmpDir('dr-arch-8-')
  makeArchive(root, '2026-01-05-fine', { tasks: ALL_CHECKED_TASKS, plan: true })
  mkdirSync(join(root, '.sillyspec', 'changes', 'archive', '.tmp-cache'))
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true && dim.archive_count === 1, '8 隐藏目录 .tmp-cache 不计入')
}

// ── 9. 无 task-NN 行但 plan.md 在场 → pass（无任务视为完备） ──
{
  const root = makeTmpDir('dr-arch-9-')
  makeArchive(root, '2026-01-06-doc-only', { tasks: '# 任务\n（纯文档变更无任务）\n', plan: true })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '9 无 checkbox 行 → pass')
}

// ── 11. legacy 完成源切换：tasks.md 0 勾 + plan.md 全勾 → pass ──
// 2026-08-20-task-truth-unify 前旧归档完成态在 plan.md（真实仓 sqlite-migration tasks 0/15 + plan 15/15 实证）
{
  const root = makeTmpDir('dr-arch-11-')
  makeArchive(root, '2026-05-31-legacy-done', {
    tasks: '- [ ] task-01: 实现功能\n- [ ] task-02: 收尾\n',
    plan: '# 计划\n\n- [x] task-01: 实现功能\n- [x] task-02: 收尾\n',
  })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '11a tasks 0 勾 + plan 全勾 → 完成证据在 plan.md，pass')
  assert((dim.offenders || []).length === 0, '11b 无 offender')
}

// ── 12. 两边都 0 勾 → 仍报未勾（不是所有 0 勾都能洗白） ──
{
  const root = makeTmpDir('dr-arch-12-')
  makeArchive(root, '2026-01-08-both-zero', {
    tasks: '- [ ] task-01: 实现功能\n',
    plan: '# 计划\n\n- [ ] task-01: 实现功能\n',
  })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false, '12 tasks 与 plan 都 0 勾 → pass=false')
}

// ── 13. 无 tasks.md、plan.md 全勾（旧契约纯 plan 流）→ pass ──
{
  const root = makeTmpDir('dr-arch-13-')
  makeArchive(root, '2026-06-01-plan-only', { plan: LEGACY_PLAN_ALL_CHECKED })
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '13 无 tasks.md + plan 全勾 → pass（同 5，防回归）')
}

// ── 14. 豁免账本：账本内 offender 压红（历史形态豁免，账本在案注记） ──
{
  const root = makeTmpDir('dr-arch-14-')
  makeArchive(root, '2026-06-09-ancient-no-plan', { tasks: ALL_CHECKED_TASKS }) // 缺 plan.md
  writeFileSync(join(root, '.sillyspec', 'archive-integrity-exempt.yaml'),
    'entries:\n  - name: 2026-06-09-ancient-no-plan\n    reason: 早于 plan.md 流程\n    exempted_at: 2026-09-17\n')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '14a 账本内 offender → pass（豁免压红）')
  assert((dim.offenders || []).length === 0 && dim.exempted_count === 1, '14b offenders 空 + exempted_count=1')
  assert((dim.findings || []).some((f) => f.includes('豁免在案')), '14c 豁免在案注记')
}

// ── 15. 豁免账本：账本外 offender 仍红（账本不许抹平新账） ──
{
  const root = makeTmpDir('dr-arch-15-')
  makeArchive(root, '2026-06-09-exempted-one', { tasks: ALL_CHECKED_TASKS })
  makeArchive(root, '2026-09-10-new-offender', { tasks: PARTIAL_TASKS, plan: true })
  writeFileSync(join(root, '.sillyspec', 'archive-integrity-exempt.yaml'),
    'entries:\n  - name: 2026-06-09-exempted-one\n    reason: 历史形态\n    exempted_at: 2026-09-17\n')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false, '15a 账本外 offender 仍红')
  const offender = (dim.offenders || [])[0]
  assert(offender && offender.name === '2026-09-10-new-offender', '15b offender 只列账本外那份')
  assert(dim.exempted_count === 1, '15c 豁免计数独立')
}

// ── 16. 豁免账本：失效条目提示清理（stale hint） ──
{
  const root = makeTmpDir('dr-arch-16-')
  makeArchive(root, '2026-01-09-fine', { tasks: ALL_CHECKED_TASKS, plan: true })
  writeFileSync(join(root, '.sillyspec', 'archive-integrity-exempt.yaml'),
    'entries:\n  - name: gone-archive\n    reason: 对应归档已不欠账\n    exempted_at: 2026-09-17\n')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '16a 无 offender → pass')
  assert((dim.findings || []).some((f) => f.includes('失效')) && (dim.stale_exemptions || []).includes('gone-archive'), '16b stale 条目提示清理')
}

// ── 17. 豁免账本解析失败 → fail-safe 红灯保持（按无豁免处理） ──
{
  const root = makeTmpDir('dr-arch-17-')
  makeArchive(root, '2026-06-09-ancient-no-plan', { tasks: ALL_CHECKED_TASKS })
  writeFileSync(join(root, '.sillyspec', 'archive-integrity-exempt.yaml'), '{oops: [unclosed')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false, '17a 账本损坏 → 红灯保持（fail-safe）')
  assert((dim.findings || []).some((f) => f.includes('解析失败')), '17b 解析失败注记在场')
}

// ── 18-21. D14 第四检查（FR 索引在场+取代完整，epoch=2026-09-18 分界，2026-09-18-fr-index-l1） ──
async function frCase(prefix, { archiveName, requirements, indexChange, indexWithSupersede }) {
  const root = makeTmpDir(prefix)
  const specBase = join(root, '.sillyspec')
  const knowledgeRoot = join(specBase, 'knowledge')
  mkdirSync(knowledgeRoot, { recursive: true })
  const dir = makeArchive(root, archiveName, { tasks: ALL_CHECKED_TASKS, plan: true })
  if (requirements) writeFileSync(join(dir, 'requirements.md'), requirements)
  if (indexChange) {
    const { indexRequirements } = await import('../src/fr-index.js')
    const srcDir = join(specBase, 'changes', indexChange)
    mkdirSync(srcDir, { recursive: true })
    writeFileSync(join(srcDir, 'requirements.md'), requirements || '# R\n')
    indexRequirements({ changeDir: srcDir, knowledgeRoot })
  }
  if (indexWithSupersede) {
    // 直接构造含 superseded 标记的索引条目（不走 indexRequirements——本组测 doctor 读侧）
    const frDir = join(knowledgeRoot, 'fr')
    mkdirSync(frDir, { recursive: true })
    writeFileSync(join(frDir, 'unmapped.md'),
      `## FR-unmapped-001 老需求\n变更：${indexWithSupersede}\n状态：superseded\nsuperseded_by：FR-unmapped-002\n摘要：x\n最近确认：\n`)
  }
  return getDim(await runDoctorDiagnostics({ cwd: root }))
}

{
  const dim = await frCase('dr-arch-18-', {
    archiveName: '2026-01-01-pre-epoch',
    requirements: '# R\n### FR-01: 老需求\n',
    indexChange: '2026-09-18-idx-src',
  })
  assert(dim && dim.pass === true, '18 epoch 前归档（2026-01-01）零 FR 检查（存量不回填）')
}
{
  const dim = await frCase('dr-arch-19-', {
    archiveName: '2026-09-19-post-epoch',
    requirements: '# R\n### FR-01: 新需求\n',
    indexChange: '2026-09-19-idx-src', // 索引条目归属另一变更名 → 本归档在场性缺失
  })
  assert(dim && dim.pass === false, '19a epoch 后归档索引缺失 → offender')
  const offender = (dim.offenders || [])[0]
  assert(offender && offender.reasons.some((r) => r.includes('FR 索引缺失')), `19b reason 指名索引缺失（实际 ${JSON.stringify(offender && offender.reasons)}）`)
}
{
  // 手写索引：归档在场（002 归属本归档）+ 001 被 requirements 承接但未翻 superseded → 精确取代缺口
  const root = makeTmpDir('dr-arch-20-')
  const knowledgeRoot = join(root, '.sillyspec', 'knowledge')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  writeFileSync(join(knowledgeRoot, 'fr', 'unmapped.md'),
    '## FR-unmapped-001 老需求\n变更：older\n状态：active\n摘要：x\n最近确认：\n\n## FR-unmapped-002 改造\n变更：2026-09-19-sup-bad\n状态：active\n摘要：y\n最近确认：\n')
  const dir = makeArchive(root, '2026-09-19-sup-bad', { tasks: ALL_CHECKED_TASKS, plan: true })
  writeFileSync(join(dir, 'requirements.md'), '# R\n### FR-01: 改造\n承接: FR-unmapped-001\n')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === false && (dim.offenders || [])[0]?.reasons.some((r) => r.includes('承接未翻取代')), `20 在场但承接未翻 → 精确报取代缺口（实际 ${JSON.stringify((dim.offenders || [])[0])}）`)
}
{
  // 21 quick/无 requirements 豁免 + fr/ 目录不存在（仓未启用）
  const root = makeTmpDir('dr-arch-21-')
  makeArchive(root, '2026-09-19-no-req', { tasks: ALL_CHECKED_TASKS, plan: true }) // 无 requirements.md
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, '21a 无 requirements（quick/scale:small 面）→ 零索引义务绿')
  const root2 = makeTmpDir('dr-arch-21b-')
  const dir2 = makeArchive(root2, '2026-09-19-x', { tasks: ALL_CHECKED_TASKS, plan: true })
  writeFileSync(join(dir2, 'requirements.md'), '# R\n### FR-01: q\n')
  const dim2 = getDim(await runDoctorDiagnostics({ cwd: root2 }))
  assert(dim2 && dim2.pass === true, '21b fr/ 目录不存在（仓未启用）→ 全跳不误报')
}

{
  // 20b 正向：epoch 后归档在场 + 承接已翻取代 → 零 offender（R1 缺口：doctor 套件缺正向组）
  const root = makeTmpDir('dr-arch-20b-')
  const knowledgeRoot = join(root, '.sillyspec', 'knowledge')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  writeFileSync(join(knowledgeRoot, 'fr', 'unmapped.md'),
    '## FR-unmapped-001 老需求\n变更：older\n状态：superseded\nsuperseded_by：FR-unmapped-002\n取代链：FR-unmapped-001 ← FR-unmapped-002\n摘要：x\n最近确认：\n\n## FR-unmapped-002 改造\n变更：2026-09-19-sup-ok\n状态：active\n摘要：y\n最近确认：\n')
  const dir = makeArchive(root, '2026-09-19-sup-ok', { tasks: ALL_CHECKED_TASKS, plan: true })
  writeFileSync(join(dir, 'requirements.md'), '# R\n### FR-01: 改造\n承接: FR-unmapped-001\n')
  const dim = getDim(await runDoctorDiagnostics({ cwd: root }))
  assert(dim && dim.pass === true, `20b 在场+承接已翻 → 零 offender（正向闭环，实际 ${dim && dim.evidence}）`)
}

// ── 10. CLI 端到端：doctor --json 含维度 ──
{
  const root = makeTmpDir('dr-arch-10-')
  sh('git init -q', root)
  makeArchive(root, '2026-01-07-e2e', { tasks: ALL_CHECKED_TASKS, plan: true })
  const cliRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const out = sh(`node "${join(cliRoot, 'bin', 'sillyspec.js')}" doctor --json`, root)
  assert(out.includes('"archive_integrity"'), '10a doctor --json dimensions 含 archive_integrity')
  assert(/"name":\s*"archive_integrity"[\s\S]*?"pass":\s*true/.test(out), '10b 端到端完整归档 pass=true')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟，残留交给 tmpdir 清理 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
