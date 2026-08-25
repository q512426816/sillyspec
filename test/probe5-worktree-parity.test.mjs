/**
 * 探针 5（API parity）worktree 双根并集测试（坑 probe5-worktree-single-root-noise，2026-08-24 用户实证）。
 *
 * 语义：后端端点全集 = 主仓既有 ∪ worktree 新增 ∪ 存量 artifact；前端调用读真实 worktree
 * （apply 前新代码只在 worktree）。旧实现只现算 scanRoot 单根：
 *   - verify 从主仓跑（apply 前）→ worktree 新增端点不在比对集 → missingBackend 误报；
 *   - verify 从 worktree 跑 → meta 读不到（旧路径硬编码 scanRoot/.sillyspec）+ 主仓既有
 *     daemon 端点缺失 → 前端调用全量误报 missing。
 *
 * 覆盖：
 * 1. 主仓跑：worktree 新增前端调用【主仓既有 daemon 端点】→ 0 误报（用户实证场景）
 * 2. 主仓跑：worktree 新增【后端端点 + 调用它的前端】→ 0 误报（并集的 worktree 侧）
 * 3. 对照：真缺失端点仍报 missing（并集不许变成全过）
 * 4. worktree 内跑：主仓既有端点入集 → 0 误报（meta 经 specBase 主仓锚点读到）
 * 5. resolveVerifyProbesSpecBase 漂移锚定 + CLI --init 骨架落主仓（坑 worktree-spec-artifact-misplace）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { verifyApiParity } from '../src/contract-matrix.js'
import { runVerifyProbes, renderVerifyProbesReport, resolveVerifyProbesSpecBase } from '../src/verify-probes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

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

function makeWorktreeFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'p5w-'))
  tmpRoots.push(proj)
  const specBase = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  // 主仓既有 daemon 端点（baseline）
  mkdirSync(join(proj, 'daemon'), { recursive: true })
  writeFileSync(join(proj, 'daemon', 'server.js'),
    'const express = require("express")\nconst router = express.Router()\nrouter.get("/api/daemon/status", (req, res) => res.json({}))\nmodule.exports = router\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  // 真实 worktree（sillyspec 标准路径 + meta 锚点）
  const wt = join(specBase, '.runtime', 'worktrees', 'p5w')
  git(proj, ['worktree', 'add', '-q', '-b', 'sillyspec/p5w', wt])
  writeFileSync(join(specBase, '.runtime', 'worktrees', 'p5w', 'meta.json'), JSON.stringify({
    branch: 'sillyspec/p5w', worktreePath: wt, baseHash: baseHash, actualBaseHash: baseHash,
    baselineCommit: baseHash, mode: 'worktree',
  }))
  // worktree 新增（未提交——子代理默认不 commit 的形态）：
  //   新后端端点 + 前端调用主仓既有端点/新端点/真缺失端点
  mkdirSync(join(wt, 'modules'), { recursive: true })
  writeFileSync(join(wt, 'modules', 'newmod.js'),
    'const express = require("express")\nconst router = express.Router()\nrouter.post("/api/new/thing", (req, res) => res.json({}))\nmodule.exports = router\n')
  mkdirSync(join(wt, 'web'), { recursive: true })
  // 注：GET 与 POST 调用至少隔两行——extractFrontendApiCalls 的 3 行 lookahead 会把邻近行的
  // method 合并到当前调用（既有行为），混排会把 GET 误记成 POST 导致方法不匹配
  writeFileSync(join(wt, 'web', 'feature.js'),
    'export const a = () => apiFetch("/api/daemon/status")\n' +
    '// separator\n' +
    '// separator\n' +
    'export const b = () => apiFetch("/api/new/thing", { method: "POST" })\n' +
    'export const c = () => apiFetch("/api/genuinely-missing")\n')
  return { proj, specBase, wt }
}

console.log('--- 1/2/3. 主仓跑（scanRoot=主仓，apply 前 worktree 在途）---')
{
  const { proj, specBase } = makeWorktreeFixture()
  const r = verifyApiParity(specBase, proj, null, 'p5w')
  const missingPaths = r.missingBackend.map(m => m.path)
  assert(!missingPaths.includes('/api/daemon/status'), '主仓既有 daemon 端点不再误报 missing（用户实证场景）')
  assert(!missingPaths.includes('/api/new/thing'), 'worktree 新增后端端点入比对集（并集 worktree 侧）')
  assert(missingPaths.includes('/api/genuinely-missing'), '对照：真缺失端点仍报 missing（并集不吞真缺陷）')
  assert((r.scanRoots || []).length === 2, `双根并集扫描（scanRoots=${(r.scanRoots || []).length}，期望 2=主仓+worktree）`)
  assert(r.summary.includes('worktree'), `summary 注明扫描根（${r.summary}）`)
  rmSync(proj, { recursive: true, force: true })
}

console.log('--- 4. worktree 内跑（scanRoot=worktree）---')
{
  const { proj, specBase, wt } = makeWorktreeFixture()
  // specBase=主仓锚点（command.js 漂移守卫同款效果）→ meta 可读 → 主仓根经 git-common-dir 入集
  const r = verifyApiParity(specBase, wt, null, 'p5w')
  const missingPaths = r.missingBackend.map(m => m.path)
  assert(!missingPaths.includes('/api/daemon/status'), 'worktree 内跑：主仓既有 daemon 端点入集不误报')
  assert(!missingPaths.includes('/api/new/thing'), 'worktree 内跑：worktree 新增端点在集')
  assert(missingPaths.includes('/api/genuinely-missing'), 'worktree 内跑：真缺失仍报')
  rmSync(proj, { recursive: true, force: true })
}

console.log('--- 5a. resolveVerifyProbesSpecBase 漂移锚定（tracked .sillyspec 副本场景）---')
{
  const proj = mkdtempSync(join(tmpdir(), 'p5d-'))
  tmpRoots.push(proj)
  const mainSpec = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  // .sillyspec/changes 被 git 跟踪 → worktree checkout 出 .sillyspec 副本（drift 场景成立条件）
  mkdirSync(join(mainSpec, 'changes', 'c1'), { recursive: true })
  writeFileSync(join(mainSpec, 'changes', 'c1', 'design.md'), '# Design\n\n仅文案调整。\n')
  writeFileSync(join(proj, 'a.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const wt = join(mainSpec, '.runtime', 'worktrees', 'c1')
  git(proj, ['worktree', 'add', '-q', '-b', 'sillyspec/c1', wt])
  const anchored = resolveVerifyProbesSpecBase(wt, null, null)
  assert(anchored === mainSpec, `worktree 副本 cwd → 锚回主仓（${anchored}）`)
  const explicit = resolveVerifyProbesSpecBase(wt, join(wt, '.sillyspec'), null)
  assert(explicit === join(wt, '.sillyspec'), '显式 --spec-dir 不纠正（显式指定优先）')
  rmSync(proj, { recursive: true, force: true })
}

console.log('--- 5b. CLI --init 在 worktree 内跑 → 骨架落主仓 ---')
{
  const proj = mkdtempSync(join(tmpdir(), 'p5c-'))
  tmpRoots.push(proj)
  const mainSpec = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  mkdirSync(join(mainSpec, 'changes', 'c1'), { recursive: true })
  writeFileSync(join(mainSpec, 'changes', 'c1', 'design.md'), '# Design\n\n仅文案调整。\n')
  writeFileSync(join(proj, 'a.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const wt = join(mainSpec, '.runtime', 'worktrees', 'c1')
  git(proj, ['worktree', 'add', '-q', '-b', 'sillyspec/c1', wt])
  const out = spawnSync(process.execPath, [cliBin, 'verify-probes', '--change', 'c1', '--init'],
    { cwd: wt, encoding: 'utf8' })
  const mainReport = join(mainSpec, 'changes', 'c1', 'verify-result.md')
  const wtReport = join(wt, '.sillyspec', 'changes', 'c1', 'verify-result.md')
  assert(out.status === 0 && existsSync(mainReport), `--init 骨架落主仓 ${mainReport}（exit=${out.status}）`)
  assert(!existsSync(wtReport), 'worktree 副本目录不落骨架（防蒸发错位）')
  if (out.status !== 0) console.log(out.stdout, out.stderr)
  rmSync(proj, { recursive: true, force: true })
}

console.log('--- 6. 探针 1 worktree 路径回退（坑 probe1-worktree-path-blind）---')
{
  const { proj, specBase, wt } = makeWorktreeFixture()
  // design §6 清单列出 worktree-only 新文件（含 TODO 标记）——主仓没有该文件
  mkdirSync(join(specBase, 'changes', 'p5w'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'p5w', 'design.md'), [
    '# Design', '',
    '## 文件变更清单',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | modules/newmod.js | worktree 新文件 |',
    '| 新增 | daemon/server.js | 主仓既有 |',
    '',
  ].join('\n'))
  writeFileSync(join(wt, 'modules', 'newmod.js'),
    'const router = require("express").Router()\nrouter.post("/api/new/thing", (req, res) => res.json({}))\n// TODO: 补参数校验\nmodule.exports = router\n')
  const r = runVerifyProbes({ cwd: proj, changeName: 'p5w' })
  assert(r.probe1.worktreeHits === 1, `worktree-only 文件回退命中（实际 ${r.probe1.worktreeHits}）`)
  assert(r.probe1.skippedFiles.length === 0, `不再误报不存在（实际 ${JSON.stringify(r.probe1.skippedFiles)}）`)
  assert(r.probe1.matches.some(m => m.file === 'modules/newmod.js' && m.content.includes('TODO')),
    'worktree 版本内容被真扫（TODO 命中）')
  const md = renderVerifyProbesReport(r)
  assert(md.includes('已从 worktree 读取'), '渲染层注明 worktree 读取来源')
  rmSync(proj, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
