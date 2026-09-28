/**
 * brainstorm 闭环收口门测试（2026-09-29-brainstorm-closure-gates）
 *
 * 判据：开放可以，但每个开口必须能回答「谁、在哪个阶段、以什么证据关掉它」。
 * 两层验证：
 *  - 纯 kind 规则经 evaluateRules mock-io 单元测试（literal-none 新 kind / success-criteria /
 *    no-placeholder-line 接线 / pending-confirm-residue）
 *  - custom kind 判定经 runValidators('brainstorm') 真文件测试（decision-coverage /
 *    doubt-closure / risk-mitigation），含「完整合规变更 0 error 0 warning」反误报锚。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { evaluateRules } from '../src/stage-contract-engine.js'
import { runValidators } from '../src/stage-contract.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

const CD = '/fake/change'

// helper：mock io（不碰 fs，纯单元）——同 stage-contract-spec.test.mjs 模式
function makeCtx(files = {}) {
  const ctx = { changeDir: CD }
  const norm = (p) => String(p).replace(/\\/g, '/')
  const io = {
    readFile: (p) => { const f = files[norm(p)]; return f != null ? { exists: true, content: f } : { exists: false, content: '' } },
    readDir: () => ({ exists: false, files: [] }),
  }
  return { ctx, io }
}

// 合规基线四件套（纯 kind 层不触发任何 warning 的底稿，各用例按需破坏一项）
const CLEAN_DESIGN = [
  '# 设计文档（Design）— 测试',
  '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/a.js | 新增方法 |', '',
  '## 风险登记', '', '| 编号 | 风险 | 等级 | 应对策略 |', '|---|---|---|---|',
  '| R-01 | 缓存击穿 | P1 | 空对象兜底＋短 TTL |',
  '| R-02 | 文案措辞争议 | P2 | 接受：低风险不改 |', '',
  '## 决策追踪', '', '| 决策 | 覆盖点 | 状态 |', '|---|---|---|', '| D-001@v1 | FR-01 §3 | 已覆盖 |', '',
  '## 自审', '', '- 章节齐全', '- frontmatter 字段齐全', '',
].join('\n')
const CLEAN_PROPOSAL = '# 提案书（Proposal）— 测试\n## 动机\n修复问题 X\n## 变更范围\nsrc/a.js\n## 不在范围内\n不做 Y\n## 成功标准（可验证）\n1. 测试全绿\n'
const CLEAN_REQUIREMENTS = '# 需求规格（Requirements）— 测试\n### FR-01: 某需求\nGiven 就绪\nWhen 行为\nThen 结果\n'
const CLEAN_TASKS = '# 任务清单（Tasks）— 测试\n- task-01: 实现某需求\n'

console.log('=== ① literal-none 纯 kind 引擎判定（新 kind） ===')
{
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: CLEAN_DESIGN,
    [`${CD}/proposal.md`]: CLEAN_PROPOSAL,
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: CLEAN_TASKS,
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(!r.warnings.some(w => w.includes('待确认')), 'design 无待确认 → literal-none 通过')
  assert(r.applied.includes('brainstorm.design.pending-confirm-residue'), 'pending-confirm-residue 规则被引擎应用')
}
{
  const designWithResidue = CLEAN_DESIGN.replace('| D-001@v1 | FR-01 §3 | 已覆盖 |', '| D-001@v1 | FR-01 §3 | 待确认 |')
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: designWithResidue,
    [`${CD}/proposal.md`]: CLEAN_PROPOSAL,
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: CLEAN_TASKS,
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.warnings.some(w => w.includes('残留「待确认」')), '决策追踪表待确认残留 → warning（表格单元格也命中）')
  assert(r.warnings.some(w => w.includes('已覆盖')), 'warning 文案含出路（改「已覆盖」）')
}

console.log('\n=== ② proposal 成功标准（FR-01） ===')
{
  const noCriteria = CLEAN_PROPOSAL.replace('## 成功标准（可验证）\n1. 测试全绿\n', '')
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: CLEAN_DESIGN,
    [`${CD}/proposal.md`]: noCriteria,
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: CLEAN_TASKS,
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.warnings.some(w => w.includes('成功标准')), 'proposal 缺成功标准章节 → warning')
  assert(r.errors.length === 0, 'warning 级不阻断（0 error）')
}
{
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: CLEAN_DESIGN,
    [`${CD}/proposal.md`]: CLEAN_PROPOSAL.replace('## 成功标准（可验证）', '## Success Criteria'),
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: CLEAN_TASKS,
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(!r.warnings.some(w => w.includes('成功标准')), '英文 Success Criteria 亦字面命中 → 无 warning')
}
{
  // scale=small：proposal 豁免（condition ne 'small' 不成立 → 规则跳过）
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: CLEAN_DESIGN,
    [`${CD}/proposal.md`]: '# P\n## 不在范围内\n', // 无成功标准
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: CLEAN_TASKS,
  })
  const r = evaluateRules('brainstorm', { ...ctx, scale: 'small' }, io)
  assert(!r.warnings.some(w => w.includes('成功标准')), 'scale=small → success-criteria 跳过（小变更只产 design.md）')
  assert(r.skipped.includes('brainstorm.proposal.success-criteria'), 'success-criteria 计入 skipped 清单')
}

console.log('\n=== ③ no-placeholder-line 四文件接线（FR-05） ===')
{
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: CLEAN_DESIGN,
    [`${CD}/proposal.md`]: CLEAN_PROPOSAL,
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: '# T\n- task-01: x\nTODO\n- 待完善\n正文含 TODO 字样但非独立成行\n',
  })
  const r = evaluateRules('brainstorm', ctx, io)
  const placeholderWarnings = r.warnings.filter(w => w.includes('独立成行占位词'))
  assert(placeholderWarnings.length === 1, `tasks.md 独立成行 TODO/待完善 → 恰 1 条该文件 warning（实际 ${placeholderWarnings.length}）`)
  assert(placeholderWarnings[0].includes('tasks.md'), 'warning 文案点名 tasks.md（${path} 替换）')
}
{
  // 正文内嵌 TODO（非独立成行）不误报；design.md 独立成行占位 → 报
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: CLEAN_DESIGN + '\n待设计\n',
    [`${CD}/proposal.md`]: CLEAN_PROPOSAL + '\n说明：此处 TODO 指历史遗留说明文字，非占位。\n',
    [`${CD}/requirements.md`]: CLEAN_REQUIREMENTS,
    [`${CD}/tasks.md`]: CLEAN_TASKS,
  })
  const r = evaluateRules('brainstorm', ctx, io)
  const ph = r.warnings.filter(w => w.includes('独立成行占位词'))
  assert(ph.length === 1 && ph[0].includes('design.md'), 'design 独立成行「待设计」→ warning；proposal 正文内嵌 TODO 不报')
}

console.log('\n=== ④ runValidators 真文件：完整合规变更 0 error 0 warning（反误报锚） ===')
const tmpRoots = []
function makeTmpChange(name) {
  const tmp = mkdtempSync(join(tmpdir(), 'bcg-'))
  tmpRoots.push(tmp)
  const changesDir = join(tmp, '.sillyspec', 'changes', name)
  mkdirSync(changesDir, { recursive: true })
  return { tmp, changeDir: changesDir }
}
{
  const { tmp, changeDir } = makeTmpChange('2026-09-29-clean-change')
  writeFileSync(join(changeDir, 'design.md'), CLEAN_DESIGN)
  writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
  writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS)
  writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
  const r = runValidators('brainstorm', tmp, '2026-09-29-clean-change', { specRoot: join(tmp, '.sillyspec') })
  assert(r.ok === true, '完整合规 → ok=true')
  assert(r.errors.length === 0, `完整合规 → 0 error（实际 ${JSON.stringify(r.errors)}）`)
  assert(r.warnings.length === 0, `完整合规 → 0 warning（实际 ${JSON.stringify(r.warnings)}）`)
}

console.log('\n=== ⑤ decision-coverage：requirements 的 D 覆盖点名（FR-02） ===')
{
  const DECISIONS = [
    '# 决策记录（Decisions）',
    '## D-001@v1: 术语裁定',
    '- type: term', '- priority: P1', '- status: accepted', '- source: user',
    '- question: 实体叫什么', '- answer: 叫 X', '- normalized_requirement: 统一用 X',
    '- impacts: [FR-01]', '- evidence: src/a.js:1',
    '## D-002@v1: 边界裁定',
    '- type: boundary', '- priority: P1', '- status: accepted', '- source: user',
    '- question: 失败怎么处理', '- answer: 降级', '- normalized_requirement: 失败返回降级数据',
    '- impacts: [FR-01]', '- evidence: src/a.js:2',
  ].join('\n')
  // 用例 a：requirements 只引 D-001 → 仅点名 D-002（design 决策追踪含 D-001/D-002 两行，
  // 隔离存量 design id-traceability——它对缺失行同样点名，属既有行为不在本测面）
  {
    const designBoth = CLEAN_DESIGN.replace(
      '| D-001@v1 | FR-01 §3 | 已覆盖 |',
      '| D-001@v1 | FR-01 §3 | 已覆盖 |\n| D-002@v1 | FR-01 §4 | 已覆盖 |',
    )
    const { tmp, changeDir } = makeTmpChange('2026-09-29-coverage-gap')
    writeFileSync(join(changeDir, 'design.md'), designBoth)
    writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
    writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS + '\n覆盖决策：D-001\n')
    writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
    writeFileSync(join(changeDir, 'decisions.md'), DECISIONS)
    const r = runValidators('brainstorm', tmp, '2026-09-29-coverage-gap', { specRoot: join(tmp, '.sillyspec') })
    const cov = r.warnings.filter(w => w.includes('未引用 decisions.md 中的'))
    assert(cov.length === 1 && cov[0].includes('D-002@V1'), `只引 D-001 → 仅点名 D-002（实际 ${JSON.stringify(cov)}）`)
    assert(!cov.some(w => w.includes('D-001')), 'D-001 已引用不点名')
    assert(cov[0].includes('决策覆盖矩阵') || cov[0].includes('剩余风险'), '文案含闭环出路（覆盖矩阵/剩余风险）')
  }
  // 用例 b：剩余风险行含裸号 D-002 → 显式登记算归属，不点名
  {
    const designBoth = CLEAN_DESIGN.replace(
      '| D-001@v1 | FR-01 §3 | 已覆盖 |',
      '| D-001@v1 | FR-01 §3 | 已覆盖 |\n| D-002@v1 | 剩余风险 | 已覆盖 |',
    )
    const { tmp, changeDir } = makeTmpChange('2026-09-29-coverage-risk')
    writeFileSync(join(changeDir, 'design.md'), designBoth)
    writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
    writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS + '\n覆盖决策：D-001\n剩余风险：D-002 边界裁定暂不承接，显式登记\n')
    writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
    writeFileSync(join(changeDir, 'decisions.md'), DECISIONS)
    const r = runValidators('brainstorm', tmp, '2026-09-29-coverage-risk', { specRoot: join(tmp, '.sillyspec') })
    assert(!r.warnings.some(w => w.includes('未引用 decisions.md 中的')), '剩余风险行含裸号 D-002 → 算归属不点名')
  }
}

console.log('\n=== ⑥ doubt-closure：自审存疑应用形态闭合判定（FR-03） ===')
{
  const { tmp, changeDir } = makeTmpChange('2026-09-29-doubt-open')
  writeFileSync(join(changeDir, 'design.md'), CLEAN_DESIGN + '\n⚠️ 自审存疑：缓存 TTL 取值未定\n')
  writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
  writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS)
  writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
  const r = runValidators('brainstorm', tmp, '2026-09-29-doubt-open', { specRoot: join(tmp, '.sillyspec') })
  const doubt = r.warnings.filter(w => w.includes('未闭合的自审存疑'))
  assert(doubt.length === 1, '自审存疑：无闭合 token → warning')
  assert(doubt[0].includes('缓存 TTL'), 'warning 含存疑行摘要（${line} 替换）')
  assert(doubt[0].includes('D-xxx') || doubt[0].includes('R-xx'), '文案含出路（转 D-xxx/R-xx）')
}
{
  const closedDesign = CLEAN_DESIGN + [
    '', '⚠️ 自审存疑：缓存 TTL 取值未定（已解决，见 D-001@v1）',
    '⚠️ 自审存疑：并发面另记 R-01', '不确定的问题标注「⚠️ 自审存疑」', // checklist 模板行（裸词无冒号应用形态）
  ].join('\n')
  const { tmp, changeDir } = makeTmpChange('2026-09-29-doubt-closed')
  writeFileSync(join(changeDir, 'design.md'), closedDesign)
  writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
  writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS)
  writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
  const r = runValidators('brainstorm', tmp, '2026-09-29-doubt-closed', { specRoot: join(tmp, '.sillyspec') })
  assert(!r.warnings.some(w => w.includes('未闭合的自审存疑')), '含闭合 token（D-xxx/R-xx）不报；checklist 裸词模板行不误报')
}

console.log('\n=== ⑦ risk-mitigation：风险应对策略列判定（FR-04） ===')
{
  const { tmp, changeDir } = makeTmpChange('2026-09-29-risk-open')
  const skeletonDesign = CLEAN_DESIGN.replace('| R-01 | 缓存击穿 | P1 | 空对象兜底＋短 TTL |', '| R-01 | （待填风险） | P1 | （待填应对策略） |')
    .replace('| R-02 | 文案措辞争议 | P2 | 接受：低风险不改 |', '| R-02 | 某风险 | P2 |  |')
  writeFileSync(join(changeDir, 'design.md'), skeletonDesign)
  writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
  writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS)
  writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
  const r = runValidators('brainstorm', tmp, '2026-09-29-risk-open', { specRoot: join(tmp, '.sillyspec') })
  const risk = r.warnings.filter(w => w.includes('应对策略列为空/占位'))
  assert(risk.length === 2, `design-init 骨架待填行＋空 cell 行 → 2 条 warning（实际 ${risk.length}）`)
  assert(risk.some(w => w.includes('R-01')) && risk.some(w => w.includes('R-02')), '逐行点名 R-01/R-02')
  assert(risk.every(w => w.includes('接受：')), '文案含「接受：」显式接受出路')
}
{
  // 已填应对＋显式接受 → 零报（CLEAN 基线已含，单独锚定语义）
  const { tmp, changeDir } = makeTmpChange('2026-09-29-risk-ok')
  writeFileSync(join(changeDir, 'design.md'), CLEAN_DESIGN)
  writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL)
  writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS)
  writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
  const r = runValidators('brainstorm', tmp, '2026-09-29-risk-ok', { specRoot: join(tmp, '.sillyspec') })
  assert(!r.warnings.some(w => w.includes('应对策略')), '已填应对与「接受：理由」均不报')
}

console.log('\n=== ⑧ 组合面：六类开口同时在场 → 六类 warning 一次全亮（收口可见性） ===')
{
  const { tmp, changeDir } = makeTmpChange('2026-09-29-all-open')
  writeFileSync(join(changeDir, 'design.md'), CLEAN_DESIGN
    .replace('| D-001@v1 | FR-01 §3 | 已覆盖 |', '| D-001@v1 | FR-01 §3 | 待确认 |')
    .replace('| R-01 | 缓存击穿 | P1 | 空对象兜底＋短 TTL |', '| R-01 | （待填风险） | P1 | （待填应对策略） |')
    + '\n⚠️ 自审存疑：X 未定\n待完善\n')
  writeFileSync(join(changeDir, 'proposal.md'), CLEAN_PROPOSAL.replace('## 成功标准（可验证）\n1. 测试全绿\n', ''))
  writeFileSync(join(changeDir, 'requirements.md'), CLEAN_REQUIREMENTS + '\n覆盖决策：D-001\n') // D-002 缺
  writeFileSync(join(changeDir, 'tasks.md'), CLEAN_TASKS)
  writeFileSync(join(changeDir, 'decisions.md'), [
    '# 决策记录（Decisions）',
    '## D-001@v1: 术语裁定', '- type: term', '- priority: P1', '- status: accepted', '- source: user',
    '- question: q', '- answer: a', '- normalized_requirement: n', '- impacts: [FR-01]', '- evidence: src/a.js:1',
    '## D-002@v1: 边界裁定', '- type: boundary', '- priority: P1', '- status: accepted', '- source: user',
    '- question: q', '- answer: a', '- normalized_requirement: n', '- impacts: [FR-01]', '- evidence: src/a.js:2',
  ].join('\n'))
  const r = runValidators('brainstorm', tmp, '2026-09-29-all-open', { specRoot: join(tmp, '.sillyspec') })
  assert(r.ok === true && r.errors.length === 0, '全开口在场仍 0 error（warning 级不阻断存量）')
  assert(r.warnings.some(w => w.includes('残留「待确认」')), '组合面：待确认残留在场')
  assert(r.warnings.some(w => w.includes('未闭合的自审存疑')), '组合面：自审存疑在场')
  assert(r.warnings.some(w => w.includes('独立成行占位词')), '组合面：占位词在场')
  assert(r.warnings.some(w => w.includes('成功标准')), '组合面：成功标准缺失在场')
  assert(r.warnings.some(w => w.includes('D-002@V1')), '组合面：D 覆盖缺口在场')
  assert(r.warnings.some(w => w.includes('应对策略列为空/占位')), '组合面：风险应对占位在场（R-01 破坏为待填骨架行）')
}

// 清理
for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* Windows 句柄容忍 */ } }

console.log(`\n=== 结果: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
