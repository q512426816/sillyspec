/**
 * dirty-gate-ignore.test.mjs — dirty 门已知残渣忽略配置键（2026-10-23-dirty-gate-ignore）
 *
 * collectFreezeFiles 单一源剔除 local.yaml dirty_gate_ignore 命中面（权威门与预检同源继承）：
 *   ① 未配置 → 照常阻断、零剔除留痕（fail-soft 零回归锚，FR-02）
 *   ② 配置命中 → 缺口剔除、ℹ️ 留痕行、收口完成（FR-01/FR-03）
 *   ③ 前缀不命中 → 照常阻断（含第④条出路指引文案，FR-02）
 *   ④ unit：collectFreezeFiles 返回 dirtyIgnored/dirtyWarned 切分；未配置 dirtyIgnored 恒空（FR-01）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectFreezeFiles } from '../src/flow-parity.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

/** thin 夹具（thin-done-dirty-gate 同款）：交付已提交 + 额外撒 residue/ 残渣；extraYaml 追加 local.yaml 键。 */
function setupThinChange(cwd, cn, { extraYaml = '' } = {}) {
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n' + extraYaml)
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--no-review', '--input', 'dirty 忽略键 e2e 夹具\n\n成功标准：\n- 忽略键行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
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
  run(['add', 'ev.txt', 'src/work.js'])
  run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  // 已知残渣面（未提交、非 .sillyspec/、无他会话声明——未配置键时正是 dirty 门拦的形态）
  mkdirSync(join(cwd, 'residue'), { recursive: true })
  writeFileSync(join(cwd, 'residue', 'tmp-x.js'), 'residue\n')
  return { run, env, base }
}

const doneCmd = (cwd, cn, env, extra = []) =>
  spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn, ...extra], { cwd, encoding: 'utf8', timeout: 300_000, env })

test('① 未配置 → 照常阻断、无剔除留痕（fail-soft 零回归锚）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'dgi-'))
  const cn = '2026-09-01-dgi-1'
  try {
    setupThinChange(cwd, cn)
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.ok(s.status !== 0, `未配置应照常阻断（实际 ${s.status}）`)
    assert.match(out, /收口预检未过|收口阻断/, '阻断在场（预检或权威门）')
    assert.ok(!out.includes('dirty_gate_ignore 剔除'), '无剔除留痕行')
    assert.match(out, /residue\/tmp-x\.js/, '残渣文件仍点名')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② 配置命中 → 缺口剔除、ℹ️ 留痕行、收口完成（预检同源继承不产 finding）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'dgi-'))
  const cn = '2026-09-01-dgi-2'
  try {
    setupThinChange(cwd, cn, { extraYaml: 'dirty_gate_ignore: residue\n' })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `配置命中应完成收口: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.ok(!out.includes('收口预检未过') && !out.includes('收口阻断'), '预检与权威门均不拦')
    assert.match(out, /1 个 dirty 文件按 local\.yaml dirty_gate_ignore 剔除/, 'ℹ️ 剔除留痕行在场')
    assert.match(out, /residue\/tmp-x\.js/, '留痕点名被剔文件')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
    const pj = JSON.parse(readFileSync(join(cwd, '.sillyspec', 'changes', 'archive', cn, 'change-patch.json'), 'utf8'))
    assert.ok(!pj.files.includes('residue/tmp-x.js'), '剔除面不进冻结文件清单')
    assert.equal(pj.acceptedDirtyGap, undefined, '无缺口签收（被剔除而非被接受）')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 前缀不命中 → 照常阻断，阻断文案含第④条出路指引', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'dgi-'))
  const cn = '2026-09-01-dgi-3'
  try {
    setupThinChange(cwd, cn, { extraYaml: 'dirty_gate_ignore: other-area\n' })
    const s = doneCmd(cwd, cn, process.env)
    const out = s.stdout + s.stderr
    assert.ok(s.status !== 0, '前缀不命中介照常阻断')
    assert.match(out, /dirty_gate_ignore: <目录前缀>/, '第④条出路指引在场（教学自足）')
    assert.ok(!out.includes('dirty_gate_ignore 剔除'), '无剔除留痕行（未命中）')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('④ unit：collectFreezeFiles 切分 dirtyIgnored/dirtyWarned；未配置恒空', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'dgi-u-'))
  try {
    const run = gitRepo(cwd)
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    writeFileSync(join(cwd, 'base.txt'), 'base\n')
    run(['add', '.']); run(['commit', '-q', '-m', 'base'])
    mkdirSync(join(cwd, 'residue'), { recursive: true }); writeFileSync(join(cwd, 'residue', 'a.js'), 'x\n')
    mkdirSync(join(cwd, 'src'), { recursive: true }); writeFileSync(join(cwd, 'src', 'b.js'), 'y\n')
    const specBase = join(cwd, '.sillyspec')
    // 未配置：dirtyIgnored 恒空、dirtyWarned 全量（现状零回归）
    writeFileSync(join(specBase, 'local.yaml'), 'project:\n  type: generic\n')
    const r0 = collectFreezeFiles({ cwd, specBase, change: '2026-09-01-dgi-u', committed: [], exclusive: false })
    assert.deepEqual(r0.dirtyIgnored, [], '未配置 dirtyIgnored 空')
    assert.ok(r0.dirtyWarned.includes('residue/a.js') && r0.dirtyWarned.includes('src/b.js'), '全量进 dirtyWarned（现状）')
    // 配置命中：切分
    writeFileSync(join(specBase, 'local.yaml'), 'project:\n  type: generic\ndirty_gate_ignore: residue\n')
    const r1 = collectFreezeFiles({ cwd, specBase, change: '2026-09-01-dgi-u', committed: [], exclusive: false })
    assert.deepEqual(r1.dirtyIgnored, ['residue/a.js'], '命中面进 dirtyIgnored')
    assert.deepEqual(r1.dirtyWarned, ['src/b.js'], '未命中面进 dirtyWarned')
    // 坏键值（空段/纯空白）fail-soft 为空清单
    writeFileSync(join(specBase, 'local.yaml'), 'project:\n  type: generic\ndirty_gate_ignore: , ,\n')
    const r2 = collectFreezeFiles({ cwd, specBase, change: '2026-09-01-dgi-u', committed: [], exclusive: false })
    assert.deepEqual(r2.dirtyIgnored, [], '坏键值 fail-soft 空清单')
    // local.yaml 不可读（删除）fail-soft
    rmSync(join(specBase, 'local.yaml'), { force: true })
    const r3 = collectFreezeFiles({ cwd, specBase, change: '2026-09-01-dgi-u', committed: [], exclusive: false })
    assert.deepEqual(r3.dirtyIgnored, [], '不可读 fail-soft 空清单')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})
