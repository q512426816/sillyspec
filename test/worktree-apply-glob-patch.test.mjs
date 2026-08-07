/**
 * resolvePatchFiles 口径测试（坑 apply-glob-manifest-passes-check-but-not-patch）
 *
 * patchFiles 过滤口径须与 classifyAllowListViolations 一致（pathMatches 容差）。
 * 否则 design §6 用 glob（test_*.py）或多路径 cell 覆盖的文件过 manifest 校验
 * （Gate1 用 pathMatches 放行），却因字面 changedFiles.includes 不进 patch → 静默丢失。
 * 现场实测：apply 报"已应用 37 文件"但 7 个 glob 覆盖的测试文件没落盘。
 */
import { resolvePatchFiles, classifyAllowListViolations } from '../src/worktree-apply.js'

let failed = 0
const failures = []
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) { failed++; failures.push(`${msg} (got ${a}, want ${e})`); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== worktree-apply: resolvePatchFiles 口径（坑 apply-glob-manifest）===\n')

// ── Case 1: 无清单 → 全部变更进 patch ──
console.log('--- Case 1: 无清单 → 全部变更 ---')
{
  eq(resolvePatchFiles(['a.js', 'b.js'], new Set(), false), ['a.js', 'b.js'],
    'hasAllowList=false → 返回全部 changedFiles')
}

// ── Case 2（坑1 核心）: glob 清单覆盖的具体文件进 patch（原字面 includes 全丢）──
console.log('--- Case 2: glob 清单 test_*.py 覆盖的具体测试文件进 patch（坑1 核心）---')
{
  const changed = ['tests/test_auth.py', 'tests/test_model.py', 'tests/__init__.py', 'README.md']
  const allow = new Set(['tests/test_*.py'])
  eq(resolvePatchFiles(changed, allow, true),
    ['tests/test_auth.py', 'tests/test_model.py'],
    'glob test_*.py 覆盖 test_auth/test_model 进 patch，__init__.py/README.md 不进（原字面 includes 此处=[] 全丢）')
}

// ── Case 3: 目录前缀清单覆盖子树 ──
console.log('--- Case 3: 目录前缀 src/ 覆盖子树 ---')
{
  const changed = ['src/a.js', 'src/sub/b.js', 'docs/c.md']
  eq(resolvePatchFiles(changed, new Set(['src/']), true),
    ['src/a.js', 'src/sub/b.js'],
    '目录前缀 src/ 覆盖 src/ 下所有文件，docs/ 不进')
}

// ── Case 4: 具体文件清单（向后兼容，原字面 includes 行为不变）──
console.log('--- Case 4: 具体文件清单字面匹配（向后兼容）---')
{
  const changed = ['src/a.js', 'src/b.js']
  eq(resolvePatchFiles(changed, new Set(['src/a.js']), true), ['src/a.js'],
    '具体文件清单 → 仅匹配项进 patch（与原字面 includes 行为一致）')
}

// ── Case 5: 不被清单覆盖的文件不进 patch ──
console.log('--- Case 5: 未覆盖文件排除 ---')
{
  eq(resolvePatchFiles(['a.js', 'b.js', 'c.js'], new Set(['a.js', 'c.js']), true),
    ['a.js', 'c.js'], '未覆盖的 b.js 不进 patch')
}

// ── Case 6: 双星 glob 跨目录段 ──
console.log('--- Case 6: 双星 glob src/**/*.js 跨目录段 ---')
{
  const changed = ['src/a.js', 'src/sub/b.js', 'src/sub/deep/c.js', 'test/t.js']
  eq(resolvePatchFiles(changed, new Set(['src/**/*.js']), true),
    ['src/a.js', 'src/sub/b.js', 'src/sub/deep/c.js'],
    'src/**/*.js 匹配 src/ 下任意深度 .js（含 src/a.js 零段）')
}

// ── Case 7（口径一致性核心）: patchFiles 与 classifyAllowListViolations 互补 ──
console.log('--- Case 7: patchFiles 与 violations 口径互补（Gate1/Gate2 同 pathMatches）---')
{
  const changed = ['tests/test_auth.py', 'tests/test_router.py', 'other/leak.py', 'src/main.js']
  const allow = new Set(['tests/test_*.py', 'src/'])
  const patch = resolvePatchFiles(changed, allow, true)
  const violations = classifyAllowListViolations(changed, allow)
  eq(violations, ['other/leak.py'], 'violations = 不被清单覆盖的 other/leak.py')
  eq(patch, ['tests/test_auth.py', 'tests/test_router.py', 'src/main.js'],
    'patch = 被 pathMatches 覆盖的 3 个（含 glob + 前缀两类）')
  eq(patch.length + violations.length, changed.length,
    'patch ∪ violations 互补且不重叠 = 全部 changed（Gate1/Gate2 口径一致）')
}

// ── Case 8: 现场场景（mcp_gateway 7 测试文件）—— 原全丢，现全进 ──
console.log('--- Case 8: 现场 mcp_gateway 7 测试文件 glob 全进 patch ---')
{
  const changed = [
    'backend/app/modules/mcp_gateway/tests/__init__.py',
    'backend/app/modules/mcp_gateway/tests/test_auth.py',
    'backend/app/modules/mcp_gateway/tests/test_model.py',
    'backend/app/modules/mcp_gateway/tests/test_router.py',
    'backend/app/modules/mcp_gateway/tests/test_service.py',
    'backend/app/modules/mcp_gateway/tests/test_sse.py',
    'backend/app/modules/mcp_gateway/tests/test_tools_new.py',
    'backend/app/modules/mcp_gateway/tests/test_webhook.py',
  ]
  const allow = new Set([
    'backend/app/modules/mcp_gateway/tests/__init__.py',   // 显式列
    'backend/app/modules/mcp_gateway/tests/test_*.py',     // glob 覆盖 7 个
  ])
  const patch = resolvePatchFiles(changed, allow, true)
  eq(patch, changed, '8 文件全进 patch（1 显式 + 7 glob 覆盖），原字面 includes 仅 __init__.py 进、7 测试文件全丢')
}

// ── 结果 ──
const total = 8
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
