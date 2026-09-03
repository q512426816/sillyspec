/**
 * agent-session-log 测试（多 harness 本地 agent 会话日志探测 + 登记，平台会话解析用）
 *
 * 验证：
 * 1. mungeClaudeProjectDir：Claude Code 项目目录 slug 规则（实证本机 ~/.claude/projects/ 命名）。
 * 2. detectAgentLogEntries 多 harness：
 *    - env 覆盖（绝对/相对路径，独立于任何 harness 标记）
 *    - claude-code（env 门控 + 活跃窗口 + 窗口外不登 + CLAUDE_SESSION_ID 精确匹配 + 子目录 cwd）
 *    - codex（sessions/YYYY/MM/DD/rollout 首行 session_meta.cwd 精确匹配 / 异 cwd 不登 / originator 带出）
 *    - zcode（ZCODE_* env 门控 + 首块工作目录标记 cwd 精确归属：异项目活跃会话不登 /
 *      无标记 fail-closed 不登 / subagent <env> 标记形态同命中 / session_id 剥前缀）
 * 3. recordAgentLogInvocation：产物落盘与合并语义（新建 / invocations 递增 / 多路径共存 /
 *    entries 上限 / 平台模式 workspace 元信息 / session_id 入产物 / 非 agent 环境不写盘）。
 * 4. readAgentLogArtifact / resolveAgentLogArtifactPath：读回 + 落点解析（本地/平台指针/损坏指针）。
 * 5. CLI 集成：sillyspec agent-log [--detect] [--json]。
 * 6. 会话化上下文（2026-08-23-agent-activity-sessions）：entry 级 change_key/quick_id
 *    （检出随 run 持久化 / 存量 entry 原值保留 / 旧留底产物无字段合并兼容 / quick 互斥优先）
 *    + body 级 hub_session_id（env SILLYHUB_SESSION_ID 或 context 显式，缺失不带）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import {
  mungeClaudeProjectDir,
  mungePiSafePath,
  mungeDshSafePath,
  detectAgentLogEntries,
  recordAgentLogInvocation,
  readAgentLogArtifact,
  resolveAgentLogArtifactPath,
  AGENT_LOG_ENV_OVERRIDE,
  AGENT_LOG_ARTIFACT_FILENAME,
  AGENT_LOG_SCHEMA_VERSION,
} from '../src/agent-session-log.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

// 造 Claude Code fixture：<home>/.claude/projects/<mungedCwd>/<name>.jsonl（可指定 mtime）
function makeClaudeFixture(home, cwd, files) {
  const projectDir = join(home, '.claude', 'projects', mungeClaudeProjectDir(cwd))
  mkdirSync(projectDir, { recursive: true })
  for (const { name, mtimeMs } of files) {
    const p = join(projectDir, name)
    writeFileSync(p, '{}\n')
    if (mtimeMs !== undefined) utimesSync(p, new Date(mtimeMs), new Date(mtimeMs))
  }
  return projectDir
}

// 造 Codex fixture：<home>/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl（首行 session_meta）
// 日期目录按「探测时钟的本地日期」计算（与实现同口径，测试跨时区安全）
function codexDayDir(home, now) {
  const d = new Date(now)
  return join(home, '.codex', 'sessions',
    String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'))
}

function makeCodexFixture(home, now, files) {
  const dayDir = codexDayDir(home, now)
  mkdirSync(dayDir, { recursive: true })
  for (const { name, cwd, originator, sessionId, mtimeMs } of files) {
    const p = join(dayDir, name)
    writeFileSync(p, JSON.stringify({
      timestamp: new Date(mtimeMs ?? now).toISOString(),
      type: 'session_meta',
      payload: { session_id: sessionId || name.replace(/^rollout-/, '').replace(/\.jsonl$/, '').split('-').pop(), cwd, originator: originator || 'cli' },
    }) + '\n{}\n')
    if (mtimeMs !== undefined) utimesSync(p, new Date(mtimeMs), new Date(mtimeMs))
  }
  return dayDir
}

// 造 ZCode fixture：<home>/.zcode/cli/rollout/model-io-sess_<id>.jsonl
// cwd 指定时写实证形态首行（系统提示词环境段工作目录标记，JSON.stringify 自然产生 \\ 与
// \n 内嵌转义）；style 区分主会话（Primary working directory）与 subagent（<env> Working
// directory）两种实证形态。无 cwd 写空对象（模拟读不出标记的文件）。
function makeZcodeFixture(home, files) {
  const dir = join(home, '.zcode', 'cli', 'rollout')
  mkdirSync(dir, { recursive: true })
  for (const { name, cwd, style, mtimeMs } of files) {
    const p = join(dir, name)
    const envText = style === 'subagent'
      ? `useful information about the environment you are running in:\n<env>\nWorking directory: ${cwd}\nIs directory a git repository: yes\n`
      : `# Environment\n\nPrimary working directory: ${cwd}\n- Is a git repository: yes\n`
    writeFileSync(p, cwd
      ? JSON.stringify({ request: { body: { system: [{ type: 'text', text: envText }] } } }) + '\n'
      : '{}\n')
    if (mtimeMs !== undefined) utimesSync(p, new Date(mtimeMs), new Date(mtimeMs))
  }
  return dir
}

const NOW = Date.parse('2026-08-23T10:00:00.000Z')
const WIN_CWD = 'C:\\proj\\demo'   // 模拟 daemon 拉起 agent 的工作目录（Windows 反斜杠形态）

console.log('--- 1. mungeClaudeProjectDir（实证 slug 规则）---')
{
  assert(mungeClaudeProjectDir('C:\\Users\\qinyi\\IdeaProjects\\sillyspec') === 'C--Users-qinyi-IdeaProjects-sillyspec',
    '主仓路径 → C--Users-qinyi-IdeaProjects-sillyspec')
  assert(mungeClaudeProjectDir('C:\\Users\\qinyi\\IdeaProjects\\sillyspec\\.worktrees\\8f1ef36b') === 'C--Users-qinyi-IdeaProjects-sillyspec--worktrees-8f1ef36b',
    'worktree 路径 → ...--worktrees-8f1ef36b（. 与 \\ 都替换为 -）')
  assert(mungeClaudeProjectDir('/home/alice/project') === '-home-alice-project', 'POSIX 路径同样规则')
}

console.log('--- 2. env 覆盖（独立通道，任何 CLI 都可显式指定）---')
{
  const home = makeTmpDir('al-env-')
  const logFile = join(home, 'agent-output.jsonl')
  writeFileSync(logFile, '{}\n')

  const r1 = detectAgentLogEntries({ cwdCandidates: ['/proj'], env: { [AGENT_LOG_ENV_OVERRIDE]: logFile }, homeDir: home, now: NOW })
  assert(r1.length >= 1 && r1.some(e => e.detected_via === 'env' && e.harness === 'env-override'),
    '绝对路径 env 覆盖 → env-override 条目')
  assert(r1.find(e => e.detected_via === 'env').log_path === logFile.replace(/\\/g, '/'), 'log_path 归一正斜杠')

  const r2 = detectAgentLogEntries({ cwdCandidates: ['/proj'], env: { [AGENT_LOG_ENV_OVERRIDE]: 'relative/path.jsonl' }, homeDir: home, now: NOW })
  assert(r2.length === 0, '相对路径 env 覆盖被忽略')
}

console.log('--- 3. claude-code 自动探测 ---')
{
  const home = makeTmpDir('al-cc-')
  // 活跃主会话（2 分钟前）、活跃子代理会话（5 分钟前）、窗口外旧会话（2 小时前）
  makeClaudeFixture(home, WIN_CWD, [
    { name: 'main-session.jsonl', mtimeMs: NOW - 2 * 60 * 1000 },
    { name: 'sub-agent.jsonl', mtimeMs: NOW - 5 * 60 * 1000 },
    { name: 'stale-old.jsonl', mtimeMs: NOW - 2 * 60 * 60 * 1000 },
  ])
  const env = { CLAUDECODE: '1' }

  const r = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env, homeDir: home, now: NOW })
  const cc = r.filter(e => e.harness === 'claude-code')
  assert(cc.length === 2, `活跃窗口内 2 条（实际 ${cc.length}）——窗口外旧会话不登`)
  assert(cc[0].log_path.endsWith('main-session.jsonl'), 'mtime 新的在首位')
  assert(cc.every(e => e.format === 'claude-code-jsonl' && e.session_id), 'format/session_id 标注')

  const r2 = detectAgentLogEntries({
    cwdCandidates: [WIN_CWD], env: { CLAUDECODE: '1', CLAUDE_SESSION_ID: 'sub-agent' }, homeDir: home, now: NOW,
  })
  assert(r2.some(e => e.detected_via === 'claude-code-session-id' && e.log_path.endsWith('sub-agent.jsonl')),
    'CLAUDE_SESSION_ID 精确匹配条目在列')

  const r3 = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: {}, homeDir: home, now: NOW })
  assert(!r3.some(e => e.harness === 'claude-code'), '无 CLAUDECODE/CLAUDE_CODE_ENTRYPOINT 标记不探测')

  // 子目录 cwd 候选：agent 在子目录启动，transcript 挂子目录 slug 下
  makeClaudeFixture(home, `${WIN_CWD}\\backend`, [{ name: 'sub-cwd-session.jsonl', mtimeMs: NOW - 60 * 1000 }])
  const r4 = detectAgentLogEntries({ cwdCandidates: [`${WIN_CWD}\\backend`, WIN_CWD], env, homeDir: home, now: NOW })
  assert(r4.some(e => e.log_path.endsWith('sub-cwd-session.jsonl')), '子目录 cwd 候选也能探测到')
}

console.log('--- 4. codex 自动探测（session_meta.cwd 精确匹配）---')
{
  const home = makeTmpDir('al-cx-')
  makeCodexFixture(home, NOW, [
    { name: 'rollout-2026-08-23T09-58-00-aaaa1111.jsonl', cwd: WIN_CWD, originator: 'sillyhub-daemon', mtimeMs: NOW - 2 * 60 * 1000 },
    { name: 'rollout-2026-08-23T09-50-00-bbbb2222.jsonl', cwd: 'C:\\other\\project', originator: 'cli', mtimeMs: NOW - 3 * 60 * 1000 },
    { name: 'rollout-2026-08-23T07-00-00-cccc3333.jsonl', cwd: WIN_CWD, originator: 'cli', mtimeMs: NOW - 3 * 60 * 60 * 1000 },
  ])

  const r = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: {}, homeDir: home, now: NOW })
  const cx = r.filter(e => e.harness === 'codex')
  assert(cx.length === 1, `cwd 匹配仅 1 条（实际 ${cx.length}）——异项目 cwd 与窗口外都不登`)
  assert(cx[0].log_path.includes('aaaa1111') && cx[0].originator === 'sillyhub-daemon', 'originator（派发来源）带出')
  assert(cx[0].session_id === 'aaaa1111' && cx[0].format === 'codex-rollout-jsonl', 'session_id/format 标注')

  // 正斜杠 cwd 也能匹配（Windows 大小写 + 分隔符归一口径）
  const r2 = detectAgentLogEntries({ cwdCandidates: ['c:/proj/demo'], env: {}, homeDir: home, now: NOW })
  assert(r2.filter(e => e.harness === 'codex').length === 1, 'cwd 匹配容忍大小写/分隔符差异')

  // CODEX_HOME 重定向
  const customHome = makeTmpDir('al-cx2-')
  makeCodexFixture(customHome, NOW, [{ name: 'rollout-2026-08-23T09-59-00-dddd4444.jsonl', cwd: '/x/y', mtimeMs: NOW - 60 * 1000 }])
  const r3 = detectAgentLogEntries({ cwdCandidates: ['/x/y'], env: { CODEX_HOME: join(customHome, '.codex') }, homeDir: makeTmpDir('al-cx2-empty-'), now: NOW })
  assert(r3.filter(e => e.harness === 'codex').length === 1, 'CODEX_HOME 重定向生效')
}

console.log('--- 5. zcode 自动探测（env 门控 + 工作目录标记 cwd 精确归属）---')
{
  const home = makeTmpDir('al-zc-')
  makeZcodeFixture(home, [
    { name: 'model-io-sess_f9c2d817-bbdb-4500-b716-5f45099e43e9.jsonl', cwd: WIN_CWD, mtimeMs: NOW - 60 * 1000 },
    { name: 'model-io-sess_subagent_agent_781ce17b-b3cb-430e-8d78-a47b9729cc49.jsonl', cwd: WIN_CWD, style: 'subagent', mtimeMs: NOW - 2 * 60 * 1000 },
    // 异项目并行会话（bug 实证形态：rollout 目录全局共享，另一 ZCode 窗口的活跃会话，
    // mtime 比本会话新——修复前会排 entries 首位被上报为本地 agent 日志）
    { name: 'model-io-sess_6a053981-3b46-4667-8204-49140bd3f736.jsonl', cwd: 'C:\\other\\project', mtimeMs: NOW - 30 * 1000 },
    // 无工作目录标记的活跃文件（标记读不出 fail-closed 丢弃）
    { name: 'model-io-sess-nomarker.jsonl', mtimeMs: NOW - 40 * 1000 },
    // 窗口外旧会话
    { name: 'model-io-sess-old.jsonl', cwd: WIN_CWD, mtimeMs: NOW - 3 * 60 * 60 * 1000 },
  ])

  const r = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: { ZCODE_APP_VERSION: '3.8.1' }, homeDir: home, now: NOW })
  const zc = r.filter(e => e.harness === 'zcode')
  assert(zc.length === 2, `本 cwd 活跃 2 条（主+subagent，实际 ${zc.length}）——异项目/无标记/窗口外都不登`)
  assert(zc.some(e => e.session_id === 'f9c2d817-bbdb-4500-b716-5f45099e43e9'), 'session_id 剥 model-io-sess_ 前缀')
  assert(zc.some(e => e.log_path.includes('subagent_agent_781ce17b')), 'subagent 会话（<env> Working directory 标记形态）同命中')
  assert(zc.every(e => e.format === 'zcode-model-io-jsonl' && e.detected_via === 'zcode-workdir-marker'), 'format/detected_via 标注')
  assert(!zc.some(e => e.log_path.includes('6a053981') || e.log_path.includes('nomarker')),
    '异项目活跃会话被 cwd 校验拦截（本 bug 修复点）；无标记文件 fail-closed 丢弃')
  assert(zc.every(e => e.agent_cwd === 'C:/proj/demo'), 'agent_cwd 用文件真实工作目录（非 CLI cwd 冒充）')

  // cwd 匹配容忍大小写/分隔符差异（标记值为反斜杠形态，候选正斜杠小写）
  const rSlash = detectAgentLogEntries({ cwdCandidates: ['c:/proj/demo'], env: { ZCODE_APP_VERSION: '3.8.1' }, homeDir: home, now: NOW })
  assert(rSlash.filter(e => e.harness === 'zcode').length === 2, 'cwd 匹配容忍大小写/分隔符差异')

  const r2 = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: {}, homeDir: home, now: NOW })
  assert(!r2.some(e => e.harness === 'zcode'), '无 ZCODE_* 标记不探测')
}

console.log('--- 6. pi 自动探测（safePath 即 cwd 编码，源码实证规则）---')
{
  assert(mungePiSafePath('C:\\proj\\demo') === '--C--proj-demo--', 'safePath：去首斜杠 + /:\\ 替 - + 双横线包裹')
  assert(mungePiSafePath('/home/alice/p') === '--home-alice-p--', 'POSIX 同规则')

  const home = makeTmpDir('al-pi-')
  const projDir = join(home, '.pi', 'agent', 'sessions', mungePiSafePath(WIN_CWD))
  mkdirSync(projDir, { recursive: true })
  const sess = join(projDir, 'session.jsonl')
  writeFileSync(sess, '{}\n')
  utimesSync(sess, new Date(NOW - 60 * 1000), new Date(NOW - 60 * 1000))

  const r = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: {}, homeDir: home, now: NOW })
  const pi = r.filter(e => e.harness === 'pi')
  assert(pi.length === 1 && pi[0].format === 'pi-session-jsonl' && pi[0].detected_via === 'pi-safe-path',
    '活跃 session.jsonl 探测到（无需 env 标记）')

  utimesSync(sess, new Date(NOW - 3 * 60 * 60 * 1000), new Date(NOW - 3 * 60 * 60 * 1000))
  const r2 = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: {}, homeDir: home, now: NOW })
  assert(!r2.some(e => e.harness === 'pi'), '窗口外不登')

  const r3 = detectAgentLogEntries({ cwdCandidates: ['D:\\other'], env: {}, homeDir: home, now: NOW })
  assert(!r3.some(e => e.harness === 'pi'), '异 cwd 不登（目录名即归属）')
}

console.log('--- 7. deepseek-dsh 自动探测（zstd 压缩会话，projcache 实证规则）---')
{
  assert(mungeDshSafePath('C:\\proj\\demo') === '--C-proj-demo--', 'safePath：与 pi 构但 : 删除非替换')
  assert(mungeDshSafePath('C:\\proj\\demo') !== mungePiSafePath('C:\\proj\\demo'), '与 pi 编码可区分（C-proj vs C--proj）')

  const home = makeTmpDir('al-dsh-')
  const projDir = join(home, '.dsh', 'sessions', mungeDshSafePath(WIN_CWD))
  for (const [uuid, ageMin] of [['aaaa1111', 1], ['bbbb2222', 10], ['cccc3333', 3 * 60]]) {
    const d = join(projDir, `session-${uuid}`)
    mkdirSync(d, { recursive: true })
    const f = join(d, 'session.jsonl.zstd')
    writeFileSync(f, 'x\n')
    utimesSync(f, new Date(NOW - ageMin * 60 * 1000), new Date(NOW - ageMin * 60 * 1000))
  }

  const r = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: {}, homeDir: home, now: NOW })
  const dsh = r.filter(e => e.harness === 'deepseek-dsh')
  assert(dsh.length === 2, `活跃 2 条（实际 ${dsh.length}）——窗口外不登`)
  assert(dsh[0].session_id === 'aaaa1111' && dsh[0].format === 'dsh-session-jsonl-zstd',
    'session_id 剥 session- 前缀 + zstd format 标注')
  assert(dsh.every(e => e.log_path.endsWith('session.jsonl.zstd')), 'log_path 指向压缩会话文件')
}

console.log('--- 8. cursor / opencode（loose 探测器：仅 precise 全落空时启用）---')
{
  const home = makeTmpDir('al-loose-')
  // cursor fixture：chats/<ws>/<uuid>/{store.db, store.db-wal}——db 旧 wal 新（WAL 活跃形态）
  const chatDir = join(home, '.cursor', 'chats', 'ws1hash', '6e943a08-04bb-46e0-ad44-05c7303fe26d')
  mkdirSync(chatDir, { recursive: true })
  writeFileSync(join(chatDir, 'meta.json'), '{}\n')
  writeFileSync(join(chatDir, 'store.db'), 'x')
  writeFileSync(join(chatDir, 'store.db-wal'), 'x')
  utimesSync(join(chatDir, 'store.db'), new Date(NOW - 3 * 60 * 60 * 1000), new Date(NOW - 3 * 60 * 60 * 1000))
  utimesSync(join(chatDir, 'store.db-wal'), new Date(NOW - 30 * 1000), new Date(NOW - 30 * 1000))

  // opencode fixture：$XDG_DATA_HOME/opencode/storage/session/info/<id>.json（含 cwd）
  const xdgData = makeTmpDir('al-oc-data-')
  const infoDir = join(xdgData, 'opencode', 'storage', 'session', 'info')
  mkdirSync(infoDir, { recursive: true })
  writeFileSync(join(infoDir, 'sess_01AAA.json'), JSON.stringify({ directory: WIN_CWD }))
  utimesSync(join(infoDir, 'sess_01AAA.json'), new Date(NOW - 45 * 1000), new Date(NOW - 45 * 1000))
  const ocEnv = { XDG_DATA_HOME: xdgData }

  // 独立场景（无任何 precise 线索）：cursor + opencode 都登
  const r = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: ocEnv, homeDir: home, now: NOW })
  const cur = r.filter(e => e.harness === 'cursor')
  const oc = r.filter(e => e.harness === 'opencode')
  assert(cur.length === 1 && cur[0].session_id === '6e943a08-04bb-46e0-ad44-05c7303fe26d'
    && cur[0].format === 'cursor-chat-sqlite', 'cursor：WAL 侧车活跃即登（sqlite 会话目录）')
  assert(oc.length === 1 && oc[0].session_id === 'sess_01AAA'
    && oc[0].log_path.endsWith('opencode/storage/session'), 'opencode：info 含 cwd 命中 → session 根登记')

  // 压制场景：同 home 存在 precise 命中（zcode env + rollout cwd 匹配）→ loose 全部不登
  makeZcodeFixture(home, [{ name: 'model-io-sess_z1.jsonl', cwd: WIN_CWD, mtimeMs: NOW - 20 * 1000 }])
  const r2 = detectAgentLogEntries({
    cwdCandidates: [WIN_CWD], env: { ...ocEnv, ZCODE_APP_VERSION: '3.8.1' }, homeDir: home, now: NOW,
  })
  assert(r2.some(e => e.harness === 'zcode'), 'zcode precise 命中')
  assert(!r2.some(e => e.harness === 'cursor' || e.harness === 'opencode'),
    'precise 命中时 loose（cursor/opencode）被压制——防其他项目会话误报')

  // opencode info 不含当前 cwd → 不登
  const otherData = makeTmpDir('al-oc-other-')
  const otherInfo = join(otherData, 'opencode', 'storage', 'session', 'info')
  mkdirSync(otherInfo, { recursive: true })
  writeFileSync(join(otherInfo, 'sess_02BBB.json'), JSON.stringify({ directory: 'D:\\elsewhere' }))
  utimesSync(join(otherInfo, 'sess_02BBB.json'), new Date(NOW - 30 * 1000), new Date(NOW - 30 * 1000))
  const r3 = detectAgentLogEntries({ cwdCandidates: [WIN_CWD], env: { XDG_DATA_HOME: otherData }, homeDir: makeTmpDir('al-empty2-'), now: NOW })
  assert(!r3.some(e => e.harness === 'opencode'), 'opencode info cwd 不匹配不登')
}

console.log('--- 9. recordAgentLogInvocation：落盘与合并 ---')
{
  const root = makeTmpDir('al-rec-')
  const specBase = join(root, '.sillyspec')
  const home = makeTmpDir('al-rec-home-')
  const logA = join(home, 'a.jsonl').replace(/\\/g, '/')
  const logB = join(home, 'b.jsonl').replace(/\\/g, '/')
  writeFileSync(logA, '{}\n')
  writeFileSync(logB, '{}\n')
  const detEnv = { [AGENT_LOG_ENV_OVERRIDE]: logA }
  const base = { cwd: root, platformOpts: {}, specBase, homeDir: home, env: detEnv }

  const r1 = await recordAgentLogInvocation({ ...base, command: 'plan --done' })
  assert(r1 && r1.isNew && r1.detected >= 1, '首次登记 isNew=true')
  let artifact = readAgentLogArtifact(join(specBase, '.runtime'))
  assert(artifact && artifact.schema_version === AGENT_LOG_SCHEMA_VERSION && artifact.entries.length >= 1, '产物落盘 schema_version 与常量一致')
  assert(artifact.entries[0].invocations === 1 && artifact.entries[0].first_seen_at, 'invocations=1 + first_seen_at')

  const r2 = await recordAgentLogInvocation({ ...base, command: 'plan --done' })
  assert(r2 && !r2.isNew, '同路径重复登记 isNew=false')
  artifact = readAgentLogArtifact(join(specBase, '.runtime'))
  const entryA = artifact.entries.find(e => e.log_path === logA)
  assert(entryA.invocations === 2, '同路径合并 invocations=2 不重复条目')

  await recordAgentLogInvocation({ ...base, env: { [AGENT_LOG_ENV_OVERRIDE]: logB }, platformOpts: { workspaceId: 'ws-x', scanRunId: 'scan-1' }, command: 'execute' })
  artifact = readAgentLogArtifact(join(specBase, '.runtime'))
  assert(artifact.entries.length >= 2 && artifact.entries[0].log_path === logB, '新路径追加且排首位（last_seen 最新）')
  assert(artifact.workspace_id === 'ws-x' && artifact.scan_run_id === 'scan-1', '平台元信息写入产物')

  // codex session_id 入产物
  const root2 = makeTmpDir('al-rec2-')
  const home2 = makeTmpDir('al-rec2-home-')
  makeCodexFixture(home2, NOW, [{ name: 'rollout-2026-08-23T09-59-00-eeee5555.jsonl', cwd: root2, originator: 'sillyhub-daemon', mtimeMs: NOW - 60 * 1000 }])
  await recordAgentLogInvocation({ cwd: root2, platformOpts: {}, specBase: join(root2, '.sillyspec'), homeDir: home2, env: {}, now: NOW, command: 'scan' })
  const art2 = readAgentLogArtifact(join(root2, '.sillyspec', '.runtime'))
  const cxE = art2?.entries?.find(e => e.harness === 'codex')
  assert(cxE && cxE.session_id === 'eeee5555' && cxE.originator === 'sillyhub-daemon', 'codex session_id/originator 入产物')

  // 非 agent 环境（无 env 覆盖、无任何 harness 标记、home 无会话目录）→ 不写盘返回 null
  const rNone = await recordAgentLogInvocation({ cwd: root, platformOpts: {}, specBase, homeDir: makeTmpDir('al-empty-'), env: {} })
  assert(rNone === null, '探测不到 → 返回 null 不写盘')
}

console.log('--- 10. recordAgentLogInvocation：平台模式落 runtimeRoot ---')
{
  const root = makeTmpDir('al-plat-')
  const home = makeTmpDir('al-plat-home-')
  const specBase = join(root, 'specs')            // 平台 specRoot（非 cwd/.sillyspec）
  const runtimeRoot = join(root, 'runtime')       // daemon 显式 runtimeRoot
  const logFile = join(home, 'x.jsonl').replace(/\\/g, '/')
  writeFileSync(join(home, 'x.jsonl'), '{}\n')
  const env = { [AGENT_LOG_ENV_OVERRIDE]: join(home, 'x.jsonl') }

  await recordAgentLogInvocation({ cwd: root, platformOpts: { specRoot: specBase, runtimeRoot }, specBase, homeDir: home, env, command: 'scan' })
  assert(existsSync(join(runtimeRoot, AGENT_LOG_ARTIFACT_FILENAME)), '产物落 daemon 指定的 runtimeRoot（而非 specRoot/.runtime）')

  await recordAgentLogInvocation({ cwd: root, platformOpts: { specRoot: specBase }, specBase, homeDir: home, env, command: 'scan' })
  assert(existsSync(join(specBase, '.runtime', AGENT_LOG_ARTIFACT_FILENAME)), 'runtimeRoot 缺省回落 specRoot/.runtime')
}

console.log('--- 11. 上报平台（POST /api/agent-logs）---')
{
  // mock fetch 收集器（对齐 quicklog-push-platform.test.mjs 风格）
  const savedFetch = globalThis.fetch
  const captured = []
  let fetchMode = 'ok' // ok | reject | http500
  globalThis.fetch = async (url, options = {}) => {
    captured.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null })
    if (fetchMode === 'reject') throw new Error('ECONNREFUSED mock')
    if (fetchMode === 'http500') return { ok: false, status: 500 }
    return { ok: true, status: 200, headers: new Map(), json: async () => ({ status: 'ok' }) }
  }
  try {
    // a. local.yaml platform 段 → POST 一次，字段对齐契约
    const root = makeTmpDir('al-push-')
    const specBase = join(root, '.sillyspec')
    const home = makeTmpDir('al-push-home-')
    const logFile = join(home, 'p.jsonl')
    writeFileSync(logFile, '{}\n')
    mkdirSync(specBase, { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), 'platform:\n  url: http://hub.test\n  token: shpsync_tok1\n')
    const r = await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home,
      env: { [AGENT_LOG_ENV_OVERRIDE]: logFile },
      platformOpts: { workspaceId: 'ws-9', scanRunId: 'scan-9' },
      command: 'plan --done',
    })
    assert(r.pushed === true && captured.length === 1, 'local.yaml 配置 → POST 一次 pushed=true')
    const req = captured[0]
    assert(req.url === 'http://hub.test/api/agent-logs', 'URL = {platform.url}/api/agent-logs')
    assert(req.options.headers.Authorization === 'Bearer shpsync_tok1', 'Bearer platform token')
    assert(req.body.schema_version === 1 && req.body.workspace_id === 'ws-9' && req.body.scan_run_id === 'scan-9'
      && req.body.entries[0].log_path === logFile.replace(/\\/g, '/'), 'body 字段对齐契约（entries 携带 posix 路径）')

    // b. 无配置（无 local.yaml 无 env）→ 不发请求
    captured.length = 0
    const root2 = makeTmpDir('al-push2-')
    const home2 = makeTmpDir('al-push2-home-')
    const log2 = join(home2, 'q.jsonl')
    writeFileSync(log2, '{}\n')
    const r2 = await recordAgentLogInvocation({ cwd: root2, specBase: join(root2, '.sillyspec'), homeDir: home2, env: { [AGENT_LOG_ENV_OVERRIDE]: log2 } })
    assert(r2.pushed === null && captured.length === 0, '未配置 → 不发请求 pushed=null（合法本地状态）')

    // c. env SILLYHUB_PLATFORM_URL/TOKEN 注入（daemon 场景无 local.yaml）
    const r3 = await recordAgentLogInvocation({
      cwd: root2, specBase: join(root2, '.sillyspec'), homeDir: home2,
      env: { [AGENT_LOG_ENV_OVERRIDE]: log2, SILLYHUB_PLATFORM_URL: 'http://hub-env.test', SILLYHUB_PLATFORM_TOKEN: 'shpsync_env' },
    })
    assert(r3.pushed === true && captured.at(-1).url === 'http://hub-env.test/api/agent-logs', 'env 注入配置生效')

    // d. SILLYSPEC_AGENT_LOG_PUSH=0 → 关闭上报
    captured.length = 0
    await recordAgentLogInvocation({
      cwd: root2, specBase: join(root2, '.sillyspec'), homeDir: home2,
      env: { [AGENT_LOG_ENV_OVERRIDE]: log2, SILLYHUB_PLATFORM_URL: 'http://hub-env.test', SILLYHUB_PLATFORM_TOKEN: 'shpsync_env', SILLYSPEC_AGENT_LOG_PUSH: '0' },
    })
    assert(captured.length === 0, 'SILLYSPEC_AGENT_LOG_PUSH=0 → 不上报')

    // e. 网络失败/非 2xx → 不抛、产物已留底、pushed=false
    for (const mode of ['reject', 'http500']) {
      fetchMode = mode
      const rootF = makeTmpDir(`al-push-f-${mode}-`)
      const homeF = makeTmpDir(`al-push-fh-${mode}-`)
      const logF = join(homeF, 'f.jsonl')
      writeFileSync(logF, '{}\n')
      const specBaseF = join(rootF, '.sillyspec')
      mkdirSync(specBaseF, { recursive: true })
      writeFileSync(join(specBaseF, 'local.yaml'), 'platform:\n  url: http://hub.test\n  token: shpsync_t\n')
      const rF = await recordAgentLogInvocation({ cwd: rootF, specBase: specBaseF, homeDir: homeF, env: { [AGENT_LOG_ENV_OVERRIDE]: logF } })
      assert(rF.pushed === false, `${mode} → pushed=false 不抛`)
      assert(existsSync(join(specBaseF, '.runtime', AGENT_LOG_ARTIFACT_FILENAME)), `${mode} → 本地产物仍落盘兜底`)
    }
    fetchMode = 'ok'
  } finally {
    globalThis.fetch = savedFetch
  }
}

console.log('--- 11b. 会话化上下文（entry 级 ctx + body 级 hub_session_id，2026-08-23-agent-activity-sessions）---')
{
  // mock fetch 收集器（对齐 §11 风格）
  const savedFetch = globalThis.fetch
  const captured = []
  globalThis.fetch = async (url, options = {}) => {
    captured.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null })
    return { ok: true, status: 200, headers: new Map(), json: async () => ({ status: 'ok' }) }
  }
  try {
    const pos = p => p.replace(/\\/g, '/')
    const root = makeTmpDir('al-ctx-')
    const specBase = join(root, '.sillyspec')
    const home = makeTmpDir('al-ctx-home-')
    const logNew = join(home, 'new.jsonl'); writeFileSync(logNew, '{}\n')
    const logOld = join(home, 'old.jsonl'); writeFileSync(logOld, '{}\n')
    const logQuick = join(home, 'qk.jsonl'); writeFileSync(logQuick, '{}\n')
    const logNoCtx = join(home, 'noctx.jsonl'); writeFileSync(logNoCtx, '{}\n')
    const rt = join(specBase, '.runtime')
    mkdirSync(specBase, { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), 'platform:\n  url: http://hub.test\n  token: shpsync_ctx\n')

    // 预置旧留底产物：logOld 带 change_key（上一次 run 的 ctx）、logNoCtx 无 ctx 字段（旧版本产物）
    mkdirSync(rt, { recursive: true })
    writeFileSync(join(rt, AGENT_LOG_ARTIFACT_FILENAME), JSON.stringify({
      schema_version: 1,
      generated_at: '2026-08-23T09:00:00.000Z',
      agent_cwd: pos(root), workspace_id: null, scan_run_id: null,
      entries: [
        { harness: 'env-override', log_path: pos(logOld), format: 'jsonl', detected_via: 'env',
          agent_cwd: pos(root), session_id: null, originator: null, exists: true, size_bytes: 4,
          mtime_ms: 1, first_seen_at: '2026-08-23T09:00:00.000Z', last_seen_at: '2026-08-23T09:00:00.000Z',
          invocations: 1, last_command: null, change_key: 'old-change', quick_id: null },
        { harness: 'env-override', log_path: pos(logNoCtx), format: 'jsonl', detected_via: 'env',
          agent_cwd: pos(root), session_id: null, originator: null, exists: true, size_bytes: 4,
          mtime_ms: 1, first_seen_at: '2026-08-23T09:00:00.000Z', last_seen_at: '2026-08-23T09:00:00.000Z',
          invocations: 1, last_command: null },
      ],
    }, null, 2))

    // ① 普通场景：context.changeKey → 本次检出 entry 带 change_key；未触及存量 entry 保留原 ctx
    const r1 = await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home, command: 'execute --done',
      env: { [AGENT_LOG_ENV_OVERRIDE]: logNew },
      context: { changeKey: '2026-08-23-agent-activity-sessions' },
    })
    assert(r1 && r1.pushed === true, '① context 调用正常上报')
    const body1 = captured.at(-1).body
    const newE = body1.entries.find(e => e.log_path === pos(logNew))
    assert(newE.change_key === '2026-08-23-agent-activity-sessions' && newE.quick_id == null,
      '① 本次检出 entry 带 change_key、不带 quick_id')
    const oldE = body1.entries.find(e => e.log_path === pos(logOld))
    assert(oldE && oldE.change_key === 'old-change' && oldE.invocations === 1,
      '① 未触及存量 entry 保留原 ctx 不追新（变更 B 的 run 不改挂变更 A 的 entry）')
    const art = readAgentLogArtifact(rt)
    assert(art.entries.find(e => e.log_path === pos(logNew)).change_key === '2026-08-23-agent-activity-sessions'
      && art.entries.find(e => e.log_path === pos(logOld)).change_key === 'old-change',
      '① 留底产物 entry 级 ctx 与 payload 一致')

    // ④ 旧留底产物（无 ctx 字段）合并兼容：未触及原样保留；本次触及（无 context）→ ctx 落 null 不炸
    const noCtxE = body1.entries.find(e => e.log_path === pos(logNoCtx))
    assert(noCtxE && noCtxE.invocations === 1 && noCtxE.change_key === undefined,
      '④ 旧产物无 ctx 字段的未触及 entry 原样保留（不追新）')
    const r4 = await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home, command: 'scan',
      env: { [AGENT_LOG_ENV_OVERRIDE]: logNoCtx },
    })
    assert(r4 && r4.pushed === true, '④ 旧产物 entry 被本次触及（无 context）合并不炸')
    const noCtxTouched = readAgentLogArtifact(rt).entries.find(e => e.log_path === pos(logNoCtx))
    assert(noCtxTouched.invocations === 2 && noCtxTouched.change_key == null && noCtxTouched.quick_id == null,
      '④ 触及的旧格式 entry ctx 归 null（无 prev ctx 可保，best-effort 不抛）')

    // ② quick 场景：quickId 优先且与 changeKey 互斥（quick-<8hex> 完整原样）
    const r2 = await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home, command: 'quick --done',
      env: { [AGENT_LOG_ENV_OVERRIDE]: logQuick },
      context: { quickId: 'quick-abcd1234' },
    })
    assert(r2 && r2.pushed === true, '② quick 场景正常上报')
    const qE = captured.at(-1).body.entries.find(e => e.log_path === pos(logQuick))
    assert(qE.quick_id === 'quick-abcd1234' && qE.change_key == null,
      '② quick 场景 entry 带 quick_id（含 quick- 前缀原样）且不带 change_key（互斥 quick 优先）')

    // ③ body 级 hub_session_id：env SILLYHUB_SESSION_ID 存在才带；context 显式传入同生效；缺失不带
    await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home, command: 'plan',
      env: { [AGENT_LOG_ENV_OVERRIDE]: logNew, SILLYHUB_SESSION_ID: 'sess-env-1' },
      context: { changeKey: 'k' },
    })
    assert(captured.at(-1).body.hub_session_id === 'sess-env-1',
      '③ env SILLYHUB_SESSION_ID 存在 → body 带 hub_session_id')
    await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home, command: 'plan',
      env: { [AGENT_LOG_ENV_OVERRIDE]: logNew },
      context: { changeKey: 'k' },
    })
    assert(!('hub_session_id' in captured.at(-1).body),
      '③ env 缺失 → body 不带 hub_session_id 键（非空才带）')
    await recordAgentLogInvocation({
      cwd: root, specBase, homeDir: home, command: 'plan',
      env: { [AGENT_LOG_ENV_OVERRIDE]: logNew },
      context: { changeKey: 'k', hubSessionId: 'sess-explicit' },
    })
    assert(captured.at(-1).body.hub_session_id === 'sess-explicit',
      '③ context.hubSessionId 显式传入（run/command.js 读 env 后传入路径）生效')
  } finally {
    globalThis.fetch = savedFetch
  }
}

console.log('--- 12. resolveAgentLogArtifactPath：落点解析 ---')
{
  const root = makeTmpDir('al-path-')
  const local = resolveAgentLogArtifactPath({ cwd: root })
  assert(local.artifactPath === join(root, '.sillyspec', '.runtime', AGENT_LOG_ARTIFACT_FILENAME) && !local.restored,
    '本地模式落 cwd/.sillyspec/.runtime')

  writeFileSync(join(root, '.sillyspec-platform.json'), JSON.stringify({ specRoot: 'C:/pl/specs', runtimeRoot: 'C:/pl/rt' }))
  const restored = resolveAgentLogArtifactPath({ cwd: root })
  assert(restored.restored && restored.runtimeRoot === 'C:/pl/rt', '指针含 runtimeRoot → 直接用')

  writeFileSync(join(root, '.sillyspec-platform.json'), JSON.stringify({ specRoot: 'C:/pl/specs' }))
  const restored2 = resolveAgentLogArtifactPath({ cwd: root })
  assert(restored2.restored && restored2.runtimeRoot === join('C:/pl/specs', '.runtime'), '指针仅 specRoot → specRoot/.runtime')

  writeFileSync(join(root, '.sillyspec-platform.json'), '{broken')
  const broken = resolveAgentLogArtifactPath({ cwd: root })
  assert(!broken.restored && broken.runtimeRoot === join(root, '.sillyspec', '.runtime'), '指针损坏回退本地口径')
}

console.log('--- 13. CLI 集成：sillyspec agent-log ---')
{
  const proj = makeTmpDir('al-cli-')
  const rt = join(proj, '.sillyspec', '.runtime')
  mkdirSync(rt, { recursive: true })
  const logFile = join(proj, 'sess.jsonl').replace(/\\/g, '/')
  writeFileSync(join(proj, 'sess.jsonl'), '{}\n')
  writeFileSync(join(rt, AGENT_LOG_ARTIFACT_FILENAME), JSON.stringify({
    schema_version: 1,
    generated_at: '2026-08-23T10:00:00.000Z',
    agent_cwd: proj.replace(/\\/g, '/'),
    workspace_id: null,
    scan_run_id: null,
    entries: [{
      harness: 'codex', log_path: logFile, format: 'codex-rollout-jsonl', detected_via: 'codex-session-meta-cwd',
      agent_cwd: proj.replace(/\\/g, '/'), session_id: 'sess', originator: 'sillyhub-daemon',
      exists: true, size_bytes: 4, mtime_ms: 1,
      first_seen_at: '2026-08-23T09:00:00.000Z', last_seen_at: '2026-08-23T10:00:00.000Z',
      invocations: 2, last_command: 'plan --done',
    }],
  }, null, 2))

  // 剥掉宿主环境里的 harness 标记（测试可能在 zcode/claude 内跑，防真实会话泄进断言）
  const cleanEnv = {}
  for (const [k, v] of Object.entries(process.env)) {
    if ([AGENT_LOG_ENV_OVERRIDE, 'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_SESSION_ID',
      'ZCODE_APP_VERSION', 'ZCODE_ENV', 'ZCODE_RUNTIME_ENV', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR'].includes(k)) continue
    cleanEnv[k] = v
  }
  const runCLI = (args, extraEnv = {}) => spawnSync(process.execPath, [cliBin, ...args], {
    cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...cleanEnv, ...extraEnv },
  })

  const human = runCLI(['agent-log'])
  assert(human.status === 0 && human.stdout.includes('sess.jsonl') && human.stdout.includes('sillyhub-daemon'),
    'agent-log 人类输出含日志路径与 originator')

  const j = runCLI(['agent-log', '--json'])
  let parsed = null
  try { parsed = JSON.parse(j.stdout) } catch { /* 下方断言报 */ }
  assert(parsed && parsed.artifact && parsed.artifact.entries.length === 1
    && parsed.artifact.entries[0].session_id === 'sess', 'agent-log --json 输出纯 JSON（stdout 可直接 parse）')

  const det = runCLI(['agent-log', '--detect', '--json'], { [AGENT_LOG_ENV_OVERRIDE]: join(proj, 'sess.jsonl') })
  let parsedDet = null
  try { parsedDet = JSON.parse(det.stdout) } catch { /* 下方断言报 */ }
  assert(parsedDet && parsedDet.detected.some(e => e.detected_via === 'env'),
    'agent-log --detect --json 现场探测（不依赖产物）')

  const detHuman = runCLI(['agent-log', '--detect'], { [AGENT_LOG_ENV_OVERRIDE]: join(proj, 'sess.jsonl') })
  assert(detHuman.status === 0 && detHuman.stdout.includes('sess.jsonl'), '--detect 人类输出含探测结果')

  const empty = runCLI(['agent-log', '--detect'])
  assert(empty.status === 0, '无 agent 环境时 --detect 也 exit 0（非错误态）')
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
