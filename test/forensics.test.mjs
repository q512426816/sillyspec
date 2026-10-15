/**
 * forensics.test.mjs — 会话取证证据包装配（2026-10-15-session-forensics）
 *
 * 覆盖面：
 *   FR-01 六面证据包（change_key 精确过滤 / verify-runs mtime 近序+截断+同 mtime 字典序破平 /
 *         评审轮次 superseded 标注 / flow 态身份）+ 零写入 + 缺数据源降级 + 归档变更标注
 *   FR-02 取证任务书（六维度骨架 + 四纪律关键短语 + 证据包路径回填）
 *   FR-03 命令入口 --json 形态（runCapturing 捕 stdout，六面字段结构化在场）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { assembleForensicsPack, renderForensicsTaskbook, cmdForensics } from '../src/forensics.js'
import { runCapturing } from './_complete-step-harness.mjs'

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) } catch { /* Windows EPERM 可接受 */ }
}

function write(p, content) {
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, content)
}

/** 建 fixture：c1 活跃（flow 态+评审两轮）/ c2 归档 / 登记两变更 / 摩擦两变更 / verify-runs 两轮 */
function makeFixture(prefix) {
  const tmp = mkdtempSync(join(tmpdir(), prefix))
  const specBase = join(tmp, '.sillyspec')
  const runtimeRoot = join(specBase, '.runtime')
  write(join(specBase, 'changes', 'c1', 'flow-state.yaml'), 'tier: thin\nsubsteps:\n  patch: { status: done }\n')
  write(join(specBase, 'changes', 'c1', 'review.json'), '{"verdict":"PASS"}')
  write(join(specBase, 'changes', 'c1', 'review.json.superseded-20261015T000000'), '{"verdict":"FAIL"}')
  mkdirSync(join(specBase, 'changes', 'archive', 'c2'), { recursive: true })
  write(join(runtimeRoot, 'agent-session-log.json'), JSON.stringify({
    schema_version: 1,
    entries: [
      { change_key: 'c1', harness: 'zcode', log_path: '/logs/c1.jsonl', format: 'zcode-model-io-jsonl', session_id: 's1', exists: true },
      { change_key: 'c9', harness: 'zcode', log_path: '/logs/c9.jsonl', format: 'zcode-model-io-jsonl', session_id: 's9', exists: true },
    ],
  }))
  write(join(runtimeRoot, 'friction-ledger.json'), JSON.stringify([
    { change: 'c1', counts: { gate_rollback: 1 }, total: 1 },
    { change: 'c9', counts: {}, total: 0 },
  ]))
  const r1 = join(runtimeRoot, 'verify-runs', '20260101T0001')
  const r2 = join(runtimeRoot, 'verify-runs', '20260101T0002')
  write(join(r1, 'test-result.json'), '{"ok":true}')
  write(join(r2, 'test-result.json'), '{"ok":false}')
  // r2 更新（近序第一）；r1 更旧
  utimesSync(r1, new Date(1000000), new Date(1000000))
  utimesSync(r2, new Date(2000000), new Date(2000000))
  return { tmp, specBase, runtimeRoot }
}

/** 目录树指纹（相对路径 + 内容 sha）——零写入断言用。 */
function treeFingerprint(root) {
  const h = createHash('sha256')
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(join(dir, e.name), r)
      else h.update(r + '\0' + createHash('sha256').update(readFileSync(join(dir, e.name))).digest('hex') + '\0')
    }
  }
  walk(root, '')
  return h.digest('hex')
}

test('FR-01 六面证据包：change_key 精确过滤 / friction 过滤 / verify-runs 近序+截断 / 评审轮次 superseded 标注 / flow 态身份', () => {
  const { tmp, specBase, runtimeRoot } = makeFixture('ss-fx-')
  try {
    const pack = assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c1' })
    assert.equal(pack.identity.status, 'active')
    assert.equal(pack.identity.tier, 'thin')
    assert.ok(pack.identity.substeps && pack.identity.substeps.patch, 'flow-state substeps 透传')
    assert.equal(pack.agentLogs.length, 1, 'change_key=c9 被精确过滤剔除')
    assert.equal(pack.agentLogs[0].session_id, 's1')
    assert.equal(pack.friction.length, 1)
    assert.equal(pack.friction[0].counts.gate_rollback, 1)
    assert.equal(pack.verifyRuns.length, 2)
    assert.ok(pack.verifyRuns[0].dir.endsWith('20260101T0002'), 'mtime 近序：新者在前')
    assert.ok(pack.verifyRuns[0].resultPath && existsSync(pack.verifyRuns[0].resultPath))
    const one = assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c1', verifyRunsLimit: 1 })
    assert.equal(one.verifyRuns.length, 1, 'verifyRunsLimit 截断')
    assert.equal(pack.reviews.length, 2)
    const sup = pack.reviews.find((r) => r.superseded)
    assert.ok(sup && /superseded/.test(sup.file), 'superseded 轮标注在场')
    assert.ok(!pack.warnings.some((w) => w.includes('归档')), '活跃变更无归档注记')
  } finally { rmQuiet(tmp) }
})

