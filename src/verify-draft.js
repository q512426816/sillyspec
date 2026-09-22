/**
 * verify-draft.js — verify 填槽制（r5l-forensic-verdict 方案 3 / 评审护栏#2，v2 件二）。
 *
 * 背景（R5-L 桶②）：verify-result.md 被读写 14 次、每次 python-heredoc 整份回填一次全量重发
 * （两次各挂起 7 分钟）；模板 29KB 里 CLI 已能机械预填大部分。--draft 模式把四节 CLI 可算部分
 * 预填成完整句子（任务完成度 summarizeTaskCompletion / 风险等级 resolveChangeRisk（detectChangeRisk
 * 散文词表已退役 D-008）/ 测试结果 P2 test-ledger→质量扫描记录（与 verify 门对账同源同优先级）/
 * 决策追踪 buildDecisionChainMatrix），agent 只填三处显式 <!--AGENT:--> 槽——工作流收敛为
 * draft→填槽→复核，verify-result 读写 ≤3 次。
 *
 * 承重件 = --done 篡改门禁（护栏#2：守卫必须是验收侧的机制，永远不是生成侧的劝说）：
 *   - 机器预填段以 MACHINE-DRAFT begin/end 注释对包裹，begin 标记内嵌该段内容的 sha256；
 *   - sidecar（.runtime/verify-draft-<change>.json）记录各段哈希与生成时点；
 *   - verify --done 对账（checkDraftIntegrity）：标记被删 / 内容哈希失配 → 阻断回滚——
 *     heredoc 整份重写会同时破坏两者，无论 Write 可用与否均免疫（机制修法，不依赖劝说）；
 *   - 确要改机器段：`verify-probes --change <名> --amend-draft` 重锚哈希并留痕
 *     （sidecar amendments 审计：时点 + 改动段清单）。
 *
 * 信任边界：sidecar 与骨架同在 agent 可写空间，伪造需主动协同造假——与 verify-facts.json /
 * 质量扫描记录同级威胁模型（本门拦的是 heredoc 习惯性整份重写与意外覆盖，不是对抗性攻击）。
 * 纯 --init（无 --draft）路径零变化；无 sidecar → 门禁 not-applicable（存量变更零红）。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'

const sha256 = (s) => createHash('sha256').update(String(s).replace(/\r\n/g, '\n')).digest('hex')

const MARK_BEGIN = /^<!--\s*MACHINE-DRAFT:([\w.-]+):([0-9a-f]{64}):begin.*-->\s*$/
const MARK_END = /^<!--\s*MACHINE-DRAFT:([\w.-]+):end.*-->\s*$/
const AMEND_CMD = 'sillyspec verify-probes --change <变更名> --amend-draft'

/** sidecar 路径（.runtime 下，与质量扫描记录/探针回执同族） */
export function verifyDraftSidecarPath(runtimeRoot, changeName) {
  return join(runtimeRoot, `verify-draft-${changeName}.json`)
}

/**
 * 构建机器段：四节 CLI 可算部分的完整句子（纯函数——材料由调用方备齐，可测）。
 * 各段 key 稳定（指纹与 sidecar 对账键）；材料缺不到时给「降级说明句」而非空段——
 * 机器段的降级也要是完整句子（读报告的人不需要反查工具行为）。
 */
