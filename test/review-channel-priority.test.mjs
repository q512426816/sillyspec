// 独立审查通道优先序 P1（2026-09-10 用户裁决：通道顺序是主观权衡归用户配置）：
//   ① readReviewChannelPriority：缺省现状序 / 自定义序 / 未知过滤 / self 恒垫底 / 空与坏配置回缺省
//   ② classifyReviewerChannel：reviewer.channel 结构化落款优先 > reviewerNotes 首行「降级：」
//      向后兼容 > unspecified（存量无标记 review，gate 不特殊处理）
//   ③ renderReviewJsonContract：tier=independent 头部渲染「审查执行通道」段（按配置序；
//      platform 通道指向 review-dispatch 命令）+ reviewer 字段契约与示例；
//      tier=self 无通道段（自审无需独立通道）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readReviewChannelPriority,
  classifyReviewerChannel,
  renderReviewJsonContract,
  DEFAULT_REVIEW_CHANNEL_PRIORITY,
} from '../src/stage-review.js'

function fxWithYaml(yaml) {
  const d = mkdtempSync(join(tmpdir(), 'rcp-'))
  mkdirSync(join(d, '.sillyspec'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'local.yaml'), yaml)
  return d
}

test('① readReviewChannelPriority：配置语义规则', () => {
  // 无 local.yaml → 缺省序（现状行为，未配置用户零变化）
  const empty = mkdtempSync(join(tmpdir(), 'rcp-none-'))
  try {
    assert.deepEqual(readReviewChannelPriority(empty), DEFAULT_REVIEW_CHANNEL_PRIORITY, '无配置 → 缺省现状序')
  } finally { rmSync(empty, { recursive: true, force: true }) }

  // 自定义序生效
  const d1 = fxWithYaml('review_dispatch:\n  channel_priority: [platform, agent-tool, self]\n')
  try {
    assert.deepEqual(readReviewChannelPriority(d1), ['platform', 'agent-tool', 'self'], '自定义序原样生效')
  } finally { rmSync(d1, { recursive: true, force: true }) }

  // 未知通道过滤 + self 恒垫底（不写 self 也会补）
  const d2 = fxWithYaml('review_dispatch:\n  channel_priority: [host-mcp, magic-channel]\n')
  try {
    assert.deepEqual(readReviewChannelPriority(d2), ['host-mcp', 'self'], '未知值忽略，self 隐式垫底（防无路可走）')
  } finally { rmSync(d2, { recursive: true, force: true }) }

  // 只配 self / 空数组 → 回缺省序
  const d3 = fxWithYaml('review_dispatch:\n  channel_priority: [self]\n')
  try {
    assert.deepEqual(readReviewChannelPriority(d3), DEFAULT_REVIEW_CHANNEL_PRIORITY, '只配 self（无有效可用通道）→ 回缺省序')
  } finally { rmSync(d3, { recursive: true, force: true }) }

  // 坏 YAML / 段类型错 → 回缺省序（best-effort 不抛）
  const d4 = fxWithYaml('review_dispatch: [not, an, object]\n')
  const d5 = fxWithYaml(':\n  broken: [\n')
  try {
    assert.deepEqual(readReviewChannelPriority(d4), DEFAULT_REVIEW_CHANNEL_PRIORITY, '段类型错 → 缺省')
    assert.deepEqual(readReviewChannelPriority(d5), DEFAULT_REVIEW_CHANNEL_PRIORITY, '坏 YAML → 缺省不抛')
  } finally { rmSync(d4, { recursive: true, force: true }); rmSync(d5, { recursive: true, force: true }) }
})

test('② classifyReviewerChannel：结构化落款 > 首行约定 > unspecified', () => {
  assert.equal(classifyReviewerChannel({ reviewer: { channel: 'platform', missionId: 'm-1' } }), 'platform', '结构化 channel 优先')
  assert.equal(classifyReviewerChannel({ reviewer: { channel: 'agent-tool' } }), 'agent-tool', 'agent-tool 落款')
  assert.equal(classifyReviewerChannel({ reviewer: { channel: 'self' } }), 'self', 'self 结构化落款 → self（gate ⚠️）')
  // 向后兼容：无 reviewer 字段但首行「降级：」约定（负面①降级条款的落款形态）
  assert.equal(classifyReviewerChannel({ reviewerNotes: '降级：环境无子代理可用\n锚点…' }), 'self', '首行降级约定兼容 → self')
  // 结构化非法值回退首行约定，不误吞
  assert.equal(classifyReviewerChannel({ reviewer: { channel: 'magic' }, reviewerNotes: '降级：x' }), 'self', '非法 channel 回退首行判定')
  // 存量 review：无标记 → unspecified（gate 不特殊处理，历史默认子代理口径）
  assert.equal(classifyReviewerChannel({ reviewerNotes: '正常审查结论' }), 'unspecified', '无标记 → unspecified')
  assert.equal(classifyReviewerChannel({ reviewer: { channel: null, missionId: null, model: null }, reviewerNotes: '骨架由 register-stage-review 生成…' }), 'unspecified', '骨架形态（channel=null）→ unspecified')
  assert.equal(classifyReviewerChannel(null), 'unspecified', 'review=null 不抛')
})

test('③ renderReviewJsonContract：通道段按配置序 + platform 命令指引 + reviewer 契约', () => {
  const md = renderReviewJsonContract({
    stage: 'plan', changeDir: '/tmp/x/.sillyspec/changes/demo', reviewRunId: 'review-20990101-0000',
    tier: 'independent', channelPriority: ['platform', 'agent-tool', 'self'],
  })
  assert.ok(md.includes('## 审查执行通道'), 'independent 契约含通道段')
  const platformIdx = md.indexOf('1. **platform**')
  const agentToolIdx = md.indexOf('2. **agent-tool**')
  const selfIdx = md.indexOf('3. **self**')
  assert.ok(platformIdx > 0 && agentToolIdx > platformIdx && selfIdx > agentToolIdx, '通道按传入优先序编号排列')
  assert.ok(md.includes('sillyspec review-dispatch --change'), 'platform 通道指向已落地命令（2026-09-10-review-dispatch P2）')
  assert.ok(!md.includes('未落地'), '旧「未落地暂跳过」标注已随命令落地移除')
  assert.ok(md.includes('`reviewer`(可选,审计字段)'), '契约列 reviewer 字段说明')
  assert.ok(md.includes('"reviewer": { "channel": "<agent-tool|platform|host-mcp|self>"'), 'JSON 示例含 reviewer 行')
  assert.ok(md.includes('review_dispatch.channel_priority'), '指引点出配置键（用户可查可改）')

  const selfMd = renderReviewJsonContract({ stage: 'plan', tier: 'self' })
  assert.ok(!selfMd.includes('审查执行通道'), 'tier=self 无通道段（自审无需独立通道）')
})
