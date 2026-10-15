/**
 * eval-timeout-enforcement.test.mjs — spawnCapture 超时墙钟绑定（2026-10-15-eval-timeout-enforcement）
 *
 * 根因：005 探针 B 臂实测记录 timeout 1501240ms vs 配置 900000ms——超时路径 fire-and-forget
 * taskkill 未杀死 claude 树，孤儿持有 stdout 继续烧 token 约 10 分钟才 close。本文件钉死：
 * ①孤儿树形态下 resolve 上界 = timeoutMs + 宽限（旧实现等待孤儿自然退出必红）；
 * ②正常快进程路径零回归（timedOut=false、code=0、输出完整）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnCapture, TIMEOUT_GRACE_MS } from '../eval/lib/util.mjs'

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch { /* Windows EPERM 可接受 */ }
}

test('孤儿树超时强制收敛：resolve 上界 = timeoutMs + 宽限（旧实现在此必红——孤儿持 stdout 60s）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ss-tto-'))
  try {
    // 子进程派生「持有 stdout 的孙进程」后自身也长睡——模拟 claude 被孤儿化的形态
    const script = join(dir, 'orphan-tree.mjs')
    writeFileSync(script, [
      "import { spawn } from 'node:child_process'",
      "spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'inherit' })",
      'setTimeout(() => {}, 60000)',
    ].join('\n'))
    const timeoutMs = 1500
    const t0 = Date.now()
    const res = await spawnCapture({ args: [process.execPath, script], cwd: dir, timeoutMs })
    const elapsed = Date.now() - t0
    assert.equal(res.timedOut, true, 'timedOut 标记')
    // 上界：timeoutMs + 宽限 + 余量（进程创建/杀树开销）。旧实现会等到 60s 孙进程自然退出。
    assert.ok(elapsed < timeoutMs + TIMEOUT_GRACE_MS + 15_000, `resolve 上界绑定：实测 ${elapsed}ms`)
  } finally { rmQuiet(dir) }
})

test('正常路径零回归：快进程 timedOut=false、code=0、输出完整', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ss-tto2-'))
  try {
    const res = await spawnCapture({ args: [process.execPath, '-e', "process.stdout.write('hello-ok')"], cwd: dir, timeoutMs: 10_000 })
    assert.equal(res.timedOut, false)
    assert.equal(res.code, 0)
    assert.ok(res.stdout.includes('hello-ok'), 'stdout 完整')
  } finally { rmQuiet(dir) }
})
