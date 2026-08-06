/**
 * worktree-apply filterDeliverableFiles 精细化排除测试（坑3，FR-03）
 *
 * filterDeliverableFiles 不再一刀切排除 .sillyspec/ —— 精细化：
 *   保留：.sillyspec/docs/（dogfood 模块规范文档 = 交付物）+ 普通 src/* 交付物
 *   排除：.sillyspec/changes/（变更包）+ .sillyspec/.runtime/（运行时）+
 *         .sillyspec/quicklog/（quicklog）+ meta.json（worktree 元数据）
 *
 * 背景：一刀切排除 .sillyspec/ 漏掉模块文档（.sillyspec/docs/sillyspec/modules/*.md），
 * worktree 内对模块文档的改动 apply 时不回主仓，要手动 git show <rev>:<path>。
 * verify-postcheck.js 同逻辑内联副本已改 import 共享（去双写，R-04）。
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

console.log('=== worktree-apply: filterDeliverableFiles 精细化排除 ===\n')

// ── Case 1: modified-tracked meta.json 被排除（核心回归点保留）──
console.log('--- Case 1: modified-tracked meta.json 排除，交付物保留 ---')
{
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

// ── Case 3（坑3 四态核心）：.sillyspec/ 子树按性质分流 ──
console.log('--- Case 3: .sillyspec/ 精细化分流（docs/ 保留，changes/+.runtime/+quicklog/ 排除）---')
{
  const files = [
    '.sillyspec/docs/sillyspec/modules/run.md',          // 模块文档 = 交付物 → 保留
    '.sillyspec/changes/foo/design.md',                  // 变更包 → 排除
    '.sillyspec/.runtime/verify-runs/t/r.json',          // 运行时 → 排除
    '.sillyspec/quicklog/QUICKLOG-qinyi.md',             // quicklog → 排除
    'src/index.js',                                      // 普通交付物 → 保留
  ]
  assertDeep(filterDeliverableFiles(files),
    ['.sillyspec/docs/sillyspec/modules/run.md', 'src/index.js'],
    'docs/ 保留 + changes/+.runtime/+quicklog/ 排除 + src/* 保留（四态）')
}

// ── Case 4: 单点四态逐条断言（防 startsWith 误判）──
console.log('--- Case 4: 四态逐条断言 ---')
{
  assertDeep(filterDeliverableFiles(['.sillyspec/docs/sillyspec/modules/x.md']),
    ['.sillyspec/docs/sillyspec/modules/x.md'], '.sillyspec/docs/... 保留')
  assertDeep(filterDeliverableFiles(['.sillyspec/changes/foo/plan.md']),
    [], '.sillyspec/changes/... 排除')
  assertDeep(filterDeliverableFiles(['.sillyspec/.runtime/y.json']),
    [], '.sillyspec/.runtime/... 排除')
  assertDeep(filterDeliverableFiles(['.sillyspec/quicklog/z.md']),
    [], '.sillyspec/quicklog/... 排除')
  assertDeep(filterDeliverableFiles(['meta.json']), [], 'meta.json 排除')
  assertDeep(filterDeliverableFiles(['src/a.js']), ['src/a.js'], '普通 src/a.js 保留')
}

// ── Case 5: docs/ 下各层路径全保留（不止 modules/）──
console.log('--- Case 5: .sillyspec/docs/ 各子路径保留 ---')
{
  const files = [
    '.sillyspec/docs/sillyspec/ARCHITECTURE.md',
    '.sillyspec/docs/sillyspec/modules/gates.md',
    '.sillyspec/docs/proj/scan/STRUCTURE.md',
  ]
  assertDeep(filterDeliverableFiles(files), files, '.sillyspec/docs/ 下各层全保留')
}

// ── Case 6: 防误放行 —— changes/ 不能被 docs/ 规则带飞 ──
console.log('--- Case 6: changes/ 子目录不因 docs/ 字样误放行 ---')
{
  // 有人可能在 changes/<cn>/docs/ 下放草稿——仍应排除（changes/ 前缀优先）
  assertDeep(filterDeliverableFiles(['.sillyspec/changes/foo/docs/leak.md']),
    [], '.sillyspec/changes/foo/docs/... 仍排除（changes/ 前缀优先）')
  // runtime 下同理
  assertDeep(filterDeliverableFiles(['.sillyspec/.runtime/docs/x.md']),
    [], '.sillyspec/.runtime/docs/... 仍排除')
}

// ── Case 7: 混合（本 change 真实情况：模块文档 + 源码 + 变更包）──
console.log('--- Case 7: 混合场景 ---')
{
  const files = [
    'meta.json',                                                  // infra
    'src/run/gates.js',                                           // 交付物
    'src/worktree-apply.js',                                      // 交付物
    'src/verify-postcheck.js',                                    // 交付物
    'test/stage-review-marker-auto.test.mjs',                     // 交付物（新增）
    '.sillyspec/docs/sillyspec/modules/run.md',                   // 模块文档交付物（新增）
    '.sillyspec/changes/2026-08-06-x/design.md',                  // 变更包
    '.sillyspec/.runtime/stage-reviews/execute-review-x/r.json',  // 运行时
    '.sillyspec/quicklog/QUICKLOG-qinyi.md',                      // quicklog
  ]
  const expected = [
    'src/run/gates.js', 'src/worktree-apply.js', 'src/verify-postcheck.js',
    'test/stage-review-marker-auto.test.mjs',
    '.sillyspec/docs/sillyspec/modules/run.md',
  ]
  assertDeep(filterDeliverableFiles(files), expected,
    '混合：5 交付物保留（含模块文档），meta.json+changes/+.runtime/+quicklog/ 排除')
}

// ── Case 8: 全是排除项 → 空（apply 视为无变更）──
console.log('--- Case 8: 仅排除项 → 空列表 ---')
{
  assertDeep(filterDeliverableFiles(['meta.json']), [], '仅 meta.json → 空')
  assertDeep(filterDeliverableFiles(['meta.json', '.sillyspec/changes/x', '.sillyspec/.runtime/y', '.sillyspec/quicklog/z']),
    [], 'meta.json + changes/ + .runtime/ + quicklog/ → 空')
  assertDeep(filterDeliverableFiles([]), [], '空输入 → 空')
}

// ── 结果 ──
const total = 8
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