export function buildDraftSections({ summarize, risk, testResult, decisionChain }) {
  const sections = []
  // ── 任务完成度（summarizeTaskCompletion 同源）──
  sections.push({
    key: 'task-completion',
    body: [
      summarize.report,
      `- 总任务：${summarize.total}；已完成（review verdict 口径）：${summarize.completed}`,
      summarize.pending && summarize.pending.length > 0
        ? `- 未完成：${summarize.pending.map((p) => `${p.id}（${p.reason || '未勾'}）`).join('、')}`
        : '- 未完成：无',
    ].filter(Boolean).join('\n'),
  })
  // ── 变更风险等级（resolveChangeRisk 同源，evaluateConclusionDraft 先例口径）──
  sections.push({
    key: 'risk-level',
    body: risk
      ? [
          `- 机器判级：tier=${risk.tier}${risk.explicit ? `（design.md 显式声明 = ${risk.level}——显式声明已入判定）` : '（design.md 无显式 risk_level 声明）'}`,
          risk.evidenceRequired
            ? `- ⚠️ 命中 evidence:true 声明危险面（${(risk.hitPrefixes || []).join('、')}）——integration/deployment-critical 档：需集成证据链（回执槽 + Runtime Evidence），下方「集成验证回执」为例外人工槽`
            : '- 未命中 evidence:true 声明危险面——无集成证据链硬要求（「集成验证回执」节机器判「无」）',
          '- 判级输入：design 文件清单 × blast 声明（同 verify 门 evaluateConclusionDraft 口径；判定被新事实推翻时在「审查叙述」槽说明）',
        ].join('\n')
      : '- 机器判级降级：无法解析 design 文件清单/blast 声明（无 design.md 或清单为空）——按审查叙述确认实际等级（局部修补通常 doc-only / unit-sufficient）',
  })
  // ── 测试结果（P2 账本 → 质量扫描记录，与 verify 门对账同源同优先级）──
  sections.push({
    key: 'test-result',
    body: testResult
      ? [
          `- ${testResult.source === 'ledger' ? '♻️ P2 三键账本复用（代码×测试面×环境全等）' : '♻️ noAI 质量扫描实测记录复用（代码指纹匹配）'}：\`${testResult.command}\` — ${testResult.status === 'passed' ? '通过' : testResult.status}`,
          `- 实测于 ${testResult.ranAt}${testResult.durationMs != null ? `，耗时 ${Math.round(testResult.durationMs / 1000)}s` : ''}${testResult.total != null ? `，${testResult.total} 断言` : ''}`,
          '- verify `--done` 门与本文对账同源（P2 账本 > 扫描记录 > 亲跑）——正文与门结论冲突时以门为准并在此说明差异',
        ].join('\n')
      : '- 本 draft 生成时点无 P2 账本/质量扫描记录（verify 步「运行测试和质量扫描」尚未跑）——该步实测后门对账自动落账，此处以门结论为准（无需手改本段）',
  })
  // ── 决策追踪（buildDecisionChainMatrix 机械半边）──
  sections.push({
    key: 'decision-chain',
    body: decisionChain && decisionChain.rows && decisionChain.rows.length > 0
      ? [
          `- 决策链机械半边：${decisionChain.decisionCount} 条决策 × ${decisionChain.taskCount} 张 task 卡（D→FR→Task 自 decisions.md × tasks/*.md frontmatter 构建）`,
          '| 决策 ID | FR | Task | Evidence | 状态 |',
          '|---|---|---|---|---|',
          ...decisionChain.rows,
          '- Evidence / 状态两列是人工判断（机器不代笔）——逐格复核，未闭环行在「审查叙述」槽标注风险',
        ].join('\n')
      : '- 本变更无 decisions.md（或零决策条目）——决策追踪无机器面对账，如执行期做过真实取舍在「审查叙述」槽说明',
  })
  return sections
}

/** 段 key → 骨架标题关键词（骨架标题行包含这些词即命中该段） */
function sectionKeyword(key) {
  switch (key) {
    case 'task-completion': return '任务完成度'
    case 'risk-level': return '变更风险等级'
    case 'test-result': return '测试结果'
    case 'decision-chain': return '决策追踪矩阵'
    default: return key
  }
}

/**
 * draft 化主入口：骨架文本 → draft 文本（机器段替换 + 三 AGENT 槽标注 + 顶部模式横幅）。
 * 纯文本变换（落盘与 sidecar 归 applyDraftMode）。
 * @returns {{ text: string, applied: string[], slots: number }}
 */
