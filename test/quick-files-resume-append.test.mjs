/**
 * quick 中途追加 --files 边界（坑 quick-files-frozen-at-start）
 *
 * 背景：quick 会话边界冻结在启动时刻——resume 分支（stage.js existingGuard）直接复用旧
 * guard、静默丢弃本次 --files，中途发现要改声明外文件只能靠事后归属/审计行兜底。
 *
 * 锁定语义：
 *   1. 恢复会话带新 --files → 并入 guard.allowedFiles（追加不替换、去重保序）+ 点录
 *      allowedFilesHash + 持久化回 guard.json + 打印追加确认
 *   2. 重复传已声明文件 → 不重复、不打印追加
 *   3. 不带 --files 恢复 → 边界原样保留（不得被空值清空/替换）
 *   4. 追加后全流程 --done → 追加文件被审计归属进 QUICKLOG「文件：」行
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { makeRepo, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const SID_RE = /sessionId: (quick-[0-9a-f]{8})/
const APPEND_MARK = 'quick 边界已追加'

const guardOf = (specBase, sid) => JSON.parse(readFileSync(join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json'), 'utf8'))

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

console.log('=== quick 中途追加 --files 边界（坑 quick-files-frozen-at-start）===\n')

console.log('--- ① 恢复带新 --files → 追加进 guard + hash + 确认输出 ---')
{
  const { cwd, specBase } = makeRepo('qs-files-app-')
  const start = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive', '--input', '测试任务', '--files', 'src/a.js'], { cwd })
  const sid = start.combined.match(SID_RE)?.[1]
  assert(Boolean(sid), `会话已启动（${sid}）`)
  writeFileSync(join(cwd, 'src-b.js'), 'export const b = 1\n')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--files', 'src-b.js', '--change', sid], { cwd })
  assert(r.status === 0, `恢复成功（实际 ${r.status}）`)
  assert(r.combined.includes(APPEND_MARK), '输出追加确认')
  const g = guardOf(specBase, sid)
  assert(JSON.stringify(g.allowedFiles) === JSON.stringify(['src/a.js', 'src-b.js']), `allowedFiles 追加不替换（实际 ${JSON.stringify(g.allowedFiles)}）`)
  assert(/^[0-9a-f]{64}$/.test(g.allowedFilesHash['src-b.js'] || ''), '追加文件点录 sha256 hash')
  assert(!('src/a.js' in (g.allowedFilesHash || {})), '不存在文件跳过 hash（与启动同语义）')
  cleanup()
}

console.log('\n--- ② 重复传已声明文件 → 不重复、无追加输出 ---')
{
  const { cwd, specBase } = makeRepo('qs-files-dup-')
  const start = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive', '--input', '测试任务', '--files', 'src/a.js'], { cwd })
  const sid = start.combined.match(SID_RE)?.[1]
  runCLI(['--dir', cwd, 'run', 'quick', '--files', 'src-b.js', '--change', sid], { cwd })
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--files', 'src/a.js,src-b.js', '--change', sid], { cwd })
  assert(r.status === 0, `恢复成功（实际 ${r.status}）`)
  assert(!r.combined.includes(APPEND_MARK), '全为已声明文件时不打印追加')
  const g = guardOf(specBase, sid)
  assert(g.allowedFiles.length === 2, `无重复（实际 ${JSON.stringify(g.allowedFiles)}）`)
  cleanup()
}

console.log('\n--- ③ 不带 --files 恢复 → 边界原样保留 ---')
{
  const { cwd, specBase } = makeRepo('qs-files-keep-')
  const start = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive', '--input', '测试任务', '--files', 'src/a.js,src/b.js'], { cwd })
  const sid = start.combined.match(SID_RE)?.[1]
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--change', sid], { cwd })
  assert(r.status === 0, `恢复成功（实际 ${r.status}）`)
  assert(!r.combined.includes(APPEND_MARK), '不带 --files 无追加输出')
  const g = guardOf(specBase, sid)
  assert(JSON.stringify(g.allowedFiles) === JSON.stringify(['src/a.js', 'src/b.js']), `边界不被空值清空（实际 ${JSON.stringify(g.allowedFiles)}）`)
  cleanup()
}

console.log('\n--- ④ 追加后全流程 --done → 追加文件归属进文件行 ---')
{
  const { cwd, specBase } = makeRepo('qs-files-e2e-')
  mkdirSync(join(cwd, 'src'))
  writeFileSync(join(cwd, 'src', 'extra.js'), 'export const x = 1\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'seed extra'])
  const start = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive', '--input', '测试任务', '--files', 'README.md'], { cwd })
  const sid = start.combined.match(SID_RE)?.[1]
  assert(Boolean(sid), `会话已启动（${sid}）`)
  const app = runCLI(['--dir', cwd, 'run', 'quick', '--files', 'src/extra.js', '--change', sid], { cwd })
  assert(app.combined.includes(APPEND_MARK), '追加确认出现')
  writeFileSync(join(cwd, 'src', 'extra.js'), 'export const x = 2\n')
  for (const out of ['任务理解完成', '实现完成']) {
    const d = runCLI(['--dir', cwd, 'run', 'quick', '--done', '--change', sid, '--output', out], { cwd })
    assert(d.status === 0, `中间步 --done 成功（${out}，实际 ${d.status}）`)
  }
  const d3 = runCLI(['--dir', cwd, 'run', 'quick', '--done', '--change', sid, '--output', '需求：中途追加边界回归\n根因：无，纯新增\n方案：追加+全流程\n结果：测试通过'], { cwd })
  assert(d3.status === 0, `末步 --done 成功（实际 ${d3.status}，尾：${d3.combined.slice(-150)}）`)
  const ql = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), 'utf8')
  assert(ql.includes('src/extra.js'), '追加文件归属进 QUICKLOG 文件行')
  assert(ql.includes('已完成'), '条目翻已完成')
  cleanup()
}

report(count.passed, count.failed, count.failures)
