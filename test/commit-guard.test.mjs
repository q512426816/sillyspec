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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync, execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { analyzeStagedFace } from '../src/commit-guard.js'

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
  const auditPath = join(root, '.sillyspec', '.runtime', 'write-audit.jsonl')
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

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟，残留交给 tmpdir 清理 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