test('FR-01 verify-runs 同 mtime 按路径字典序破平（排序确定性）', () => {
  const { tmp, specBase, runtimeRoot } = makeFixture('ss-fx2-')
  try {
    const r1 = join(runtimeRoot, 'verify-runs', '20260101T0001')
    const r2 = join(runtimeRoot, 'verify-runs', '20260101T0002')
    utimesSync(r1, new Date(5000000), new Date(5000000))
    utimesSync(r2, new Date(5000000), new Date(5000000))
    const pack = assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c1' })
    assert.ok(pack.verifyRuns[0].dir < pack.verifyRuns[1].dir, '同 mtime → 字典序')
  } finally { rmQuiet(tmp) }
})

test('FR-01 零写入：装配前后目录树指纹逐字节一致', () => {
  const { tmp, specBase, runtimeRoot } = makeFixture('ss-fx3-')
  try {
    const before = treeFingerprint(tmp)
    assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c1' })
    assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c1' })
    assert.equal(treeFingerprint(tmp), before, '只读命令不得留下任何文件痕迹')
  } finally { rmQuiet(tmp) }
})

test('FR-01 缺数据源降级：空 spec/runtime 六面为空清单+注记，不抛错', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ss-fx4-'))
  try {
    const specBase = join(tmp, '.sillyspec')
    const pack = assembleForensicsPack({ specBase, runtimeRoot: join(specBase, '.runtime'), changeName: 'nope' })
    assert.equal(pack.identity.status, 'missing')
    assert.deepEqual(pack.agentLogs, [])
    assert.deepEqual(pack.friction, [])
    assert.deepEqual(pack.verifyRuns, [])
    assert.deepEqual(pack.reviews, [])
    assert.ok(pack.warnings.length > 0, '降级注记在场')
    const tb = renderForensicsTaskbook(pack)
    assert.match(tb, /会话取证任务书 — nope/, '降级面任务书仍可渲染')
  } finally { rmQuiet(tmp) }
})

test('FR-01 归档变更：status=archived + 归档注记', () => {
  const { tmp, specBase, runtimeRoot } = makeFixture('ss-fx5-')
  try {
    const pack = assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c2' })
    assert.equal(pack.identity.status, 'archived')
    assert.ok(pack.warnings.some((w) => w.includes('归档')), '归档注记在场')
  } finally { rmQuiet(tmp) }
})

test('FR-02 任务书：六维度骨架 + 四纪律关键短语 + 证据包路径回填', () => {
  const { tmp, specBase, runtimeRoot } = makeFixture('ss-fx6-')
  try {
    const pack = assembleForensicsPack({ specBase, runtimeRoot, changeName: 'c1' })
    const tb = renderForensicsTaskbook(pack)
    for (const dim of ['时间线重建', '计划遵从', '重复工作', '停等与重试', '成本与轮次', '门禁摩擦']) {
      assert.ok(tb.includes(dim), `六维度之一在场：${dim}`)
    }
    assert.match(tb, /path:line/, '锚点铁律字面在场')
    assert.match(tb, /diagnosis-report\.md/, '唯一可写产物在场')
    assert.match(tb, /无法证实面/, '报告固定章节（不脑补出口）在场')
    assert.match(tb, /禁止全量扫读仓|先读证据包/, '先读本体纪律在场')
    assert.match(tb, /时间盒/, '时间盒收敛纪律在场')
    assert.match(tb, /不是封闭清单/, '维度开放性声明在场（零内容枚举红线）')
    assert.match(tb, /\/logs\/c1\.jsonl/, '证据包路径回填（会话日志）')
    assert.match(tb, /review\.json\.superseded/, '评审轮次路径回填')
  } finally { rmQuiet(tmp) }
})

test('FR-03 cmdForensics --json：stdout 结构化六面字段 + taskbook 随附', async () => {
  const { tmp, specBase } = makeFixture('ss-fx7-')
  try {
    const { stdout, error } = await runCapturing(() => cmdForensics(['--change', 'c1', '--json'], { cwd: tmp, specDir: specBase }))
    assert.ok(!error, `命令不应抛错: ${error && error.message}`)
    const out = JSON.parse(stdout.trim())
    assert.equal(out.identity.changeName, 'c1')
    assert.equal(out.agentLogs.length, 1)
    assert.equal(out.friction.length, 1)
    assert.equal(out.verifyRuns.length, 2)
    assert.equal(out.reviews.length, 2)
    assert.match(out.taskbook, /会话取证任务书 — c1/)
  } finally { rmQuiet(tmp) }
})

test('FR-03 cmdForensics 缺 --change：exit 2 + 用法文案', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ss-fx8-'))
  try {
    const { exitCode, stdout } = await runCapturing(() => cmdForensics([], { cwd: tmp }))
    assert.equal(exitCode, 2)
    assert.match(stdout, /用法: sillyspec diagnose --change/, '用法文案一次给全（cli-copy-selfsufficient）')
  } finally { rmQuiet(tmp) }
})
