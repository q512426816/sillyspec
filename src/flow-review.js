/**
 * flow-review.js — 轻量变更独立评审（2026-09-25-thin-review-slice）。
 *
 * 定档哲学：危险证据累积制，体积/文件数出局（撞实验 F-02 实证——几行 ref 清零的小改是 P1，
 * 30 文件的改名无风险）。信号五路，任一命中即需评审；缺省要评审、豁免要多证并举：
 *   ① 高危交付语义词（一票升级，任何信号压不住——唯⑤声明通道 --no-review 显式豁免除外；
 *      实现即此优先序：--no-review 先判，fr-governance-sweep 头注释清偿）——at-least-once/
 *      exactly-once/不丢失/
 *      不重复/串台类承诺是 P1 高发区（R15-F-01 即承诺-实现落差）；
 *   ② 盲维四问实质作答——设计记录「边界与并发」槽有非「不适用」开头的作答=该维风险面存在
 *      （作答即信号：没有那个维度就不会写出实质内容；adopted 无槽设计退化为机制词全文扫描）；
 *   ③ 交付 diff 原语——冻结 patch 里的并发/冲突/游标/取消类原语（物证，不依赖自述）；
 *   ④ 决策密度——edit_ratio 超阈（amend 改写比例=真实取舍密度的机械代理）；
 *   ⑤ 声明通道——--review / --no-review 一票（上下文最全的人直接表态）。
 *
 * 豁免 ≠ 免责：全信号不命中而豁免的变更按 1/4 定额抽查采样（确定性哈希分桶），采样命中照评
 * 并进遥测——误豁免率可测量可校准（先例：review-dispatch shadow 影子期 N=10 转正判据）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DESIGN_QUESTIONS as DESIGN_QUESTIONS_FALLBACK } from './flow-draft.js'

/** 高危交付语义承诺词（一票升级）。2026-09-25-platform-feedback-batch2 D 收敛：移除「幂等」
 * （实现手段非交付语义，由 diff 原语面覆盖）；保留的七个词均为面向用户的交付语义承诺。 */
const PROMISE_RE = /at[- ]least[- ]once|exactly[- ]once|不丢失|不重复|不丢不重|不重不漏|串台/i

/** adopted（头脑风暴预段）design 无槽时的机制词全文扫描（窄表防误报）。 */
const MECHANISM_RE = /乱序|并发写|竞态|死锁|事务隔离|AbortSignal|多实例串|游标推进/

/** design 作答面否定语境消解（2026-10-05-review-promise-negation）：盲维第 4 问作答讨论
 * 作用域风险时，「无串台面」「不会串台」「杜绝串台」等否定短语按字面命中 PROMISE_RE 一票
 * 升级（实测：两行 console.log 的变更被定档高危起子代理评审）。「串台」是名词性风险词——
 * 承诺语态必有断言修饰（与「不丢失」类「不X」形态承诺词本质不同），否定前缀 + 短距内的
 * 「串台」先替换为占位符再扫；「解决串台」「仍有串台」等非否定语境保留一票升级。仅 design
 * 作答面应用——input/proposal/requirements 承载用户原话，承诺口径零放松。后缀否定
 * （「串台为零」）不覆盖：中文技术作答主流为前缀否定，为此加规则的复杂度不划算。
 * 整词「不串台」追加（2026-10-06-review-anchor-and-negation 实测：词表无裸「不」形态，
 * design 作答「前缀过滤不串台」字面命中一票升级）——只加三字整词不加裸「不」前缀：
 * 「不排除串台」「不排除有串台」是风险自认（保留升级），裸前缀会把它们误消解。 */
const NEGATED_CROSSTALK_RE = /(?:不会|不存在|没有|无|零|防|杜绝|避免|不含|免)[^\n]{0,8}?串台|不串台/g

