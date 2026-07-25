/**
 * worktree-guard 命令切分与只读白名单绕过修复的回归测试
 *
 * 修复 1（isSingleCommandReadonly 的 --version 运算符优先级）：
 *   旧实现 `rest.includes('--version') || rest.includes('-v') && parts.length <= 3 || ...`
 *   因 && 优先级高于 ||，--version 分支无长度约束 → `npx any-pkg --version` 被判只读放行。
 *   修复：仅 `npm --version` / `node -v`（恰好两段）放行。
 *
 * 修复 2（splitCommandParts 不切 ;/&amp;&amp; 等会导致链式/重定向绕过）：
 *   旧实现只切 &amp;&amp; 和 |，不切 ||/;/&amp;/>/< → `echo foo; rm -rf x` 当成单一片段，
 *   首命令 echo 命中只读白名单 → 整条放行；危险黑名单同样只看 cmdName=echo → 也漏。
 */
import assert from 'node:assert/strict'
import {
  _matchReadonlyWhitelistForTest as matchReadonlyWhitelist,
  _matchDangerBlacklistForTest as matchDangerBlacklist,
} from '../src/hooks/worktree-guard.js'

let passed = 0
let failed = 0
function check(actual, expected, msg) {
  try {
    assert.strictEqual(actual, expected)
    console.log(`✅ PASS: ${msg}`); passed++
  } catch (e) {
    console.error(`❌ FAIL: ${msg}\n   expected: ${expected}\n   actual:   ${actual}`); failed++
  }
}

// ── 修复 1：--version 严格匹配（保留合法版本查询，堵 npx 绕过）──
check(matchReadonlyWhitelist('npm --version'), true, 'npm --version 仍是只读（两段版本查询）')
check(matchReadonlyWhitelist('node -v'), true, 'node -v 仍是只读')
check(matchReadonlyWhitelist('npx --version'), true, 'npx --version 仍是只读（纯版本查询）')
check(matchReadonlyWhitelist('npx any-pkg --version'), false, 'npx any-pkg --version 不再误判只读（会执行 any-pkg）')
check(matchReadonlyWhitelist('npm publish -v'), false, 'npm publish -v 不再误判只读（非纯版本查询）')
check(matchReadonlyWhitelist('npm run test'), true, 'npm run test 仍是只读（回归保护）')
check(matchReadonlyWhitelist('npm test'), true, 'npm test 仍是只读（回归保护）')

// ── 修复 2：链式 / 语句分隔 / 重定向绕过 ──
// `echo foo; rm -rf x`：旧实现单一片段 cmdName=echo → 只读放行 + 危险漏判
check(matchReadonlyWhitelist('echo foo; rm -rf x'), false, 'echo foo; rm -rf x 不再判只读（; 切分后 rm 段非只读）')
check(matchDangerBlacklist('echo foo; rm -rf x'), true, 'echo foo; rm -rf x 命中危险黑名单（; 切分后 rm -rf 被识别）')
// `cat f > /tmp/x`：旧实现单一片段 cmdName=cat → 只读放行（重定向写入被漏）
check(matchReadonlyWhitelist('cat f > /tmp/x'), false, 'cat f > /tmp/x 不再判只读（> 切分后 /tmp/x 段非只读）')
// `echo a || echo b`：|| 现在也会切分，两段都是 echo → 只读
check(matchReadonlyWhitelist('echo a || echo b'), true, 'echo a || echo b 仍判只读（|| 切分后两段 echo）')
// `echo a && echo b`：&& 原本就切，回归保护
check(matchReadonlyWhitelist('echo a && echo b'), true, 'echo a && echo b 仍判只读（回归保护）')
// 管道：原本就切，回归保护
check(matchReadonlyWhitelist('cat f | head'), true, 'cat f | head 仍判只读（管道回归保护）')

// ── 危险黑名单仍正确拦截单条危险命令（回归保护）──
check(matchDangerBlacklist('rm -rf /'), true, 'rm -rf / 命中危险黑名单')
check(matchDangerBlacklist('git push --force'), true, 'git push --force 命中危险黑名单')
check(matchDangerBlacklist('echo hello'), false, 'echo hello 不命中危险黑名单')

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
