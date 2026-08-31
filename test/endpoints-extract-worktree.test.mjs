// endpoints extract worktree 三坑回归（docs/sillyspec/2026-08-29-endpoints-extract-worktree-pitfalls）
//
// ① --all-tasks 在 execute worktree 模式下：allowed_paths 按主仓相对解析 0 命中（实测 13 task
//    全 0 端点）→ 活跃 worktree meta 存在时优先按 worktree 根解析（CLI e2e）。
// ② 产物落点：spec 命中 worktree 副本时锚回主仓（verify 探针 5 只认主仓 contract-artifacts/）。
// ③ `@router.get("")` 空路径装饰器漏扫（前缀本身即路由，GET /notifications 实证丢失）。
//
// 隔离：临时目录 fixture + 真实 CLI 子进程（--all-tasks 路径）；meta.json 手工落盘模拟
// WorktreeManager 读取面，不创建真实 git worktree（getMeta 只读文件不查 git）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(REPO_ROOT, 'src', 'index.js')

function dirname(p) { return p.replace(/[\\/][^\\/]+$/, '') }

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-endpoints-wt-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}

test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('坑③：`@router.get("")` 空路径装饰器 → 前缀本身即路由（FastAPI）', async () => {
  const { extractFastApiEndpoints } = await import('../src/endpoint-extractor.js')
  const fx = makeFixture()
  const py = join(fx, 'router.py')
  writeFileSync(py, [
    'from fastapi import APIRouter',
    'router = APIRouter(prefix="/notifications")',
    '',
    '@router.get("")',
    'async def list_all():',
    '    ...',
    '',
    '@router.post("/mark-read")',
    'async def mark_read():',
    '    ...',
  ].join('\n'), 'utf8')
  const eps = extractFastApiEndpoints(py)
  const emptyPath = eps.find(e => e.method === 'GET' && e.path === '/notifications')
  assert.ok(emptyPath, `空路径装饰器应提取为前缀本身路由（实际：${JSON.stringify(eps)}）`)
  assert.ok(eps.some(e => e.method === 'POST' && e.path === '/notifications/mark-read'), '显式路径回归不受影响')
})

test('坑③：多行空路径装饰器 `@router.delete(\\n  ""\\n)` 同样命中', async () => {
  const { extractFastApiEndpoints } = await import('../src/endpoint-extractor.js')
  const fx = makeFixture()
  const py = join(fx, 'router2.py')
  writeFileSync(py, [
    'router = APIRouter(prefix="/feeds")',
    '@router.delete(',
    '    "",',
    '    summary="清空"',
    ')',
    'async def clear():',
    '    ...',
  ].join('\n'), 'utf8')
  const eps = extractFastApiEndpoints(py)
  assert.ok(eps.some(e => e.method === 'DELETE' && e.path === '/feeds'), '多行空路径命中')
})

test('坑③：Express `router.get("")` 空路径 + use 前缀', async () => {
  const { extractExpressEndpoints } = await import('../src/endpoint-extractor.js')
  const fx = makeFixture()
  const js = join(fx, 'routes.js')
  writeFileSync(js, [
    'const router = require("express").Router()',
    'app.use("/widgets", router)',
    'router.get("", handler)',
    'router.post("/:id", handler)',
  ].join('\n'), 'utf8')
  const eps = extractExpressEndpoints(js)
  assert.ok(eps.some(e => e.method === 'GET' && e.path === '/widgets'), 'Express 空路径=前缀本身')
})

