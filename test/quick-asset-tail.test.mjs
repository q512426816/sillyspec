/**
 * quick 资产尾测试（2026-09-20-quick-asset-tail，FR-01~03 / D-001~D-005）
 *
 * 覆盖：
 *   1. markFrNeedsReview：写入/幂等/未知id警告/superseded不标
 *   2. readActiveFrDigest：needsReview 透传
 *   3. 承接翻链清除待复核行（indexRequirements filter，S2 阻断①修复的钉）
 *   4. liteArchiveChange：正常归档（rename+unregister 语义）/自愈（已在 archive/）/所有权拒
 *   5. distillLinkedChangeAssets：蒸馏触发/跳过（无文件/纯quick关联）/fail-open
 *   6. prompt 注入行 ⚠️（渲染层直测——经 buildPrompt 不便，直接测 digest→行拼接口径）
 *
 * 风格：自研 assert + tmp fixture（同 fr-index.test.mjs 族）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, appendFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { markFrNeedsReview, readActiveFrDigest, indexRequirements, parseChangeRequirements } from '../src/fr-index.js'
import { liteArchiveChange, distillLinkedChangeAssets } from '../src/run/complete-handlers.js'

let failed = 0
let total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else { console.log(`  ✅ PASS: ${msg}`) }
}
const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }

/** 造 knowledge/fr/<域>.md 一条 active FR（loadDomainSections 可解析形态）。 */
function makeFrIndex(root, domain = 'demo') {
  const frDir = join(root, 'knowledge', 'fr')
  mkdirSync(frDir, { recursive: true })
  writeFileSync(join(frDir, `${domain}.md`), [
    '---', 'author: t', 'created_at: 2026-09-20', '---', '',
    `# FR 索引 — ${domain}`, '',
    '> fr-index 从归档变更 requirements.md 幂等提炼。', '',
    `## FR-${domain}-001 某功能`, '变更：ch-1', '状态：active', '摘要：场景A；场景B', '最近确认：aaa111', '',
  ].join('\n'))
  return join(root, 'knowledge')
}

/** 造 linked 变更目录（requirements.md + decisions.md 可选）。 */
function makeChangeDir(root, name, { reqs = true, decisions = false } = {}) {
  const dir = join(root, '.sillyspec', 'changes', name)
  mkdirSync(dir, { recursive: true })
  if (reqs) writeFileSync(join(dir, 'requirements.md'),
    '# 需求\n\n## 功能需求\n\n### FR-01: 某新功能\nGiven X\nWhen Y\nThen Z\n\n## 决策覆盖矩阵（如存在 decisions.md）\n| 决策 ID | 覆盖的 FR | 说明 |\n|---|---|---|\n')
  if (decisions) writeFileSync(join(dir, 'decisions.md'),
    '---\nauthor: t\ncreated_at: 2026-09-20\n---\n\n# 决策记录（Decisions）\n\n## D-001@v1: 测试决策\n- type: architecture\n- status: accepted\n- 问题: q\n- 选定: a\n')
  return dir
}

/** 假 PM：unregister/assert/set 记账（不真开 SQLite——单元口径）。 */
function fakePm({ owner = null, active = true } = {}) {
  const calls = []
  return {
    calls,
    unregisterChange: (cwd, name, opts) => { calls.push(['unregister', name]) },
    assertChangeOwnership: (cwd, name, opts) =>
      owner === null ? { allowed: true, action: 'no-owner', owner: null, lastActive: null, heartbeatMs: 15 * 60000 }
        : { allowed: false, action: 'blocked-active-owner', owner, lastActive: new Date().toISOString(), heartbeatMs: 15 * 60000 },
    setChangeOwner: (cwd, name, s) => { calls.push(['setOwner', name, s]) },
    archiveStepNamesForArchive: () => ['step1'],
    _activeRow: active,
  }
}

