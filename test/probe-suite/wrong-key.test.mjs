/**
 * 错键探针套件（task-04，2026-09-21-r5-efficiency-batch1 / FR-04 / D-002@v1）：
 * R5 验收「防线回归」硬门的机械判法——三类 R4 真实错键形态 fixtures 喂 verify-probes
 * 既有键原语，断言错键判不匹配/不覆盖（防线敏感性机械可证，不依赖对撞仓），正确对照
 * 组判匹配（敏感性有方向，非全红假绿）。纯函数喂字符串零 IO，任何环境可跑。
 *
 * 判法锚定 comparePayloadFields（src/verify-probes.js:866）的真实谓词：
 *   - 漂移：前端字段 ∉ 契约字段集 → 检出（Jackson 静默丢弃风险面）；
 *   - 覆盖：契约键 ∈ 提取面 → 匹配；
 *   - 端点关联：urls.some(u => isSegmentSuffix(u, path))。
 * 红线：本套件只测既有原语行为，不改 src/verify-probes.js（防线行为变更另走流程）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractPayloadKeys, extractFrontendPayloadFields, isSegmentSuffix,
} from '../../src/verify-probes.js'
import {
  PLURAL_MISMATCH, PAYLOAD_KEY_DRIFT, PATH_SEGMENT_SUFFIX_MISMATCH, WRONG_KEY_SHAPES,
} from './wrong-key.fixtures.mjs'

test('fixtures 装载：三类错键形态各配对照组，结构完整', () => {
  assert.equal(WRONG_KEY_SHAPES.length, 3, '三类形态齐备')
  for (const s of WRONG_KEY_SHAPES) {
    assert.ok(s.id && s.story && s.primitive, `形态字段齐全（实际 ${JSON.stringify(s)}）`)
    assert.ok(s.wrong && s.correct, `${s.id} 错键/对照成对`)
  }
})

test('形态①键名单复数错配（extractPayloadKeys）：送 data.tokens 契约 token——错键不覆盖被检出', () => {
  const wrongKeys = extractPayloadKeys(PLURAL_MISMATCH.wrong.source)
  assert.ok(wrongKeys.has('tokens'), `错键 tokens 确实进提取面——失配非空转（实际 ${[...wrongKeys]}）`)
  for (const k of PLURAL_MISMATCH.wrong.contractKeys) {
    assert.ok(!wrongKeys.has(k), `契约键 ${k} 不被复数错键覆盖——错键形态判不匹配`)
  }
  const correctKeys = extractPayloadKeys(PLURAL_MISMATCH.correct.source)
  for (const k of PLURAL_MISMATCH.correct.contractKeys) {
    assert.ok(correctKeys.has(k), `对照组契约键 ${k} 判匹配（敏感性有方向）`)
  }
})

test('形态②前后端 payload 键漂移（extractFrontendPayloadFields）：请求 { userId } 契约 user_id——漂移可判 + 约定配对不误报', () => {
  const contract = (keys) => new Set(keys)
  // 错键侧：前端字段 userId ∉ 契约集 {user_id} → 漂移检出（comparePayloadFields 同谓词）
  const w = extractFrontendPayloadFields(PAYLOAD_KEY_DRIFT.filePath, PAYLOAD_KEY_DRIFT.wrong.source)
  assert.ok(w.fields.includes('userId'), `请求 DTO 起始键 userId 进提取面（实际 ${w.fields}）`)
  const wDrift = w.fields.filter(f => !contract(PAYLOAD_KEY_DRIFT.wrong.contractKeys).has(f))
  assert.ok(wDrift.includes('userId'), `前端字段 ∉ 契约集 → 漂移检出（实际漂移 ${JSON.stringify(wDrift)}）`)
  for (const k of PAYLOAD_KEY_DRIFT.wrong.contractKeys) {
    assert.ok(!w.fields.includes(k), `契约键 ${k} 不被提取面覆盖——归一仅 camel 向，snake 原键不被吸收`)
  }
  assert.ok(w.urlsByCall.length === 1 && w.urlsByCall[0].normalizedUrl === 'sessions/create',
    `URL 关联素材在场，漏发关联面可判（实际 ${JSON.stringify(w.urlsByCall)}）`)

  // 对照组：同一前端源、契约拼写一致 → 无漂移
  const c = extractFrontendPayloadFields(PAYLOAD_KEY_DRIFT.filePath, PAYLOAD_KEY_DRIFT.correct.source)
  assert.equal(c.fields.filter(f => !contract(PAYLOAD_KEY_DRIFT.correct.contractKeys).has(f)).length, 0,
    '对照组契约键拼写一致 → 判匹配无漂移')

  // 桥形对照：前端 snake 构造经 snake→camel 归一命中驼峰契约——约定配对不误报
  const b = extractFrontendPayloadFields(PAYLOAD_KEY_DRIFT.filePath, PAYLOAD_KEY_DRIFT.bridge.source)
  assert.ok(b.fields.includes('userId'), `payload.user_id 归一 camel（实际 ${b.fields}）`)
  assert.equal(b.fields.filter(f => !contract(PAYLOAD_KEY_DRIFT.bridge.contractKeys).has(f)).length, 0,
    'snake→camel 约定配对判匹配（归一化设计意图，非漂移）')
})

test('形态③路径段后缀错配（isSegmentSuffix）：/sessions/:id/turn ≠ /sessions/:id/turns——段边界不命中 + 真实接线同判', () => {
  const f = PATH_SEGMENT_SUFFIX_MISMATCH
  assert.equal(isSegmentSuffix(f.wrong.frontendUrl, f.wrong.backendPath), false,
    `错键 URL 非端点段边界后缀——判不匹配（${f.wrong.frontendUrl} × ${f.wrong.backendPath}）`)
  assert.equal(isSegmentSuffix(f.correct.frontendUrl, f.correct.backendPath), true,
    '对照组 URL 判匹配（敏感性有方向）')

  // 真实接线形态：请求调用首参 URL 经 urlsByCall 归一后进 isSegmentSuffix（端点关联同消费）
  const wUrl = extractFrontendPayloadFields(f.wrong.wiringFilePath, f.wrong.wiringSource).urlsByCall[0]
  assert.ok(wUrl && wUrl.normalizedUrl === 'sessions/42/turn', `接线 URL 归一（实际 ${JSON.stringify(wUrl)}）`)
  assert.equal(isSegmentSuffix(wUrl.normalizedUrl, f.wrong.wiringBackendPath), false,
    '接线形态错键 URL 同样判不匹配（缺尾 s 不被段边界吸收）')
  const cUrl = extractFrontendPayloadFields(f.correct.wiringFilePath, f.correct.wiringSource).urlsByCall[0]
  assert.ok(cUrl && cUrl.normalizedUrl === 'sessions/42/turns', `对照接线 URL 归一（实际 ${JSON.stringify(cUrl)}）`)
  assert.equal(isSegmentSuffix(cUrl.normalizedUrl, f.correct.wiringBackendPath), true,
    '接线形态对照组判匹配')
})
