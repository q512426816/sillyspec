/**
 * worktree-guard 跨仓命令锚点感知（known-issues 2026-09-16「worktree 隔离期跨仓命令锚定
 * 错位」条目兑现）：三仓形态两摩擦的守卫行为——
 *   1. worktree 内 `cd ../注册仓`：放行不变 + stderr 纠偏留痕（shell 解析落 worktrees 存储
 *      目录、真实兄弟仓路径给出）
 *   2. 非 execute/quick 阶段（verify 等）主仓 cwd：`cd ../注册仓 && 测试/lint 类` 从严放行
 *      （注册根命中 + 其余片段全测试类 + 黑名单不沾）；写类/混合/未注册维持 stage 门禁拦截
 */
import {
  shouldBlock,
  _analyzeCrossRepoCdForTest as analyzeCrossRepoCd,
} from '../src/hooks/worktree-guard.js'
import { DB } from '../src/db.js'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let passed = 0, failed = 0
function assert(condition, message) {
  if (condition) { passed++; console.log('  ✅ ' + message) }
  else { failed++; console.error('  ❌ ' + message) }
}
const cleanups = []

function mkProject(prefix) {
  const cwd = mkdtempSync(join(tmpdir(), prefix + '-'))
  cleanups.push(() => { try { rmSync(cwd, { recursive: true, force: true }) } catch {} })
  return cwd
}

function seedDb(cwd, { stage = 'verify' } = {}) {
  const runtimeDir = join(cwd, '.sillyspec', '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  const db = new DB(join(runtimeDir, 'sillyspec.db'))
  db.init()
  const sq = db.getDb()
  sq.prepare('DELETE FROM changes').run()
  sq.prepare(`INSERT INTO changes (name, current_stage, status, no_worktree, created_at, last_active) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`)
    .run('c-xrepo', stage, 'active')
  db.close()
}

function setupProject(prefix) {
  const main = mkProject(prefix)
  const sibling = mkProject(prefix + '-fe')
  mkdirSync(join(main, '.sillyspec'), { recursive: true })
  const sibAbs = sibling.split('\\').join('/')
  writeFileSync(join(main, '.sillyspec', 'local.yaml'),
    `repos:\n  fe-repo: ${sibAbs}\n`)
  seedDb(main)
  return { main, sibling }
}

console.log('=== ① verify 期主仓 cwd：跨仓注册仓测试类放行（从严三条件）===\n')
{
  const { main, sibling } = setupProject('xrg2')
  const sibRel = '../' + sibling.split(/[\\/]/).pop()
  const r = shouldBlock({ tool: 'Bash', command: `cd ${sibRel} && npx eslint src`, cwd: main })
  assert(r.blocked === false, `verify 期跨仓注册仓测试类放行（cd ${sibRel} && npx eslint）`)

  const r2 = shouldBlock({ tool: 'Bash', command: `cd ${sibRel} && npm test`, cwd: main })
  assert(r2.blocked === false, 'npm test 形态放行')

  const r3 = shouldBlock({ tool: 'Bash', command: `cd ${sibRel} && npm run build`, cwd: main })
  assert(r3.blocked === true, '写类（npm run build）维持 stage 门禁拦截（fail-closed）')

  const r4 = shouldBlock({ tool: 'Bash', command: `cd ../nonexistent-repo && npx eslint .`, cwd: main })
  assert(r4.blocked === true, '未注册仓不沾放行（维持拦截）')

  const r5 = shouldBlock({ tool: 'Bash', command: `cd ${sibRel} && rm -rf src`, cwd: main })
  assert(r5.blocked === true, '混合危险段（rm -rf）维持拦截')

  const r6 = shouldBlock({ tool: 'Bash', command: `cd ${sibRel} && npx eslint . && npm run deploy`, cwd: main })
  assert(r6.blocked === true, '测试类后混非测试段（npm run deploy）不放行')
}

console.log('\n=== ② worktree cwd：锚点纠偏留痕（放行不变）===\n')
{
  const { main, sibling } = setupProject('xrg3')
  // 真实形态：worktree 物理位于主仓 storage 下（findProjectRoot 从 worktree 向上命中主仓
  // .sillyspec/local.yaml；native 模式 meta.worktreePath 指向该目录）
  const wtDir = join(main, '.sillyspec', '.runtime', 'worktrees', 'c-xrepo', 'wt')
  mkdirSync(wtDir, { recursive: true })
  const metaDir = join(main, '.sillyspec', '.runtime', 'worktrees', 'c-xrepo')
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: 'c-xrepo', mode: 'native-worktree', worktreePath: wtDir,
  }))
  const sibRel = '../' + sibling.split(/[\\/]/).pop()
  const errs = []
  const origErr = console.error
  console.error = (...a) => errs.push(a.join(' '))
  try {
    const r = shouldBlock({ tool: 'Bash', command: `cd ${sibRel} && npx eslint src`, cwd: wtDir })
    assert(r.blocked === false, 'worktree cwd 全放行不变')
    assert(errs.some(e => e.includes('跨仓锚点纠偏') && e.includes('fe-repo') && e.includes('真实路径')),
      `纠偏留痕命中（实际 stderr：${JSON.stringify(errs)}）`)
    assert(errs.some(e => e.includes('worktrees 存储目录')), '留痕点明存储目录错位')
    // 正确锚定（绝对路径直指真实兄弟仓）→ 不出纠偏
    errs.length = 0
    shouldBlock({ tool: 'Bash', command: `cd ${sibling.split('\\').join('/')} && npx eslint .`, cwd: wtDir })
    assert(errs.every(e => !e.includes('跨仓锚点纠偏')), '绝对路径正确锚定不出纠偏')
  } finally { console.error = origErr }
}

console.log('\n=== ③ analyzeCrossRepoCd 单元：双基准/未注册/null 形态 ===\n')
{
  const { main, sibling } = setupProject('xrg4')
  const sibRel = '../' + sibling.split(/[\\/]/).pop()
  const inWt = analyzeCrossRepoCd(`cd ${sibRel} && npx eslint .`, join(main, '.sillyspec', '.runtime', 'worktrees', 'c-xrepo'), main, true)
  assert(inWt && inWt.hits.length === 1 && inWt.hits[0].key === 'fe-repo', '意图基准命中注册仓')
  assert(inWt.hits[0].shellResolved !== inWt.hits[0].resolved, 'shell 基准与意图基准备析（worktree 错位形态）')

  const inMain = analyzeCrossRepoCd(`cd ${sibRel} && npx eslint .`, main, main, false)
  assert(inMain && inMain.hits[0].shellResolved === inMain.hits[0].resolved, '主仓 cwd 双基准合一')

  assert(analyzeCrossRepoCd('ls -la', main, main, false) === null, '无 cd 段 → null')
  assert(analyzeCrossRepoCd('cd ../nope && npx eslint .', main, main, false) === null, '未注册目标 → null')
}

if (failed > 0) {
  console.error(`\n❌ ${failed} 失败 / ${passed} 通过`)
  process.exit(1)
}
console.log(`\n✅ ${passed} 通过 / 0 失败`)
for (const c of cleanups) c()
