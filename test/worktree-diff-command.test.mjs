/**
 * sillyspec worktree diff 子命令 CLI 测试
 *
 * 测 commit fc2ad3b 新实现的 `sillyspec worktree diff <change> [--base <commit>]`：
 *   - 错误分支：缺 change 名 → usage；无 meta → 退出 1；worktree 目录缺失 → 退出 1
 *   - happy：worktree 相对 base 有改动 → stdout 含改动 diff；无改动 → 「无变更」提示
 *   - base 解析：显式 --base 覆盖 meta.baseHash
 *
 * 范式照 test/worktree-has-unapplied-changes.test.mjs（mkdtemp → git init → baseline commit →
 * git worktree add → 手写 meta.json）+ test/cli-top-level-aliases.test.mjs（spawnSync bin/sillyspec.js）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliBin = path.resolve(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { spawnSync(cmd, { cwd, shell: true, stdio: 'pipe', encoding: 'utf8' }) }
function rev(cmd, cwd) { return spawnSync(cmd, { cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).stdout.trim() }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtdiff-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  sh('git config commit.gpgsign false', d)
  fs.writeFileSync(path.join(d, 'a.txt'), 'a\n')
  fs.writeFileSync(path.join(d, 'b.txt'), 'b\n')
  sh('git add -A && git commit -m init', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  return d
}
function makeWorktree(d) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  return wtDir
}
function writeMeta(wtDir, base, overrides = {}) {
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash: base, baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
    ...overrides,
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
}
// 多次重试删（Windows 文件锁），参照 cleanSillySpec；删 d 即连带 worktree 注册一起清。
function cleanup(d) {
  process.chdir(os.tmpdir())
  for (let r = 0; r < 20; r++) {
    try { fs.rmSync(d, { recursive: true, force: true }); if (!fs.existsSync(d)) return } catch {}
    spawnSync('sleep', ['0.1'], { shell: true })
  }
  try { fs.renameSync(d, d + '-orphan') } catch {}
}
function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}

console.log('=== sillyspec worktree diff 子命令 ===\n')

console.log('--- ① 缺 change 名 → usage 错误，exit 1 ---')
{
  const d = setupRepo()
  const r = runCLI(['worktree', 'diff'], d)
  assert(r.status === 1, `缺名 → exit 1（实际 ${r.status}）`)
  assert(r.combined.includes('用法') && r.combined.includes('worktree diff'), '含 usage 提示')
  cleanup(d)
}

console.log('--- ② 无 meta（worktree 未注册）→ 退出 1 + 未找到 meta ---')
{
  const d = setupRepo(); makeWorktree(d) // 不写 meta.json
  const r = runCLI(['worktree', 'diff', 'tc'], d)
  assert(r.status === 1, `无 meta → exit 1（实际 ${r.status}）`)
  assert(r.combined.includes('未找到 worktree meta'), '含「未找到 worktree meta」')
  cleanup(d)
}

console.log('--- ③ worktree 目录不存在（meta 指向缺失路径）→ 退出 1 + 目录不存在 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  writeMeta(wtDir, base, { worktreePath: path.join(d, 'does-not-exist') })
  const r = runCLI(['worktree', 'diff', 'tc'], d)
  assert(r.status === 1, `目录缺失 → exit 1（实际 ${r.status}）`)
  assert(r.combined.includes('worktree 目录不存在'), '含「worktree 目录不存在」')
  cleanup(d)
}

console.log('--- ④ 有改动（commit vs base）→ stdout 含改动 diff，exit 0 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'new-content\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  writeMeta(wtDir, base)
  const r = runCLI(['worktree', 'diff', 'tc'], d)
  assert(r.status === 0, `有改动 → exit 0（实际 ${r.status}）`)
  assert(r.stdout.includes('wt-a') && r.stdout.includes('new-content'), `stdout 含 a.txt 改动 + new.txt（实际 stdout 前 200: ${r.stdout.slice(0, 200)}）`)
  assert(r.stdout.includes('a.txt'), 'diff 含文件名 a.txt')
  cleanup(d)
}

console.log('--- ⑤ 无改动（worktree 干净 vs base）→ 「无变更」提示，exit 0 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  writeMeta(wtDir, base) // 不改动
  const r = runCLI(['worktree', 'diff', 'tc'], d)
  assert(r.status === 0, `无改动 → exit 0（实际 ${r.status}）`)
  assert(r.stdout.includes('无变更'), `stdout 含「无变更」（实际: ${r.stdout.slice(0, 120)}）`)
  cleanup(d)
}

console.log('--- ⑥ dirty 工作区（未 commit）也算改动（diff 读工作区）→ exit 0 含改动 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'dirty-a\n') // 不 commit
  writeMeta(wtDir, base)
  const r = runCLI(['worktree', 'diff', 'tc'], d)
  assert(r.status === 0, `dirty → exit 0（实际 ${r.status}）`)
  assert(r.stdout.includes('dirty-a'), 'stdout 含未提交改动（diff 读工作区非 commit）')
  cleanup(d)
}

console.log('--- ⑦ --base 覆盖 meta.baseHash：显式指定另一个 commit ---')
{
  const d = setupRepo()
  fs.writeFileSync(path.join(d, 'a.txt'), 'v2\n'); sh('git add -A && git commit -m c1', d)
  const base = rev('git rev-parse HEAD', d) // meta.baseHash = c1
  const wtDir = makeWorktree(d)
  // 再在 worktree 上改 + commit，相对 base(c1) 有 diff；但指定 --base 为 init commit，diff 应更大
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n'); sh('git add -A && git commit -m wt', wtDir)
  writeMeta(wtDir, base)
  const initCommit = rev('git rev-list --max-parents=0 HEAD', d) // 第一个 commit
  const r = runCLI(['worktree', 'diff', 'tc', '--base', initCommit], d)
  assert(r.status === 0, `--base 指定 → exit 0（实际 ${r.status}）`)
  assert(r.stdout.includes('wt-a'), 'stdout 含改动（--base 生效）')
  cleanup(d)
}

console.log('--- ⑧ help 含 diff 子命令 ---')
{
  const d = setupRepo()
  const r = runCLI(['worktree', '--help'], d)
  assert(r.combined.includes('worktree diff'), 'worktree --help 列出 diff 子命令')
  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
