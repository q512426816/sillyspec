/**
 * 批命令长度分块（chunkByCommandLength，经 buildDepsBatches 行为面直测）单测。
 * 2026-10-15-jsx-batch-cmd-chunk FR-01：Windows cmd ~8191 上限下大依赖面单命令
 * 「命令行太长」恒败（消费仓双会话实证 137 / 138→159 文件批）——分块后单块 ≤
 * 前缀+6000，单块保原批名零回归，多块 :N/M 独立计账。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildDepsBatches } from '../src/verify-postcheck.js'

function mkRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix))
  mkdirSync(join(root, 'frontend', 'src', '__tests__'), { recursive: true })
  writeFileSync(join(root, 'frontend', 'package.json'), JSON.stringify({ name: 'fe', devDependencies: { vitest: '^1.0.0' } }))
  writeFileSync(join(root, 'frontend', 'pnpm-lock.yaml'), '')
  return root
}

function mkJsxFiles(root, count, nameLen) {
  const deps = []
  for (let i = 0; i < count; i++) {
    const name = `t${String(i).padStart(3, '0')}${'x'.repeat(nameLen)}.test.tsx`
    const rel = `frontend/src/__tests__/${name}`
    writeFileSync(join(root, rel), '')
    deps.push(rel)
  }
  return deps
}

test('单块零回归：拼接总长 < maxLen 时恰一个 deps(auto-jsx) 批，命令与旧拼接逐字一致', () => {
  const root = mkRoot('chunk-single-')
  const deps = mkJsxFiles(root, 3, 10)
  const t = (f) => `frontend/src/__tests__/${f}`
  try {
    const batches = buildDepsBatches({ deps, changedFiles: [], hits: [], cwd: root })
    const jsx = batches.filter((b) => b.short === 'jsx')
    assert.equal(jsx.length, 1, `恰一个 jsx 批（实得 ${jsx.length}）`)
    assert.equal(jsx[0].name, 'deps(auto-jsx)', '单块保持原批名')
    assert.equal(jsx[0].count, 3, 'count 守恒')
    const expected = `cd frontend && pnpm exec vitest run ${deps.map((d) => d.replace('frontend/', '')).join(' ')}`
    assert.equal(jsx[0].command, expected, `命令与旧拼接一致（实得 ${jsx[0].command}）`)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('多块分块：拼接总长超 maxLen → deps(auto-jsx:1/N..N/N)，count 守恒且每块命令不超上限', () => {
  const root = mkRoot('chunk-multi-')
  // 200 文件 × 名长 ~60 → 参数总长 ~12k，前缀 ~33 → 预期 3 块（6000/块）。
  const deps = mkJsxFiles(root, 200, 50)
  try {
    // deps 全量同时作变更面（优先面整跑）——普通依赖有配额帽，帽下不触发分块
    const batches = buildDepsBatches({ deps, changedFiles: deps, hits: [], cwd: root })
    const jsx = batches.filter((b) => b.short === 'jsx')
    assert.ok(jsx.length >= 2, `应分多块（实得 ${jsx.length} 块）`)
    const total = jsx.length
    jsx.forEach((b, i) => {
      // 命名断言钉「分块后缀契约」而非括号位置：第 k 块名必须带 :k/N 后缀（括号内
      // deps(auto-jsx:k/N 旧式 或 括号外 base:k/N 新式——base 可含并行「多项目分组」的
      // :dirKey）。钉死括号位置会在分组变更落地时再碎一次（2026-10-15 双实证：
      // 83b303db 对齐 WIP 致 HEAD 自红；反向同理）。
      const insideParens = new RegExp(`^deps\\(auto-jsx:${i + 1}/${total}\\)$`)
      const outsideParens = new RegExp(`^deps\\(auto-jsx[^)]*\\):${i + 1}/${total}$`)
      assert.ok(insideParens.test(b.name) || outsideParens.test(b.name), `第 ${i + 1} 块命名须为两形态之一（实得 ${b.name}）`)
      // 单块命令长度：前缀 + 本块参数 ≤ 前缀 + 6000 + 单参数富余（分块判据本身）
      assert.ok(b.command.length <= 6033 + 120, `第 ${i + 1} 块命令长度 ${b.command.length} 应贴近 6000 上限`)
    })
    assert.equal(jsx.reduce((s, b) => s + b.count, 0), 200, 'count 跨块守恒')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('js 原生批同款分块：deps(auto-js:1/N) 且 tap 标记保留', () => {
  const root = mkdtempSync(join(tmpdir(), 'chunk-jsnative-'))
  try {
    const deps = []
    for (let i = 0; i < 150; i++) {
      const name = `n${String(i).padStart(3, '0')}${'y'.repeat(50)}.test.mjs`
      writeFileSync(join(root, name), '')
      deps.push(name)
    }
    const batches = buildDepsBatches({ deps, changedFiles: deps, hits: [], cwd: root })
    const js = batches.filter((b) => b.short === 'js')
    assert.ok(js.length >= 2, `node --test 批应分多块（实得 ${js.length}）`)
    js.forEach((b) => assert.equal(b.tap, true, 'tap 标记保留'))
    assert.equal(js.reduce((s, b) => s + b.count, 0), 150, 'count 跨块守恒')
    assert.match(js[0].name, /^deps\(auto-js:1\/\d+\)$/, '首块命名 auto-js:1/N')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
