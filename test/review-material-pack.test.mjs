/**
 * 评审材料包验收钉（2026-09-19-review-material-pack / FR-03 / D-003；
 * 组四 2026-09-19-review-material-cli-wiring / FR-03 / D-003）
 *
 * 四断言组：
 *   组一（机械钉）：src/ 全仓无「必须读取完整」「素材宁可多读」两原语（改写前命中
 *     brainstorm.js:417/:424，task-02 后应绝迹；test/ 不在改写面——如 test 内出现属测试
 *     自身文案，白名单本文件）。
 *   组二（包形态）：buildReviewMaterialPack 四 schema 渲染（基准面头/截断/空 inputs 兜底）；
 *     extractDesignHotZone 节抽取；两槽互斥——prompt.js 正常链与降级分支都 join
 *     {REVIEW_MATERIALS}，再审模板（stage-review.js 派发面）不含该槽。
 *   组三（排他语）：renderPriorRoundFindingsMd 渲染体含「唯一基准面」「包外查证口径」。
 *   组四（CLI 注入接线）：assembleStageReviewMaterials 三形态非空（fixture）＋主代理半边
 *     留位 ＋ prompt.js 主链 join 装配结果/降级 join 空串源码钉 ＋ 三模板槽在场。
 */
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReviewMaterialPack, extractDesignHotZone, extractSnippets, extractDiffSummary } from '../src/review-material-pack.js'
import { renderPriorRoundFindingsMd } from '../src/stage-review.js'

function cleanupTmp(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* best-effort */ }
}

let passed = 0, failed = 0
function assert(name, cond, detail = '') {
  if (cond) { console.log(`✅ PASS: ${name}`); passed++ }
  else { console.log(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

// ── 组一：两原语机械钉（全仓 src/ 扫描）──
{
  const PRIMITIVE_RES = [/必须读取完整/, /素材宁可多读/]
  const hits = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue }
      if (!e.name.endsWith('.js')) continue
      const lines = readFileSync(p, 'utf8').split('\n')
      lines.forEach((l, i) => { if (PRIMITIVE_RES.some(re => re.test(l))) hits.push(`${p}:${i + 1}: ${l.trim().slice(0, 60)}`) })
    }
  }
  walk('src')
  assert('组一：src/ 全仓无「必须读取完整/素材宁可多读」两原语（task-02 改写后绝迹）', hits.length === 0, hits.slice(0, 3).join('\n'))
}

// ── 组二：包形态 + 槽位 ──
{
  const g = buildReviewMaterialPack('grill-first', { designDigest: '要点', fileList: ['a.js'], crossPoints: [{ title: 'T1' }], repoRoot: '.' })
  assert('组二：grill-first 含基准面头+要点+清单+交叉点', g.includes('基准面') && g.includes('要点') && g.includes('- a.js') && g.includes('1. T1'))
  assert('组二：grill-first 无交叉点→列缺件提示', buildReviewMaterialPack('grill-first', {}).includes('cannot_verify'))
  const p = buildReviewMaterialPack('plan-review', { hardConstraints: [{ id: 'H1', text: '零回归' }], planDelta: [{ id: 'H1', status: '一致' }] })
  assert('组二：plan-review 硬约束+差量', p.includes('H1') && p.includes('零回归') && p.includes('一致'))
  const q = buildReviewMaterialPack('execute-qa', { diffSummary: { files: ['src/x.js'], stat: '+1 -1' }, designContent: '# D\n## 非目标\n- 不做Q\n', checklist: ['验收1'] })
  assert('组二：execute-qa diff+热区+清单', q.includes('src/x.js') && q.includes('### 非目标') && q.includes('验收1'))
  const r = buildReviewMaterialPack('re-review', { priorFindingsMd: 'P1', fixDiff: '+fix' })
  assert('组二：re-review findings+fixDiff', r.includes('P1') && r.includes('+fix'))
  assert('组二：未知 stage → 空串', buildReviewMaterialPack('nope', {}) === '')
  assert('组二：超限截断（12000 字符封顶）', buildReviewMaterialPack('grill-first', { designDigest: 'x'.repeat(20000) }).includes('截断'))
  assert('组二：extractDesignHotZone 节抽取与无命中空串', extractDesignHotZone('# D\n## 非目标\n- A\n## 其他\n- B\n', ['非目标']).includes('- A') && extractDesignHotZone('', ['非目标']) === '')

  // 槽位：prompt.js 两分支都 join {REVIEW_MATERIALS}；stage-review.js（再审渲染体）不含该槽字面量
  const promptSrc = readFileSync('src/run/prompt.js', 'utf8')
  const joins = promptSrc.split("'{REVIEW_MATERIALS}'").length - 1
  assert('组二：prompt.js 正常链+降级分支均 join {REVIEW_MATERIALS}（≥2 处）', joins >= 2, `实际 ${joins} 处`)
  const srSrc = readFileSync('src/stage-review.js', 'utf8')
  assert('组二：两槽互斥——stage-review.js 不含 {REVIEW_MATERIALS} 槽', !srSrc.includes('{REVIEW_MATERIALS}'))
}

