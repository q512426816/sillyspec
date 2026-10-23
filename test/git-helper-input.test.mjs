/**
 * git-helper stdin 扩展回归（2026-10-23-push-squash task-01）
 *
 * 背景：`git commit-tree -F -` 需要把多行提交消息写入子进程 stdin。Node 的
 * `execFileSync` 在 `stdio[0]='ignore'` 时会静默丢弃 `input`——只加 input 字段不改
 * stdio 会让 commit-tree 收到空消息。本测试同时钉住 `git()` 与 `safeGit()` 两条入口。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname } from 'node:path'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { git, safeGit } = await import(pathToFileURL(join(ROOT, '..', 'src', 'git-helper.js')).href)

function run(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'push-git-input-'))
  run(cwd, ['init', '-q'])
  run(cwd, ['config', 'user.email', 't@t'])
  run(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'a.txt'), 'a\n')
  run(cwd, ['add', 'a.txt'])
  run(cwd, ['commit', '-qm', 'base (2026-10-23-push-squash)'])
  return cwd
}

test('git() 的 input 真正写入 stdin：commit-tree 收到多行消息', () => {
  const cwd = makeRepo()
  try {
    const head = run(cwd, ['rev-parse', 'HEAD'])
    const tree = run(cwd, ['rev-parse', 'HEAD^{tree}'])
    const message = 'test: stdin message (2026-10-23-push-squash)\n\n第二行\ntask-01 task-02/03\n'
    const sha = git(cwd, ['commit-tree', tree, '-p', head, '-F', '-'], { input: message, timeout: 30000 })
    assert.match(sha, /^[0-9a-f]{40,64}$/)
    const body = run(cwd, ['show', '-s', '--format=%B', sha])
    assert.match(body, /test: stdin message/)
    assert.match(body, /task-01 task-02\/03/)
  } finally {
    rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})

test('safeGit() 的 input 同样生效；不传 input 时行为不变', () => {
  const cwd = makeRepo()
  try {
    const head = run(cwd, ['rev-parse', 'HEAD'])
    const tree = run(cwd, ['rev-parse', 'HEAD^{tree}'])
    const r = safeGit(cwd, ['commit-tree', tree, '-p', head, '-F', '-'], { input: 'safe: by stdin\n', timeout: 30000 })
    assert.equal(r.error, null)
    assert.match(r.value, /^[0-9a-f]{40,64}$/)
    const plain = safeGit(cwd, ['rev-parse', 'HEAD'])
    assert.equal(plain.error, null)
    assert.equal(plain.value, head)
  } finally {
    rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
