/**
 * sillyspec push 执行层回归（2026-10-23-push-squash task-03）
 *
 * 真实临时 git 仓 + bare remote，覆盖：
 *  ① --dry-run 零写盘；② by-change 压扁 + 树/工作区不变；③ 快进 push；
 *  ④ 备份 ref 与 --undo（推送前可恢复、推送后拒绝）；⑤ 守卫矩阵（base 分叉/暂存区/worktree）；
 *  ⑥ 活锚点抬升（scan source_commit 落区间内）；⑦ --mode none 只推送。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const BIN = join(ROOT, '..', 'bin', 'sillyspec.js')
const { planPush, runPush } = await import(pathToFileURL(join(ROOT, '..', 'src', 'push.js')).href)
const APP = '2026-10-23-app'
const OTHER = '2026-10-23-other'

function git(dir, args, opts = {}) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts,
  }).trim()
}

function gitQuiet(dir, args) {
  try { return git(dir, args) } catch { return null }
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* Windows 句柄占用 */ }
}

function makeRepo({ change = APP } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'push-cli-'))
  const remote = join(root, 'remote.git')
  const work = join(root, 'work')
  mkdirSync(remote)
  git(remote, ['init', '--bare', '-q'])
  mkdirSync(work)
  git(work, ['init', '-q'])
  git(work, ['config', 'user.email', 't@t'])
  git(work, ['config', 'user.name', 't'])
  writeFileSync(join(work, 'base.txt'), 'base\n')
  git(work, ['add', 'base.txt'])
  git(work, ['commit', '-qm', 'chore: base'])
  const branch = git(work, ['symbolic-ref', '--short', 'HEAD'])
  git(work, ['remote', 'add', 'origin', remote])
  git(work, ['push', '-q', '-u', 'origin', branch])
  const base = git(work, ['rev-parse', 'HEAD'])
  // 变更元数据（untracked；只用于 knownChanges / active baseline 锚点）
  const changeDir = join(work, '.sillyspec', 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${base}\n`)
  return { root, remote, work, branch, base }
}

function commitFile(work, file, content, message) {
  writeFileSync(join(work, file), content)
  git(work, ['add', file])
  git(work, ['commit', '-qm', message])
  return git(work, ['rev-parse', 'HEAD'])
}

function addChange(work, name, base) {
  const dir = join(work, '.sillyspec', 'changes', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${base}\n`)
}

test('① --dry-run 零写盘：HEAD/index/工作区/refs 全不变', async () => {
  const { work, branch } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    const headBefore = git(work, ['rev-parse', 'HEAD'])
    const statusBefore = git(work, ['status', '--porcelain'])
    const refsBefore = gitQuiet(work, ['for-each-ref', '--format=%(refname)', 'refs/sillyspec'])
    const r = await runPush({ cwd: work, dryRun: true })
    assert.equal(r.ok, true)
    assert.equal(r.plan.needsRewrite, true)
    assert.equal(r.plan.groups.length, 1)
    assert.equal(git(work, ['rev-parse', 'HEAD']), headBefore)
    assert.equal(git(work, ['status', '--porcelain']), statusBefore)
    assert.equal(gitQuiet(work, ['for-each-ref', '--format=%(refname)', 'refs/sillyspec']) || '', refsBefore || '')
    assert.equal(git(work, ['rev-parse', branch]), headBefore)
  } finally { cleanup(join(work, '..')) }
})

