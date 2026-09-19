/**
 * 评审材料包验收钉（2026-09-19-review-material-pack / FR-03 / D-003）
 *
 * 三断言组：
 *   组一（机械钉）：src/ 全仓无「必须读取完整」「素材宁可多读」两原语（改写前命中
 *     brainstorm.js:417/:424，task-02 后应绝迹；test/ 不在改写面——如 test 内出现属测试
 *     自身文案，白名单本文件）。
 *   组二（包形态）：buildReviewMaterialPack 四 schema 渲染（基准面头/截断/空 inputs 兜底）；
 *     extractDesignHotZone 节抽取；两槽互斥——prompt.js 正常链与降级分支都 join
 *     {REVIEW_MATERIALS}，再审模板（stage-review.js 派发面）不含该槽。
 *   组三（排他语）：renderPriorRoundFindingsMd 渲染体含「唯一基准面」「包外查证口径」。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildReviewMaterialPack, extractDesignHotZone, extractSnippets, extractDiffSummary } from '../src/review-material-pack.js'
import { renderPriorRoundFindingsMd } from '../src/stage-review.js'

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

console.log(`\n✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) process.exit(1)
