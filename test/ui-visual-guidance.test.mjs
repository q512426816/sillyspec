/**
 * UI 视觉引导与分级门单测（2026-09-27-ui-visual-guidance FR-05）。
 *
 * 覆盖：
 * 1. 检测启发式正反例（detectUiTouch / detectUiTouchInPaths）
 * 2. runUiVisualProbe 分级：非 UI 不适用 / warn（默认档缺证据）/ error（gate=error 缺证据）/
 *    off（整体关闭）/ ok（证据在场）/ 降级硬规则（无留痕恒 error，有留痕放行）
 * 3. readUiVisualGate：local.yaml 三档 + 缺席默认 warn + CRLF 容错
 * 4. buildUiGuidanceLines 仓中立与关键内容
 * 5. 段落渲染（骨架探针 12 段）：标题/不适用/❌/⚠️/✅ 形态
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  detectUiTouch, detectUiTouchInPaths, buildUiGuidanceLines, readUiVisualGate,
  runUiVisualProbe, renderUiVisualProbeLines, UI_VISUAL_PROBE_HEADING, UI_EVIDENCE_FILENAME,
} from '../src/ui-visual.js'

function makeChangeDir({ proposal, design, requirements, evidence, decisions } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ui-visual-'))
  mkdirSync(dir, { recursive: true })
  if (proposal) writeFileSync(join(dir, 'proposal.md'), proposal)
  if (design) writeFileSync(join(dir, 'design.md'), design)
  if (requirements) writeFileSync(join(dir, 'requirements.md'), requirements)
  if (evidence) writeFileSync(join(dir, UI_EVIDENCE_FILENAME), evidence)
  if (decisions) writeFileSync(join(dir, 'decisions.md'), decisions)
  return dir
}

/* ── 1. 检测启发式 ── */

test('detectUiTouch 正例：页面/前端/UI/视觉/组件/tsx', () => {
  assert.equal(detectUiTouch('重排工作区列表页面'), true)
  assert.equal(detectUiTouch('前端样式统一'), true)
  assert.equal(detectUiTouch('重构 UI 组件'), true)
  assert.equal(detectUiTouch('视觉走查为硬门'), true)
  assert.equal(detectUiTouch('修改 src/app/page.tsx'), true)
})

test('detectUiTouch 反例：后端/CLI/文档变更零命中', () => {
  assert.equal(detectUiTouch('优化后端 API 分页查询性能'), false)
  assert.equal(detectUiTouch('CLI 参数校验修复'), false)
  assert.equal(detectUiTouch('数据库迁移脚本'), false)
  assert.equal(detectUiTouch(''), false)
  assert.equal(detectUiTouch(null), false)
})

test('detectUiTouchInPaths：前端扩展名兜底（NEW: 前缀剥离）', () => {
  assert.equal(detectUiTouchInPaths(['NEW:frontend/src/app/page.tsx']), true)
  assert.equal(detectUiTouchInPaths(['src/components/Button.vue']), true)
  assert.equal(detectUiTouchInPaths(['src/lib/api.js', 'backend/app.py']), false)
  assert.equal(detectUiTouchInPaths(null), false)
})

/* ── 2. 探针分级 ── */

