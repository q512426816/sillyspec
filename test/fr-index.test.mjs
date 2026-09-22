/**
 * fr-index 测试（2026-09-18-fr-index-l1 L1——稳定 FR id/索引/取代链/注入源/重叠检测）
 *
 * 覆盖（fixture 全态，不触真实 .sillyspec）：
 *   1. 发号：域计数器 max+1 跨变更递增（001→002→003）；unmapped 域兜底
 *   2. 幂等重放：同变更第二次调用 written/superseded 皆空（幂等键=全局 id）
 *   3. 承接翻链：旧条目 superseded + superseded_by=新 id；取代链事件返回完整
 *   4. 坏承接：引用不存在的 id → warnings 收集不抛不翻链
 *   5. digest：readActiveFrDigest 只出 active（superseded 藏）+ 场景名摘要
 *   6. overlap 纯函数：高相似 ≥0.6 / 低相似 <0.2 / 空串安全
 *   7. unreferenced 探针：触达域 active 未被承接引用计数（D-008 护栏③）
 *   8. 解析：承接行全角冒号/多 id 逗号分隔/场景名两种写法
 *   9. INDEX 路由：FR 需求索引段生成；scanFrIndex 全量含 superseded
 *  10. 归档挂载端到端：executeArchiveDistill → 索引+fr-supersede/fr-unreferenced 遥测落盘读回
 *
 * 风格：自研 assert + mkdtempSync（同 machine-interface.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

import {
  FR_INDEX_EPOCH,
  parseChangeRequirements,
  indexRequirements,
  readActiveFrDigest,
  frTitleOverlap,
  scanFrIndex,
} from '../src/fr-index.js'
import { readKnowledgeHits } from '../src/knowledge-hits.js'

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

function makeFixture() {
  const root = makeTmpDir('fri-t-')
  const specBase = join(root, '.sillyspec')
  const knowledgeRoot = join(specBase, 'knowledge')
  mkdirSync(knowledgeRoot, { recursive: true })
  const mkChange = (name, req) => {
    const d = join(specBase, 'changes', name)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, 'requirements.md'), req)
    return d
  }
  return { root, specBase, knowledgeRoot, mkChange }
}

// ── 1+2. 发号与幂等 ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  const d1 = mkChange('2026-09-18-aaa', '# R\n\n### FR-01: 用户登录\n#### 场景：正常登录\n')
  const r1 = indexRequirements({ changeDir: d1, knowledgeRoot, headHash: 'h1' })
  assert(r1.written.length === 1 && r1.written[0].id === 'FR-unmapped-001', `1a 域计数器首发 FR-unmapped-001（实际 ${r1.written[0] && r1.written[0].id}）`)
  assert(FR_INDEX_EPOCH === '2026-09-18', '1b epoch 常量')
  const r1b = indexRequirements({ changeDir: d1, knowledgeRoot })
  assert(r1b.written.length === 0 && r1b.superseded.length === 0, '2 幂等重放：第二次零写入零翻链')
}

// ── 3+4. 承接翻链与坏引用 ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  mkChange('2026-09-18-a1', '# R\n### FR-01: 用户登录\n')
  indexRequirements({ changeDir: join(knowledgeRoot, '..', 'changes', '2026-09-18-a1'), knowledgeRoot })
  const d2 = mkChange('2026-09-18-a2', '# R\n### FR-01: 用户登录双因子\n承接: FR-unmapped-001, FR-unmapped-999\n')
  const r2 = indexRequirements({ changeDir: d2, knowledgeRoot })
  assert(r2.superseded.length === 1 && r2.superseded[0].from === 'FR-unmapped-001' && r2.superseded[0].to === 'FR-unmapped-002', `3a 承接翻链（实际 ${JSON.stringify(r2.superseded)}）`)
  assert(r2.warnings.some((w) => w.includes('FR-unmapped-999')), '4a 坏承接 id 进 warnings 不抛')
  assert(!r2.superseded.some((s) => s.from === 'FR-unmapped-999'), '4b 坏 id 不产生翻链事件')
  const file = readFileSync(join(knowledgeRoot, 'fr', 'unmapped.md'), 'utf8')
  assert(/## FR-unmapped-001 用户登录\n变更：2026-09-18-a1\n状态：superseded\nsuperseded_by：FR-unmapped-002/.test(file.replace(/\r/g, '')), '3b 旧条目 superseded+superseded_by 落盘（归属行对齐底座解析器）')
}

// ── 5+9. digest 与 scanFrIndex ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  const d1 = mkChange('2026-09-18-b1', '# R\n### FR-01: 导出数据\n#### 场景：CSV导出\n')
  indexRequirements({ changeDir: d1, knowledgeRoot })
  const d2 = mkChange('2026-09-18-b2', '# R\n### FR-01: 导出数据JSON\n承接: FR-unmapped-001\n**场景：JSON导出**\n')
  indexRequirements({ changeDir: d2, knowledgeRoot })
  const digest = readActiveFrDigest(knowledgeRoot, ['unmapped'])
  assert(digest.length === 1 && digest[0].id === 'FR-unmapped-002' && digest[0].scenarios.includes('JSON导出'), `5a digest active-only+场景名（实际 ${JSON.stringify(digest)}）`)
  const all = scanFrIndex(knowledgeRoot)
  assert(all.length === 2 && all.some((e) => e.id === 'FR-unmapped-001' && e.supersededBy === 'FR-unmapped-002') && all.some((e) => e.id === 'FR-unmapped-002' && !e.supersededBy), '9a scanFrIndex 全量含 superseded 链')
  const idx = readFileSync(join(knowledgeRoot, 'INDEX.md'), 'utf8')
  assert(idx.includes('## FR 需求索引') && idx.includes('fr/unmapped.md'), '9b INDEX FR 路由段生成')
  const decisionsIdx = idx.includes('## Decisions') ? idx : '（本 fixture 无 decisions 段，合法）'
  assert(typeof decisionsIdx === 'string', '9c decisions 段互不干扰（fr 段独立）')
}

// ── 6. overlap 纯函数 ──
{
  assert(frTitleOverlap('导出数据', '导出数据增强') >= 0.6, '6a 高相似过阈值（3/5=0.6 边界命中）')
  assert(frTitleOverlap('导出数据功能', '用户登录功能') < 0.2, '6b 低相似不过阈值')
  assert(frTitleOverlap('', 'x') === 0 && frTitleOverlap(undefined, null) === 0, '6c 空值安全')
}

// ── 7. unreferenced 探针 ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  mkChange('2026-09-18-c1', '# R\n### FR-01: 需求A\n### FR-02: 需求B\n')
  indexRequirements({ changeDir: join(knowledgeRoot, '..', 'changes', '2026-09-18-c1'), knowledgeRoot })
  const d2 = mkChange('2026-09-18-c2', '# R\n### FR-01: 需求A改造\n承接: FR-unmapped-001\n')
  const r2 = indexRequirements({ changeDir: d2, knowledgeRoot })
  assert(r2.unreferenced.length === 1 && r2.unreferenced[0].domain === 'unmapped' && r2.unreferenced[0].count === 1, `7a 未引用计数=active(001翻链+003新增)−承接引用（实际 ${JSON.stringify(r2.unreferenced)}）`)
}

// ── 8. 解析形态 ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  const d = mkChange('2026-09-18-p', '# R\n### FR-01: 全角承接\n承接：FR-x-001，FR-x-002\n#### 场景：甲\n**场景：乙**\n')
  const p = parseChangeRequirements(d)
  assert(p.frs.length === 1 && p.frs[0].supersedes.length === 2 && p.frs[0].supersedes[0] === 'FR-x-001', '8a 全角冒号+全角逗号多 id')
  assert(p.frs[0].scenarios.includes('甲') && p.frs[0].scenarios.includes('乙'), '8b 场景名两种写法（#### 与 **加粗**）')
  assert(parseChangeRequirements(join(knowledgeRoot, 'no-such')).missing === true, '8c requirements 缺失 → missing')
}

// ── 10. 归档挂载端到端（executeArchiveDistill → 索引 + 遥测读回）──
{
  const { root, specBase, mkChange } = makeFixture()
  mkChange('2026-09-18-e1', '# R\n### FR-01: 归档端到端\n### FR-02: 独立需求\n')
  const { executeArchiveDistill } = await import('../src/run/archive-distill.js')
  // executeArchiveDistill 会先跑决策提炼（无 decisions.md → skipped 零输出），再跑 FR 索引
  let out = ''
  const origLog = console.log
  const origWarn = console.warn
  console.log = (...a) => { out += a.join(' ') + '\n' }
  console.warn = () => {}
  try {
    await executeArchiveDistill({ cwd: root, specBase, changeName: '2026-09-18-e1' })
  } finally {
    console.log = origLog
    console.warn = origWarn
  }
  assert(out.includes('FR 索引') && out.includes('FR-unmapped-001'), `10a 归档步打印发号（${out.includes('FR-unmapped-001') ? '含 id' : '缺 id'}）`)
  assert(existsSync(join(specBase, 'knowledge', 'fr', 'unmapped.md')), '10b 索引文件落盘')
  // 二次归档带承接（001→003，002 保持 active 未被引用）→ fr-supersede + fr-unreferenced 遥测
  mkChange('2026-09-18-e2', '# R\n### FR-01: 归档端到端v2\n承接: FR-unmapped-001\n')
  await executeArchiveDistill({ cwd: root, specBase, changeName: '2026-09-18-e2' })
  const hits = readKnowledgeHits(join(specBase, '.runtime'))
  const sup = hits.find((h) => h.type === 'fr-supersede' && h.from === 'FR-unmapped-001')
  assert(sup && sup.to === 'FR-unmapped-003' && sup.change === '2026-09-18-e2', `10c fr-supersede 遥测落盘可读回（实际 ${JSON.stringify(sup)}）`)
  const unref = hits.filter((h) => h.type === 'fr-unreferenced')
  assert(unref.length >= 1 && unref.some((u) => u.domain === 'unmapped' && u.count === 1), `10d fr-unreferenced 探针事件（002 独立需求未被引用，实际 ${JSON.stringify(unref)}）`)
}

// ── 10e. CLI 端到端：软门 warning 经 validateBrainstormOutputs 面透出（不阻断）──
{
  const { root, specBase, mkChange } = makeFixture()
  mkChange('2026-09-18-soft', '# R\n### FR-01: 归档端到端\n')
  const { executeArchiveDistill } = await import('../src/run/archive-distill.js')
  await executeArchiveDistill({ cwd: root, specBase, changeName: '2026-09-18-soft' })
  // 新变更标题与 active 条目高相似（bigram 重叠 0.8）、无承接 → 软门 warn 不 error
  const d = mkChange('2026-09-18-soft2', '# R\n### FR-01: 归档端到端增强\n')
  const { runValidators } = await import('../src/stage-contract.js')
  const r = runValidators('brainstorm', root, '2026-09-18-soft2', { specRoot: specBase })
  assert((r.errors || []).every((e) => !String(e).includes('疑似重复 FR')), '10e-1 疑似重复永不进 errors 面（advisory 永不阻断的硬证据）')
  assert((r.warnings || []).some((w) => w.includes('疑似重复 FR')), `10e-2 疑似重复 warning 透出（实际 warnings=${(r.warnings || []).length} 条）`)
  const hits2 = readKnowledgeHits(join(specBase, '.runtime'))
  assert(hits2.some((h) => h.type === 'fr-duplicate-warning' && h.candidate === 'FR-unmapped-001'), '10e-3 fr-duplicate-warning 遥测落盘')
}

// ── 11. 注入渲染端到端（outputStep → {FR_INDEX_DIGEST} 替换 + fr-inject 遥测）──
{
  const { root, specBase, mkChange } = makeFixture()
  const d1 = mkChange('2026-09-18-i1', '# R\n### FR-01: 注入渲染\n')
  indexRequirements({ changeDir: d1, knowledgeRoot: join(specBase, 'knowledge') })
  // 受注入变更：有 design.md（域解析面）与 requirements.md
  const d2 = mkChange('2026-09-18-i2', '# R\n### FR-01: 新需求\n')
  writeFileSync(join(d2, 'design.md'), '---\nscale: large\n---\n# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/foo.js | x |\n')
  const { outputStep } = await import('../src/run/prompt.js')
  const steps = [{ name: '生成规范文件', prompt: '写作前列现行 FR：\n{FR_INDEX_DIGEST}\n然后生成四件套。' }]
  let rendered = ''
  const origRenderLog = console.log
  console.log = (...a) => { rendered += a.join(' ') + '\n' }
  try {
    await outputStep('brainstorm', 0, steps, root, '2026-09-18-i2', null, { specRoot: specBase })
  } finally {
    console.log = origRenderLog
  }
  assert(rendered.includes('FR-unmapped-001') && rendered.includes('注入渲染'), `11a digest 段替换注入（含 active 条目）`)
  assert(!rendered.includes('{FR_INDEX_DIGEST}'), '11b 占位符消隐')
  const hits = readKnowledgeHits(join(specBase, '.runtime'))
  assert(hits.some((h) => h.type === 'fr-inject' && h.count >= 1 && Array.isArray(h.domains)), `11c fr-inject 遥测落盘（指标①发生器闭环）`)
}

// ── 12. 连字符域 + 跨域翻链落盘 + 摘要保留（R1 审查阻断①②回归钉死） ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  // 手播连字符域索引（真实模块 id 形态：core-engine）
  const frDir = join(knowledgeRoot, 'fr')
  mkdirSync(frDir, { recursive: true })
  writeFileSync(join(frDir, 'core-engine.md'),
    '## FR-core-engine-001 老需求\n变更：older\n状态：active\n摘要：原始场景A；原始场景B\n最近确认：old\n')
  // 新变更（落 unmapped primary 域）承接引用连字符 id
  const d = mkChange('2026-09-18-hy', '# R\n### FR-01: 老需求改造\n承接: FR-core-engine-001\n')
  const r = indexRequirements({ changeDir: d, knowledgeRoot, headHash: 'new' })
  assert(r.superseded.length === 1 && r.superseded[0].from === 'FR-core-engine-001', `12a 连字符 id 承接可解析翻链（实际 ${JSON.stringify(r.superseded)}）`)
  const ce = readFileSync(join(frDir, 'core-engine.md'), 'utf8')
  assert(/状态：superseded/.test(ce) && /superseded_by：FR-unmapped-001/.test(ce.replace(/\r/g, '')), '12b 跨域翻链落盘（阻断②回归：目标域文件真实持久化）')
  assert(/摘要：原始场景A；原始场景B/.test(ce), '12c 翻链就地补丁保留原摘要（R1 缺口：整段重写抹摘要）')
  const r2 = indexRequirements({ changeDir: d, knowledgeRoot })
  assert(r2.written.length === 0, '12d 连字符域幂等（阻断①回归：重跑零写入）')
  const parsed = parseChangeRequirements(d)
  assert(parsed.frs[0].supersedes[0] === 'FR-core-engine-001', '12e 承接行连字符 id 解析（阻断①：字符集）')
}

// ── 13. 多域变更单 id 钉死（D-001 单一身份——R2 残留：无直接测试锚） ──
{
  const root = makeTmpDir('fri-md-')
  const specBase = join(root, '.sillyspec')
  const knowledgeRoot = join(specBase, 'knowledge')
  // 双模块索引：discoverModuleIndex 扫 docs/<project>/modules/_module-map.yaml
  const mapDir = join(specBase, 'docs', 'p1', 'modules')
  mkdirSync(mapDir, { recursive: true })
  mkdirSync(knowledgeRoot, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'),
    'schema_version: 2\nmodules:\n  alpha:\n    status: active\n    doc: modules/alpha.md\n    paths:\n      - src/alpha\n  beta:\n    status: active\n    doc: modules/beta.md\n    paths:\n      - src/beta\n')
  const d = join(specBase, 'changes', '2026-09-18-multi')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'requirements.md'), '# R\n### FR-01: 跨两模块的需求\n')
  writeFileSync(join(d, 'design.md'), '---\nscale: large\n---\n# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | src/alpha/a.js |\n| 修改 | src/beta/b.js |\n')
  const r = indexRequirements({ changeDir: d, knowledgeRoot })
  assert(r.written.length === 1, `13a 触达两域仍只发一个全局 id（D-001 单一身份，实际 ${JSON.stringify(r.written.map(w => w.id))}）`)
  assert(r.written[0].file === 'fr/alpha.md', '13b 落 primary 域（首个触达域）')
}

// ── 14. 伪域回退（知识可见性导线②：无模块卡命中时 auto-<路径段>，替代 unmapped 大池） ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  // 14a: 目录段投票——backend 2 票胜 frontend 1 票 → auto-backend
  const da = mkChange('2026-09-21-pd1', '# R\n### FR-01: 后台守护行为\n')
  writeFileSync(join(da, 'design.md'), '---\nscale: large\n---\n# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | backend/app/daemon/x.py |\n| 修改 | backend/app/y.py |\n| 修改 | frontend/src/z.ts |\n')
  const ra = indexRequirements({ changeDir: da, knowledgeRoot, headHash: 'h1' })
  assert(ra.written.length === 1 && ra.written[0].file === 'fr/auto-backend.md' && ra.written[0].id === 'FR-auto-backend-001',
    `14a 目录段投票派生伪域 auto-backend（实际 ${JSON.stringify(ra.written)}）`)
  // 14b: 伪域文件头自明身份（不谎称有模块卡）
  const fa = readFileSync(join(knowledgeRoot, 'fr', 'auto-backend.md'), 'utf8')
  assert(fa.includes('伪域（auto- 前缀）：由文件路径段投票派生') && !fa.includes('模块卡：modules/auto-backend.md'),
    '14b 伪域 preamble 自明（无模块卡不谎称）')
  // 14c: INDEX 路由行带裸段关键词（unmapped 大池路由失效的教训）
  const idx = readFileSync(join(knowledgeRoot, 'INDEX.md'), 'utf8')
  assert(idx.includes('- auto-backend|backend|FR|需求|承接 → [fr/auto-backend.md](fr/auto-backend.md)'),
    '14c 伪域路由行含裸段关键词（backend 可命中）')
  // 14d: 泛化目录无具体段 → unmapped（原行为保持）
  const db = mkChange('2026-09-21-pd2', '# R\n### FR-01: 单文件行为\n')
  writeFileSync(join(db, 'design.md'), '# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | src/foo.js |\n')
  const rb = indexRequirements({ changeDir: db, knowledgeRoot })
  assert(rb.written[0].file === 'fr/unmapped.md', `14d 泛化目录（src 单文件）退 unmapped（实际 ${rb.written[0] && rb.written[0].file}）`)
  // 14e: 根文件无目录段 → unmapped
  const dc = mkChange('2026-09-21-pd3', '# R\n### FR-01: 根文件行为\n')
  writeFileSync(join(dc, 'design.md'), '# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | README.md |\n')
  const rc = indexRequirements({ changeDir: dc, knowledgeRoot })
  assert(rc.written[0].file === 'fr/unmapped.md', '14e 根文件退 unmapped')
  // 14f: NEW: 前缀新建文件参与伪域投票（正则剥前缀后照常入票——跨仓新建文件不因前缀失票）
  const dd = mkChange('2026-09-21-pd4', '# R\n### FR-01: 新文件行为\n')
  writeFileSync(join(dd, 'design.md'), '# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 新增 | NEW:backend/app/new_module.py |\n')
  const rd = indexRequirements({ changeDir: dd, knowledgeRoot })
  assert(rd.written[0].file === 'fr/auto-backend.md',
    `14f NEW: 前缀剥除后参与投票（实际 ${rd.written[0] && rd.written[0].file}）`)
}

// ── 15. deliverableFiles 旁路（薄流程无 design.md：flow done 以基线 diff 供清单） ──
{
  const { knowledgeRoot, mkChange } = makeFixture()
  const d = mkChange('2026-09-22-pdf1', '# R\n### FR-01: 薄变更行为\n')
  // 无 design.md、无 deliverableFiles → unmapped（既有行为保持）
  const r1 = indexRequirements({ changeDir: d, knowledgeRoot })
  assert(r1.written[0].file === 'fr/unmapped.md', `15a 无 design 无 override 退 unmapped（实际 ${r1.written[0] && r1.written[0].file}）`)
  // deliverableFiles → 伪域路由（与 design 行同判法：目录段投票）
  const d2 = mkChange('2026-09-22-pdf2', '# R\n### FR-01: 薄变更行为二\n')
  const r2 = indexRequirements({ changeDir: d2, knowledgeRoot, deliverableFiles: ['backend/app/x.py', 'backend/app/y.ts', 'frontend/src/z.js'] })
  assert(r2.written[0].file === 'fr/auto-backend.md', `15b override 按交付文件伪域路由（实际 ${r2.written[0] && r2.written[0].file}）`)
  // override 优先于 design.md（薄流程语义：实际 diff 是真相，design 声明可缺席或过期）
  const d3 = mkChange('2026-09-22-pdf3', '# R\n### FR-01: 薄变更行为三\n')
  writeFileSync(join(d3, 'design.md'), '# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | src/legacy/x.js |\n')
  const r3 = indexRequirements({ changeDir: d3, knowledgeRoot, deliverableFiles: ['backend/app/x.py'] })
  assert(r3.written[0].file === 'fr/auto-backend.md', `15c override 优先于 design.md（实际 ${r3.written[0] && r3.written[0].file}）`)
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟，残留交给 tmpdir 清理 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
