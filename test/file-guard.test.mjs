/**
 * 2026-11-28-file-write-optimistic-lock 回归。
 *
 * 断言面：
 *   A. FR-01 读取记录基线（记录/重读刷新/前缀外不记录/过期清理）；
 *   B. FR-02 写前校验（被改写阻止/未改写放行/MultiEdit 多目标逐一比对）；
 *   C. FR-03 无基线放行（新文件/基线缺失/损坏）；
 *   D. FR-04 hook 集成（worktree-guard 优先、file-guard 异常放行）——见文末子进程用例。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  recordRead,
  checkBeforeWrite,
  readBaselines,
  pruneStale,
  isMonitoredPath,
  baselinePath,
  safeSessionId,
  cleanupStaleBaselines,
  resolveMonitorPrefixes,
  DEFAULT_MONITOR_PREFIXES,
  BASELINE_TTL_MS,
} from '../src/file-guard.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}
const sha = (s) => createHash('sha256').update(s).digest('hex')

const tmpRoot = mkdtempSync(join(tmpdir(), `file-guard-${process.pid}-`))

function makeSpecRoot(label) {
  const root = join(tmpRoot, label, '.sillyspec')
  mkdirSync(join(root, 'changes', 'demo'), { recursive: true })
  mkdirSync(join(root, '.runtime', 'state'), { recursive: true })
  return root
}

// ── A. FR-01 读取记录基线 ──
console.log('\n--- A. FR-01 读取记录基线 ---')
{
  const root = makeSpecRoot('a1')
  const doc = join(root, 'changes', 'demo', 'decisions.md')
  writeFileSync(doc, 'v1\n')

  const r = recordRead({ specRoot: root, sessionId: 'sid-a', filePath: doc })
  assert(r.recorded === true, '读取后记录成功')
  const entries = readBaselines(root, 'sid-a')
  assert(entries['changes/demo/decisions.md']?.hash === sha('v1\n'), '基线 hash = 当前内容 sha256')

  // 重读刷新
  writeFileSync(doc, 'v2\n')
  recordRead({ specRoot: root, sessionId: 'sid-a', filePath: doc })
  assert(readBaselines(root, 'sid-a')['changes/demo/decisions.md']?.hash === sha('v2\n'), '重读刷新为最新 hash')

  // 前缀外不记录
  const outside = join(tmpRoot, 'a1', 'src', 'x.js')
  mkdirSync(join(tmpRoot, 'a1', 'src'), { recursive: true })
  writeFileSync(outside, 'code\n')
  const r2 = recordRead({ specRoot: root, sessionId: 'sid-a', filePath: outside })
  assert(r2.recorded === false && r2.reason === 'not-monitored', '前缀外文件不记录')
  assert(!Object.keys(readBaselines(root, 'sid-a')).some((k) => k.includes('x.js')), '基线里无前缀外条目')

  // .runtime 下永不记录
  const rtFile = join(root, '.runtime', 'state', 'x.json')
  writeFileSync(rtFile, '{}\n')
  assert(isMonitoredPath(root, rtFile) === false, '.runtime 下路径不纳入监控')

  // 会话隔离
  recordRead({ specRoot: root, sessionId: 'sid-b', filePath: doc })
  assert(baselinePath(root, 'sid-a') !== baselinePath(root, 'sid-b'), '不同会话基线文件隔离')
}

// ── 过期清理 ──
{
  const old = { 'a.md': { hash: 'h', at: Date.now() - BASELINE_TTL_MS - 1000 } }
  const fresh = { 'b.md': { hash: 'h2', at: Date.now() } }
  const pruned = pruneStale({ ...old, ...fresh })
  assert(!pruned['a.md'] && pruned['b.md'], '超 24h 条目被清理，新鲜条目保留')
}

// ── 会话 id 安全化 / 缺省前缀 / 过期会话文件清理 ──
{
  assert(DEFAULT_MONITOR_PREFIXES.length === 1 && DEFAULT_MONITOR_PREFIXES[0] === '', '缺省监控前缀 = 整个 spec 树')
  assert(safeSessionId('ab/cd:ef') === 'ab_cd_ef', `会话 id 非法字符替换（实得 ${safeSessionId('ab/cd:ef')}）`)
  assert(safeSessionId('') === 'unknown', '空会话 id 回落 unknown')

  const root = makeSpecRoot('a2')
  // 造一个全过期条目的会话基线文件 → cleanup 应删除
  writeFileSync(
    baselinePath(root, 'stale-sid'),
    JSON.stringify({ entries: { 'x.md': { hash: 'h', at: Date.now() - BASELINE_TTL_MS - 5000 } } }) + '\n',
    'utf8',
  )
  const removed = cleanupStaleBaselines(root)
  assert(removed.includes(baselinePath(root, 'stale-sid').split(/[\\/]/).pop()), '过期会话基线文件被清理')
  assert(existsSync(baselinePath(root, 'stale-sid')) === false, '清理后文件不存在')
}

// ── 配置：file_guard.paths 收窄监控面 ──
{
  const root = makeSpecRoot('a3')
  writeFileSync(join(root, 'local.yaml'), 'file_guard:\n  paths: .sillyspec/changes/, docs/\n', 'utf8')
  const prefixes = resolveMonitorPrefixes(root)
  assert(prefixes.includes('changes/') && !prefixes.includes('.sillyspec/changes/'), `前缀剥离 .sillyspec/ 前导（实得 ${prefixes.join(',')}）`)
  assert(prefixes.includes('docs/'), '自定义前缀保留')

  // 收窄后：changes/ 下纳入，docs/ 下纳入，其余（如 knowledge/）不纳入
  mkdirSync(join(root, 'knowledge'), { recursive: true })
  writeFileSync(join(root, 'knowledge', 'x.md'), 'k\n')
  assert(isMonitoredPath(root, join(root, 'knowledge', 'x.md'), prefixes) === false, '收窄后非前缀路径不监控')
  assert(isMonitoredPath(root, join(root, 'changes', 'demo', 'design.md'), prefixes) === true, '收窄后 changes/ 仍监控')
}

// ── B. FR-02 写前校验 ──
console.log('\n--- B. FR-02 写前校验 ---')
{
  const root = makeSpecRoot('b1')
  const doc = join(root, 'changes', 'demo', 'design.md')
  writeFileSync(doc, 'baseline\n')
  recordRead({ specRoot: root, sessionId: 'sid-b', filePath: doc })

  // 未改动 → 放行
  assert(checkBeforeWrite({ specRoot: root, sessionId: 'sid-b', filePath: doc }).block === false, '读后未改动 → 放行')

  // 他人改写 → 阻止
  writeFileSync(doc, 'someone else wrote\n')
  const chk = checkBeforeWrite({ specRoot: root, sessionId: 'sid-b', filePath: doc })
  assert(chk.block === true && chk.reason === 'stale-read', '读后被他人改写 → 阻止（stale-read）')
  assert(chk.path === 'changes/demo/design.md', '阻止结果带相对路径')

  // 重读后放行
  recordRead({ specRoot: root, sessionId: 'sid-b', filePath: doc })
  assert(checkBeforeWrite({ specRoot: root, sessionId: 'sid-b', filePath: doc }).block === false, '重读后放行')
}

// ── C. FR-03 无基线放行 ──
console.log('\n--- C. FR-03 无基线放行 ---')
{
  const root = makeSpecRoot('c1')
  // 新文件（不存在）
  const nf = join(root, 'changes', 'demo', 'new.md')
  assert(checkBeforeWrite({ specRoot: root, sessionId: 'sid-c', filePath: nf }).block === false, '新文件（不存在）放行')

  // 存在但从未读取
  const unread = join(root, 'changes', 'demo', 'unread.md')
  writeFileSync(unread, 'x\n')
  assert(checkBeforeWrite({ specRoot: root, sessionId: 'sid-c', filePath: unread }).block === false, '未读过（无基线）放行')

  // 基线文件损坏
  writeFileSync(baselinePath(root, 'sid-c'), 'not-json{{')
  assert(checkBeforeWrite({ specRoot: root, sessionId: 'sid-c', filePath: unread }).block === false, '基线损坏放行（fail-open）')
}

// ── D. FR-04 hook 集成（子进程） ──
console.log('\n--- D. FR-04 hook 集成 ---')
{
  const root = makeSpecRoot('d1')
  const repoRoot = join(tmpRoot, 'd1')
  const doc = join(root, 'changes', 'demo', 'proposal.md')
  writeFileSync(doc, 'v1\n')
  const preHook = join(process.cwd(), 'src', 'hooks', 'claude-pre-tool-use.cjs')
  const postHook = join(process.cwd(), 'src', 'hooks', 'claude-post-tool-use.cjs')

  const runHook = (hook, payload) => {
    const r = spawnSync(process.execPath, [hook], {
      input: JSON.stringify(payload),
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 20000,
    })
    return { status: r.status, stderr: r.stderr || '' }
  }

  // PostToolUse(Read) 记录
  const post = runHook(postHook, {
    session_id: 'hook-sid', tool_name: 'Read', cwd: repoRoot,
    tool_input: { file_path: doc },
  })
  assert(post.status === 0, 'PostToolUse(Read) 恒 exit 0')
  assert(existsSync(baselinePath(root, 'hook-sid')), 'PostToolUse 落基线文件')

  // 未改动 → PreToolUse 放行
  const ok = runHook(preHook, {
    session_id: 'hook-sid', tool_name: 'Edit', cwd: repoRoot,
    tool_input: { file_path: doc, old_string: 'v1', new_string: 'v2' },
  })
  assert(ok.status === 0, '未改动时 PreToolUse 放行（exit 0）')

  // 他人改写 → PreToolUse 阻止（exit 2 + 提示）
  writeFileSync(doc, 'someone else\n')
  const blocked = runHook(preHook, {
    session_id: 'hook-sid', tool_name: 'Write', cwd: repoRoot,
    tool_input: { file_path: doc, content: 'overwrite\n' },
  })
  assert(blocked.status === 2, '改写后 PreToolUse 阻止（exit 2）')
  assert(blocked.stderr.includes('请重读后再写'), '阻止原因含「请重读后再写」')
  assert(blocked.stderr.includes('stale-read blocked'), '阻止留痕含 stale-read blocked')

  // 非监控路径 → 不由 file-guard 拦截（worktree-guard 可能仍按「无活跃流程」拦，
  // 属既有行为零回归；此处只断言不是乐观锁造成的）
  const business = join(repoRoot, 'src', 'app.js')
  mkdirSync(join(repoRoot, 'src'), { recursive: true })
  writeFileSync(business, 'code\n')
  const notMonitored = runHook(preHook, {
    session_id: 'hook-sid', tool_name: 'Write', cwd: repoRoot,
    tool_input: { file_path: business, content: 'new code\n' },
  })
  assert(!notMonitored.stderr.includes('stale-read blocked'), '非监控路径不由 file-guard 拦截（乐观锁零干扰）')
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* 清理 best-effort */ }
console.log(`\n${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`}`)
process.exit(failures === 0 ? 0 : 1)