/** 风险自认形态（评审 P2 修复）：「无法杜绝串台」「难免串台」「避免不了串台」否定的是
 * 「阻止」而非风险本身——语义=承认风险在场，必须保留一票升级。这类形态在场时整段保守
 * 不消解（宁可多评不可漏报）；「杜绝串台」等安全声明无引导词不受影响。 */
const RISK_ADMITTING_RE = /(?:无法|未能|没能|不可能不)[^\n]{0,8}?(?:杜绝|避免|防止|阻止|消除|防)[^\n]{0,8}?串台|(?:难免|避免不了|避不了|少不了)[^\n]{0,4}?串台/
function stripNegatedCrosstalk(text) {
  const t = String(text || '')
  if (RISK_ADMITTING_RE.test(t)) return t
  // 占位符本身禁含「串台」二字——消解产物若残留原词，PROMISE_RE 照样命中（首版实测自坑）
  return t.replace(NEGATED_CROSSTALK_RE, '〔已消解〕')
}

/** 交付 diff 危险原语（物证面）。cursor 收窄（2026-10-06-litest-p1-fixes 实测：原 \bcursor\b
 * 意图抓 DB 游标，却撞上本仓 harness 名 cursor——纯文案变更因测试断言 includes('cursor')
 * 被判危险原语起子代理评审）：只认 DB-API 方法调用 conn.cursor() 与分页协议词 next_cursor
 * 用法形态；纯名词 cursor / cursor-agent / detectCursor（本仓既有词汇）不命中。 */
