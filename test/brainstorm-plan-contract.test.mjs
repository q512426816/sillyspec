/**
 * Brainstorm → Plan Contract v1 测试
 *
 * 验证 design.md 到 plan 的输入契约：
 * 1. 合法 design 通过
 * 2. 缺关键章节失败
 * 3. warning 不阻断
 */
import { validateDesignForPlan } from '../src/stages/plan.js'

let failed = 0
const failures = []

function assert(condition, msg) {
  if (!condition) {
    failed++
    failures.push(msg)
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

console.log('=== Brainstorm → Plan Contract v1 测试 ===\n')

// ─────────────────────────────────────────
// Case 1: valid design 通过
// ─────────────────────────────────────────
console.log('--- Case 1: valid design 通过 ---')
{
  const design = `# Design: 用户认证系统

## 背景
需要实现用户认证。

## 设计目标
- 支持 OAuth2
- 支持手机号登录

## 非目标
- 不做 SSO

## 总体方案
使用 JWT + Refresh Token。

## 决策
- D-001@v1: 选择 JWT 而非 Session

## 约束
- 必须兼容现有 API

## 文件变更清单
| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | src/auth.js | 认证模块 |
`
  const result = validateDesignForPlan(design)
  assert(result.ok, '完整 design 应校验通过')
  assert(result.errors.length === 0, '不应有 errors')
  assert(result.warnings.length === 0, '不应有 warnings')
}

// ─────────────────────────────────────────
// Case 2: empty design 失败
// ─────────────────────────────────────────
console.log('\n--- Case 2: empty design 失败 ---')
{
  assert(!validateDesignForPlan('').ok, '空字符串应失败')
  assert(!validateDesignForPlan(null).ok, 'null 应失败')
  assert(!validateDesignForPlan('   ').ok, '纯空格应失败')
}

// ─────────────────────────────────────────
// Case 3: missing goal 失败
// ─────────────────────────────────────────
console.log('\n--- Case 3: missing goal/背景 失败 ---')
{
  const design = `# Design

## 总体方案
用 JWT。

## 决策
D-001@v1: 选 JWT
`
  const result = validateDesignForPlan(design)
  assert(!result.ok, '缺目标/背景应失败')
  assert(result.errors.some(e => e.includes('目标') || e.includes('背景')), '错误应提到目标/背景')
}

// ─────────────────────────────────────────
// Case 4: missing scope/方案 失败
// ─────────────────────────────────────────
console.log('\n--- Case 4: missing scope/方案 失败 ---')
{
  const design = `# Design

## 背景
需要认证。

## 决策
D-001@v1: 选 JWT
`
  const result = validateDesignForPlan(design)
  assert(!result.ok, '缺范围/方案应失败')
  assert(result.errors.some(e => e.includes('范围') || e.includes('方案')), '错误应提到范围/方案')
}

// ─────────────────────────────────────────
// Case 5: missing decisions 失败
// ─────────────────────────────────────────
console.log('\n--- Case 5: missing decisions 失败 ---')
{
  const design = `# Design

## 背景
需要认证。

## 总体方案
用 JWT。
`
  const result = validateDesignForPlan(design)
  assert(!result.ok, '缺决策应失败')
  assert(result.errors.some(e => e.includes('决策')), '错误应提到决策')
}

// ─────────────────────────────────────────
// Case 6: decisions.md 引用也算决策
// ─────────────────────────────────────────
console.log('\n--- Case 6: decisions.md 引用算决策 ---')
{
  const design = `# Design

## 背景
需要认证。

## 总体方案
用 JWT。详见 decisions.md。

## 文件变更清单
| 操作 | 文件 | 说明 |
`
  const result = validateDesignForPlan(design)
  assert(result.ok, 'decisions.md 引用应满足决策检查')
}

// ─────────────────────────────────────────
// Case 7: missing non-goals 只有 warning
// ─────────────────────────────────────────
console.log('\n--- Case 7: missing non-goals warning ---')
{
  const design = `# Design

## 背景
需要认证。

## 总体方案
用 JWT。

## 决策
D-001@v1: 选 JWT

## 约束
必须兼容现有 API。
`
  const result = validateDesignForPlan(design)
  assert(result.ok, '缺非目标不应阻断')
  assert(result.warnings.some(w => w.includes('非目标') || w.includes('Non-goals')), '应有非目标 warning')
}

// ─────────────────────────────────────────
// Case 8: missing constraints 只有 warning
// ─────────────────────────────────────────
console.log('\n--- Case 8: missing constraints warning ---')
{
  const design = `# Design

## 目标
实现认证。

## 设计方案
用 JWT。

## 决策
选择 JWT。

## 非目标
不做 SSO。
`
  const result = validateDesignForPlan(design)
  assert(result.ok, '缺约束不应阻断')
  assert(result.warnings.some(w => w.includes('约束') || w.includes('风险') || w.includes('Trade-off')), '应有约束/风险 warning')
}

// ─────────────────────────────────────────
// Case 9: missing 文件变更清单 warning
// ─────────────────────────────────────────
console.log('\n--- Case 9: missing 文件变更清单 warning ---')
{
  const design = `# Design

## 背景
需要认证。

## 总体方案
用 JWT。

## 决策
D-001@v1: 选 JWT
`
  const result = validateDesignForPlan(design)
  assert(result.ok, '缺文件变更清单不应阻断')
  assert(result.warnings.some(w => w.includes('文件变更')), '应有文件变更 warning')
}

// ─────────────────────────────────────────
// Case 10: 英文 design 通过
// ─────────────────────────────────────────
console.log('\n--- Case 10: 英文 design 通过 ---')
{
  const design = `# Design: Auth System

## Background
We need authentication.

## Solution
Use JWT + Refresh Token.

## Decision
D-001@v1: Choose JWT over Session

## Non-goals
No SSO.

## Constraints
Must be backwards compatible.
`
  const result = validateDesignForPlan(design)
  assert(result.ok, '英文 design 应校验通过')
  assert(result.errors.length === 0, '不应有 errors')
}

// ─────────────────────────────────────────
// Case 11: 最小合法 design
// ─────────────────────────────────────────
console.log('\n--- Case 11: 最小合法 design ---')
{
  const design = `# Design

## 目标
修 bug。

## 方案
改代码。

## 决策
D-001@v1: 直接改。
`
  const result = validateDesignForPlan(design)
  assert(result.ok, '最小合法 design 应通过')
  // 可能有 warning 但 ok
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${11 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败项:`)
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log(`${'='.repeat(50)}`)

if (failed > 0) process.exit(1)
