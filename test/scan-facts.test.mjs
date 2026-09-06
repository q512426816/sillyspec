/**
 * scan-facts.test.mjs — 事实底稿测试（archify 借鉴：机械事实预咀嚼，2026-09-05）
 *
 * 覆盖：nodejs/python 项目类型判定与依赖解析 / Express+FastAPI 端点抽取与
 * cwd 相对引用形态 / 底稿引用可被 collectDocRefs 消费（进核验与漂移链路）/
 * 端点截断上限 / 空目录 fail-soft / 无 git 环境 gitHead 为空不抛。
 */

import { join, resolve, dirname } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const { buildAndWriteScanFacts, collectScanFacts, renderScanFactsMd } = await import(pathToFileURL(join(root, 'src', 'scan-facts.js')).href)
const { collectDocRefs } = await import(pathToFileURL(join(root, 'src', 'docs-check.js')).href)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const cwd = join(tmpdir(), `scnfcts-${name}`)
  mkdirSync(cwd, { recursive: true })
  return cwd
}
function clean(d) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

// ── 1: nodejs 项目——类型/依赖/scripts/Express+FastAPI 端点/引用形态 ──
console.log('\n=== Test 1: nodejs 项目全链路 ===')
{
  const cwd = setup('t1')
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({
    name: 'demo-app', dependencies: { express: '^4', ws: '^8' }, devDependencies: { vitest: '^2' },
    scripts: { test: 'vitest run', build: 'vite build' },
  }))
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'server.js'), [
    'const express = require("express")',
    'const app = express()',
    'app.get("/api/health", (req, res) => res.json({ ok: 1 }))',
    'app.post("/api/users", (req, res) => res.json({}))',
    '',
  ].join('\n'))
  mkdirSync(join(cwd, 'backend', 'app'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'app', 'main.py'), [
    'from fastapi import APIRouter',
    'router = APIRouter(prefix="/api")',
    '@router.get("/items")',
    'async def items():',
    '    return []',
    '',
  ].join('\n'))

  const r = buildAndWriteScanFacts({ cwd, specDir: join(cwd, '.sillyspec'), projectName: 'demo' })
  const md = readFileSync(r.outPath, 'utf8')
  assert(r.outPath.endsWith(join('.sillyspec', 'docs', 'demo', 'scan', '_facts.md')), '产物路径正确')
  assert(r.facts.type === 'nodejs', `类型 nodejs（实际 ${r.facts.type}）`)
  assert(md.includes('express') && md.includes('vitest'), '依赖清单含 express/vitest')
  assert(md.includes('test = vitest run'), 'scripts 段存在')
  assert(md.includes('`GET /api/health` — `src/server.js:3`'), 'Express 端点带 file:line')
  assert(md.includes('`POST /api/users` — `src/server.js:4`'), '第二个 Express 端点')
  assert(md.includes('`GET /api/items` — `backend/app/main.py:3`'), 'FastAPI 端点（跨目录 cwd 相对路径）')
  // 底稿引用进入核验/漂移链路
  const refs = collectDocRefs(md)
  assert(refs.some(x => x.file === 'src/server.js' && x.start === 3), `collectDocRefs 消费底稿引用（共 ${refs.length} 条）`)
  clean(cwd)
}

// ── 2: python 项目——pyproject 依赖行级解析 ──
console.log('\n=== Test 2: python 项目 ===')
{
  const cwd = setup('t2')
  writeFileSync(join(cwd, 'pyproject.toml'), [
    '[project]',
    'name = "svc"',
    'dependencies = [',
    '    "fastapi>=0.115",',
    '    "uvicorn[standard]",',
    ']',
    '',
  ].join('\n'))
  const facts = collectScanFacts({ cwd })
  assert(facts.type === 'python', `类型 python（实际 ${facts.type}）`)
  const md = renderScanFactsMd(facts)
  assert(md.includes('fastapi'), '依赖含 fastapi')
  clean(cwd)
}

// ── 3: 空目录 fail-soft（无清单无源码无 git） ──
console.log('\n=== Test 3: 空目录 fail-soft ===')
{
  const cwd = setup('t3')
  const r = buildAndWriteScanFacts({ cwd, specDir: join(cwd, '.sillyspec'), projectName: 'empty' })
  assert(r.facts.type === 'generic', `类型 generic（实际 ${r.facts.type}）`)
  assert(typeof r.outPath === 'string', '不抛异常且落盘')
  clean(cwd)
}

// ── 4: 端点截断上限 ──
console.log('\n=== Test 4: 端点截断 ===')
{
  const cwd = setup('t4')
  writeFileSync(join(cwd, 'package.json'), '{"name":"big"}')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  const lines = ['const app = require("express")()']
  for (let i = 0; i < 70; i++) lines.push(`app.get("/api/r${i}", (req, res) => res.json({}))`)
  writeFileSync(join(cwd, 'src', 'big.js'), lines.join('\n') + '\n')
  const facts = collectScanFacts({ cwd })
  assert(facts.endpoints.backendTotal === 70, `总数 70（实际 ${facts.endpoints.backendTotal}）`)
  assert(facts.endpoints.backend.length === 60, `列出 60 截断（实际 ${facts.endpoints.backend.length}）`)
  const md = renderScanFactsMd(facts)
  assert(md.includes('仅列前 60'), '截断注记存在')
  clean(cwd)
}

// ── 5: 子项目 --path：引用仍锚 cwd（主仓根相对） ──
console.log('\n=== Test 5: 子项目 projectPath ===')
{
  const cwd = setup('t5')
  mkdirSync(join(cwd, 'packages', 'api'), { recursive: true })
  writeFileSync(join(cwd, 'packages', 'api', 'package.json'), '{"name":"api","dependencies":{"koa":"^2"}}')
  writeFileSync(join(cwd, 'packages', 'api', 'server.js'), 'const app = require("express")()\napp.get("/api/x", () => {})\n')
  const facts = collectScanFacts({ cwd, projectPath: 'packages/api' })
  assert(facts.type === 'nodejs', '子项目类型')
  assert(facts.endpoints.backend.length === 1 && facts.endpoints.backend[0].ref === 'packages/api/server.js:2', `引用锚 cwd 根（实际 ${facts.endpoints.backend[0]?.ref}）`)
  clean(cwd)
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
