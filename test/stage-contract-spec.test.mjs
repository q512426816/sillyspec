/**
 * stage-contract-spec / stage-contract-engine characterization 测试
 *
 * 验证 manifest 规则数据 + 引擎 dispatch 的正确性(黑盒:对各 kind 构造 pass/fail fixture,
 * 断言引擎输出)。本批为框架测试(无消费者,旧 validator 未动);各 stage validator 在 Batch 2/3
 * 迁移后,其报错文案与此 manifest 同源(由 stage-contract.test.mjs 的字面断言守护)。
 */
import { evaluateRules } from '../src/stage-contract-engine.js'
import { getRulesFor, getRule, renderStageContract, isCustomKind, getAllRules } from '../src/stage-contract-spec.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

const CD = '/fake/change'

// helper:用 files/dirs map 构造 mock io(不碰 fs,纯单元测试)
function makeCtx(files = {}, dirs = {}) {
  const ctx = { changeDir: CD }
  // Windows 上 path.join 产出反斜杠,而 files key 用正斜杠 —— 此处归一化匹配
  const norm = (p) => String(p).replace(/\\/g, '/')
  const io = {
    readFile: (p) => { const f = files[norm(p)]; return f != null ? { exists: true, content: f } : { exists: false, content: '' } },
    readDir: (p) => { const d = dirs[norm(p)]; return d ? { exists: true, files: d } : { exists: false, files: [] } },
  }
  return { ctx, io }
}

console.log('=== brainstorm 四件套存在性(file-exists)===')
{
  const { ctx, io } = makeCtx({})  // 全缺
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.ok === false, '全缺 → ok=false')
  assert(r.errors.length === 4, `缺四件套 → 4 个 error(实际 ${r.errors.length})`)
  assert(r.errors.every(e => e.includes('brainstorm 产物缺失')), 'error 文案含「brainstorm 产物缺失」')
  assert(r.errors.some(e => e.includes('design.md')), '${path} 占位替换为含 design.md 的绝对路径')
  // 文件全缺时,内容规则应 skip(不报缺章节)
  assert(r.warnings.length === 0, '文件全缺 → 内容规则 skip,0 warning(存在性由 file-exists 管)')
}

console.log('\n=== brainstorm 内容规则(literal-any / regex / list-non-empty)===')
{
  // design 缺「文件变更清单」但有其两章;requirements 缺 FR;tasks 空
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: '# Design\n## 风险登记\n## 自审\n',
    [`${CD}/proposal.md`]: '# P\n## 不在范围内\n',
    [`${CD}/requirements.md`]: '# R\n(无 FR 编号)\n',
    [`${CD}/tasks.md`]: '# Tasks\n(无列表项)\n',
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.errors.length === 0, '四件套齐全 → 0 error')
  assert(r.warnings.some(w => w.includes('文件变更清单')), 'design 缺文件变更清单 → warning')
  assert(!r.warnings.some(w => w.includes('风险登记')), 'design 有风险登记 → 无该 warning')
  assert(!r.warnings.some(w => w.includes('自审')), 'design 有自审 → 无该 warning')
  assert(!r.warnings.some(w => w.includes('Non-Goals')), 'proposal 有不在范围内 → 无该 warning')
  assert(r.warnings.some(w => w.includes('FR 编号')), 'requirements 缺 FR → warning')
  assert(r.warnings.some(w => w.includes('没有任务列表项')), 'tasks 无列表项 → warning')
}

console.log('\n=== FR-\\d+ 字面识别收紧(「FR 01」「FR_01」不识别)===')
{
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: '## 文件变更清单\n## 风险登记\n## 自审\n',
    [`${CD}/proposal.md`]: '不在范围内\n',
    [`${CD}/requirements.md`]: 'FR 01 与 FR_02 均不应被识别\n',
    [`${CD}/tasks.md`]: '- t\n',
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.warnings.some(w => w.includes('FR 编号')), '「FR 01」「FR_01」不命中 FR-\\d+ → warning')
}
{
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: '## 文件变更清单\n## 风险登记\n## 自审\n',
    [`${CD}/proposal.md`]: '不在范围内\n',
    [`${CD}/requirements.md`]: '### FR-01: 某需求\n',
    [`${CD}/tasks.md`]: '- t\n',
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(!r.warnings.some(w => w.includes('FR 编号')), 'FR-01 命中 → 无 FR warning')
}

