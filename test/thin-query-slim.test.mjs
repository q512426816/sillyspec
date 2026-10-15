/**
 * 轻量道知识注入查询瘦身（2026-10-15-thin-query-slim）
 *
 * --input 的「成功标准：」段是验收判据语料（文件路径/测试名/断言词），对知识匹配是纯噪音
 * 且路径词会过触路由关键词撑爆命中面（本仓实证整段 input 匹配出 76 条目、58 个 fr 域文件
 * 全命中）。thinKnowledgeQuery 只取动机段，四态锁定：
 *   ① 有「成功标准：」标记 → 只留标记前动机
 *   ② 中文冒号「成功标准：」同判
 *   ③ 无标记 → 全文照旧（兼容旧形态）
 *   ④ 动机段空白（标记开头）→ 退全 input
 */
import { thinKnowledgeQuery } from '../src/flow.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const CHANGE = '2026-10-15-demo'

// ① 半角冒号标记
{
  const q = thinKnowledgeQuery(CHANGE, '修注入遥测盲区\n\n成功标准：\n- src/flow.js 落盘事件\n- test/foo.test.mjs 全绿')
  assertTrue(q === `${CHANGE}\n修注入遥测盲区`, '① 半角冒号：只留动机段（成功标准及其后全部剔除）')
  assertTrue(!q.includes('test/foo.test.mjs'), '① 测试路径噪音不进查询')
}

// ② 中文冒号标记
{
  const q = thinKnowledgeQuery(CHANGE, '对账假红清偿\n\n成功标准：\n- 零残留')
  assertTrue(q === `${CHANGE}\n对账假红清偿`, '② 中文冒号同判')
}

// ③ 无标记 → 全文
{
  const raw = '自由形态动机，没有标准段'
  const q = thinKnowledgeQuery(CHANGE, raw)
  assertTrue(q === `${CHANGE}\n${raw}`, '③ 无标记全文照旧')
}

// ④ 标记开头（动机空白）→ 退全 input
{
  const raw = '成功标准：\n- 只有标准'
  const q = thinKnowledgeQuery(CHANGE, raw)
  assertTrue(q === `${CHANGE}\n${raw.trim()}`, '④ 动机空白退全 input（不为空查询）')
}

console.log(failed === 0 ? `\n全部通过（4 组）` : `\n${failed} 项失败：\n${failures.map((f) => `  - ${f}`).join('\n')}`)
process.exit(failed === 0 ? 0 : 1)
