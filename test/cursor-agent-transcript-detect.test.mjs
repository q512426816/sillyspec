// cursor-agent transcript 扫描上报（docs/sillyspec/cursor-agent-transcript-report-pipeline）
//
// 平台侧（daemon 解析器 + messages 端点 + 前端回放）已就绪，缺 sillyspec 仓扫描上报。
// 三要素：扫描路径 ~/.cursor/projects/<encodedCwd>/agent-transcripts/<uuid>/<uuid>.jsonl；
// format 串 cursor-agent-transcript-jsonl（与 daemon 注册键逐字一致）；归属沿用 cwd 编码
// 目录名正向比对（precise）。token 不落盘 → usage 未知（FR-03 不伪造）。
//
// 隔离：tmpdir 伪 home + 合成 transcript 布局 + 本机真实布局只读探测。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { detectAgentLogEntries } from '../src/agent-session-log.js'

const tmpRoots = []
function makeHome() {
  const h = mkdtempSync(join(tmpdir(), `cursor-agent-${process.pid}-`))
  tmpRoots.push(h)
  return h
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const UUID = '2ffbb5d3-dd25-463e-a389-164b73193d9b'

function seedTranscript(home, encodedCwd, uuid, ageMs = 0) {
  const dir = join(home, '.cursor', 'projects', encodedCwd, 'agent-transcripts', uuid)
  mkdirSync(dir, { recursive: true })
  const p = join(dir, `${uuid}.jsonl`)
  writeFileSync(p, JSON.stringify({ role: 'user', message: { content: [{ type: 'text', text: 'hi' }] } }) + '\n', 'utf8')
  if (ageMs > 0) {
    const at = new Date(Date.now() - ageMs)
    utimesSync(p, at, at)
  }
  return { p, mtime: Date.now() - ageMs }
}

test('① cwd 编码目录命中 → 登记 transcript（format 串与 daemon 注册键逐字一致）', () => {
  const home = makeHome()
  seedTranscript(home, 'C-Users-qinyi-IdeaProjects-happy', UUID)
  const entries = detectAgentLogEntries({
    cwdCandidates: ['C:/Users/qinyi/IdeaProjects/happy'],
    homeDir: home, now: Date.now(), windowMs: 15 * 60_000,
  })
  const hit = entries.find(e => e.harness === 'cursor-agent')
  assert.ok(hit, `应登记 cursor-agent transcript（实际 ${JSON.stringify(entries.map(e => e.harness))}）`)
  assert.equal(hit.format, 'cursor-agent-transcript-jsonl', 'format 串逐字一致（daemon 解析器注册键）')
  assert.equal(hit.session_id, UUID, 'session_id = transcript uuid 目录名')
  assert.ok(hit.log_path.endsWith(`${UUID}/${UUID}.jsonl`), 'log_path 指向 jsonl 文件')
  assert.equal(hit.agent_cwd, 'C:/Users/qinyi/IdeaProjects/happy', '归属 = 本会话 cwd')
})

test('② 路径含连字符的编码目录命中（正向编码无歧义）+ 窗口外静默跳过', () => {
  const home = makeHome()
  seedTranscript(home, 'C-Users-qinyi-AppData-Local-Temp-cursor-task02-trust-only', 'aaaa1111-0000-0000-0000-000000000001')
  const stale = seedTranscript(home, 'C-Users-qinyi-AppData-Local-Temp-cursor-task02-trust-only', 'bbbb2222-0000-0000-0000-000000000002', 60 * 60_000)
  const entries = detectAgentLogEntries({
    cwdCandidates: ['C:/Users/qinyi/AppData/Local/Temp/cursor-task02-trust-only'],
    homeDir: home, now: Date.now(), windowMs: 15 * 60_000,
  })
  const hits = entries.filter(e => e.harness === 'cursor-agent')
  assert.equal(hits.length, 1, '窗口内 1 份命中（连字符路径正向编码无歧义）')
  assert.ok(!hits.some(e => e.log_path.includes('bbbb2222')), '1 小时前的过期 transcript 不登记')
  assert.ok(stale.p.length > 0)
})

test('③ 无关项目目录不误报（precise 门控）+ 数字目录跳过', () => {
  const home = makeHome()
  seedTranscript(home, 'C-Users-qinyi-IdeaProjects-other', UUID)
  // 数字目录（无从解码 cwd）
  const numDir = join(home, '.cursor', 'projects', '1778824326154', 'agent-transcripts', UUID)
  mkdirSync(numDir, { recursive: true })
  writeFileSync(join(numDir, `${UUID}.jsonl`), '{}\n', 'utf8')
  const entries = detectAgentLogEntries({
    cwdCandidates: ['C:/Users/qinyi/IdeaProjects/happy'],
    homeDir: home, now: Date.now(), windowMs: 15 * 60_000,
  })
  assert.equal(entries.filter(e => e.harness === 'cursor-agent').length, 0, 'cwd 不匹配（含数字目录）零登记')
})

test('④ 本机真实布局只读探测（96+ 份存量，最新的一份在窗口内即命中）', () => {
  // 真实 home 的 transcript 多为历史文件（窗口外）——用超长窗口扫一次验证布局解析正确性
  const entries = detectAgentLogEntries({
    cwdCandidates: ['C:/Users/qinyi/IdeaProjects/happy', 'C:/Users/qinyi/AppData/Local/Temp'],
    homeDir: homedir(), now: Date.now(), windowMs: 365 * 24 * 3600_000,
  })
  const hits = entries.filter(e => e.harness === 'cursor-agent')
  assert.ok(hits.length >= 1, `真实布局应可解析（happy 17 份 + Temp 22 份；实际 ${JSON.stringify(entries.map(e => e.harness))}）`)
  for (const h of hits) {
    assert.equal(h.format, 'cursor-agent-transcript-jsonl')
    assert.match(h.log_path, /agent-transcripts\/[0-9a-f-]+\/[0-9a-f-]+\.jsonl$/, 'log_path 形态正确')
  }
})
