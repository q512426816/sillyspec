/**
 * worktree cleanup 前的 spec 产物打捞测试（坑 worktree-spec-artifact-misplace，2026-08-24 用户实证）。
 *
 * 场景：子代理 cwd=worktree 时把流程产物写进 worktree 的 .sillyspec——apply 的
 * filterDeliverableFiles 把 .sillyspec/changes/ 排除在交付外，cleanup 删除 worktree 即蒸发。
 * 清理前打捞（worktree.js _salvageSpecArtifacts）：
 *   1. changes/<name>/** 主仓缺失 → copy 回主仓；同名不同内容 → 仅列清单不覆盖
 *   2. docs/** 主仓缺失 → copy 回（模块文档）
 *   3. in-place / native-worktree 跳过；打捞不阻断清理
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { WorktreeManager } from '../src/worktree.js'

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

console.log('--- 1. cleanup 打捞：缺失 copy 回 / 冲突不覆盖 ---')
{
  const proj = mkdtempSync(join(tmpdir(), 'salv-'))
  tmpRoots.push(proj)
  const mainSpec = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, 'a.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const wt = join(mainSpec, '.runtime', 'worktrees', 'salv')
  git(proj, ['worktree', 'add', '-q', '-b', 'sillyspec/salv', wt])
  writeFileSync(join(wt, 'meta.json'), JSON.stringify({
    branch: 'sillyspec/salv', worktreePath: wt, mode: 'worktree',
  }))

  // worktree 内错位的流程产物：
  //   verify-result.md（主仓缺失 → 打捞）/ task-01.md（主仓有不同内容 → 冲突不覆盖）/
  //   模块文档 m1.md（主仓缺失 → 打捞）
  mkdirSync(join(wt, '.sillyspec', 'changes', 'salv', 'tasks'), { recursive: true })
  writeFileSync(join(wt, '.sillyspec', 'changes', 'salv', 'verify-result.md'), '# 验证报告（worktree 副本内误写）\n\n## 结论\n\nPASS\n')
  writeFileSync(join(wt, '.sillyspec', 'changes', 'salv', 'tasks', 'task-01.md'), 'task 卡（worktree 副本旧版）\n')
  mkdirSync(join(wt, '.sillyspec', 'docs', 'proj', 'modules'), { recursive: true })
  writeFileSync(join(wt, '.sillyspec', 'docs', 'proj', 'modules', 'm1.md'), '# m1（worktree 内新模块卡）\n')
  // 主仓已有同名但内容不同的 task-01.md（冲突路径）
  mkdirSync(join(mainSpec, 'changes', 'salv', 'tasks'), { recursive: true })
  writeFileSync(join(mainSpec, 'changes', 'salv', 'tasks', 'task-01.md'), 'task 卡（主仓新版——不应被副本覆盖）\n')

  const wm = new WorktreeManager({ cwd: proj })
  const r = wm.cleanup('salv', { force: true })

  const salvagedReport = join(mainSpec, 'changes', 'salv', 'verify-result.md')
  assert(existsSync(salvagedReport) && readFileSync(salvagedReport, 'utf8').includes('worktree 副本内误写'),
    'verify-result.md 只存在于 worktree 副本 → cleanup 前已复制回主仓')
  assert(existsSync(join(mainSpec, 'docs', 'proj', 'modules', 'm1.md')),
    '模块文档（.sillyspec/docs/**）主仓缺失 → 复制回主仓')
  assert(readFileSync(join(mainSpec, 'changes', 'salv', 'tasks', 'task-01.md'), 'utf8').includes('主仓新版'),
    '同名不同内容 → 不覆盖（主仓版本保留）')
  assert((r.details || []).some(d => String(d).includes('salvaged')),
    `cleanup details 记录打捞（${(r.details || []).filter(d => String(d).includes('salvage')).join(' | ')}）`)
  assert(!existsSync(wt) || !existsSync(join(wt, '.sillyspec')), '清理仍正常执行（打捞不阻断）')
  rmSync(proj, { recursive: true, force: true })
}

console.log('--- 2. 无错位产物 → 零打捞零噪音 ---')
{
  const proj = mkdtempSync(join(tmpdir(), 'salv2-'))
  tmpRoots.push(proj)
  const mainSpec = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, 'a.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const wt = join(mainSpec, '.runtime', 'worktrees', 'clean')
  git(proj, ['worktree', 'add', '-q', '-b', 'sillyspec/clean', wt])
  writeFileSync(join(wt, 'meta.json'), JSON.stringify({
    branch: 'sillyspec/clean', worktreePath: wt, mode: 'worktree',
  }))
  const wm = new WorktreeManager({ cwd: proj })
  const r = wm.cleanup('clean', { force: true })
  assert(!(r.details || []).some(d => String(d).includes('salvaged')),
    'worktree 无 spec 产物 → 不打捞不告警（details 无 salvage 记录）')
  rmSync(proj, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
