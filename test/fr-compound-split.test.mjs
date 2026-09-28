/**
 * fr-compound-split.test.mjs — 复合标准拆分（2026-09-25-fr-compound-split）
 * 验收面：①「A/B」拆两条、「A；B」拆两条（经 extractSuccessCriteria）；②路径形态不拆；
 *   ③拆后进入 FR 区参考摘录（FR-01/02/03 形态）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractSuccessCriteria, draftAll } from '../src/flow-draft.js'

test('① 复合拆分：斜杠与分号形态', () => {
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 后端端点可访问/鉴权生效\n- 前端正常渲染'),
    ['后端端点可访问', '鉴权生效', '前端正常渲染'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 写入幂等；重试收敛'), ['写入幂等', '重试收敛'])
})

test('①b 谓词资格收窄（2026-09-28-split-guard-and-gate-report）：双侧含谓词才拆', () => {
  // 双侧谓词：拆（原设计语义保留）
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 后端端点可访问/鉴权生效'), ['后端端点可访问', '鉴权生效'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 产物入仓/重编译通过'), ['产物入仓', '重编译通过'])
  // 成对短名词（无谓词）：不拆——三次实证误拆的形态
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 节点/边 JSON 源描述'), ['节点/边 JSON 源描述'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 覆盖页面/UI 双形态'), ['覆盖页面/UI 双形态'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 语言/框架中立'), ['语言/框架中立'])
  // 单侧谓词：不拆（整体作为一个标准的组成部分）
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- warn 默认/error 阻断'), ['warn 默认/error 阻断'])
})

test('② 路径形态不拆：扩展名点或多斜杠', () => {
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- src/flow.js 补冻结面/提示'),
    ['src/flow.js 补冻结面/提示'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- backend/app/x.py 与 frontend/y.ts 对齐'),
    ['backend/app/x.py 与 frontend/y.ts 对齐'])
})

test('③ 拆后进入参考摘录（FR-01/02/03 形态）', () => {
  const root = mkdtempSync(join(tmpdir(), 'fcs-'))
  draftAll({ changeDir: root, change: 'c1', input: '成功标准：\n- 后端端点可访问/鉴权生效\n- 前端正常渲染', runtimeRoot: root })
  const reqs = readFileSync(join(root, 'requirements.md'), 'utf8')
  assert.match(reqs, /FR-01: 后端端点可访问/)
  assert.match(reqs, /FR-02: 鉴权生效/)
  assert.match(reqs, /FR-03: 前端正常渲染/)
  rmSync(root, { recursive: true, force: true })
})
