/**
 * worktree Windows 长路径回归测试
 * 缺陷：execute-in-place-windows-pitfalls 坑1 —— archive/ 下嵌套的 .runtime/artifacts
 * 超长文件名（>260 字符）让 worktree add 的 checkout 报 "Filename too long" 失败 →
 * 降级 in-place 且主工作区未切分支，直接写代码污染 main。
 *
 * 修复：worktree.js create() 在 worktree add 前，win32 下 `git config core.longpaths true`。
 *
 * 本测试（仅 Windows）：建 minimal git repo + create worktree，断言 repo 的 core.longpaths 被设为 true。
 * 用 worktreeDir 固定 worktreeBase 到临时目录，避开主仓库残留 meta；longpaths 设置用 this.cwd（=临时 repo）。
 * 非 Windows 跳过（longpaths 是 Windows MAX_PATH 概念，代码 win32 分支不执行）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== worktree Windows 长路径回归 ===\n')

if (process.platform !== 'win32') {
  console.log('⏭️  非 Windows 平台，core.longpaths 无意义（代码 win32 分支不执行），跳过')
} else {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-lp-'))
  try {
    execSync('git init', { cwd: d, stdio: 'pipe' })
    execSync('git config user.email "t@t.com"', { cwd: d, stdio: 'pipe' })
    execSync('git config user.name "t"', { cwd: d, stdio: 'pipe' })
    execSync('git commit --allow-empty -m init', { cwd: d, stdio: 'pipe' })
    fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
    fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')

    const { WorktreeManager } = await import('../src/worktree.js')
    // worktreeDir 固定到临时目录，避免 worktreeBase 解析到主仓库命中残留 meta
    const wm = new WorktreeManager({ cwd: d, worktreeDir: path.join(d, 'wt-base') })
    // create 触发 win32 longpaths 设置（worktree add 前）；容忍后续 deps/overlay 在 minimal fixture 上失败
    try { await wm.create('test-change') } catch {}

    // 修复前：core.longpaths 未设置，读回为空
    // 修复后：读回 'true'（create 在 worktree add 前已设，先于可能失败的 deps）
    let val = ''
    try { val = execSync('git config core.longpaths', { cwd: d, stdio: 'pipe' }).toString().trim() } catch {}
    assert(val === 'true', `worktree create 在 win32 设置 core.longpaths=true（实际 "${val}"）`)
  } finally {
    try { fs.rmSync(d, { recursive: true, force: true }) } catch {}
  }
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