export function transformSkeletonToDraft(skeletonText, sections) {
  let text = skeletonText
  const applied = []
  for (const sec of sections) {
    const kw = sectionKeyword(sec.key)
    const headRe = new RegExp(`^(## [^\\n]*${kw}[^\\n]*\\n)([\\s\\S]*?)(?=^## |\\n*$)`, 'm')
    const m = text.match(headRe)
    if (!m) continue
    const body = m[2]
    // 幂等闸：段内已有 MACHINE-DRAFT 标记或已非 TODO 占位（手写正文）→ 不动
    if (body.includes('MACHINE-DRAFT:')) continue
    if (!/<!--TODO|<待填|<!-- 结论=|<!--\s*无 cannot_verify/.test(body)) continue
    const wrapped = [
      `<!-- MACHINE-DRAFT:${sec.key}:${sha256(sec.body)}:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：${AMEND_CMD} 留痕重锚 -->`,
      sec.body,
      `<!-- MACHINE-DRAFT:${sec.key}:end -->`,
      '',
    ].join('\n')
    text = text.slice(0, m.index) + m[1] + wrapped + text.slice(m.index + m[0].length)
    applied.push(sec.key)
  }
  // 三 AGENT 槽标注（幂等：已有标注零改动）——结论枚举槽行契约不动（gate 消费面）
  if (!text.includes('<!--AGENT:')) {
    text = text
      .replace(/(结论枚举：`<待填：三选一>`)/, '<!--AGENT:槽1/3 结论枚举——替换上行占位，槽行格式勿改（gate 判定消费面） -->\n$1')
      .replace(/(\| <待填：env-blocked \/ manual-acceptance \/ db-script \/ other> \| <待填：移交条目> \| <待填：复跑\/验收条件> \|)/, '<!--AGENT:槽2/3 移交项——按需增行；结论=PASS/FAIL 时本表写「无」 -->\n$1')
      .replace(/(## 设计一致性 \[层：人工判断\]\n)(<!--TODO[^>]*-->)/, '$1<!--AGENT:槽3/3 审查叙述——设计偏差（无偏差显式写「一致」）+ 技术债务叙述（探针 1 统计已机器预填在「技术债务」节）；替换下方 TODO 注释为正文 -->\n$2')
  }
  // 顶部横幅（draft 模式可见性：读写 ≤3 次的工作流说明——机制不带劝说，只说事实）
  if (!text.includes('<!-- VERIFY-DRAFT-MODE -->') && applied.length > 0) {
    const banner = [
      '<!-- VERIFY-DRAFT-MODE -->',
      '> **填槽模式**：机器段（MACHINE-DRAFT 标记包裹，篡改会被 --done 拒收）之外，你只填三处',
      '> AGENT 槽：①结论枚举 ②移交项 ③审查叙述。工作流 = 本 draft → 填槽 → `--done` 复核，',
      '> verify-result 读写 ≤3 次。改机器段唯一通道：`' + AMEND_CMD + '`（留痕重锚）。',
      '',
    ].join('\n')
    text = text.replace(/(^# [^\n]*\n)/, `$1\n${banner}`)
  }
  return { text, applied, slots: 3 }
}

/**
 * draft 模式落盘 + sidecar 记账（--init --draft 消费）。
 * @returns {{ applied: string[], sidecarPath: string }|null} 无可替换段（非骨架态/已 draft）→ null
 */
export function applyDraftMode({ mdPath, changeName, runtimeRoot, sections }) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return null }
  const { text: next, applied } = transformSkeletonToDraft(text, sections)
  if (applied.length === 0) return null
  try {
    writeAtomicSync(mdPath, next)
  } catch (e) {
    console.warn(`⚠️ verify draft 落盘失败（fail-soft，骨架保持原态）: ${e && e.message ? e.message : e}`)
    return null
  }
  const sidecar = { schemaVersion: 1, change: changeName, generatedAt: new Date().toISOString(), sections: {}, amendments: [] }
  for (const sec of sections) {
    if (applied.includes(sec.key)) sidecar.sections[sec.key] = { hash: sha256(sec.body) }
  }
  const sidecarPath = verifyDraftSidecarPath(runtimeRoot, changeName)
  try { writeAtomicSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n') } catch { /* sidecar 失败 → 门禁 not-applicable（降级放行，不阻断） */ }
  return { applied, sidecarPath }
}

/**
 * --done 篡改门禁（承重件，验收侧）：sidecar 在案时逐段对账。
 * @returns {{ applicable: boolean, ok: boolean, violations: string[] }}
 *   not-applicable（无 sidecar）→ 放行（存量/非 draft 变更零红）；
 *   违规 = 标记被删（含整段删除）/ 内容哈希失配（整份重写必中）。
 */
export function checkDraftIntegrity({ mdPath, changeName, runtimeRoot }) {
  const sidecarPath = verifyDraftSidecarPath(runtimeRoot, changeName)
  let sidecar = null
  try { sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8')) } catch { return { applicable: false, ok: true, violations: [] } }
  if (!sidecar || sidecar.schemaVersion !== 1 || !sidecar.sections) return { applicable: false, ok: true, violations: [] }
  let text = ''
  try { text = readFileSync(mdPath, 'utf8') } catch {
    return { applicable: true, ok: false, violations: ['verify-result.md 不可读（draft sidecar 在案）'] }
  }
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const violations = []
  const openByKey = new Map()
  const contentByKey = new Map()
  let current = null
  for (const line of lines) {
    const b = line.match(MARK_BEGIN)
    if (b) { current = { key: b[1], hash: b[2] }; openByKey.set(b[1], current); contentByKey.set(b[1], []); continue }
    const e = line.match(MARK_END)
    if (e) { current = null; continue }
    if (current) contentByKey.get(current.key).push(line)
  }
  for (const [key, rec] of Object.entries(sidecar.sections)) {
    if (!openByKey.has(key)) {
      violations.push(`机器段「${key}」的 MACHINE-DRAFT 标记缺失（被删除或整份重写）——${fixLine(key)}`)
      continue
    }
    const actual = sha256((contentByKey.get(key) || []).join('\n'))
    if (actual !== rec.hash) {
      violations.push(`机器段「${key}」内容与指纹失配（被改写）——${fixLine(key)}`)
    } else if (openByKey.get(key).hash !== rec.hash) {
      // 内容未动但标记哈希与 sidecar 不一致 = 标记被手工重锚而未经 --amend-draft 审计
      violations.push(`机器段「${key}」标记指纹与 sidecar 台账不一致（未经 --amend-draft 的手工重锚）——${fixLine(key)}`)
    }
  }
  return { applicable: true, ok: violations.length === 0, violations }
}

function fixLine(key) {
  return `还原机器段原文，或确要修改时跑 ${AMEND_CMD} 留痕重锚（段键 ${key}）`
}

/**
 * --amend-draft：对 md 中现存标记段按**当前内容**重锚哈希（标记与 sidecar 同步刷新），
 * sidecar 追加 amendment 审计（时点 + 段清单）。返回重锚段键（空 = 无可重锚标记）。
 */
export function amendDraftMarkers({ mdPath, changeName, runtimeRoot }) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return [] }
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const contentByKey = new Map()
  let current = null
  for (const line of lines) {
    const b = line.match(MARK_BEGIN)
    if (b) { current = b[1]; contentByKey.set(current, []); continue }
    const e = line.match(MARK_END)
    if (e) { current = null; continue }
    if (current) contentByKey.get(current).push(line)
  }
  const keys = [...contentByKey.keys()]
  if (keys.length === 0) return []
  // 重写 begin 标记（按当前内容哈希）
  const next = lines.map((line) => {
    const b = line.match(MARK_BEGIN)
    if (!b) return line
    const content = (contentByKey.get(b[1]) || []).join('\n')
    return `<!-- MACHINE-DRAFT:${b[1]}:${sha256(content)}:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：${AMEND_CMD} 留痕重锚 -->`
  }).join('\n')
  try { writeAtomicSync(mdPath, next) } catch (e) {
    console.warn(`⚠️ amend-draft 重锚落盘失败: ${e && e.message ? e.message : e}`)
    return []
  }
  // sidecar：合并既有 + amendment 审计
  const sidecarPath = verifyDraftSidecarPath(runtimeRoot, changeName)
  let sidecar = { schemaVersion: 1, change: changeName, generatedAt: new Date().toISOString(), sections: {}, amendments: [] }
  try { sidecar = { ...sidecar, ...JSON.parse(readFileSync(sidecarPath, 'utf8')) } } catch { /* 无既有 → 新立 */ }
  for (const k of keys) sidecar.sections[k] = { hash: sha256((contentByKey.get(k) || []).join('\n')) }
  sidecar.amendments = [...(sidecar.amendments || []), { at: new Date().toISOString(), keys }]
  try { writeAtomicSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n') } catch { /* 审计失败不回滚重锚 */ }
  return keys
}
