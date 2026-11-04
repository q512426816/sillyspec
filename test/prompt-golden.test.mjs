/**
 * prompt-golden.test.mjs — stage 提示词金档哈希锁（2026-11-04-shipped-hygiene-prompt-golden）
 *
 * 动机：src/stages/* 的巨型内嵌提示词频繁返工（各文件日期注释实证），意外漂移（误改、
 * 合并踩踏、剪切粘贴事故）此前零防护。本测试对每阶段 definition 的步骤（name+prompt）
 * 序列做 sha256，与仓内基线比对——有意修改提示词后用
 *   SILLYSPEC_REGEN_PROMPT_GOLDEN=1 node --test test/prompt-golden.test.mjs
 * 显式再生成（漂移经 git diff 在评审可见）；无 env 时基线只读。
 *
 * 哈希输入只含仓内常量（已核实 10 个阶段模块无 process.env 装载期插值）——跨机稳定。
 * bytes 字段仅体积可观测，不入判定。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(ROOT, 'test', 'prompt-golden.json')

const STAGE_FILES = [
  'brainstorm.js', 'plan.js', 'execute.js', 'verify.js', 'archive.js',
  'explore.js', 'quick.js', 'scan.js', 'status.js', 'doctor.js',
]

async function loadDefinitions() {
  const out = {}
  for (const f of STAGE_FILES) {
    const mod = await import(`../src/stages/${f}`)
    assert.ok(mod.definition, `src/stages/${f} 缺 definition 导出——金档清单需同步维护`)
    out[f] = mod.definition
  }
  return out
}

function fingerprint(def) {
  const steps = (def.steps || []).map((s) => ({ name: s.name || '', prompt: s.prompt || '' }))
  const payload = JSON.stringify({ name: def.name, steps })
  return {
    hash: createHash('sha256').update(payload, 'utf8').digest('hex'),
    steps: steps.length,
    bytes: Buffer.byteLength(payload, 'utf8'),
  }
}

test('stage 提示词金档哈希比对（意外漂移红，有意修改走再生成通道）', async () => {
  const defs = await loadDefinitions()
  const current = {}
  for (const f of STAGE_FILES) current[f] = fingerprint(defs[f])

  if (process.env.SILLYSPEC_REGEN_PROMPT_GOLDEN === '1') {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n', 'utf8')
    console.log('📸 金档已再生成：test/prompt-golden.json（请随本次提示词改动同一提交入库，让漂移在 diff 可见）')
    return
  }

  assert.ok(existsSync(BASELINE_PATH), '缺 test/prompt-golden.json 基线——运行 SILLYSPEC_REGEN_PROMPT_GOLDEN=1 node --test test/prompt-golden.test.mjs 生成')
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))

  const drifted = []
  for (const f of STAGE_FILES) {
    const base = baseline[f]
    assert.ok(base && base.hash, `基线缺阶段 ${f}——运行 SILLYSPEC_REGEN_PROMPT_GOLDEN=1 node --test test/prompt-golden.test.mjs 再生成`)
    if (base.hash !== current[f].hash) {
      drifted.push(`${f}（基线 ${base.hash.slice(0, 8)} → 现值 ${current[f].hash.slice(0, 8)}，${base.steps}→${current[f].steps} 步）`)
    }
  }
  assert.deepEqual(
    drifted,
    [],
    `stage 提示词与金档基线不一致（意外漂移？合并踩踏？）：\n${drifted.join('\n')}\n` +
    '确属有意修改：SILLYSPEC_REGEN_PROMPT_GOLDEN=1 node --test test/prompt-golden.test.mjs 再生成基线并随同一提交入库'
  )
})
