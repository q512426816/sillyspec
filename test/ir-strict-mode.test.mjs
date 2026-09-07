/**
 * IR 严格模式闸门测试（change: 2026-09-07-ir-hardening，FR-01，D-001/002/003）。
 *
 * 锁住：
 *  1. isStrictChange 三边界（=闸门日 true / 早一天 false / 晚一天 true）+ fail-open（pm 缺失/读不到 → false）
 *  2. P3b：strict 探针子节全缺 → mismatch+error（code probe_prefill_missing_strict）；存量 → skip 原文+注记
 *  3. P3a：strict 主仓卡全零声明 → strictViolation（含混合跨仓形态）；部分声明/全跨仓/存量零变化
 *  4. gates 路由：buildProbeConsistencyEnvelope strict code 独立路由；printReconcileTargetFilesCheck strictViolation → true（阻断）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isStrictChange, checkProbeConsistency, reconcileTargetFiles } from '../src/verify-postcheck.js'
import { buildProbeConsistencyEnvelope, printReconcileTargetFilesCheck, buildReconcileTargetFilesEnvelope } from '../src/run/gates.js'
import { IR_STRICT_SINCE } from '../src/constants.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const mk = (p) => { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }

/** stub pm：getChangeCreatedAt 返回固定值 */
const stubPm = (createdAt) => ({ getChangeCreatedAt: () => createdAt })

console.log('=== IR 严格模式闸门（isStrictChange / P3b / P3a / gates 路由）===\n')

console.log('--- ① isStrictChange 三边界 + fail-open ---')
{
  assert(IR_STRICT_SINCE === '2026-09-07', '闸门常量 2026-09-07')
  const cwd = mk('ir-gate-')
  assert(isStrictChange({ pm: stubPm('2026-09-07T00:00:00.000Z'), cwd, changeName: 'c' }) === true, '=闸门日 → true')
  assert(isStrictChange({ pm: stubPm('2026-09-06T23:59:59.999Z'), cwd, changeName: 'c' }) === false, '早一天 → false（存量豁免）')
  assert(isStrictChange({ pm: stubPm('2026-09-08T00:00:00.000Z'), cwd, changeName: 'c' }) === true, '晚一天 → true')
  assert(isStrictChange({ pm: stubPm(null), cwd, changeName: 'c' }) === false, '读不到 created_at → false（fail-open）')
  assert(isStrictChange({ pm: null, cwd, changeName: 'c' }) === false, 'pm 缺失 → false')
  assert(isStrictChange({ pm: stubPm('2026-09-08T00:00:00.000Z'), cwd, changeName: null }) === false, '无 changeName → false')
}

console.log('\n--- ② P3b：strict 子节全缺 → ERROR；存量 → skip 原文 ---')
{
  const cwd = mk('ir-p3b-')
  const specBase = join(cwd, '.sillyspec')
  const cn = '2026-09-08-p3b-x'
  mkdirSync(join(specBase, 'changes', cn), { recursive: true })
  // 无探针子节、无 facts.json 的旧格式报告
  writeFileSync(join(specBase, 'changes', cn, 'verify-result.md'), '# 验证报告\n\n## 结论\nPASS\n')

  const strict = checkProbeConsistency({ cwd, specBase, changeName: cn, strictMode: true })
  assert(strict.status === 'mismatch' && strict.severity === 'error', `strict → mismatch+error（实际 ${strict.status}/${strict.severity}）`)
  assert(strict.mismatches?.[0]?.code === 'probe_prefill_missing_strict', '首条 mismatch code 独立路由')
  assert(strict.mismatches?.[0]?.note?.includes('verify-probes'), 'note 含可执行指引（R-02）')
  assert(['probe','code','expected','actual','severity','note'].every(k => k in (strict.mismatches[0] || {})), 'mismatch 条目全量契约字段')

  const legacy = checkProbeConsistency({ cwd, specBase, changeName: cn, strictMode: false })
  assert(legacy.status === 'skipped' && legacy.skipReason.includes('闸门前变更'), `存量 → skip 原文+注记（实际 ${legacy.status}）`)

  // envelope 路由：strict mismatch → probe_prefill_missing_strict；普通 mismatch+error → probe_consistency_mismatch
  const envStrict = buildProbeConsistencyEnvelope(strict)
  assert(envStrict.code === 'probe_prefill_missing_strict', `envelope code 独立路由（实际 ${envStrict.code}）`)
  assert(envStrict.severity === 'error', 'envelope severity=error')
  const envTamper = buildProbeConsistencyEnvelope({ status: 'mismatch', severity: 'error', mismatches: [{ probe: 'probe1', severity: 'error' }], skipReason: null })
  assert(envTamper.code === 'probe_consistency_mismatch', '普通篡改 mismatch 仍路由既有 code（互不干扰）')
}

console.log('\n--- ③ P3a：strict 主仓卡全零声明 → strictViolation（含混合跨仓）---')
{
  const cwd = mk('ir-p3a-')
  const specBase = join(cwd, '.sillyspec')
  const cn = '2026-09-08-p3a-x'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  // 两张主仓卡，均无 target_files 声明（frontmatter 无 target_files 字段）
  for (const t of ['task-01', 'task-02']) {
    writeFileSync(join(changeDir, 'tasks', `${t}.md`), `---\ntask: ${t}\ngoal: g\nallowed_paths:\n  - src/a.js\n---\n\n# ${t}\n`)
  }

  const strict = reconcileTargetFiles({ cwd, specBase, changeName: cn, strictMode: true })
  assert(strict.status === 'skipped' && !!strict.strictViolation, 'strict 全零声明 → skipped + strictViolation')
  assert(strict.strictViolation?.code === 'target_files_all_missing_strict', 'strictViolation code')
  assert(strict.strictViolation?.message?.includes('NEW:'), 'message 含 NEW: 指引')

  const legacy = reconcileTargetFiles({ cwd, specBase, changeName: cn, strictMode: false })
  assert(legacy.status === 'skipped' && !legacy.strictViolation && legacy.skipReason.includes('存量卡可忽略'), '存量零声明 → 既有 WARNING skip 原文（零变化）')

  // 混合跨仓形态：1 张跨仓卡 + 其余主仓卡全零声明 → 仍触发（Grill P2-④）
  writeFileSync(join(changeDir, 'tasks', 'task-03.md'), `---\ntask: task-03\ngoal: g\nrepo: other\nallowed_paths:\n  - backend/app.py\n---\n\n# task-03\n`)
  const mixed = reconcileTargetFiles({ cwd, specBase, changeName: cn, strictMode: true })
  assert(!!mixed.strictViolation, '混合「跨仓卡+主仓卡全零声明」→ 仍触发 strictViolation')

  // 部分声明 → 不触发（灰度 WARNING）
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), `---\ntask: task-01\ngoal: g\nallowed_paths:\n  - src/a.js\ntarget_files: [src/a.js]\n---\n\n# task-01\n`)
  const partial = reconcileTargetFiles({ cwd, specBase, changeName: cn, strictMode: true })
  assert(!partial.strictViolation, '部分声明 → 不触发（维持既有语义）')

  // print 路由：strictViolation → true（阻断）
  const logs = [], errs = []; const ol = console.log, oe = console.error
  console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => errs.push(a.join(' '))
  const blocked = printReconcileTargetFilesCheck(strict, buildReconcileTargetFilesEnvelope(strict))
  console.log = ol; console.error = oe
  assert(blocked === true, 'printReconcileTargetFilesCheck strictViolation → true（ERROR 阻断）')
  assert(errs.join('\n').includes('target_files_all_missing_strict'), 'ERROR 文案含信封 code')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
