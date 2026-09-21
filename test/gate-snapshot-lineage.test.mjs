/**
 * gate-snapshot-lineage.test.mjs — M2 快照分叉态取 worktree 血统（2026-09-21-r5-efficiency-batch2 task-02 / FR-02 / D-002@v2）
 *
 * batch1 verify 实证（round5/r5-collision-ehs-attribution.md P16 移交）：sourceRoot=worktree 定向跑
 * verify 时，主仓侧同文件被并行 quick 修复异动 → 双写分叉取主仓（cwd）= 拿走无本变更代码的版本，
 * 配上 worktree 新增测试文件（新文件不经分叉判定）→ src/test 血统断裂 → module 实测假红一轮。
 *
 * 三态钉（D-002@v2 契约——①②态为既有语义零回归，③态为本批翻转）：
 *   ① 保护态（主仓直写新、worktree 停基线）→ 取主仓（2026-09-20 红线机检实证场景，不动）
 *   ② 正常态（仅 worktree 交付修改）→ 取 worktree（不动）
 *   ③ 分叉态（双侧均异于 merge-base 祖先且互不相等）→ 取 worktree（batch1 假红根治）+ 警告含对齐指引
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createGateSnapshot } from '../src/run/gate-snapshot.js'

const run = (cwd, args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' })

describe('createGateSnapshot 血统三态（D-002@v2：仅分叉态翻转）', () => {
  let repo, wt, srcFile
  beforeEach(() => {
    const root = join(tmpdir(), `sillyspec-lineage-${Math.random().toString(36).slice(2)}`)
    repo = join(root, 'repo')
    wt = join(root, 'wt')
    mkdirSync(repo, { recursive: true })
    mkdirSync(wt, { recursive: true })
    run(repo, ['init', '--quiet'])
    writeFileSync(join(repo, 'service.js'), 'base\n')
    run(repo, ['add', '.'])
    run(repo, ['commit', '--quiet', '-m', 'base'])
    srcFile = 'service.js'
  })
  afterEach(() => { try { rmSync(join(repo, '..'), { recursive: true, force: true }) } catch {} })

  const baseSha = () => run(repo, ['rev-parse', 'HEAD']).trim()
  const snapContent = (mergeBase) => {
    const snap = createGateSnapshot({ cwd: repo, files: [srcFile], sourceRoot: wt, mergeBase, skipImportSmoke: true })
    try { return readFileSync(join(snap.snapshotRoot, srcFile), 'utf8') } finally { snap.cleanup() }
  }

  it('① 保护态：主仓直写新、worktree 停基线 → 取主仓（既有语义零回归）', () => {
    const sha = baseSha()
    writeFileSync(join(repo, srcFile), 'main direct write\n') // 主仓侧新内容
    // worktree 侧 = 祖先内容（未动）
    writeFileSync(join(wt, srcFile), 'base\n')
    assert.ok(snapContent(sha).includes('main direct write'), '保护态取主仓（2026-09-20 实证场景不回归）')
  })

  it('② 正常态：仅 worktree 交付修改 → 取 worktree（既有语义零回归）', () => {
    const sha = baseSha()
    writeFileSync(join(wt, srcFile), 'worktree deliverable\n')
    assert.ok(snapContent(sha).includes('worktree deliverable'), '正常态取 worktree')
  })

  it('③ 分叉态：双侧均改且互不相等 → 取 worktree（batch1 假红根治，翻转点）', () => {
    const sha = baseSha()
    writeFileSync(join(wt, srcFile), 'worktree contract code\n')   // 本变更交付（含新导出/契约代码）
    writeFileSync(join(repo, srcFile), 'main parallel quickfix\n') // 主仓侧并行异动（干扰源）
    const got = snapContent(sha)
    assert.ok(got.includes('worktree contract code'), `分叉态取 worktree 分支版（实际：${got}）——取主仓会重现 batch1 src/test 血统断裂假红`)
    assert.ok(!got.includes('main parallel quickfix'), '主仓干扰版不得进快照')
  })
})
