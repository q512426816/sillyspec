/**
 * fr-compound-split.test.mjs — 复合标准不拆分（2026-10-04-thin-docs-v2 FR-03 改向）
 *
 * 历史：2026-09-25-fr-compound-split 引入「A/B」「A；B」拆两条（谓词词表资格判定）；
 * 2026-09-28-split-guard 收窄误拆。v2 起拆分整体退役——拆分是静默变形（词表误判成对
 * 短名词/路径形态的历史坑全在同链），一条标准一行是 --input 书写者的责任，机器不做
 * 语义猜测。本文件锁定「不拆」语义防回潮。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractSuccessCriteria, draftAll } from '../src/flow-draft.js'

test('① 复合条目不拆：斜杠与分号形态整条保留', () => {
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 后端端点可访问/鉴权生效\n- 前端正常渲染'),
    ['后端端点可访问/鉴权生效', '前端正常渲染'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 写入幂等；重试收敛'), ['写入幂等；重试收敛'])
})

test('② 成对短名词/单侧谓词/路径形态：同样整条保留（拆分面已不存在，形态差异无感）', () => {
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- 节点/边 JSON 源描述'), ['节点/边 JSON 源描述'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- warn 默认/error 阻断'), ['warn 默认/error 阻断'])
  assert.deepEqual(extractSuccessCriteria('成功标准：\n- src/flow.js 补冻结面/提示'),
    ['src/flow.js 补冻结面/提示'])
})

test('③ 复合条目整条进 FR 标题锚（FR-01/02 形态——数量=条目数）', () => {
  const root = mkdtempSync(join(tmpdir(), 'fcs-'))
  draftAll({ changeDir: root, change: 'c1', input: '成功标准：\n- 后端端点可访问/鉴权生效\n- 前端正常渲染', runtimeRoot: root })
  const reqs = readFileSync(join(root, 'requirements.md'), 'utf8')
  assert.match(reqs, /### FR-01: 后端端点可访问\/鉴权生效/, '斜杠复合条目整条入锚')
  assert.match(reqs, /### FR-02: 前端正常渲染/)
  assert.ok(!/### FR-03/.test(reqs), '无拆分出的第三条')
  rmSync(root, { recursive: true, force: true })
})
