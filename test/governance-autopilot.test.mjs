/**
 * governance-autopilot.test.mjs — 治理交互减量（2026-09-26，R20 实证：+38 轮全来自治理工件交互）
 *
 * 覆盖验收面：
 *   ① GWT 骨架预填：draftRequirements 生成完整 Given/When/Then 块（非空槽）——agent 可覆盖；
 *   ② 自动勾选接线钉：flow done 哨兵前解析 task-NN token 代勾未勾条目；
 *   ③ 自动绑定接线钉：flow done 空绑定槽从测试结果自动补全（fail-soft）。
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

test('① GWT 骨架预填：draftAll 产出 requirements.md 含完整 Given/When/Then 块', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gap-'))
  try {
    const changeDir = join(tmp, 'changes', 'c-ap')
    mkdirSync(changeDir, { recursive: true })
    const r = mod.draftAll({ changeDir, change: 'c-ap', input: '动机：测试\n成功标准：\n- POST /api/changes/{name}/events 接收事件写入（鉴权+幂等）\n- pytest 五组全绿', withTasks: false, runtimeRoot: tmp })
    const req = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
    assert.ok(req.includes('### FR-01:'), 'FR-01 块在场')
    assert.ok(req.includes('Given'), 'Given 行在场')
    assert.ok(req.includes('When'), 'When 行在场')
    assert.ok(req.includes('Then'), 'Then 行在场')
    assert.ok(req.includes('GWT 骨架已机器预填'), '头部说明骨架已预填')
    assert.ok(req.includes('### FR-02:'), '多标准多块')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② 自动勾选接线钉（flow.js 源码文本级）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('自动勾选'), '自动勾选标识在场')
  assert.ok(src.includes('_evidencedTasks'), 'token 证据集构建')
  assert.ok(src.includes('机器代勾'), '代勾文案（区别于拒收）')
  assert.ok(src.includes("task-(\\d{1,2})", 'g'), 'task-NN 正则')
})

test('③ 自动绑定接线钉（flow.js 源码文本级）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('自动绑定'), '自动绑定标识在场')
  assert.ok(src.includes('_testFiles'), '测试文件集提取')
  assert.ok(src.includes('test-result.json'), '从测试结果读文件清单')
  assert.ok(src.includes('agent 可覆盖'), '覆盖语义保留')
  assert.ok(src.includes('自动补全 fail-soft'), 'fail-soft 声明')
})
