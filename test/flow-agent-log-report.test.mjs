/**
 * flow-agent-log-report.test.mjs — flow 族入口接入 agent 会话日志登记+上报
 * （2026-09-29-flow-agent-log-report；对齐 runCommand 入口 run/command.js 同款调用）
 *
 * 覆盖验收面：
 *   ① flow start → runtimeRoot 下 agent-session-log.json own 条目携带 change_key=<change>，
 *      last_command 以 start 开头（flag 名级，不含 --input 值）；
 *   ② flow status 重入 → 同条目 invocations 递增、change_key 持久（flow 无 quick 会话概念，
 *      quick_id 恒 null）；
 *   ③ flow done 收口周期 → done 调用面同样登记（last_command 以 done 开头）；
 *   ④ 非 agent 环境（无 SILLYSPEC_AGENT_LOG、temp cwd 无 harness 会话）→ 不写盘不报错，
 *      协议面 exit 0 不受影响；
 *   ⑤ 上报关闭（SILLYSPEC_AGENT_LOG_PUSH=0）不影响登记留底（best-effort 通道语义）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const INPUT_OK = '加一个文件\n成功标准：\n- work.txt 生成且 flow done 全绿'

/** 造临时 git 仓 + local.yaml（thin 模式 + 快测试命令）+ 基线提交。 */
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'falr-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd, run }
}

/** 跑一次 CLI。agentEnv 传入则注入 SILLYSPEC_AGENT_LOG（env 覆盖=own 锚定，恒探测命中）。 */
function cli(cwd, args, { agentLog = null, pushOff = true } = {}) {
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  delete env.SILLYSPEC_AGENT_LOG
  if (agentLog) env.SILLYSPEC_AGENT_LOG = agentLog
  if (pushOff) env.SILLYSPEC_AGENT_LOG_PUSH = '0'
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env })
}

/** 读 runtimeRoot 下 agent-session-log.json（缺文件返回 null）。 */
function readArtifact(cwd) {
  const p = join(cwd, '.sillyspec', '.runtime', 'agent-session-log.json')
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf8'))
}

const toPosix = (p) => p.replace(/\\/g, '/')

/** agent 例行动作（双代格式正文作答）+ spec 断点批准（v2 起草变更的 done 前提）。 */
function fillSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  const dText = readFileSync(dp, 'utf8')
  if (/<!--AGENT:槽\d+/.test(dText)) {
    writeFileSync(dp, dText.replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——一行作答即合规'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 协议测试夹具行为\nGiven 轻量变更在跑\nWhen flow done 执行\nThen 全部子步通过')
      .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——无独立测试面'))
  } else {
    writeFileSync(dp, dText.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
  }
  const ap = cli(cwd, ['flow', 'approve', '--change', change])
  assert.equal(ap.status, 0, `flow approve 失败: ${ap.stdout}\n${ap.stderr}`)
}

test('① flow start 登记 own 条目：change_key=change，last_command=start 前缀且不含 flag 值', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-29-flow-alr-t1'
  const agentLog = join(cwd, 'fake-agent-session.jsonl')
  writeFileSync(agentLog, '{}\n')
  assert.ok(isAbsolute(agentLog), 'env 覆盖要求绝对路径（夹具前提）')

  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK], { agentLog })
  assert.equal(s.status, 0, `start 失败: ${s.stderr}\n${s.stdout}`)

  const art = readArtifact(cwd)
  assert.ok(art, 'agent-session-log.json 已落盘')
  const e = (art.entries || []).find(x => x.log_path === toPosix(agentLog))
  assert.ok(e, 'own 条目（env 覆盖路径）在 entries 中')
  assert.equal(e.harness, 'env-override')
  assert.equal(e.change_key, change, 'entry 级 change_key=flow change 名')
  assert.equal(e.quick_id, null, 'flow 无 quick 会话概念，quick_id 恒空')
  assert.match(e.last_command, /^start( --.*)?$/, 'last_command 以 start 开头')
  assert.ok(!e.last_command.includes(INPUT_OK), 'flag 值（--input 工作文本）不进产物')
  rmSync(cwd, { recursive: true, force: true })
})

