import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { shouldBlock } from '../src/hooks/worktree-guard.js'
import { DB } from '../src/db.js'

const root = join(tmpdir(), `sillyspec-guard-test-${Date.now()}`)
const changeName = '2026-06-04-guard-test'
const runtimeDir = join(root, '.sillyspec', '.runtime')
const registeredWorktree = join(runtimeDir, 'worktrees', changeName)
const unregisteredWorktree = join(runtimeDir, 'worktrees', 'other-change')

mkdirSync(registeredWorktree, { recursive: true })
mkdirSync(unregisteredWorktree, { recursive: true })

// task-10 废 gate-status.json 后，readCurrentStage/isNoWorktreeMode 直读 sillyspec.db。
// 用 DB 类在 temp repo 内建 sillyspec.db 并种一条 active change 行：
//  1) 让 findProjectRoot 命中 temp repo（.sillyspec/.runtime/sillyspec.db 标记）而非用户 home 的 .sillyspec；
//  2) readCurrentStage 经 queryDbFirstCell（readonly 子进程）读出 current_stage。
function setStage(stage, { name = changeName, noWorktree = 0 } = {}) {
  const db = new DB(join(runtimeDir, 'sillyspec.db'))
  db.init()
  const sq = db.getDb()
  sq.prepare("INSERT OR IGNORE INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  sq.prepare('DELETE FROM changes WHERE name = ?').run(name)
  sq.prepare("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES (?,?,?,?,'t','t')")
    .run(name, stage, 'active', noWorktree ? 1 : 0)
  db.close()
}

// 初始阶段 = execute（对齐原 gate-status.json {stage:'execute'}）
setStage('execute')
writeFileSync(join(registeredWorktree, 'meta.json'), JSON.stringify({
  changeName,
  worktreePath: registeredWorktree,
  mode: 'worktree',
}, null, 2))

try {
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(registeredWorktree, 'src', 'ok.js'), cwd: root }).blocked,
    false,
    'registered worktree writes should be allowed'
  )

  assert.equal(
    shouldBlock({ tool: 'Bash', command: 'npm run build', cwd: registeredWorktree }).blocked,
    false,
    'bash commands from a registered worktree cwd should be allowed'
  )

  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(unregisteredWorktree, 'src', 'blocked.js'), cwd: root }).blocked,
    true,
    'unregistered worktree storage writes should be blocked'
  )

  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(root, '.sillyspec', 'docs', 'note.md'), cwd: root }).blocked,
    false,
    'ordinary .sillyspec docs should remain writable'
  )

  // scan 阶段：readCurrentStage SQL 过滤 current_stage IN ('execute','quick')，scan 不在其中 →
  // 等价 '(none)'。scan 文档覆盖保护由 shouldBlockScanDocOverwrite 独立判定（阶段无关）。
  setStage('scan')
  writeFileSync(join(runtimeDir, 'scan-guard.json'), JSON.stringify({
    sourceCommit: 'new-head',
    startedAt: '2026-06-16T10:00:00.000Z',
    forceRescan: false,
  }, null, 2))
  const scanDoc = join(root, '.sillyspec', 'docs', 'app', 'scan', 'ARCHITECTURE.md')
  mkdirSync(join(root, '.sillyspec', 'docs', 'app', 'scan'), { recursive: true })
  writeFileSync(scanDoc, [
    '---',
    'source_commit: old-head',
    'updated_at: 2026-06-16T09:00:00.000Z',
    '---',
    '# Architecture',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: scanDoc, cwd: root }).blocked,
    true,
    'scan overwrite should block stale source_commit without --force-rescan'
  )
  writeFileSync(join(runtimeDir, 'scan-guard.json'), JSON.stringify({
    sourceCommit: 'new-head',
    startedAt: '2026-06-16T10:00:00.000Z',
    forceRescan: true,
  }, null, 2))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: scanDoc, cwd: root }).blocked,
    false,
    'scan overwrite should allow stale source_commit with --force-rescan'
  )

  // ── 7/40 位归一化比对（2026-09-14-scan-incremental-refresh D-007@v1）──
  // run/stage.js 写 guard 用 40 位全哈希、scan-postcheck 盖章用 7 位短哈希：旧精确比对
  // 恒不等 → guard 存在即恒拦。归一化后同基线放行 / 异基线拦截恢复设计本意。
  writeFileSync(join(runtimeDir, 'scan-guard.json'), JSON.stringify({
    sourceCommit: 'abc1234fullhash0000000000000000000000000000',
    startedAt: '2026-06-16T10:00:00.000Z',
    forceRescan: false,
  }, null, 2))
  writeFileSync(scanDoc, [
    '---',
    'source_commit: abc1234',
    'updated_at: 2026-06-16T09:00:00.000Z',
    '---',
    '# Architecture',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: scanDoc, cwd: root }).blocked,
    false,
    'same-base 7/40 mixed hash lengths should pass after normalization'
  )
  writeFileSync(scanDoc, [
    '---',
    'source_commit: zzz9999',
    'updated_at: 2026-06-16T09:00:00.000Z',
    '---',
    '# Architecture',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: scanDoc, cwd: root }).blocked,
    true,
    'different base 7/40 mixed hash lengths should still block after normalization'
  )

  // ── scan-refresh 会话态白名单（D-007@v1）：白名单内放行 / 白名单外原保护 ──
  writeFileSync(join(runtimeDir, 'scan-guard.json'), JSON.stringify({
    name_zh: '增量刷新守卫',
    mode: 'scan-refresh',
    refreshDocs: ['docs/app/scan/ARCHITECTURE.md'],
    docHashes: { 'docs/app/scan/ARCHITECTURE.md': 'deadbeef' },
    sourceCommit: 'ref-head',
    startedAt: '2026-06-16T10:00:00.000Z',
    forceRescan: false,
  }, null, 2))
  writeFileSync(scanDoc, [
    '---',
    'source_commit: old-base',
    'updated_at: 2026-06-16T11:00:00.000Z', // 晚于 guard.startedAt：refresh 编辑后的正常态
    '---',
    '# Architecture',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: scanDoc, cwd: root }).blocked,
    false,
    'scan-refresh whitelisted doc should be writable even with newer updated_at'
  )
  const otherScanDoc = join(root, '.sillyspec', 'docs', 'app', 'scan', 'PROJECT.md')
  writeFileSync(otherScanDoc, [
    '---',
    'source_commit: old-base',
    'updated_at: 2026-06-16T09:00:00.000Z',
    '---',
    '# Project',
    '',
  ].join('\n'))
  const r2 = shouldBlock({ tool: 'Write', filePath: otherScanDoc, cwd: root })
  assert.equal(r2.blocked, true, 'scan-refresh non-whitelisted doc keeps original protection')
  assert.ok(String(r2.reason || '').includes('source_commit'), 'non-whitelisted block cites source_commit mismatch')

  const externalSpec = join(root, 'external-spec')
  const externalScanDoc = join(externalSpec, 'docs', 'app', 'scan', 'ARCHITECTURE.md')
  mkdirSync(join(externalSpec, '.runtime'), { recursive: true })
  mkdirSync(join(externalSpec, 'docs', 'app', 'scan'), { recursive: true })
  writeFileSync(join(externalSpec, '.runtime', 'scan-guard.json'), JSON.stringify({
    sourceCommit: 'extnew1-head',
    startedAt: '2026-06-16T10:00:00.000Z',
    forceRescan: false,
  }, null, 2))
  writeFileSync(externalScanDoc, [
    '---',
    'source_commit: extold9-head',
    'updated_at: 2026-06-16T09:00:00.000Z',
    '---',
    '# Architecture',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: externalScanDoc, cwd: root }).blocked,
    true,
    'external specRoot scan overwrite should read specRoot/.runtime/scan-guard.json'
  )

  writeFileSync(join(root, '.sillyspec', 'local.yaml'), [
    'worktreeHook:',
    '  readonlyCommands:',
    '    - custom-read',
    '',
  ].join('\n'))
  assert.equal(
    shouldBlock({ tool: 'Bash', command: 'custom-read status', cwd: root }).blocked,
    false,
    '.sillyspec/local.yaml readonlyCommands should extend the bash whitelist'
  )

  // root local.yaml 位置门禁（2026-08-21 root-local-yaml 治理）：.sillyspec/ 之外的同名文件
  // 写入一律拦截并指路——agent 按根目录惯例找/建根级 local.yaml，loadLocalConfig 候选链
  // 真会读它 → 根级副本遮蔽/分裂真实配置。阶段无关（execute 阶段下验证）。
  {
    const r = shouldBlock({ tool: 'Write', filePath: join(root, 'local.yaml'), cwd: root })
    assert.equal(r.blocked, true, 'root-level local.yaml write should be blocked')
    assert.ok(r.reason.includes('.sillyspec'), 'block reason should redirect to .sillyspec path')
    assert.ok(r.reason.includes('config cat'), 'block reason should point to sillyspec config cat')
  }
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(root, 'local.yml'), cwd: root }).blocked,
    true,
    'root-level local.yml write should be blocked too'
  )
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(root, '.sillyspec', 'local.yaml'), cwd: root }).blocked,
    false,
    '.sillyspec/local.yaml write should stay allowed (config editing)'
  )

  // 切到 quick 阶段（直读 DB）
  setStage('quick')
  assert.equal(
    shouldBlock({ tool: 'Write', filePath: join(root, 'src', 'quick.js'), cwd: root }).blocked,
    false,
    'quick writes should still be allowed in the main workspace'
  )

  console.log('✅ worktree guard regression checks passed')
} finally {
  rmSync(root, { recursive: true, force: true })
}
