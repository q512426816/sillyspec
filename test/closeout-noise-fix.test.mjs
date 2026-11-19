/**
 * closeout-noise-fix.test.mjs — 收口对账降噪三面（2026-11-19-closeout-noise-fix）
 *
 * ② collectDeletedFace（flow-parity.js）：已提交删除 ∪ 工作树未提交删除（rm 未 stage /
 *    git rm 已 stage）并集；非删除不进集；坏 baseline 只采工作树源（fail-safe）。
 * ② e2e：design 声明删除交付（已提交删除）→ flow done 不再「疑似跨仓声明」点名、
 *    ℹ️ 删除交付行在场；真跨仓形态（盘上不存在且非删除面）照常点名不误放（负例）。
 * ③a e2e：--accept-dirty-gap 签收持久化 flow-state（含签收文件清单，归档件可查）；
 *    预置签收清单断点续跑已签收面免拦；缺口面新增（不在清单）仍拦并报「增量」。
 * ③b e2e：实测命令在实测窗口内落脏文件 → 预检 0 缺口、权威门 N>0 → 「时点快照」
 *    解释行在场（数字是时点快照非口径漂移）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectDeletedFace } from '../src/flow-parity.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

/** thin 夹具（dirty-gate-ignore 同款骨架）：交付已提交 + 可选残渣面；opts.testCmd 覆盖实测命令。 */
function setupThinChange(cwd, cn, { extraYaml = '', testCmd = 'node exit0.js', baseExtra = [] } = {}) {
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `project:\n  type: generic\ncommands:\n  test: "${testCmd}"\nflow:\n  mode: thin\n` + extraYaml)
  writeFileSync(join(cwd, 'exit0.js'), 'process.exit(0)\n')
  for (const [rel, content] of baseExtra) {
    const p = join(cwd, ...rel.split('/'))
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content)
  }
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--no-review', '--input', '收口对账降噪协议测试夹具\n\n成功标准：\n- 降噪行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
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
  return { run, env, base }
}

const doneCmd = (cwd, cn, env, extra = []) =>
  spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn, ...extra], { cwd, encoding: 'utf8', timeout: 300_000, env })
/** 合并输出面断言用：dirty 门/对账警告走 stderr（console.warn/error），收口进度走 stdout。 */
const outOf = (d) => `${d.stdout || ''}\n${d.stderr || ''}`

