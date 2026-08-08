/**
 * concurrent-detect 纯函数测试（task-01）。
 *
 * 覆盖 detectConcurrentChanges 的四路分类 + formatConcurrentWarning 的格式化：
 *   - foreignFiles：脏文件含本变更(ownFiles)+他者业务文件+metadata → 只含他者业务文件
 *   - otherActiveChanges：脏文件落他者 changes 目录 → 去重变更名；排除 changeName + linkedChanges
 *   - ownFiles baseline 排除（多 agent 脏工作树场景，D-001）
 *   - gitError fail-open（FR-04）：safeGit 失败 → hasForeign:false + gitError，不抛
 *   - trim:false（D-004）：首行路径不丢首字符（含 space-leading ` M` 与 `??` 两路）
 *   - formatConcurrentWarning：hasForeign:false→null；有则含文件清单+pathspec 提示
 *
 * 造真实 git fixture（os.tmpdir 隔离），复用 audit-quick-completion.test.mjs 的 fixture 风格。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { detectConcurrentChanges, formatConcurrentWarning } from '../src/run/concurrent-detect.js'

let failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'cdetect-'))
  tmpRoots.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  // 不 gitignore .sillyspec/：本测试要 changes/quicklog 下的脏文件出现在 git status。
  writeFileSync(join(d, 'package.json'), '{}\n')
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}

// 在 cwd 下造一个已提交的基线文件（用于后续 tracked-modify，避免 untracked 目录折叠）。
function commitFile(d, rel, content) {
  const full = join(d, rel)
  mkdirSync(join(d, ...rel.split('/').slice(0, -1)), { recursive: true })
  writeFileSync(full, content)
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m base', { cwd: d, stdio: 'pipe' })
}

console.log('--- detectConcurrentChanges / formatConcurrentWarning ---')

// case 1: foreignFiles 分类——ownFiles(本变更)+他者业务文件+metadata → 只含他者业务文件
{
  const d = makeRepo()
  commitFile(d, 'src/my-quick.js', 'export const x = 1\n')
  commitFile(d, 'src/other-agent.js', 'export const y = 1\n')
  commitFile(d, '.sillyspec/quicklog/2026.md', '# log\n')
  // 制造脏：改自己的 + 改他者的 + 改 quicklog metadata
  writeFileSync(join(d, 'src/my-quick.js'), 'export const x = 2\n')
  writeFileSync(join(d, 'src/other-agent.js'), 'export const y = 2\n')
  writeFileSync(join(d, '.sillyspec/quicklog/2026.md'), '# log updated\n')

  const r = detectConcurrentChanges(d, {
    changeName: 'my-quick-task',
    linkedChanges: [],
    ownFiles: ['src/my-quick.js'],
  })
  assert(r.hasForeign === true, `case1 hasForeign=true（实际 ${r.hasForeign}）`)
  assert(r.foreignFiles.includes('src/other-agent.js'), `case1 foreignFiles 含他者业务文件 src/other-agent.js（实际 ${JSON.stringify(r.foreignFiles)}）`)
  assert(!r.foreignFiles.includes('src/my-quick.js'), `case1 foreignFiles 排除 ownFiles src/my-quick.js`)
  assert(!r.foreignFiles.some(f => f.includes('quicklog')), `case1 foreignFiles 排除 quicklog metadata（实际 ${JSON.stringify(r.foreignFiles)}）`)
  assert(r.gitError === null, `case1 gitError=null（实际 ${r.gitError}）`)
}

// case 2: otherActiveChanges——脏文件落他者 changes 目录 → 去重；排除 changeName + linkedChanges
{
  const d = makeRepo()
  // 同一他者变更下两个文件（测去重）
  commitFile(d, '.sillyspec/changes/other-agent-x/design.md', '# d\n')
  commitFile(d, '.sillyspec/changes/other-agent-x/tasks.md', '# t\n')
  // 本变更目录 + 关联变更目录（均应从 otherActiveChanges 排除）
  commitFile(d, '.sillyspec/changes/my-quick-task/notes.md', '# n\n')
  commitFile(d, '.sillyspec/changes/shared-dep/link.md', '# l\n')
  // 全量脏
  writeFileSync(join(d, '.sillyspec/changes/other-agent-x/design.md'), '# d2\n')
  writeFileSync(join(d, '.sillyspec/changes/other-agent-x/tasks.md'), '# t2\n')
  writeFileSync(join(d, '.sillyspec/changes/my-quick-task/notes.md'), '# n2\n')
  writeFileSync(join(d, '.sillyspec/changes/shared-dep/link.md'), '# l2\n')

  const r = detectConcurrentChanges(d, {
    changeName: 'my-quick-task',
    linkedChanges: ['shared-dep'],
  })
  assert(r.otherActiveChanges.length === 1, `case2 otherActiveChanges 去重为 1 个（实际 ${JSON.stringify(r.otherActiveChanges)}）`)
  assert(r.otherActiveChanges.includes('other-agent-x'), `case2 otherActiveChanges 含 other-agent-x`)
  assert(!r.otherActiveChanges.includes('my-quick-task'), `case2 otherActiveChanges 排除 changeName 自身`)
  assert(!r.otherActiveChanges.includes('shared-dep'), `case2 otherActiveChanges 排除 linkedChanges shared-dep`)
}

// case 3: ownFiles 含 baseline 文件时不进 foreignFiles（多 agent 脏工作树，D-001 相关）
// 场景：工作树里脏文件全是本会话计划内的文件（其他 agent 也在改，但这几个是我的）→ foreignFiles 空
{
  const d = makeRepo()
  commitFile(d, 'src/planned-a.js', 'a1\n')
  commitFile(d, 'src/planned-b.js', 'b1\n')
  writeFileSync(join(d, 'src/planned-a.js'), 'a2\n')
  writeFileSync(join(d, 'src/planned-b.js'), 'b2\n')

  const r = detectConcurrentChanges(d, {
    changeName: 'my-task',
    linkedChanges: [],
    ownFiles: ['src/planned-a.js', 'src/planned-b.js'],
  })
  assert(r.foreignFiles.length === 0, `case3 脏文件全在 ownFiles → foreignFiles 空（实际 ${JSON.stringify(r.foreignFiles)}）`)
  assert(r.hasForeign === false, `case3 hasForeign=false（实际 ${r.hasForeign}）`)
}

// case 4: gitError fail-open——非 git 目录 safeGit 失败 → hasForeign:false + gitError，不抛
{
  const nonGit = mkdtempSync(join(tmpdir(), 'cdetect-nongit-'))
  tmpRoots.push(nonGit)
  let r
  let threw = false
  try {
    r = detectConcurrentChanges(nonGit, { changeName: 'my-task', linkedChanges: [], ownFiles: [] })
  } catch (e) {
    threw = true
    r = { hasForeign: null, foreignFiles: null, otherActiveChanges: null, gitError: null, _err: String(e) }
  }
  assert(!threw, `case4 非 git 目录不抛异常`)
  assert(r.hasForeign === false, `case4 fail-open hasForeign=false（实际 ${r.hasForeign}）`)
  assert(typeof r.gitError === 'string' && r.gitError.length > 0, `case4 gitError 填非空错误串（实际 ${JSON.stringify(r.gitError)}）`)
  assert(Array.isArray(r.foreignFiles) && r.foreignFiles.length === 0, `case4 foreignFiles 空（实际 ${JSON.stringify(r.foreignFiles)}）`)
  assert(Array.isArray(r.otherActiveChanges) && r.otherActiveChanges.length === 0, `case4 otherActiveChanges 空（实际 ${JSON.stringify(r.otherActiveChanges)}）`)
}

// case 5a: trim:false——首行 `??` 未跟踪文件路径不丢首字符（D-004，字面：首文件未跟踪）
{
  const d = makeRepo()
  // 全未跟踪（根级文件不折叠），porcelain 首行 `?? aaa-untracked.js`
  writeFileSync(join(d, 'aaa-untracked.js'), 'x\n')
  writeFileSync(join(d, 'bbb-untracked.js'), 'y\n')

  const r = detectConcurrentChanges(d, { changeName: 'my-task', linkedChanges: [], ownFiles: [] })
  assert(r.foreignFiles.includes('aaa-untracked.js'), `case5a 首行未跟踪文件路径完整 aaa-untracked.js（实际 ${JSON.stringify(r.foreignFiles)}）`)
  assert(!r.foreignFiles.some(f => f === 'aa-untracked.js' || f === 'aaa-untracked.j'), `case5a 首字符未被削（无 aa-untracked.js 截断）`)
}

// case 5b: trim:false——space-leading 首行 ` M` tracked-modify 路径不丢首字符（D-004 真正命中的坑）
// 若误用 trim:true，整段 trim 会削首行前导空格 → parsePorcelainPath slice(3) 丢首字符（rc/lib.js）
{
  const d = makeRepo()
  commitFile(d, 'src/lib.js', 'v1\n')      // tracked，后续 unstaged modify → porcelain ` M src/lib.js`
  writeFileSync(join(d, 'src/lib.js'), 'v2\n')
  writeFileSync(join(d, 'zzz-untracked.js'), 'u\n')  // untracked 排在 ` M` 之后

  const r = detectConcurrentChanges(d, { changeName: 'my-task', linkedChanges: [], ownFiles: [] })
  assert(r.foreignFiles.includes('src/lib.js'), `case5b space-leading 首行 tracked-modify 路径完整 src/lib.js（实际 ${JSON.stringify(r.foreignFiles)}）→ 证明 trim:false 生效`)
  assert(!r.foreignFiles.some(f => f.startsWith('rc/')), `case5b 无 rc/ 截断（trim:false 未削首行前导空格）`)
}

// case 6: formatConcurrentWarning——hasForeign:false→null；有则含清单+pathspec 提示
{
  // 6a: hasForeign false → null
  assert(formatConcurrentWarning({ hasForeign: false, foreignFiles: [], otherActiveChanges: [], gitError: null }) === null, `case6a hasForeign:false → null`)
  // 6b: null 输入 → null
  assert(formatConcurrentWarning(null) === null, `case6b null 输入 → null`)

  // 6c: 仅 foreignFiles
  const w6c = formatConcurrentWarning({ hasForeign: true, foreignFiles: ['src/x.js'], otherActiveChanges: [], gitError: null })
  assert(typeof w6c === 'string' && w6c.includes('src/x.js'), `case6c 字符串含 foreignFiles 清单 src/x.js`)
  assert(w6c.includes('pathspec'), `case6c 含 pathspec 隔离提示`)

  // 6d: 仅 otherActiveChanges——文案用「脏变更目录」/git-dirty，不用「活跃」（D-005）
  const w6d = formatConcurrentWarning({ hasForeign: true, foreignFiles: [], otherActiveChanges: ['other-task'], gitError: null })
  assert(w6d.includes('other-task'), `case6d 字符串含 otherActiveChanges other-task`)
  assert(w6d.includes('脏变更目录') || w6d.includes('git-dirty'), `case6d 文案用「脏变更目录」或 git-dirty（D-005）`)
  assert(!w6d.includes('活跃'), `case6d 文案不用「活跃」防与 DB active 混淆（D-005）`)
  assert(w6d.includes('pathspec'), `case6d 含 pathspec 隔离提示`)

  // 6e: 两者并存
  const w6e = formatConcurrentWarning({ hasForeign: true, foreignFiles: ['a.js', 'b.js'], otherActiveChanges: ['t1', 't2'], gitError: null })
  assert(w6e.includes('a.js') && w6e.includes('b.js') && w6e.includes('t1') && w6e.includes('t2'), `case6e 两者并存均入串`)
}

// case 7: 端到端——真实 fixture 跑 detect → format，warn 非空
{
  const d = makeRepo()
  commitFile(d, 'src/other.js', 'o1\n')
  writeFileSync(join(d, 'src/other.js'), 'o2\n')
  const r = detectConcurrentChanges(d, { changeName: 'my-task', linkedChanges: [], ownFiles: [] })
  const w = formatConcurrentWarning(r)
  assert(r.hasForeign === true && typeof w === 'string' && w.includes('src/other.js'), `case7 端到端 detect→format 产出含文件 warn`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
