/**
 * 探针 5 unused 分层「本变更相关=定义源文件∈变更文件面」测试（quick-C，2026-09-20 报告问题 C）。
 *
 * 坑：change-relevant 原判「∈ contract artifact 端点集」——artifact 池是 execute 起点拍的整仓
 * baseline（614 端点全量）时 artifactKeys ⊇ 全仓，418 个存量端点全被误标「本变更端点前端未调用」
 * 刷屏，存量折叠机制被击穿。修法：有变更文件面时改判「端点定义源文件 ∈ 本变更 diff 面」。
 *
 * 夹具形态：tmp git 仓两个后端文件各定义一个端点；artifact 池（contract-artifacts/<change>/
 * baseline/endpoints.json）两端点都收（模拟整仓 baseline）；a.js 未提交修改（diff 面只含 a.js）。
 * 断言：unusedChangeRelevant 只含 /api/changed（a.js 端点），/api/stock 落 stock 折叠。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { verifyApiParity } from '../src/contract-matrix.js'

const git = (cwd, args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' })

test('unused 分层文件面口径：整仓 baseline artifact 下只有变更文件定义的端点进 change-relevant', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5cr-'))
  try {
    git(root, ['init', '--quiet'])
    writeFileSync(join(root, 'a.js'), "app.get('/api/changed', h)\n")
    writeFileSync(join(root, 'b.js'), "app.get('/api/stock', h)\n")
    git(root, ['add', '.'])
    git(root, ['commit', '--quiet', '-m', 'base'])
    // diff 面：只改 a.js（未提交）
    writeFileSync(join(root, 'a.js'), "app.get('/api/changed', h2)\n")
    // 整仓 baseline artifact：两端点都在池里（模拟 endpoints baseline 全量拍法）
    const specBase = join(root, '.sillyspec')
    const runtimeRoot = join(specBase, '.runtime')
    const artifactDir = join(runtimeRoot, 'contract-artifacts', 'c1', 'baseline')
    mkdirSync(artifactDir, { recursive: true })
    writeFileSync(join(artifactDir, 'endpoints.json'), JSON.stringify({
      endpoints: [
        { method: 'GET', path: '/api/changed', source: 'a.js' },
        { method: 'GET', path: '/api/stock', source: 'b.js' },
      ],
    }))
    const r = verifyApiParity(specBase, root, runtimeRoot, 'c1')
    const relevant = (r.unusedChangeRelevant || []).map(u => `${u.method} ${u.path}`)
    assert.ok(relevant.includes('GET /api/changed'), `变更文件（a.js）定义的端点进 change-relevant（实际 ${JSON.stringify(relevant)}）`)
    assert.ok(!relevant.includes('GET /api/stock'), `存量端点（b.js）不进 change-relevant——整仓 baseline 击穿场景收口（实际 ${JSON.stringify(relevant)}）`)
    assert.ok((r.unusedStockCount || 0) >= 1, `存量端点落 stock 折叠计数（实际 ${r.unusedStockCount}）`)
  } finally {
    try { rmSync(root, { recursive: true, force: true }) } catch {}
  }
})

test('无变更文件面（无 changeName）回退 artifact 口径零回归', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5cr2-'))
  try {
    writeFileSync(join(root, 'a.js'), "app.get('/api/x', h)\n")
    const specBase = join(root, '.sillyspec')
    const runtimeRoot = join(specBase, '.runtime')
    const artifactDir = join(runtimeRoot, 'contract-artifacts', 'c2', 'baseline')
    mkdirSync(artifactDir, { recursive: true })
    writeFileSync(join(artifactDir, 'endpoints.json'), JSON.stringify({
      endpoints: [{ method: 'GET', path: '/api/x', source: 'a.js' }],
    }))
    const r = verifyApiParity(specBase, root, runtimeRoot, null)
    assert.ok((r.unusedChangeRelevant || []).some(u => u.path === '/api/x'), '无 changeName → artifact 口径：artifact 内端点仍进 change-relevant')
  } finally {
    try { rmSync(root, { recursive: true, force: true }) } catch {}
  }
})
