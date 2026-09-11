/**
 * 变更名日期前缀门禁测试（brainstorm step6 规则 CLI 化，2026-09-11 实证 friction-signal-hint）
 *
 * 背景：变更名格式 YYYY-MM-DD-<简短描述> 此前只是 brainstorm prompt 约束，agent 自拟名/
 * change-rename 丢日期前缀时 CLI 照单全收静默物化。现 CLI 边界强制：净新建（DB 无行 +
 * changes/ 含 archive/ 无目录）名字不合规直接 exit 2。已物化存量（含归档无前缀旧名
 * auto-flow-optimization 等 10 个）不追诉，照常自愈初始化。
 *
 * 门的位置（只拦 CLI 边界，库函数 initChange/renameChange 保持宽松——测试/平台工具
 * 合法用任意名建 fixture，~30 处存量测试依赖此语义）：
 *   1. run <stage> --change <非法名>（run/command.js 净新建门）
 *   2. change-rename <旧> <非法新名>（index.js CLI 入口门）
 *   3. assertDatedChangeName 校验器（run/shared.js，豁免 default / quick-<8hex>）
 *
 * 用例：
 *  1. 校验器单元：合规/不合规/豁免名全矩阵（含事故名 friction-signal-hint）
 *  2. CLI 净新建拦截：run brainstorm --change friction-signal-hint → exit 2 + 教学文案
 *  3. CLI 合规名放行：run brainstorm --change 2026-09-11-xxx → exit 0
 *  4. 存量自愈不追诉：预置 changes/auto-flow-optimization/ 目录 → run scan --change → 放行
 *  5. done-like 守卫优先级：--done 幻影守卫先于日期门（分层顺序锁定）
 *  6. change-rename 非法新名 → exit 2；合规新名 → 改名成功
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, runCLI, cleanup, report, initChange } from './_cli-step-harness.mjs'
import { assertDatedChangeName } from '../src/run/shared.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== 变更名日期前缀门禁（brainstorm step6 规则 CLI 化）===\n')

console.log('--- 用例1: 校验器单元矩阵 ---')
{
  const ok = (n) => { try { assertDatedChangeName(n); return true } catch { return false } }
  assert(ok('2026-09-11-add-login'), '标准日期+描述')
  assert(ok('2026-01-01-x'), '单字符描述')
  assert(ok('2024-12-31-v2.1-fix'), '描述含点号')
  assert(ok('2026-09-11-a_b'), '描述含下划线')
  assert(ok(null) && ok(undefined), 'null/undefined 不校验')
  assert(ok('default'), 'default 兜底 key 豁免')
  assert(ok('quick-1a2b3c4d'), 'quick-<8hex> 会话 key 豁免')
  assert(!ok('friction-signal-hint'), '事故名（丢日期前缀）拦截')
  assert(!ok('add-login'), '纯描述无日期拦截')
  assert(!ok('2026-9-11-x'), '月未补零拦截')
  assert(!ok('2026-09-1-x'), '日未补零拦截')
  assert(!ok('2026-13-01-x'), '月 13 拦截')
  assert(!ok('2026-00-05-x'), '月 00 拦截')
  assert(!ok('2026-09-00-x'), '日 00 拦截')
  assert(!ok('2026-09-32-x'), '日 32 拦截')
  assert(!ok('2026-09-11'), '只有日期无描述拦截')
  assert(!ok('2026-09-11-'), '空描述拦截')
  assert(!ok('2026-09-11-_lead'), '描述以分隔符开头拦截')
  assert(!ok('quick-1A2B3C4D'), '非会话形态（大写 hex）不豁免')
}

console.log('\n--- 用例2: CLI 净新建拦截（run brainstorm --change 事故名）---')
{
  const { cwd } = makeRepo('cngate-blk-')
  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', 'friction-signal-hint'], { cwd })
  assert(r.status === 2, `exit 2（实际 ${r.status}）`)
  assert(r.combined.includes('friction-signal-hint'), '报错点名非法名')
  assert(r.combined.includes('YYYY-MM-DD'), '报错给出格式模板')
  assert(r.combined.includes('重试'), '报错给出重试出路')
  assert(!existsSync(join(cwd, '.sillyspec', 'changes', 'friction-signal-hint')), '非法名目录未被物化')
}

console.log('\n--- 用例3: CLI 合规名放行 ---')
{
  const { cwd } = makeRepo('cngate-ok-')
  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', '2026-09-11-my-fix'], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  assert(existsSync(join(cwd, '.sillyspec', 'changes', '2026-09-11-my-fix')), '合规名目录正常物化')
}

console.log('\n--- 用例4: 存量自愈不追诉（无前缀旧名 + 目录已存在）---')
{
  const { cwd, specBase } = makeRepo('cngate-leg-')
  // 预置历史无前缀名目录（模拟归档外泄/DB 重建场景：目录在、DB 行无）
  mkdirSync(join(specBase, 'changes', 'auto-flow-optimization'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'auto-flow-optimization', 'proposal.md'), '# P\n')
  const r = runCLI(['--dir', cwd, 'run', 'scan', '--change', 'auto-flow-optimization'], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  assert(!r.combined.includes('日期前缀'), '存量名不触发日期门')
}

console.log('\n--- 用例5: done-like 幻影守卫先于日期门（分层顺序）---')
{
  const { cwd } = makeRepo('cngate-dl-')
  const r = runCLI(['--dir', cwd, 'run', 'scan', '--done', '--change', 'ghost-bad-name'], { cwd })
  assert(r.status === 2, `exit 2（实际 ${r.status}）`)
  assert(r.combined.includes('拒绝静默新建'), '幻影守卫文案优先（防幻影变更语义不被日期门掩盖）')
}

console.log('\n--- 用例6: change-rename 新名门 ---')
{
  const { cwd, specBase } = makeRepo('cngate-ren-')
  await initChange(cwd, specBase, '2026-09-11-old-name')
  // 6a 非法新名 → exit 2，原名保留
  const bad = runCLI(['--dir', cwd, 'change-rename', '2026-09-11-old-name', 'renamed-no-date'], { cwd })
  assert(bad.status === 2, `非法新名 exit 2（实际 ${bad.status}）`)
  assert(bad.combined.includes('YYYY-MM-DD'), 'rename 报错给出格式模板')
  assert(existsSync(join(specBase, 'changes', '2026-09-11-old-name')), '原名目录未被改名')
  assert(!existsSync(join(specBase, 'changes', 'renamed-no-date')), '非法新名目录未产生')
  // 6b 合规新名 → 成功
  const good = runCLI(['--dir', cwd, 'change-rename', '2026-09-11-old-name', '2026-09-12-better-name'], { cwd })
  assert(good.status === 0 || good.status === null, `合规新名成功（实际 ${good.status}，尾：${good.combined.slice(-150)}）`)
  assert(existsSync(join(specBase, 'changes', '2026-09-12-better-name')), '新名目录就位')
  assert(!existsSync(join(specBase, 'changes', '2026-09-11-old-name')), '旧名目录已迁走')
}

cleanup()
report(count.passed, count.failed, count.failures)
if (count.failed > 0) process.exit(1)