test('② by-change 压扁：树/工作区不变，变更名与 task token 保留，备份 ref 在场', async () => {
  const { work, base } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP}) task-02/03`)
    commitFile(work, 'b1.txt', 'b1\n', `feat: b1 (${OTHER})`)
    addChange(work, OTHER, base)
    writeFileSync(join(work, 'dirty.txt'), 'dirty\n')
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    const oldTree = git(work, ['rev-parse', 'HEAD^{tree}'])
    const statusBefore = git(work, ['status', '--porcelain'])
    const r = await runPush({ cwd: work, noPush: true })
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.plan.groups.length, 2, 'A 段 + B 段')
    const subjects = git(work, ['log', '--reverse', '--format=%s', `${base}..HEAD`]).split('\n').filter(Boolean)
    assert.equal(subjects.length, 2, subjects.join(' | '))
    assert.match(subjects[0], new RegExp(`\\(${APP}\\)`))
    assert.match(subjects[0], /feat: a1/)
    assert.match(subjects[1], new RegExp(`\\(${OTHER}\\)`))
    assert.equal(git(work, ['rev-parse', 'HEAD^{tree}']), oldTree, '新 tip 树必须等于旧 HEAD 树')
    assert.notEqual(git(work, ['rev-parse', 'HEAD']), oldHead)
    const body = git(work, ['show', '-s', '--format=%B', 'HEAD^'])
    assert.match(body, /task-02\/03/)
    assert.equal(git(work, ['status', '--porcelain']), statusBefore)
    const refs = git(work, ['for-each-ref', '--format=%(refname)', 'refs/sillyspec/pre-squash/', 'refs/sillyspec/post-squash/'])
    assert.match(refs, /refs\/sillyspec\/pre-squash\//)
    assert.match(refs, /refs\/sillyspec\/post-squash\//)
  } finally { cleanup(join(work, '..')) }
})

test('③ 快进 push + --undo：推送前可恢复，推送后拒绝', async () => {
  const { work, remote, base, branch } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    const squash = await runPush({ cwd: work, noPush: true })
    assert.equal(squash.ok, true, JSON.stringify(squash.errors))
    const undo = await runPush({ cwd: work, undo: true })
    assert.equal(undo.ok, true, JSON.stringify(undo.errors))
    assert.equal(git(work, ['rev-parse', 'HEAD']), oldHead)

    const pushed = await runPush({ cwd: work })
    assert.equal(pushed.ok, true, JSON.stringify(pushed.errors))
    assert.equal(pushed.pushed, true)
    const remoteLog = git(remote, ['log', '--format=%s', branch]).split('\n').filter(Boolean)
    assert.deepEqual(remoteLog, git(work, ['log', '--format=%s', branch]).split('\n').filter(Boolean))
    const afterPush = await runPush({ cwd: work, undo: true })
    assert.equal(afterPush.ok, false, '已推送后 undo 必须拒绝')
    assert.match(afterPush.errors.join('\n'), /已推送|已指向|non-FF/)
  } finally { cleanup(join(work, '..')) }
})

test('④ 守卫：base 分叉 / staged 改动 / worktree cwd 均拒绝', async () => {
  const { root, work, remote, branch } = makeRepo()
  try {
    // staged 守卫
    writeFileSync(join(work, 'staged.txt'), 's\n')
    git(work, ['add', 'staged.txt'])
    const staged = await runPush({ cwd: work, dryRun: true })
    assert.equal(staged.ok, false)
    assert.match(staged.errors.join('\n'), /已暂存/)
    git(work, ['restore', '--staged', 'staged.txt'])

    // base 分叉：另一个 clone 推进远端
    const other = join(root, 'other')
    execFileSync('git', ['clone', '-q', remote, other], { stdio: ['ignore', 'pipe', 'pipe'] })
    git(other, ['config', 'user.email', 't@t'])
    git(other, ['config', 'user.name', 't'])
    writeFileSync(join(other, 'remote.txt'), 'r\n')
    git(other, ['add', 'remote.txt'])
    git(other, ['commit', '-qm', 'chore: remote moves'])
    git(other, ['push', '-q', 'origin', branch])
    git(work, ['fetch', '-q', 'origin'])
    const diverged = await runPush({ cwd: work, dryRun: true })
    assert.equal(diverged.ok, false)
    assert.match(diverged.errors.join('\n'), /不是 HEAD 祖先/)

    // worktree cwd 守卫（路径段判定；不要求真是链接 worktree）
    const wt = join(work, '.sillyspec', '.runtime', 'worktrees', APP)
    mkdirSync(wt, { recursive: true })
    const inWt = await runPush({ cwd: wt })
    assert.equal(inWt.ok, false)
    assert.match(inWt.errors.join('\n'), /worktree/)
  } finally { cleanup(root) }
})

test('⑤ 活锚点抬升：scan source_commit 落区间内时 effectiveBase 抬到锚点', async () => {
  const { work, base } = makeRepo()
  try {
    const a1 = commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    const scanDir = join(work, '.sillyspec', 'docs', 'proj', 'scan')
    mkdirSync(scanDir, { recursive: true })
    writeFileSync(join(scanDir, 'PROJECT.md'), `---\nsource_commit: ${a1}\n---\n# project\n`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    commitFile(work, 'a3.txt', 'a3\n', `feat: a3 (${APP})`)
    const r = await runPush({ cwd: work, noPush: true })
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.plan.effectiveBase, a1, 'base 必须抬到 scan 锚点')
    assert.equal(r.plan.baseRaised, true)
    assert.equal(git(work, ['merge-base', '--is-ancestor', a1, 'HEAD']) !== null, true)
    const subjects = git(work, ['log', '--reverse', '--format=%s', `${a1}..HEAD`]).split('\n').filter(Boolean)
    assert.equal(subjects.length, 1, '只压扁锚点之后的 a2+a3')
    assert.match(subjects[0], new RegExp(`\\(${APP}\\)`))
    assert.notEqual(base, a1)
  } finally { cleanup(join(work, '..')) }
})

