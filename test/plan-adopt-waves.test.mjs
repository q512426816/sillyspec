/**
 * plan-adopt-waves 测试（坑 wave-manual-mismatch-noise / wave-dep-direction-unchecked，
 * 2026-08-24 用户反馈二期）。
 *
 * 覆盖：
 * 1. adoptPlanWaves：手排 Wave 全挤一层（依赖同 Wave）→ 一键重排为拓扑分组 + 任务总表 W 列同步
 * 2. 幂等：重复 adopt 产出逐字节相同
 * 3. --dry-run：不落盘
 * 4. executePlanPostcheck：依赖方向违规（同 Wave / 后置 Wave）硬拦 throw
 * 5. adopt 后 executePlanPostcheck 全过（方向合法 + 结构一致，端到端闭环）
 * 6. 无显式 Wave 标题：插在「## 任务总表」前
 * 7. Wave 段内混正文：拒绝重写（防误删）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { adoptPlanWaves } from '../src/plan-adopt-waves.js'
import { executePlanPostcheck } from '../src/stages/plan-postcheck.js'

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

const CARD_FILES = ['src/a.js', 'src/b.js', 'src/c.js']
const CARD_DEPS = { 'task-01': [], 'task-02': ['task-01'], 'task-03': ['task-02'] }

function makeCard(id, file, deps) {
  return [
    '---',
    `id: ${id}`,
    'title: t',
    'title_zh: 任务',
    'author: t',
    'created_at: 2026-08-24 00:00:00',
    'priority: P0',
    `depends_on: [${deps.map(d => `'${d}'`).join(', ')}]`,
    'blocks: []',
    `requirement_ids: [FR-${id.replace(/\D/g, '').replace(/^0/, '')}]`,
    'decision_ids: []',
    'allowed_paths:',
    `  - ${file}`,
    'goal: >',
    '  实现真实目标。',
    'implementation:',
    '  - 真实实现步骤',
    'acceptance:',
    '  - 真实验收条件',
    'verify:',
    '  - node --version',
    'constraints:',
    '  - 不越界',
    '---',
    '',
    '## 验收标准',
    '',
    '- 真实验收',
    '',
    '## 验证',
    '',
    '- node --version',
    '',
  ].join('\n')
}

/**
 * @param {{ waveLines?: string[], noWaves?: boolean, extraWaveBody?: boolean }} opts
 *   waveLines：plan.md 的 Wave 段原始行（默认全挤 Wave 1）；noWaves：无 Wave 标题；
 *   extraWaveBody：Wave 段内混一行正文（拒绝重写场景）
 */
function makeFixture(opts = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'paw-'))
  tmpRoots.push(cwd)
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't'])
  const changeDir = join(cwd, '.sillyspec', 'changes', 'paw')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })

  const waveLines = opts.waveLines !== undefined ? opts.waveLines : ['## Wave 1（并行，无依赖）', '- task-01', '- task-02', '- task-03']
  if (opts.extraWaveBody) waveLines.splice(2, 0, '这里是一段正文注记，不应被 adopt 吞掉。')
  const planLines = ['# 实现计划', '', '## 背景', '', '测试用。', '']
  if (!opts.noWaves) planLines.push(...waveLines, '')
  planLines.push(
    '## 任务总表',
    '| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |',
    '|---|---|---|---|---|---|---|',
    '| task-01 | 任务一 | W1 | P0 | — | FR-1 | ... |',
    '| task-02 | 任务二 | W1 | P0 | task-01 | FR-2 | ... |',
    '| task-03 | 任务三 | W1 | P0 | task-02 | FR-3 | ... |',
    '')
  writeFileSync(join(changeDir, 'plan.md'), planLines.join('\n'))

  writeFileSync(join(changeDir, 'design.md'), [
    '# 设计', '',
    '## 文件变更清单',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    ...CARD_FILES.map(f => `| 修改 | ${f} | 改动 |`),
    '',
  ].join('\n'))

  writeFileSync(join(changeDir, 'tasks.md'), [
    '# 任务清单（Tasks）', '',
    '- [ ] task-01: 任务一',
    '- [ ] task-02: 任务二 (depends_on: task-01)',
    '- [ ] task-03: 任务三 (depends_on: task-02)',
    '',
  ].join('\n'))

  writeFileSync(join(changeDir, 'module-impact.md'), [
    '# 模块影响分析（Module Impact）— 测试', '',
    '## 模块影响矩阵', '',
    '无', '',
    '## 未匹配文件', '',
    '无', '',
  ].join('\n'))

  const ids = ['task-01', 'task-02', 'task-03']
  ids.forEach((id, i) => {
    writeFileSync(join(changeDir, 'tasks', `${id}.md`), makeCard(id, CARD_FILES[i], CARD_DEPS[id]))
  })
  return { cwd, changeDir }
}

async function runPostcheck(cwd) {
  const logs = []
  const orig = { log: console.log, err: console.error, warn: console.warn }
  console.log = (...a) => logs.push(a.map(String).join(' '))
  console.error = (...a) => logs.push(a.map(String).join(' '))
  console.warn = (...a) => logs.push(a.map(String).join(' '))
  try {
    await executePlanPostcheck({ cwd, resolveChangeDir: () => null, progress: null })
    return { threw: null, logs }
  } catch (e) {
    return { threw: String(e.message), logs }
  } finally {
    console.log = orig.log; console.error = orig.err; console.warn = orig.warn
  }
}

