/**
 * review-material-pack.js — 评审材料包（2026-09-19-review-material-pack / D-001~D-002）
 *
 * 结构病根（2026-09-19 成本复盘实证：评审 ~200x 信息放大）：每次独立评审从零重建仓库认知，
 * 根因是阶段 prompt 的必读清单（旧 brainstorm.js :417/:424 的两条全读指令——本变更 task-02
 * 已删）优先级压过增量回灌块。本模块是材料包的组装单点：
 *   四阶段包形态（D-002）：
 *     grill-first  = designDigest + fileList + crossPoints[≤5] + snippets[]（点名源码片段）
 *     plan-review  = hardConstraintDelta[]（plan 相对 design 硬约束的差量）
 *     execute-qa   = diffSummary + designHotZone + checklist
 *     re-review    = priorFindings + fixDiff（经 {PRIOR_REVIEW_FACTS} 复审基线段渲染，非本模块槽）
 *   槽位分权（design Wave 1.1）：三阶段走 {REVIEW_MATERIALS}；再审走 {PRIOR_REVIEW_FACTS}
 *   （stage-review.js renderPriorRoundFindingsMd 排他语化——task-02）且模板不含本槽。
 *
 * 基准面语义（D-004，由 task-02 写进 prompt）：包是必答基准面非禁读清单——包外可定向查证
 * 但须列明、禁全量扫读；评审者自检「包不足→cannot_verify＋列缺件」。
 *
 * 纯函数为主；extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（verify-postcheck.js:1113
 * 既有锚点优先级 actualBaseHash/baselineCommit＞baseHash——禁独立解 base，防重蹈 baseline
 * 同步文件误入坑，fact-face-checkpoint-pollution 同族）。
 */
import { readFileSync } from 'fs'
import { join } from 'path'

/** 材料包渲染上限（防病态体量：包本身不能成为新的全量扫读面） */
const PACK_MAX_CHARS = 12000
const SNIPPET_MAX_CHARS = 2400

/** 截断工具：超限加省略号注记 */
function clamp(text, max, label) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(0, max) + `\n…（${label} 超 ${max} 字符截断——需全文时定向查证并列明）`
}

/**
 * design 热区抽取（execute.js:979-1023 designHotzone 先例泛化）：按节名抽取指定 section 的
 * 正文（## 标题起、下一 ## 止）。sections 缺省取评审最常用的两节（非目标/兼容策略）。
 * @returns {string} 「### <节名>\n<body」拼接；无命中返回空串。
 */
