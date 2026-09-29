/**
 * batch-tick-gate.test.mjs — 单拍勾选硬门（2026-09-29-batch-tick-gate）
 *
 * B 层牙齿：watcher 事件流单拍 checked N→M（跳 ≥2）+ 非镜像勾选面 → flow done 拒收；
 * --allow-batch-tick 显式旁路留痕；镜像-only / 观测缺席 / 哨兵面未知 → 不拒。
 * A 层形状：spec 期任务面定稿 + openspec 式执行循环指令（简报两路 + tasks.md 头部）。
 *
 * 覆盖：
 *   ① detectBatchCheckCadence 纯函数已在 sentinel 系覆盖——此处钉接线与文案（源码级）
 *   ② 硬门三态接线：拒收出口 / --allow-batch-tick 旁路留痕 / 镜像-only 不拒（哨兵非镜像计数=0 静默）
 *   ③ A 层文案三处钉（fresh 简报循环指令 / resume 简报 / draftTasks 头部）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))

test('② 硬门接线钉：拒收出口 + 旁路旗标 + 降级面', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('allowBatchTick'), 'cmdFlowDone 旗标在场')
  assert.ok(src.includes("hasFlag('--allow-batch-tick')"), 'CLI 旗标解析接线')
  assert.ok(src.includes('单拍勾选拒收'), '拒收文案在场')
  assert.ok(src.includes('--allow-batch-tick 显式留痕过门'), '出口指引（旁路留痕）')
  assert.ok(src.includes('allow_batch_tick: true'), '旁路留痕写 flow-state')
  assert.ok(src.includes('哨兵非镜像面未知（fail-open 防误拒）'), '哨兵面未知降级 advisory（文案钉）')
  assert.ok(src.includes("appendTelemetry({ sentinel: 'batch-tick'"), '拒收落遥测')
})

test('②b 决策纯函数行为级（resolveBatchTickAction 四态 + 豁免优先序）', async () => {
  const { resolveBatchTickAction } = await import(pathToFileURL(join(ROOT, '..', 'src', 'sentinel-assertions.js')).href)
  const bt = { from: 0, to: 3, detail: 'checked 0→3', ts: 1 }
  assert.equal(resolveBatchTickAction({ batchTick: null }).action, 'silent', '无单拍跳→silent')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 0 }).action, 'silent', '镜像-only→silent（豁免哲学）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 0, allowBatchTick: true }).action, 'silent', '镜像-only 优先于旁路旗标')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, allowBatchTick: true }).action, 'bypass', '非镜像+旗标→bypass')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: null }).action, 'advisory', '哨兵面未知→advisory（fail-open）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: null, allowBatchTick: true }).action, 'bypass', '哨兵面未知仍可显式旁路')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, autopilotTicked: 3 }).action, 'advisory', '机器代勾解释整跳（3>=3）→advisory（autopilot 单拍机械写不误拒）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, autopilotTicked: 1 }).action, 'reject', '代勾解释不了整跳（1<3）→reject（防留格蹭豁免——二轮 P3-E）')
  assert.equal(resolveBatchTickAction({ batchTick: { from: 3, to: 4, detail: 'checked 3→4', ts: 1 }, nonMirrorCount: 3, autopilotTicked: 1 }).action, 'advisory', '小跳+代勾解释（1>=1）→advisory')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3 }).action, 'reject', 'agent 一把勾→reject')
})

test('②c autopilot 交互钉（评审清偿）：代勾计数接线 + 重入持久化 + 解释整跳判据', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('_autopilotTicked = _autoTicked'), '代勾格数抬升到门作用域')
  assert.ok(src.includes('autopilot_ticked: _autoTicked'), '代勾事实持久化写 flow-state（二轮 P2-B 重入漂移防护）')
  assert.ok(src.includes('Math.max(_autopilotTicked, _persistedAuto)'), '重入取 max(本拍, 持久化)')
  const sen = readFileSync(join(ROOT, '..', 'src', 'sentinel-assertions.js'), 'utf8')
  assert.ok(sen.includes('autopilotTicked >= batchTick.to - batchTick.from'), '代勾解释整跳判据在决策函数（P3-E 防蹭豁免）')
})

test('③ A 层文案钉：spec 定稿 + openspec 式循环（三处）', () => {
  const flowSrc = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('spec 阶段先定稿任务面'), 'fresh 简报：定稿指令')
  assert.ok(flowSrc.includes('Working on task N/M'), 'fresh 简报：openspec 式循环指令（含输出拍）')
  assert.ok(flowSrc.includes('执行走任务循环——Working on task N/M'), 'resume 简报：循环口径')
  const draftSrc = readFileSync(join(ROOT, '..', 'src', 'flow-draft.js'), 'utf8')
  assert.ok(draftSrc.includes('任务面在 ①spec 阶段定稿'), 'tasks.md 头部：定稿要求')
  assert.ok(draftSrc.includes('收口硬门拒单拍多格勾选'), 'tasks.md 头部：硬门提示')
})
