/**
 * 平台凭据回退链单测（2026-09-24 平台同步三修①，fr-test-readside 断流实证）
 *
 * 红线：平台根 worktree cwd（自身 local.yaml 无 platform 段——gitignored 凭据不随
 * checkout 跟进）须能沿父目录链借宿主仓凭据连上；env 优先；全链无凭据返回 null。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const { readPlatformConfig, peekPlatformConnected } = await import('../src/sync.js')

const roots = []
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('C1 回退链：worktree cwd（.git 文件形态）→ 宿主仓 local.yaml platform 段', () => {
  const host = mkdtempSync(join(tmpdir(), 'creds-host-'))
  roots.push(host)
  execSync('git init -q && git config user.email t@t && git config user.name t', { cwd: host })
  mkdirSync(join(host, '.sillyspec'), { recursive: true })
  writeFileSync(join(host, '.sillyspec', 'local.yaml'), `platform:\n  url: "https://x.example"\n  token: "tk1"\n`)
  // worktree 形态：wt/.git 是文件，gitdir 指向 <host>/.git/worktrees/demo
  const wt = join(host, 'wt')
  mkdirSync(join(host, '.git', 'worktrees', 'demo'), { recursive: true })
  mkdirSync(wt, { recursive: true })
  writeFileSync(join(wt, '.git'), 'gitdir: ' + join(host, '.git', 'worktrees', 'demo').replace(/\\/g, '/') + '\n')
  const cfg = readPlatformConfig(wt)
  assert.ok(cfg && cfg.url === 'https://x.example', 'C1: worktree 借宿主仓凭据')
  assert.equal(peekPlatformConnected(wt), true, 'C1: peek 判连接（治 worktree 内 triggerSync 静默 no-op）')
})

test('C1b 有界性：非仓目录链（tmpdir）不爬出仓外借家目录凭据', () => {
  const orphan = mkdtempSync(join(tmpdir(), 'creds-orphan-'))
  roots.push(orphan)
  // 模拟 check-approval-status 场景：tmpdir 内无仓、无凭据 → 不得因家目录 .sillyspec 判连接
  assert.equal(readPlatformConfig(orphan), null, 'C1b: 孤儿目录不借家目录凭据（回退链只在仓内有界）')
  assert.equal(peekPlatformConnected(orphan), false, 'C1b: peek 判未连接')
})

test('C2 本仓凭据优先（不依赖回退）；全链无凭据 → null/false', () => {
  const host = mkdtempSync(join(tmpdir(), 'creds-none-'))
  roots.push(host)
  mkdirSync(join(host, '.sillyspec'), { recursive: true })
  const none = readPlatformConfig(host, { maxDepth: 1 }) // maxDepth:0=只看本层——家目录 C:/Users/qinyi/.sillyspec 实际有凭据（回退链行为正确，测试需隔离）
  assert.equal(none, null, 'C2: 无凭据 null')
  assert.equal(peekPlatformConnected(host, { maxDepth: 1 }), false, 'C2: peek 判未连接（maxDepth 隔离口径）')
  const own = join(host, 'own-repo')
  execSync('git init -q', { cwd: host })
  mkdirSync(join(own, '.sillyspec'), { recursive: true })
  writeFileSync(join(own, '.sillyspec', 'local.yaml'), 'platform:\n  url: "https://y.example"\n  token: "tk2"\n')
  const cfg = readPlatformConfig(own, { maxDepth: 1 })
  assert.equal(cfg.url, 'https://y.example', 'C2: 本仓命中即返回（首层优先）')
})
