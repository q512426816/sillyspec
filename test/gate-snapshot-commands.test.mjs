/**
 * 门禁快照 commands 面直测（2026-09-17-feedback-hardening task-01 / FR-01 / D-002@v2）。
 *
 * 背景（坑 gate-snapshot-missing-generated-artifacts 二阶，用户 2026-09-17 负面①）：copy 面
 * 只搬「主仓现有态」——主仓侧生成物缺失（fresh clone 未跑 postinstall）或过期（build-id 类
 * 构建期产物）时供给缺失/陈旧态，快照内全量 lint/test 必挂。gate_snapshot.commands 声明
 * postinstall 类生成命令，快照构建期（环境链接后、copy 面前）在快照根逐条执行，产出
 * 「本仓应然态」。
 *
 * 覆盖：
 *   ① 块列表形态解析（段内 copy 键不干扰）
 *   ② inline flow 形态解析（commands: [a, b]）
 *   ③ 条目尾注/成对引号剥离（_stripYamlValue 复用）
 *   ④ 未配置/空段 → []（存量 local.yaml 形态空转）
 *   ⑤ 段外顶层 commands: 与其它段内嵌 commands: 不误收
 *   ⑥ runGateSnapshotCommands 在快照根 cwd 执行并产出真实文件
 *   ⑦ 非零退出 fail-open：failed 记录 + warn + 后续命令继续
 *   ⑧ 未配置空转：parse [] + run(root, []) → ran:0（createGateSnapshot 零行为）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseGateSnapshotCommands, runGateSnapshotCommands } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ } } })

function captureWarn(fn) {
  const orig = console.warn
  const lines = []
  console.warn = (...a) => { lines.push(a.join(' ')) }
  try { fn() } finally { console.warn = orig }
  return lines
}

// ── ① 块列表形态 ──
test('① gate_snapshot.commands 块列表形态解析（段内 copy 键不干扰）', () => {
  const yaml = [
    'commands:',
    '  test: npm test',
    'gate_snapshot:',
    '  copy:',
    '    - src/generated',
    '  commands:',
    '    - npm run gen:build-id',
    '    - python scripts/gen_api.py',
  ].join('\n')
  assert.deepEqual(parseGateSnapshotCommands(yaml), ['npm run gen:build-id', 'python scripts/gen_api.py'])
})

// ── ② inline flow 形态 ──
test('② inline flow 形态解析（commands: [a, b]）', () => {
  const yaml = 'gate_snapshot:\n  copy: [src/generated]\n  commands: [npm run gen:build-id, python scripts/gen_api.py]\n'
  assert.deepEqual(parseGateSnapshotCommands(yaml), ['npm run gen:build-id', 'python scripts/gen_api.py'])
})

// ── ③ 尾注/引号剥离 ──
test('③ 条目尾注与成对引号剥离（_stripYamlValue 复用）', () => {
  const yaml = [
    'gate_snapshot:',
    '  commands:',
    '    - npm run gen:build-id # 生成 build-id（构建期产物）',
    '    - "npm run gen:api" # 带引号形态',
    "    - 'python scripts/gen.py'",
  ].join('\n')
  assert.deepEqual(parseGateSnapshotCommands(yaml), ['npm run gen:build-id', 'npm run gen:api', 'python scripts/gen.py'])
})

// ── ④ 未配置/空段 → [] ──
test('④ 未配置/空段 → []（存量 local.yaml 形态空转）', () => {
  assert.deepEqual(parseGateSnapshotCommands(''), [])
  assert.deepEqual(parseGateSnapshotCommands(null), [])
  assert.deepEqual(parseGateSnapshotCommands(undefined), [])
  assert.deepEqual(parseGateSnapshotCommands('commands:\n  test: npm test\n'), [], '无 gate_snapshot 段')
  assert.deepEqual(parseGateSnapshotCommands('gate_snapshot:\n  copy:\n    - src/generated\n'), [], '有 gate_snapshot 段但无 commands 键')
  assert.deepEqual(parseGateSnapshotCommands('gate_snapshot:\n  commands: []\n'), [], '空 inline flow')
})

// ── ⑤ 段外 commands 不误收 ──
test('⑤ 段外顶层 commands: 与其它段内嵌 commands: 不误收', () => {
  const yaml = [
    'commands:',          // 顶层命令段（gate_snapshot 之前）
    '  test: npm test',
    '  lint: npm run lint',
    'gate_snapshot:',
    '  commands:',
    '    - npm run real-gen',
    'other_section:',     // gate_snapshot 之后新顶层键出段
    '  commands:',
    '    - should-not-collect',
    'commands_after:',    // 顶层命令段（gate_snapshot 之后）
    '  build: npm run build',
  ].join('\n')
  assert.deepEqual(parseGateSnapshotCommands(yaml), ['npm run real-gen'])
})

// ── ⑥ 执行段：cwd=快照根，产出真实文件 ──
test('⑥ runGateSnapshotCommands 在快照根 cwd 执行并产出真实文件', () => {
  const root = mk('gscmd-run-')
  const r = runGateSnapshotCommands(root, ['node -e "require(\'fs\').writeFileSync(\'cmd-face.txt\',\'ok\')"'])
  assert.equal(r.ran, 1)
  assert.deepEqual(r.failed, [])
  assert.ok(existsSync(join(root, 'cmd-face.txt')), '命令在快照根 cwd 执行（产物落在 root）')
  assert.equal(readFileSync(join(root, 'cmd-face.txt'), 'utf8'), 'ok')
})

// ── ⑦ 非零退出 fail-open ──
test('⑦ 非零退出 fail-open：failed 记录 + warn + 后续命令继续', () => {
  const root = mk('gscmd-fail-')
  const w = captureWarn(() => {
    const r = runGateSnapshotCommands(root, [
      'node -e "process.exit(1)"',
      'node -e "require(\'fs\').writeFileSync(\'after-fail.txt\',\'ok\')"',
    ])
    assert.equal(r.ran, 2, '两条都执行（ran 含失败条）')
    assert.equal(r.failed.length, 1)
    assert.equal(r.failed[0].cmd, 'node -e "process.exit(1)"')
    assert.ok(/非零退出码 1/.test(r.failed[0].reason), `reason 记录退出码（实际：${r.failed[0].reason}）`)
  })
  assert.ok(w.some(x => x.includes('gate_snapshot.commands') && x.includes('process.exit(1)')), `warn 点名失败命令（实际：${w.join(' | ')}）`)
  assert.ok(existsSync(join(root, 'after-fail.txt')), '失败后后续命令继续执行')
})

// ── ⑧ 未配置空转 ──
test('⑧ 未配置空转：parse [] + run(root, []) → ran:0（createGateSnapshot 零行为）', () => {
  const root = mk('gscmd-none-')
  const parsed = parseGateSnapshotCommands('commands:\n  test: npm test\n')
  assert.deepEqual(parsed, [])
  const r = runGateSnapshotCommands(root, parsed)
  assert.equal(r.ran, 0)
  assert.deepEqual(r.failed, [])
  assert.equal(readdirSync(root).length, 0, '空清单零副作用（快照根无命令产物）')
})
