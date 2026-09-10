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
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2'), true, '单段后缀形态合法')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-3fa2c1'), true, 'change 哈希段（6 hex）合法')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-3fa2c1-x9y8'), true, '哈希段+碰撞随机段（两段）合法')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-../etc'), false, '后缀路径穿越拒绝')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2\nrm -rf'), false, '后缀换行注入拒绝')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2c3d4e5f'), false, '后缀超长（>8）拒绝')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-A1B2'), false, '大写后缀拒绝（生成侧仅小写）')
  assert.equal(isValidExecuteRunId('exec-2026-09-10-153000-a1b2-c3d4-e5f6'), false, '三段后缀拒绝（生成侧最多两段）')
})

test('change 哈希隔离：两变更同秒必不同 runId、同变更幂等、无参裸形态', () => {
  const a1 = generateExecuteRunId('2026-09-10-change-a')
  const a2 = generateExecuteRunId('2026-09-10-change-a')
  const b = generateExecuteRunId('2026-09-10-change-b')
  assert.ok(isValidExecuteRunId(a1) && isValidExecuteRunId(b), '哈希形态过格式校验')
  assert.equal(a1.split('-').pop(), a2.split('-').pop(), '同变更哈希段恒同（幂等 regenerate）')
  assert.notEqual(a1.split('-').pop(), b.split('-').pop(), '不同变更哈希段不同（同秒结构化隔离核心）')
  if (a1.slice(0, -8) === b.slice(0, -8)) {
    // 同秒调用成功对拍（跨秒时前缀不同也已隔离，断言只加强）
    assert.notEqual(a1, b, '两变更同秒 → runId 必不同')
  }
  assert.match(generateExecuteRunId(), /^exec-\d{4}-\d{2}-\d{2}-\d{6}$/, '无参调用保持裸秒级形态（向后兼容）')
})

test('claimExecuteRunId 与哈希基准兼容：碰撞重试产出两段后缀仍合法', () => {
  const runtimeRoot = mkRuntime()
  const hashedBase = generateExecuteRunId('2026-09-10-collide')
  const idA = claimExecuteRunId(runtimeRoot, hashedBase)
  assert.equal(idA, hashedBase, '哈希基准无碰撞原样认领')
  const idB = claimExecuteRunId(runtimeRoot, hashedBase)
  assert.ok(isValidExecuteRunId(idB), `碰撞换道产物过格式校验（实际 ${idB}）`)
  assert.ok(existsSync(join(runtimeRoot, 'execute-runs', idB, 'tasks')), '换道 run 目录已建')
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
