/**
 * parse-repo.test.mjs — task-02 跨仓 frontmatter 字段解析 + local.yaml repos 段 parser
 *
 * 覆盖 design §7.2（task 卡 frontmatter 协议扩展）+ §7.3（local.yaml repos schema）：
 *   - parseRepo(content)         → string|null（缺省=null，由调用方按 main 处理）
 *   - parseBaseCommit(content)   → string|null
 *   - parseHeadCommit(content)   → string|null
 *   - parseRepoRegistry(yaml)    → Map<repoKey, absolutePath>（无 repos 段 → 空 Map）
 *
 * 向后兼容：既有 task 卡（无 repo: / base_commit / head_commit）三函数均返 null。
 * local.yaml 无 repos: 段（单仓 change）parseRepoRegistry 返空 Map。
 *
 * 解析复用 parseTaskContracts 同源 js-yaml frontmatter 提取模式（见 plan-postcheck.js:114）。
 */
import { parseRepo, parseBaseCommit, parseHeadCommit, parseRepoRegistry } from '../src/stages/plan-postcheck.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
function eq(actual, expected, msg) {
  total++
  const ok = actual === expected || (actual === null && expected === null)
  if (!ok) { failed++; console.log(`  ❌ FAIL: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// ─────────────────────────────────────────────────────────────
// parseRepo
// ─────────────────────────────────────────────────────────────
console.log('=== parseRepo ===\n')

// 1. 跨仓 task 显式声明 repo
console.log('--- 场景 1：显式 repo: sillyspec ---')
{
  const content = [
    '---',
    'id: task-03',
    'title: 跨仓改 sillyspec',
    'repo: sillyspec',
    'allowed_paths:',
    '  - src/task-review.js',
    'goal: 改 sillyspec',
    '---',
    '',
  ].join('\n')
  eq(parseRepo(content), 'sillyspec', '解析 repo: sillyspec')
}

// 2. 旧 task 卡无 repo 字段 → null（向后兼容，调用方视 main）
console.log('\n--- 场景 2：旧 task 卡无 repo: → null（向后兼容）---')
{
  const content = [
    '---',
    'id: task-01',
    'title: 单仓 task',
    'allowed_paths:',
    '  - src/app.js',
    'goal: 改主仓',
    '---',
    '',
  ].join('\n')
  eq(parseRepo(content), null, '无 repo 字段返 null（向后兼容，调用方视 main）')
}

// 3. repo 字段带引号
console.log('\n--- 场景 3：repo: "sillyspec"（带引号）---')
{
  const content = [
    '---',
    'id: task-03',
    'repo: "sillyspec"',
    'goal: x',
    '---',
    '',
  ].join('\n')
  eq(parseRepo(content), 'sillyspec', '带引号 repo 去引号')
}

// 4. 无 frontmatter → null
console.log('\n--- 场景 4：无 frontmatter → null ---')
{
  eq(parseRepo('正文无 frontmatter'), null, '无 frontmatter 返 null')
}

// 5. repo: 为空 → null（视为缺省）
console.log('\n--- 场景 5：repo: 空值 → null ---')
{
  const content = [
    '---',
    'id: task-03',
    'repo:',
    'goal: x',
    '---',
    '',
  ].join('\n')
  eq(parseRepo(content), null, 'repo: 空值返 null')
}

// ─────────────────────────────────────────────────────────────
// parseBaseCommit / parseHeadCommit
// ─────────────────────────────────────────────────────────────
console.log('\n=== parseBaseCommit / parseHeadCommit ===\n')

// 6. 双锡点字段存在
console.log('--- 场景 6：base_commit + head_commit 均存在 ---')
{
  const content = [
    '---',
    'id: task-03',
    'repo: sillyspec',
    'base_commit: abc123def4567890abcdef1234567890abcdef12',
    'head_commit: fedcba0987654321fedcba0987654321fedcba09',
    'goal: x',
    '---',
    '',
  ].join('\n')
  eq(parseBaseCommit(content), 'abc123def4567890abcdef1234567890abcdef12', '解析 base_commit')
  eq(parseHeadCommit(content), 'fedcba0987654321fedcba0987654321fedcba09', '解析 head_commit')
}

// 7. 旧 task 卡无 base/head → null（向后兼容）
console.log('\n--- 场景 7：旧 task 卡无 base/head → null（向后兼容）---')
{
  const content = [
    '---',
    'id: task-01',
    'allowed_paths:',
    '  - src/app.js',
    'goal: x',
    '---',
    '',
  ].join('\n')
  eq(parseBaseCommit(content), null, '无 base_commit 返 null')
  eq(parseHeadCommit(content), null, '无 head_commit 返 null')
}

// 8. 仅有 base（派发后回收前中间态）
console.log('\n--- 场景 8：仅 base_commit（head 未回收）→ head=null ---')
{
  const content = [
    '---',
    'id: task-03',
    'repo: sillyspec',
    'base_commit: aaa111',
    'goal: x',
    '---',
    '',
  ].join('\n')
  eq(parseBaseCommit(content), 'aaa111', '仅 base 存在')
  eq(parseHeadCommit(content), null, 'head 未落盘 → null')
}

// 9. 带引号
console.log('\n--- 场景 9：base_commit 带引号 ---')
{
  const content = [
    '---',
    'id: task-03',
    "base_commit: 'abc123'",
    'goal: x',
    '---',
    '',
  ].join('\n')
  eq(parseBaseCommit(content), 'abc123', '带引号 base_commit 去引号')
}

// ─────────────────────────────────────────────────────────────
// parseRepoRegistry（local.yaml repos: 段）
// ─────────────────────────────────────────────────────────────
console.log('\n=== parseRepoRegistry ===\n')

// 10. 标准 repos 段
console.log('--- 场景 10：local.yaml 含 repos: 段 ---')
{
  const yaml = [
    'modules:',
    '  backend: { path: "backend/" }',
    'repos:',
    '  sillyspec: C:/Users/qinyi/IdeaProjects/sillyspec',
    '  frontend: D:/code/myapp',
    '',
  ].join('\n')
  const reg = parseRepoRegistry(yaml)
  assert(reg instanceof Map, '返回 Map')
  eq(reg.size, 2, '两个 repo 条目')
  eq(reg.get('sillyspec'), 'C:/Users/qinyi/IdeaProjects/sillyspec', 'sillyspec 路径')
  eq(reg.get('frontend'), 'D:/code/myapp', 'frontend 路径')
}

// 11. 无 repos 段（单仓 change）→ 空 Map
console.log('\n--- 场景 11：local.yaml 无 repos: 段 → 空 Map（向后兼容）---')
{
  const yaml = [
    'modules:',
    '  backend: { path: "backend/" }',
    '',
  ].join('\n')
  const reg = parseRepoRegistry(yaml)
  assert(reg instanceof Map, '返回 Map')
  eq(reg.size, 0, '无 repos 段 → 空 Map')
}

// 12. 空 yaml / null → 空 Map
console.log('\n--- 场景 12：空 / null yaml → 空 Map ---')
{
  assert(parseRepoRegistry('') instanceof Map && parseRepoRegistry('').size === 0, '空字符串 → 空 Map')
  assert(parseRepoRegistry(null) instanceof Map && parseRepoRegistry(null).size === 0, 'null → 空 Map')
  assert(parseRepoRegistry(undefined) instanceof Map && parseRepoRegistry(undefined).size === 0, 'undefined → 空 Map')
}

// 13. repos 段在文件末尾后紧跟非缩进顶层 key（终止边界）
console.log('\n--- 场景 13：repos 段后跟新顶层 key 正确终止 ---')
{
  const yaml = [
    'repos:',
    '  sillyspec: C:/sillyspec',
    'other_section:',
    '  foo: bar',
    '',
  ].join('\n')
  const reg = parseRepoRegistry(yaml)
  eq(reg.size, 1, '只读 repos 段，新顶层 key 终止')
  eq(reg.get('sillyspec'), 'C:/sillyspec', 'sillyspec 路径')
}

// 14. repos 段为空（repos: 下无条目）→ 空 Map
console.log('\n--- 场景 14：repos: 段为空 → 空 Map ---')
{
  const yaml = [
    'repos:',
    'modules:',
    '  backend: { path: "backend/" }',
    '',
  ].join('\n')
  const reg = parseRepoRegistry(yaml)
  eq(reg.size, 0, '空 repos 段 → 空 Map')
}

// 15. 路径带反斜杠（Windows 绝对路径）+ 末尾注释
console.log('\n--- 场景 15：Windows 反斜杠路径 + 行内注释 ---')
{
  const yaml = [
    'repos:',
    '  sillyspec: C:\\Users\\qinyi\\IdeaProjects\\sillyspec',
    '  # 这是注释行，应跳过',
    '',
  ].join('\n')
  const reg = parseRepoRegistry(yaml)
  eq(reg.size, 1, '注释行不计入')
  eq(reg.get('sillyspec'), 'C:\\Users\\qinyi\\IdeaProjects\\sillyspec', 'Windows 反斜杠路径保留')
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
