/**
 * plan.global-constraints 存在性 warning 校验单测（ql-20260917-003，ql-20260917-002 留账）
 *
 * 背景：plan.md「## 全局硬约束」段（ql-20260917-002 落地）此前只有模板指引与 execute 子代理
 * 注入，无 postcheck 校验——plan 阶段收口时缺段零提示。本测锁死 stage-contract 清单新增的
 * warning 条目：
 * - 引擎级：literal-any「全局硬约束」+ condition{ctxField:'planLevel', eq:'full'}——
 *   planLevel=full 且 plan.md 缺段 → 1 warning；有段 → 0；planLevel 缺失（存量/旧格式）→
 *   条件不成立跳过（零误报 fail-safe）
 * - validator 级：validatePlanOutputs 从 plan.md frontmatter 读 plan_level 传入引擎 ctx
 */
import { evaluateRules } from '../src/stage-contract-engine.js'
import { getContract } from '../src/stage-contract.js'
import { getRule } from '../src/stage-contract-spec.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

const CD = '/fake/change'
function makeCtx(files = {}) {
  const ctx = { changeDir: CD }
  const norm = (p) => String(p).replace(/\\/g, '/')
  const io = {
    readFile: (p) => { const f = files[norm(p)]; return f != null ? { exists: true, content: f } : { exists: false, content: '' } },
    readDir: () => ({ exists: false, files: [] }),
  }
  return { ctx, io }
}

// ── 清单条目形态 ──────────────────────────────────────────────────────────────
{
  const rule = getRule('plan.global-constraints')
  assert(rule !== undefined, '清单：plan.global-constraints 条目存在')
  assert(rule.severity === 'warning', '清单：severity=warning（不阻断）')
  assert(rule.condition && rule.condition.ctxField === 'planLevel' && rule.condition.eq === 'full', '清单：condition 锚 planLevel eq full')
  assert(Array.isArray(rule.data.literals) && rule.data.literals.includes('全局硬约束'), '清单：literal 锚「全局硬约束」')
}

// ── 引擎级：full 缺段 → 1 warning ────────────────────────────────────────────
{
  const { ctx, io } = makeCtx({
    [`${CD}/plan.md`]: '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n',
  })
  ctx.planLevel = 'full'
  const r = evaluateRules('plan', ctx, io)
  assert(r.warnings.some(w => String(w).includes('全局硬约束')), '引擎：full 缺段 → warning 在位')
  assert(!r.errors.some(e => String(e).includes('全局硬约束')), '引擎：warning 级不进 errors')
}

// ── 引擎级：full 有段 → 0 warning（该条目面） ────────────────────────────────
{
  const { ctx, io } = makeCtx({
    [`${CD}/plan.md`]: '---\nplan_level: full\n---\n\n# 计划\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- Node ≥ 20\n',
  })
  ctx.planLevel = 'full'
  const r = evaluateRules('plan', ctx, io)
  assert(!r.warnings.some(w => String(w).includes('全局硬约束')), '引擎：full 有段 → 该 warning 消失')
}

// ── 引擎级：planLevel 缺失（存量/旧格式）→ 条件不成立跳过 ─────────────────────
{
  const { ctx, io } = makeCtx({
    [`${CD}/plan.md`]: '# 计划（无 frontmatter 旧格式）\n\n## Wave 1\n- task-01\n',
  })
  const r = evaluateRules('plan', ctx, io)
  assert(!r.warnings.some(w => String(w).includes('全局硬约束')), '引擎：planLevel 读不到 → 零误报（fail-safe）')
}

// ── 引擎级：light 档 → 跳过 ───────────────────────────────────────────────────
{
  const { ctx, io } = makeCtx({
    [`${CD}/plan.md`]: '---\nplan_level: light\n---\n\n# 计划\n',
  })
  ctx.planLevel = 'light'
  const r = evaluateRules('plan', ctx, io)
  assert(!r.warnings.some(w => String(w).includes('全局硬约束')), '引擎：light 档跳过（full-only）')
}

// ── validator 级：validatePlanOutputs 读 frontmatter 接线 ──────────────────────
{
  const root = mkdtempSync(join(tmpdir(), 'plan-gc-warn-'))
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'demo')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n')
  const validator = getContract('plan').validators[0]
  const res = validator(root, 'demo', { specBase })
  assert(res && Array.isArray(res.warnings), 'validator：返回形态含 warnings 数组')
  assert(res.warnings.some(w => String(w).includes('全局硬约束')), 'validator：full 缺段 → warning（frontmatter→ctx 接线生效）')

  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- 无跨 task 硬约束\n')
  const res2 = validator(root, 'demo', { specBase })
  assert(!res2.warnings.some(w => String(w).includes('全局硬约束')), 'validator：补段后 warning 消失')
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
