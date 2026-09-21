/**
 * plan-postcheck-path-existence.test.mjs — allowed_paths 存在性检查 NEW:/跨仓放行（R5 对撞实证 F2/F3）
 *
 * 2026-09-21 R5 对撞（round5/r5-collision-ehs-attribution.md P9/N4）：plan --done 三连卡壳根因——
 * ① 待建文件（execute 阶段才创建）在 plan 时必然不存在 → 照查必假阳性；② 跨仓 task 路径相对
 * 他仓根，用主仓 projectRoot 查 100% 不存在 → 必假阳性。agent 被迫 5 次 grep/sed 读 CLI 安装
 * 源码考古校验逻辑 + 2 次 Edit 改卡过门（taskcard.js:129 已定 NEW: 为合法格式，检查器不认属口径分裂）。
 *
 * 契约：
 *   1. NEW: 前缀条目跳过存在性检查（声明待建，检查语义不适用）。
 *   2. repo≠main 的跨仓 task 整卡跳过主仓根存在性检查。
 *   3. 主仓无 NEW: 前缀且确实缺失 → 仍告警，但文案附逃生通道（NEW: 前缀 / repo: 字段）。
 *   4. 主仓路径存在（或父目录存在）→ 无告警（零回归）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validatePlanFeasibility } from '../src/stages/plan-postcheck.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// 字段齐全卡（通过 feasibility 其余检查，只让存在性检查的 warning 成为变量）
function taskMd(id, { repo = null, path = 'src/new-file.js' } = {}) {
  const lines = ['---', `id: ${id}`, `title: ${id} title`, 'title_zh: 中文标题', 'depends_on: []']
  if (repo) lines.push(`repo: ${repo}`)
  lines.push(
    'allowed_paths:',
    `  - ${path}`,
    'goal: >', `  ${id} goal`,
    'implementation: 修改',
    'acceptance: 接口正确',
    'verify: npm test',
    'constraints: none',
    '---', '',
    '## 验收标准', '',
    '- ok', '',
  )
  return lines.join('\n') + '\n'
}

function setup(tasks) {
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-exist-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-exist-root-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  for (const t of tasks) writeFileSync(join(changeDir, 'tasks', `${t.id}.md`), taskMd(t.id, t))
  return { changeDir, projectRoot }
}
const existWarnings = warnings => warnings.filter(w => w.includes('allowed_paths 中的'))

console.log('=== allowed_paths 存在性检查：NEW:/跨仓放行 + 文案逃生通道（F2/F3）===\n')

// ── 1: NEW: 前缀 → 跳过 ──
console.log('--- 场景 1：NEW: 前缀待建文件 → 不再假阳性 ---')
{
  const { changeDir, projectRoot } = setup([{ id: 'task-01', path: 'NEW:src/ehsRpPackage/pages/query/index.less' }])
  const r = validatePlanFeasibility(changeDir, projectRoot)
  assert(existWarnings(r.warnings).length === 0, `NEW: 条目零告警（实际：${existWarnings(r.warnings).join(' | ') || '无'}）`)
  rmSync(changeDir, { recursive: true, force: true }); rmSync(projectRoot, { recursive: true, force: true })
}

// ── 2: 跨仓 task → 整卡跳过 ──
console.log('--- 场景 2：repo≠main 跨仓路径（主仓根下必不存在）→ 零告警 ---')
{
  const { changeDir, projectRoot } = setup([{ id: 'task-13', repo: 'spdemo', path: 'src/ehsRpPackage/pages/query/index.less' }])
  const r = validatePlanFeasibility(changeDir, projectRoot)
  assert(existWarnings(r.warnings).length === 0, `跨仓条目零告警（实际：${existWarnings(r.warnings).join(' | ') || '无'}）`)
  rmSync(changeDir, { recursive: true, force: true }); rmSync(projectRoot, { recursive: true, force: true })
}

// ── 3: 主仓确实缺失且无 NEW: → 仍告警 + 文案含逃生通道 ──
console.log('--- 场景 3：主仓缺失路径 → 告警文案附 NEW:/repo: 逃生通道 ---')
{
  const { changeDir, projectRoot } = setup([{ id: 'task-01', path: 'src/ghost/path.js' }])
  const r = validatePlanFeasibility(changeDir, projectRoot)
  const ws = existWarnings(r.warnings)
  assert(ws.length === 1, `仍产出 1 条告警（实际 ${ws.length}）`)
  assert(ws[0]?.includes('NEW:'), '文案教 NEW: 前缀逃生通道')
  assert(ws[0]?.includes('repo:'), '文案教跨仓 repo: 字段逃生通道')
  rmSync(changeDir, { recursive: true, force: true }); rmSync(projectRoot, { recursive: true, force: true })
}

// ── 4: 主仓路径父目录存在 → 零回归 ──
console.log('--- 场景 4：父目录在主仓存在 → 无告警（零回归） ---')
{
  const { changeDir, projectRoot } = setup([{ id: 'task-01', path: 'src/exists/new.js' }])
  mkdirSync(join(projectRoot, 'src', 'exists'), { recursive: true })
  const r = validatePlanFeasibility(changeDir, projectRoot)
  assert(existWarnings(r.warnings).length === 0, '父目录存在零告警')
  rmSync(changeDir, { recursive: true, force: true }); rmSync(projectRoot, { recursive: true, force: true })
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