const PRIMITIVE_RE = /asyncio\.(?:Lock|Event|Queue|gather)|threading\.|with_for_update|IntegrityError|ON CONFLICT|AbortSignal|AbortController|signal\.abort|\.rollback\(|since=|\.cursor\(|\bnext_cursor\b/i

/** 豁免抽查采样：确定性哈希 1/4 定额（SALT 防碰巧连坐，调表需同步核对既有夹具零碰撞）。 */
const SAMPLE_SALT = 7
export function sampleBucket(name) {
  let h = 0
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return (((h ^ SAMPLE_SALT) >>> 0) % 4) === 0
}

/** 读 AGENT 槽作答（标记行之后到下一标记/标题之前的非空行拼接）。 */
function readSlotAnswer(text, markerRe) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  let inSlot = false
  const buf = []
  for (const line of lines) {
    if (markerRe.test(line)) { inSlot = true; continue }
    if (inSlot && (/^<!--/.test(line) || /^#{1,6}\s/.test(line))) break
    if (inSlot) buf.push(line)
  }
  return buf.join('\n').trim()
}

/**
 * 读 v2 纯 markdown design 节作答（2026-10-04-thin-docs-v2）：节标题行到下一节标题之间的
 * 非空行，剥离四问原文行（DESIGN_QUESTIONS 单一源同源引入——独立字符串会被评审实证为
 * 镜像非同源）与引导行（> 开头）。空白返回 ''（调用方按未作答处理）。
 */
export function readV2SectionAnswer(text, heading, designQuestions) {
  const dq = designQuestions || DESIGN_QUESTIONS_FALLBACK
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`)
  if (start === -1) return ''
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l))
  if (end === -1) end = lines.length
  const qLines = new Set()
  for (const sec of (dq.sections || [])) {
    if (sec.heading === heading) for (const q of sec.lines) qLines.add(q)
  }
  return lines.slice(start + 1, end)
    .filter((l) => { const t = l.trim(); return t && !t.startsWith('>') && !t.startsWith('##') && !qLines.has(t) })
    .join('\n').trim()
}

/** 剥 MACHINE-DRAFT 机器段（design.md 的问题模板自带「串台」等承诺词字样——模板自污染面，
 * 扫描只看 agent 作答面；proposal/requirements 的机器段承载用户原话不剥）。 */
function stripMachineSections(text) {
  return String(text || '')
    .replace(/<!--\s*MACHINE-DRAFT:[\w.-]+:[0-9a-f]{64}:begin[^\n]*-->[\s\S]*?<!--\s*MACHINE-DRAFT:[\w.-]+:end\s*-->/g, '')
    .replace(/<!--\s*MACHINE-DRAFT:[\w.-]+:[^\n]*:begin[^\n]*-->[\s\S]*?<!--\s*MACHINE-DRAFT:[\w.-]+:end\s*-->/g, '')
}

/**
 * 剥 v2 纯 markdown 起草的问题文本行（2026-10-04-thin-docs-v2）：四问原文含「串台」承诺词
 * 与并发机制词——v1 靠 MACHINE-DRAFT 段剥离防模板自污染，v2 无标记可剥，按行删（四问
 * 原文=DESIGN_QUESTIONS 单一源逐字；节标题/引导行一并删——作答才是扫描面）。
 */
function stripV2QuestionLines(text) {
  const drop = new Set()
  for (const sec of (DESIGN_QUESTIONS_FALLBACK.sections || [])) {
    drop.add(`## ${sec.heading}`)
    for (const q of sec.lines) drop.add(q)
  }
  return String(text || '')
    .split('\n')
    .filter((l) => { const t = l.trim(); return !(drop.has(t) || t.startsWith('>')) })
    .join('\n')
}

/**
 * 危险证据定档。@returns {{required: boolean, reasons: string[], exemptEvidence: string[], sampled: boolean}}
 */
export function classifyReviewNeed({ changeDir, input = '', patchText = null, editRatio = null, reviewForce = null, change = '' }) {
  if (reviewForce === true) return { required: true, reasons: ['显式 --review 声明（一票）'], exemptEvidence: [], sampled: false }
  if (reviewForce === false) return { required: false, reasons: [], exemptEvidence: ['显式 --no-review 声明（一票）'], sampled: false }
  const reasons = []
  const exemptEvidence = []

  // ① 承诺词：input + 治理工件全文（design 只扫作答面——机器问题模板含「串台」字样属模板自污染）
  const texts = [String(input || '')]
  for (const f of ['proposal.md', 'requirements.md', 'design.md']) {
    try {
      const t = readFileSync(join(changeDir, f), 'utf8').replace(/\r\n/g, '\n')
      texts.push(f === 'design.md' ? stripNegatedCrosstalk(stripV2QuestionLines(stripMachineSections(t))) : t)
    } catch { /* 缺件由 redraft/槽位门兜底 */ }
  }
  const all = texts.join('\n')
  const hit = all.match(PROMISE_RE)
  if (hit) reasons.push(`高危交付语义承诺词命中「${hit[0]}」（一票升级）`)
  else exemptEvidence.push('无高危承诺词')

  // ② 盲维四问作答：实质作答=风险面（adopted 无槽退化机制词扫描）
  try {
    const dText = readFileSync(join(changeDir, 'design.md'), 'utf8').replace(/\r\n/g, '\n')
    if (/<!--\s*AGENT:槽3/.test(dText)) {
      const answer = readSlotAnswer(dText, /^<!--\s*AGENT:槽3/)
      if (!answer) exemptEvidence.push('盲维四问未作答（将由槽位门拦收）')
      else if (/^不适用/.test(answer)) exemptEvidence.push('盲维四问自述不适用')
      else reasons.push('盲维四问有实质作答（存在时序/并发/切换/作用域风险面）')
    } else if (/^##\s*边界与并发/m.test(dText)) {
      // v2 纯 markdown（2026-10-04-thin-docs-v2）：边界节正文作答判定（同 v1 三态语义）
      const answer = readV2SectionAnswer(dText, DESIGN_QUESTIONS_FALLBACK.sections[2].heading, DESIGN_QUESTIONS_FALLBACK)
      if (!answer) exemptEvidence.push('盲维四问未作答（将由 v2 工件校验拦收）')
      else if (/^不适用/.test(answer)) exemptEvidence.push('盲维四问自述不适用')
      else reasons.push('盲维四问有实质作答（存在时序/并发/切换/作用域风险面）')
    } else if (MECHANISM_RE.test(dText)) {
      reasons.push('头脑风暴设计含并发/时序类机制词（adopted 扫描）')
    } else {
      exemptEvidence.push('adopted 设计无机制词命中')
    }
  } catch { /* 无 design → 槽位门/redraft 面兜底 */ }

  // ③ 交付 diff 原语
  // 分径（fr-governance-sweep 评审 P3 清偿）：null=patch 采集失败（flow.js patch 子步 fail-soft
  // 的 catch 传 null）≠ 空=真无交付 diff——前者不能作为「纯治理面变更」豁免证据（有真实交付但
  // patch 恰好失败的变更会凭误标证据整体豁免评审——防线虚焊），改判需评审。
  if (patchText != null && String(patchText).trim()) {
    if (PRIMITIVE_RE.test(patchText)) reasons.push('交付 diff 含并发/游标/取消类原语')
    else exemptEvidence.push('diff 无危险原语')
  } else if (patchText != null) {
    exemptEvidence.push('无交付 diff（纯治理面变更）')
  } else {
    reasons.push('交付 diff 不可得（patch 留档失败）——豁免证据不成立，需评审')
  }

  // ④ 决策密度
  if (typeof editRatio === 'number' && editRatio > 0.5) reasons.push(`决策密度高（edit_ratio=${editRatio}）`)
  else exemptEvidence.push('决策密度低（无 amend 或未超阈）')

  if (reasons.length > 0) return { required: true, reasons, exemptEvidence, sampled: false }
  if (sampleBucket(change)) return { required: true, reasons: ['豁免抽查采样（1/4 定额）'], exemptEvidence, sampled: true }
  return { required: false, reasons, exemptEvidence, sampled: false }
}

/**
 * 评审员任务书（flow done 首次命中需评审时打印——agent 起干净上下文子代理执行）。
 * 材料有界（change.patch 为冻结件；治理工件已含字节帽意识）；请求预算硬帽防失控勘察（R14 教训）。
 * head（评审对象锚，2026-10-06-review-anchor-and-negation）：调用方传当前 git HEAD——任务书
 * 印出完整 sha 并要求 review.json 的 reviewedAgainst 照抄；漂移重冻结据此区分「对着旧冻结面的
 * 过期评审」与「对着当前 HEAD 的刚完成评审」（实测竞态：复审 PASS 落盘 26 秒后被误隔离）。
 */
export function renderReviewerTaskbook({ change, changeDir, head = null }) {
  const headFull = String(head || '').trim()
  // 前轮 findings 注入（2026-10-07-wave-auto-adopt-review-dedup task-02）：复审场景（前轮 FAIL/
  // 评审隔离重评）下任务书带上前轮清单——已报项只验修复与回归，重点找新增问题，勿整轮重报
  // （postmortem 实证评审员两轮报同类问题，多跑一整轮成本）。读不到/无 findings 零注入
  // （首评任务书与现状逐字一致）。
  let priorFindingsMd = ''
  try {
    const prev = JSON.parse(readFileSync(join(changeDir, 'review.json'), 'utf8'))
    if (Array.isArray(prev.findings) && prev.findings.length > 0) {
      priorFindingsMd = [
        ``,
        `【前轮评审 findings（${prev.findings.length} 项，前轮 verdict=${String(prev.verdict || '?')}）——本轮是复审】`,
        ...prev.findings.slice(0, 20).map((f, i) => `  ${i + 1}. [${f && f.severity ? f.severity : '?'}] ${f && f.title ? f.title : String(f).slice(0, 120)}`),
        ``,
        `  复审优先级：已报项只验「修复到位 + 未引入回归」（逐条给修复验证锚点），把请求预算主力投向新增问题——`,
        `  勿把前轮清单原样重报一遍（换视角有独立价值，重复报告挤占 12 次请求预算）。`,
      ].join('\n')
    }
  } catch { /* 无 review.json / 损坏 → 首评形态，零注入 */ }
  const taskbook = [
    `⚖️ 独立评审任务书 — ${change}`,
    `══════════════════════════════════════`,
    `【角色】你是独立评审员（干净上下文，未参与实现）——拿承诺对代码，不信自述，零误报标准。`,
    ...(headFull ? [
      `【评审对象】工作区实态 + git HEAD（${headFull}）——change.patch 冻结面若落后于该 HEAD，以`,
      `  工作区实态与 git log/show 核对为准；review.json 的 reviewedAgainst 字段照抄上面的完整 sha。`,
    ] : [
      `【评审对象】工作区实态 + git HEAD——review.json 的 reviewedAgainst 字段填 git rev-parse HEAD`,
      `  输出的完整 sha（评审对象锚，缺失时收口漂移检测会把本评审判为过期隔离重评）。`,
    ]),
    ``,
    `【材料（按需 Read，请求预算硬帽 12 次——超帽即止，包不足以作答写 cannot_verify）】`,
    `  - ${join(changeDir, 'requirements.md')}（FR 承诺 + 每条 FR 的测试绑定作答）`,
    `  - ${join(changeDir, 'design.md')}（设计承诺：做法/接口契约/盲维四问作答/风险）`,
    `  - ${join(changeDir, 'change.patch')}（交付 diff 冻结件——代码事实的唯一来源）`,
    ...(priorFindingsMd ? priorFindingsMd.split('\n') : []),
    ``,
    `【检查单（逐条作答，P1=承诺被违反或有数据正确性风险）】`,
    `  1. FR↔实现↔测试三方一致：每条 FR 的实现兑现承诺？绑定作答声称的测试真存在且断言该行为？`,
    `  2. 盲维四问真实性：design 作答说「不适用」的维度，diff 代码真的没有该风险面吗？（重点：乱序到达/并发写/切换清理/多工作区作用域）`,
    `  3. 披露边界显式裁决（必答，不许默认放行——R16 实证：已披露的取舍最易被放行）：design/requirements 里每条**声明的设计边界或取舍**`,
    `     （如「晚到事件不再重发，是交付语义的显式边界」），逐条写明「可接受/不可接受」+一句理由——`,
    `     可接受 → dimensionNotes 对应维度写「边界已裁决：可接受」；不可接受 → 按严重度进 findings（P1=数据正确性风险）。`,
    `     没有任何声明边界时写「无声明边界」。未裁决=未审。`,
    `  4. 作答中的防护声明（如有）：声称的防护机制在代码里真实存在且生效？`,
    `  5. 生成物同步（如涉及）：类型/契约文件与实现对齐？`,
    ``,
    `【纪律】只读——禁止修改任何文件、禁止 git 操作；唯一产物是 review.json。`,
    // 代行惯例（坑 flow-done-sentinel-token-split ②，2026-10-08 实证）：宿主无已注册子代理
    // 通道时无法照做「起子代理」——主会话按检查单代行自审可接受，reviewer 字段如实标注
    // 降级（如 inline-self（环境无已注册子代理）），独立性承诺的折扣显式留痕。
    `【无子代理通道时】宿主 agents 目录为空 → 主会话可按检查单代行自审，reviewer 字段如实标注（如 "inline-self（环境无已注册子代理，主会话代行）"）——降级留痕，勿伪装 subagent。`,
    ``,
    `【产物 schema（写到 ${join(changeDir, 'review.json')}，UTF-8 JSON）】`,
    `{`,
    `  "schemaVersion": 1, "change": "${change}", "reviewer": "subagent",`,
    `  "verdict": "PASS" | "FAIL",`,
    `  "reviewedAgainst": "<评审对象 HEAD 完整 sha——照抄任务书标注的 sha>",`,
    `  "findings": [ { "severity": "P1|P2|P3", "title": "…", "evidence": "代码锚点+机理一句话", "location": "file:line" } ],`,
    `  "dimensionNotes": { "乱序": "ok|finding|n/a", "并发": "ok|finding|n/a", "切换": "ok|finding|n/a", "作用域": "ok|finding|n/a" },`,
    `  "reviewedAt": "<ISO 时间>"`,
    `}`,
    ``,
    `完成后由主会话重跑：sillyspec flow done --change ${change}（断点续，已完成子步幂等跳过）`,
  ].join('\n')
  return taskbook
}

/**
 * review.json 校验（三态：ok / schema 错误清单）。FAIL 或含 P1 由调用方拦截。
 * reviewedAgainst（评审对象锚，2026-10-06-review-anchor-and-negation）：可选字段——缺省
 * 容忍（旧产物向后兼容），存在时须为 7-40 位 hex sha。
 */
export function validateReviewJson(path) {
  let raw
  try { raw = readFileSync(path, 'utf8') } catch { return { ok: false, errors: [`review.json 不可读：${path}`], review: null } }
  let r
  try { r = JSON.parse(raw) } catch (e) { return { ok: false, errors: [`review.json 不是合法 JSON：${e.message}`], review: null } }
  const errors = []
  if (r.schemaVersion !== 1) errors.push('schemaVersion 必须为 1')
  if (!['PASS', 'FAIL'].includes(r.verdict)) errors.push('verdict 必须为 PASS|FAIL')
  if (r.reviewedAgainst !== undefined
    && (typeof r.reviewedAgainst !== 'string' || !/^[0-9a-f]{7,40}$/i.test(r.reviewedAgainst.trim()))) {
    errors.push('reviewedAgainst 须为 7-40 位 hex sha（git rev-parse HEAD 输出，照抄任务书标注）')
  }
  if (!Array.isArray(r.findings)) errors.push('findings 必须为数组')
  else {
    r.findings.forEach((f, i) => {
      if (!f || typeof f !== 'object') { errors.push(`findings[${i}] 非对象`); return }
      if (!/^P[123]$/i.test(String(f.severity || ''))) errors.push(`findings[${i}].severity 必须 P1|P2|P3`)
      if (!f.title) errors.push(`findings[${i}].title 缺失`)
    })
  }
  if (!r.reviewer || typeof r.reviewer !== 'string') errors.push('reviewer 缺失')
  if (errors.length > 0) return { ok: false, errors, review: null }
  return { ok: true, errors: [], review: r }
}

/**
 * review.json 是否锚定到指定 HEAD（漂移重冻结隔离前的保留判定，
 * 2026-10-06-review-anchor-and-negation 实测竞态：复审对着当前 HEAD 做的 PASS 结论
 * 落盘 26 秒后被「重冻结时刻在场=过期」口径误隔离）。reviewedAgainst 缺省/读失败/
 * 格式非法一律 false（fail-safe：宁可多评一次，不放行无锚证据）。
 * 匹配口径：双向前缀（reviewedAgainst 允许短 sha 形态，与完整 head 任一方向前缀命中即锚定）。
 * @param {string} reviewPath - review.json 路径
 * @param {string} head - 当前完整 HEAD sha
 * @returns {boolean}
 */
export function reviewAnchoredToHead(reviewPath, head) {
  const h = String(head || '').trim().toLowerCase()
  if (!h) return false
  try {
    const r = JSON.parse(readFileSync(reviewPath, 'utf8'))
    const ra = typeof r?.reviewedAgainst === 'string' ? r.reviewedAgainst.trim().toLowerCase() : ''
    if (!/^[0-9a-f]{7,40}$/.test(ra)) return false
    return h === ra || h.startsWith(ra) || ra.startsWith(h)
  } catch { return false }
}

export default { classifyReviewNeed, renderReviewerTaskbook, validateReviewJson, reviewAnchoredToHead, sampleBucket }