// ── 组二补：extractSnippets/extractDiffSummary 导出面 ──
{
  const snip = extractSnippets('.', [{ file: 'package.json', from: 1, to: 3 }])
  assert('组二补：extractSnippets 行号锚渲染', snip.includes('package.json:1-3') && snip.includes('`package.json:1-3`') === false ? snip.includes('1	{') : snip.includes('1	{') && snip.includes('package.json:1-3'))
  assert('组二补：extractSnippets 不可读文件跳过（空串）', extractSnippets('.', [{ file: 'no-such.js' }]) === '')
  const ds = await extractDiffSummary({ cwd: '.', changeName: null, withStat: false })
  assert('组二补：extractDiffSummary 名单返回（数组形态）', Array.isArray(ds.files))
}

// ── 组三：再审排他语 ──
{
  const md = renderPriorRoundFindingsMd({ priorRunId: 'r1', verdicts: 'pass', openFindings: ['P1: 修我'], passItems: ['A 已实证'] })
  assert('组三：排他语在场（唯一基准面）', md.includes('唯一基准面'))
  assert('组三：包外查证口径在场（定向列明+禁全量）', md.includes('包外查证口径') && md.includes('禁全量扫读'))
  assert('组三：cannot_verify 兜底在场', md.includes('cannot_verify'))
  assert('组三：未决项+pass 面渲染', md.includes('P1: 修我') && md.includes('A 已实证'))
  assert('组三：collected 空 → 空串（向后兼容）', renderPriorRoundFindingsMd(null) === '')
}

