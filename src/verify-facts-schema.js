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
 *
 * PASS 封顶事实面扩展（2026-09-17-pass-cap-semantics task-01 / D-011）：db 脚本执行声明的
 * 录入文法（X-03）= 回执槽条目 command 含 db/<file>.sql，或声明行「已对目标库执行：db/<file>.sql」，
 * 解析器 parseDbScriptDeclarations 落 verify-probes.js（producer：backfillFactsFromMdAndTests
 * 产出 facts.dbScriptDeclarations；跨仓消费方：worktree-apply 兜底声明门按「文件集 ∩ db/*.sql
 * ⊆ parseDbScriptDeclarations(verifyMd)」对账）。
 */
export const FACTS_SCHEMA_VERSION = 2

/** 证据状态枚举单源（「## 证据账」槽行 + facts.requiredEvidence[].status 共用） */
export const EVIDENCE_STATUS = ['satisfied', 'missing', 'partial']

/** 豁免后缀形态：missing + （豁免：<理由>）——机器可解析，无括注的 missing 不算豁免（模块私有：parseEvidenceSlots 内部消费，外部读解析结果的 exempt 字段） */
const EXEMPTION_RE = /（豁免：[^）]+）/

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

/**
 * 回执行：`- claim: … | command: … | exit: 0 | log: path`——四字段行首锚定，占位不命中。
 * 双宽度容收（坑 receipt-fullwidth-parse，2026-09-12 驾驭第十四批③，用户上一变更实证、
 * 本次手动避开后要求修根：①分隔符同时认半角 | 与全角 ｜（中文输入法手写回执高频形态，
 * 全角形态旧正则整行不命中 → 回执槽 0 条 → integration-critical 误报无绿回执）；
 * ②log 字段 rest-of-line（旧 [^\s|+] 遇含空格/全角括号路径截断——`日志（第 1 次）.log`
 * 被截成 `日志（第` → 「日志不存在」假红）；log 是末字段，行内若有 ｜/| 尾注取首段剥注。
 */
const RECEIPT_LINE_RE = /^- claim:\s*([^|｜\n]+)[|｜]\s*command:\s*([^|｜\n]+)[|｜]\s*exit:\s*(\d+)\s*[|｜]\s*log:\s*(.+)$/

/**
 * 多行 YAML 形态续行：`  key: value`（缩进键值行，2026-09-16-friction5-hardening FR-01 / D-001@v1）。
 * 单行管道形态 agent 手写时列错位/字段序调换/多行书写整行不命中 → 回执槽收 0 条 →
 * integration-critical 误报无绿回执——多行聚合根除形态自由度问题；字段序无关（command 可在
 * claim 前），聚合遇首个不匹配行（下一列表项/非缩进行/空行/标题）即止。
 */
const RECEIPT_CONT_LINE_RE = /^[ \t]+([A-Za-z_][\w-]*):\s*(.*)$/

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
    // 回执双形态解析（FR-01 / D-001@v1）：①单行管道形态 RECEIPT_LINE_RE 命中即收（正则与
    // 字段语义逐字节不变，存量回执零回归）；②不命中且行首 `- claim:` 起头时进入多行 YAML
    // 聚合——收集缩进续行（RECEIPT_CONT_LINE_RE）为 key→value（值 trim、剥首尾成对反引号），
    // 首行行内剩余只作 claim 值（claim 含管道符不截断）；四字段 = claim/command 非空（trim 后）
    // + exit 纯数字 + log 非空（值内 ｜/| 尾注取首段，同单行口径），齐才 push——任一缺失/空
    // 整条不收（fail-closed 宁漏不误收，坑 receipt-fullwidth-parse 形态自由度的根除收口）。
    const stripPairedBackticks = (v) => {
      const t = v.trim()
      return t.length >= 2 && t.startsWith('`') && t.endsWith('`') ? t.slice(1, -1) : t
    }
    for (let i = 0; i < receiptBody.length; i++) {
      const m = receiptBody[i].match(RECEIPT_LINE_RE)
      if (m) {
        runtimeEvidence.push({
          claim: m[1].trim(),
          command: m[2].trim(),
          exitCode: Number(m[3]),
          logPath: m[4].split(/[|｜]/)[0].trim().replace(/^`|`$/g, ''),
        })
        continue
      }
      const head = receiptBody[i].match(/^-\s*claim:\s*(.*)$/)
      if (!head) continue
      const fields = {}
      let j = i + 1
      while (j < receiptBody.length) {
        const cm = receiptBody[j].match(RECEIPT_CONT_LINE_RE)
        if (!cm) break
        if (!(cm[1] in fields)) fields[cm[1]] = stripPairedBackticks(cm[2])
        j++
      }
      i = j - 1 // 聚合消费至 j-1，回退一格交还外层 for 推进
      const claim = [head[1].trim(), typeof fields.claim === 'string' ? fields.claim.trim() : '']
        .filter(s => s.length > 0).join(' ').trim()
      const command = typeof fields.command === 'string' ? fields.command : ''
      const exit = typeof fields.exit === 'string' ? fields.exit.trim() : ''
      const log = typeof fields.log === 'string'
        ? fields.log.split(/[|｜]/)[0].trim().replace(/^`|`$/g, '')
        : ''
      if (!claim || !command || !/^\d+$/.test(exit) || !log) continue
      runtimeEvidence.push({ claim, command, exitCode: Number(exit), logPath: log })
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
  // PASS 封顶事实面五字段 additive 登记（2026-09-17-pass-cap-semantics task-01 / D-011 故障面）：
  // 字段不在场一律不报错（存量 facts 零迁移通过，producer=backfillFactsFromMdAndTests 首次
  // backfill 产出）；在场才校验类型/枚举。schemaVersion 保持 2。
  if (facts.integrationRan != null && !['ran', 'not-ran'].includes(facts.integrationRan)) {
    errors.push(`integrationRan 非法枚举值：${facts.integrationRan}`)
  }
  if (facts.dbScriptDeclarations != null
    && (!Array.isArray(facts.dbScriptDeclarations) || !facts.dbScriptDeclarations.every(x => typeof x === 'string'))) {
    errors.push('dbScriptDeclarations 应为 string[]')
  }
  if (facts.matrixPartialRows != null
    && (!Number.isInteger(facts.matrixPartialRows) || facts.matrixPartialRows < 0)) {
    errors.push(`matrixPartialRows 应为非负整数，实际 ${facts.matrixPartialRows}`)
  }
  if (facts.runtimeEndpointExcluded != null && typeof facts.runtimeEndpointExcluded !== 'boolean') {
    errors.push(`runtimeEndpointExcluded 应为 boolean，实际 ${typeof facts.runtimeEndpointExcluded}`)
  }
  const handoverItems = (facts.handover && Array.isArray(facts.handover.items)) ? facts.handover.items : []
  for (const [i, item] of handoverItems.entries()) {
    if (item && item.severity != null && !['blocking', 'advisory'].includes(item.severity)) {
      errors.push(`handover.items[${i}] severity 非法枚举值：${item.severity}`)
    }
  }
  return { ok: errors.length === 0, errors }
}
