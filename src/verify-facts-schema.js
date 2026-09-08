/**
 * verify-facts-schema.js — verify-facts.json v2 schema 单点（2026-09-08-ir-verify-facts task-01 / D-005@v2）。
 *
 * facts v2 的字段/枚举/豁免形态/路径分类/槽段解析集中于此，builder（verify-probes.buildVerifyFacts）、
 * 对账引擎（verify-postcheck.runVerifyRequiredEvidenceCheck）、集成证据（change-risk-profile 经
 * stage-contract）、骨架渲染（generateVerifyResultSkeleton）四方 import 同源，禁复制。
 *
 * 双层写入模型（D-001@v2）：机器数据（probes/tests/factsConsistency）CLI 直写；判断层
 * （结论枚举/证据状态/回执声明）经 verify-result.md 受控槽段录入、--done 时 CLI 解析固化
 * （slot-backfill），单向渲染约束对象是机器数据。
 */
export const FACTS_SCHEMA_VERSION = 2

/** 证据状态枚举单源（「## 证据账」槽行 + facts.requiredEvidence[].status 共用） */
export const EVIDENCE_STATUS = ['satisfied', 'missing', 'partial']

/** 豁免后缀形态：missing + （豁免：<理由>）——机器可解析，无括注的 missing 不算豁免 */
export const EXEMPTION_RE = /（豁免：[^）]+）/

/** 证据账槽段标题（与 generateVerifyResultSkeleton 渲染逐字一致——避开既有「## Runtime Evidence」人工判断章） */
export const EVIDENCE_SLOT_HEADING = '## 证据账（cannot_verify 任务）'

/** 集成验证回执槽段标题 */
export const RECEIPT_SLOT_HEADING = '## 集成验证回执'

/**
 * verifiedFiles 路径分类：决定核验口径（design Phase 2）。
 * artifact 类（.runtime/ 日志 / 文档——resolveVerifyChangedFiles 天然不覆盖）核 存在×mtime，
 * diff 交集豁免；其余（code）核 存在×mtime×diff 交集。
 * @param {string} path 仓根相对路径（posix）
 * @returns {'code'|'artifact'}
 */
export function classifyVerifiedFile(path) {
  const p = String(path || '').replace(/\\/g, '/')
  if (p.startsWith('.runtime/') || p.startsWith('.sillyspec/.runtime/')) return 'artifact'
  if (/\.(log|txt|out)$/i.test(p)) return 'artifact'
  if (p.startsWith('.sillyspec/docs/') || p.startsWith('docs/')) return 'artifact'
  if (p.endsWith('.md') || p.endsWith('.mdx')) return 'artifact'
  return 'code'
}

/** 证据账 task 行：`- task-NN: <status> | verifiedFiles: a, b（豁免：…）`——占位 <待填：*> 不命中（fail-closed） */
const EVIDENCE_LINE_RE = /^- (task-\d+):\s*(satisfied|missing|partial)\b([^\n]*)$/

/** 回执行：`- claim: … | command: … | exit: 0 | log: path`——四字段行首锚定，占位不命中 */
const RECEIPT_LINE_RE = /^- claim:\s*([^|]+)\|\s*command:\s*([^|]+)\|\s*exit:\s*(\d+)\s*\|\s*log:\s*([^\s|]+)/

/**
 * 解析 verify-result.md 的两个受控槽段（D-001@v2 slot-backfill 录入界面）。
 * 占位形态（<待填：三选一> / <待填：0 或非 0>）不含枚举词，行首锚定 + 枚举词双保险 fail-closed。
 * @param {string} mdText verify-result.md 全文（LF 归一由调用方 readFileSync 层负责或此处容错）
 * @returns {{ requiredEvidence: Array<{task,status,exempt:boolean,exemptionReason:string|null,verifiedFiles:string[]}>, runtimeEvidence: Array<{claim,command,exitCode,logPath}>, hasEvidenceSlot: boolean, hasReceiptSlot: boolean }}
 */
export function parseEvidenceSlots(mdText) {
  const text = String(mdText || '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')

  // 槽段定位：标题行到下一个同级/更高级标题或文末
  const sectionOf = (heading) => {
    const start = lines.findIndex(l => l.startsWith(heading))
    if (start === -1) return null
    const body = []
    for (let i = start + 1; i < lines.length; i++) {
      if (/^#{1,2}\s/.test(lines[i])) break
      body.push(lines[i])
    }
    return body
  }

  const evidenceBody = sectionOf(EVIDENCE_SLOT_HEADING)
  const receiptBody = sectionOf(RECEIPT_SLOT_HEADING)

  const requiredEvidence = []
  if (evidenceBody) {
    for (const line of evidenceBody) {
      const m = line.match(EVIDENCE_LINE_RE)
      if (!m) continue
      const [, task, status, rest] = m
      const exemptM = rest.match(EXEMPTION_RE)
      const vfMatch = rest.match(/verifiedFiles:\s*([^\n（]*)/)
      const verifiedFiles = (vfMatch ? vfMatch[1] : '')
        .split(',')
        .map(s => s.trim().replace(/^`|`$/g, ''))
        .filter(s => s.length > 0 && !s.startsWith('<'))
      requiredEvidence.push({
        task,
        status,
        exempt: status === 'missing' && !!exemptM,
        exemptionReason: exemptM ? exemptM[0] : null,
        verifiedFiles,
      })
    }
  }

  const runtimeEvidence = []
  if (receiptBody) {
    for (const line of receiptBody) {
      const m = line.match(RECEIPT_LINE_RE)
      if (!m) continue
      runtimeEvidence.push({
        claim: m[1].trim(),
        command: m[2].trim(),
        exitCode: Number(m[3]),
        logPath: m[4].trim().replace(/^`|`$/g, ''),
      })
    }
  }

  return {
    requiredEvidence,
    runtimeEvidence,
    hasEvidenceSlot: evidenceBody !== null,
    hasReceiptSlot: receiptBody !== null,
  }
}

/**
 * facts v2 结构校验（写入前/消费侧防线）。
 * @param {object} facts
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateFactsV2(facts) {
  const errors = []
  if (!facts || typeof facts !== 'object') return { ok: false, errors: ['facts 非对象'] }
  if (facts.schemaVersion !== FACTS_SCHEMA_VERSION) {
    errors.push(`schemaVersion 应为 ${FACTS_SCHEMA_VERSION}，实际 ${facts.schemaVersion}`)
  }
  if (!Array.isArray(facts.probes ? Object.keys(facts.probes) : null)) {
    errors.push('probes 段缺失或非对象')
  }
  if (facts.conclusion != null && !['PASS', 'PASS WITH NOTES', 'FAIL'].includes(facts.conclusion)) {
    errors.push(`conclusion 非法枚举值：${facts.conclusion}`)
  }
  for (const item of facts.requiredEvidence || []) {
    if (!EVIDENCE_STATUS.includes(item.status)) errors.push(`requiredEvidence[${item.task}] status 非法：${item.status}`)
    if (item.status === 'satisfied' && (!Array.isArray(item.verifiedFiles) || item.verifiedFiles.length === 0)) {
      errors.push(`requiredEvidence[${item.task}] satisfied 但 verifiedFiles 为空`)
    }
  }
  return { ok: errors.length === 0, errors }
}
