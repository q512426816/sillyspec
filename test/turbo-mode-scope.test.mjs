/**
 * turbo-mode-scope.test.mjs — 作用域隔离（FR-05/D-007，2026-10-14-thin-turbo-mode）
 *
 * 覆盖验收面：
 *   ① 无环境变量旁路：非 turbo 仓设 SILLYSPEC_TURBO=1 → done 行为照旧（无极速面）——
 *      跳过面仅由 flow-state turbo 字段激活；
 *   ② --turbo --thick 同给：留痕落盘但 tier=thick → done 全量仪式（turbo 不生效，D-007 起步变体）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'turbo-scope-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return cwd
}

function cli(cwd, args, extraEnv = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0', ...extraEnv },
  })
}

function fillDesignSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  const rp = join(base, 'requirements.md')
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：夹具——一行作答即合规'))
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：夹具——无独立测试面'))
}

test('① 无环境变量旁路：SILLYSPEC_TURBO=1 对非 turbo 仓零作用', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-scope-t1'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot'], { SILLYSPEC_TURBO: '1' })
  assert.equal(s1.status, 0)
  assert.doesNotMatch(s1.stdout, /极速模式/, 'env 不触发极速面（仅 flow-state 字段激活）')
  const st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.doesNotMatch(st, /^turbo:/m, 'env 不落 turbo 留痕')
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  const s2 = cli(cwd, ['flow', 'done', '--change', change], { SILLYSPEC_TURBO: '1' })
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  assert.doesNotMatch(s2.stdout, /⚡极速模式/, 'done 侧 env 同样零作用')
  assert.match(s2.stdout, /test: —｜lint: —/, '实测门照常真跑（纯文档面走 gate 既有 skip 形态，非 turbo 合成对象）')
  rmSync(cwd, { recursive: true, force: true })
})

test('② --turbo --thick 同给：留痕但 tier=thick → done 全量仪式（D-007 起步变体）', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-scope-t2'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--turbo', '--thick'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stdout}\n${s1.stderr}`)
  // 指引文案随档位收窄（2026-10-14-turbo-guide-tier-copy 评审 P3 清偿）：thick 起步不承诺自动跳过
  assert.doesNotMatch(s1.stdout, /收口自动跳过实测与重仪式门/, 'thick 起步不出现跳过承诺（防文案与门判定漂移）')
  assert.match(s1.stdout, /⚡ 极速留痕已记（--turbo），但 --thick 厚档起步/, '档位如实文案在场（D-007）')
  const st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.match(st, /^tier: thick$/m, 'thick 起步')
  assert.match(st, /^turbo: true$/m, 'turbo 字段留痕（声明性）')
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.doesNotMatch(s2.stdout || '', /⚡极速模式｜/, '厚档 done 无极速跳过面')
  rmSync(cwd, { recursive: true, force: true })
})

test('④ turbo 值损坏（非布尔 true）fail-soft：done 走非 turbo 全量路径', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-scope-t4'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot', '--turbo', '--no-review'])
  assert.equal(s1.status, 0)
  // 篡改 turbo 值为字符串（读态 st.turbo === true 严格判等 → 非布尔真值不激活跳过面）；--no-review 定案评审豁免（非 turbo 路径采样不确定）
  const stPath = join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml')
  writeFileSync(stPath, readFileSync(stPath, 'utf8').replace(/^turbo: true$/m, "turbo: 'yes'"))
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  assert.doesNotMatch(s2.stdout, /⚡极速模式｜/, '损坏 turbo 值不激活跳过面（fail-soft 回退全量）')
  assert.match(s2.stdout, /test: —｜lint: —/, '实测门照常真跑')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ flow-state.yaml 整体损坏 fail-loud：done exit 2 报「无 flow-state」并指路', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-scope-t5'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot', '--turbo'])
  assert.equal(s1.status, 0)
  writeFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), '::: not yaml ::: [')
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.notEqual(s2.status, 0, '损坏 flow-state 必须拒绝（不可静默按非 turbo 收口）')
  assert.match(s2.stdout + s2.stderr, /无 flow-state\.yaml/, '报缺失并指路（readFlowState null 既有 fail-loud 语义）')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ 提示词面三处在场（FR-04 文案锚——防漂移）：AGENTS.md 极速行 + flow 卡 --turbo 文档', () => {
  const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')
  assert.match(agents, /--turbo/, 'AGENTS.md 选道表极速行带 --turbo')
  assert.match(agents, /禁止你自行启用/, '禁 agent 自启判据在场（D-001）')
  const card = readFileSync(join(ROOT, 'assets', 'command-cards', 'flow.md'), 'utf8')
  assert.match(card, /--turbo/, 'flow 命令卡 --turbo 文档在场')
  assert.match(card, /仅用户显式触发/, '卡内触发判据在场')
})
