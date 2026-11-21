/**
 * 影子派发形态门测试（2026-11-21-shadow-dispatch-form-respect）
 *
 * 用户裁决「形态压过旁路+保留」：声明 --no-review（review_force=false）/ --turbo（turbo=true）
 * 形态的变更，收口影子审查不再派发（ledger skips 留痕 form-review-exempt）；非免评审形态
 * 走既有链零改动；gates 影子挂点 fire-and-forget 改 await 同步（披露行退出前恒打出）。
 *
 * 覆盖：
 *   1. FR-01 形态门：review_force=false / turbo=true → skipped + form-review-exempt 留痕
 *      （change/stage/tier 入账）；flow-state 缺失 / review_force=true 放行（走到既有
 *      platform-client-missing 检查——证明形态门未拦）
 *   2. FR-03 既有链零改动：tier-not-light 既有文案逐字（S2+无形态声明）；tier-file-missing
 *      既有文案逐字（形态检查不挤掉既有第一道）
 *   3. FR-02 gates 挂点同步化：源码结构断言 await Promise.all 语义（孤儿 fire-and-forget 不存在）
 *
 * 风格：自研 assert 计数报告 + mkdtempSync 临时目录（对齐 test/ceremony-tier.test.mjs），
 * 不引入测试框架；不 mock dispatchShadowReview 真实逻辑——真函数直调，skip 场景无需网络
 * （形态检查内聚在前置链、client 检查之前，client 传 undefined 即可测全部形态分支）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { dispatchShadowReview, readShadowLedger } from '../src/review-dispatch.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`) } else { fail++; console.log(`  ✗ ${label}`) }
}
function section(title) { console.log(`\n=== ${title} ===`) }

/** 造影子派发 fixture：specBase(.sillyspec 形态根)/changes/<change>/flow-state.yaml + .runtime/档位文件 */
function makeFixture({ change, flowStateYaml, tier }) {
  const base = mkdtempSync(join(tmpdir(), 'shadow-form-'))
  const specBase = join(base, 'specroot', '.sillyspec')
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(join(specBase, '.runtime', 'state'), { recursive: true }) // runtimeStatePath 落 <runtimeRoot>/state/
  if (flowStateYaml !== null) writeFileSync(join(changeDir, 'flow-state.yaml'), flowStateYaml, 'utf8')
  if (tier) writeFileSync(join(specBase, '.runtime', 'state', `ceremony-tier-${change}.json`), JSON.stringify({ tier, components: {}, reasons: [], transitions: [] }), 'utf8')
  return { base, specBase, runtimeRoot: join(specBase, '.runtime'), change }
}

async function dispatch(fx, stage = 'brainstorm') {
  return dispatchShadowReview({ mode: 'create', cwd: fx.base, specBase: fx.specBase, changeName: fx.change, stage, client: undefined })
}

// ── 1. FR-01 形态门 ──────────────────────────────────────────
section('1. FR-01 形态免评审 skip：review_force=false / turbo=true 留痕，缺失/强制档放行')

{
  const fx = makeFixture({ change: 'chg-no-review', flowStateYaml: 'tier: thin\nreview_force: false\n', tier: 'S1' })
  const r = await dispatch(fx)
  ok(r && r.skipped === true, 'review_force=false → skipped=true')
  ok(typeof r.reason === 'string' && r.reason.includes('form-review-exempt'), `reason 含 form-review-exempt（实际 ${r.reason}）`)
  ok(r.reason.includes('--no-review'), 'reason 含形态表述 --no-review')
  const ledger = readShadowLedger(fx.runtimeRoot)
  const last = (ledger.skips || []).filter((s) => s.change === fx.change).pop()
  ok(!!last && last.reason.includes('form-review-exempt'), 'ledger skips 留痕该 change 条目')
  ok(!!last && last.stage === 'brainstorm' && last.tier === 'S1', '留痕带 stage+tier')
  rmSync(fx.base, { recursive: true, force: true })
}

{
  const fx = makeFixture({ change: 'chg-turbo', flowStateYaml: 'tier: thin\nturbo: true\nturbo_since: "2026-11-21T00:00:00.000Z"\n', tier: 'S1' })
  const r = await dispatch(fx)
  ok(r && r.skipped === true && r.reason.includes('form-review-exempt'), 'turbo=true → skipped + form-review-exempt')
  ok(r.reason.includes('turbo'), 'reason 含形态表述 turbo')
  rmSync(fx.base, { recursive: true, force: true })
}

{
  const fx = makeFixture({ change: 'chg-nofs', flowStateYaml: null, tier: 'S1' })
  const r = await dispatch(fx)
  ok(r && r.skipped === true && String(r.reason).startsWith('platform-client-missing'), 'flow-state 缺失（run 跑道）→ 不命中形态门，走到既有 client 检查')
  rmSync(fx.base, { recursive: true, force: true })
}

{
  const fx = makeFixture({ change: 'chg-force', flowStateYaml: 'tier: thin\nreview_force: true\n', tier: 'S1' })
  const r = await dispatch(fx)
  ok(r && r.skipped === true && String(r.reason).startsWith('platform-client-missing'), 'review_force=true（--review 强制档）→ 不豁免，走既有链')
  rmSync(fx.base, { recursive: true, force: true })
}

// ── 2. FR-03 既有链零改动 ────────────────────────────────────
section('2. FR-03 既有 skip 文案逐字不漂移')

{
  const fx = makeFixture({ change: 'chg-s2', flowStateYaml: null, tier: 'S2' })
  const r = await dispatch(fx)
  ok(r && r.skipped === true && r.reason === 'tier-not-light（当前档 S2——影子派发只覆盖 S0/S1 轻档，S2/S3 本就是重仪式）', 'tier-not-light 既有文案逐字不变')
  rmSync(fx.base, { recursive: true, force: true })
}

{
  const fx = makeFixture({ change: 'chg-notier', flowStateYaml: 'tier: thin\n', tier: null })
  const r = await dispatch(fx)
  ok(r && r.skipped === true && String(r.reason).startsWith('tier-file-missing（'), 'tier 文件缺失 → 既有 tier-file-missing 文案（形态检查不抢跑）')
  rmSync(fx.base, { recursive: true, force: true })
}

// ── 3. FR-02 gates 影子挂点同步化（源码结构断言）──────────────
section('3. FR-02 gates 挂点 await 同步（披露行退出前恒打出）')

{
  const src = readFileSync(join(REPO_ROOT, 'src', 'run', 'gates.js'), 'utf8')
  ok(/await Promise\.all\(\[\s*\n\s*import\('\.\.\/review-dispatch\.js'\)/.test(src), '影子派发链已 await（Promise.all 前缀 await 语义）')
  ok(!/\.catch\(\(\) => \{ \/\* fire-and-forget/.test(src), '孤儿 fire-and-forget .catch 形态已移除')
}

console.log(`\n── 结果：${pass} passed, ${fail} failed ──`)
if (fail > 0) process.exit(1)
