/**
 * brainstorm-auto 模板骨架化测试（坑 literal-template-trap，2026-08-24 用户反馈五期②：
 * 校验器字面匹配——文件变更清单标题/Non-Goals 字面短语/生命周期豁免紧邻——对不熟悉惯例的
 * agent 是连环坑；brainstorm-auto 的 design 规格此前只有一行散文，同一套校验器打过去全坑）。
 *
 * 锁定语义：
 *   1. brainstorm-auto step3 prompt 含 design.md 完整骨架：文件变更清单表头 / 生命周期契约表头
 *      + 紧邻豁免短语字面示例 / 风险登记表 / 自审章节字面
 *   2. brainstorm step6 prompt 的生命周期段含豁免短语字面示例 + 宽写法不被识别的警示
 *   3. 骨架字面与校验器正则自洽（表头/豁免短语喂给校验器必须命中——防模板与校验器漂移）
 */
import { definition as autoDef } from '../src/stages/brainstorm-auto.js'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'
import { getRule } from '../src/stage-contract-spec.js'

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const autoPrompt = autoDef.steps.map(s => s.prompt || '').join('\n')
const brainstormPrompt = brainstormDef.steps.map(s => s.prompt || '').join('\n')

console.log('--- 1. brainstorm-auto design 骨架 ---')
{
  assert(autoPrompt.includes('| 操作 | 文件路径 | 说明 |'), '文件变更清单表格骨架（校验器/parser 认的列头）')
  assert(autoPrompt.includes('| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |'), '生命周期契约表骨架')
  assert(autoPrompt.includes('「不涉及生命周期契约」') && autoPrompt.includes('「生命周期契约：无/N/A」'), '紧邻豁免短语字面示例')
  assert(autoPrompt.includes('宽写法不被识别') || autoPrompt.includes('宽写法**不被识别'), '宽写法警示')
  assert(autoPrompt.includes('| 编号 | 风险 | 等级 | 应对策略 |'), '风险登记表骨架')
  assert(autoPrompt.includes('## 自审'), '自审章节字面（自我审查等宽写法不识别）')
  assert(autoPrompt.includes('## 非目标'), '非目标章节字面')
}

console.log('--- 2. brainstorm 豁免短语示例 ---')
{
  assert(brainstormPrompt.includes('「不涉及生命周期契约」'), '豁免短语示例一')
  assert(brainstormPrompt.includes('「生命周期契约：无/N/A」'), '豁免短语示例二')
  assert(brainstormPrompt.includes('宽写法') && brainstormPrompt.includes('不被识别'), '宽写法警示')
}

console.log('--- 3. 骨架 × 校验器自洽（防漂移）---')
{
  const lcRule = getRule('brainstorm.design.lifecycle-table')
  const { trigger, exemptions, table } = lcRule.data
  // 表头骨架命中 table 正则之一
  const headerRow = '| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |'
  const tableHit = table.some(t => new RegExp(t.pattern, t.flags).test(headerRow))
  assert(tableHit, '生命周期表头骨架命中校验器 table 正则')
  // 豁免短语字面示例命中 exemption 正则之一
  const ex1 = '不涉及生命周期契约'
  const ex2 = '生命周期契约：无/N/A'
  const exHit1 = exemptions.some(e => new RegExp(e.pattern, e.flags).test(ex1))
  const exHit2 = exemptions.some(e => new RegExp(e.pattern, e.flags).test(ex2))
  assert(exHit1 && exHit2, '两个豁免短语示例均命中校验器 exemption 正则')
  // 触发词示例（daemon）命中 trigger
  assert(new RegExp(trigger.pattern, trigger.flags).test('daemon'), '触发词示例命中 trigger 正则')
  void autoPrompt
  void brainstormPrompt
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
