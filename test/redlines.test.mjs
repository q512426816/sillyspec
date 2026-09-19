/**
 * 红线机检测试（2026-09-20-redline-machine-check，FR-01~03 / D-001~D-004）
 *
 * 覆盖：
 *   1. parseRedlines：七字段解析 / 四无效判据（缺id、缺scope、forbid+require全空、坏正则）
 *   2. resolveScopeFiles：** 跨层 vs * 单段 / 排除目录 / 长名不误蹭
 *   3. evaluateRedlines：forbid 命中 file:line / require 缺失 / severity 透传 / 单条异常 fail-open
 *   4. 探针四态：violation（❌ 行）/ clean（✅）/ absent（不适用零打扰）/ broken-yaml（fail-open 不炸）
 *
 * 风格：自研 assert + tmp fixture（同 quick-test-gate.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { parseRedlines, resolveScopeFiles, evaluateRedlines } from '../src/redlines.js'
import { runRedlineConsistencyProbe } from '../src/verify-probes.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

/** 造夹具仓：src 子包代码文件 + 可选 redlines.yaml。 */
function makeRepo({ yaml } = {}) {
  const root = makeTmpDir('redline-')
  mkdirSync(join(root, 'frontend', 'src', 'lib'), { recursive: true })
  writeFileSync(join(root, 'frontend', 'src', 'lib', 'adapter.ts'),
    'const item = { kind: "tool", raw: "x", status: "running" };\nconst honest = "结果未记录（更早窗口外或中断）";\n')
  mkdirSync(join(root, 'backend', 'app'), { recursive: true })
  writeFileSync(join(root, 'backend', 'app', 'router.py'), 'def handler():\n    pass\n')
  mkdirSync(join(root, 'node_modules', 'junk'), { recursive: true })
  writeFileSync(join(root, 'node_modules', 'junk', 'x.ts'), 'status: "running"\n')
  if (yaml !== undefined) {
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'redlines.yaml'), yaml)
  }
  return root
}

const GOOD_YAML = `redlines:
  - id: RL-001
    statement: 回放适配器不得用 running 编码未配对 tool_use
    scope: ['frontend/src/**/*.ts']
    forbid: ['status:\\s*["'']running["'']']
    require: ['结果未记录']
    severity: error
    origin: docs/design.md#R-03
`

// ── 1. parseRedlines ──
{
  const { entries, warnings } = parseRedlines(GOOD_YAML)
  assert(entries.length === 1 && entries[0].id === 'RL-001', '1a 七字段条目解析（id 透传）')
  assert(entries[0].severity === 'error' && entries[0].origin === 'docs/design.md#R-03', '1b severity/origin 透传')
  assert(entries[0].forbid.length === 1 && entries[0].require.length === 1, '1c forbid/require 数组解析')

  const bad = parseRedlines(`redlines:
  - statement: 缺 id
    scope: ["src/**"]
    forbid: ["x"]
  - id: RL-A
    forbid: ["x"]
  - id: RL-B
    scope: ["src/**"]
  - id: RL-C
    scope: ["src/**"]
    forbid: ["[unclosed"]
`)
  assert(bad.entries.length === 0 && bad.warnings.length === 4, `1d 四无效判据各自跳过+warn（${bad.warnings.length}/4）`)

  const sevDefault = parseRedlines(`redlines:\n  - id: RL-D\n    scope: ["src/**"]\n    forbid: ["x"]\n`)
  assert(sevDefault.entries[0].severity === 'error', '1e severity 缺省 error')
}

// ── 2. resolveScopeFiles ──
{
  const root = makeRepo()
  const dbl = resolveScopeFiles(['frontend/src/**/*.ts'], root)
  assert(dbl.includes('frontend/src/lib/adapter.ts'), '2a ** 跨层命中子包深层文件')
  const sgl = resolveScopeFiles(['frontend/src/*.ts'], root)
  assert(!sgl.includes('frontend/src/lib/adapter.ts') && sgl.length === 0, '2b * 单段不跨层')
  const junk = resolveScopeFiles(['**/*.ts'], root)
  assert(!junk.some((f) => f.startsWith('node_modules/')), '2c 排除 node_modules')
  assert(!junk.some((f) => f.startsWith('.sillyspec/')), '2c\' 排除 .sillyspec（清单自身不进 scope，防 require 假阴性——S2 审查 D1）')
  const longName = resolveScopeFiles(['frontend/src-guide/**'], root)
  assert(longName.length === 0, '2d 长名不误蹭（src-guide ≠ src 段）')
}

