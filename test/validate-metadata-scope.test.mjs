/**
 * validateMetadata 按变更隔离（2026-09-14 quick，用户反馈③）。
 * 场景：阶段收尾元数据告警曾整仓扫描 changes/，并行会话的其他活跃变更文件逐条混入
 * 本变更收尾输出、易误读为本变更缺产物。锁定三点：
 *   1. 带 changeName：本变更目录的缺元数据文件逐条列出；其他变更目录折叠为一行
 *      汇总（目录名×计数，含 total），不再逐条混入。
 *   2. changeName 缺省（历史调用面）：全量逐列不折叠（行为不回退）。
 *   3. 无命中零输出（frontmatter 齐全 / mtime 超 10 分钟窗的旧文件均不命中）。
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateMetadata } from '../src/run/gates.js'
import { runCapturing, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const norm = (s) => s.split('\\').join('/')

function buildFixture() {
  const root = mkdtempSync(join(tmpdir(), 'vm-scope-')); tmpRoots.push(root)
  const specBase = join(root, '.sillyspec')
  // 本变更：a.md 双 key 全缺（近 10 分钟新建 → 命中）
  mkdirSync(join(specBase, 'changes', 'cur-change'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'cur-change', 'a.md'), '# 无 frontmatter\n')
  // 他变更（并行会话）：b.md 双缺、c.yaml 仅缺 author（原双 push 经 Set 去重计 1 个文件）
  mkdirSync(join(specBase, 'changes', 'other-session'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'other-session', 'b.md'), '# 别人的\n')
  writeFileSync(join(specBase, 'changes', 'other-session', 'c.yaml'), 'created_at: 2026-09-14T00:00:00\n')
  // 噪音对照 1：本变更 frontmatter 齐全（含嵌套子目录）→ 不命中
  mkdirSync(join(specBase, 'changes', 'cur-change', 'nested'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'cur-change', 'nested', 'ok.md'), '---\nauthor: t\ncreated_at: 2026-09-14T00:00:00\n---\n# ok\n')
  // 噪音对照 2：mtime 超 10 分钟窗（2 小时前）→ 不命中
  const stale = join(specBase, 'changes', 'cur-change', 'stale.md')
  writeFileSync(stale, '# 旧文件无 frontmatter\n')
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000)
  utimesSync(stale, old, old)
  return { cwd: root, specBase }
}

console.log('\n=== 1. 带 changeName：本变更逐列 + 他变更折叠一行汇总 ===\n')
{
  const { cwd, specBase } = buildFixture()
  const r = await runCapturing(() => validateMetadata(cwd, 'plan', specBase, 'cur-change'))
  const out = norm(r.stdout)
  assert(out.includes('缺少 author 或 created_at 元数据'), '本变更缺元数据 → ⚠️ 块标题在')
  assert(out.includes('.sillyspec/changes/cur-change/a.md'), '本变更 a.md 逐条列出（相对 cwd 路径）')
  assert(out.includes('nested/ok.md') === false && out.includes('stale.md') === false, 'frontmatter 齐全 / 超窗旧文件不命中')
  assert(out.includes('other-session/b.md') === false && out.includes('other-session/c.yaml') === false,
    '他变更文件不逐条混入（反馈③主诉）')
  assert(out.includes('另有 2 个其他变更目录') && out.includes('other-session×2'),
    '他变更折叠为一行汇总（总数 + 目录名×计数）')
  assert(out.includes('已按变更隔离折叠'), '汇总行自带处置提示（并行会话忽略 / 同批包补录）')
}

console.log('\n=== 2. changeName 缺省：历史全量逐列（行为不回退）===\n')
{
  const { cwd, specBase } = buildFixture()
  const r = await runCapturing(() => validateMetadata(cwd, 'plan', specBase, undefined))
  const out = norm(r.stdout)
  assert(out.includes('cur-change/a.md') && out.includes('other-session/b.md') && out.includes('other-session/c.yaml'),
    '无 changeName → 全部命中文件逐条列出')
  assert(out.includes('已按变更隔离折叠') === false, '无折叠汇总行')
}

console.log('\n=== 3. 无命中 → 零输出 ===\n')
{
  const root = mkdtempSync(join(tmpdir(), 'vm-clean-')); tmpRoots.push(root)
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'solo'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'solo', 'fine.md'), '---\nauthor: t\ncreated_at: 2026-09-14T00:00:00\n---\n# fine\n')
  const r = await runCapturing(() => validateMetadata(root, 'plan', specBase, 'solo'))
  assert(r.stdout.trim() === '', '全齐 → 零输出')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
report(count.passed, count.failed, count.failures)
