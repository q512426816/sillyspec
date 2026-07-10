/**
 * worktree-apply meta.json 排除回归测试
 *
 * 验证 filterDeliverableFiles 把 worktree 基础设施文件（meta.json / .sillyspec/）
 * 从变更清单中排除——无论它们来自 modified-tracked（git diff）还是 untracked。
 *
 * 背景：meta.json 在 baseline commit 中被跟踪、working-tree 被 CLI 改写，必须保持
 * modified（baselineCommit 是 apply diff 锚点）。修复前 apply 只对 untracked 排除 meta.json，
 * modified-tracked 的 meta.json 会落入 changedFiles →「不在 design.md 清单」→ assess 恒 BLOCKED。
 */
import { filterDeliverableFiles } from '../src/worktree-apply.js'

let failed = 0
const failures = []
function assertDeep(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) { failed++; failures.push(`${msg} (got ${a}, want ${e})`); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== worktree-apply: filterDeliverableFiles 排除 infra 文件 ===\n')

// ── Case 1: modified-tracked meta.json 被排除（核心回归点）──
console.log('--- Case 1: modified-tracked meta.json 排除，交付物保留 ---')
{
  // 模拟 statusFiles（git diff）输出：meta.json 被改 + 真实交付物被改
  const files = ['meta.json', 'src/run.js', 'src/verify-postcheck.js']
  assertDeep(filterDeliverableFiles(files), ['src/run.js', 'src/verify-postcheck.js'],
    'modified-tracked meta.json 排除，src/* 交付物保留')
}

// ── Case 2: untracked meta.json 也被排除（向后兼容，原行为）──
console.log('--- Case 2: untracked meta.json 排除（保持原行为）---')
{
  const files = ['meta.json', 'src/local-detect.js', 'test/x.test.mjs']
  assertDeep(filterDeliverableFiles(files), ['src/local-detect.js', 'test/x.test.mjs'],
    'untracked meta.json 排除，新增交付物保留')
}

// ── Case 3: .sillyspec/ 全部排除（变更文档/运行时）──
console.log('--- Case 3: .sillyspec/ 路径排除 ---')
{
  const files = [
    '.sillyspec/changes/x/design.md',
    '.sillyspec/.runtime/verify-runs/t/test-result.json',
    'src/index.js',
  ]
  assertDeep(filterDeliverableFiles(files), ['src/index.js'],
    '.sillyspec/ 下文件全排除，src/* 保留')
}

// ── Case 4: 混合（modified + untracked + infra）──
console.log('--- Case 4: 混合场景（本 change 真实情况）---')
{
  const files = [
    'meta.json',                              // modified-tracked infra
    'src/run.js',                             // modified 交付物
    'src/index.js',                           // modified 交付物
    'src/stages/scan.js',                     // modified 交付物
    'src/verify-postcheck.js',                // modified 交付物
    'src/local-detect.js',                    // untracked 新增交付物
    'test/local-detect.test.mjs',             // untracked 新增交付物
    'test/quick-session-guard-cleanup.test.mjs',
    '.sillyspec/changes/2026-07-10-tooling-followups/plan.md', // infra
  ]
  const expected = [
    'src/run.js', 'src/index.js', 'src/stages/scan.js', 'src/verify-postcheck.js',
    'src/local-detect.js', 'test/local-detect.test.mjs', 'test/quick-session-guard-cleanup.test.mjs',
  ]
  assertDeep(filterDeliverableFiles(files), expected,
    '混合：8 交付物保留，meta.json + .sillyspec/ 排除')
}

// ── Case 5: 全是 infra → 空（apply 视为无变更）──
console.log('--- Case 5: 仅 infra 文件 → 空列表 ---')
{
  assertDeep(filterDeliverableFiles(['meta.json']), [], '仅 meta.json → 空')
  assertDeep(filterDeliverableFiles(['meta.json', '.sillyspec/x']), [], 'meta.json + .sillyspec/ → 空')
  assertDeep(filterDeliverableFiles([]), [], '空输入 → 空')
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${7 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