test('⑤b 预存坏锚点：警告收敛单行（计数+分类+首 3 标识）', async () => {
  const { work } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    const scanDir = join(work, '.sillyspec', 'docs', 'proj', 'scan')
    mkdirSync(scanDir, { recursive: true })
    writeFileSync(join(scanDir, 'PROJECT.md'), '---\nsource_commit: deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n---\n# project\n')
    writeFileSync(join(scanDir, 'STRUCTURE.md'), '---\nsource_commit: 0000000000000000000000000000000000000000\n---\n# structure\n')
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    const r = await runPush({ cwd: work, dryRun: true })
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    const anchorWarnings = r.plan.warnings.filter((w) => /锚点/.test(w))
    assert.equal(anchorWarnings.length, 1, `坏锚点警告应恰 1 行，实际：${JSON.stringify(anchorWarnings, null, 1)}`)
    assert.match(anchorWarnings[0], /2 个已跳过/)
    assert.match(anchorWarnings[0], /不可解析 2 \/ 非 HEAD 祖先 0/)
    assert.match(anchorWarnings[0], /首 3：scan proj\/scan\/PROJECT\.md/)
    assert.equal(git(work, ['rev-parse', 'HEAD']), oldHead)
  } finally { cleanup(join(work, '..')) }
})

test('⑥ --mode none：只推送，不改写历史', async () => {
  const { work, remote, branch } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    const r = await runPush({ cwd: work, mode: 'none' })
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    assert.equal(r.plan.needsRewrite, false)
    assert.equal(git(work, ['rev-parse', 'HEAD']), oldHead)
    assert.equal(git(remote, ['rev-parse', branch]), oldHead)
  } finally { cleanup(join(work, '..')) }
})

test('⑦ CLI 接线：--dry-run --json 纯净、未知参数 exit 2、--help exit 0', () => {
  const { work } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    const dry = spawnSync(process.execPath, [BIN, 'push', '--dry-run', '--json'], { cwd: work, encoding: 'utf8' })
    assert.equal(dry.status, 0, dry.stderr)
    const parsed = JSON.parse(dry.stdout)
    assert.equal(parsed.command, 'push')
    assert.equal(parsed.dry_run, true)
    assert.equal(parsed.groups.length, 1)
    const bad = spawnSync(process.execPath, [BIN, 'push', '--nope'], { cwd: work, encoding: 'utf8' })
    assert.equal(bad.status, 2)
    assert.match(bad.stderr, /未知参数/)
    const help = spawnSync(process.execPath, [BIN, 'push', '--help'], { cwd: work, encoding: 'utf8' })
    assert.equal(help.status, 0)
    assert.match(help.stdout, /用法: sillyspec push/)
  } finally { cleanup(join(work, '..')) }
})