// ── 组四：CLI 注入接线（2026-09-19-review-material-cli-wiring / FR-03 / D-003）──
// 装配函数三形态非空（fixture）＋主代理半边留位 ＋ prompt.js 接线源码钉 ＋ 三模板槽钉。
{
  const { assembleStageReviewMaterials } = await import('../src/review-material-pack.js')
  const tmp = mkdtempSync(join(tmpdir(), 'rmpack-wire-'))
  const fixtureChange = 'fixture-change'
  mkdirSync(join(tmp, 'changes', fixtureChange), { recursive: true })
  const designMd = [
    '# D', '',
    '## 背景', '成本复盘背景BG', '',
    '## 设计目标', '目标G1', '',
    '## 全局硬约束（绑定所有 task）', '',
    '1. **版本底线**：纯 JavaScript（ESM）', '',
    '2. 跨平台兼容', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | `src/a.js` | x |', '| 新增 | NEW:src/b.js | y |', '',
    '## 非目标', '- 不做Q', '',
    '## 兼容策略', '- 零回归', '',
  ].join('\n')
  writeFileSync(join(tmp, 'changes', fixtureChange, 'design.md'), designMd)
  const decisionsMd = [
    '# 决策记录', '',
    '## D-001@v1: 兜底决策甲', '- type: architecture', '- priority: P0', '- status: accepted', '',
    '## D-002@v1: 拒绝决策乙', '- type: architecture', '- priority: P1', '- status: rejected', '',
  ].join('\n')

  // grill-first：非空（digest 章节索引+背景/目标、fileList）＋交叉点留位
  const g = await assembleStageReviewMaterials({ stage: 'grill-first', cwd: tmp, changeName: fixtureChange, specBase: tmp })
  assert('组四：grill-first 非空注入——章节索引+背景/目标+文件清单', g.length > 0 && g.includes('章节行号索引') && g.includes('L3 ## 背景') && g.includes('成本复盘背景BG') && g.includes('目标G1') && g.includes('- src/a.js') && g.includes('- src/b.js') && !g.includes('NEW:src/b.js'))
  assert('组四：grill-first 交叉点留位（不预填，缺件提示形态）', g.includes('五个交叉点') && g.includes('主代理未点名'))

  // plan-review：design 硬约束节命中
  const p = await assembleStageReviewMaterials({ stage: 'plan-review', cwd: tmp, changeName: fixtureChange, specBase: tmp })
  assert('组四：plan-review 非空注入——硬约束行（design 节优先）', p.length > 0 && p.includes('HC-1') && p.includes('版本底线') && p.includes('HC-2') && !p.includes('D-001@v1'))
  assert('组四：plan-review 差量留位（不预填，缺件提示形态）', p.includes('plan 差量') && p.includes('主代理未提供差量'))

  // plan-review fallback：design 无「全局硬约束」节 → decisions.md accepted P0/P1 兜底（rejected 排除）
  mkdirSync(join(tmp, 'changes', fixtureChange, 'bak'), { recursive: true })
  writeFileSync(join(tmp, 'changes', fixtureChange, 'bak', 'design.md.bak'), designMd)
  writeFileSync(join(tmp, 'changes', fixtureChange, 'design.md'), designMd.split('## 全局硬约束（绑定所有 task）')[0] + '## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n')
  writeFileSync(join(tmp, 'changes', fixtureChange, 'decisions.md'), decisionsMd)
  const p2 = await assembleStageReviewMaterials({ stage: 'plan-review', cwd: tmp, changeName: fixtureChange, specBase: tmp })
  assert('组四：plan-review 缺节兜底——decisions accepted P0 命中、rejected 排除', p2.length > 0 && p2.includes('D-001@v1') && p2.includes('兜底决策甲') && !p2.includes('D-002@v1'))
  writeFileSync(join(tmp, 'changes', fixtureChange, 'design.md'), designMd)

  // execute-qa：热区+验收清单（diff 名单委托既有组二补覆盖；fixture 非 git 仓→名单空不炸）
  const q = await assembleStageReviewMaterials({ stage: 'execute-qa', cwd: tmp, changeName: fixtureChange, specBase: tmp })
  assert('组四：execute-qa 非空注入——热区+验收清单', q.length > 0 && q.includes('### diff 摘要') && q.includes('### design 热区') && q.includes('- 不做Q') && q.includes('### 验收清单') && q.includes('- [ ] '))

  // stat 形态回归钉（dogfood 咬出 [object Object] 后补）：真实 git 下 stat 为纯文本
  const dsStat = await extractDiffSummary({ cwd: '.', changeName: null })
  assert('组四：diff stat 无 [object Object]（safeGit 取 .value）', !String(dsStat.stat).includes('[object Object]'))

  // 边界：未知 stage / 素材全缺 / 参数缺失 → 空串
  assert('组四：未知 stage → 空串', await assembleStageReviewMaterials({ stage: 'nope', cwd: tmp, changeName: fixtureChange, specBase: tmp }) === '')
  assert('组四：素材全缺（change 不存在）→ 空串', await assembleStageReviewMaterials({ stage: 'grill-first', cwd: tmp, changeName: 'no-such-change', specBase: tmp }) === '')
  assert('组四：参数缺失（changeName null）→ 空串', await assembleStageReviewMaterials({ stage: 'execute-qa', cwd: tmp, changeName: null, specBase: tmp }) === '')

  // 接线源码钉：主链 join 装配结果；降级分支 join 空串保持；三模板槽在场（再审不含=组二既有钉）
  const promptSrc = readFileSync('src/run/prompt.js', 'utf8')
  assert('组四：prompt.js 主链 join 目标为装配结果（非空注入接线）', promptSrc.includes('assembleStageReviewMaterials') && promptSrc.includes(".split('{REVIEW_MATERIALS}').join(reviewMaterialsMd)"))
  assert('组四：降级分支 join 空串保持', promptSrc.includes(".split('{REVIEW_MATERIALS}').join('')"))
  const slotOk = ['src/stages/brainstorm.js', 'src/stages/plan.js', 'src/stages/execute.js'].every(f => readFileSync(f, 'utf8').includes('{REVIEW_MATERIALS}'))
  assert('组四：三阶段模板含 {REVIEW_MATERIALS} 槽', slotOk)

  cleanupTmp(tmp)
}

console.log(`\n✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) process.exit(1)
