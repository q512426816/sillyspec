/**
 * governance-autopilot.test.mjs — 治理交互减量（2026-09-26，R20 实证：+38 轮全来自治理工件交互）
 *
 * 覆盖验收面：
 *   ① FR 标题锚预填（2026-10-04-thin-docs-v2 改向）：draftAll 产出的 requirements.md
 *      FR 块=标准原文标题锚+待撰写指引（GWT 场景体预填退役——占位 Then/腰斩 When 实证归档）；
 *   ② 自动勾选接线钉：flow done 哨兵前解析 task-NN token 代勾未勾条目；
 *   ③ 自动绑定接线钉：flow done 空绑定行从测试结果自动补全（fail-soft，双格式）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const mod = await import(pathToFileURL(join(ROOT, 'src/flow-draft.js')).href)
// draftRequirements 可能是内部函数不导出——通过 draftAll 间接测（造 changeDir）
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

test('① FR 标题锚预填：draftAll 产出 FR 块（标准原文锚+待撰写指引，无 GWT 场景体）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gap-'))
  try {
    const changeDir = join(tmp, 'changes', 'c-ap')
    mkdirSync(changeDir, { recursive: true })
    mod.draftAll({ changeDir, change: 'c-ap', input: '动机：测试\n成功标准：\n- POST /api/changes/{name}/events 接收事件写入（鉴权+幂等）\n- pytest 五组全绿', withTasks: false, runtimeRoot: tmp })
    const req = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
    assert.ok(req.includes('### FR-01: POST /api/changes/{name}/events'), 'FR-01 标题锚=标准原文')
    assert.ok(req.includes('（待撰写'), '待撰写指引在场（agent 书写面）')
    assert.ok(!/^Given |^When |^Then /m.test(req), '无 GWT 场景体预填（占位 Then 退役）')
    assert.ok(req.includes('### FR-02: pytest 五组全绿'), '多标准多块')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② 自动勾选接线钉（flow.js 源码文本级）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('自动勾选'), '自动勾选标识在场')
  assert.ok(src.includes('_evidencedTasks'), 'token 证据集构建')
  assert.ok(src.includes('机器代勾'), '代勾文案（区别于拒收）')
  assert.ok(src.includes("task-(\\d{1,2})", 'g'), 'task-NN 正则')
})

test('③ 自动绑定接线钉（flow.js 源码文本级，双格式）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('自动绑定'), '自动绑定标识在场')
  assert.ok(src.includes('_testFiles'), '测试文件集提取')
  assert.ok(src.includes('test-result.json'), '从测试结果读文件清单')
  assert.ok(src.includes('agent 可覆盖'), '覆盖语义保留')
  assert.ok(src.includes('自动补全 fail-soft'), 'fail-soft 声明')
  assert.ok(src.includes('（待填[^）]*）'), 'v2 纯文本绑定行补全分支在场')
})
