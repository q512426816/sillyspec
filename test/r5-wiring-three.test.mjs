/**
 * r5-wiring-three.test.mjs — R5 优化接线三件（ql-20260921-007）
 *
 * ① Wave 边界 handoff 默认动作（complete.js updateWaveSessionLedger 纯函数 + 注入文本钉）
 * ② task start 受影响测试族前移注入（index.js 注入文本钉——deps(auto) 同源 discoverModuleDependentTests）
 * ③ 评审铁律反例测试条（execute.js Task Review Gate 文本钉）
 *
 * 依据：rollout 解剖（W1 56min=62% 工具税·全量当首验多 2 轮；sess_418fc2bb 63min=75% 模型税·
 * 176 请求背 130K ≈1/4 墙钟）——本三件是「反馈环前移/会话结构」两个乘子的机械接线。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { updateWaveSessionLedger } from '../src/run/complete.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(root, p), 'utf8')

test('① updateWaveSessionLedger：同会话跨 Wave 计数与 advisory 阈值', () => {
  const r1 = updateWaveSessionLedger(null, 'sess-A', 'Wave 1 执行')
  assert.equal(r1.ledger.waveCount, 1, '首 Wave 计 1')
  assert.equal(r1.crossWaveAdvisory, false, '首 Wave 不出 advisory')
  const r2 = updateWaveSessionLedger(r1.ledger, 'sess-A', 'Wave 2 执行')
  assert.equal(r2.ledger.waveCount, 2, '同会话第二 Wave 计 2')
  assert.equal(r2.crossWaveAdvisory, true, '≥2 Wave 触发 advisory')
  const r3 = updateWaveSessionLedger(r2.ledger, 'sess-B', 'Wave 3 执行')
  assert.equal(r3.ledger.waveCount, 1, '换会话重置计数')
  assert.equal(r3.crossWaveAdvisory, false, '新会话首 Wave 不 advisory')
  assert.equal(updateWaveSessionLedger(null, null, 'Wave 1 执行').ledger.sessionId, 'anon', '缺省会话 ID 落 anon')
})

test('① Wave 边界注入文本钉：complete.js 含 handoff 默认动作块', () => {
  const s = read('src/run/complete.js')
  assert.ok(s.includes('Wave 边界——默认动作：下一 Wave 换瘦会话'), 'handoff 默认动作文案')
  assert.ok(s.includes('sillyspec handoff --change'), '照抄命令行')
  assert.ok(s.includes('wave-session-ledger-'), '账本文件名钉')
  assert.ok(s.includes('/Wave \\d+ 执行/'), 'Wave 步判定（当前步与下一步均 Wave）')
})

test('② task start 受影响测试族注入钉：index.js 含 deps(auto) 同源注入块', () => {
  const s = read('src/index.js')
  assert.ok(s.includes('受影响测试族（deps(auto) 同源'), '注入文案')
  assert.ok(s.includes('discoverModuleDependentTests'), '同源函数复用（无二源）')
  assert.ok(s.includes('写完先跑定向再全量'), '验证顺序前移话术')
})

test('③ 评审铁律反例测试条钉：execute.js Task Review Gate', () => {
  const s = read('src/stages/execute.js')
  assert.ok(s.includes('**反例测试核对**'), '铁律条在场')
  assert.ok(s.includes('守卫不该生效的场景确实不生效'), '反例语义（非泛泛「写测试」）')
})