// ── 3. evaluateRedlines ──
{
  const root = makeRepo({ yaml: GOOD_YAML })
  const { entries } = parseRedlines(GOOD_YAML)
  const r = evaluateRedlines({ entries, root })
  const hit = r.findings.find((f) => f.kind === 'forbid')
  assert(hit && hit.file === 'frontend/src/lib/adapter.ts' && hit.line === 1, `3a forbid 命中带 file:line（${hit ? hit.file + ':' + hit.line : '无'}）`)
  assert(hit && hit.severity === 'error', '3b severity 透传进 finding')
  const reqMiss = r.findings.find((f) => f.kind === 'require-missing')
  assert(reqMiss === undefined, '3c require 在 scope 命中（honest 文本在 adapter.ts）→ 无缺失 finding（严格断言，S2 审查 D2）')

  // 只 forbid（require 已满足的干净形态反转）：删 honest 文本 → require 缺失
  const root2 = makeRepo()
  writeFileSync(join(root2, 'frontend', 'src', 'lib', 'adapter.ts'), 'const item = { kind: "tool", status: "ok" };\n')
  const r2 = evaluateRedlines({ entries, root: root2 })
  assert(r2.findings.some((f) => f.kind === 'require-missing' && f.id === 'RL-001'), '3d require scope 全集无命中 → 缺失 finding')

  // fail-open：scope 指向不存在路径 → 0 文件，不炸
  const r3 = evaluateRedlines({ entries: [{ ...entries[0], scope: ['nonexistent/**'] }], root })
  assert(!r3.warnings.some((w) => w.includes('异常')), '3e 空 scope 不炸（fail-open）')
}

// ── 4. 探针四态 ──
{
  // absent：缺清单 → 不适用零打扰
  const root = makeRepo()
  const absent = runRedlineConsistencyProbe({ specBase: join(root, '.sillyspec'), cwd: root })
  assert(absent.applicable === false, '4a 缺 redlines.yaml → 不适用')

  // violation：命中渲染 ❌（经 parse+evaluate 路径验证探针产物面）
  const rootV = makeRepo({ yaml: GOOD_YAML })
  const probe = runRedlineConsistencyProbe({ specBase: join(rootV, '.sillyspec'), cwd: rootV })
  assert(probe.applicable === true && probe.entryCount === 1, '4b 清单在场 → applicable + entryCount')
  assert(probe.findings.some((f) => f.id === 'RL-001' && f.kind === 'forbid' && f.severity === 'error'), '4c forbid 命中进探针 findings')
  assert(probe.findings.every((f) => f.file !== 'node_modules/junk/x.ts'), '4d node_modules 命中不进 findings')

  // broken yaml：fail-open 不适用
  const rootB = makeRepo({ yaml: 'redlines: [unclosed' })
  const broken = runRedlineConsistencyProbe({ specBase: join(rootB, '.sillyspec'), cwd: rootB })
  assert(broken.applicable === false && broken.warnings.length > 0 && broken.warnings[0].includes('解析失败'), '4e 坏 yaml → 不适用 + 注记（fail-open）')

  // clean：全过（✅ 分支——forbid 零命中 + require 命中）
  const rootC = makeRepo({ yaml: GOOD_YAML })
  writeFileSync(join(rootC, 'frontend', 'src', 'lib', 'adapter.ts'),
    'const item = { kind: "tool", raw: "x", status: "ok", result: "结果未记录（更早窗口外或中断）" };\n')
  const clean = runRedlineConsistencyProbe({ specBase: join(rootC, '.sillyspec'), cwd: rootC })
  assert(clean.applicable === true && clean.findings.length === 0, `4f clean 态 → findings 恰空（实际 ${clean.findings.length}：${JSON.stringify(clean.findings.map((f) => f.kind))}）`)
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
