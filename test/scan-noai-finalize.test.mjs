/**
 * scan-noai-finalize.test.mjs — ① noAI 化步骤 + ② frontmatter CLI 盖章测试（2026-09-05）
 *
 * 覆盖：注册表形态（步骤 1/4/11 noAI + 空 prompt + 步数 11 不变）/ 子项目探测只建议不注册（红线）/
 * 断点续扫 CLI 输出 / stampScanDocHeaders 补缺不覆盖 + 幂等 + quick 档 scan_depth + 非 git 仓降级 /
 * executeScanFinalize 本地模式盖章+清理+不抛 / 平台模式缺文档 throw（step 保持 pending 契约）。
 */

import { join, resolve, dirname, basename } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const { definition } = await import(pathToFileURL(join(root, 'src', 'stages', 'scan.js')).href)
const { stampScanDocHeaders } = await import(pathToFileURL(join(root, 'src', 'scan-postcheck.js')).href)
const { executeScanDetectProjects, executeScanResumeCheck, executeScanFinalize } = await import(pathToFileURL(join(root, 'src', 'run', 'scan-profile.js')).href)

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}
function setup(name) {
  const cwd = join(tmpdir(), `noai-${name}`)
  try { rmSync(cwd, { recursive: true, force: true }) } catch {}
  mkdirSync(cwd, { recursive: true })
  return cwd
}
function clean(d) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
const QUIET = { log: () => {}, warn: () => {}, error: () => {} }

// ── 1: 注册表形态 ──
console.log('\n=== Test 1: 步骤 1/4/11 noAI 化，步数不变 ===')
{
  const steps = definition.steps
  assert(steps.length === 11, `注册表仍为 11 步（实际 ${steps.length}）`)
  const s1 = steps.find(s => s.name === '探测项目结构并建议子项目')
  assert(s1.noAI === true && s1._cliAction === 'scanDetectProjects' && s1.prompt === '', '步骤 1 noAI + scanDetectProjects + 空 prompt')
  const s4 = steps.find(s => s.name === '断点续扫检测')
  assert(s4.noAI === true && s4._cliAction === 'scanResumeCheck' && s4.perProject !== true, '步骤 4 noAI + 非 perProject')
  const s11 = steps.find(s => s.name === '自检和提交')
  assert(s11.noAI === true && s11._cliAction === 'scanFinalize' && s11.prompt === '', '步骤 11 noAI + scanFinalize')
  const s2 = steps.find(s => s.name === '构建扫描项目列表')
  assert(!s2.noAI, '步骤 2（用户交互）保持 agent 步骤')
}

// ── 2: 子项目探测——只建议不注册 ──
console.log('\n=== Test 2: 探测只建议不注册（红线） ===')
{
  const cwd = setup('t2')
  mkdirSync(join(cwd, 'backend'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'pyproject.toml'), '[project]\nname="b"\n')
  mkdirSync(join(cwd, 'node_modules', 'x'), { recursive: true }) // 必须被跳过
  writeFileSync(join(cwd, 'node_modules', 'x', 'package.json'), '{}')
  const orig = console.log; console.log = () => {}
  try { await executeScanDetectProjects(cwd, {}) } finally { console.log = orig }
  assert(!existsSync(join(cwd, '.sillyspec', 'projects')), '未创建任何 projects 配置（只建议）')
  clean(cwd)
}

// ── 3: 断点续扫检测输出（不抛） ──
console.log('\n=== Test 3: 断点续扫 CLI 检测 ===')
{
  const cwd = setup('t3')
  const specBase = join(cwd, '.sillyspec')
  mkdirSync(join(specBase, 'projects'), { recursive: true })
  writeFileSync(join(specBase, 'projects', 'demo.yaml'), 'name: demo\n')
  mkdirSync(join(specBase, 'docs', 'demo', 'scan'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'demo', 'scan', 'PROJECT.md'), '# x\n')
  const orig = console.log; console.log = () => {}
  try { await executeScanResumeCheck(cwd, {}) } finally { console.log = orig }
  assert(true, '已注册项目遍历执行无异常')
  clean(cwd)
}