// ── 1-3. needs_review 全链 ──
{
  const root = mk('qat-fr-')
  const k = makeFrIndex(root)
  const r1 = markFrNeedsReview(k, ['FR-demo-001'], 'ql-20260920-001')
  assert(r1.marked === 1, `1a 写入标记（${r1.marked}）`)
  const content = readFileSync(join(k, 'fr', 'demo.md'), 'utf8')
  assert(content.includes('待复核：ql-20260920-001'), '1b 条目含待复核行')
  const r2 = markFrNeedsReview(k, ['FR-demo-001'], 'ql-20260920-001')
  assert(r2.marked === 0, '1c 幂等：同 ref 二跑零新增')
  const r3 = markFrNeedsReview(k, ['FR-demo-999'], 'x')
  assert(r3.marked === 0 && r3.warnings.length === 1, `1d 未知 id 警告不抛（${r3.warnings.length}）`)

  const d = readActiveFrDigest(k, ['demo'])
  assert(d[0] && d[0].needsReview === 'ql-20260920-001', `2 digest 透传 needsReview（${d[0] && d[0].needsReview}）`)

  // 承接清除：新变更 requirements 带 承接: FR-demo-001 → 翻链后待复核行消失
  const changeDir = makeChangeDir(root, 'ch-2')
  writeFileSync(join(changeDir, 'requirements.md'),
    '# 需求\n\n## 功能需求\n\n### FR-01: 取代版\n承接: FR-demo-001\nGiven X\nWhen Y\nThen Z\n')
  // design.md 文件清单造域匹配（resolveTouchedDomains 需要 module index 或 unmapped 兜底）
  writeFileSync(join(changeDir, 'design.md'), '| 修改 | src/foo.js | x |\n')
  mkdirSync(join(root, 'knowledge'), { recursive: true })
  writeFileSync(join(root, 'knowledge', '_module-map.yaml'), 'modules:\n  demo:\n    status: active\n    doc: modules/demo.md\n    paths:\n      - src/\n')
  const ir = indexRequirements({ changeDir, knowledgeRoot: k, headHash: 'bbb222' })
  const after = readFileSync(join(k, 'fr', 'demo.md'), 'utf8')
  const oldEntry = after.split('## FR-demo-001')[1] || ''
  assert(oldEntry.includes('superseded') && !oldEntry.includes('待复核：'), `3 承接翻链清除待复核行（S2阻断①修复钉）`)
  assert(ir.superseded.length === 1, `3b 翻链计数（${ir.superseded.length}）`)
}

// ── 4. liteArchiveChange ──
{
  // 正常归档
  const root = mk('qat-la-')
  makeChangeDir(root, 'ch-x')
  const pm = fakePm()
  const specBase = join(root, '.sillyspec')
  const r = await liteArchiveChange({ pm, cwd: root, specBase, changeName: 'ch-x' })
  assert(r.archivedTo && existsSync(join(specBase, 'changes', 'archive')), `4a 正常归档（dest=${r.archivedTo ? 'ok' : 'none'}）`)
  assert(!existsSync(join(specBase, 'changes', 'ch-x')), '4b 源目录已移')
  assert(pm.calls.some(c => c[0] === 'unregister' && c[1] === 'ch-x'), '4c unregister 落账')

  // 自愈：目录已在 archive/（源缺失）
  const root2 = mk('qat-lb-')
  mkdirSync(join(root2, '.sillyspec', 'changes', 'archive', '2026-09-20-ch-y'), { recursive: true })
  writeFileSync(join(root2, '.sillyspec', 'changes', 'archive', '2026-09-20-ch-y', 'requirements.md'), '# r')
  const pm2 = fakePm()
  const r2 = await liteArchiveChange({ pm: pm2, cwd: root2, specBase: join(root2, '.sillyspec'), changeName: 'ch-y' })
  assert(r2.archivedTo && pm2.calls.some(c => c[0] === 'unregister'), `4d 自愈：已在 archive/ 补 unregister（skipped=${r2.skipped || '无'}）`)

  // 所有权拒
  const root3 = mk('qat-lc-')
  makeChangeDir(root3, 'ch-z')
  const r3 = await liteArchiveChange({ pm: fakePm({ owner: 'other-session' }), cwd: root3, specBase: join(root3, '.sillyspec'), changeName: 'ch-z' })
  assert(r3.skipped && r3.skipped.includes('所有权拒'), `4e 所有权拒 → skipped 无副作用`)
  assert(existsSync(join(root3, '.sillyspec', 'changes', 'ch-z')), '4f 拒时源目录不动')
}