test('⑧ 守卫：区间含已推送提交拒绝', async () => {
  const { work } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    // 把 a1 推到另一远端分支 → a1 被 remote-tracking ref 可达，落进压扁区间
    git(work, ['push', '-q', 'origin', 'HEAD~1:refs/heads/leaked'])
    git(work, ['fetch', '-q', 'origin'])
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    const r = await runPush({ cwd: work, dryRun: true })
    assert.equal(r.ok, false)
    assert.match(r.errors.join('\n'), /已被远端 ref 可达/)
    assert.match(r.errors.join('\n'), /不 force-push/)
    assert.equal(git(work, ['rev-parse', 'HEAD']), oldHead, '拒绝后 HEAD 不变')
  } finally { cleanup(join(work, '..')) }
})

test('⑨ 守卫：区间含 merge commit 拒绝', async () => {
  const { work, branch } = makeRepo()
  try {
    commitFile(work, 'm1.txt', 'm1\n', `feat: m1 (${APP})`)
    git(work, ['checkout', '-qb', 'feat'])
    commitFile(work, 'f1.txt', 'f1\n', `feat: f1 (${APP})`)
    git(work, ['checkout', '-q', branch])
    git(work, ['merge', '--no-ff', '-m', `merge feat (${APP})`, 'feat'])
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    const r = await runPush({ cwd: work, dryRun: true })
    assert.equal(r.ok, false)
    assert.match(r.errors.join('\n'), /merge commit/)
    assert.match(r.errors.join('\n'), /--mode none/)
    assert.equal(git(work, ['rev-parse', 'HEAD']), oldHead, '拒绝后 HEAD 不变')
  } finally { cleanup(join(work, '..')) }
})

test('⑩ tag 落压扁区间告警与无签名零误报', async () => {
  const { work } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    git(work, ['tag', 'v-in-range'])
    commitFile(work, 'a2.txt', 'a2\n', `feat: a2 (${APP})`)
    const r = await runPush({ cwd: work, dryRun: true })
    assert.equal(r.ok, true, JSON.stringify(r.errors))
    const warnings = r.plan.warnings.join('\n')
    assert.match(warnings, /v-in-range/)
    assert.match(warnings, /压扁区间/)
    assert.match(warnings, /git tag -f/)
    assert.equal(r.plan.warnings.some((w) => /带签名提交/.test(w)), false, '全无签名 → 不产生签名告警（零误报）')
  } finally { cleanup(join(work, '..')) }
})

test('⑪ pre-push hook 失败：ok=false，json 错误含 hook stderr', async () => {
  const { work } = makeRepo()
  try {
    commitFile(work, 'a1.txt', 'a1\n', `feat: a1 (${APP})`)
    mkdirSync(join(work, '.git', 'hooks'), { recursive: true })
    writeFileSync(join(work, '.git', 'hooks', 'pre-push'), '#!/bin/sh\necho HOOK-FAIL-SIGNAL >&2\nexit 1\n', { mode: 0o755 })
    const r = await runPush({ cwd: work })
    assert.equal(r.ok, false)
    assert.match(r.errors.join('\n'), /push 失败/)
    const rj = await runPush({ cwd: work, json: true })
    assert.equal(rj.ok, false)
    assert.match(rj.envelope.errors.join('\n'), /HOOK-FAIL-SIGNAL/, 'json 模式错误必须含 hook stderr（报错一次给全）')
    const oldHead = git(work, ['rev-parse', 'HEAD'])
    assert.ok(oldHead, '本地状态仍在（不自动回滚）')
  } finally { cleanup(join(work, '..')) }
})