// ── 4: stampScanDocHeaders 补缺不覆盖 + 幂等 + quick ──
console.log('\n=== Test 4: frontmatter CLI 盖章 ===')
{
  const cwd = setup('t4')
  const scanDir = join(cwd, '.sillyspec', 'docs', basename(cwd), 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'A.md'), '# 架构（Architecture）\n\n正文\n')
  writeFileSync(join(scanDir, 'B.md'), '---\nauthor: qinyi\nsource_commit: abc1234\n---\n\n# 旧文档\n')

  const r1 = stampScanDocHeaders({ cwd, specDir: null, mode: 'quick' })
  const a = readFileSync(join(scanDir, 'A.md'), 'utf8')
  assert(a.startsWith('---\n') && a.includes('author:') && a.includes('created_at:') && a.includes('updated_at:') && a.includes('generator: sillyspec-scan') && a.includes('scan_depth: quick'), 'A.md 无 frontmatter → 全键注入（含 scan_depth: quick）')
  assert(!a.includes('source_commit:'), '非 git 环境 → source_commit 省略不造假')
  assert(a.includes('# 架构（Architecture）'), '正文保留')
  const b = readFileSync(join(scanDir, 'B.md'), 'utf8')
  assert(b.includes('author: qinyi') && b.includes('source_commit: abc1234'), '已有键不覆盖（溯源保留）')
  assert(b.includes('created_at:') && b.includes('updated_at:'), '缺失键补齐')

  const r2 = stampScanDocHeaders({ cwd, specDir: null, mode: 'quick' })
  assert(r2.fixed.length === 0 && r2.stampedKeys === 0, `幂等——二跑零改写（fixed=${r2.fixed.length}）`)
  assert(r1.fixed.length === 2, `首跑改写 2 份（实际 ${r1.fixed.length}）`)
  clean(cwd)
}

// ── 5: executeScanFinalize 本地模式——盖章+清理+放行 ──
console.log('\n=== Test 5: 终检本地模式 ===')
{
  const cwd = setup('t5')
  const scanDir = join(cwd, '.sillyspec', 'docs', basename(cwd), 'scan')
  mkdirSync(scanDir, { recursive: true })
  for (const d of ['ARCHITECTURE.md','CONVENTIONS.md','STRUCTURE.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md','PROJECT.md']) {
    writeFileSync(join(scanDir, d), `# ${d}\n\n正文见 \`src/foo.js:1\`。\n`)
  }
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'foo.js'), 'const x = 1\n')
  writeFileSync(join(scanDir, '_env-detect.md'), 'temp\n')
  mkdirSync(join(cwd, '.sillyspec', 'knowledge'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'knowledge', 'INDEX.md'), '# idx\n')
  const orig = console.log; console.log = () => {}
  let threw = null
  try { await executeScanFinalize(cwd, {}) } catch (e) { threw = e }
  finally { console.log = orig }
  assert(threw === null, `文档齐全 → 不抛（实际 ${threw && threw.message}）`)
  assert(!existsSync(join(scanDir, '_env-detect.md')), '_env-detect.md 已清理')
  assert(readFileSync(join(scanDir, 'PROJECT.md'), 'utf8').includes('generator: sillyspec-scan'), 'frontmatter 已盖章')
  clean(cwd)
}

// ── 6: executeScanFinalize 平台模式缺文档 → 只报告不拦截（manifest 契约在阶段完成路径） ──
console.log('\n=== Test 6: 终检平台模式不拦截 ===')
{
  const cwd = setup('t6')
  const specDir = join(tmpdir(), `noai-t6-spec`)
  try { rmSync(specDir, { recursive: true, force: true }) } catch {}
  mkdirSync(specDir, { recursive: true })
  const orig = console.log; console.log = () => {}
  let threw = null
  try { await executeScanFinalize(cwd, { specRoot: specDir }) } catch (e) { threw = e }
  finally { console.log = orig }
  assert(threw === null, '缺文档 → 不抛（manifest/指针/exit(1) 由 handleScanStageCompleted 统一落，保持 SillyHub 消费契约）')
  clean(cwd); clean(specDir)
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
