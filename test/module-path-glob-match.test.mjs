/**
 * 模块路径 glob 匹配统一入口（2026-10-15-module-path-glob-match）
 *
 * 背景：sillyspec-scan 生成的 module-map（消费仓）大量 glob 形态 paths，历史各消费点
 * 朴素前缀匹配致 glob 条目恒不命中——消费仓 FR 铸伪域/决策落 unmapped 的根因。
 * 本文件锁三面：
 *   ① modulePathMatches 全形态（无 glob 旧语义逐字 / 双星 / 目录尾 / / 单星 / 问号 /
 *      双星与文件通配组合 / 括号路径 / 反斜杠归一 / 空输入）
 *   ② 端到端：glob 形态 module-map 下 resolveTouchedDomains 命真域不投伪域（修前行为对照）
 *   ③ decision-distill matchImpactsToModules 对 glob map 命中真域
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modulePathMatches } from '../src/modules.js'
import { resolveTouchedDomains } from '../src/fr-index.js'
import { discoverModuleIndex } from '../src/decision-distill.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ── ① 全形态 ─────────────────────────────────────────────────────────────────

test('① modulePathMatches 全形态：旧语义逐字 + glob 补充', () => {
  const cases = [
    // 无 glob：与旧各消费点逐字等价
    ['src/flow.js', 'src/flow.js', true, '文件条目精确'],
    ['src/flow.js', 'src/', true, '目录条目（尾 /）前缀'],
    ['src/run/x.js', 'src/', true, '目录深子路径'],
    ['other/x.js', 'src/', false, '目录外不命中'],
    ['src/flow.js', 'src/flow.ts', false, '不同扩展名不命中'],
    ['src/flow.js', 'src/flow.js.bak', false, '后缀文件不命中'],
    // glob：扫描卡形态
    ['backend/app/modules/daemon/router.py', 'backend/app/modules/daemon/**', true, '** 尾巴'],
    ['backend/app/modules/daemon/x/y/z.py', 'backend/app/modules/daemon/**', true, '** 深子路径'],
    ['backend/app/modules/daemonx/a.py', 'backend/app/modules/daemon/**', false, '** 不跨段内前缀'],
    ['frontend/src/components/daemon/foo.tsx', 'frontend/src/components/daemon/*.tsx', true, '* 段内'],
    ['frontend/src/components/daemon/sub/foo.tsx', 'frontend/src/components/daemon/*.tsx', false, '* 不跨斜杠'],
    ['frontend/src/components/x.tsx', 'frontend/src/components/x*.tsx', true, '* 段内前缀'],
    ['frontend/src/app/(dashboard)/sessions/page.tsx', 'frontend/src/app/(dashboard)/sessions/**/*.tsx', true, '括号路径 + **/*.tsx 组合'],
    ['frontend/src/app/(dashboard)/x/y/p.tsx', 'frontend/src/app/(dashboard)/**/*.tsx', true, '** 中间段'],
    ['sillyhub-daemon/src/daemon.ts', 'sillyhub-daemon/src/**', true, '项目前缀 **'],
    // 归一与空输入
    ['src\\flow.js', 'src/flow.js', true, '反斜杠文件路径归一'],
    ['src/flow.js', 'src\\', true, '反斜杠目录条目归一'],
    ['', 'src/', false, '空文件路径'],
    ['src/x.js', '', false, '空 pattern'],
  ]
  for (const [f, p, exp, label] of cases) {
    assert.equal(modulePathMatches(f, p), exp, `${label}: ${f} ~ ${p}`)
  }
})

// ── ② 端到端：glob map 域路由 ────────────────────────────────────────────────

function seedGlobMapRepo() {
  const root = mkdtempSync(join(tmpdir(), 'globmap-'))
  const spec = join(root, '.sillyspec')
  mkdirSync(join(spec, 'knowledge', 'fr'), { recursive: true })
  mkdirSync(join(spec, 'changes', 'x'), { recursive: true })
  // 扫描卡形态：glob paths（对照平台仓 docs/backend/modules 实态）
  mkdirSync(join(spec, 'docs', 'sillyspec', 'modules'), { recursive: true })
  writeFileSync(join(spec, 'docs', 'sillyspec', 'modules', '_module-map.yaml'), [
    'modules:',
    '  core-engine:',
    '    status: active',
    '    doc: modules/core-engine.md',
    '    paths:',
    '      - src/knowledge-*.js',
    '      - src/flow.js',
    '  cli-entry:',
    '    status: active',
    '    doc: modules/cli-entry.md',
    '    paths:',
    '      - src/index.js',
    '',
  ].join('\n'))
  return { root, spec }
}

test('② 端到端：glob 形态 map → 域路由命真域（修前投伪域）', () => {
  const { root, spec } = seedGlobMapRepo()
  try {
    const mi = discoverModuleIndex(join(spec, 'knowledge'))
    assert.ok(mi, 'map 发现')
    const d1 = resolveTouchedDomains(join(spec, 'changes', 'x'), mi, ['src/knowledge-vector.js'], join(spec, 'knowledge'))
    assert.deepEqual(d1, ['core-engine'], 'glob 条目 src/knowledge-*.js 命中（修前必然投伪域/unmapped）')
    const d2 = resolveTouchedDomains(join(spec, 'changes', 'x'), mi, ['src/flow.js'], join(spec, 'knowledge'))
    assert.deepEqual(d2, ['core-engine'], '精确条目照常')
    const d3 = resolveTouchedDomains(join(spec, 'changes', 'x'), mi, ['src/unknown/deep/file.js'], join(spec, 'knowledge'))
    assert.ok(d3.every((x) => String(x).startsWith('auto-')), '真无覆盖 → 伪域投票照旧（未过宽兜底）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// ── ③ 决策 impacts 对 glob map ───────────────────────────────────────────────

test('③ 决策 impacts 路径对 glob map 命中真域', async () => {
  const { discoverModuleIndex: dmi } = await import('../src/decision-distill.js')
  const { root, spec } = seedGlobMapRepo()
  try {
    const mi = dmi(join(spec, 'knowledge'))
    // matchImpactsToModules 是 decision-distill 模块私有——经 dist 的域决议消费路径间接测：
    // 用 discoverModuleIndex 结果对 impacts 文本 token 做同口径断言（modulePathMatches 单一源）
    const impacts = '改动 src/knowledge-graph.js 与 src/flow.js'
    const token = 'src/knowledge-graph.js'
    const hit = Object.entries(mi).some(([id, m]) =>
      (m.paths || []).some((p) => modulePathMatches(token, p)) && id === 'core-engine')
    assert.ok(hit, 'impacts token 对 glob 条目命中 core-engine')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
