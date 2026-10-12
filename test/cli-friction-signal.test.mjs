/**
 * cli-friction-signal.test.mjs — 报错自足 + 子仓精确指路（2026-10-12-cli-friction-signal）
 *
 * 验收面：
 *   ① deps 门控阻断文案一次给全（源锚钉死，同 input-format-copy 先例——纯文案面）：
 *      主仓与跨仓两分支均含 meta.json 路径行 / depsError 尾部 200 截断 / 勿手改警告；
 *      跨仓分支含 doctor --fix 正规逃生口行；
 *   ② 哨兵拒收文案扫描面声明 + 跨仓指引两行在场（源锚）；
 *   ③ registerRepoInLocalYaml 跨仓标记：写入 <仓根>/.git/sillyspec-crossrepo.json
 *      （workspace 正斜杠/key/registeredAt）+ 幂等重注册补标记 + .git 非目录跳过零抛；
 *   ④ resolveUninitCwdGate：标记在场 block 态返回 crossRepo；损坏标记按无标记；
 *   ⑤ CLI 级双态：带标记子仓跑非豁免命令 exit 2 + 精确指路两行；无标记输出与现状一致
 *      （不含「已登记为 SillySpec 工作区」字样）。
 * dogfood 驱动（fire-equipment 复盘）：deps 首条阻断无明细+agent 两次手改 meta.json 过门；
 * 哨兵不声明扫描面；三连「CLI 跑错目录」靠人工发现。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { registerRepoInLocalYaml } from '../src/local-register.js'
import { resolveUninitCwdGate } from '../src/run/shared.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

const read = (p) => readFileSync(join(ROOT, p), 'utf8')

test('FR-01 源锚：deps 阻断两分支一次给全（meta 路径/尾部截断/勿手改/逃生口）', () => {
  const src = read('src/run/gates.js')
  // 两分支共有的三要素 + 防手改
  assert.ok((src.match(/勿手改——doctor 以实态校正/g) || []).length >= 2, '两分支各有勿手改警告')
  assert.ok((src.match(/状态文件：\$\{join/g) || []).length >= 2, '两分支各有 meta.json 路径行')
  assert.match(src, /尾部 ≤200 字符/) // depsError 尾部截断（两分支同款）
  // 跨仓分支专属：正规逃生口行
  assert.match(src, /正规逃生口：sillyspec worktree doctor --fix（按实态重供并回写 meta\.json）/)
  // 判定语义零变化锚：放行集合与 exit(1) 原样
  assert.match(src, /!\['linked', 'installed', 'n\/a'\]\.includes\(cm\.depsStatus\)/)
})

test('FR-02 源锚：哨兵拒收声明证据扫描面 + 跨仓指引', () => {
  const src = read('src/flow.js')
  assert.match(src, /证据扫描面：工作区仓 git log /)
  assert.match(src, /跨仓仓（register-repo 登记的外部仓）的提交不在扫描面/)
  // 既有 token 形态说明行仍在（其后追加非替换）
  assert.match(src, /「task-01\.\.task-05」区间写法不认；或产 review\.json）或取消勾选后重跑/)
})

test('FR-03 标记写入：.git/sillyspec-crossrepo.json + 幂等补标记 + 非 git 目录跳过', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'cfs-ws-'))
  const repo = mkdtempSync(join(tmpdir(), 'cfs-repo-'))
  try {
    mkdirSync(join(ws, '.sillyspec'), { recursive: true })
    mkdirSync(join(repo, '.git'), { recursive: true }) // 模拟 git 仓（.git 为目录）
    const yamlPath = join(ws, '.sillyspec', 'local.yaml')
    await registerRepoInLocalYaml(yamlPath, 'subgrid', repo)
    const markerPath = join(repo, '.git', 'sillyspec-crossrepo.json')
    const m = JSON.parse(readFileSync(markerPath, 'utf8'))
    assert.equal(m.key, 'subgrid')
    assert.ok(m.workspace.endsWith('.sillyspec/..') === false) // workspace 是工作区根（.sillyspec 父目录）正斜杠
    assert.ok(!m.workspace.includes('\\'))
    assert.ok(m.registeredAt)
    // 幂等重注册补标记（删除标记后重注册可恢复）
    rmSync(markerPath)
    await registerRepoInLocalYaml(yamlPath, 'subgrid', repo)
    assert.ok(readFileSync(markerPath, 'utf8').includes('"subgrid"'))
    // 非 git 目录（无 .git）：跳过零抛
    const plain = mkdtempSync(join(tmpdir(), 'cfs-plain-'))
    try {
      await registerRepoInLocalYaml(yamlPath, 'plainrepo', plain)
      assert.ok(!exists(join(plain, '.git')))
    } finally { rmSync(plain, { recursive: true, force: true }) }
  } finally { rmSync(ws, { recursive: true, force: true }); rmSync(repo, { recursive: true, force: true }) }
})

test('FR-04 resolveUninitCwdGate：标记在场返回 crossRepo；损坏按无标记', () => {
  const repo = mkdtempSync(join(tmpdir(), 'cfs-gate-'))
  try {
    const g = (args) => {
      const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
      if (r.status !== 0) throw new Error(r.stderr)
    }
    g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
    writeFileSync(join(repo, 'f.txt'), 'x\n'); g(['add', '.']); g(['commit', '-q', '-m', 'i'])
    const marker = join(repo, '.git', 'sillyspec-crossrepo.json')
    // 无标记：block 无 crossRepo 字段
    const plain = resolveUninitCwdGate('flow', { dir: repo })
    assert.equal(plain.verdict, 'block')
    assert.equal(plain.crossRepo, undefined)
    // 标记在场：返回 crossRepo
    writeFileSync(marker, JSON.stringify({ workspace: 'X:/ws', key: 'urgent', registeredAt: '2026-10-12T00:00:00Z' }))
    const hit = resolveUninitCwdGate('flow', { dir: repo })
    assert.equal(hit.verdict, 'block')
    assert.deepEqual(hit.crossRepo, { workspace: 'X:/ws', key: 'urgent' })
    // 损坏标记：按无标记
    writeFileSync(marker, '{broken')
    const broken = resolveUninitCwdGate('flow', { dir: repo })
    assert.equal(broken.crossRepo, undefined)
  } finally { rmSync(repo, { recursive: true, force: true }) }
})

test('FR-05 CLI 级：带标记子仓精确指路 / 无标记零变化', () => {
  const mkRepo = () => {
    const repo = mkdtempSync(join(tmpdir(), 'cfs-cli-'))
    const g = (args) => {
      const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
      if (r.status !== 0) throw new Error(r.stderr)
    }
    g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
    writeFileSync(join(repo, 'f.txt'), 'x\n'); g(['add', '.']); g(['commit', '-q', '-m', 'i'])
    return repo
  }
  const run = (cwd) => spawnSync(process.execPath, [CLI, 'flow', 'status', '--change', 'x'], {
    cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
  const withMarker = mkRepo()
  const noMarker = mkRepo()
  try {
    writeFileSync(join(withMarker, '.git', 'sillyspec-crossrepo.json'), JSON.stringify({ workspace: 'W:/my/workspace', key: 'subgrid', registeredAt: '2026-10-12T00:00:00Z' }))
    const hit = run(withMarker)
    assert.equal(hit.status, 2)
    assert.match(hit.stderr, /已登记为 SillySpec 工作区的跨仓「subgrid」/)
    assert.match(hit.stderr, /W:\/my\/workspace/)
    assert.match(hit.stderr, /--dir "W:\/my\/workspace"/)
    // 无标记：与现状一致（不含指路段）
    const plain = run(noMarker)
    assert.equal(plain.status, 2)
    assert.ok(!plain.stderr.includes('已登记为 SillySpec 工作区'))
    assert.match(plain.stderr, /当前目录未初始化/)
  } finally { rmSync(withMarker, { recursive: true, force: true }); rmSync(noMarker, { recursive: true, force: true }) }
})

function exists(p) { try { readFileSync(p); return true } catch { return false } }
