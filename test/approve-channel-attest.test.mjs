/**
 * approve-channel-attest.test.mjs — spec 断点批准通道化 + 拒绝后派生授权硬拦（2026-10-12-approve-channel-attest）
 *
 * 验收面：
 *   ① 三通道留痕：无 flag=unattested（零破坏+警示）/ --user-confirmed / --self-approved（自批
 *      警示+撤销指引）；spec_approved_channel 与 spec_attested_by 落盘正确；互斥同给 exit 2；
 *   ② flow reject：--reason 必填（exit 2）；撤销 spec_approved、落 spec_rejected* 系字段；
 *   ③ 拒后派生授权硬拦：spec_rejected 在场时无通道 approve exit 2（提示显式通道）；显式通道
 *      放行并写 spec_rejected_superseded_at（拒绝理由历史保留）；
 *   ④ approveChannelOf 单元（flow done 回显与遥测同源取值）：三态 / unattested-legacy 归一 /
 *      autopilot / none。
 * 驱动来源：2026-10-10~12 fire-equipment dogfood 复盘——8 次 approve 中 2 次为 agent 自批
 *（其中一次在用户明确拒绝后），留痕层面真批转述与自批不可区分。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

import { approveChannelOf } from '../src/flow.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const CHANGE = '2026-10-12-aca-fixture'

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'aca-'))
  mkdirSync(join(cwd, '.sillyspec', 'changes', CHANGE), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\n')
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
  const statePath = join(cwd, '.sillyspec', 'changes', CHANGE, 'flow-state.yaml')
  const state = () => yaml.load(readFileSync(statePath, 'utf8'))
  return { cwd, cli, state, statePath }
}

test('三通道留痕：unattested 默认（零破坏+警示）与两个显式通道', () => {
  const { cwd, cli, state } = makeRepo()
  try {
    // ① 无 flag：既有行为不变（exit 0）+ unattested 留痕 + 警示
    const r1 = cli(['flow', 'approve', '--change', CHANGE])
    assert.equal(r1.status, 0, r1.stderr)
    assert.match(r1.stdout, /unattested/)
    assert.match(r1.stderr, /attest 通道/)
    let st = state()
    assert.equal(st.spec_approved, true)
    assert.equal(st.spec_approved_channel, 'unattested')
    assert.equal(st.spec_attested_by, undefined)
    // ② --user-confirmed：转述通道 + attested_by 落盘
    const r2 = cli(['flow', 'approve', '--change', CHANGE, '--user-confirmed'])
    assert.equal(r2.status, 0, r2.stderr)
    assert.match(r2.stdout, /user-confirmed/)
    st = state()
    assert.equal(st.spec_approved_channel, 'user-confirmed')
    assert.equal(typeof st.spec_attested_by, 'string')
    // ③ --self-approved：自批警示 + 撤销指引
    const r3 = cli(['flow', 'approve', '--change', CHANGE, '--self-approved'])
    assert.equal(r3.status, 0, r3.stderr)
    assert.match(r3.stdout, /agent-self/)
    assert.match(r3.stdout, /flow reject/)
    st = state()
    assert.equal(st.spec_approved_channel, 'agent-self')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('互斥校验：两通道同给 exit 2 且状态未写', () => {
  const { cwd, cli, statePath } = makeRepo()
  try {
    const r = cli(['flow', 'approve', '--change', CHANGE, '--user-confirmed', '--self-approved'])
    assert.equal(r.status, 2)
    assert.match(r.stderr, /互斥/)
    assert.ok(!existsSync(statePath))
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('flow reject：reason 必填 + 撤销批准 + 拒绝字段留痕', () => {
  const { cwd, cli, state } = makeRepo()
  try {
    assert.equal(cli(['flow', 'approve', '--change', CHANGE, '--user-confirmed']).status, 0)
    const noReason = cli(['flow', 'reject', '--change', CHANGE])
    assert.equal(noReason.status, 2)
    assert.match(noReason.stderr, /--reason/)
    const r = cli(['flow', 'reject', '--change', CHANGE, '--reason', '方案不对'])
    assert.equal(r.status, 0, r.stderr)
    const st = state()
    assert.equal(st.spec_approved, false)
    assert.equal(st.spec_rejected, true)
    assert.equal(st.spec_rejected_reason, '方案不对')
    assert.ok(st.spec_rejected_at)
    assert.ok(st.spec_rejected_by)
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('拒后派生授权硬拦：无通道拒绝、显式通道放行+翻越戳+理由保留', () => {
  const { cwd, cli, state } = makeRepo()
  try {
    cli(['flow', 'approve', '--change', CHANGE, '--user-confirmed'])
    cli(['flow', 'reject', '--change', CHANGE, '--reason', '方案不对'])
    const blocked = cli(['flow', 'approve', '--change', CHANGE])
    assert.equal(blocked.status, 2)
    assert.match(blocked.stderr, /拒绝记录/)
    assert.match(blocked.stderr, /--user-confirmed/)
    assert.equal(state().spec_approved, false) // 硬拦路径未改状态
    const ok = cli(['flow', 'approve', '--change', CHANGE, '--user-confirmed'])
    assert.equal(ok.status, 0, ok.stderr)
    const st = state()
    assert.equal(st.spec_approved, true)
    assert.equal(st.spec_approved_channel, 'user-confirmed')
    assert.ok(st.spec_rejected_superseded_at)
    assert.equal(st.spec_rejected_reason, '方案不对')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('变更不存在：approve/reject 均 exit 2', () => {
  const { cwd, cli } = makeRepo()
  try {
    assert.equal(cli(['flow', 'approve', '--change', '2026-10-12-aca-missing']).status, 2)
    assert.equal(cli(['flow', 'reject', '--change', '2026-10-12-aca-missing', '--reason', 'r']).status, 2)
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('approveChannelOf：回显/遥测同源取值（三态/legacy 归一/autopilot/none）', () => {
  assert.equal(approveChannelOf({ autopilot: true }), 'autopilot')
  assert.equal(approveChannelOf({ spec_approved_channel: 'agent-self' }), 'agent-self')
  assert.equal(approveChannelOf({ spec_approved_channel: 'user-confirmed' }), 'user-confirmed')
  assert.equal(approveChannelOf({ spec_approved_channel: 'unattested' }), 'unattested')
  assert.equal(approveChannelOf({ spec_approved: true, spec_approved_by: 'old-session' }), 'unattested-legacy')
  assert.equal(approveChannelOf({}), 'none')
  assert.equal(approveChannelOf(null), 'none')
})
