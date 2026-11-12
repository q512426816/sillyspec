/**
 * 2026-11-12-baseline-own-declared-skip / archive-deliverable-committed-face 回归。
 *
 * 背景（2026-11-11-workspace-ia-redesign 实证）：
 *   ① 本变更在 brainstorm/前置阶段生成、尚未提交的交付文件（实证原型三件套）被 baseline
 *      overlay 复制进 worktree 后被 checkpoint 收编 → target_files 对账（diff
 *      baselineCommit..HEAD）看不见 → verify 误判「声明未做」。
 *   ② baseline overlay 带入的并行会话未提交脏文件（实证 11 个模块 changelog）被归档前置
 *      检查算成「本变更未 apply 交付面」→ 只能 --skip-apply 绕过。
 *
 * 锁定语义：
 *   ① _overlayBaseline 返回 ownDeclaredFiles（声明集 ∩ overlay 文件），文件仍复制进 worktree；
 *   ② _createBaselineCheckpoint 把 ownDeclaredFiles 排除出 commit（pathspec :(exclude)），
 *      这些文件在 checkpoint 后仍是未提交态（等本变更 Wave 提交收编）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { WorktreeManager } from '../src/worktree.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' }) }

const CHANGE = '2026-11-12-demo-change'

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bod-'))
  sh('git init -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(path.join(d, 'README.md'), 'base\n')
  sh('git add -A && git commit -m base', d)
  // 本变更 task 卡声明 demo.js 为交付面（loadOwnDeclaredSet 的来源）
  const tasksDir = path.join(d, '.sillyspec', 'changes', CHANGE, 'tasks')
  fs.mkdirSync(tasksDir, { recursive: true })
  fs.writeFileSync(path.join(tasksDir, 'task-01.md'), [
    '---', 'id: task-01', 'allowed_paths:', '  - demo.js', '---', '',
  ].join('\n'))
  // 主仓未提交：demo.js（本变更交付）+ other.js（并行会话脏文件）
  fs.writeFileSync(path.join(d, 'demo.js'), 'demo\n')
  fs.writeFileSync(path.join(d, 'other.js'), 'other\n')
  return d
}

function makeWt(repo) {
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'bod-wt-'))
  // 最小 worktree 形态：独立 git 仓模拟（checkpoint 只在该目录内 commit）
  sh('git init -b sillyspec/' + CHANGE, wt)
  sh('git config user.email t@t && git config user.name t', wt)
  sh('git config core.autocrlf false', wt)
  fs.writeFileSync(path.join(wt, 'README.md'), 'base\n')
  sh('git add -A && git commit -m base', wt)
  return wt
}

const repo = setupRepo()
const wt = makeWt(repo)
const wm = new WorktreeManager({ cwd: repo })

// ① overlay 返回 ownDeclaredFiles（声明命中），文件本体仍复制进 worktree
const overlay = wm._overlayBaseline(repo, wt, CHANGE)
assertTrue(Array.isArray(overlay.ownDeclaredFiles), 'overlay 返回 ownDeclaredFiles 数组')
assertTrue(overlay.ownDeclaredFiles.includes('demo.js'), 'ownDeclaredFiles 含声明命中的 demo.js')
assertTrue(!overlay.ownDeclaredFiles.includes('other.js'), 'ownDeclaredFiles 不含并行脏文件 other.js')
assertTrue(fs.existsSync(path.join(wt, 'demo.js')), 'demo.js 已复制进 worktree（在场等提交）')

// ② checkpoint 排除 ownDeclaredFiles：demo.js 仍未提交，other.js 已入 checkpoint
const baselineFiles = overlay.files.filter((f) => !overlay.ownDeclaredFiles.includes(f))
const base = wm._createBaselineCheckpoint(wt, CHANGE, baselineFiles, overlay.ownDeclaredFiles)
const committed = sh(`git diff-tree --no-commit-id --name-only -r ${base}`, wt).split('\n').filter(Boolean)
assertTrue(committed.includes('other.js'), 'other.js 已进 checkpoint（并行脏文件基线语义不变）')
assertTrue(!committed.includes('demo.js'), 'demo.js 未进 checkpoint（声明文件留待本变更提交）')
const status = sh('git status --porcelain', wt)
assertTrue(/^\?\?\s+demo\.js$/m.test(status), 'checkpoint 后 demo.js 仍为 untracked（对账可见）')

// ③ 未声明命中的场景：ownDeclaredFiles 为空、checkpoint 行为与旧版一致
const repo2 = setupRepo()
const wt2 = makeWt(repo2)
const wm2 = new WorktreeManager({ cwd: repo2 })
const overlay2 = wm2._overlayBaseline(repo2, wt2, '2026-11-12-unrelated-change')
assertTrue(overlay2.ownDeclaredFiles.length === 0, '无声明命中 → ownDeclaredFiles 为空（旧行为）')

// 清理
for (const d of [repo, wt, repo2, wt2]) {
  try { fs.rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log(`\n${failed === 0 ? '✅' : '❌'} baseline-own-declared-skip: ${total - failed}/${total} passed`)
if (failed > 0) { console.log('失败项：'); failures.forEach(f => console.log(' - ' + f)); process.exit(1) }