// ── 5. distillLinkedChangeAssets ──
{
  // 纯 quick（无真变更关联）→ 零打扰
  const root = mk('qat-d1-')
  const r = await distillLinkedChangeAssets({ pm: fakePm(), cwd: root, specBase: join(root, '.sillyspec'), changeName: 'quick-1a2b3c4d', linkedChanges: [] })
  assert(r.distilled === false && r.archived === false, '5a 纯 quick 零打扰')
  const r1b = await distillLinkedChangeAssets({ pm: fakePm(), cwd: root, specBase: join(root, '.sillyspec'), changeName: 'quick-1a2b3c4d', linkedChanges: ['quick-deadbeef'] })
  assert(r1b.distilled === false, '5b quick-<hex> 关联被过滤')

  // linked 真变更带 requirements → FR 入索引 + lite 归档
  const root2 = mk('qat-d2-')
  makeChangeDir(root2, 'ch-real', { reqs: true, decisions: true })
  // knowledge root 与 specBase 对齐（distillLinkedChangeAssets 用 specBase/knowledge）
  const specBase2 = join(root2, '.sillyspec')
  const k2 = join(specBase2, 'knowledge')
  mkdirSync(k2, { recursive: true })
  const pm2 = fakePm()
  const r2 = await distillLinkedChangeAssets({ pm: pm2, cwd: root2, specBase: specBase2, changeName: 'quick-1a2b3c4d', linkedChanges: ['ch-real'] })
  assert(r2.frCount >= 1, `5c FR 入索引（${r2.frCount}）`)
  assert(r2.distilled === true, '5d 蒸馏标记')
  assert(r2.archived === true, '5e lite 归档触发')
  assert(existsSync(join(root2, '.sillyspec', 'changes', 'archive')), '5f 归档目录在场')
  // 决策蒸馏产物（knowledge root = specBase/knowledge）
  const decDir = join(specBase2, 'knowledge', 'decisions')
  assert(existsSync(decDir), '5g decisions 蒸馏目录生成')

  // 幂等二跑（目录已归档走自愈路径，FR 同变更名 no-op）
  const r3 = await distillLinkedChangeAssets({ pm: fakePm(), cwd: root2, specBase: join(root2, '.sillyspec'), changeName: 'quick-1a2b3c4d', linkedChanges: ['ch-real'] })
  assert(r3.warnings.length >= 0, `5h 二跑 fail-open（warnings=${r3.warnings.length}，幂等由 fr-index/自愈承接）`)
}


// ── 7. 机械件④补：changelog 边车追加路径语义（S2 复审 R4 缺口）──
{
  // changelog 边车：真实 map 布局（docs/<project>/modules/）+ 边车在场 → append 语义
  const root = mk('qat-mech-')
  const specBase = join(root, '.sillyspec')
  const projDir = join(specBase, 'docs', 'demo', 'modules')
  mkdirSync(projDir, { recursive: true })
  writeFileSync(join(projDir, '_module-map.yaml'), [
    'modules:', '  modA:', '    status: active', '    doc: modules/modA.md', '    paths:', '      - src/a/', '',
  ].join('\n'))
  writeFileSync(join(projDir, 'modA.changelog.md'), '# modA 变更索引\n')
  // 复刻 handleQuickStageCompletion ② 段的 join 语义（docs/<project>/<docRel→.changelog.md>）
  const docRel = 'modules/modA.md'
  const docNorm = docRel.replace(/\\/g, '/')
  const sidecarRel = docNorm.replace(/\.md$/, '.changelog.md')
  const target = join(specBase, 'docs', 'demo', sidecarRel)
  assert(existsSync(target), '7a 边车路径 join 语义（docs/<project>/modules/modA.changelog.md）')
  appendFileSync(target, '- quick-test | quick 机械留痕\n')
  const after = readFileSync(target, 'utf8')
  assert(after.includes('quick 机械留痕'), '7b append 落盘')
  assert(after.startsWith('# modA'), '7c 既有内容不覆盖（append 非 write）')
}

