/**
 * config-cat 测试 — `sillyspec config cat` 的 local.yaml 真实路径解析（2026-08-21 root-local-yaml 治理）。
 *
 * 覆盖：
 * 1. 直接命中：<dir>/.sillyspec/local.yaml（cwd 祖先链来源）。
 * 2. specBase 优先：显式 spec 根候选排在祖先链之前。
 * 3. 根目录 local.yaml 永不命中——候选链不含 <dir>/local.yaml（项目根没有这个文件）。
 * 4. sillyspec 标准布局 worktree（挂在 <主仓>/.sillyspec/.runtime/worktrees/ 下）：worktree 的
 *    .sillyspec 是 checkout 副本无 local.yaml（gitignored）→ 祖先链向上命中主仓（真实 git worktree add）。
 * 5. 外置 linked worktree（用户手动 git worktree add 到任意位置）→ git common-dir 兜底命中主仓。
 * 6. CLI 集成：cat / cat --json / 未找到退出码 / worktree cwd 下解析到主仓。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { tmpdir } from 'os'

import { resolveLocalYaml } from '../src/config-cat.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const binPath = join(testDir, '..', 'bin', 'sillyspec.js')

let failed = 0
let total = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

function sh(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

// ── fixture：真实 git 仓 + 主仓 .sillyspec/local.yaml + 两种布局的 linked worktree ──
const base = mkdtempSync(join(tmpdir(), 'sillyspec-configcat-'))
const main = join(base, 'main')
const YAML = 'mcp:\n  url: http://hub.local\n  token: secret\n'
try {
  mkdirSync(join(main, '.sillyspec'), { recursive: true })
  writeFileSync(join(main, '.sillyspec', 'local.yaml'), YAML)
  writeFileSync(join(main, '.gitignore'), '.sillyspec/local.yaml\n')
  sh(['init', '-q'], main)
  sh(['config', 'user.email', 't@t.local'], main)
  sh(['config', 'user.name', 't'], main)
  writeFileSync(join(main, 'README.md'), 'x\n')
  sh(['add', '.'], main)
  sh(['commit', '-qm', 'init'], main)
  // sillyspec 标准布局：worktree 挂主仓 .sillyspec/.runtime/worktrees/ 下
  const stdWt = join(main, '.sillyspec', '.runtime', 'worktrees', 'demo-change')
  sh(['worktree', 'add', '-q', stdWt, '-b', 'demo-change'], main)
  // 外置布局：用户手动挂到任意位置（主仓的兄弟目录，祖先链不可达，只能靠 git 兜底）
  const extWt = join(base, 'external-wt')
  sh(['worktree', 'add', '-q', extWt, '-b', 'external'], main)

  // ── 1. 直接命中 ──
  console.log('\n--- 1. 主仓直接命中 ---')
  {
    const r = resolveLocalYaml(main)
    assert(r.exists === true, '主仓内命中 local.yaml')
    assert(r.path === join(main, '.sillyspec', 'local.yaml'), `路径=<主仓>/.sillyspec/local.yaml（实际 ${r.path}）`)
    assert(typeof r.source === 'string' && r.source.length > 0, 'source 非空')
  }

  // ── 2. specBase 优先 ──
  console.log('\n--- 2. specBase 候选最先 ---')
  {
    const other = join(base, 'other-spec')
    mkdirSync(other, { recursive: true })
    writeFileSync(join(other, 'local.yaml'), 'x: 1\n')
    const r = resolveLocalYaml(main, { specBase: other })
    assert(r.exists === true && r.path === join(other, 'local.yaml'), 'specBase 候选最先命中')
    assert(r.source.includes('spec 根'), 'source 标注 spec 根')
  }

  // ── 3. 根目录 local.yaml 永不命中 ──
  console.log('\n--- 3. 根级 local.yaml 不进候选链 ---')
  {
    const rootOnly = join(base, 'rootonly')
    mkdirSync(rootOnly, { recursive: true })
    writeFileSync(join(rootOnly, 'local.yaml'), 'legacy: 1\n')
    const r = resolveLocalYaml(rootOnly)
    assert(r.exists === false, '只有根级 local.yaml 时 exists=false')
    assert(!r.searched.some(p => p === join(rootOnly, 'local.yaml')), 'searched 不含根级 local.yaml')
  }

  // ── 4. 标准布局 worktree：祖先链命中主仓 ──
  console.log('\n--- 4. worktree（sillyspec 标准布局）→ 主仓 ---')
  {
    const r = resolveLocalYaml(stdWt)
    assert(r.exists === true, 'worktree 内命中（local.yaml 不随 checkout 出现）')
    assert(r.path === join(main, '.sillyspec', 'local.yaml'), `解析到主仓配置（实际 ${r.path}）`)
  }

  // ── 5. 外置 worktree：git common-dir 兜底 ──
  console.log('\n--- 5. 外置 worktree → git 兜底主仓 ---')
  {
    const r = resolveLocalYaml(extWt)
    assert(r.exists === true, '外置 worktree 内命中')
    assert(r.path === join(main, '.sillyspec', 'local.yaml'), `git 兜底解析到主仓（实际 ${r.path}）`)
    assert(r.source.includes('git common-dir'), 'source 标注 git 兜底')
  }

  // ── 6. CLI 集成 ──
  console.log('\n--- 6. CLI 集成（sillyspec config cat …） ---')
  function runCli(args, cwd) {
    try {
      const out = execFileSync(process.execPath, [binPath, 'config', ...args], {
        cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60_000,
      })
      return { code: 0, out }
    } catch (e) {
      return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }
    }
  }
  {
    const r = runCli(['cat'], main)
    assert(r.code === 0, `主仓 config cat 退出 0（实际 ${r.code}）`)
    assert(r.out.includes(join(main, '.sillyspec', 'local.yaml')), 'cat 输出真实路径')
    assert(r.out.includes('http://hub.local'), 'cat 输出文件内容')
  }
  {
    const r = runCli(['cat'], stdWt)
    assert(r.code === 0, `worktree cwd config cat 退出 0（实际 ${r.code}）`)
    assert(r.out.includes(join(main, '.sillyspec', 'local.yaml')), 'worktree cwd 下解析到主仓配置')
  }
  {
    const r = runCli(['cat', '--json'], main)
    let parsed = null
    try { parsed = JSON.parse(r.out) } catch {}
    assert(parsed !== null && parsed.exists === true, 'cat --json 输出合法 JSON 且 exists=true')
    assert(parsed !== null && String(parsed.content || '').includes('secret'), 'cat --json 含 content')
  }
  {
    const empty = join(base, 'empty')
    mkdirSync(empty, { recursive: true })
    const r = runCli(['cat'], empty)
    assert(r.code === 1, `无 local.yaml 时退出 1（实际 ${r.code}）`)
    assert(r.out.includes('未找到'), '未找到提示可见')
    assert(r.out.includes('.sillyspec'), '提示含 .sillyspec 指路')
  }
} finally {
  // git worktree 持有主仓 .git 锁文件句柄，Windows 下先 prune 释放再删
  try { sh(['worktree', 'remove', '--force', join(base, 'external-wt')], main) } catch {}
  try { sh(['worktree', 'remove', '--force', join(main, '.sillyspec', '.runtime', 'worktrees', 'demo-change')], main) } catch {}
  try { rmSync(base, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
