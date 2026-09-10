/**
 * 三 stage 审查清单单源一致性测试（2026-09-10-review-dispatch task-01 / FR-05）
 *
 * 锁两件事：
 * 1. src/stage-review-checklist.js 的 REVIEW_CHECKLISTS 与 2026-09-10 迁移前
 *    stages/{brainstorm,plan,execute}.js prompt 内嵌清单逐字一致——内嵌迁移前
 *    快照逐条比对，钉死「迁移=逐字」（文字/标点/全半角/markdown 记号零改动），防未来漂移；
 * 2. 三 stage prompt 渲染产物包含该 stage 全部条目字面（前缀/缩进形态还原）——
 *    review-dispatch worker_prompt 与 stage prompt 同源的前置保证（事前给的 == 事后查的）。
 *
 * 期望块由「迁移前快照 + 迁移前前缀形态」构造，不引用常量渲染（防自证）。
 */
import { REVIEW_CHECKLISTS } from '../src/stage-review-checklist.js'
import { definition as brainstormDefinition } from '../src/stages/brainstorm.js'
import { buildPlanSteps } from '../src/stages/plan.js'
import { buildExecuteSteps } from '../src/stages/execute.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}
function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual, null, 2)
  const e = JSON.stringify(expected, null, 2)
  if (a === e) { console.log(`✅ ${msg}`); passed++ }
  else {
    console.error(`❌ ${msg}\n--- expected ---\n${e}\n--- actual ---\n${a}`)
    failed++
  }
}

// ═══ 内嵌迁移前快照：2026-09-10 自 stages 三件 prompt 原文字节级摘录（单源化当日基线）═══
// brainstorm =「交叉审查模型」三层检查（渲染为「N. 」序号行）+「交叉点抽取」（渲染为「- 」列表行）
const SNAPSHOT_BRAINSTORM_LAYERS = [
  '**定义层**：模糊概念是否有可测试定义。例如"高可用""异常数据""本地缓存""重试"。',
  '**一致性层**：跨章节/跨产物是否打架。例如数据流 vs 容错策略、schema vs 输入格式、非目标 vs tasks。',
  '**可行性层**：关键假设是否有来源。例如 P99 延迟、上游 SLA、缓存 TTL、数据量、权限模型、兼容旧配置。',
]
const SNAPSHOT_BRAINSTORM_CROSS_POINTS = [
  '模块 A 依赖模块 B 的实体/状态/接口',
  'requirements.md 的 FR 与 design.md 的数据模型/API/状态机',
  'design.md 的容错策略与数据流、缓存、重试、回滚',
  'tasks.md 的执行范围与 design.md 的非目标',
  'decisions.md 的 D-xxx@vN 与 design.md 当前说法',
  'scan/module docs 或源码中的真实约束与 design.md 假设',
]
// plan =「审查清单（读取 plan.md 的 plan_level，逐条核对）」下方条目（渲染为「- [ ] 」checkbox 行）
const SNAPSHOT_PLAN = [
  'task 编号与 Wave checkbox 格式正确，execute 依赖此格式解析任务',
  'plan_level 档位与实际复杂度匹配（none/light/full 没选错）',
  '跨任务契约：task-A 的产出（接口/DTO/响应）被 task-B 消费时，consumer 是否在 TaskCard expects_from 声明所需字段、provider 是否在 provides 承诺、两边字段一致？（plan-postcheck 会硬校验，此处是独立视角复查）',
  '文件覆盖：design.md 文件变更清单中的每个源码文件，是否都被至少一个 task 的 allowed_paths 覆盖？（漏覆盖 = execute 必然漏改。跨仓变更对账口径：design 清单按「## <repo-key> 仓变更」分段、路径相对各仓根，task 卡 repo: + 同口径相对路径匹配——allowed_paths 带仓库名前缀或绝对路径 = 永不命中、对账不上）',
  '不存在 P0/P1 unresolved blocker 残留',
  '没有实现细节泄漏到 plan.md（接口签名/代码示例应在 tasks/task-NN.md）',
  '关键路径与 Wave 依赖合理（无循环依赖、无遗漏前置）',
  'Wave 分组说明：依赖方向违规（depends_on 同 Wave / 后置 Wave）在 --done 时会按拓扑**自动修复**（提案经一致性+文件面验证后落盘）；共享文件的手工分 Wave 串行是合法安全模式，不会被自动改写',
  '连带测试归属：本批改动是否会导致既有测试断言失效（改共享/被多 task 依赖源文件、改被测试精确匹配的值如 UI 文案/按钮文本/错误信息/常量/枚举字面量、改函数签名或返回结构等单文件场景）？此类 task 是否在 related_tests 声明了失效测试、且路径在 allowed_paths 内（或由独立测试 task 覆盖）？（漏声明 = execute 阶段测试债、主代理事后兜底）',
  'acceptance 字段对照实际 schema/类型源文件核验存在性与形态，不凭 design.md 文字臆断（plan-postcheck best-effort grep 会给 allowed_paths 源文件未命中的 snake_case/camelCase 标识符提 warning，此处是语义层复查；臆断 = execute 阶段返工）',
]
// execute = QA 段「以下三项始终必查」（渲染为 2 空格缩进「N. 」序号行）
const SNAPSHOT_EXECUTE = [
  '跨 task 交界（A 产出的接口/数据结构与 B 的消费是否对得上）',
  'design.md 整体对照（最终实现拼起来是否仍符合设计意图，而非仅各 task 局部合规）',
  '组装行为（全量测试/构建/启动通过——单 task 测试全绿 ≠ 组装正确）',
]

