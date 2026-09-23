/**
 * modules 块状子键展开解析（2026-09-24 R10/R11 文案矛盾根治）：
 * 块状 path:/test: 缩进子行与 inline flow 双形态均可解析；缩进不深于条目行的子行终止收集。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractModules } from '../src/verify-postcheck.js'

test('T1 块状形态解析（R10 受试配置形态）', () => {
  const yaml = [
    'commands:',
    '  test: "node --test test/"',
    'test_strategy: module',
    'modules:',
    '  backend:',
    '    path: backend',
    '    test: cd backend && uv run pytest app/modules/platform_sync -q',
    '  frontend:',
    '    path: frontend',
    '    test: cd frontend && pnpm test',
  ].join('\n')
  const m = extractModules(yaml)
  assert.ok(m, '块状形态解析成功')
  assert.equal(m.backend.path, 'backend')
  assert.ok(m.backend.test.includes('uv run pytest'), 'backend test 命令完整（含 && 后段）')
  assert.equal(m.frontend.path, 'frontend')
  assert.ok(m.frontend.test.includes('pnpm test'))
})

test('T2 inline flow 形态回归（既有行为零变化）', () => {
  const yaml = [
    'modules:',
    '  cli-core: { path: src/cli, test: "node --test test/cli.test.mjs" }',
  ].join('\n')
  const m = extractModules(yaml)
  assert.ok(m && m['cli-core'], 'inline 照常')
  assert.equal(m['cli-core'].path, 'src/cli')
})

test('T3 混排与终止条件', () => {
  const yaml = [
    'modules:',
    '  a:',
    '    path: pa',
    '    test: ta',
    '  b: { path: pb, test: tb }',
    'other_key: 1',
    'modules2:',
    '  c:',
  ].join('\n')
  const m = extractModules(yaml)
  assert.ok(m.a && m.b, '混排双形态')
  assert.equal(m.a.test, 'ta')
  assert.ok(!m.c, '顶层 key 后终止')
  void readFileSync
})
