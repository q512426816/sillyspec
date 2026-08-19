/**
 * quick --done 关联真实变更轻量归档单元测试
 *
 * 覆盖 closeQuickLinkedChanges 行为：
 *   - 关联变更 tasks.md 全勾选 → closed + 目录归档 + unregisterChange 调用
 *   - 关联变更 tasks.md 有未勾选项 → skipped + 目录保持原位 + unregisterChange 未调用
 *   - 目标归档目录已存在 → 幂等跳过，不抛错
 *   - linkedChanges 为空数组 → 空结果，无副作用
 *   - linkedChanges 包含 quick-<8hex> sessionId → 过滤掉，不处理
 *
 * 阶段闸（quick-close-midflight 防误归档）：
 *   - current_stage=verify/execute + tasks 全勾 → skipped（execute 完成后 tasks 必然全勾、
 *     verify 未跑，被穿插 quick 关联不得绕过 verify/archive 校验归档）
 *   - current_stage=brainstorm + tasks 全勾 → closed（d192f89 原始场景：small 逃生通道僵尸变更）
 *   - 无 DB 记录（getChangeStage → null）→ 维持轻量判定（未注册目录桩）
 *   - pm 缺 getChangeStage / 查询抛错 → fail-closed skipped
 *
 * 用 os.tmpdir() + mkdtempSync 隔离 specDir，mock ProgressManager（spy unregisterChange +
 * stub getChangeStage），不依赖真实 DB / git / worktree。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { closeQuickLinkedChanges } from '../src/run/complete-handlers.js'
import { archiveDestDirName } from '../src/stage-contract.js'

function makeSpecBase(prefix = 'qclc-') {
  return mkdtempSync(join(tmpdir(), prefix))
}

function makeChange(specBase, changeName, tasksContent) {
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  if (tasksContent !== undefined) {
    writeFileSync(join(changeDir, 'tasks.md'), tasksContent)
  }
  return changeDir
}

function makePm(stageByChange = null) {
  const calls = []
  return {
    unregisterChange: (cwd, changeName) => { calls.push({ cwd, changeName }) },
    // stageByChange: null = 所有变更无 DB 记录（默认，未注册目录桩）；对象 = 按名返回
    // { current_stage, status, stage_status }（缺省键归一 null；stage_status 为
    // ql-20260819-010 新增的当前阶段完成态，旧 mock 不带 → undefined 按未完成放行）
    getChangeStage: stageByChange === null
      ? () => null
      : (cwd, changeName) => {
          const s = stageByChange[changeName]
          return s
            ? {
                current_stage: s.current_stage ?? null,
                status: s.status ?? null,
                stage_status: s.stage_status ?? null,
              }
            : null
        },
    _calls: calls,
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function cleanup(specBase) {
  try { rmSync(specBase, { recursive: true, force: true }) } catch {}
}

test('关联变更 tasks.md 全勾选 → closed 含该变更，目录移到 archive/，unregisterChange 被调用', async () => {
  const specBase = makeSpecBase('qclc-closed-')
  const cwd = specBase
  const changeName = '2026-08-17-auto-sync'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 完成任务 A\n- [x] ql-yyy 完成任务 B\n')
    const pm = makePm()

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [changeName], 'closed 应含该变更')
    assert.deepEqual(result.skipped, [], 'skipped 应为空')
    assert.equal(pm._calls.length, 1, 'unregisterChange 应被调用 1 次')
    assert.equal(pm._calls[0].cwd, cwd, 'unregisterChange cwd 正确')
    assert.equal(pm._calls[0].changeName, changeName, 'unregisterChange changeName 正确')

    const destName = archiveDestDirName(todayIsoDate(), changeName)
    const archivedDir = join(specBase, 'changes', 'archive', destName)
    assert.ok(!existsSync(changeDir), '源目录应被移走')
    assert.ok(existsSync(archivedDir), '归档目录应存在')
    assert.ok(existsSync(join(archivedDir, 'tasks.md')), '归档目录应保留 tasks.md')
  } finally {
    cleanup(specBase)
  }
})

test('关联变更 tasks.md 有未勾选项 → skipped 且目录保持原位，unregisterChange 未被调用', async () => {
  const specBase = makeSpecBase('qclc-skipped-')
  const cwd = specBase
  const changeName = '2026-08-17-pending-tasks'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n- [ ] ql-yyy 未完成任务\n')
    const pm = makePm()

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.equal(result.skipped[0].name, changeName, 'skipped name 正确')
    assert.match(result.skipped[0].reason, /未全勾选或不存在/, 'skipped reason 提示未全勾选或不存在')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

test('目标归档目录已存在 → 幂等跳过，不抛错', async () => {
  const specBase = makeSpecBase('qclc-idempotent-')
  const cwd = specBase
  const changeName = '2026-08-17-existing-archive'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n')
    const destName = archiveDestDirName(todayIsoDate(), changeName)
    const archiveDir = join(specBase, 'changes', 'archive')
    const destDir = join(archiveDir, destName)
    mkdirSync(destDir, { recursive: true })
    writeFileSync(join(destDir, 'plan.md'), '# Plan\n')

    const pm = makePm()
    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.equal(result.skipped[0].name, changeName, 'skipped name 正确')
    assert.match(result.skipped[0].reason, /目标目录已存在/, 'skipped reason 提示目标目录已存在')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
    assert.ok(existsSync(destDir), '已有归档目录应保持')
  } finally {
    cleanup(specBase)
  }
})

test('linkedChanges 为空数组 → 返回空 closed/skipped，无副作用', async () => {
  const specBase = makeSpecBase('qclc-empty-')
  const cwd = specBase
  try {
    const pm = makePm()
    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.deepEqual(result.skipped, [], 'skipped 应为空')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
  } finally {
    cleanup(specBase)
  }
})

test('linkedChanges 包含 quick-<8hex> sessionId → 过滤掉，不处理', async () => {
  const specBase = makeSpecBase('qclc-session-')
  const cwd = specBase
  const sessionId = 'quick-a1b2c3d4'
  try {
    const sessionDir = makeChange(specBase, sessionId, '- [x] ql-xxx 已完成任务\n')
    const pm = makePm()
    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [sessionId] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.deepEqual(result.skipped, [], 'skipped 应为空（sessionId 被过滤）')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(sessionDir), 'session 目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

// ── 阶段闸（quick-close-midflight 防误归档）──────────────────────────────
// execute 完成后 tasks.md 必然全勾选而 current_stage='verify'——此时被穿插 quick 关联，
// 旧实现会绕过 verify/archive 全部校验直接归档注销。阶段闸要求变更从未进入完整流程
// （无 DB 记录或停在 scan/brainstorm）才允许轻量归档。

test('current_stage=verify + tasks 全勾 → skipped 不归档（verify 未收尾的完整流程变更）', async () => {
  const specBase = makeSpecBase('qclc-verify-')
  const cwd = specBase
  const changeName = '2026-08-19-midflight-verify'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] task-01 已完成\n- [x] task-02 已完成\n')
    const pm = makePm({ [changeName]: { current_stage: 'verify', status: 'active' } })

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空（verify 阶段不得自动归档）')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.match(result.skipped[0].reason, /verify/, 'reason 应指明所处阶段')
    assert.match(result.skipped[0].reason, /不自动归档|完整流程/, 'reason 应说明不自动归档原因')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

test('current_stage=execute + tasks 全勾 → skipped 不归档', async () => {
  const specBase = makeSpecBase('qclc-exec-')
  const cwd = specBase
  const changeName = '2026-08-19-midflight-execute'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] task-01 已完成\n')
    const pm = makePm({ [changeName]: { current_stage: 'execute', status: 'active' } })

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空（execute 阶段不得自动归档）')
    assert.match(result.skipped[0].reason, /execute/, 'reason 应指明所处阶段')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

test('current_stage=plan / archive + tasks 全勾 → 均 skipped 不归档', async () => {
  const specBase = makeSpecBase('qclc-plan-arch-')
  const cwd = specBase
  const planChange = '2026-08-19-midflight-plan'
  const archiveChange = '2026-08-19-midflight-archive'
  try {
    makeChange(specBase, planChange, '- [x] task-01 已完成\n')
    makeChange(specBase, archiveChange, '- [x] task-01 已完成\n')
    const pm = makePm({
      [planChange]: { current_stage: 'plan', status: 'active' },
      [archiveChange]: { current_stage: 'archive', status: 'active' },
    })

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [planChange, archiveChange] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.equal(result.skipped.length, 2, '两个变更均应 skipped')
    assert.ok(result.skipped.every(s => existsSync(join(specBase, 'changes', s.name))), '源目录均保持原位')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
  } finally {
    cleanup(specBase)
  }
})

test('current_stage=brainstorm + tasks 全勾 → closed（small 逃生通道僵尸变更，原行为保留）', async () => {
  const specBase = makeSpecBase('qclc-brainstorm-')
  const cwd = specBase
  const changeName = '2026-08-19-small-escape'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n')
    const pm = makePm({ [changeName]: { current_stage: 'brainstorm', status: 'active' } })

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [changeName], 'closed 应含该变更（brainstorm 停留 = 轻量场景）')
    assert.equal(pm._calls.length, 1, 'unregisterChange 应被调用')
    assert.ok(!existsSync(changeDir), '源目录应被移走')
  } finally {
    cleanup(specBase)
  }
})

// ── 阶段完成态闸（ql-20260819-010 / quick-done-autoarchive-misfire 缺陷①）─────────
// 事故形态：brainstorm 已 completed、plan 尚未开始的空窗里 current_stage 仍读
// brainstorm，propose 骨架 tasks.md 无任务行（「无未勾选框=全勾」恒真）→ 关联 quick
// --done 把即将进 plan 的进行中变更误轻量归档。stage_status=completed 一律不放行。

test('current_stage=brainstorm + stage_status=completed + tasks 全勾 → skipped（事故场景：阶段完成空窗不放行）', async () => {
  const specBase = makeSpecBase('qclc-brainstorm-done-')
  const cwd = specBase
  const changeName = '2026-08-19-cross-ws-mission'
  try {
    const changeDir = makeChange(
      specBase,
      changeName,
      '- task-01：示例任务（propose 骨架，无勾选框）\n- [x] ql-20260819-002-4c90 提案：示例\n',
    )
    const pm = makePm({
      [changeName]: { current_stage: 'brainstorm', status: 'active', stage_status: 'completed' },
    })

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空（阶段已完成 ≠ 僵尸变更）')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.match(result.skipped[0].reason, /已完成/, 'reason 应指明阶段已完成')
    assert.match(result.skipped[0].reason, /不自动归档/, 'reason 应说明不自动归档')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

test('current_stage=brainstorm + stage_status=in-progress → closed（真·僵尸，逃生通道保留）', async () => {
  const specBase = makeSpecBase('qclc-brainstorm-wip-')
  const cwd = specBase
  const changeName = '2026-08-19-real-zombie'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n')
    const pm = makePm({
      [changeName]: { current_stage: 'brainstorm', status: 'active', stage_status: 'in-progress' },
    })

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [changeName], 'closed 应含该变更（未完成 = 僵尸场景保留）')
    assert.equal(pm._calls.length, 1, 'unregisterChange 应被调用')
    assert.ok(!existsSync(changeDir), '源目录应被移走')
  } finally {
    cleanup(specBase)
  }
})

test('pm 缺 getChangeStage 接口 → fail-closed skipped，不归档', async () => {
  const specBase = makeSpecBase('qclc-noapi-')
  const cwd = specBase
  const changeName = '2026-08-19-no-stage-api'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n')
    const pm = { unregisterChange: () => {} } // 无 getChangeStage

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空（接口缺失 fail-closed）')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.match(result.skipped[0].reason, /getChangeStage|阶段/, 'reason 应说明接口缺失')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

test('getChangeStage 查询抛错 → fail-closed skipped，不归档', async () => {
  const specBase = makeSpecBase('qclc-throw-')
  const cwd = specBase
  const changeName = '2026-08-19-stage-throw'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n')
    const pm = makePm()
    pm.getChangeStage = () => { throw new Error('db corrupted') }

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空（查询失败 fail-closed）')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.match(result.skipped[0].reason, /db corrupted/, 'reason 应含原始错误')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})
