/**
 * R4 对撞深读三修复回归（2026-09-21，会话 r4-followup）：
 *
 * 1. parseModuleMapPaths 引号剥离（坑 map-quoted-path-deadmatch）：docs/<p>/modules/
 *    _module-map.yaml 带引号条目（"b/src/x.ts"）此前恒失配——R4-L 实证 frontend map 790 条
 *    几乎全带引号＝整图死路径。
 * 2. generateModuleImpactSkeleton 多项目 map 联合归类（坑 multimap-first-found-mismatch）：
 *    对撞仓 docs/ 下 5 项目各带 map，原「取首个命中」让 daemon/frontend 文件对目录序排前的
 *    backend map 全失配（R4-L 24 文件全未匹配）；classified/unmatchedFiles 结构化产出。
 * 3. syncModuleDocSidecars sidecar 按 project 落位（不再写首个 modules 目录）。
 * 4. runGate verify 补 verify-lint 检查（parity，R4-S-F 实证 gate PASS/--done FAIL 两套口径
 *    误导诊断 16min）——接线源文本钉 + 诊断码注册钉（runGate 全量 fixture 重，按仓库既有
 *    「源序钉」惯例）。
 * 5. buildWavePrompt 并发帽 ≤3（R4-L 4 路齐发触发额度耗尽中断 17min）+ 隐式 Wave 串行铁律不回退。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

import { parseModuleMapPaths, generateModuleImpactSkeleton, syncModuleDocSidecars } from '../src/module-impact.js'
import { checkCode } from '../src/diagnostic-codes.js'
import { buildWavePrompt } from '../src/stages/execute.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

let failed = 0
let total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else { console.log(`  ✅ PASS: ${msg}`) }
}
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', shell: true }).toString()

console.log('=== 1. parseModuleMapPaths 引号剥离 ===')
{
  const yaml = [
    'modules:',
    '  modA:',
    '    paths:',
    '      - a/src/',
    '  modB:',
    '    paths:',
    '      - "b/src/page.tsx"',
    "      - 'b/src/single.ts'",
    '  modC:',
    '    paths:',
    '      - plain/nested/deep.ts',
  ].join('\n')
  const m = parseModuleMapPaths(yaml)
  assert(m.get('modA')[0] === 'a/src/', '无引号条目原样（a/src/）')
  assert(m.get('modB')[0] === 'b/src/page.tsx', '双引号条目剥壳（"b/src/page.tsx" → b/src/page.tsx）')
  assert(m.get('modB')[1] === 'b/src/single.ts', '单引号条目剥壳')
  assert(m.get('modC')[0] === 'plain/nested/deep.ts', '裸深层路径原样')
}

console.log('=== 2. 多项目 map 联合归类（sourceFiles 声明来源）===')
{
  const root = mkdtempSync(join(tmpdir(), 'mmi-'))
  const sb = join(root, '.sillyspec')
  // projA 按目录序在前（a< b）——旧逻辑取首个命中即只有 projA 的图
  mkdirSync(join(sb, 'docs', 'projA', 'modules'), { recursive: true })
  writeFileSync(join(sb, 'docs', 'projA', 'modules', '_module-map.yaml'), 'modules:\n  core:\n    paths:\n      - a/\n')
  mkdirSync(join(sb, 'docs', 'projB', 'modules'), { recursive: true })
  writeFileSync(join(sb, 'docs', 'projB', 'modules', '_module-map.yaml'), 'modules:\n  ui:\n    paths:\n      - "b/src/"\n')
  const gen = generateModuleImpactSkeleton({
    cwd: root, changeName: 'probe-change', specDir: sb,
    sourceFiles: ['a/one.js', 'b/src/two.tsx', 'loose/orphan.md'],
  })
  assert(!!gen, '联合归类正常产出')
  const projOf = (f) => (gen.classified || []).filter(r => r.file === f).map(r => `${r.project}/${r.module}`).join(',')
  assert(projOf('a/one.js') === 'projA/core', 'a/one.js 归 projA/core（首个 map 命中）')
  assert(projOf('b/src/two.tsx') === 'projB/ui', 'b/src/two.tsx 归 projB/ui（带引号路径 + 第二个 map，旧逻辑两重死）')
  assert((gen.unmatchedFiles || []).includes('loose/orphan.md'), '游离文件进 unmatchedFiles')
  assert(gen.matchedCount === 2 && gen.unmatchedCount === 1, '计数与归类一致（2 命中 / 1 未命中）')
  assert(gen.markdown.includes('| core |') && gen.markdown.includes('| ui |'), '矩阵含两项目模块行')
  rmSync(root, { recursive: true, force: true })
}

console.log('=== 3. syncModuleDocSidecars sidecar 按项目落位 ===')
{
  const root = mkdtempSync(join(tmpdir(), 'sds-'))
  const sb = join(root, '.sillyspec')
  mkdirSync(join(sb, 'docs', 'projA', 'modules'), { recursive: true })
  writeFileSync(join(sb, 'docs', 'projA', 'modules', '_module-map.yaml'), 'modules:\n  core:\n    paths:\n      - a/\n')
  mkdirSync(join(sb, 'docs', 'projB', 'modules'), { recursive: true })
  writeFileSync(join(sb, 'docs', 'projB', 'modules', '_module-map.yaml'), 'modules:\n  ui:\n    paths:\n      - b/\n')
  mkdirSync(join(sb, 'changes', 'probe-sds'), { recursive: true })
  sh('git init -q .', root)
  sh('git config user.email t@t && git config user.name t', root)
  writeFileSync(join(root, 'base.txt'), 'x')
  sh('git add -A && git commit -qm base', root)
  mkdirSync(join(root, 'a'), { recursive: true })
  writeFileSync(join(root, 'a', 'one.js'), '// x')
  mkdirSync(join(root, 'b'), { recursive: true })
  writeFileSync(join(root, 'b', 'two.tsx'), '// y')
  sh('git add -A', root) // 兜底口径读 git diff HEAD——staged 未提交才会出现在 diff
  const res = syncModuleDocSidecars({ cwd: root, changeName: 'probe-sds', specDir: sb })
  assert(res.synced.length === 2, `两模块 sidecar 同步（实际 ${JSON.stringify(res.synced)}）`)
  const sidecarB = join(sb, 'docs', 'projB', 'modules', 'ui.changelog.md')
  assert(existsSync(sidecarB), 'ui 的 sidecar 落在 projB/modules/（旧逻辑会写进目录序靠前的 projA）')
  assert(readFileSync(sidecarB, 'utf8').includes('- probe-sds |'), 'sidecar 行含变更名')
  assert(!existsSync(join(sb, 'docs', 'projA', 'modules', 'ui.changelog.md')), 'projA 下无 ui sidecar（不再错位）')
  const res2 = syncModuleDocSidecars({ cwd: root, changeName: 'probe-sds', specDir: sb })
  assert(res2.skipped.length === 2 && res2.synced.length === 0, '幂等：二跑全 skip')
  rmSync(root, { recursive: true, force: true })
}

console.log('=== 4. runGate verify-lint parity 接线钉 ===')
{
  const mi = readFileSync(join(repoRoot, 'src', 'machine-interface.js'), 'utf8')
  assert(mi.includes("'verify-lint'"), "machine-interface 含 verify-lint check id")
  assert(mi.includes('runVerifyLintCheck'), 'verify-lint 与 --done 同引擎（runVerifyLintCheck）')
  assert(mi.includes('triageLintOwnership'), 'verify-lint 接归属降档（triageLintOwnership）')
  assert(mi.includes('隔离快照（HEAD+归属文件 overlay）'), '口径差异永久明示（快照 vs 工作树，以 --done 为准）')
  assert(checkCode('verify-lint') === 'verify_lint_failed', "checkCode('verify-lint') 注册（verify_lint_failed）")
}

console.log('=== 5. buildWavePrompt 并发帽 ===')
{
  const wave = { tasks: [{ index: 1 }, { index: 2 }, { index: 3 }, { index: 4 }] }
  const p = buildWavePrompt(wave, 1, '/tmp/x', '/tmp/x', {})
  assert(p.includes('同时在飞子代理 ≤3'), '显式 Wave 派发行含并发帽 ≤3')
  assert(p.includes('并发帽 3'), '调度要求含并发帽说明')
  assert(p.includes('4 路齐发实证'), '含额度耗尽实证教训引据')
  const pImplicit = buildWavePrompt({ implicit: true, tasks: [{ index: 1 }] }, 1, '/tmp/x', '/tmp/x', {})
  assert(pImplicit.includes('禁止并行启动'), '隐式 Wave 串行铁律不回退')
  assert(!pImplicit.includes('同时在飞子代理 ≤3'), '隐式 Wave 不注入并行帽文案（保持串行语义）')
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
