/**
 * init 注入 AGENTS.md（完整指引，版本感知幂等三态四分支）+ CLAUDE.md（@AGENTS.md 指针）。
 * 取代 2026-08-02-init-claude-md 的 CLAUDE.md 单文件方案（其 D-004 预留的 marker 迁移即此方案）。
 * 直接单测导出的 injectAgentsInstructions / injectClaudePointer，无需走 cmdInit 重依赖。
 */
import { injectAgentsInstructions, injectClaudePointer, getVersion } from '../src/init.js'
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
  const root = join(os.tmpdir(), `sillyspec-agents-init-${Date.now()}-${Math.random().toString(36).slice(2)}`)
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

console.log('=== init AGENTS.md 注入（三态四分支 + 旧段迁移）+ CLAUDE.md 指针 ===\n')

// ── Case 1: 无文件 → 写完整模板 ──
console.log('--- Case 1: AGENTS.md 无文件 → 写完整模板 + 顶部版本注释 ---')
{
  const root = makeTempProject()
  injectAgentsInstructions(root)
  const p = join(root, 'AGENTS.md')
  assert(existsSync(p), 'AGENTS.md 已生成')
  assert(!existsSync(join(root, 'CLAUDE.md')), '内容注入器不写 CLAUDE.md（指针由 injectClaudePointer 负责）')
  const content = readFileSync(p, 'utf8')
  assert(content.startsWith(`<!-- SillySpec v${VER} — `), '顶部版本注释')
  assert(content.includes('# Agent 指引'), '含模板标题（跨工具通用）')
  assert(content.includes('改代码前必须先说明依据'), '含核心规则（依据先行）')
  // 模板合规：不含个人/dogfood/multi-agent 内容（承 2026-08-02 方案 FR-05）
  assert(!content.includes('爸爸~爸爸~'), '不含 爸爸~爸爸~')
  assert(!content.includes('multi-agent-platform'), '不含 multi-agent-platform')
  assert(!content.includes('文件生命周期文档同步'), '不含文件生命周期段')
  assert(!content.includes('提示词文档同步'), '不含提示词同步段')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 2: 已存在无标记 → 追加受管段 ──
console.log('\n--- Case 2: AGENTS.md 已存在无标记 → 追加受管段，原文保留 ---')
{
  const root = makeTempProject()
  const original = `# My Project\n\n自定义内容。\n`
  writeFileSync(join(root, 'AGENTS.md'), original)
  injectAgentsInstructions(root)
  const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert(content.startsWith('# My Project'), '原文保留在前')
  assert(content.includes('自定义内容'), '原文内容字节保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '追加态块开始标记')
  assert(content.includes('<!-- SillySpec END -->'), '追加态块结束标记')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 3: 同版本标记 → 跳过（幂等，不写）──
console.log('\n--- Case 3: AGENTS.md 同版本标记 → 不改写（内容 + mtime 不变）---')
{
  const root = makeTempProject()
  injectAgentsInstructions(root) // 首次写完整态
  const p = join(root, 'AGENTS.md')
  const before = readFileSync(p, 'utf8')
  const beforeMtime = statSync(p).mtimeMs
  injectAgentsInstructions(root) // 同版本重跑
  const after = readFileSync(p, 'utf8')
  const afterMtime = statSync(p).mtimeMs
  assert(after === before, '同版本重跑内容不变')
  assert(afterMtime === beforeMtime, '同版本重跑 mtime 不变（未写文件）')
  assert(after.includes(`<!-- SillySpec v${VER}`), '版本标记仍存在')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 4a: 异版本追加态 → 块刷新（块外内容保留）──
console.log('\n--- Case 4a: AGENTS.md 异版本追加态 → 受管块刷新，块外内容保留 ---')
{
  const root = makeTempProject()
  const head = `# My Project\n自定义头部\n`
  const tail = `\n尾部自定义\n`
  const oldBlock = `<!-- SillySpec v${OLDV} START — 旧 -->\n## SillySpec — 旧内容\n旧规则行\n<!-- SillySpec END -->`
  writeFileSync(join(root, 'AGENTS.md'), head + oldBlock + tail)
  injectAgentsInstructions(root)
  const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert(content.includes('自定义头部'), '块外前部内容保留')
  assert(content.includes('尾部自定义'), '块外后部内容保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '块升级为新版本标记')
  assert(!content.includes(`v${OLDV}`), '旧版本标记已替换')
  assert(!content.includes('旧规则行'), '旧块内容已被新受管段替换')
  assert(content.includes('<!-- SillySpec END -->'), '块结束标记保留')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 4b: 异版本完整态 → 不覆盖 + stderr 提示 ──
console.log('\n--- Case 4b: AGENTS.md 异版本完整态 → 不覆盖 + stderr 升级提示 ---')
{
  const root = makeTempProject()
  const fullOld = `<!-- SillySpec v${OLDV} — 由 sillyspec init 生成 -->\n# Agent 指引\n\n用户深度编辑过的内容\n`
  writeFileSync(join(root, 'AGENTS.md'), fullOld)
  const before = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  const errs = withConsoleErrorSpy(() => injectAgentsInstructions(root))
  const after = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert(after === before, '完整态升级不覆盖文件（保留用户改动）')
  assert(errs.some(e => e.includes(OLDV) && e.includes(VER) && e.includes('升级')), 'stderr 提示含旧→新版本')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 5: CRLF 文件兼容 ──
console.log('\n--- Case 5: AGENTS.md CRLF 已存在无标记 → 追加受管段兼容 ---')
{
  const root = makeTempProject()
  const original = '# My Project\r\n\r\nWindows CRLF content.\r\n'
  writeFileSync(join(root, 'AGENTS.md'), original)
  let threw = false
  try { injectAgentsInstructions(root) } catch { threw = true }
  assert(!threw, 'CRLF 文件不抛错')
  const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert(content.includes('# My Project'), 'CRLF 原文保留')
  assert(content.includes('Windows CRLF content'), 'CRLF 原文内容保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), 'CRLF 文件追加块标记成功')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 6: 旧 ## SillySpec 小段（codex 老安装）→ 迁移为新受管段 ──
console.log('\n--- Case 6: AGENTS.md 含旧 ## SillySpec 段 → 迁移替换，不双段 ---')
{
  const root = makeTempProject()
  // 复刻 codex 老方案产物：用户内容 + injectInstructions 在 EOF 追加的小段
  const legacy = `# My Project\n\n自己的规范说明。\n\n## SillySpec — 规范驱动开发\n\n在执行开发任务时，遵循以下规范：\n\n### 代码规范\n- 写代码前先读取 \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\`（代码风格）和 \`.sillyspec/docs/<project>/scan/ARCHITECTURE.md\`（架构）\n- 调用已有方法前，用 grep 确认方法存在，不许编造\n- 遵循 \`.sillyspec/docs/<project>/scan/CONVENTIONS.md\` 中的代码风格\n\n### 工作流程\n- 读取 sillyspec.db 确认当前阶段（使用 \`sillyspec progress show\`）\n- 各阶段产出文件位于 \`.sillyspec/changes/<变更名>/\` 下\n`
  writeFileSync(join(root, 'AGENTS.md'), legacy)
  injectAgentsInstructions(root)
  const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert(content.startsWith('# My Project'), '用户内容保留在前')
  assert(content.includes('自己的规范说明'), '用户内容字节保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '新受管段已追加')
  const headingCount = (content.match(/^## SillySpec — 规范驱动开发$/gm) || []).length
  assert(headingCount === 1, `旧小段标题恰保留 1 份（迁移非叠加，got ${headingCount}）`)
  assert(content.includes('读取 sillyspec.db'), '受管段内容在（新块内）')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 6b: 旧段被编辑过/CRLF 漂移（精确匹配失败）→ 标题截除回退 ──
console.log('\n--- Case 6b: 旧段 CRLF 漂移 → 按标题截除回退，仍不双段 ---')
{
  const root = makeTempProject()
  const legacy = '# My Project\r\n\r\n自己的规范说明。\r\n\r\n## SillySpec — 规范驱动开发\r\n\r\n旧段正文（被编辑过）\r\n'
  writeFileSync(join(root, 'AGENTS.md'), legacy)
  injectAgentsInstructions(root)
  const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
  assert(content.includes('自己的规范说明'), '用户内容保留')
  assert(!content.includes('旧段正文（被编辑过）'), '旧段内容（CRLF 漂移态）已截除')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '新受管段已追加')
  rmSync(root, { recursive: true, force: true })
}

// ══ CLAUDE.md 指针（injectClaudePointer）══

// ── Case 7: 无文件 → 写指针文件 ──
console.log('\n--- Case 7: CLAUDE.md 无文件 → 写 @AGENTS.md 指针文件 ---')
{
  const root = makeTempProject()
  injectClaudePointer(root)
  const p = join(root, 'CLAUDE.md')
  assert(existsSync(p), 'CLAUDE.md 指针已生成')
  const content = readFileSync(p, 'utf8')
  assert(content.startsWith(`<!-- SillySpec v${VER} — `), '顶部版本注释')
  assert(content.includes('@AGENTS.md'), '含 @AGENTS.md 导入行（Claude Code 记忆导入语法）')
  assert(!content.includes('# Agent 指引'), '指针不承载完整模板内容（单源在 AGENTS.md）')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 8: 用户自有文件 → 追加受管指针块 ──
console.log('\n--- Case 8: CLAUDE.md 用户自有文件 → 追加受管指针块，原文保留 ---')
{
  const root = makeTempProject()
  writeFileSync(join(root, 'CLAUDE.md'), `# My Rules\n\n自己的规矩。\n`)
  injectClaudePointer(root)
  const content = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(content.startsWith('# My Rules'), '原文保留在前')
  assert(content.includes('自己的规矩'), '原文内容字节保留')
  assert(content.includes(`<!-- SillySpec v${VER} START`), '受管指针块开始标记')
  assert(content.includes('@AGENTS.md'), '受管指针块含 @AGENTS.md 导入行')
  assert(content.includes('<!-- SillySpec END -->'), '受管指针块结束标记')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 9: 指针态同版本 → 幂等（不写）──
console.log('\n--- Case 9: CLAUDE.md 指针同版本 → 不改写（内容 + mtime 不变）---')
{
  const root = makeTempProject()
  injectClaudePointer(root)
  const p = join(root, 'CLAUDE.md')
  const before = readFileSync(p, 'utf8')
  const beforeMtime = statSync(p).mtimeMs
  injectClaudePointer(root)
  const after = readFileSync(p, 'utf8')
  assert(after === before, '同版本重跑内容不变')
  assert(statSync(p).mtimeMs === beforeMtime, '同版本重跑 mtime 不变（未写文件）')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 10: 指针态异版本 → 刷新标记版本号 ──
console.log('\n--- Case 10: CLAUDE.md 指针异版本 → 标记版本号刷新 ---')
{
  const root = makeTempProject()
  writeFileSync(join(root, 'CLAUDE.md'), `<!-- SillySpec v${OLDV} — CLAUDE.md 指针：内容统一维护在 AGENTS.md（@ 导入），可自由编辑 -->\n\n@AGENTS.md\n`)
  injectClaudePointer(root)
  const content = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(!content.includes(`v${OLDV}`), '旧版本标记已刷新')
  assert(content.includes(`<!-- SillySpec v${VER}`), '新版本标记在')
  assert(content.includes('@AGENTS.md'), '@AGENTS.md 导入行保留')
  rmSync(root, { recursive: true, force: true })
}

// ── Case 11: 旧完整态（2026-08-02 方案产物）→ 不动 + stderr 迁移提示 ──
console.log('\n--- Case 11: CLAUDE.md 旧完整态 → 不覆盖 + stderr 迁移提示 ---')
{
  const root = makeTempProject()
  const fullOld = `<!-- SillySpec v${OLDV} — 由 sillyspec init 生成，可自由编辑；重跑 init 同版本不更新 -->\n# Claude Code 指引\n\n用户深度编辑过的完整指引\n`
  writeFileSync(join(root, 'CLAUDE.md'), fullOld)
  const before = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  const errs = withConsoleErrorSpy(() => injectClaudePointer(root))
  const after = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
  assert(after === before, '旧完整态不覆盖文件（保留用户改动）')
  assert(errs.some(e => e.includes('AGENTS.md') && e.includes('迁移')), 'stderr 提示迁移到 AGENTS.md 单源')
  rmSync(root, { recursive: true, force: true })
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
