/**
 * commit-guard 提交边界守卫测试（2026-09-17 裸 commit 扫入事故的工具化兜底）。
 *
 * 覆盖：
 *   单元（analyzeStagedFace 纯函数，无 git 依赖）：
 *     1. 空输入 / 普通提交（无 quicklog 无 changes）→ 无警告
 *     2. quick 正常提交（staged ⊆ 声明面 ∪ quicklog 账本自身）→ 无警告
 *     3. quick 超声明面（夹带 changes/other/ 文件）→ quick_declared_face_exceeded
 *     4. quicklog 账本/补丁自身不告警（QUICKLOG.md / ql.patch / ql.json）
 *     5. 跨两变更目录 → multi_change_dirs_staged；archive/ 前缀同名归并
 *     6. ql json 无 declared rows（rows 非数组/缺 declared）→ 不产 S1 信号
 *   端到端（tmp git 仓跑 node src/commit-guard.js）：
 *     7. 无 staged → exit 0 静默
 *     8. 超面 staged → exit 0 + stderr 警告 + write-audit.jsonl 留痕 via=commit-guard
 *     9. 非 git 目录 → exit 0 静默（fail-open）
 *     10. 真实仓钩子形态自检：.husky/pre-commit 存在且含 commit-guard 调用 + || true
 *
 * 风格：自研 assert + tmp git 仓 fixture（同 doctor-archive-integrity.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync, execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { analyzeStagedFace, parseLsFiles, analyzeIndexDivergence } from '../src/commit-guard.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

function sh(cmd, cwd) {
  return execFileSync(cmd, { cwd, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
}

function runGuard(cwd) {
  const r = spawnSync(process.execPath, [join(cliRoot, 'src', 'commit-guard.js')], {
    cwd,
    encoding: 'utf8',
  })
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' }
}

const QL_JSON_OK = { rows: [
  { path: 'src/a.js', declared: true },
  { path: 'test/a.test.mjs', declared: true },
] }

// ── 1. 空输入 / 普通提交 → 无警告 ──
assert(analyzeStagedFace([], {}).length === 0, '1a 空 staged → 无警告')
assert(analyzeStagedFace(['src/a.js', 'test/a.test.mjs', 'README.md'], {}).length === 0, '1b 普通提交（无 quicklog/changes）→ 无警告')

// ── 2. quick 正常提交 → 无警告 ──
{
  const staged = ['src/a.js', 'test/a.test.mjs', '.sillyspec/quicklog/QUICKLOG-x.md', '.sillyspec/quicklog/patches/ql-1.json', '.sillyspec/quicklog/patches/ql-1.patch']
  assert(analyzeStagedFace(staged, { '.sillyspec/quicklog/patches/ql-1.json': QL_JSON_OK }).length === 0, '2 staged ⊆ 声明面 ∪ quicklog 自身 → 无警告')
}

// ── 3. quick 超声明面 → quick_declared_face_exceeded ──
{
  const staged = ['src/a.js', 'test/a.test.mjs', '.sillyspec/quicklog/QUICKLOG-x.md', '.sillyspec/quicklog/patches/ql-1.json', '.sillyspec/changes/2026-09-17-other/f.md']
  const w = analyzeStagedFace(staged, { '.sillyspec/quicklog/patches/ql-1.json': QL_JSON_OK })
  assert(w.length === 1 && w[0].signal === 'quick_declared_face_exceeded', '3a 超面 → S1 信号')
  assert(w[0].files.join() === '.sillyspec/changes/2026-09-17-other/f.md', '3b 指名夹带文件（quicklog 自身与声明面不告）')
}

// ── 4. quicklog 账本/补丁自身不告警 ──
{
  const staged = ['.sillyspec/quicklog/QUICKLOG-x.md', '.sillyspec/quicklog/patches/ql-1.json', '.sillyspec/quicklog/patches/ql-1.patch']
  assert(analyzeStagedFace(staged, { '.sillyspec/quicklog/patches/ql-1.json': QL_JSON_OK }).length === 0, '4 纯账本提交（无声明外文件）→ 无警告')
}

// ── 5. 跨两变更目录 → multi_change_dirs_staged ──
{
  const staged = ['.sillyspec/changes/change-a/f.md', '.sillyspec/changes/change-b/f.md', 'src/a.js']
  const w = analyzeStagedFace(staged, {})
  assert(w.length === 1 && w[0].signal === 'multi_change_dirs_staged', '5a 两变更目录 → S2 信号')
  assert(w[0].files.length === 2, '5b files 只含 changes/ 面文件')
  const wArch = analyzeStagedFace(['.sillyspec/changes/archive/change-a/f.md', '.sillyspec/changes/change-b/f.md'], {})
  assert(wArch.length === 1 && wArch[0].signal === 'multi_change_dirs_staged', '5c archive/ 前缀也算变更名（a≠b 仍警告）')
  const wSame = analyzeStagedFace(['.sillyspec/changes/change-a/f.md', '.sillyspec/changes/change-a/g.md'], {})
  assert(wSame.length === 0, '5d 同一变更目录多文件 → 不警告')
}

// ── 6. ql json 缺 declared → S1 静默（不误报） ──
assert(analyzeStagedFace(['.sillyspec/quicklog/patches/ql-1.json', 'src/a.js'], { '.sillyspec/quicklog/patches/ql-1.json': { rows: [{ path: 'src/a.js', declared: false }] } }).length === 0, '6a rows 全 undeclared（声明面空）→ 不对账')
assert(analyzeStagedFace(['.sillyspec/quicklog/patches/ql-1.json', 'src/a.js'], { '.sillyspec/quicklog/patches/ql-1.json': { broken: true } }).length === 0, '6b rows 非数组 → 跳过该信号源')

// ── 7. 端到端：无 staged → exit 0 静默 ──
{
  const root = makeTmpDir('cg-7-')
  sh('git init -q', root)
  const r = runGuard(root)
  assert(r.code === 0 && r.stderr === '', '7 无 staged → exit 0 静默')
}

// ── 8. 端到端：超面 staged → exit 0 + 警告 + write-audit 留痕 ──
{
  const root = makeTmpDir('cg-8-')
  sh('git init -q', root)
  writeFileSync(join(root, 'src-a.js'), 'a\n')
  mkdirSync(join(root, '.sillyspec', 'quicklog', 'patches'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'quicklog', 'patches', 'ql-20260917-001-aaaa.json'), JSON.stringify(QL_JSON_OK))
  mkdirSync(join(root, '.sillyspec', 'changes', '2026-09-17-other'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'changes', '2026-09-17-other', 'f.md'), 'x\n')
  sh('git add -A', root)
  // 造声明面：把 src-a.js 换名进声明再改 staged——直接用 json 声明 src-a.js，夹带 changes/ 文件
  writeFileSync(join(root, '.sillyspec', 'quicklog', 'patches', 'ql-20260917-001-aaaa.json'), JSON.stringify({ rows: [{ path: 'src-a.js', declared: true }, { path: '.sillyspec/quicklog/patches/ql-20260917-001-aaaa.json', declared: true }] }))
  sh('git add -A', root)
  const r = runGuard(root)
  assert(r.code === 0, '8a 超面 staged → exit 0（只警告不阻断）')
  assert(r.stderr.includes('[commit-guard]') && r.stderr.includes('2026-09-17-other'), '8b stderr 警告指名夹带文件')
  const auditPath = join(root, '.sillyspec', '.runtime', 'temp', 'write-audit.jsonl')
  assert(existsSync(auditPath), '8c write-audit.jsonl 已留痕')
  const auditLine = readFileSync(auditPath, 'utf8').trim().split('\n').pop()
  const audit = JSON.parse(auditLine)
  assert(audit.via === 'commit-guard' && Array.isArray(audit.files) && audit.files.length > 0, '8d 审计行 via=commit-guard 且含文件清单')
}

// ── 9. 端到端：非 git 目录 → exit 0 静默（fail-open） ──
{
  const root = makeTmpDir('cg-9-')
  const r = runGuard(root)
  assert(r.code === 0 && r.stderr === '', '9 非 git 目录 → exit 0 静默')
}

// ── 10. 真实仓钩子形态自检 ──
{
  const hook = readFileSync(join(cliRoot, '.husky', 'pre-commit'), 'utf8')
  assert(hook.includes('commit-guard.js') && hook.includes('|| true'), '10 .husky/pre-commit 调 commit-guard 且 || true 兜底')
}

// ── S3（2026-10-13-commit-guard-s3）：pathspec 提交的暂存区旁路检测 ──
// 机理实证：pathspec 提交时钩子的 GIT_INDEX_FILE 指向 next-index 临时索引（HEAD+路径工作树
// 内容）；真实暂存区在 .git/index。两索引同路径 blob 不一致 = 提交将携带未暂存工作树内容。

// ── 11-15. analyzeIndexDivergence 纯函数四态 ──
{
  const e = (path, sha, stage = 0) => ({ mode: '100644', sha, stage, path })
  assert(analyzeIndexDivergence([e('a.txt', 'X')], [e('a.txt', 'X')]).length === 0, '11 同 sha → 零告')
  const w12 = analyzeIndexDivergence([e('a.txt', 'X')], [e('a.txt', 'Y')])
  assert(w12.length === 1 && w12[0].signal === 'index_divergence_on_pathspec_commit' && w12[0].files.join() === 'a.txt', '12 异 sha → S3 信号点名路径')
  const w13 = analyzeIndexDivergence([e('new.txt', 'X')], [])
  assert(w13.length === 1 && w13[0].files.join() === 'new.txt', '13 仅临时索引（未 add 的新文件随 pathspec 提交）→ 点名')
  assert(analyzeIndexDivergence([], [e('staged-only.txt', 'Y')]).length === 0, '14 仅真实索引（staged 但不在本次 pathspec）→ 不点名')
  assert(analyzeIndexDivergence([e('c.txt', 'X', 1)], [e('c.txt', 'Y')]).length === 0, '15 冲突态（stage>0）条目忽略')
  const parsed = parseLsFiles('100644 abcdef1234567890abcdef1234567890abcdef12 0\tp.txt\r\n100644 fedcba1234567890fedcba1234567890fedcba12 1\tq.txt\nnoise')
  assert(parsed.length === 2 && parsed[0].path === 'p.txt' && parsed[0].stage === 0 && parsed[1].stage === 1, '15b parseLsFiles 解析 ls-files -s（CRLF/噪声行容错）')
}

// ── 16-18. 真实 git 钩子集成三场景 ──
function makeHookRepo(prefix) {
  const root = makeTmpDir(prefix)
  sh('git init -q -b main', root)
  sh('git config user.email t@t', root)
  sh('git config user.name t', root)
  mkdirSync(join(root, '.sillyspec'), { recursive: true }) // write-audit 留痕需要
  writeFileSync(join(root, 'a.txt'), 'base\n')
  writeFileSync(join(root, 'b.txt'), 'base\n')
  sh('git add -A', root)
  sh('git commit -qm base', root)
  const guardAbs = join(cliRoot, 'src', 'commit-guard.js').split('\\').join('/')
  const hookPath = join(root, '.git', 'hooks', 'pre-commit')
  writeFileSync(hookPath, `#!/bin/sh\nnode "${guardAbs}" || true\n`)
  chmodSync(hookPath, 0o755)
  return root
}

function gitCommit(root, args) {
  // spawnSync：成功路径也要拿 stderr（execFileSync 成功时不暴露子进程 stderr——钩子警告会丢）
  const r = spawnSync('git', ['commit', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, stderr: String(r.stderr || '') }
}

// 16. 055080e4 形态：staged 净版 + 工作树外来行 + pathspec 提交 → S3 必告警且放行
{
  const root = makeHookRepo('cg-16-')
  writeFileSync(join(root, 'a.txt'), 'mine-clean\n')
  sh('git add a.txt', root)
  writeFileSync(join(root, 'a.txt'), 'mine-clean\nFOREIGN-HUNK\n') // 模拟并行会话在途编辑
  const r = gitCommit(root, ['-qm', 'x', '--', 'a.txt'])
  assert(r.code === 0, '16a pathspec 提交放行（fail-open 恒 exit 0）')
  assert(r.stderr.includes('[commit-guard]') && r.stderr.includes('a.txt') && /未暂存/.test(r.stderr), `16b S3 警告点名路径与机理（实际 stderr：${r.stderr.slice(0, 200)}）`)
  assert(sh('git show HEAD:a.txt', root).includes('FOREIGN-HUNK'), '16c 事故形态复现：外来行确被携带（检测面与事实一致）')
  const auditPath = join(root, '.sillyspec', '.runtime', 'temp', 'write-audit.jsonl')
  assert(existsSync(auditPath) && readFileSync(auditPath, 'utf8').includes('index_divergence'), '16d write-audit 留痕 signal=index_divergence')
}

// 17. 干净规则 11 流转：add 净版后不再改 + 同清单 pathspec 提交 → 零告警
{
  const root = makeHookRepo('cg-17-')
  writeFileSync(join(root, 'b.txt'), 'clean\n')
  sh('git add b.txt', root)
  const r = gitCommit(root, ['-qm', 'x', '--', 'b.txt'])
  assert(r.code === 0 && !r.stderr.includes('[commit-guard]'), `17 干净 pathspec 流转零 S3 误报（实际 stderr：${r.stderr.slice(0, 120)}）`)
}

// 18. 普通全量提交：staged 净版 + 工作树多余行（无 pathspec）→ 提交取索引、零告警零携带
{
  const root = makeHookRepo('cg-18-')
  writeFileSync(join(root, 'a.txt'), 'staged\n')
  sh('git add a.txt', root)
  writeFileSync(join(root, 'a.txt'), 'staged\nWORKTREE-EXTRA\n') // 全量提交不携带此行
  const r = gitCommit(root, ['-qm', 'x'])
  assert(r.code === 0 && !r.stderr.includes('[commit-guard]'), '18a 全量提交零 S3 误报')
  assert(!sh('git show HEAD:a.txt', root).includes('WORKTREE-EXTRA'), '18b 全量提交取索引不取工作树（携带不发生——语义面正确）')
}

// 19. linked worktree（评审 P1 清偿锚）：干净流转零误报 + 携带形态仍必告警
{
  const root = makeHookRepo('cg-19-')
  const wt = join(root, 'wt')
  sh(`git worktree add -q "${wt.split('\\').join('/')}" -b wt-branch`, root)
  // 19a 干净规则 11 流转（worktree 内 pathspec 提交）→ 零告警（P1 误报形态：曾把全文件判偏差）
  writeFileSync(join(wt, 'b.txt'), 'clean-wt\n')
  sh('git add b.txt', wt)
  const r19a = gitCommit(wt, ['-qm', 'x', '--', 'b.txt'])
  assert(r19a.code === 0 && !r19a.stderr.includes('[commit-guard]'), `19a worktree 干净流转零 S3 误报（实际 stderr：${r19a.stderr.slice(0, 160)}）`)
  // 19b worktree 内携带形态 → 仍必告警（真索引在 .git/worktrees/<n>/index，resolve 路由）
  writeFileSync(join(wt, 'a.txt'), 'wt-clean\n')
  sh('git add a.txt', wt)
  writeFileSync(join(wt, 'a.txt'), 'wt-clean\nWT-FOREIGN\n')
  const r19b = gitCommit(wt, ['-qm', 'y', '--', 'a.txt'])
  assert(r19b.code === 0, '19b worktree pathspec 提交放行')
  assert(r19b.stderr.includes('[commit-guard]') && r19b.stderr.includes('a.txt'), `19b worktree 携带形态仍告警（实际 stderr：${r19b.stderr.slice(0, 160)}）`)
  assert(sh('git show HEAD:a.txt', wt).includes('WT-FOREIGN'), '19c worktree 事故形态复现（携带事实在场）')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟，残留交给 tmpdir 清理 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