// ── ② unit：collectDeletedFace 三源并集与 fail-safe ──────────────────────────
test('collectDeletedFace：已提交/未stage/已stage 删除并集，非删除不进，坏 baseline 只采工作树源', () => {
  const dir = mkdtempSync(join(tmpdir(), 'del-face-'))
  try {
    const run = gitRepo(dir)
    for (const f of ['a.js', 'b.js', 'c.js', 'd.js']) writeFileSync(join(dir, f), 'x\n')
    run(['add', '.']); run(['commit', '-q', '-m', 'base'])
    const base = run(['rev-parse', 'HEAD'])
    run(['rm', '-q', 'a.js']); run(['commit', '-q', '-m', 'del a']) // 已提交删除
    rmSync(join(dir, 'b.js')) // 工作树删除（未 stage）
    run(['rm', '-q', 'c.js']) // 已 stage 未提交删除（文件已删+index 已删）
    const face = collectDeletedFace(dir, base)
    assert.ok(face.has('a.js'), `已提交删除入集（实得 ${[...face].join(',')}）`)
    assert.ok(face.has('b.js'), '工作树删除入集')
    assert.ok(face.has('c.js'), '已 stage 删除入集')
    assert.ok(!face.has('d.js'), '在场非删除不入集')
    const face2 = collectDeletedFace(dir, 'deadbeef') // 坏 baseline：diff 源失败只采工作树源
    assert.ok(face2.has('b.js') && face2.has('c.js'), '坏 baseline 工作树源照采（fail-safe）')
    assert.ok(!face2.has('a.js'), '坏 baseline 已提交删除源缺席（diff 起不来）')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// ── ② e2e：删除交付不再误报「疑似跨仓」；真跨仓形态照常点名 ──────────────────
test('e2e：design 声明删除交付（已提交删除）→ 无「疑似跨仓」点名、ℹ️ 删除交付行在场、收口完成', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'noise-del-'))
  const cn = '2026-01-01-del-face'
  try {
    const { run, env, base } = setupThinChange(cwd, cn, { baseExtra: [['src/gone.js', 'export const g = 1\n']] })
    // base 提交含 src/gone.js（setupThinChange 已随 base 提交）；本变更提交删除
    run(['rm', '-q', 'src/gone.js'])
    run(['commit', '-q', '-m', `cleanup (${cn}) (task-01)`])
    // design 清单声明删除交付（路径主仓不在盘——删除语义）
    writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
      .replace('| 新增 | src/work.js | 交付 |', '| 新增 | src/work.js | 交付 |\n| 删除 | src/gone.js | 清理旧实现 |'))
    const d = doneCmd(cwd, cn, env)
    assert.equal(d.status, 0, `flow done 失败:\n${outOf(d)}\n${d.stderr}`)
    assert.ok(outOf(d).includes('不按跨仓嫌疑点名'), `删除交付 ℹ️ 行在场（尾部：${d.stdout.split('\n').slice(-8).join(' | ')}）`)
    assert.ok(!outOf(d).includes('疑似跨仓声明'), '删除交付不再误报疑似跨仓')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('e2e 负例：声明路径盘上不存在且非删除面 → 「疑似跨仓」点名照常（不误放）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'noise-cross-'))
  const cn = '2026-01-01-cross-face'
  try {
    const { env, base } = setupThinChange(cwd, cn)
    writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
      .replace('| 新增 | src/work.js | 交付 |', '| 新增 | src/work.js | 交付 |\n| 新增 | src/never-in-repo.js | 真跨仓形态 |'))
    const d = doneCmd(cwd, cn, env)
    assert.equal(d.status, 0, `flow done 失败:\n${outOf(d)}\n${d.stderr}`)
    assert.ok(outOf(d).includes('疑似跨仓声明'), '非删除面的缺路径照常点名（warn 不阻断）')
    assert.ok(outOf(d).includes('src/never-in-repo.js'), '点名含具体路径')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

// ── ③a e2e：--accept-dirty-gap 签收持久化 + 断点续跑免拦/增量拦截 ────────────
test('e2e：--accept-dirty-gap 签收清单持久化 flow-state（归档件可查）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'noise-acc-'))
  const cn = '2026-01-01-acc-sign'
  try {
    const { env } = setupThinChange(cwd, cn)
    mkdirSync(join(cwd, 'residue'), { recursive: true })
    writeFileSync(join(cwd, 'residue', 'tmp-x.js'), 'residue\n')
    const d = doneCmd(cwd, cn, env, ['--accept-dirty-gap'])
    assert.equal(d.status, 0, `签收收口失败:\n${outOf(d)}\n${d.stderr}`)
    const fs2 = readFileSync(join(cwd, '.sillyspec', 'changes', 'archive', cn, 'flow-state.yaml'), 'utf8')
    assert.ok(fs2.includes('accept_dirty_gap'), `签收段入 flow-state（实得片段：${fs2.slice(0, 400)}`)
    assert.ok(/files:[\s\S]*residue\/tmp-x\.js/.test(fs2), '签收文件清单入 flow-state')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('e2e：预置签收清单 → 已签收面免拦收口完成；新增缺口（不在清单）仍拦并报增量', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'noise-inc-'))
  const cn = '2026-01-01-acc-inc'
  try {
    const { env, base } = setupThinChange(cwd, cn)
    // 预置签收清单（模拟上一轮 --accept-dirty-gap 后断点续跑形态）
    writeFileSync(join(base, 'flow-state.yaml'), readFileSync(join(base, 'flow-state.yaml'), 'utf8')
      + "\naccept_dirty_gap:\n  at: '2026-01-01T00:00:00.000Z'\n  by: fixture\n  files:\n    - residue/signed.js\n")
    mkdirSync(join(cwd, 'residue'), { recursive: true })
    writeFileSync(join(cwd, 'residue', 'signed.js'), 'signed\n')
    writeFileSync(join(cwd, 'residue', 'new-gap.js'), 'new\n')
    const d1 = doneCmd(cwd, cn, env) // 无 flag：signed 免拦、new-gap 是增量 → 拦
    assert.notEqual(d1.status, 0, '增量缺口应拦')
    assert.ok(outOf(d1).includes('增量'), `增量提示在场（尾部：${d1.stdout.split('\n').slice(-10).join(' | ')}）`)
    assert.ok(outOf(d1).includes('已按签收免拦'), '签收免拦计数在场')
    // 清掉增量 → 重跑免拦收口完成
    rmSync(join(cwd, 'residue', 'new-gap.js'))
    const d2 = doneCmd(cwd, cn, env)
    assert.equal(d2.status, 0, `免拦收口失败:\n${d2.stdout}\n${d2.stderr}`)
    assert.ok(outOf(d2).includes('按签收免拦'), '签收免拦留痕行在场')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

// ── ③b e2e：实测窗口内 dirty 面新增 → 「时点快照」解释行 ────────────────────
test('e2e：实测命令落脏文件 → 预检 0/权威门 N → 「时点快照」解释行在场（数字非口径漂移）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'noise-snap-'))
  const cn = '2026-01-01-snapshot'
  try {
    // smoke 测试（base 提交，import 变更交付 src/work.js——动态子集非空实测才真跑）在实测窗口
    // 写主仓绝对路径脏文件——实测在 gate-snapshot 隔离目录里跑，相对路径写在快照内主仓不可见；
    // 绝对路径模拟「实测窗口内主仓 dirty 面新增」的真实形态（并行会话/工具写盘）。
    const smoke = `import { test } from 'node:test'\nimport { mkdirSync, writeFileSync } from 'node:fs'\nimport '../src/work.js'\ntest('smoke', () => {\n  mkdirSync(${JSON.stringify(join(cwd, 'residue'))}, { recursive: true })\n  writeFileSync(${JSON.stringify(join(cwd, 'residue', 'during-test.js'))}, 'x\\n')\n})\n`
    const { env } = setupThinChange(cwd, cn, {
      baseExtra: [['test/smoke.test.mjs', smoke]],
    })
    const d = doneCmd(cwd, cn, env) // 预检时 residue/ 不存在（0 缺口）→ 实测写脏 → 权威门 1 个
    assert.notEqual(d.status, 0, '权威门缺口应拦')
    assert.ok(outOf(d).includes('时点快照'), `解释行在场（尾部：${outOf(d).split('\n').slice(-12).join(' | ')}）`)
    assert.ok(outOf(d).includes('实测前）0 个') && outOf(d).includes('实测后）1 个'), '预检/权威门两时点数字披露')
    assert.ok(outOf(d).includes('非口径漂移'), '口径语义说明在场')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})
