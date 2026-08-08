import assert from 'node:assert/strict'
import { resolveQuickSessionsDir, resolveRuntimeRoot } from '../src/run/shared.js'

// Q4（multi-agent-review-2026-08-08）：quick-sessions 目录须由单一函数解析，保证
// stage.js 写入与 complete-handlers.js 读/清理对齐。平台模式 runtimeRoot 与 specBase/.runtime
// 不同时，旧实现写一处读另一处 → guard 读不到 → brownfield 跳过审计。

// 跨平台：node:path join 在 win32 产反斜杠、posix 产正斜杠，统一成正斜杠再比较
const norm = (p) => String(p).replace(/\\/g, '/')

const specBase = '/proj/.sillyspec'

// 1. 无平台 opts → specBase/.runtime/quick-sessions（本地模式，与旧行为一致）
assert.equal(
  norm(resolveQuickSessionsDir(undefined, specBase)),
  '/proj/.sillyspec/.runtime/quick-sessions',
  '无 platformOpts → specBase/.runtime/quick-sessions'
)
assert.equal(
  norm(resolveQuickSessionsDir({}, specBase)),
  '/proj/.sillyspec/.runtime/quick-sessions',
  '空 platformOpts → specBase/.runtime/quick-sessions'
)

// 2. runtimeRoot 设置 → runtimeRoot/quick-sessions（平台模式，核心修复点）
assert.equal(
  norm(resolveQuickSessionsDir({ runtimeRoot: '/hub/runtime' }, specBase)),
  '/hub/runtime/quick-sessions',
  'runtimeRoot 设置 → runtimeRoot/quick-sessions（不再落到 specBase/.runtime）'
)

// 3. specDriftAnchor 设置 → specDriftAnchor/.runtime/quick-sessions
assert.equal(
  norm(resolveQuickSessionsDir({ specDriftAnchor: '/main/.sillyspec' }, specBase)),
  '/main/.sillyspec/.runtime/quick-sessions',
  'specDriftAnchor → specDriftAnchor/.runtime/quick-sessions'
)

// 4. runtimeRoot 优先级高于 specDriftAnchor（与 resolveRuntimeRoot 一致）
assert.equal(
  norm(resolveQuickSessionsDir({ runtimeRoot: '/hub/runtime', specDriftAnchor: '/main/.sillyspec' }, specBase)),
  '/hub/runtime/quick-sessions',
  'runtimeRoot 优先于 specDriftAnchor'
)

// 5. 与 resolveRuntimeRoot 保持同步（quick-sessions 恒为 resolveRuntimeRoot + '/quick-sessions'）
const cases = [
  { platformOpts: undefined, specBase },
  { platformOpts: { runtimeRoot: '/hub/runtime' }, specBase },
  { platformOpts: { specDriftAnchor: '/main/.sillyspec' }, specBase },
]
for (const c of cases) {
  const expected = norm(resolveRuntimeRoot(c.platformOpts, c.specBase)) + '/quick-sessions'
  assert.equal(
    norm(resolveQuickSessionsDir(c.platformOpts, c.specBase)),
    expected,
    `resolveQuickSessionsDir 恒 == resolveRuntimeRoot(...)/quick-sessions（opts=${JSON.stringify(c.platformOpts)}）`
  )
}

console.log('✅ Q4: resolveQuickSessionsDir 单一解析入口 regression check passed')
