/**
 * flow-done-preflight.test.mjs — 收口预检 fail-together（2026-10-23-flow-done-preflight）
 *
 * 预检=实测门前只读收集便宜阻断条件（dirty-gap/orphan），命中拦在付费实测之前、一次报全：
 *   ① dirty 命中：实测未启动（无实测输出行）+一次报全+零子步新增标记（FR-01）
 *   ② --accept-dirty-gap 镜像放行：实测照常启动、收口完成、权威门留痕（FR-01/FR-03）
 *   ③ unit 镜像守卫：patch done/turbo/--freeze-dirty/--accept-dirty-gap 四态不产 finding（FR-02）
 *   ④ 干净面全过：预检静默（输出无预检字样）、收口形态不变（FR-02）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectCloseoutPreflight } from '../src/flow-preflight.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

/** thin 变更夹具（thin-done-dirty-gate 同款形态）：start(autopilot+--no-review) → 四问一行作答 → 单任务证据提交。
 *  leaveDirty=true 时不提交 src/work.js（留作未提交交付缺口）。 */
function setupThinChange(cwd, cn, { leaveDirty = false } = {}) {
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--no-review', '--input', '收口预检 e2e 夹具面\n\n成功标准：\n- 预检行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规')
    + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 新增 | src/work.js | 交付 |\n')
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面')
  )
  writeFileSync(join(base, 'tasks.md'), '---\nauthor: fixture\n---\n\n# 任务注册表（Tasks）\n\n- [x] task-01: 交付 src/work.js（e2e 夹具）\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  writeFileSync(join(cwd, 'ev.txt'), 'tick evidence\n')
  run(['add', 'ev.txt'])
  run(['commit', '-q', '-m', 'chore: task tick evidence (task-01)'])
  if (!leaveDirty) {
    run(['add', 'src/work.js'])
    run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  }
  return { run, env, base }
}

const doneCmd = (cwd, cn, env, extra = []) =>
  spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn, ...extra], { cwd, encoding: 'utf8', timeout: 300_000, env })

test('① dirty 命中：实测未启动 + 一次报全 + 零子步新增标记', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pf-'))
  const cn = '2026-09-01-pf-1'
  try {
    setupThinChange(cwd, cn, { leaveDirty: true })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.ok(s.status !== 0, `拦截应非零退出（实际 ${s.status}）`)
    assert.match(out, /收口预检未过——1 项阻断条件/, '预检头行（fail-together 一次报全）')
    assert.match(out, /未提交交付文件未入冻结面/, '缺口条件行（权威门原版文案）')
    assert.match(out, /--accept-dirty-gap/, '三选一处置出路在场')
    assert.match(out, /src\/work\.js/, '缺口文件点名')
    assert.match(out, /快速通道/, '快速通道指引在场')
    assert.ok(!/开始 test\+lint 实测/.test(out), '实测未启动（无实测开始行）')
    assert.ok(!/实测面对账/.test(out), '实测未启动（无实测对账行）')
    assert.match(out, /中断于子步「patch」/, '断点续语义（reportMidFail）')
    assert.ok(!out.includes('已完成：artifacts、ledger'), 'ledger 未标记（预检拦截在实测门前）')
    const stText = readFileSync(join(cwd, '.sillyspec', 'changes', cn, 'flow-state.yaml'), 'utf8')
    assert.ok(!/ledger: done/.test(stText), 'flow-state 无 ledger 完成标记')
    assert.ok(!/patch: done/.test(stText), 'flow-state 无 patch 完成标记')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② --accept-dirty-gap 镜像放行：实测照常启动、收口完成、权威门留痕', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pf-'))
  const cn = '2026-09-01-pf-2'
  try {
    setupThinChange(cwd, cn, { leaveDirty: true })
    const s = doneCmd(cwd, cn, process.env, ['--accept-dirty-gap'])
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `应完成收口: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.ok(!out.includes('收口预检未过'), '旗标在场预检镜像放行')
    assert.match(out, /实测面对账/, '实测照常启动')
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', cn)
    assert.ok(existsSync(join(arch, 'change-patch.json')), '已归档留档')
    const pj = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    assert.ok(pj.acceptedDirtyGap >= 1, `权威门复核留痕 acceptedDirtyGap（实际 ${JSON.stringify(pj.acceptedDirtyGap)}）`)
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ unit 镜像守卫：patch done / turbo / --freeze-dirty / --accept-dirty-gap 四态不产 finding', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pf-u-'))
  try {
    const run = gitRepo(cwd)
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\n')
    writeFileSync(join(cwd, 'base.txt'), 'base\n')
    run(['add', '.']); run(['commit', '-q', '-m', 'base'])
    const baseline = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'dirty.js'), 'x\n') // 未提交交付缺口
    const specBase = join(cwd, '.sillyspec')
    const base = { cwd, specBase, change: '2026-09-01-pf-u', st: { baseline_commit: baseline, substeps: {} } }
    const hit = await collectCloseoutPreflight(base)
    assert.equal(hit.findings.length, 1, '缺省态产 dirty-gap finding（同权威门阻断）')
    assert.equal(hit.findings[0].id, 'dirty-gap')
    for (const [name, over] of [
      ['patch done 跳过', { st: { baseline_commit: baseline, substeps: { patch: 'done' } } }],
      ['turbo 降 advisory', { turbo: true }],
      ['--freeze-dirty 不拦', { freezeDirty: true }],
      ['--accept-dirty-gap 不拦', { acceptDirtyGap: true }],
    ]) {
      const r = await collectCloseoutPreflight({ ...base, ...over })
      assert.equal(r.findings.length, 0, `${name}：镜像权威门不产 finding`)
    }
    const noBaseline = await collectCloseoutPreflight({ ...base, st: { substeps: {} } })
    assert.equal(noBaseline.findings.length, 0, '无基线跳过（patch 子步整体跳过面）')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('④ 干净面全过：预检静默、收口形态不变', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pf-'))
  const cn = '2026-09-01-pf-4'
  try {
    setupThinChange(cwd, cn, { leaveDirty: false })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `干净面应完成收口: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.ok(!out.includes('收口预检未过'), '全过预检静默（零额外输出）')
    assert.match(out, /实测面对账/, '实测照常')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})
