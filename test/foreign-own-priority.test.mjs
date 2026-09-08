// foreign 排除 own 优先（坑 verify-reconcile-own-file-foreign-false-positive，2026-09-09 实证）：
// 当前变更声明并真实修改的文件，被任一未归档旧变更的陈旧 design 声明「也声明过」时，
// 旧 foreign-first 把它从对账 actual 集剔除 → 声明落②类「声明未做」假红阻断 verify --done。
// 修法（缺陷文档建议 A）：splitOwnVsForeignDiffFiles 改 own 优先——本变更 own 声明集
// （design §6 ∪ task allowed_paths/target_files；quick 会话 = guard.allowedFiles）内的文件
// 永不判 foreign；他者声明的真 foreign 照旧剔除。
//
// 隔离：fixture 落 os.tmpdir()，绝不碰真实 .sillyspec。
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { splitOwnVsForeignDiffFiles } from '../src/foreign-declared.js'
import { reconcileTargetFiles } from '../src/verify-postcheck.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return (r.stdout || '').trim()
}

console.log('\n[foreign-own-priority] verify 对账 foreign 误伤修复')

try {
  // ─────────────────────────────────────────
  console.log('\n--- 1. 用户场景复现：双声明文件归 own，reconcile 不再假红 ---')
  {
    const proj = mkTmp('own-pri-')
    git(proj, ['init', '-q'])
    git(proj, ['config', 'user.email', 't@t.local'])
    git(proj, ['config', 'user.name', 't'])
    git(proj, ['config', 'commit.gpgsign', 'false'])
    const src = join(proj, 'frontend', 'src', 'components', 'sessions')
    mkdirSync(src, { recursive: true })
    writeFileSync(join(src, 'session-list-panel.tsx'), 'export const A = 0\n')
    writeFileSync(join(src, 'sessions-portal.tsx'), 'export const B = 0\n')
    writeFileSync(join(proj, 'stale-owned.js'), 'export const C = 0\n')
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    git(proj, ['add', '.'])
    git(proj, ['commit', '-q', '-m', 'init'])
    const baseHash = git(proj, ['rev-parse', 'HEAD'])

    const specBase = join(proj, '.sillyspec')

    // 旧变更（已完成未归档——正是缺陷场景）：design 声明同一对文件 + 一个只有它声明的文件
    const oldChange = join(specBase, 'changes', '2026-09-03-group-chat-archive-delete')
    mkdirSync(oldChange, { recursive: true })
    writeFileSync(join(oldChange, 'design.md'),
      '# 设计\n\n## 文件变更清单\n\n| 序号 | 文件 | 说明 |\n|---|---|---|\n' +
      '| 1 | frontend/src/components/sessions/session-list-panel.tsx | 旧改 |\n' +
      '| 1 | frontend/src/components/sessions/sessions-portal.tsx | 旧改 |\n' +
      '| 1 | stale-owned.js | 旧独有 |\n')

    // 本变更：task 卡 target_files 声明同一对文件（用户场景：task-02/task-03）
    const cur = '2026-09-09-sessions-file-browser-three-pane'
    const curTasks = join(specBase, 'changes', cur, 'tasks')
    mkdirSync(curTasks, { recursive: true })
    writeFileSync(join(curTasks, 'task-01.md'),
      '---\nid: task-01\ntarget_files:\n  - frontend/src/components/sessions/session-list-panel.tsx\n  - frontend/src/components/sessions/sessions-portal.tsx\n---\n# task-01\n')

    // 本变更真实修改（主仓 dirty——无 meta → 对账走 B2 status + foreign 切分，正是触发路径）
    writeFileSync(join(src, 'session-list-panel.tsx'), 'export const A = 1\n')
    writeFileSync(join(src, 'sessions-portal.tsx'), 'export const B = 1\n')
    writeFileSync(join(proj, 'stale-owned.js'), 'export const C = 1\n') // 他者声明、本变更未声明

    // 1a. split 层：双声明文件归 own；stale-owned.js（仅他者声明）仍 foreign
    const dirtyFiles = [
      'frontend/src/components/sessions/session-list-panel.tsx',
      'frontend/src/components/sessions/sessions-portal.tsx',
      'stale-owned.js',
    ]
    const { own, foreign } = splitOwnVsForeignDiffFiles(proj, cur, dirtyFiles, { specBase })
    assert(own.includes('frontend/src/components/sessions/session-list-panel.tsx')
      && own.includes('frontend/src/components/sessions/sessions-portal.tsx'),
      '本变更声明的双声明文件归 own（修复前被判 foreign 剔除）')
    const fFiles = foreign.map(x => x.file)
    assert(!fFiles.includes('frontend/src/components/sessions/session-list-panel.tsx'),
      '双声明文件不再进 foreign 排除集')
    assert(fFiles.includes('stale-owned.js') && foreign[0].owners.includes('2026-09-03-group-chat-archive-delete'),
      '仅他者声明的在途文件照旧剔 foreign（排除语义不放松）')

    // 1b. reconcile 层（用户被拦的现场）：in-place meta → 形态 A/B 取 actual，双声明文件不再落②类
    const metaDir = join(specBase, '.runtime', 'worktrees', cur)
    mkdirSync(metaDir, { recursive: true })
    writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({ changeName: cur, baseHash, mode: 'in-place-fallback', worktreePath: proj }))
    const r = reconcileTargetFiles({ cwd: proj, specBase, changeName: cur })
    assert(r.missing.length === 0,
      `target_files 对账不再误判「声明未做」（missing 实际 ${JSON.stringify(r.missing)}——修复前两文件落此）`)
    assert(r.matched.length === 2, `两文件命中 matched（实际 ${JSON.stringify(r.matched)}）`)
    assert(r.status !== 'missing_declared', `状态不再阻断（实际 ${r.status}）`)
  }

  // ─────────────────────────────────────────
  console.log('\n--- 2. own 声明集三源：design §6 / allowed_paths / quick guard ---')
  {
    const proj = mkTmp('own-pri-src-')
    git(proj, ['init', '-q'])
    git(proj, ['config', 'user.email', 't@t.local'])
    git(proj, ['config', 'user.name', 't'])
    git(proj, ['config', 'commit.gpgsign', 'false'])
    writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
    writeFileSync(join(proj, 'a.js'), 'a\n')
    writeFileSync(join(proj, 'b.js'), 'b\n')
    writeFileSync(join(proj, 'c.js'), 'c\n')
    writeFileSync(join(proj, 'd.js'), 'd\n')
    git(proj, ['add', '.'])
    git(proj, ['commit', '-q', '-m', 'init'])
    const specBase = join(proj, '.sillyspec')

    // 他者变更声明全部四个文件（最大化 foreign 面）。活性收敛要求声明文件仍在主仓
    // dirty 集（未提交）才算在途——四个文件全部保持 dirty。
    for (const f of ['a.js', 'b.js', 'c.js', 'd.js']) writeFileSync(join(proj, f), f + '-dirty\n')
    const other = join(specBase, 'changes', 'other-change')
    mkdirSync(other, { recursive: true })
    writeFileSync(join(other, 'design.md'),
      '# 设计\n\n## 文件变更清单\n\n| 序号 | 文件 | 说明 |\n|---|---|---|\n| 1 | a.js | x |\n| 1 | b.js | x |\n| 1 | c.js | x |\n| 1 | d.js | x |\n')

    // 2a. 本变更 design §6 声明 a.js → own
    const cur1 = 'cur-design'
    const cd1 = join(specBase, 'changes', cur1)
    mkdirSync(cd1, { recursive: true })
    writeFileSync(join(cd1, 'design.md'), '# 设计\n\n## 文件变更清单\n\n| 序号 | 文件 | 说明 |\n|---|---|---|\n| 1 | a.js | 主 |\n')
    const s1 = splitOwnVsForeignDiffFiles(proj, cur1, ['a.js', 'b.js'], { specBase })
    assert(s1.own.includes('a.js') && s1.foreign.map(x => x.file).includes('b.js'),
      'design §6 声明的文件归 own，未声明的照旧 foreign')

    // 2b. task allowed_paths 声明 c.js → own（对账 declaration 源之外的第二 own 源）
    const cur2 = 'cur-allowed'
    const t2 = join(specBase, 'changes', cur2, 'tasks')
    mkdirSync(t2, { recursive: true })
    writeFileSync(join(t2, 'task-01.md'), '---\nid: task-01\nallowed_paths: [c.js]\n---\n# t\n')
    const s2 = splitOwnVsForeignDiffFiles(proj, cur2, ['c.js', 'b.js'], { specBase })
    assert(s2.own.includes('c.js') && s2.foreign.map(x => x.file).includes('b.js'),
      'task allowed_paths 声明的文件归 own')

    // 2c. quick 会话 guard.allowedFiles 声明 d.js → own
    const sid = 'quick-deadbeef'
    const guardDir = join(specBase, '.runtime', 'quick-sessions', sid)
    mkdirSync(guardDir, { recursive: true })
    writeFileSync(join(guardDir, 'guard.json'), JSON.stringify({ allowedFiles: ['d.js'] }))
    const s3 = splitOwnVsForeignDiffFiles(proj, sid, ['d.js', 'b.js'], { specBase })
    assert(s3.own.includes('d.js') && s3.foreign.map(x => x.file).includes('b.js'),
      'quick guard.allowedFiles 声明的文件归 own')

    // 2d. 无任何 own 声明（本变更目录空）→ 退回旧 foreign-first（fail-closed 零回归）
    const s4 = splitOwnVsForeignDiffFiles(proj, 'cur-empty', ['b.js'], { specBase })
    assert(s4.foreign.map(x => x.file).includes('b.js'), '无 own 声明时退回旧行为（他者声明即 foreign）')
  }
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* Windows EPERM 容忍 */ } }
}

if (failures > 0) {
  console.error(`\n[foreign-own-priority] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[foreign-own-priority] ✅ 全部通过')