test('② flow status 重入：invocations 递增、change_key 持久', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-29-flow-alr-t2'
  const agentLog = join(cwd, 'fake-agent-session.jsonl')
  writeFileSync(agentLog, '{}\n')

  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK], { agentLog }).status, 0)
  const st = cli(cwd, ['flow', 'status', '--change', change], { agentLog })
  assert.equal(st.status, 0, `status 失败: ${st.stderr}\n${st.stdout}`)
  assert.match(st.stdout, /📋/)

  const art = readArtifact(cwd)
  const e = (art.entries || []).find(x => x.log_path === toPosix(agentLog))
  assert.ok(e, '条目在')
  assert.equal(e.change_key, change, 'change_key 持久（status 调用 change_key 非空→重写同值）')
  assert.equal(e.invocations, 2, 'start+status 两次调用各计一次')
  assert.match(e.last_command, /^status( --.*)?$/)
  rmSync(cwd, { recursive: true, force: true })
})

test('③ flow done 收口周期：done 调用面同样登记（last_command=done 前缀）', () => {
  const { cwd, run } = makeRepo()
  const change = '2026-09-29-flow-alr-t3'
  const agentLog = join(cwd, 'fake-agent-session.jsonl')
  writeFileSync(agentLog, '{}\n')

  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK, '--no-review'], { agentLog }).status, 0)
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  run(['add', 'work.txt'])
  run(['commit', '-q', '-m', 'work (task-01)'])
  fillSlots(cwd, change)

  const d = cli(cwd, ['flow', 'done', '--change', change], { agentLog })
  assert.equal(d.status, 0, `done 失败: ${d.stdout}\n${d.stderr}`)
  assert.match(d.stdout, /flow done 完成（2\/2 协议调用收口）/)
  assert.equal(existsSync(join(cwd, '.sillyspec', 'changes', change)), false, '已归档')

  const art = readArtifact(cwd)
  const e = (art.entries || []).find(x => x.log_path === toPosix(agentLog))
  assert.ok(e, '条目在')
  assert.equal(e.change_key, change, '归档收口调用仍携带 change_key')
  assert.match(e.last_command, /^done( --.*)?$/)
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 非 agent 环境：不写盘不报错，协议面不受影响', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-29-flow-alr-t4'
  // temp cwd 无任何 harness 会话文件，且不注入 SILLYSPEC_AGENT_LOG → 探测 0 条不写盘
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK], { agentLog: null })
  assert.equal(s.status, 0, `start 应正常: ${s.stderr}\n${s.stdout}`)
  assert.match(s.stdout, /协议调用 1\/2/)
  assert.equal(readArtifact(cwd), null, '无 agent 环境不写 agent-session-log.json')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ flow amend-draft 登记面：last_command=amend-draft 前缀；非法变更名被白名单拦在登记之前（评审 P1/P2 修复）', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-29-flow-alr-t5'
  const agentLog = join(cwd, 'fake-agent-session.jsonl')
  writeFileSync(agentLog, '{}\n')

  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', INPUT_OK], { agentLog }).status, 0)
  // v2（2026-10-04-thin-docs-v2）：amend 对「首版全文↔当前全文」算改写比——先做一笔正文改动
  const _p = join(cwd, '.sillyspec', 'changes', change, 'proposal.md')
  writeFileSync(_p, readFileSync(_p, 'utf8').replace(/^任务原话转写：/m, '任务原话转写（amend 登记面夹具）：'))
  const a = cli(cwd, ['flow', 'amend-draft', '--change', change], { agentLog })
  assert.equal(a.status, 0, `amend-draft 失败: ${a.stdout}\n${a.stderr}`)
  assert.match(a.stdout, /留痕重锚/)

  let art = readArtifact(cwd)
  let e = (art.entries || []).find(x => x.log_path === toPosix(agentLog))
  assert.ok(e, '条目在')
  assert.equal(e.change_key, change)
  assert.match(e.last_command, /^amend-draft( --.*)?$/)
  const invocationsBefore = e.invocations

  // 非法变更名（路径分隔符）在 amend-draft 分支被白名单 exit 2 拦截，登记不发生（invocations 不变）
  const bad = cli(cwd, ['flow', 'amend-draft', '--change', '../evil'], { agentLog })
  assert.equal(bad.status, 2, '非法变更名应 exit 2')
  assert.match(bad.stderr, /非法变更名/)
  art = readArtifact(cwd)
  e = (art.entries || []).find(x => x.log_path === toPosix(agentLog))
  assert.ok(e, '条目仍在')
  assert.equal(e.invocations, invocationsBefore, '被拒调用不递增 invocations（登记先于校验的 P1 已修）')
  assert.match(e.last_command, /^amend-draft( --.*)?$/, 'last_command 不被非法调用改写')
  rmSync(cwd, { recursive: true, force: true })
})

