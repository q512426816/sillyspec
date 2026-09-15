/**
 * docs gate 测试：ratchet 判定语义 + 基线 IO + runDocsGate 集成（无基线/损坏/init/拦/放）。
 * fixture 用 tmp git 仓 + 真文件（无 git 操作，纯 fs），跑完清理。
 * 坑 docs-gate-stale-baseline（ql-20260915-004）：origin/main 实测兜底——真 git 临时仓
 * 构造 origin/main 远端 ref，锁「未劣于远端放行 + 重锚提示 / 劣于远端拦 + 双参考值 /
 * 无远端回原拦 / 快路径零实测 / 临时 worktree 清理」五语义。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'os'
import { execFileSync } from 'node:child_process'
import {
  evaluateRatchet, readBaseline, writeBaseline, runDocsGate, BASELINE_FILENAME,
  measureRemoteBaselineCount,
} from '../src/docs-gate.js'

let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'docsgate-'))
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'docs'), { recursive: true })
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  // 源码 3 行；文档引用 L1 正确、L9 超界（1 处失效）
  writeFileSync(join(root, 'src', 'a.js'), 'export const alphaSym = 1\n// l2\n// l3\n')
  writeFileSync(join(root, 'docs', 'x.md'), '见 `src/a.js:1`（`alphaSym`）；另见 `src/a.js:9`（失效）\n')
})
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

describe('evaluateRatchet（纯判定）', () => {
  it('current < baseline → 过 + 提示可下调基线', () => {
    const r = evaluateRatchet({ current: 2, baseline: 5 })
    assert.equal(r.ok, true)
    assert.equal(r.delta, -3)
    assert.ok(r.message.includes('下调基线'))
  })
  it('current = baseline → 过', () => {
    const r = evaluateRatchet({ current: 5, baseline: 5 })
    assert.equal(r.ok, true)
    assert.equal(r.delta, 0)
  })
  it('current > baseline → 拦 + 报新增数', () => {
    const r = evaluateRatchet({ current: 8, baseline: 5 })
    assert.equal(r.ok, false)
    assert.equal(r.delta, 3)
    assert.ok(r.message.includes('新增 3 处'))
  })
})

describe('基线 IO', () => {
  it('无文件 → null；写后读回；损坏内容 → NaN', () => {
    assert.equal(readBaseline(root), null)
    writeBaseline(root, 7)
    assert.equal(readBaseline(root), 7)
    writeFileSync(join(root, BASELINE_FILENAME), 'not-a-number\n')
    assert.ok(Number.isNaN(readBaseline(root)))
  })
})

describe('runDocsGate（集成）', () => {
  it('无基线 → exit 2 fail-closed（不悄悄合法化存量）', async () => {
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 2)
    assert.equal(r.current, 1)
    assert.ok(r.message.includes('--init-baseline'))
  })

  it('--init-baseline → 写基线 = 实测数，exit 0，幂等', async () => {
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec'), initBaseline: true })
    assert.equal(r.exitCode, 0)
    assert.equal(r.baseline, 1)
    assert.equal(readBaseline(join(root, '.sillyspec')), 1)
    const r2 = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec'), initBaseline: true })
    assert.equal(r2.baseline, 1, '幂等重跑同值')
  })

  it('current ≤ baseline → exit 0 放行（存量既往不咎）', async () => {
    writeBaseline(join(root, '.sillyspec'), 5)
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 0)
    assert.equal(r.delta, -4)
  })

  it('current > baseline → exit 1 拦截增量', async () => {
    writeBaseline(join(root, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 1)
    assert.equal(r.delta, 1)
    assert.ok(r.message.includes('新增 1 处'))
  })

  it('基线损坏 → exit 2', async () => {
    writeFileSync(join(root, '.sillyspec', BASELINE_FILENAME), 'x\n')
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 2)
  })

  it('全绿 + 基线 0 → exit 0（正常干净仓）', async () => {
    writeFileSync(join(root, 'docs', 'x.md'), '见 `src/a.js:1`（`alphaSym`）\n')
    writeBaseline(join(root, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: root, specBase: join(root, '.sillyspec') })
    assert.equal(r.exitCode, 0)
  })
})

// ── 坑 docs-gate-stale-baseline（ql-20260915-004）：origin/main 实测兜底 ──
// 真 git 临时仓：update-ref 构造 refs/remotes/origin/main（无需 bare 远端——detect 面只需
// ref 可解析 + worktree 可检出该提交树）。
describe('runDocsGate origin/main 实测兜底（真 git 仓）', () => {
  const gitCli = (dir, args) =>
    execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  let repo
  const docWith = (n) => {
    // n 处失效：前 n 行引用 src/a.js 超界行（文件仅 3 行，行号 ≥9 恒失效）
    const lines = ['<!-- 开始 -->']
    for (let i = 0; i < n; i++) lines.push(`- 见 \`src/a.js:${9 + i}\`（失效 ${i + 1}）`)
    lines.push('见 `src/a.js:1`（`alphaSym`）')
    return lines.join('\n') + '\n'
  }
  const commitAll = (msg) => { gitCli(repo, ['add', '.']); gitCli(repo, ['commit', '-q', '-m', msg]) }

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'docsgate-remote-'))
    gitCli(repo, ['init', '-q'])
    gitCli(repo, ['config', 'user.email', 't@t.local'])
    gitCli(repo, ['config', 'user.name', 't'])
    gitCli(repo, ['config', 'commit.gpgsign', 'false'])
    writeFileSync(join(repo, '.gitignore'), 'foo-ignore\n')
    mkdirSync(join(repo, 'src'), { recursive: true })
    mkdirSync(join(repo, 'docs'), { recursive: true })
    mkdirSync(join(repo, '.sillyspec'), { recursive: true })
    writeFileSync(join(repo, 'src', 'a.js'), 'export const alphaSym = 1\n// l2\n// l3\n')
    writeFileSync(join(repo, 'docs', 'x.md'), docWith(1))
    commitAll('c1: 1 失效')
    // origin/main ← c1（远端有 1 处失效）
    gitCli(repo, ['update-ref', 'refs/remotes/origin/main', gitCli(repo, ['rev-parse', 'HEAD'])])
    // 本地推进到 3 处失效（未推送）
    writeFileSync(join(repo, 'docs', 'x.md'), docWith(3))
    commitAll('c2: 3 失效')
  })
  afterEach(() => { try { gitCli(repo, ['worktree', 'prune']); } catch {} /* 残留注册随目录删除 */ try { rmSync(repo, { recursive: true, force: true }) } catch {} })

  it('current > baseline 且未劣于 origin/main 实测 → 放行 + 基线陈旧提示 + originCount', async () => {
    // origin/main ← c2（远端与本地同为 3）；基线 0 → current 3 > 0 触发实测 → 3 ≤ 3 放行
    gitCli(repo, ['update-ref', 'refs/remotes/origin/main', gitCli(repo, ['rev-parse', 'HEAD'])])
    writeBaseline(join(repo, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: repo, specBase: join(repo, '.sillyspec') })
    assert.equal(r.exitCode, 0)
    assert.equal(r.originCount, 3)
    assert.ok(r.message.includes('基线陈旧'), `提示含「基线陈旧」（实际：${r.message}）`)
    assert.ok(r.message.includes('origin/main 实测 3'))
    assert.ok(r.message.includes('--init-baseline 重锚'))
  })

  it('current > origin/main 实测（真增量）→ 拦 + 双参考值', async () => {
    // origin/main 保持 c1（1 失效）；本地 3 → 3 > 1 真增量劣于远端 → 拦
    writeBaseline(join(repo, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: repo, specBase: join(repo, '.sillyspec') })
    assert.equal(r.exitCode, 1)
    assert.equal(r.originCount, 1)
    assert.ok(r.message.includes('新增 3 处'), '原新增语义保留')
    assert.ok(r.message.includes('劣于 origin/main 实测 1 处'), `报远端参考值（实际：${r.message}）`)
  })

  it('实测后临时 worktree 清理干净（无注册残留）', async () => {
    gitCli(repo, ['update-ref', 'refs/remotes/origin/main', gitCli(repo, ['rev-parse', 'HEAD'])])
    writeBaseline(join(repo, '.sillyspec'), 0)
    await runDocsGate({ projectRoot: repo, specBase: join(repo, '.sillyspec') })
    const list = gitCli(repo, ['worktree', 'list', '--porcelain'])
    assert.equal((list.match(/^worktree /gm) || []).length, 1, `仅主 worktree 注册（实际：\n${list}）`)
  })

  it('无 origin ref → 回原拦（fail-open），originCount=null', async () => {
    gitCli(repo, ['update-ref', '-d', 'refs/remotes/origin/main'])
    writeBaseline(join(repo, '.sillyspec'), 0)
    const r = await runDocsGate({ projectRoot: repo, specBase: join(repo, '.sillyspec') })
    assert.equal(r.exitCode, 1)
    assert.equal(r.originCount, null)
    assert.ok(!r.message.includes('origin/main 实测'), '无远端参考值（未实测）')
    assert.ok(r.message.includes('新增 3 处'))
  })

  it('快路径（current ≤ baseline）零实测零行为变化', async () => {
    gitCli(repo, ['update-ref', 'refs/remotes/origin/main', gitCli(repo, ['rev-parse', 'HEAD'])])
    writeBaseline(join(repo, '.sillyspec'), 5)
    const r = await runDocsGate({ projectRoot: repo, specBase: join(repo, '.sillyspec') })
    assert.equal(r.exitCode, 0)
    assert.equal(r.originCount, null)
    assert.equal(r.message, evaluateRatchet({ current: 3, baseline: 5 }).message, '消息与纯判定逐字一致（原路）')
  })

  it('measureRemoteBaselineCount：无 git 仓 → originCount=null fail-open', async () => {
    const notGit = mkdtempSync(join(tmpdir(), 'docsgate-nogit-'))
    try {
      const m = await measureRemoteBaselineCount(notGit)
      assert.equal(m.originCount, null)
      assert.equal(m.ref, null)
    } finally { try { rmSync(notGit, { recursive: true, force: true }) } catch {} }
  })
})