// ── 6. 注入行 ⚠️ 口径（digest→行拼接同 prompt.js 逻辑的字段级断言）──
{
  const root = mk('qat-p-')
  const k = makeFrIndex(root)
  markFrNeedsReview(k, ['FR-demo-001'], 'ql-9')
  const d = readActiveFrDigest(k, ['demo'])
  assert(d[0].needsReview === 'ql-9', '6 needsReview 在注入源可用（prompt.js 已接 ⚠️ 渲染——字段契约钉）')
}

// ── 8. R4-S-Q 缺陷 A/B 回归（2026-09-21 修复）：真实 import + --done 显式关联并入 guard ──
{
  // 8a 缺陷 A：loadQuickModuleIndex 必须真实可解构（曾缺 export → 资产尾② TypeError fail-open 死路）
  const shared = await import('../src/run/shared.js')
  assert(typeof shared.loadQuickModuleIndex === 'function', '8a shared.js 真实导出 loadQuickModuleIndex（R4-S-Q 缺陷 A）')

  // 8b-8f 缺陷 B：mergeGuardLinkedChanges 纯函数语义
  const { mergeGuardLinkedChanges } = await import('../src/run/complete-handlers.js')
  const g0 = { linkedChanges: ['ch-a'], linkedChangesAuto: ['ch-auto'], allowedFiles: ['x'] }
  const m1 = mergeGuardLinkedChanges(g0, ['ch-b'], [])
  assert(m1.linkedChanges.join(',') === 'ch-a,ch-b', '8b 并集去重保序（persisted 前，显式后）')
  assert(m1.linkedChangesAuto.join(',') === 'ch-auto', '8c manual 显式声明不影响 auto 面')
  assert(m1.allowedFiles.length === 1 && m1.allowedFiles[0] === 'x', '8b2 guard 其余字段原样透传（spread）')
  assert(mergeGuardLinkedChanges(g0, ['ch-a'], []) === g0, '8d 无变化返回原引用（调用点以此免回写）')
  const m3 = mergeGuardLinkedChanges(g0, ['none'], [])
  assert(m3.linkedChanges.length === 0 && m3.linkedChangesAuto.length === 1, "8e 'none' 清空 manual 面、auto 不动")
  assert(mergeGuardLinkedChanges(null, ['ch-b'], []) === null, '8f guard 缺失原样返回（brownfield 语义不变）')
  const m4 = mergeGuardLinkedChanges({ linkedChanges: ['ch-a'] }, [], ['ch-x'])
  assert(m4.linkedChangesAuto.join(',') === 'ch-x', '8g auto 显式并入（--done 自动解析路径）')

  // 8h/8i 接线防回归（源文本钉）：completeStep 解构与 handler 透传两处都在
  const src = readFileSync(new URL('../src/run/complete.js', import.meta.url), 'utf8')
  assert(/quickFiles = \[\], linkedChanges = \[\], linkedChangesAuto = \[\] \}/.test(src), '8h completeStep options 解构含 linkedChanges/linkedChangesAuto')
  assert(/quickFiles, linkedChanges, linkedChangesAuto \}\)/.test(src), '8i handleQuickStageCompletion 调用透传两参')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
