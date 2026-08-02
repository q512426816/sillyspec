/**
 * init 为 Claude Code 注入 CLAUDE.md：版本感知幂等三态四分支 + CRLF 兼容
 * 覆盖 design FR-01~FR-05（2026-08-02-init-claude-md）。
 * 直接单测导出的 injectClaudeInstructions，无需走 cmdInit 重依赖。
 */
import { injectClaudeInstructions, getVersion } from '../src/init.js'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import os from 'os'

let passed = 0
let failed = 0
const failures = []
function assert(condition, msg) {
  if (!condition) { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
  else { passed++; console.log(`  ✅ PASS: ${msg}`) }
}

const VER = getVersion()
const OLDV = '0.0.0-test' // 保证异于当前版本

function makeTempProject() {
  const root = join(os.tmpdir(), `sillyspec-claude-init-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  return root
}

// 捕获 console.error（升级提示走 stderr）
function withConsoleErrorSpy(fn) {
  const calls = []
  const orig = console.error
  console.error = (...args) => calls.push(args.join(' '))
  try { fn() } finally { console.error = orig }
  return calls
}

console.log('=== init Claude CLAUDE.md 注入：三态四分支 + CRLF ===\n')

// ── Case 1: 无文件 → 写完整模板（FR-01）──
console.log('--- Case 1: 无文件 → 写完整模板 + 顶部版本注释 ---')
{
  const root = makeTempProject()
  injectClaudeInstructions(root)
  const p = join(root, 'CLAUDE.md')
  assert(existsSync(p), 'CLAUDE.md 已生成')
  const content = readFileSync(p, 'utf8')
  assert(content.startsWith(`<!-- SillySpec v${VER} — `), '顶部版本注释')
  assert(content.includes('# Claude Code 指引'), '含模板标题')
  assert(content.includes('改代码前必须先说明依据'), '含核心规则（依据先行）')
  // FR-05 合规：不含个人/dogfood/multi-agent 内容
  assert(!content.includes('爸爸~爸爸~'), '不含 爸爸~爸爸~')
  assert(!content.includes('multi-agent-platform'), '不含 multi-agent-platform')
  assert(!content.includes('文件生命周期文档同步'), '不含文件生命周期段')
  assert(!content.includes('提示词文档同步'), '不含提示词同步段')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 2: 已存在无标记 → 追加受管段（FR-02）──
console.log('\n--- Case 2: 已存在无标记 → 追加受管段，原文保留 ---')
{
  const root = makeTempProject()
  const original = `# My Project\n\n自定义内容。\n`
  writeFileSync(join(root, 'CLAUDE.md'), original)
  injectClaudeInstructions(root)
  const content = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(content.startsWith('# My Project'), '原文保留在前')
  assert(content.includes('自定义内容'), '原文内容字节保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '追加态块开始标记')
  assert(content.includes('<!-- SillySpec END -->'), '追加态块结束标记')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 3: 同版本标记 → 跳过（FR-03，幂等，不写）──
console.log('\n--- Case 3: 同版本标记 → 不改写（内容 + mtime 不变）---')
{
  const root = makeTempProject()
  injectClaudeInstructions(root) // 首次写完整态
  const p = join(root, 'CLAUDE.md')
  const before = readFileSync(p, 'utf8')
  const beforeMtime = statSync(p).mtimeMs
  injectClaudeInstructions(root) // 同版本重跑
  const after = readFileSync(p, 'utf8')
  const afterMtime = statSync(p).mtimeMs
  assert(after === before, '同版本重跑内容不变')
  assert(afterMtime === beforeMtime, '同版本重跑 mtime 不变（未写文件）')
  assert(after.includes(`<!-- SillySpec v${VER}`), '版本标记仍存在')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 4a: 异版本追加态 → 块刷新（FR-04a，块外内容保留）──
console.log('\n--- Case 4a: 异版本追加态 → 受管块刷新，块外内容保留 ---')
{
  const root = makeTempProject()
  const head = `# My Project\n自定义头部\n`
  const tail = `\n尾部自定义\n`
  const oldBlock = `<!-- SillySpec v${OLDV} START — 旧 -->\n## SillySpec — 旧内容\n旧规则行\n<!-- SillySpec END -->`
  writeFileSync(join(root, 'CLAUDE.md'), head + oldBlock + tail)
  injectClaudeInstructions(root)
  const content = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(content.includes('自定义头部'), '块外前部内容保留')
  assert(content.includes('尾部自定义'), '块外后部内容保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '块升级为新版本标记')
  assert(!content.includes(`v${OLDV}`), '旧版本标记已替换')
  assert(!content.includes('旧规则行'), '旧块内容已被新受管段替换')
  assert(content.includes('<!-- SillySpec END -->'), '块结束标记保留')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 4b: 异版本完整态 → 不覆盖 + stderr 提示（FR-04b）──
console.log('\n--- Case 4b: 异版本完整态 → 不覆盖 + stderr 升级提示 ---')
{
  const root = makeTempProject()
  const fullOld = `<!-- SillySpec v${OLDV} — 由 sillyspec init 生成 -->\n# Claude Code 指引\n\n用户深度编辑过的内容\n`
  writeFileSync(join(root, 'CLAUDE.md'), fullOld)
  const before = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  const errs = withConsoleErrorSpy(() => injectClaudeInstructions(root))
  const after = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(after === before, '完整态升级不覆盖文件（保留用户改动）')
  assert(errs.some(e => e.includes(OLDV) && e.includes(VER) && e.includes('升级')), 'stderr 提示含旧→新版本')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 5: CRLF 文件兼容（FR-02 / 非功能-兼容性）──
console.log('\n--- Case 5: CRLF 已存在无标记 → 追加受管段兼容 ---')
{
  const root = makeTempProject()
  const original = '# My Project\r\n\r\nWindows CRLF content.\r\n'
  writeFileSync(join(root, 'CLAUDE.md'), original)
  let threw = false
  try { injectClaudeInstructions(root) } catch { threw = true }
  assert(!threw, 'CRLF 文件不抛错')
  const content = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(content.includes('# My Project'), 'CRLF 原文保留')
  assert(content.includes('Windows CRLF content'), 'CRLF 原文内容保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), 'CRLF 文件追加块标记成功')
  rmSync(root, { recursive: true, force: true })
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