test('非 UI 触达：不适用零打扰', () => {
  const dir = makeChangeDir({ proposal: '后端分页优化' })
  try {
    const p = runUiVisualProbe({ changeDir: dir, gate: 'warn' })
    assert.equal(p.applicable, false)
    assert.equal(p.level, 'ok')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('UI 触达缺证据：默认 warn / gate=error 升阻断 / off 关闭', () => {
  const dir = makeChangeDir({ proposal: '工作区列表页面重排' })
  try {
    assert.equal(runUiVisualProbe({ changeDir: dir, gate: 'warn' }).level, 'warn')
    assert.equal(runUiVisualProbe({ changeDir: dir, gate: 'error' }).level, 'error')
    const off = runUiVisualProbe({ changeDir: dir, gate: 'off' })
    assert.equal(off.applicable, false)
    assert.equal(off.level, 'ok')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('证据在场：ok', () => {
  const dir = makeChangeDir({
    proposal: '工作区列表页面重排',
    evidence: '# 视觉证据\n- 工作区列表 vs 原型：一致\n![shot](shots/list.png)',
  })
  try {
    const p = runUiVisualProbe({ changeDir: dir, gate: 'error' })
    assert.equal(p.level, 'ok')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('降级硬规则：视觉降级声明无用户裁决留痕 → 无论档位恒 error', () => {
  const dir = makeChangeDir({
    proposal: '页面视觉对齐',
    design: 'FR-04 partial：变更详情页 MetaPanel 六组视觉收敛降级为保留既有五卡',
    requirements: '',
  })
  try {
    for (const gate of ['warn', 'error']) {
      assert.equal(runUiVisualProbe({ changeDir: dir, gate }).level, 'error')
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('降级硬规则：带用户裁决留痕 → 放行（样式统一级降级案例）', () => {
  const dir = makeChangeDir({
    proposal: '会话门户视觉重做',
    design: 'FR-07 样式统一级达成：消息块结构保留，视觉语言统一',
    evidence: '# 视觉证据\n## 用户裁决\n2026-09-27 用户确认：门户结构重排推迟专项，本期样式统一级可接受（对比截图已过目）。',
  })
  try {
    const p = runUiVisualProbe({ changeDir: dir, gate: 'warn' })
    assert.equal(p.level, 'ok')
    assert.equal(p.rulingPresent, true)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('降级声明行级共现口径：跨行不误配', () => {
  const dir = makeChangeDir({
    proposal: '前端页面调整',
    design: '本段先谈视觉目标。\n另一行谈服务降级策略（熔断兜底）。',
  })
  try {
    const p = runUiVisualProbe({ changeDir: dir, gate: 'error' })
    assert.notEqual(p.level, 'downgrade') // 无此态；仅确认不因跨行误报 error
    assert.equal(p.downgradeDeclared, false)
    assert.equal(p.level, 'error') // gate=error 且无证据仍是 error（缺证据面）
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

/* ── 3. local.yaml 档位读取 ── */

test('readUiVisualGate：三档 + 缺席默认 warn + CRLF 容错', () => {
  const base = mkdtempSync(join(tmpdir(), 'ui-visual-cfg-'))
  try {
    assert.equal(readUiVisualGate(base), 'warn') // 无 local.yaml
    writeFileSync(join(base, 'local.yaml'), 'commands:\n  lint: x\nui_visual_gate: error\n')
    assert.equal(readUiVisualGate(base), 'error')
    writeFileSync(join(base, 'local.yaml'), 'ui_visual_gate: "off"\r\n') // CRLF + 引号
    assert.equal(readUiVisualGate(base), 'off')
    writeFileSync(join(base, 'local.yaml'), 'ui_visual_gate: 非法值\n')
    assert.equal(readUiVisualGate(base), 'warn') // 非法回落默认
  } finally { rmSync(base, { recursive: true, force: true }) }
})

/* ── 4. 须知文案 ── */

test('buildUiGuidanceLines：仓中立 + 证据约定与探针同源', () => {
  const lines = buildUiGuidanceLines()
  const text = lines.join('\n')
  assert.ok(text.includes(UI_EVIDENCE_FILENAME))
  assert.ok(text.includes('用户裁决'))
  assert.ok(text.includes('边改边渲染对照'))
  assert.ok(!/C:\\|IdeaProjects|multi-agent-platform/.test(text), '不得硬编码特定仓路径')
})

/* ── 5. 段落渲染 ── */

test('renderUiVisualProbeLines：不适用 / warn / error / ok 四形态', () => {
  const na = renderUiVisualProbeLines({ applicable: false, notes: [] })
  assert.ok(na[0] === UI_VISUAL_PROBE_HEADING)
  assert.ok(na[1].includes('不适用'))

  const warn = renderUiVisualProbeLines({ applicable: true, level: 'warn', notes: ['缺证据'] })
  assert.ok(warn.some((l) => l.startsWith('- ⚠️')))

  const err = renderUiVisualProbeLines({ applicable: true, level: 'error', notes: ['降级无留痕'] })
  assert.ok(err.some((l) => l.startsWith('- ❌')))
  assert.ok(err.some((l) => l.includes('修复')))

  const ok = renderUiVisualProbeLines({ applicable: true, level: 'ok', evidencePresent: true, downgradeDeclared: false, notes: [] })
  assert.ok(ok.some((l) => l.startsWith('- ✅')))

  // 旧 result 无 probe12 键（undefined）→ 不适用兜底零回归
  assert.ok(renderUiVisualProbeLines(undefined)[1].includes('不适用'))
})