console.log('=== 常量形态（task-03 消费契约：三键非空 string[]）===')
{
  assert(REVIEW_CHECKLISTS != null && typeof REVIEW_CHECKLISTS === 'object', 'REVIEW_CHECKLISTS 是对象')
  const keys = Object.keys(REVIEW_CHECKLISTS).sort().join(',')
  assert(keys === 'brainstorm,execute,plan', `三键齐全且无多余键（实际: ${keys}）`)
  for (const stage of ['brainstorm', 'plan', 'execute']) {
    const items = REVIEW_CHECKLISTS[stage]
    assert(Array.isArray(items) && items.length > 0, `${stage}: 非空 string[]（条目数 ${Array.isArray(items) ? items.length : 'N/A'}）`)
    assert(items.every(it => typeof it === 'string' && it.trim().length > 0), `${stage}: 每条为非空字符串`)
    assert(items.every(it => !it.includes('\n') && !it.includes('\r')), `${stage}: 条目为单行（无换行/CR，Windows 兼容）`)
    assert(items.every(it => !it.startsWith('- [ ] ') && !it.startsWith('- ') && !/^\s/.test(it)), `${stage}: 条目不含结构性前缀/缩进（渲染层负责前缀，防双前缀）`)
  }
}

console.log('\n=== 内嵌迁移前快照逐条比对（钉死「迁移=逐字」，防漂移）===')
{
  assertDeepEqual(
    REVIEW_CHECKLISTS.brainstorm,
    [...SNAPSHOT_BRAINSTORM_LAYERS, ...SNAPSHOT_BRAINSTORM_CROSS_POINTS],
    'brainstorm: 常量 == 迁移前三层检查(3) + 交叉点(6) 快照（逐字）'
  )
  assertDeepEqual(REVIEW_CHECKLISTS.plan, SNAPSHOT_PLAN, 'plan: 常量 == 迁移前审查清单(10 条) 快照（逐字）')
  assertDeepEqual(REVIEW_CHECKLISTS.execute, SNAPSHOT_EXECUTE, 'execute: 常量 == 迁移前三项必查(3 条) 快照（逐字）')
}

console.log('\n=== 三 stage prompt 渲染产物含全部条目字面（期望块由快照构造，防自证）===')
{
  const grill = brainstormDefinition.steps.find(s => s.name === 'Design Grill 交叉审查')
  const planReview = buildPlanSteps(null).find(s => s.name === '审查计划')
  const acceptance = buildExecuteSteps(null).find(s => s.name === '对照设计检查')
  assert(!!grill && typeof grill.prompt === 'string', 'brainstorm: 定位「Design Grill 交叉审查」step')
  assert(!!planReview && typeof planReview.prompt === 'string', 'plan: 定位「审查计划」step')
  assert(!!acceptance && typeof acceptance.prompt === 'string', 'execute: 定位「对照设计检查」step')

  const layerBlock = SNAPSHOT_BRAINSTORM_LAYERS.map((it, i) => `${i + 1}. ${it}`).join('\n')
  const crossBlock = SNAPSHOT_BRAINSTORM_CROSS_POINTS.map(it => `- ${it}`).join('\n')
  assert(grill.prompt.includes('### 交叉审查模型\n按三层检查并输出 cross-check matrix：\n' + layerBlock), 'brainstorm prompt: 三层检查紧跟章节头（序号行形态，逐字）')
  assert(grill.prompt.includes('### 交叉点抽取\n重点找这些交叉点：\n' + crossBlock), 'brainstorm prompt: 交叉点紧跟章节头（列表行形态，逐字）')

  const planBlock = SNAPSHOT_PLAN.map(it => '- [ ] ' + it).join('\n')
  assert(planReview.prompt.includes('### 审查清单（读取 plan.md 的 plan_level，逐条核对）\n' + planBlock), 'plan prompt: 审查清单 10 条紧跟章节头（checkbox 形态，逐字）')
  assert(planReview.prompt.split(planBlock).length - 1 === 1, 'plan prompt: 清单块恰好出现一次（无双重渲染）')

  const execBlock = SNAPSHOT_EXECUTE.map((it, i) => `  ${i + 1}. ${it}`).join('\n')
  assert(acceptance.prompt.includes('以下三项始终必查'), 'execute prompt: 含「以下三项始终必查」引入语')
  assert(acceptance.prompt.includes(execBlock), 'execute prompt: 三项必查齐全（2 空格缩进序号行形态，逐字）')
  assert(acceptance.prompt.split(execBlock).length - 1 === 1, 'execute prompt: 三项块恰好出现一次（无双重渲染）')

  // 常量侧逐条字面断言：REVIEW_CHECKLISTS 每条都在对应 stage prompt 里
  for (const it of REVIEW_CHECKLISTS.brainstorm) {
    assert(grill.prompt.includes(it), `brainstorm prompt 含条目字面: ${it.slice(0, 16)}...`)
  }
  for (const it of REVIEW_CHECKLISTS.plan) {
    assert(planReview.prompt.includes(it), `plan prompt 含条目字面: ${it.slice(0, 16)}...`)
  }
  for (const it of REVIEW_CHECKLISTS.execute) {
    assert(acceptance.prompt.includes(it), `execute prompt 含条目字面: ${it.slice(0, 16)}...`)
  }
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
