/**
 * exec-run runId 同秒碰撞根治（坑 exec-run-id-same-second-collision，2026-09-10 驾驭小结①）。
 *
 * 背景：generateExecuteRunId 秒级时间戳（exec-YYYY-MM-DD-HHMMSS），并行会话（不同 change）
 * 同秒启动 execute 生成同一 runId → 两变更 review.json 落进同一
 * execute-runs/<runId>/tasks/task-NN/ 互相覆盖（用户两次实锤：per-task review.json 被
 * 并行会话误写）。
 *
 * 锁定语义：
 *   - claimExecuteRunId：无碰撞 → 原样秒级形态认领 + tasks/ 子目录在（不变量：认领即含 tasks/）
 *   - 碰撞（execute-runs/<baseId> 已被他者认领）→ 随机短后缀重试，返回带后缀的新 ID，
 *     两会话各得其所、互不共享 run 目录
 *   - isValidExecuteRunId：存量无后缀 ID 兼容 + 新带后缀形态通过 + 后缀注入（路径穿越/
 *     超长/大写）拒绝
 *   - 真实 fs 障碍（execute-runs 被普通文件占用）→ 原样上抛（分层 fail 由四处写入点既有
 *     语义接管，execute-run-dir-fail-loud.test.mjs 锁定）
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { claimExecuteRunId, isValidExecuteRunId, generateExecuteRunId } from '../src/task-review.js'

const tmpRoots = []
function mkRuntime() {
  const root = mkdtempSync(join(tmpdir(), 'exec-id-collision-'))
  tmpRoots.push(root)
  return join(root, 'runtime')
}
function cleanup() {
  for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}
const BASE = 'exec-2026-09-10-153000' // 定值注入消除跨秒抖动（同秒两会话场景的确定性模拟）

test('无碰撞：原样秒级形态认领，认领即含 tasks/（不变量）', () => {
  const runtimeRoot = mkRuntime()
  const id = claimExecuteRunId(runtimeRoot, BASE)
  assert.equal(id, BASE, '无碰撞返回原样秒级 ID')
  assert.ok(existsSync(join(runtimeRoot, 'execute-runs', id, 'tasks')), '认领即含 tasks/ 子目录')
})

test('碰撞（他者已认领同秒 ID）→ 随机短后缀重试，两会话 run 目录互不共享', () => {
  const runtimeRoot = mkRuntime()
  // 会话 A 先认领 BASE（模拟并行会话同秒启动 execute）
  const idA = claimExecuteRunId(runtimeRoot, BASE)
  assert.equal(idA, BASE)
  // 会话 B 同秒生成同一 BASE → 认领碰撞 → 后缀换道
  const idB = claimExecuteRunId(runtimeRoot, BASE)
  assert.notEqual(idB, BASE, '会话 B 不得复用会话 A 的 runId（同秒碰撞根治核心）')
  assert.ok(isValidExecuteRunId(idB), `带后缀形态合法（实际 ${idB}）`)
  assert.ok(idB.startsWith(BASE + '-'), '带后缀形态以基准 ID + - 开头（mtime/字典序排序兼容）')
  assert.ok(existsSync(join(runtimeRoot, 'execute-runs', idB, 'tasks')), '会话 B 的 run 目录已建')
  // 两会话的 per-task review.json 落不同目录——不再互相覆盖
  const reviewA = join(runtimeRoot, 'execute-runs', idA, 'tasks', 'task-01', 'review.json')
  const reviewB = join(runtimeRoot, 'execute-runs', idB, 'tasks', 'task-01', 'review.json')
  assert.notEqual(reviewA, reviewB)
  mkdirSync(join(reviewA, '..'), { recursive: true })
  writeFileSync(reviewA, '{"task":"task-01"}')
  assert.ok(!existsSync(reviewB), 'B 目录独立，A 的 review 未被波及')
})

test('isValidExecuteRunId：存量无后缀兼容 + 带后缀通过 + 注入/超长拒绝', () => {
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000'), true, '存量秒级形态（历史 run）仍合法')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2'), true, '新带后缀形态合法')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-../etc'), false, '后缀路径穿越拒绝')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2\nrm -rf'), false, '后缀换行注入拒绝')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2c3d4e5f'), false, '后缀超长（>8）拒绝')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-A1B2'), false, '大写后缀拒绝（生成侧仅小写）')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2-c3d4'), false, '双后缀拒绝（生成侧不会产出）')
})

test('真实 fs 障碍：execute-runs 被普通文件占用 → 原样上抛（分层 fail 语义交写入点）', () => {
  const runtimeRoot = mkRuntime()
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(runtimeRoot, 'execute-runs'), 'not a directory\n')
  assert.throws(() => claimExecuteRunId(runtimeRoot, BASE))
})

test('缺省 baseId：时间生成形态合法（接线形态冒烟）', () => {
  const runtimeRoot = mkRuntime()
  const id = claimExecuteRunId(runtimeRoot)
  assert.ok(isValidExecuteRunId(id), `缺省生成形态合法（实际 ${id}）`)
  assert.ok(id.startsWith('exec-'), 'exec- 前缀')
  assert.equal(typeof generateExecuteRunId(), 'string', 'generateExecuteRunId 纯函数形态不变（零参兼容）')
})

after(() => cleanup())
