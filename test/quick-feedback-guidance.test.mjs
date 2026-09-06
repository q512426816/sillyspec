// 用户实证反馈三连的修复断言（2026-09-03，docs/sillyspec/troubleshooting.md #52）：
// ② quick 边界审计 WARNING 只列问题不给解法（坑 quick-audit-warning-no-guidance）——
//    「超出 allowedFiles / 新增文件」warning 附带一条命令出路的指引；
//    --done --files 一步并入边界（mergeQuickBoundaryFiles，此前 --done 时 flag 被解析却不生效，
//    与 ql-20260713-002-7628「--done --force-baseline 静默无效」同族）。
// ③ 输出被吞误重启 → 重复空壳会话只能手工清理（坑 quick-duplicate-empty-shell）——
//    detectEmptyShellQuickSessions 探测「已启动但零步骤完成」的会话，起步时给 --cancel 咒语。
//
// 隔离：tmpdir fixture，不碰真实 .sillyspec/.runtime。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createHash } from 'crypto'
import { mergeQuickBoundaryFiles, detectEmptyShellQuickSessions } from '../src/run/shared.js'
import { printQuickAuditReview } from '../src/run/quick-audit.js'

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-qguide-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

async function captureWarn(fn) {
  const lines = []
  const saved = console.warn
  console.warn = (...a) => { lines.push(a.map(String).join(' ')) }
  try { await fn(); return { lines } } finally { console.warn = saved }
}

// ─────────────────────────────────────────
// ②-1 mergeQuickBoundaryFiles：追加不替换、去重保序、hash 记录
// ─────────────────────────────────────────
test('① mergeQuickBoundaryFiles：--done/--resume 共用的边界并入语义', () => {
  const fx = makeFixture()
  mkdirSync(join(fx, 'test'), { recursive: true })
  writeFileSync(join(fx, 'test/b.test.mjs'), 'test content\n', 'utf8')
  const guard = { allowedFiles: ['src/a.js'], allowedFilesHash: { 'src/a.js': 'H0' } }
  const { added } = mergeQuickBoundaryFiles(guard, ['test/b.test.mjs', 'src/a.js', ''], fx)
  assert.deepEqual(added, ['test/b.test.mjs'], '仅新增去重（空串/已声明剔除）')
  assert.deepEqual(guard.allowedFiles, ['src/a.js', 'test/b.test.mjs'], '追加不替换、保序')
  assert.equal(guard.allowedFilesHash['test/b.test.mjs'], createHash('sha256').update('test content\n').digest('hex'), '存在的文件记录内容 hash')
  assert.equal(guard.allowedFilesHash['src/a.js'], 'H0', '既有 hash 不动')

  const again = mergeQuickBoundaryFiles(guard, ['test/b.test.mjs'], fx)
  assert.deepEqual(again.added, [], '重复并入零新增（调用方免打印免持久化）')

  const missing = { allowedFiles: [], allowedFilesHash: {} }
  mergeQuickBoundaryFiles(missing, ['docs/new.md'], fx) // 盘上不存在（预声明将新建）
  assert.deepEqual(missing.allowedFiles, ['docs/new.md'], '预声明将新建的文件照常并入')
  assert.equal(missing.allowedFilesHash['docs/new.md'], undefined, '不存在跳过 hash（与启动同语义）')
})

// ─────────────────────────────────────────
// ②-2 printQuickAuditReview WARNING 指引
// ─────────────────────────────────────────
test('② WARNING 审计给解法：超出 allowedFiles → --files 一条命令；新增文件 → --files + --allow-new 两套开关', async () => {
  const out = await captureWarn(() => printQuickAuditReview({
    status: 'warning',
    reasons: ['超出 allowedFiles: test/x.test.mjs', '新增文件（需 --allow-new）: test/x.test.mjs'],
    changedFiles: [], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 0,
  }))
  assert.ok(out.lines.some((l) => l.includes('超出 allowedFiles')), 'reason 照列')
  const declLine = out.lines.find((l) => l.includes('sillyspec run quick --done --files'))
  assert.ok(declLine && declLine.includes('test/x.test.mjs'), '超出声明：--files 重跑 --done 的命令含样例文件')
  assert.ok(out.lines.some((l) => l.includes('--allow-new --files')), '新增文件：--allow-new + --files 组合命令')
  assert.ok(out.lines.some((l) => l.includes('两套开关')), '点破 --files（归属）与 --allow-new（放行）是两套开关')
  assert.ok(out.lines.some((l) => l.includes('非阻断')), '明示非阻断可忽略')
})

test('③ WARNING 无边界类 reason（如文档欠账 advisory）不误指路', async () => {
  const out = await captureWarn(() => printQuickAuditReview({
    status: 'warning',
    reasons: ['本次未同步模块文档（2 个源码文件改动，无文档文件）'],
    changedFiles: [], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 0,
    docSyncHint: { touchedSource: 2, docFiles: [] },
  }))
  assert.ok(!out.lines.some((l) => l.includes('run quick --done --files')), '非边界原因不给 --files 指引')
})

// ─────────────────────────────────────────
// ④ detectEmptyShellQuickSessions：空壳判定 + fail-open
// ─────────────────────────────────────────
test('④ 空壳会话探测：零完成列出、有完成/超龄/自身/读不到不列', () => {
  const fx = makeFixture()
  const specBase = join(fx, '.sillyspec')
  const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
  const now = Date.now()
  const mkSession = (sid, startedAtMs) => {
    mkdirSync(join(sessionsDir, sid), { recursive: true })
    writeFileSync(join(sessionsDir, sid, 'guard.json'), JSON.stringify({
      sessionId: sid, startedAt: new Date(startedAtMs).toISOString(), allowedFiles: [],
    }), 'utf8')
  }
  mkSession('quick-shell', now - 3_600_000)       // 1 小时前启动的空壳
  mkSession('quick-active', now - 3_600_000)      // 有完成步骤的真会话
  mkSession('quick-stale', now - 8 * 24 * 3600_000) // 超龄僵尸
  mkSession('quick-self', now - 3_600_000)        // 当前会话自身
  mkSession('quick-noread', now - 3_600_000)      // 进度读不到
  const fakePm = {
    read(_cwd, name) {
      if (name === 'quick-shell') return { stages: { quick: { steps: [{ name: 's1', status: 'pending' }, { name: 's2', status: 'pending' }] } } }
      if (name === 'quick-active') return { stages: { quick: { steps: [{ name: 's1', status: 'completed', completedAt: '2026-09-03T00:00:00Z' }] } } }
      if (name === 'quick-self') return { stages: { quick: { steps: [{ name: 's1', status: 'pending' }] } } }
      throw new Error('db locked')
    },
  }
  const shells = detectEmptyShellQuickSessions({}, specBase, 'quick-self', fakePm, fx, now)
  assert.deepEqual(shells.map((s) => s.sessionId), ['quick-shell'], '仅零完成、龄内、非自身的会话被列出')
  assert.equal(shells[0].startedAt, new Date(now - 3_600_000).toISOString(), '带启动时间供人判断')

  // 目录不存在 → 空清单不抛
  assert.deepEqual(detectEmptyShellQuickSessions({}, join(fx, 'none'), 'x', fakePm, fx, now), [])
})
