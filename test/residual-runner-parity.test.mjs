/**
 * residual-runner-parity.test.mjs — JSX 测试文件运行器分拣（2026-09-26-residual-runner-parity）
 *
 * 覆盖验收面（R18-SF-full 实证：.tsx 用 node --test 直跑恒败 ~11 次尝试 99 分钟）：
 *   ① vitest 推断批：.tsx + hits 含 vitest 命令 → deps(auto-jsx) 且 command 补 run 子命令；
 *   ② 无运行器 skip 批：.tsx 无 hits → command null + skip true + reason（不制造恒败段）；
 *   ③ jest 形态（不加 run）；④ 混合卷三批分拣（py/js 原生/jsx）与 .ts 原生不变（④既有钉复验）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { buildDepsBatches } = await import(pathToFileURL(join(ROOT, 'src/verify-postcheck.js')).href)

test('① vitest 推断批（补 run 子命令）', () => {
  const b = buildDepsBatches({ deps: ['a.test.tsx', 'b.spec.jsx'], changedFiles: [], hits: [{ test: 'pnpm exec vitest run src' }] })
  const jsx = b.find((x) => x.short === 'jsx')
  assert.ok(jsx, '应有 jsx 批')
  assert.match(jsx.command, /vitest run a\.test\.tsx b\.spec\.jsx$/)
  assert.equal(jsx.count, 2)
  assert.ok(!b.some((x) => x.short === 'js'), 'JSX 文件不再进 node --test 批')
})

test('①b jsx 批 cd 前缀重定基（评审 MEDIUM 清偿）', () => {
  const b = buildDepsBatches({
    deps: ['frontend/src/a.test.tsx'],
    changedFiles: [],
    hits: [{ test: 'cd frontend && pnpm exec vitest run src' }],
  })
  const jsx = b.find((x) => x.short === 'jsx')
  assert.ok(jsx && /vitest run src\/a\.test\.tsx$/.test(jsx.command), `cd 前缀下文件应重定基（实际 ${jsx && jsx.command}）`)
})

test('② 无运行器整批 skip（不制造恒败段）', () => {
  const b = buildDepsBatches({ deps: ['card.test.tsx'], changedFiles: [], hits: [{ test: 'pytest -q tests' }] })
  const skip = b.find((x) => x.short === 'jsx-skip')
  assert.ok(skip, '应有 jsx-skip 批')
  assert.equal(skip.command, null)
  assert.ok(skip.skip === true && /转项目运行器/.test(skip.reason), 'skip 批带转办 reason')
})

test('③ jest 形态（不加 run）', () => {
  const b = buildDepsBatches({ deps: ['x.test.jsx'], changedFiles: [], hits: [{ test: 'npx jest src --silent' }] })
  const jsx = b.find((x) => x.short === 'jsx')
  assert.ok(jsx && /^npx jest x\.test\.jsx/.test(jsx.command), `jest 直拼（实际 ${jsx && jsx.command}）`)
})

test('④ 混合三批分拣 + .ts 原生不变', () => {
  const b = buildDepsBatches({
    deps: ['t.py', 'a.test.ts', 'c.test.tsx'],
    changedFiles: [],
    hits: [{ test: 'cd frontend && pnpm exec vitest run src' }],
  })
  assert.deepEqual(b.map((x) => x.short), ['py', 'js', 'jsx'], '三批：py / js 原生 / jsx 项目')
  assert.match(b[1].command, /^node --test a\.test\.ts$/, '.ts 照旧 node --test（原生可跑——既有行为）')
  assert.match(b[2].command, /vitest run c\.test\.tsx/)
})