test('坑①+② e2e：--all-tasks 在 worktree 模式按 worktree 根解析 + 产物落主仓', () => {
  const fx = makeFixture()
  const change = 'demo-wt-change'
  // 主仓 spec：变更 + task 卡（allowed_paths 相对路径，文件只存在于 worktree）
  const specBase = join(fx, '.sillyspec')
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nallowed_paths:\n- backend/app/modules/demo/router.py\n---\n# task-01\n', 'utf8')
  // 模拟 execute worktree：meta.json 落主仓 .runtime/worktrees/<change>/，代码只在 worktree
  const wtRoot = join(fx, 'wt-copy')
  const wtMetaDir = join(specBase, '.runtime', 'worktrees', change)
  mkdirSync(wtMetaDir, { recursive: true })
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    mode: 'native-worktree',
    worktreePath: wtRoot,
    branch: 'demo-branch',
    baseHash: '0'.repeat(40),
  }), 'utf8')
  mkdirSync(join(wtRoot, 'backend/app/modules/demo'), { recursive: true })
  writeFileSync(join(wtRoot, 'backend/app/modules/demo/router.py'), [
    'router = APIRouter(prefix="/demo")',
    '@router.get("/items")',
    'async def items():',
    '    ...',
    '@router.get("")',
    'async def root():',
    '    ...',
  ].join('\n'), 'utf8')
  // 主仓对应位置无该文件（execute worktree 独有）

  const r = spawnSync(process.execPath, [CLI, 'endpoints', 'extract', '--change', change, '--all-tasks'],
    { cwd: fx, encoding: 'utf8', timeout: 60_000 })
  assert.equal(r.status, 0, `CLI 应成功（stdout=${r.stdout}\nstderr=${r.stderr}）`)

  // 坑①：worktree 里的文件被扫到（修复前 resolve(相对路径) 落主仓 → 0 端点）
  assert.match(r.stdout, /task-01: 2 个端点/, 'worktree 内文件被提取（含空路径路由）')
  assert.match(r.stdout, /活跃 worktree/, 'stdout 提示按 worktree 根解析')

  // 坑②：产物落主仓 .runtime/contract-artifacts/（修复前 cwd 命中 worktree 副本会落副本）
  const artifactPath = join(specBase, '.runtime', 'contract-artifacts', change, 'task-01', 'endpoints.json')
  assert.ok(existsSync(artifactPath), `产物应落主仓：${artifactPath}`)
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
  const paths = artifact.endpoints.map(e => `${e.method} ${e.path}`).sort()
  assert.deepEqual(paths, ['GET /demo', 'GET /demo/items'])
})

test('坑② e2e：CLI 在 worktree 副本内跑（cwd=worktree 含 checkout 出的 .sillyspec）→ 产物锚回主仓', () => {
  const fx = makeFixture()
  const change = 'demo-wt-change2'
  // 主仓 spec
  const specBase = join(fx, '.sillyspec')
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nallowed_paths:\n- backend/x.py\n---\n# task-01\n', 'utf8')
  // worktree 副本：内含 checkout 出来的 .sillyspec（含 change 目录拷贝）+ 实际代码
  const wtRoot = join(specBase, '.runtime', 'worktrees', change)
  const wtSpecCopy = join(wtRoot, '.sillyspec')
  mkdirSync(join(wtSpecCopy, 'changes', change, 'tasks'), { recursive: true })
  writeFileSync(join(wtSpecCopy, 'changes', change, 'tasks', 'task-01.md'),
    '---\nallowed_paths:\n- backend/x.py\n---\n# task-01\n', 'utf8')
  // meta.json 在主仓 .runtime/worktrees/<change>/（worktree 根即其本身）——in-place 语义无独立 meta，
  // 此场景走 detectWorktreeSpecDrift 锚定（cwd 命中副本），文件在 worktree 根可直接 resolve
  mkdirSync(join(wtRoot, 'backend'), { recursive: true })
  writeFileSync(join(wtRoot, 'backend/x.py'), [
    'router = APIRouter(prefix="/x")',
    '@router.get("/list")',
    'async def list_x():',
    '    ...',
  ].join('\n'), 'utf8')

  const r = spawnSync(process.execPath, [CLI, 'endpoints', 'extract', '--change', change, '--all-tasks'],
    { cwd: wtRoot, encoding: 'utf8', timeout: 60_000 })
  assert.equal(r.status, 0, `CLI 应成功（stdout=${r.stdout}\nstderr=${r.stderr}）`)
  assert.match(r.stdout, /已自动锚定主仓 spec/, 'stdout 提示锚定主仓')
  // 产物落主仓而非副本
  const artifactPath = join(specBase, '.runtime', 'contract-artifacts', change, 'task-01', 'endpoints.json')
  assert.ok(existsSync(artifactPath), `产物应落主仓：${artifactPath}`)
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
  assert.ok(artifact.endpoints.some(e => e.path === '/x/list'), 'worktree 副本内代码被扫到')
  assert.ok(!existsSync(join(wtSpecCopy, '.runtime', 'contract-artifacts')), '副本内不应留产物')
})
