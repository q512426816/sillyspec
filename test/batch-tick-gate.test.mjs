/**
 * batch-tick-gate.test.mjs — 单拍勾选硬门（2026-09-29-batch-tick-gate；2026-10-07-thin-tasks-v3 契约刷新）
 *
 * B 层牙齿：事件流单拍 checked N→M（跳 ≥2，CLI 精确事件去重后）+ 任务面在场 → flow done 拒收；
 * --allow-batch-tick 显式旁路留痕；观测缺席 / 哨兵面未知 → 不拒；机器代勾可解释整跳 → advisory。
 * 镜像-only 豁免分支退役（镜像面契约整体下线）。
 * A 层形状：工作分解契约（横幅两路：fresh/adopt）+ 执行循环指令——文件内指令已清零。
 *
 * 覆盖：
 *   ① detectBatchCheckCadence 纯函数（含采样去重）已在 sentinel/task-tick 系覆盖——此处钉接线与文案（源码级）
 *   ② 硬门三态接线：拒收出口 / --allow-batch-tick 旁路留痕 / 哨兵面未知降级
 *   ③ A 层文案钉（fresh 简报工作分解契约 + adopt 简报 + tasks.md 文件内零指令）
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
  assert.ok(src.includes('哨兵任务面未知（fail-open 防误拒）'), '哨兵面未知降级 advisory（文案钉）')
  assert.ok(src.includes("appendTelemetry({ sentinel: 'batch-tick'"), '拒收落遥测')
})

test('②b 决策纯函数行为级（resolveBatchTickAction 四态 + 豁免优先序）', async () => {
  const { resolveBatchTickAction } = await import(pathToFileURL(join(ROOT, '..', 'src', 'sentinel-assertions.js')).href)
  const bt = { from: 0, to: 3, detail: 'checked 0→3', ts: 1 }
  assert.equal(resolveBatchTickAction({ batchTick: null }).action, 'silent', '无单拍跳→silent')
  // 镜像-only 豁免退役（2026-10-07-thin-tasks-v3）：任务面在场即按统一判据——0 也拒
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 0 }).action, 'reject', '镜像-only 分支已删——统一拒收')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, allowBatchTick: true }).action, 'bypass', '有任务面+旗标→bypass')
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

test('③ A 层文案钉：工作分解契约（fresh/adopt 两路）+ tasks.md 文件内零指令', () => {
  const flowSrc = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('工作分解契约'), 'fresh 简报：任务面契约标签')
  assert.ok(flowSrc.includes('执行循环：对每个未勾行 Working on task N/M'), 'fresh 简报：逐行循环指令')
  assert.ok(flowSrc.includes('task tick --change'), 'tick 动词用法在场')
  assert.ok(flowSrc.includes('TodoWrite 类工具是会话内便利面'), 'harness todo 竞争点名')
  assert.ok(flowSrc.includes('把 tasks.md 改写为工作分解'), 'adopt 简报：spec 期定稿工作分解')
  // 书写规则迁入横幅（2026-10-07-thin-tasks-v3 文件内指令清零的承接面）
  assert.ok(flowSrc.includes('「## 文件变更清单」节'), '横幅：文件变更清单节名规则在场（原 design 文件内指引迁入）')
  assert.ok(flowSrc.includes('勿改写'), '横幅：锚行规则在场（原模板防呆迁入）')
  const draftSrc = readFileSync(join(ROOT, '..', 'src', 'flow-draft.js'), 'utf8')
  // 文件内指令清零（2026-10-07-thin-tasks-v3）：起草模板不再产出 > 指导行——书写规则唯一源=横幅+命令卡
  assert.ok(!draftSrc.includes('勿删勿改写'), 'tasks.md 模板：镜像锚话术退役')
  assert.ok(!draftSrc.includes('> 边干边勾'), 'tasks.md 模板：纪律指令行退役')
  assert.ok(!draftSrc.includes('> 机器预填草稿'), 'v1 backfill 模板：指令行退役')
})