console.log('\n=== 文件不存在时内容规则 skip(不报缺章节)===')
{
  const { ctx, io } = makeCtx({
    [`${CD}/proposal.md`]: '不在范围内\n',
    [`${CD}/requirements.md`]: 'FR-01\n',
    [`${CD}/tasks.md`]: '- t\n',
    // design.md 不存在
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.errors.some(e => e.includes('design.md') && e.includes('产物缺失')), 'design 缺失 → file-exists error')
  assert(!r.warnings.some(w => w.includes('文件变更清单')), 'design 不存在 → 内容规则 skip,不报缺章节')
}

console.log('\n=== 全齐 → 无 error 无 warning ===')
{
  const { ctx, io } = makeCtx({
    [`${CD}/design.md`]: '# Design\n## 文件变更清单\n## 风险登记\n## 自审\n',
    [`${CD}/proposal.md`]: '# P\n## 不在范围内\n',
    [`${CD}/requirements.md`]: '# R\nFR-01\n',
    [`${CD}/tasks.md`]: '- task-01: 实现\n',
  })
  const r = evaluateRules('brainstorm', ctx, io)
  assert(r.ok === true && r.errors.length === 0 && r.warnings.length === 0, '全齐 → ok=true, 0 error 0 warning')
}

console.log('\n=== custom kind 引擎 skip ===')
{
  assert(isCustomKind('lifecycle-exemption'), 'lifecycle-exemption 是 custom kind')
  assert(isCustomKind('decision-blocker'), 'decision-blocker 是 custom kind')
  assert(!isCustomKind('file-exists'), 'file-exists 不是 custom kind')
  assert(!isCustomKind('literal-any'), 'literal-any 不是 custom kind')
}

console.log('\n=== 查询 API ===')
{
  const bs = getRulesFor('brainstorm')
  assert(bs.length === 11, `brainstorm 11 条规则(10 纯 + lifecycle custom,实际 ${bs.length})`)
  assert(bs.some(r => r.id === 'brainstorm.design.lifecycle-table' && r.kind === 'lifecycle-exemption'), '含 lifecycle custom 规则')
  const r = getRule('brainstorm.design.file-change-list')
  assert(r !== null && r.kind === 'literal-any' && r.severity === 'warning', 'getRule 取到 literal-any/warning')
  assert(r.data.literals.includes('文件变更清单'), 'getRule data.literals 含文件变更清单')
  assert(getRule('nonexistent.id') === null, 'getRule 未知 id → null')
  // getRulesFor 按 source 过滤
  const bySource = getRulesFor('brainstorm', { source: 'validateBrainstormOutputs' })
  assert(bySource.length === 11, 'getRulesFor source 过滤:brainstorm 全部来自 validateBrainstormOutputs')
  assert(getRulesFor('nonexistent').length === 0, '未知 stage → 空数组')
}

console.log('\n=== renderStageContract(prompt 事前契约)===')
{
  const rendered = renderStageContract('brainstorm')
  assert(rendered.includes('完成契约'), 'render 含「完成契约」标题')
  assert(rendered.includes('必须满足'), 'render 含 error 分组「必须满足」')
  assert(rendered.includes('建议满足'), 'render 含 warning 分组「建议满足」')
  assert(rendered.includes('[brainstorm.design.exists]'), 'render 含规则 id [brainstorm.design.exists]')
  assert(rendered.includes('[brainstorm.design.file-change-list]'), 'render 含规则 id [brainstorm.design.file-change-list]')
  assert(rendered.includes('文件变更清单'), 'render 含 spec 内容(文件变更清单)')
  assert(rendered.includes('FR-<数字>'), 'render 含 FR spec(FR-<数字>)')
  assert(rendered.includes('事前给的 == 事后查的'), 'render 含同源声明')
  assert(!rendered.includes('产物缺失'), 'render 不含 failMessage 全文(省 token)')
  assert(renderStageContract('nonexistent') === '', '未知 stage → 空串')
}

console.log('\n=== verify 事前契约含集成证据门控提示(D10)===')
{
  // 历史:agent 闷头写完 verify-result.md 才被门控阻断缺「真实启动」证据,撞墙不知缺哪一项。
  // D10 把门控触发条件 + 字面期望前置进 verify step0(renderStageContract),事前给 == 事后查。
  const rendered = renderStageContract('verify')
  assert(rendered.includes('[verify.integration-evidence]'), 'verify render 含集成证据规则 id')
  assert(rendered.includes('部署级') && rendered.includes('启动…一次'), 'verify render 含部署级 real_startup 字面期望')
  assert(rendered.includes('集成级') && rendered.includes('端到端'), 'verify render 含集成级字面期望')
  assert(rendered.includes('出路'), 'verify render 含出路提示')
}

console.log('\n=== 全部规则 id 唯一(防 manifest 笔误重复)===')
{
  const all = getAllRules()
  const ids = all.map(r => r.id)
  const dup = ids.find((id, i) => ids.indexOf(id) !== i)
  assert(!dup, `规则 id 全局唯一${dup ? `(重复: ${dup})` : ''}`)
  // 每条规则必填字段齐全
  const incomplete = all.find(r => !r.id || !r.stage || !r.source || !r.severity || !r.kind || !r.target || !r.spec || r.failMessage == null)
  assert(!incomplete, `每条规则必填字段齐全${incomplete ? `(缺失: ${incomplete.id})` : ''}`)
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
