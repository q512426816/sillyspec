/**
 * flow-draft.js — 全件机器起草器（R7 切片三 task-05 / D-004 D-005 / FR-07 FR-08）。
 *
 * 薄跑道治理工件全部 CLI 机器起草（工件回填轮=0），agent 只裁例外：
 *   - proposal：--input 机械转写（动机/关键问题/变更范围从任务原话摘段）；
 *   - requirements：机械摘「成功标准」条目 → FR 条目；
 *   - tasks：成功标准 → checkbox 任务行；任务卡分岔（用户裁定#3）：默认 thin+直写零任务卡
 *     （薄跑=quick 的协议兄弟）；--thick / --with-tasks 才生成 tasks/task-NN.md 卡；
 *   - decisions：只记真实新增（转写任务通常为零——不落文件）。
 *
 * 机器段经 machine-draft.wrapSection 包裹（sha256 指纹标记对，guardNote 指向 flow done 拒收）；
 * draft-ledger（.runtime/draft-ledger-<change>.json）每段存 hash+**首版原文 body（首版快照永不
 * 覆盖——切片四 editRatio 的基准依赖；amend 只刷 hash 不动 body）**，命名空间按 文件名+段键。
 * AGENT 槽（<!--AGENT:--> 标记对）=合法书写面（验收侧放行，不参与指纹）。
 *
 * 守卫全在验收侧（护栏#2：零 prompt 劝说）：flow done 工件校验子步对 ledger 在案的每文件
 * verifyMarkers 三态拒收（标记缺失/哈希失配/手工重锚未审计）；flow amend-draft 是唯一留痕
 * 修改通道（reanchorText 重锚 + ledger amendments 审计）。
 */
import { existsSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'
import { wrapSection, verifyMarkers, reanchorText, bodyHash } from './machine-draft.js'

const AMEND_CMD = (change) => `sillyspec flow amend-draft --change ${change}`
const GUARD_NOTE = '整段改写会被 flow done 拒收'

/** sidecar 台账路径（.runtime 下，verify-draft sidecar 同族；命名空间=文件:段键）。 */
export function draftLedgerPath(runtimeRoot, changeName) {
  return join(runtimeRoot, `draft-ledger-${changeName}.json`)
}

const AGENT_SLOT = (n, hint) => `<!--AGENT:槽${n} ${hint}——例外裁决书写面（机器段之外合法） -->`

/** 从任务原话摘「成功标准」条目（行级机械提取：「成功标准/验收」节下的条目行；无节则回退列表行）。 */
export function extractSuccessCriteria(input) {
  if (!input) return []
  const NL = /\r\n|\r|\n/
  const lines = String(input).split(NL).map((l) => l.trim()).filter(Boolean)
  const criteria = []
  let inSection = false
  let sawSection = false
  for (const raw of lines) {
    const line = raw.replace(/^#+\s*/, '')
    if (/^(成功标准|验收标准|验收|acceptance)\s*[：:]?$/i.test(line)) { inSection = true; sawSection = true; continue }
    if (/^(动机|背景|关键问题|变更范围|需求|非目标)/i.test(line)) { inSection = false; continue }
    if (!sawSection && /^[-*•]\s+\S/.test(raw)) { criteria.push(raw.replace(/^[-*•]\s+/, '')); continue }
    if (inSection) {
      const item = raw.replace(/^[-*•\d.)、]+\s*/, '')
      if (item && !/^#/.test(item)) criteria.push(item)
    }
  }
  return criteria
}

/** proposal 机器稿（--input 转写：动机/关键问题/变更范围/成功标准四机器段+AGENT 槽）。 */
function draftProposal({ change, input, criteria }) {
  const crit = criteria || extractSuccessCriteria(input)
  const wrapped = (key, body) => wrapSection({ key, body, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 提案书（Proposal）— ${change}`,
    '',
    '## 动机',
    wrapped('proposal-motivation', `任务原话转写：${input || '（未提供 --input）'}`),
    AGENT_SLOT(1, '动机例外裁决'),
    '',
    '## 变更范围',
    wrapped('proposal-scope', crit.length > 0
      ? ['按成功标准机械推导，共 ' + crit.length + ' 条验收面：', ...crit.map((c, i) => `${i + 1}. ${c}`)].join('\n')
      : '（--input 未含成功标准条目——flow done 测试门与工件校验为默认验收面）'),
    '',
    '## 成功标准（可验证）',
    wrapped('proposal-criteria', crit.length > 0
      ? crit.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : '1. flow done 六子步全绿（测试门实测通过+工件指纹校验通过）'),
    AGENT_SLOT(2, '成功标准例外裁决（增删条目在此书写）'),
    '',
  ].join('\n')
  return { text, sections: collectSections(text) }
}

/** requirements 机器稿（成功标准 → FR 条目）。 */
function draftRequirements({ change, criteria }) {
  const crit = criteria || []
  const wrapped = (key, body) => wrapSection({ key, body, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
  const frBodies = crit.length > 0
    ? crit.map((c, i) => `### FR-${String(i + 1).padStart(2, '0')}: ${c.slice(0, 40)}\nGiven flow 薄跑道在跑\nWhen flow done 裁决执行\nThen ${c}`).join('\n\n')
    : '### FR-01: flow done 全绿\nGiven flow 薄跑道在跑\nWhen flow done 裁决执行\nThen 测试门实测通过+工件指纹校验通过'
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 需求规格（Requirements）— ${change}`,
    '',
    '## 功能需求（成功标准机械摘录）',
    wrapped('requirements-frs', frBodies),
    AGENT_SLOT(1, '需求例外裁决'),
    '',
  ].join('\n')
  return { text, sections: collectSections(text) }
}

/** tasks 机器稿（成功标准 → checkbox 行）。任务卡分岔：withTasks 才生成 tasks/task-NN.md。 */
function draftTasks({ change, criteria, withTasks }) {
  const crit = criteria || []
  const wrapped = (key, body) => wrapSection({ key, body, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
  const rows = crit.length > 0
    ? crit.map((c, i) => `- [ ] task-${String(i + 1).padStart(2, '0')}: ${c.slice(0, 60)}`)
    : ['- [ ] task-01: 完成实现并使 flow done 六子步全绿']
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 任务注册表（Tasks）— ${change}`,
    '',
    '> 机器稿（成功标准机械推导）；薄跑直写=零任务卡（任务即 checkbox 行）；',
    `> ${withTasks ? '任务卡模式（--with-tasks/--thick）：tasks/task-NN.md 卡已生成，中间自愿 task done，收尾仍 flow done' : '默认 thin：无任务卡文件，收口=flow done 唯一裁决'}。`,
    '',
    wrapped('tasks-rows', rows.join('\n')),
    '',
  ].join('\n')
  return { text, sections: collectSections(text) }
}

/** 任务卡（--with-tasks/--thick 分岔产物，最小合规 frontmatter）。 */
function draftTaskCards({ change, criteria }) {
  const crit = (criteria && criteria.length > 0) ? criteria : ['完成实现并使 flow done 六子步全绿']
  return crit.map((c, i) => {
    const id = `task-${String(i + 1).padStart(2, '0')}`
    return {
      id,
      text: [
        '---',
        `id: ${id}`,
        `title: 'machine-drafted task ${i + 1}'`,
        `title_zh: '${c.slice(0, 30).replace(/'/g, '')}'`,
        `author: flow-machine-draft`,
        `created_at: ${new Date().toISOString()}`,
        'priority: P1',
        'depends_on: []',
        'blocks: []',
        'requirement_ids: []',
        'decision_ids: []',
        `goal: >`,
        `  ${c}`,
        '---',
        '',
      ].join('\n'),
    }
  })
}

/** decisions：只记真实新增（无真实决策=不落文件，转写任务通常为零）。 */
export function draftDecisions({ change, decisions }) {
  if (!decisions || decisions.length === 0) return null
  const wrapped = (key, body) => wrapSection({ key, body, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 决策记录（Decisions）— ${change}`,
    '',
    wrapped('decisions-entries', decisions.map((d, i) => `## D-${String(i + 1).padStart(3, '0')}@v1: ${d.title}\n- 决策：${d.body}`).join('\n\n')),
    '',
  ].join('\n')
  return { text, sections: collectSections(text) }
}

/** 从稿文本收集段哈希+首版原文（ledger 记账面）。 */
function collectSections(text) {
  const blocks = []
  const re = /MACHINE-DRAFT:([\w.-]+):([0-9a-f]{64}):begin/g
  const lines = text.split('\n')
  let m
  // 按 wrapSection 结构回溯：begin 标记行下一段直到 end 标记
  let current = null
  for (const line of lines) {
    const b = line.match(/<!--\s*MACHINE-DRAFT:([\w.-]+):([0-9a-f]{64}):begin/)
    if (b) { current = { key: b[1], hash: b[2], body: [] }; blocks.push(current); continue }
    if (/<!--\s*MACHINE-DRAFT:[\w.-]+:end/.test(line)) { current = null; continue }
    if (current) current.body.push(line)
  }
  const sections = {}
  for (const b of blocks) {
    sections[b.key] = { hash: b.hash, body: b.body.join('\n') }
  }
  return sections
}

/**
 * 起草全件落盘 + draft-ledger 记账（flow start 消费）。
 * @returns {{written: string[], ledgerPath: string}}
 */
export function draftAll({ changeDir, change, input, withTasks = false, runtimeRoot }) {
  const criteria = extractSuccessCriteria(input)
  const outputs = [
    { file: 'proposal.md', draft: draftProposal({ change, input, criteria }) },
    { file: 'requirements.md', draft: draftRequirements({ change, criteria }) },
    { file: 'tasks.md', draft: draftTasks({ change, criteria, withTasks }) },
  ]
  const written = []
  const ledger = { schemaVersion: 1, change, generatedAt: new Date().toISOString(), files: {}, amendments: [] }
  for (const { file, draft } of outputs) {
    writeAtomicSync(join(changeDir, file), draft.text)
    ledger.files[file] = draft.sections
    written.push(file)
  }
  if (withTasks) {
    const cards = draftTaskCards({ change, criteria })
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    for (const c of cards) writeAtomicSync(join(changeDir, 'tasks', `${c.id}.md`), c.text)
    written.push(`tasks/（${cards.length} 卡）`)
  }
  const ledgerPath = draftLedgerPath(runtimeRoot, change)
  writeAtomicSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  return { written, ledgerPath, criteria }
}

/**
 * computeEditRatio——机器稿改写比例（R7 切片四 / D-005 / FR-09）：决策覆盖度机械代理。
 * LCS 行 diff：改写行数 / 首版总行数（首版为 ledger body 永存基准；AGENT 槽不属机器段
 * 天然不计入）。纯函数。
 */
export function computeEditRatio(originalBody, currentBody) {
  const a = String(originalBody || '').split('\n')
  const b = String(currentBody || '').split('\n')
  if (a.length === 0 || (a.length === 1 && !a[0])) return 0
  // LCS 长度 DP（机器段行数小，O(n·m) 足够）
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const lcs = dp[0][0]
  // 改写比例口径=原文被改行占比（a.length - lcs)/a.length——del+ins 双计会把「替换」算两倍
  // （2 行体改 1 行得 1.0 失真）；纯增行不改写原文不计入。
  return Math.min(1, Math.max(0, (a.length - lcs) / a.length))
}

/**
 * flow amend-draft：机器稿留痕重锚（唯一合法修改通道）。
 * 对 ledger 在案的每文件 reanchorText 重锚 + ledger 追加 amendment 审计（首版 body 不动）。
 * 切片四：amend 时对首版原文计算 editRatio（改写比例=决策覆盖度机械代理，AGENT 槽不计入）。
 * @returns {{reanchored: string[], files: string[], editRatio: number, sectionRatios: Object}}
 */
export function amendFlowDraft({ changeDir, change, runtimeRoot }) {
  const ledgerPath = draftLedgerPath(runtimeRoot, change)
  if (!existsSync(ledgerPath)) return { reanchored: [], files: [], editRatio: 0, sectionRatios: {} }
  let ledger
  try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) } catch { return { reanchored: [], files: [], editRatio: 0, sectionRatios: {} } }
  const reanchored = []
  const sectionRatios = {}
  let totalOrig = 0
  let totalChanged = 0
  for (const file of Object.keys(ledger.files || {})) {
    const mdPath = join(changeDir, file)
    let text
    try { text = readFileSync(mdPath, 'utf8') } catch { continue }
    const r = reanchorText({ text, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
    if (r.keys.length === 0) continue
    writeAtomicSync(mdPath, r.text)
    for (const k of r.keys) {
      const firstBody = ledger.files[file][k] && ledger.files[file][k].body
      const ratio = firstBody != null ? computeEditRatio(firstBody, r.contentByKey[k]) : 0
      sectionRatios[`${file}:${k}`] = Math.round(ratio * 1000) / 1000
      const aLines = String(firstBody || '').split('\n').length
      totalOrig += aLines
      totalChanged += Math.round(ratio * aLines)
      ledger.files[file][k] = { ...ledger.files[file][k], hash: bodyHash(r.contentByKey[k]) }
    }
    reanchored.push(`${file}（${r.keys.join('/')}）`)
  }
  if (reanchored.length > 0) {
    ledger.amendments = [...(ledger.amendments || []), { at: new Date().toISOString(), files: reanchored, sectionRatios }]
    writeAtomicSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  }
  const editRatio = totalOrig > 0 ? Math.round((totalChanged / totalOrig) * 1000) / 1000 : 0
  return { reanchored, files: Object.keys(ledger.files || {}), editRatio, sectionRatios }
}

/** 三态拒收校验（flow done 工件子步消费面；无 ledger=not-applicable）。 */
export function verifyFlowDrafts({ changeDir, change, runtimeRoot }) {
  const ledgerPath = draftLedgerPath(runtimeRoot, change)
  if (!existsSync(ledgerPath)) return { applicable: false, violations: [] }
  let ledger
  try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) } catch { return { applicable: false, violations: [] } }
  const violations = []
  for (const [file, sections] of Object.entries(ledger.files || {})) {
    const mdPath = join(changeDir, file)
    let text
    try { text = readFileSync(mdPath, 'utf8') } catch {
      violations.push(`机器稿「${file}」不可读（draft ledger 在案）`)
      continue
    }
    violations.push(...verifyMarkers({ text, sections, amendCmd: AMEND_CMD(change) }))
  }
  return { applicable: true, violations }
}

export default { draftAll, amendFlowDraft, verifyFlowDrafts, draftDecisions, extractSuccessCriteria, draftLedgerPath }
