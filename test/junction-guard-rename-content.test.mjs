// 2026-11-04-junction-guard-rename-content——两护栏：跨仓错绑告警（FR-01）与 rename op
// 带内容（FR-02）。背景：2026-11-04 跨工作区污染事故（平台 workspace junction 错绑
// sillyspec 仓，CLI 忠实跟随零提示）+ 归档 rename 无内容被服务端 422 拒整批（5 连败）。

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { resolvePlatformSpecDir } = await import(pathToFileURL(join(root, 'src', 'progress.js')).href)
const { computeSpecOps } = await import(pathToFileURL(join(root, 'src', 'spec-sync.js')).href)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}
/** 捕获 console.warn 跑 fn，返回 warn 行拼接。 */
function captureWarn(fn) {
  const lines = []
  const orig = console.warn
  console.warn = (...a) => lines.push(a.join(' '))
  try { fn() } finally { console.warn = orig }
  return lines.join('\n')
}

// fixture 根避开系统 temp 目录（pointer specRoot 在 temp 下会触发既有的 temp 残留告警，
// 干扰跨仓告警断言）——用仓内 .runtime/test-fixture 沙箱。
const FIXTURE_ROOT = join(root, 'test', '.fixtures-jgr')

function mkRepo(name) {
  const d = join(FIXTURE_ROOT, name)
  rmSync(d, { recursive: true, force: true })
  mkdirSync(join(d, '.git'), { recursive: true })
  mkdirSync(join(d, '.sillyspec'), { recursive: true })
  return d
}

// ── FR-01：跨仓告警 / 三零告警 ──
console.log('\n=== T1: 跨仓错绑告警 ===')
{
  const repoA = mkRepo('a')
  const repoB = mkRepo('b')
  try {
    // 事故形态：仓 A 的 pointer 直接指向仓 B 的 .sillyspec（junction 已被 realpath 坍缩的等价形态）
    const pointer = join(repoA, '.sillyspec-platform.json')
    writeFileSync(pointer, JSON.stringify({ specRoot: join(repoB, '.sillyspec'), workspaceId: null }))
    let resolved = ''
    let warns = captureWarn(() => { resolved = resolvePlatformSpecDir(repoA) })
    ok(warns.includes('不同 git 仓'), `跨仓告警触发（实得 warn：${warns.slice(0, 60)}…）`)
    ok(warns.includes('junction') && warns.includes('pointer --cleanup'), '告警含修复指引')
    ok(resolved === join(repoB, '.sillyspec'), '返回值不受告警影响（不阻断）')

    // 同仓：pointer 指回本仓 .sillyspec
    writeFileSync(pointer, JSON.stringify({ specRoot: join(repoA, '.sillyspec') }))
    warns = captureWarn(() => resolvePlatformSpecDir(repoA))
    ok(!warns.includes('不同 git 仓'), '同仓零告警')

    // specRoot 无 .git（裸快照目录）——置系统 temp（无 .git 祖先；temp 指向警示文案不含断言词）
    const bare = join(tmpdir(), 'jgr-bare')
    rmSync(bare, { recursive: true, force: true })
    mkdirSync(bare, { recursive: true })
    writeFileSync(pointer, JSON.stringify({ specRoot: bare }))
    warns = captureWarn(() => resolvePlatformSpecDir(repoA))
    ok(!warns.includes('不同 git 仓'), 'specRoot 无 .git 零告警（gitRootOf 向上找不到 .git → 不比对）')
    rmSync(bare, { recursive: true, force: true })

    // 显式 specDir：早返回不经告警
    warns = captureWarn(() => resolvePlatformSpecDir(repoA, join(repoB, '.sillyspec')))
    ok(!warns.includes('不同 git 仓'), '显式 specDir 覆盖零告警（用户意志豁免）')
  } finally {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true })
  }
}

// ── FR-02：rename op 携带 content ──
console.log('\n=== T2: rename 带 base64 content ===')
{
  const content = '# 设计记录\n\n## 做法概述\n\n事故叙事正文。'
  const buf = Buffer.from(content, 'utf8')
  const local = [{ path: 'changes/archive/2026-11-04-x/design.md', hash: 'H1', mtime: 100, buf }]
  const server = { 'changes/2026-11-04-x/design.md': { hash: 'H1', version: 3, exists: true } }
  const ops = computeSpecOps(server, local)
  const ren = ops.find(o => o.op === 'rename')
  ok(ren, 'rename op 生成')
  ok(ren && Buffer.from(ren.content, 'base64').toString('utf8') === content, 'content 为新路径文件内容 base64（可解码还原）')
  ok(ren && ren.new_path === 'changes/archive/2026-11-04-x/design.md', 'new_path 不变')
  ok(ren && ren.base_version === 3, 'base_version 取旧行 version（零回归）')
  ok(ren && ren.path === 'changes/2026-11-04-x/design.md', 'path 为旧路径（形态不变）')
  // 源行缺失形态：另一工作区视角（server 无该路径任何行）+ 本地 archive 文件 → add 而非坏 rename
  const ops2 = computeSpecOps({}, local)
  ok(ops2.length === 1 && ops2[0].op === 'add' && ops2[0].content, '源行缺失且无匹配 hash 行 → add 带内容（不再产坏 rename）')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