console.log('--- 1. 一键重排：全挤 Wave 1 → 拓扑三层 + 总表 W 列同步 ---')
{
  const { cwd, changeDir } = makeFixture()
  const r = adoptPlanWaves({ changeDir })
  assert(r.ok === true, `adopt 成功（${r.error || 'ok'}）`)
  assert(r.waves.length === 3, `拓扑分三层（实际 ${r.waves.length}）`)
  const plan = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  const w1 = plan.indexOf('## Wave 1')
  const w2 = plan.indexOf('## Wave 2')
  const w3 = plan.indexOf('## Wave 3')
  assert(w1 >= 0 && w2 > w1 && w3 > w2, 'plan.md 含三个递增 Wave 标题')
  const wave1Block = plan.slice(w1, w2)
  assert(wave1Block.includes('- task-01') && !wave1Block.includes('task-02'), 'Wave 1 只含 task-01')
  const wave2Block = plan.slice(w2, w3)
  assert(wave2Block.includes('- task-02') && !wave2Block.includes('task-03'), 'Wave 2 只含 task-02')
  assert(plan.slice(w3).includes('- task-03'), 'Wave 3 含 task-03')
  assert(plan.includes('## Wave 1（并行，无依赖）') && plan.includes('## Wave 2（依赖前序 Wave）'), 'Wave 标题注记按模板')
  assert(r.tableRowsUpdated === 3, `任务总表 W 列更新 3 行（实际 ${r.tableRowsUpdated}）`)
  assert(plan.includes('| task-02 | 任务二 | W2 |'), '总表 task-02 的 W 列已改 W2')
  assert(r.postcheck && (r.postcheck.errors || []).length === 0, `重排后 blueprint 一致性通过（实际: ${JSON.stringify(r.postcheck?.errors)}）`)
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 2. 幂等：重复 adopt 逐字节相同 ---')
{
  const { cwd, changeDir } = makeFixture()
  adoptPlanWaves({ changeDir })
  const once = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  adoptPlanWaves({ changeDir })
  const twice = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  assert(once === twice, '二次 adopt 后 plan.md 内容不变')
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 3. --dry-run：不落盘 ---')
{
  const { cwd, changeDir } = makeFixture()
  const before = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  const r = adoptPlanWaves({ changeDir, dryRun: true })
  assert(r.ok === true && r.dryRun === true, 'dry-run 返回 ok')
  assert(readFileSync(join(changeDir, 'plan.md'), 'utf8') === before, 'dry-run 未改 plan.md')
  assert((r.waveBlock || []).some(l => l.includes('## Wave 3')), 'dry-run 返回预览块')
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 4. 依赖方向违规：executePlanPostcheck 硬拦 ---')
{
  const { cwd } = makeFixture() // 全挤 Wave 1：task-02 depends_on task-01 同 Wave
  const r = await runPostcheck(cwd)
  assert(r.threw !== null && r.threw.includes('Wave 依赖方向违规'), `同 Wave 依赖被硬拦（实际: ${r.threw}）`)
  assert(r.threw.includes('task-02 depends_on task-01'), '报错点名违规对')
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 4b. 后置 Wave 依赖（顺序颠倒）同样硬拦 ---')
{
  const { cwd } = makeFixture({ waveLines: ['## Wave 1', '- task-01', '- task-03', '', '## Wave 2', '- task-02'] })
  const r = await runPostcheck(cwd)
  assert(r.threw !== null && r.threw.includes('后置 Wave'), `后置依赖被硬拦（实际: ${r.threw}）`)
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 5. adopt 后 executePlanPostcheck 全过（端到端闭环）---')
{
  const { cwd, changeDir } = makeFixture()
  adoptPlanWaves({ changeDir })
  const r = await runPostcheck(cwd)
  assert(r.threw === null, `adopt 后 postcheck 无 throw（实际: ${r.threw}）`)
  assert(r.logs.some(l => l.includes('Wave 分组与拓扑排序一致')), 'postcheck 报「Wave 分组与拓扑排序一致」')
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 6. 无显式 Wave 标题：插在「## 任务总表」前 ---')
{
  const { cwd, changeDir } = makeFixture({ noWaves: true })
  const r = adoptPlanWaves({ changeDir })
  assert(r.ok === true, `无标题场景 adopt 成功（${r.error || 'ok'}）`)
  const plan = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  assert(plan.indexOf('## Wave 1') < plan.indexOf('## 任务总表'), 'Wave 段插在任务总表之前')
  assert(plan.includes('- task-03'), '任务引用齐全')
  rmSync(cwd, { recursive: true, force: true })
}

console.log('--- 7. Wave 段内混正文：拒绝重写 ---')
{
  const { cwd, changeDir } = makeFixture({ extraWaveBody: true })
  const before = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  const r = adoptPlanWaves({ changeDir })
  assert(r.ok === false && /非引用内容/.test(r.error || ''), `拒绝重写（实际: ${r.error}）`)
  assert(readFileSync(join(changeDir, 'plan.md'), 'utf8') === before, 'plan.md 未被改动')
  rmSync(cwd, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
if (tmpRoots.length > 0) { /* mkdtemp 目录随系统清理；显式 rm 已在各用例内完成 */ }
process.exit(failed > 0 ? 1 : 0)
