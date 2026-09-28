/**
 * 引导输出生态中立断言（2026-09-28-guidance-principles FR-04）。
 *
 * 检查点是「agent 最终看到的话」而非源码文本（源码内部为探测、示教、注释引用生态词合法）：
 * 跑全部引导构建函数，断言输出不含生态命令词。动态测试推断将其与引导文件绑定——
 * 过程（agent 写完即跑）与收口（flow done 实测）双时机触发。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildUiGuidanceLines, renderUiVisualProbeLines } from '../src/ui-visual.js'
import { renderHunkAttributionLines } from '../src/hunk-attribution.js'

const ECOSYSTEM_RE = /(pnpm|yarn|npx|npm\s+run|gradle|mvn|maven|pip\s+install|cargo\s+(build|run)|go\s+run|dotnet\s+build)\b/i

test('UI 执行须知：零生态命令词 + 四条原则在位', () => {
  const text = buildUiGuidanceLines().join('\n')
  assert.equal(ECOSYSTEM_RE.test(text), false, `须知输出含生态命令词：${text.match(ECOSYSTEM_RE)?.[0]}`)
  for (const key of ['真码产物', '就近发现', '仅限一次性粗选', '用户裁决', '边改边渲染对照']) {
    assert.ok(text.includes(key), `须知缺原则关键词：${key}`)
  }
})

test('探针 12 渲染输出：四形态全态零生态命令词', () => {
  const samples = [
    { applicable: false, notes: [] },
    { applicable: true, level: 'warn', notes: ['缺证据'] },
    { applicable: true, level: 'error', notes: ['降级无留痕'] },
    { applicable: true, level: 'ok', evidencePresent: true, downgradeDeclared: true, notes: [] },
  ]
  for (const s of samples) {
    const text = renderUiVisualProbeLines(s).join('\n')
    assert.equal(ECOSYSTEM_RE.test(text), false)
  }
})

test('hunk 归属门渲染输出：信号态零生态命令词', () => {
  const samples = [
    { gate: 'off', notes: [], degraded: false },
    { gate: 'warn', faceCount: 2, unattributed: [{ file: 'a.js', hunks: 1 }], contended: [{ file: 'b.js', by: ['other'], hunks: 2 }], residue: [{ file: 'c.js' }], notes: [] },
    { gate: 'warn', faceCount: 1, unattributed: [], contended: [], residue: [], notes: [] },
  ]
  for (const s of samples) {
    const text = renderHunkAttributionLines(s).join('\n')
    assert.equal(ECOSYSTEM_RE.test(text), false)
  }
})