export function extractDesignHotZone(designContent, sections = ['非目标', '兼容策略']) {
  const text = String(designContent || '')
  if (!text) return ''
  const parts = []
  for (const name of sections) {
    const re = new RegExp(`^#{2,3}\\s*[^\\n]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*$`, 'm')
    const heading = text.match(re)
    if (!heading) continue
    const start = heading.index + heading[0].length
    const rest = text.slice(start)
    const next = rest.match(/^#{2,3}\s/m)
    const body = (next ? rest.slice(0, next.index) : rest).trim()
    if (body) parts.push(`### ${name}\n${body}`)
  }
  return parts.join('\n\n')
}

/**
 * diff 摘要抽取（base 解序对齐既有基建）：文件名单委托 resolveVerifyChangedFiles（锚点优先级
 * actualBaseHash/baselineCommit＞baseHash 由该函数内部解析），±行数经 git diff --stat 叠加。
 * namesOnly 版不跑 --stat（评审只要名单时省一次 git）。
 * @returns {{ files: string[], stat: string }} stat 为 --stat 尾段文本（best-effort，失败空串）。
 */
export async function extractDiffSummary({ cwd, changeName, specBase, withStat = true, statText = null }) {
  const { resolveVerifyChangedFiles } = await import('./verify-postcheck.js')
  const files = resolveVerifyChangedFiles(cwd, changeName, null, { specBase }) || []
  // QA Gap 3 修正：stat 窗口对齐文件名单（按名单限定路径跑工作树口径 --stat，伪装 HEAD~1 三元已除）；
  // 多提交窗口的精确 stat 由主代理组包时显式传入 statText 覆盖（buildReviewMaterialPack 的
  // diffSummary.stat 消费同一字符串）——base 解序仍单点在 resolveVerifyChangedFiles 内部。
  let stat = statText != null ? String(statText) : ''
  if (statText == null && withStat && files.length > 0) {
    try {
      const { safeGit } = await import('./git-helper.js')
      const out = safeGit(cwd, ['diff', '--stat', 'HEAD', '--', ...files], { trim: false })
      stat = String(out || '')
    } catch { /* stat best-effort：失败只降级为名单 */ }
  }
  return { files, stat: clamp(stat, 2000, 'diff --stat') }
}

/**
 * 源码片段抽取（点名文件×行窗）：crossPoints 的 snippets 组装器。
 * @param {Array<{file: string, from?: number, to?: number}>} anchors
 * @returns {string} 「`file:from-to`\n```…```」拼接（每片段独立 clamp）。
 */
export function extractSnippets(repoRoot, anchors = []) {
  const parts = []
  for (const a of anchors.slice(0, 8)) {
    if (!a || !a.file) continue
    try {
      const lines = readFileSync(join(repoRoot, a.file), 'utf8').split('\n')
      const from = Math.max(1, Number(a.from) || 1)
      const to = Math.min(lines.length, Number(a.to) || from + 29)
      const body = lines.slice(from - 1, to).map((l, i) => `${from + i}\t${l}`).join('\n')
      parts.push('`' + a.file + ':' + from + '-' + to + '`\n' + clamp(body, SNIPPET_MAX_CHARS, a.file))
    } catch { /* 不可读文件跳过（评审者自检会列缺件） */ }
  }
  return parts.join('\n\n')
}

/**
 * 四阶段材料包组装（纯渲染，不落盘）。
 * @param {'grill-first'|'plan-review'|'execute-qa'|'re-review'} stage
 * @param {object} inputs 按 stage 取用：
 *   grill-first: { designDigest, fileList[], crossPoints[{title,anchors[{file,from,to}]}], repoRoot }
 *   plan-review: { hardConstraints[{id,text}], planDelta[{id,status,note}] }
 *   execute-qa:  { diffSummary{files,stat}, designContent, checklist[] }
 *   re-review:   { priorFindingsMd, fixDiff } （提示：re-review 经 {PRIOR_REVIEW_FACTS} 渲染，
 *                本函数产出仅供该渲染体拼装——不进 {REVIEW_MATERIALS} 槽，槽位分权铁律）
 * @returns {string} 注入文本（含基准面语义头）
 */
export function buildReviewMaterialPack(stage, inputs = {}) {
  const header = '## 评审材料包（基准面——checklist 逐条只对本包作答；包外定向查证合法但须列明，禁全量扫读；包不足以作答时 cannot_verify＋列缺件）\n'
  let body = ''
  if (stage === 'grill-first') {
    const pts = (inputs.crossPoints || []).slice(0, 5).map((p, i) => `${i + 1}. ${p.title}${p.anchors && p.anchors.length ? '\n' + extractSnippets(inputs.repoRoot || '.', p.anchors) : ''}`)
    body = [
      '### design 要点', clamp(inputs.designDigest || '', 4000, 'designDigest'),
      '### 文件清单', (inputs.fileList || []).map(f => '- ' + f).join('\n') || '（无）',
      '### 五个交叉点（主代理点名）', pts.join('\n') || '（无——主代理未点名，评审者按 cannot_verify 列缺件）',
    ].join('\n\n')
  } else if (stage === 'plan-review') {
    const hc = (inputs.hardConstraints || []).map(h => `- [${h.id}] ${h.text}`).join('\n')
    const delta = (inputs.planDelta || []).map(d => `- [${d.id}] ${d.status}${d.note ? '——' + d.note : ''}`).join('\n')
    body = ['### design 硬约束', hc || '（无）', '### plan 差量（逐约束判定：一致/偏离/未覆盖）', delta || '（无——主代理未提供差量，评审者按 cannot_verify 列缺件）'].join('\n\n')
  } else if (stage === 'execute-qa') {
    body = [
      '### diff 摘要', (inputs.diffSummary && inputs.diffSummary.files || []).map(f => '- ' + f).join('\n') || '（无）',
      inputs.diffSummary && inputs.diffSummary.stat ? '```diff\n' + inputs.diffSummary.stat + '\n```' : '',
      '### design 热区（CLI 抽取）', extractDesignHotZone(inputs.designContent || '') || '（无命中节）',
      '### 验收清单', (inputs.checklist || []).map(c => '- [ ] ' + c).join('\n') || '（无）',
    ].filter(Boolean).join('\n\n')
  } else if (stage === 're-review') {
    body = ['### 上一轮 findings', clamp(inputs.priorFindingsMd || '', 4000, 'priorFindings'), '### 对应修复 diff', clamp(inputs.fixDiff || '', 4000, 'fixDiff')].join('\n\n')
  } else {
    return ''
  }
  return clamp(header + '\n' + body, PACK_MAX_CHARS, '材料包')
}
