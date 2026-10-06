/**
 * 2026-10-07-flow-friction-batch3 — Wave 冲突指路 + module-impact 一键回填回归
 *
 * postmortem（provider-model-list）：同 Wave 共享文件报错只教「手工拆」——agent 手工拆错
 * （非合法 Wave 号 → 伪并行串行链）连撞多轮，而 plan-adopt-waves 一键重排才是出路；另
 * module-impact pending 死信靠一次性 node 脚本回填。锁死契约：
 *   W1 同 Wave 共享文件 error 含 plan-adopt-waves 指引（伪并行报错既有指路不回归）；
 *   F1 fillModuleImpactSkipped：pending→skipped、reason 进操作列、其余逐字不动、幂等；
 *   F2 CLI：module-impact --fill-skipped 落盘生效；缺文件 exit 2。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateBlueprintConsistency } from '../src/stages/plan.js'
import { fillModuleImpactSkipped } from '../src/run/complete-handlers.js'

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')
const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const CARD = (id, paths) => [
  '---', `id: ${id}`, `title: t-${id}`, `title_zh: 任务${id}`, 'author: t',
  'created_at: 2026-10-07 00:00:00', 'priority: P0', 'depends_on: []', 'blocks: []',
  'requirement_ids: []', 'decision_ids: []',
  'allowed_paths:', ...paths.map(p => `  - ${p}`),
  'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a',
  'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
].join('\n')

test('W1 同 Wave 共享文件 error 含 plan-adopt-waves 一键重排指引', () => {
  const root = mk('wavehint-')
  const changeDir = join(root, 'change')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n- task-02\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: a\n- [ ] task-02: b\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), CARD('task-01', ['src/shared.js']))
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), CARD('task-02', ['src/shared.js']))
  const r = validateBlueprintConsistency(changeDir)
  const waveErr = (r.errors || []).find(e => e.includes('被 Wave') && e.includes('task-'))
  assert.ok(waveErr, `同 Wave 共享 error 在场：${(r.errors || []).join(' | ')}`)
  assert.ok(waveErr.includes('plan-adopt-waves'), `含一键重排指引：${waveErr}`)
})

const IMPACT_MD = [
  '# 模块影响分析', '',
  '## 模块影响矩阵', '',
  '| 模块 | 变更文件 | 影响类型 | 需 review |', '|---|---|---|---|',
  '| lib | `src/a.js` | 逻辑变更 | 是 |', '',
  '## 更新结果', '',
  '| 目标 | 操作 | 状态 |', '|------|------|------|',
  '| `modules/lib.md` | 更新lib模块卡（本次变更涉及） | pending |',
  '| `modules/api.md` | 更新api模块卡（本次变更涉及） | 待办 |',
  '| `modules/done.md` | 更新done模块卡 | done |',
  '',
  '规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。',
].join('\n')

test('F1 fillModuleImpactSkipped：pending/待办→skipped、reason 进操作列、done 行不动、幂等', () => {
  const root = mk('mifill-')
  const mdPath = join(root, 'module-impact.md')
  writeFileSync(mdPath, IMPACT_MD, 'utf8')
  const r1 = fillModuleImpactSkipped(mdPath, { reason: '模块卡同步并入下批' })
  assert.equal(r1.filled, 2, `两行 pending/待办被回填（实际 ${r1.filled}）`)
  const out = readFileSync(mdPath, 'utf8')
  assert.ok(out.includes('| `modules/lib.md` | 更新lib模块卡（本次变更涉及）——skipped：模块卡同步并入下批 | skipped |'), `lib 行回填形态：${out.split('\n').find(l => l.includes('modules/lib.md'))}`)
  assert.ok(!/\| (?:pending|待办|未同步) \|/.test(out), `pending/待办行已清：${out}`)
  assert.ok(out.includes('| done |'), 'done 行不动')
  assert.ok(out.includes('## 模块影响矩阵') && out.includes('| lib | `src/a.js` | 逻辑变更 | 是 |'), '其余章节逐字不动')
  const r2 = fillModuleImpactSkipped(mdPath, { reason: '再跑' })
  assert.equal(r2.filled, 0, '幂等：重跑零改动')
  assert.equal(readFileSync(mdPath, 'utf8'), out, '文件内容不变')
})

test('F2 CLI：--fill-skipped 落盘生效；缺 module-impact.md exit 2', () => {
  const root = mk('micli-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'module-impact.md'), IMPACT_MD, 'utf8')
  const ok = spawnSync(process.execPath, [BIN, 'module-impact', '--change', 'c1', '--fill-skipped', '--reason', 'CLI 批量回填', '--spec-dir', specBase], { encoding: 'utf8', cwd: root })
  assert.equal(ok.status, 0, `exit 0：${ok.stdout}${ok.stderr}`)
  assert.ok(readFileSync(join(changeDir, 'module-impact.md'), 'utf8').includes('CLI 批量回填'), 'reason 落盘')

  const emptyRoot = mk('micli2-')
  const emptySpec = join(emptyRoot, '.sillyspec')
  const miss = spawnSync(process.execPath, [BIN, 'module-impact', '--change', 'nope', '--fill-skipped', '--spec-dir', emptySpec], { encoding: 'utf8', cwd: emptyRoot })
  assert.equal(miss.status, 2, `缺文件 exit 2（实际 ${miss.status}）：${miss.stderr}`)
  assert.ok(String(miss.stderr).includes('module-impact.md'), '报错点名文件')
})
