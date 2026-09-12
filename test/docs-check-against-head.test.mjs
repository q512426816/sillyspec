// docs gate --against HEAD 模式（坑 docs-gate-shared-worktree-parallel-block，2026-09-08 实证）
//
// pre-push gate 校验语义对象是「被推送的提交树」，工作区混有并行会话未提交改动——活文档
// 锚点被在途编辑瞬时漂移，任何会话推送都被拦（移动靶，失败数两次运行 5→7 波动实证）。
// 修复：--against <ref> 激活 HEAD reader——文档与源码内容取提交树版本（干净文件磁盘直读、
// 脏文件 git show、未跟踪视为不存在）。
//
// 隔离：tmpdir 真实 git 仓库 fixture，不碰本仓 .sillyspec。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'os'
import { execFileSync } from 'node:child_process'
import { runDocsCheck, createHeadReader } from '../src/docs-check.js'

const tmpRoots = []
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), `docs-against-${process.pid}-`))
  tmpRoots.push(dir)
  return dir
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
})
function initRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 't@t.local'])
  git(dir, ['config', 'user.name', 't'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}

test('① 核心场景：源码在途漂移 → 工作区模式误拦、--against HEAD 放行', () => {
  const dir = makeRepo()
  initRepo(dir)
  mkdirSync(join(dir, 'docs'), { recursive: true })
  mkdirSync(join(dir, 'src'), { recursive: true })
  // 提交态：doc 锚点与源码对齐
  writeFileSync(join(dir, 'src', 'app.js'), 'function targetSymbol() {\n  return 1\n}\n', 'utf8')
  writeFileSync(join(dir, 'docs', 'arch.md'),
    '# 架构\n核心入口在 `src/app.js:1`（`targetSymbol`）。\n', 'utf8')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'init'])
  // 并行会话在途编辑：源码头部插入 20 行（未提交）→ 锚点行 1 的关键词窗口漂移
  const drifted = 'function targetSymbol() {\n  return 1\n}\n'
  writeFileSync(join(dir, 'src', 'app.js'), '// drift\n'.repeat(20) + drifted, 'utf8')

  const wt = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'] })
  assert.ok(wt.invalid.length > 0, `工作区模式被漂移误拦（实际 invalid=${wt.invalid.length}——修复前形态）`)

  const hd = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'], against: 'HEAD' })
  assert.equal(hd.invalid.length, 0, `--against HEAD 按提交树校验放行（实际 invalid=${JSON.stringify(hd.invalid.map(i => i.reason))}）`)
})

test('② 未跟踪文档（不随推送走）→ HEAD 模式不校验、工作区模式照常报', () => {
  const dir = makeRepo()
  initRepo(dir)
  mkdirSync(join(dir, 'docs'), { recursive: true })
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'app.js'), 'function ok() {\n  return 1\n}\n', 'utf8')
  writeFileSync(join(dir, 'docs', 'arch.md'), '# 架构\n见 `src/app.js:1`（ok）。\n', 'utf8')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'init'])
  // 并行会话的未提交草稿文档（引用不存在的文件）
  writeFileSync(join(dir, 'docs', 'draft-wip.md'), '# 草稿\n见 `src/ghost.js:99`（什么都没有）。\n', 'utf8')

  const wt = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'] })
  assert.ok(wt.invalid.some(i => i.doc === 'docs/draft-wip.md'), '工作区模式校验未跟踪草稿（现状语义）')

  const hd = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'], against: 'HEAD' })
  assert.ok(!hd.invalid.some(i => i.doc === 'docs/draft-wip.md'), 'HEAD 模式跳过未跟踪文档（不随推送走）')
  assert.equal(hd.invalid.length, 0, 'HEAD 模式整体 0 失效')
})

test('③ 未跟踪源文件不作候选（HEAD 模式）', () => {
  const dir = makeRepo()
  initRepo(dir)
  mkdirSync(join(dir, 'docs'), { recursive: true })
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'real.js'), 'function real() {\n  return 1\n}\n', 'utf8')
  writeFileSync(join(dir, 'docs', 'arch.md'), '# 架构\n裸名引用 `ghost.js:1`（ghost）。\n', 'utf8')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'init'])
  // 并行会话未提交新建 ghost.js（磁盘存在、HEAD 不存在）
  writeFileSync(join(dir, 'src', 'ghost.js'), 'function ghost() {}\n', 'utf8')

  const wt = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'] })
  assert.equal(wt.invalid.length, 0, '工作区模式：磁盘上的未跟踪 ghost.js 可作候选（现状语义）')

  const hd = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'], against: 'HEAD' })
  assert.equal(hd.invalid.length, 1, 'HEAD 模式：未跟踪源文件不作候选（推送到远端确缺此文件——真问题）')
})

test('④ 非 git 目录 → 回退磁盘模式 + warning（不炸不静默）', () => {
  const dir = makeRepo() // 不 init git
  mkdirSync(join(dir, 'docs'), { recursive: true })
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'app.js'), 'function ok() {}\n', 'utf8')
  writeFileSync(join(dir, 'docs', 'arch.md'), '# 架构\n见 `src/app.js:1`（ok）。\n', 'utf8')

  assert.equal(createHeadReader(dir), null, '非 git 仓 createHeadReader 返回 null')
  const r = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'], against: 'HEAD' })
  assert.equal(r.invalid.length, 0, '回退磁盘模式结果正确')
  assert.ok(r.warnings.some(w => w.includes('回退磁盘模式')), `附回退 warning（实际 ${JSON.stringify(r.warnings)}）`)
})

test('⑤ 干净树两模式结果一致（无漂移时零行为差异）', () => {
  const dir = makeRepo()
  initRepo(dir)
  mkdirSync(join(dir, 'docs'), { recursive: true })
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'app.js'), 'function ok() {\n  return 1\n}\n', 'utf8')
  writeFileSync(join(dir, 'docs', 'arch.md'), '# 架构\n见 `src/app.js:1`（ok）。\n', 'utf8')
  git(dir, ['add', '.'])
  git(dir, ['commit', '-q', '-m', 'init'])

  const wt = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'] })
  const hd = runDocsCheck({ projectRoot: dir, paths: ['docs/**/*.md'], against: 'HEAD' })
  assert.equal(wt.invalid.length, hd.invalid.length, '干净树两模式失效数一致')
  assert.equal(hd.invalid.length, 0, '内容对齐时均 0 失效')
})
