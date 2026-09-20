/**
 * fr-index L2 测试（2026-09-20-fr-index-l2，FR-01~03 / D-001~D-003）
 *
 * 覆盖五组：
 *   1. 决策覆盖矩阵解析（decisions 字段命中/多 FR 列逗号/缺矩阵空数组）
 *   2. 条目「依据决策：」行写入（命中写行、空省略）
 *   3. readActiveFrDigest.decisions（新行读出、旧条目无行 = []）
 *   4. 域文件头模块卡指针
 *   5. 旧条目零破坏（无新行的存量文件照常解析）
 *
 * 风格：自研 assert + tmp fixture（同 fr-index 既有测试族）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { parseChangeRequirements, indexRequirements, readActiveFrDigest, backfillScenarioBodies } from '../src/fr-index.js'

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

function makeChange({ matrix } = {}) {
  const root = makeTmpDir('frl2-')
  const changeDir = join(root, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  const matrixBlock = matrix === false ? '' : `
## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 单覆盖 |
| D-002@v1 | FR-01, FR-02 | 多覆盖 |`
  writeFileSync(join(changeDir, 'requirements.md'), `---
author: t
---
# 需求规格（Requirements）

## 功能需求

### FR-01: 甲能力
**场景：正常**

### FR-02: 乙能力
${matrixBlock}
`)
  // design.md 触达域解析需要 moduleIndex——discoverModuleIndex 扫 docs/<proj>/modules/_module-map.yaml
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(knowledgeRoot, { recursive: true })
  const mapDir = join(root, 'docs', 'p1', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'schema_version: 2\nmodules:\n  demo:\n    status: active\n    doc: modules/demo.md\n    paths:\n      - src/demo.js\n')
  writeFileSync(join(changeDir, 'design.md'), `# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | x |\n`)
  return { root, changeDir, knowledgeRoot }
}

// ── 1. 矩阵解析 ──
{
  const { changeDir } = makeChange()
  const p = parseChangeRequirements(changeDir)
  assert(p.frs.find(f => f.local === 'FR-01').decisions.join(',') === 'D-001@v1,D-002@v1', '1a 多覆盖聚合（逗号列）')
  assert(p.frs.find(f => f.local === 'FR-02').decisions.join(',') === 'D-002@v1', '1b 单覆盖')
  const { changeDir: cd2 } = makeChange({ matrix: false })
  const p2 = parseChangeRequirements(cd2)
  assert(p2.frs.every(f => f.decisions.length === 0), '1c 缺矩阵 → decisions 恒空')
}

// ── 2/3/4. 写入 + digest + 指针 ──
{
  const { changeDir, knowledgeRoot } = makeChange()
  const r = indexRequirements({ changeDir, knowledgeRoot, headHash: 'abc1234' })
  assert(r.written.length === 2, `2a 两条 FR 写入（实际 ${r.written.length}）`)
  const frFile = join(knowledgeRoot, 'fr', 'demo.md')
  assert(existsSync(frFile), '2b 域文件落盘')
  const content = readFileSync(frFile, 'utf8')
  assert(content.includes('依据决策：D-001@v1、D-002@v1'), '2c FR-01 条目依据决策行（多覆盖顿号连接）')
  // FR-02 只有 D-002 → 也写行；再验 digest
  const digest = readActiveFrDigest(knowledgeRoot, ['demo'])
  const d01 = digest.find(e => e.title.includes('甲能力'))
  const d02 = digest.find(e => e.title.includes('乙能力'))
  assert(d01 && d01.decisions.join(',') === 'D-001@v1,D-002@v1', `3a digest.decisions（实际 ${d01 && d01.decisions}）`)
  assert(d02 && d02.decisions.join(',') === 'D-002@v1', '3b FR-02 单决策')
  assert(content.includes('> 模块卡：modules/demo.md'), '4 文件头模块卡指针')
}

// ── 5. 旧条目零破坏（无依据决策行的存量）+ 省略态 ──
{
  const root = makeTmpDir('frl2-old-')
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  writeFileSync(join(knowledgeRoot, 'fr', 'legacy.md'), `---
author: sillyspec-fr-index
created_at: 2026-09-18T00:00:00.000Z
---

# FR 索引 — legacy

> fr-index 从归档变更 requirements.md 幂等提炼。

## FR-legacy-001 存量条目
变更：2026-09-18-old-change
状态：active
摘要：老场景
最近确认：aaaa111
`)
  const digest = readActiveFrDigest(knowledgeRoot, ['legacy'])
  assert(digest.length === 1 && digest[0].decisions.length === 0, '5a 旧条目（无依据决策行）解析零破坏，decisions=[]')

  // 省略态：无矩阵归档 → 新条目无「依据决策：」行
  const { changeDir, knowledgeRoot: k2 } = makeChange({ matrix: false })
  const k2fr = join(k2, 'fr')
  mkdirSync(k2fr, { recursive: true })
  writeFileSync(join(k2fr, 'demo.md'), `# FR 索引 — demo\n\n## FR-demo-001 占位\n变更：x\n状态：active\n摘要：y\n最近确认：z\n`)
  indexRequirements({ changeDir, knowledgeRoot: k2, headHash: 'h1' })
  // changeDir 的 FR 落 primary 域 demo → 新增段应无依据决策行
  const c = readFileSync(join(k2fr, 'demo.md'), 'utf8')
  const newBlock = c.slice(c.indexOf('c1'))
  assert(!newBlock.includes('依据决策：'), '5b 无矩阵新条目省略依据决策行')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ }
}

// ── 6. GWT 捕获与正文块（D-003@v2 / FR-03）──
{
  const root = makeTmpDir('frl2-gwt-')
  const changeDir = join(root, 'changes', 'c-gwt')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'requirements.md'), `---
author: t
---
# 需求规格（Requirements）

## 功能需求

### FR-01: 无场景名直给 GWT
Given 甲状态
When 乙动作
Then 丙结果

### FR-02: 命名场景
**场景：边界**
Given 边界态
When 极限动作
Then 兜底结果

### FR-03: 无 GWT 纯标题
（纯描述无 GWT 行）
`)
  const p = parseChangeRequirements(changeDir)
  const f1 = p.frs.find(f => f.local === 'FR-01')
  assert(f1.scenarios.includes('默认场景'), '6a 无名 GWT → 默认场景命名进 scenarios（L1 摘要兼容）')
  assert(f1.scenarioBodies[0].given === '甲状态' && f1.scenarioBodies[0].then === '丙结果', '6b GWT 三行归属默认场景体块')
  const f2 = p.frs.find(f => f.local === 'FR-02')
  assert(f2.scenarioBodies[0].name === '边界' && f2.scenarioBodies[0].when === '极限动作', '6c 命名场景体块归属')
  const f3 = p.frs.find(f => f.local === 'FR-03')
  assert(f3.scenarioBodies.length === 0, '6d 无 GWT → 无体块')
  // 渲染：走 indexRequirements 看条目块
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(knowledgeRoot, { recursive: true })
  const mapDir = join(root, 'docs', 'p1', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'schema_version: 2\nmodules:\n  demo:\n    status: active\n    doc: modules/demo.md\n    paths:\n      - src/demo.js\n')
  writeFileSync(join(changeDir, 'design.md'), `# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | x |\n`)
  indexRequirements({ changeDir, knowledgeRoot, headHash: 'h2' })
  const c = readFileSync(join(knowledgeRoot, 'fr', 'demo.md'), 'utf8')
  assert(c.includes('场景正文：'), '6e 条目含「场景正文：」块')
  assert(c.includes('- 场景：默认场景 — Given 甲状态；When 乙动作；Then 丙结果'), '6f 默认场景正文行（三段拼接）')
  assert(c.includes('- 场景：边界 — Given 边界态'), '6g 命名场景正文行')
}

// ── 7. 存量回填（FR-04）──
{
  const root = makeTmpDir('frl2-bf-')
  const knowledgeRoot = join(root, 'knowledge')
  const archiveRoot = join(root, 'changes', 'archive')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  writeFileSync(join(knowledgeRoot, 'fr', 'legacy.md'), `---
author: sillyspec-fr-index
---

# FR 索引 — legacy

## FR-legacy-001 存量甲条目
变更：2026-01-01-old-a
状态：active
摘要：老场景
最近确认：aaaa111

## FR-legacy-002 已有正文条目
变更：2026-01-01-old-a
状态：active
摘要：已回填过
场景正文：
- 场景：在场 — Given x
最近确认：aaaa111

## FR-legacy-003 来源缺失条目
变更：2026-01-01-gone
状态：active
摘要：无归档
最近确认：aaaa111
`)
  mkdirSync(join(archiveRoot, '2026-01-01-old-a'), { recursive: true })
  writeFileSync(join(archiveRoot, '2026-01-01-old-a', 'requirements.md'), `# 需求\n\n### FR-01: 存量甲条目\n**场景：老场景**\nGiven 老状态\nWhen 老动作\nThen 老结果\n`)
  const r = backfillScenarioBodies({ knowledgeRoot, archiveRoot })
  assert(r.backfilled.some(b => b.id === 'FR-legacy-001' && !b.what), `7a 恰回填缺正文条目（实际 ${JSON.stringify(r.backfilled.map(b => b.id + (b.what ? ':' + b.what : '')))}——锚与正文各记一条）`)
  const c = readFileSync(join(knowledgeRoot, 'fr', 'legacy.md'), 'utf8')
  assert(c.includes('- 场景：老场景 — Given 老状态；When 老动作；Then 老结果'), '7b 正文块按标题匹配补入')
  assert(!c.includes('FR-legacy-002\n变更：2026-01-01-old-a\n状态：active\n摘要：已回填过\n场景正文：\n- 场景：在场 — Given x\n场景正文：'), '7c 已有正文条目不被重复回填')
  // 幂等：二跑零新增
  const r2 = backfillScenarioBodies({ knowledgeRoot, archiveRoot })
  assert(r2.backfilled.length === 0, `7d 二跑幂等（实际回填 ${r2.backfilled.length}）`)
  assert(r.warnings.some(w => w.includes('2026-01-01-gone')), '7e 来源缺失 → 警告不阻断')
  // 全文锚回填（追平刀①）：7a 回填正文的同时补锚
  assert(c.includes('全文：.sillyspec/changes/archive/2026-01-01-old-a/requirements.md#FR-01'), '7f 全文锚随正文块补入（FR-01 局部号）')
}

// ── 8. 全文锚新条目 + 退役理由承接（追平两刀）──
{
  const root = makeTmpDir('frl2-anchor-')
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(knowledgeRoot, { recursive: true })
  const mapDir = join(root, 'docs', 'p1', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'schema_version: 2\nmodules:\n  demo:\n    status: active\n    doc: modules/demo.md\n    paths:\n      - src/demo.js\n')
  // 第一变更：建一条 FR
  const c1 = join(root, 'changes', 'c1')
  mkdirSync(c1, { recursive: true })
  writeFileSync(join(c1, 'requirements.md'), `# 需求\n\n### FR-01: 旧行为\nGiven 老态\nWhen 老动作\nThen 老果\n`)
  writeFileSync(join(c1, 'design.md'), `# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | x |\n`)
  indexRequirements({ changeDir: c1, knowledgeRoot, headHash: 'h1' })
  const c1file = readFileSync(join(knowledgeRoot, 'fr', 'demo.md'), 'utf8')
  assert(c1file.includes('全文：.sillyspec/changes/archive/c1/requirements.md#FR-01'), '8a 新条目自动带全文锚（局部号 FR-01）')

  // 第二变更：带退役理由承接旧行为
  const c2 = join(root, 'changes', 'c2')
  mkdirSync(c2, { recursive: true })
  writeFileSync(join(c2, 'requirements.md'), `# 需求\n\n### FR-01: 新行为\n承接: FR-demo-001（退役理由：旧口径在并行场景下有覆盖缺陷）\nGiven 新态\nWhen 新动作\nThen 新果\n`)
  writeFileSync(join(c2, 'design.md'), `# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | x |\n`)
  const r2 = indexRequirements({ changeDir: c2, knowledgeRoot, headHash: 'h2' })
  assert(r2.superseded.length === 1, `8b 承接翻链生效（实际 ${JSON.stringify(r2.superseded)}）`)
  const c2file = readFileSync(join(knowledgeRoot, 'fr', 'demo.md'), 'utf8')
  assert(c2file.includes('退役理由：旧口径在并行场景下有覆盖缺陷'), '8c 退役理由写进被取代条目')
  // 无理由承接不伪造行
  const c3 = join(root, 'changes', 'c3')
  mkdirSync(c3, { recursive: true })
  writeFileSync(join(c3, 'requirements.md'), `# 需求\n\n### FR-01: 更新行为\n承接: FR-demo-002\nGiven 新态2\nWhen 新动作2\nThen 新果2\n`)
  writeFileSync(join(c3, 'design.md'), `# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | x |\n`)
  indexRequirements({ changeDir: c3, knowledgeRoot, headHash: 'h3' })
  const c3file = readFileSync(join(knowledgeRoot, 'fr', 'demo.md'), 'utf8')
  assert((c3file.match(/退役理由：/g) || []).length === 1, '8d 无理由承接不伪造退役理由行（仍只 1 处）')
}

// ── 9. scenario-loss 检测（对标 OpenSpec）──
{
  const root = makeTmpDir('frl2-sloss-')
  const mkIndex = (kr) => {
    mkdirSync(kr, { recursive: true })
    const md = join(root, 'docs', 'p1', 'modules')
    mkdirSync(md, { recursive: true })
    writeFileSync(join(md, '_module-map.yaml'), 'schema_version: 2\nmodules:\n  demo:\n    status: active\n    doc: modules/demo.md\n    paths:\n      - src/demo.js\n')
  }
  const mkChange = (name, body) => {
    const d = join(root, 'changes', name)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, 'requirements.md'), body)
    writeFileSync(join(d, 'design.md'), '# 设计\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/demo.js | x |\n')
    return d
  }
  // 建旧行为（两场景）→ 承接方丢场景乙
  const k1 = join(root, 'k1')
  mkIndex(k1)
  indexRequirements({ changeDir: mkChange('c1', '# 需求\n\n### FR-01: 旧行为\n**场景：甲**\nGiven a\nWhen b\nThen c\n\n**场景：乙**\nGiven d\nWhen e\nThen f\n'), knowledgeRoot: k1, headHash: 'h1' })
  const r = indexRequirements({ changeDir: mkChange('c2', '# 需求\n\n### FR-01: 新行为\n承接: FR-demo-001\n**场景：甲**\nGiven a2\nWhen b2\nThen c2\n'), knowledgeRoot: k1, headHash: 'h2' })
  assert(r.warnings.some(w => w.includes('scenario-loss') && w.includes('乙')), `9a 丢场景乙 → scenario-loss warning（实际 ${JSON.stringify(r.warnings)}）`)
  // 全覆盖 → 无 warning
  const k2 = join(root, 'k2')
  mkIndex(k2)
  indexRequirements({ changeDir: mkChange('c3', '# 需求\n\n### FR-01: 旧行为\n**场景：甲**\nGiven a\nWhen b\nThen c\n'), knowledgeRoot: k2, headHash: 'h3' })
  const r2 = indexRequirements({ changeDir: mkChange('c4', '# 需求\n\n### FR-01: 新行为\n承接: FR-demo-001\n**场景：甲**\nGiven a2\nWhen b2\nThen c2\n'), knowledgeRoot: k2, headHash: 'h4' })
  assert(!r2.warnings.some(w => w.includes('scenario-loss')), '9b 全覆盖 → 无 warning')
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
