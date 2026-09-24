/**
 * flow-review.js — 轻量变更独立评审（2026-09-25-thin-review-slice）。
 *
 * 定档哲学：危险证据累积制，体积/文件数出局（撞实验 F-02 实证——几行 ref 清零的小改是 P1，
 * 30 文件的改名无风险）。信号五路，任一命中即需评审；缺省要评审、豁免要多证并举：
 *   ① 高危交付语义词（一票升级，任何信号压不住）——at-least-once/exactly-once/幂等/不丢失/
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

/** 高危交付语义承诺词（一票升级）。 */
const PROMISE_RE = /at[- ]least[- ]once|exactly[- ]once|幂等|不丢失|不重复|不丢不重|不重不漏|串台/i

/** adopted（头脑风暴预段）design 无槽时的机制词全文扫描（窄表防误报）。 */
const MECHANISM_RE = /乱序|并发写|竞态|死锁|事务隔离|AbortSignal|多实例串|游标推进/

/** 交付 diff 危险原语（物证面）。 */
const PRIMITIVE_RE = /asyncio\.(?:Lock|Event|Queue|gather)|threading\.|with_for_update|IntegrityError|ON CONFLICT|AbortSignal|AbortController|signal\.abort|\.rollback\(|since=|\bcursor\b/i

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

/** 剥 MACHINE-DRAFT 机器段（design.md 的问题模板自带「串台」等承诺词字样——模板自污染面，
 * 扫描只看 agent 作答面；proposal/requirements 的机器段承载用户原话不剥）。 */
function stripMachineSections(text) {
  return String(text || '')
    .replace(/<!--\s*MACHINE-DRAFT:[\w.-]+:[0-9a-f]{64}:begin[^\n]*-->[\s\S]*?<!--\s*MACHINE-DRAFT:[\w.-]+:end\s*-->/g, '')
    .replace(/<!--\s*MACHINE-DRAFT:[\w.-]+:[^\n]*:begin[^\n]*-->[\s\S]*?<!--\s*MACHINE-DRAFT:[\w.-]+:end\s*-->/g, '')
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
      const t = readFileSync(join(changeDir, f), 'utf8')
      texts.push(f === 'design.md' ? stripMachineSections(t) : t)
    } catch { /* 缺件由 redraft/槽位门兜底 */ }
  }
  const all = texts.join('\n')
  const hit = all.match(PROMISE_RE)
  if (hit) reasons.push(`高危交付语义承诺词命中「${hit[0]}」（一票升级）`)
  else exemptEvidence.push('无高危承诺词')

  // ② 盲维四问作答：实质作答=风险面（adopted 无槽退化机制词扫描）
  try {
    const dText = readFileSync(join(changeDir, 'design.md'), 'utf8')
    if (/<!--\s*AGENT:槽3/.test(dText)) {
      const answer = readSlotAnswer(dText, /^<!--\s*AGENT:槽3/)
      if (!answer) exemptEvidence.push('盲维四问未作答（将由槽位门拦收）')
      else if (/^不适用/.test(answer)) exemptEvidence.push('盲维四问自述不适用')
      else reasons.push('盲维四问有实质作答（存在时序/并发/切换/作用域风险面）')
    } else if (MECHANISM_RE.test(dText)) {
      reasons.push('头脑风暴设计含并发/时序类机制词（adopted 扫描）')
    } else {
      exemptEvidence.push('adopted 设计无机制词命中')
    }
  } catch { /* 无 design → 槽位门/redraft 面兜底 */ }

  // ③ 交付 diff 原语
  if (patchText != null && String(patchText).trim()) {
    if (PRIMITIVE_RE.test(patchText)) reasons.push('交付 diff 含并发/游标/取消类原语')
    else exemptEvidence.push('diff 无危险原语')
  } else {
    exemptEvidence.push('无交付 diff（纯治理面变更）')
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
 */
export function renderReviewerTaskbook({ change, changeDir }) {
  return [
    `⚖️ 独立评审任务书 — ${change}`,
    `══════════════════════════════════════`,
    `【角色】你是独立评审员（干净上下文，未参与实现）——拿承诺对代码，不信自述，零误报标准。`,
    ``,
    `【材料（按需 Read，请求预算硬帽 12 次——超帽即止，包不足以作答写 cannot_verify）】`,
    `  - ${join(changeDir, 'requirements.md')}（FR 承诺 + 每条 FR 的测试绑定作答）`,
    `  - ${join(changeDir, 'design.md')}（设计承诺：做法/接口契约/盲维四问作答/风险）`,
    `  - ${join(changeDir, 'change.patch')}（交付 diff 冻结件——代码事实的唯一来源）`,
    ``,
    `【检查单（逐条作答，P1=承诺被违反或有数据正确性风险）】`,
    `  1. FR↔实现↔测试三方一致：每条 FR 的实现兑现承诺？绑定作答声称的测试真存在且断言该行为？`,
    `  2. 盲维四问真实性：design 作答说「不适用」的维度，diff 代码真的没有该风险面吗？（重点：乱序到达/并发写/切换清理/多工作区作用域）`,
    `  3. 作答中的防护声明（如有）：声称的防护机制在代码里真实存在且生效？`,
    `  4. 生成物同步（如涉及）：类型/契约文件与实现对齐？`,
    ``,
    `【纪律】只读——禁止修改任何文件、禁止 git 操作；唯一产物是 review.json。`,
    ``,
    `【产物 schema（写到 ${join(changeDir, 'review.json')}，UTF-8 JSON）】`,
    `{`,
    `  "schemaVersion": 1, "change": "${change}", "reviewer": "subagent",`,
    `  "verdict": "PASS" | "FAIL",`,
    `  "findings": [ { "severity": "P1|P2|P3", "title": "…", "evidence": "代码锚点+机理一句话", "location": "file:line" } ],`,
    `  "dimensionNotes": { "乱序": "ok|finding|n/a", "并发": "ok|finding|n/a", "切换": "ok|finding|n/a", "作用域": "ok|finding|n/a" },`,
    `  "reviewedAt": "<ISO 时间>"`,
    `}`,
    ``,
    `完成后由主会话重跑：sillyspec flow done --change ${change}（断点续，已完成子步幂等跳过）`,
  ].join('\n')
}

/**
 * review.json 校验（三态：ok / schema 错误清单）。FAIL 或含 P1 由调用方拦截。
 */
export function validateReviewJson(path) {
  let raw
  try { raw = readFileSync(path, 'utf8') } catch { return { ok: false, errors: [`review.json 不可读：${path}`], review: null } }
  let r
  try { r = JSON.parse(raw) } catch (e) { return { ok: false, errors: [`review.json 不是合法 JSON：${e.message}`], review: null } }
  const errors = []
  if (r.schemaVersion !== 1) errors.push('schemaVersion 必须为 1')
  if (!['PASS', 'FAIL'].includes(r.verdict)) errors.push('verdict 必须为 PASS|FAIL')
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

export default { classifyReviewNeed, renderReviewerTaskbook, validateReviewJson, sampleBucket }
