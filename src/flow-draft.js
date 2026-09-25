/**
 * flow-draft.js — 全件机器起草器（R7 切片三 task-05 / D-004 D-005 / FR-07 FR-08）。
 *
 * 轻量跑道治理工件全部 CLI 机器起草（工件回填轮=0），agent 只裁例外：
 *   - proposal：--input 机械转写（动机/关键问题/变更范围从任务原话摘段）；
 *   - requirements：机械摘「成功标准」条目 → FR 条目；
 *   - tasks：成功标准 → checkbox 任务行；任务卡分岔（用户裁定#3）：默认 thin+直写零任务卡
 *     （轻量跑=quick 的协议兄弟）；--thick / --with-tasks 才生成 tasks/task-NN.md 卡；
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
import { wrapSection, verifyMarkers, reanchorText, bodyHash, parseMarkerBlocks } from './machine-draft.js'

const AMEND_CMD = (change) => `sillyspec flow amend-draft --change ${change}`
const GUARD_NOTE = '整段改写会被 flow done 拒收'

/** sidecar 台账路径（.runtime 下，verify-draft sidecar 同族；命名空间=文件:段键）。 */
export function draftLedgerPath(runtimeRoot, changeName) {
  return join(runtimeRoot, `draft-ledger-${changeName}.json`)
}

const AGENT_SLOT = (n, hint) => `<!--AGENT:槽${n} ${hint}——例外裁决书写面（机器段之外合法） -->`

/**
 * 从任务原话摘「成功标准」条目（行级机械提取：「成功标准/验收」节下的条目行；无节则回退列表行）。
 * 编号条目通道（2026-09-25-thin-fr-quality，R16 实证驱动）：输入为完整任务书时行为需求以
 * 「1. …n.」编号列在正文、成功标准节只有总括句（「上述 1-9 全部实现…」入库为 FR 是口号不是
 * 行为语义）——正文编号条目数 ≥3 且多于节条目时取而代之（与节条目去重）。adopt/proposal
 * 回提路径经 opts.numberedChannel=false 关闭（proposal 其他节的编号列表会误劫持）。
 */
export function extractSuccessCriteria(input, opts = {}) {
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
  // 编号条目通道：正文「1. …」行为条目（与节条目去重），数 ≥3 且多于节条目时取代
  if (opts.numberedChannel !== false) {
    const numbered = []
    for (const raw of lines) {
      const m = raw.match(/^\d{1,2}[.、)）]\s*(\S.*)$/)
      if (!m) continue
      const t = m[1].trim()
      if (t && !numbered.includes(t) && !criteria.includes(t)) numbered.push(t)
    }
    if (numbered.length >= 3 && numbered.length > criteria.length) return numbered
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

/** requirements 机器稿（骨架 + agent 填写 FR + 绑定槽——2026-09-25-fr-agent-writable，
 * 平台狗粮驱动架构修正：FR 内容从机器指纹段改为 agent 书写面（同 design 槽模式）。
 * 机器只搭骨架：节标题 + FR 空区（含参考摘录注释）+ 绑定槽。agent 干活时直接填 FR，
 * 不走 amend、不触发 edit_ratio——机器摘录 FR 太薄（「flow done 全绿」级）是实证痛点，
 * amend 改写被 route_hint:thick 误报打击改善积极性，且 FR 质量仍受限。 */
function draftRequirements({ change, criteria, input }) {
  const crit = criteria || []
  // 参考摘录（完整 HTML 注释包裹——确保解析器可跳过；非约束，agent 可采纳/改写/忽略）
  const refComment = crit.length > 0
    ? `\n<!--\n参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）\n${crit.map((c, i) => `FR-${String(i + 1).padStart(2, '0')}: ${c}`).join('\n')}\n-->\n`
    : '\n<!-- 无成功标准摘录——agent 按任务语义自行编写 FR -->\n'
  // 绑定槽：按摘录条目数生成（agent 增删 FR 后自行增删对应绑定槽）
  const n = crit.length > 0 ? crit.length : 1
  const bindingSlots = Array.from({ length: n }, (_, i) => {
    const id = `FR-${String(i + 1).padStart(2, '0')}`
    return `<!--AGENT:测试绑定${id} 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->`
  }).join('\n\n')
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 需求规格（Requirements）— ${change}`,
    '',
    '## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）',
    '',
    `<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->${refComment}`,
    '',
    '## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）',
    '',
    bindingSlots,
    '',
  ].join('\n')
  return { text, sections: collectSections(text) }
}

/**
 * requirements「测试绑定」槽位门（flow done artifacts 子步消费面）：每条 FR 的绑定槽非空
 * （「不适用：理由」=已答）；FR 机器段在场但零绑定槽 = 骨架早于本机制的旧版——修复路径是
 * 删 requirements.md 重入 flow start（redraft 按 proposal 机器段回提 criteria 重新起草）。
 * 纯读盘面；无 requirements.md → not-applicable（redraft 补生成）。
 */
export function verifyRequirementBindings({ changeDir }) {
  const path = join(changeDir, 'requirements.md')
  if (!existsSync(path)) return { applicable: false, emptySlots: [] }
  const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const emptySlots = []
  let current = null
  let hasContent = false
  let slotCount = 0
  let frAreaFilled = false
  let inFrArea = false
  let inHtmlComment = false
  const flush = () => { if (current && !hasContent) emptySlots.push(current) }
  for (const line of lines) {
    if (/^<!--\s*AGENT:FR区/.test(line)) { inFrArea = true; continue }
    // HTML 注释跳过（参考摘录里的 FR 行不算 agent 填写）：<!-- 开非 AGENT 行入注释态，--> 出
    if (/^<!--(?!.*AGENT)/.test(line.trim())) { inHtmlComment = !/-->/.test(line); continue }
    if (inHtmlComment) { if (/-->/.test(line)) inHtmlComment = false; continue }
    if (inFrArea && (/^<!--\s*AGENT:测试绑定/.test(line) || /^##\s/.test(line))) {
      inFrArea = false
      // FR 区内容检查：至少一行非注释非空的实质内容（### FR- 开头的行为需求）
      if (!frAreaFilled) emptySlots.push('FR区（agent 未填写功能需求——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then）')
    }
    if (inFrArea && /^###\s+FR-/.test(line)) frAreaFilled = true
    if (/^<!--\s*AGENT:测试绑定/.test(line)) {
      flush()
      current = (line.match(/AGENT:(测试绑定\S+)/) || [])[1] || '测试绑定'
      hasContent = false
      slotCount++
      continue
    }
    if (/^<!--/.test(line) || /^#{1,6}\s/.test(line)) { flush(); current = null; continue }
    if (current && line.trim()) hasContent = true
  }
  flush()
  // FR 区在文件尾的情况（无后续节）
  if (inFrArea && !frAreaFilled) emptySlots.push('FR区（agent 未填写功能需求）')
  if (slotCount === 0 && !/AGENT:FR区/.test(text) && !/MACHINE-DRAFT:requirements-frs/.test(text)) {
    // 无 FR 区标记也无绑定槽 = 骨架过旧或异常
    return { applicable: true, emptySlots: ['（requirements 结构异常——无 FR 区标记也无绑定槽；修复：删除 requirements.md 后重入 flow start 补生成）'] }
  }
  return { applicable: true, emptySlots }
}

/**
 * 从「测试绑定」槽提取绑定行（flow done distill 子步消费面 → writeChangeTrace →
 * indexRequirements 归档提升铸全局）。锚=FR 局部编号（FR-01…，与机器 FR 序一致）；
 * 「不适用」/无路径 token 的作答不产行；tests=作答文本里的测试文件路径（去重）。
 */
export function extractRequirementBindings({ changeDir, change }) {
  const path = join(changeDir, 'requirements.md')
  if (!existsSync(path)) return []
  const lines = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n')
  const rows = []
  let current = null
  let buf = []
  const flush = () => {
    if (!current) return
    const content = buf.join('\n').trim()
    buf = []
    if (!content || /^不适用/.test(content)) return
    const tests = [...new Set((content.match(/[A-Za-z0-9_/.-]+\.(?:mjs|cjs|js|ts|tsx|py)/g) || [])
      .map((t) => t.replace(/^[./\\]+/, '').replace(/\\/g, '/')))]
      .filter((t) => /(^|\/)(test|tests)\//.test(t) || /\.(test|spec)\./.test(t) || /_test\b/.test(t) || /_spec\b/.test(t))
    if (tests.length === 0) return
    rows.push({ anchor: current.replace(/^测试绑定/, ''), row_id: `${change}:flow:${current.replace(/^测试绑定/, '')}`, tests, reason: 'spec', state: 'candidate', discovery: 'machine', confirmed_by: null, source_change: change })
  }
  for (const line of lines) {
    if (/^<!--\s*AGENT:测试绑定\S/.test(line)) {
      flush()
      current = (line.match(/AGENT:(测试绑定\S+)/) || [])[1] || null
      buf = []
      continue
    }
    if (/^<!--/.test(line) || /^#{1,6}\s/.test(line)) { flush(); current = null; continue }
    if (current) buf.push(line)
  }
  flush()
  return rows
}

/**
 * design.md 机器骨架（2026-09-24 v3 设计记录全档化第一片）：机器段=固定问题模板（指纹保护，
 * 问题不可被删改），AGENT 槽=作答面。盲维四问钉死在「边界与并发」节——对撞实验 5 个 P1 全落在
 * 乱序/并发/切换/作用域四维且全是承诺未落盘形态，问题模板化让危险问题每跑必被问；小改动槽里
 * 一行「不适用：<理由>」即合规（档位伸缩后续片）。
 */
export function draftDesignRecord({ change }) {
  const wrapped = (key, body) => wrapSection({ key, body, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 设计记录（Design Record）— ${change}`,
    '',
    '> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。',
    '> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。',
    '',
    '## 做法概述',
    wrapped('design-approach', '本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。'),
    AGENT_SLOT(1, '做法概述作答'),
    '',
    '## 接口契约',
    wrapped('design-contract', '动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？'),
    AGENT_SLOT(2, '接口契约作答'),
    '',
    '## 边界与并发（盲维四问——每问必答，答不了即设计缺口）',
    wrapped('design-boundaries', [
      '1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？',
      '2. 并发写：两个执行体同时操作同一数据/文件会发生什么？',
      '3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？',
      '4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？',
    ].join('\n')),
    AGENT_SLOT(3, '盲维四问作答'),
    '',
    '## 风险与死路',
    wrapped('design-risks', '本方案最大的风险是什么？试过但放弃的方案及放弃理由？'),
    AGENT_SLOT(4, '风险与死路作答'),
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
    '> 机器稿（成功标准机械推导）；轻量跑直写=零任务卡（任务即 checkbox 行）；',
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
    { file: 'design.md', draft: draftDesignRecord({ change }) },
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
      // FR 段不进决策密度（2026-09-25-fr-quality-fix，平台狗粮驱动）：agent 丰富 FR 文本=需求
      // 澄清非设计决策，计入 edit_ratio 会触发 route_hint:thick 误报，打击 FR 改善积极性。
      // sectionRatios 照记（审计可见），只是不计入 totalOrig/totalChanged 的汇总。
      const isFrSection = k === 'requirements-frs'
      if (!isFrSection) {
        const aLines = String(firstBody || '').split('\n').length
        totalOrig += aLines
        totalChanged += Math.round(ratio * aLines)
      }
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

/**
 * design.md AGENT 槽空槽判定（flow done 工件子步消费面）。槽内容 = 槽标记行之后到下一个
 * 标记/标题之前的非空行；「不适用：<理由>」是非空行，天然视作已答（档位伸缩的 S0 出口）。
 * 纯读盘面；无 design.md → not-applicable（存量变更/混跑回退面）。
 */
export function verifyDesignRecordFilled({ changeDir }) {
  const path = join(changeDir, 'design.md')
  if (!existsSync(path)) return { applicable: false, emptySlots: [] }
  const lines = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n')
  const emptySlots = []
  let current = null
  let hasContent = false
  let slotCount = 0
  const flush = () => {
    if (current && !hasContent) emptySlots.push(current)
  }
  for (const line of lines) {
    if (/^<!--\s*AGENT:/.test(line)) {
      flush()
      current = (line.match(/AGENT:(\S+)/) || [])[1] || '槽'
      hasContent = false
      slotCount++
      continue
    }
    if (/^<!--\s*MACHINE-DRAFT:/.test(line) || /^#{1,6}\s/.test(line)) {
      flush()
      current = null
      continue
    }
    if (current && line.trim()) hasContent = true
  }
  flush()
  // 防绕过：design.md 在场但零 AGENT 槽（骨架被整删/手写替代）——机器段指纹只护 ledger 在案
  // 变更，非在案面（如工具升级前的在途变更）唯一的守卫就是这里
  if (slotCount === 0) return { applicable: true, emptySlots: ['（骨架缺失——design.md 无任何 AGENT 作答槽，被整删或手写替代；恢复机器骨架后作答）'] }
  return { applicable: true, emptySlots }
}

/**
 * 幂等补起草（2026-09-25-thin-dogfood-fixes 修复①）：draft 谱系是 flow start 时点快照——
 * 工具升级新增工件（如 design.md）后，在途变更重入 start 拿不到新稿。缺哪补哪、已存在不碰
 * （agent 已填槽/已 amend 段零影响）、ledger 合并（新文件段落入账，既有段与 amendments 原样）。
 * criteria 来源：input 显式 > 既有 proposal 的 proposal-criteria 机器段回提（input 缺省不退化
 * 为兜底单行）> 空（draft 各自兜底）。
 */
export function redraftMissingArtifacts({ changeDir, change, input, runtimeRoot }) {
  // criteria 回提：input 显式 > 既有 proposal 机器段（轻量变更自产，指纹保证原文可信）> proposal
  // 手写「成功标准」节（brainstorm 预段产物，adopt 路径）> 空（draft 各自兜底）
  let criteria = input ? extractSuccessCriteria(input) : null
  if (criteria === null || (Array.isArray(criteria) && criteria.length === 0)) {
    try {
      const pText = readFileSync(join(changeDir, 'proposal.md'), 'utf8')
      const block = parseMarkerBlocks(pText).find((b) => b.key === 'proposal-criteria')
      if (block) {
        criteria = block.contentLines
          .map((l) => l.trim())
          .filter((l) => /^\d+[.、]\s+/.test(l))
          .map((l) => l.replace(/^\d+[.、]\s+/, ''))
      } else {
        // adopt 回提关闭编号通道：proposal 其他节（变更范围/非目标）的编号列表会误劫持
        criteria = extractSuccessCriteria(pText, { numberedChannel: false })
      }
    } catch { /* 无 proposal 可回提 → 空，draft 各自兜底 */ }
  }
  const crit = Array.isArray(criteria) && criteria.length > 0 ? criteria : null
  const withTasks = existsSync(join(changeDir, 'tasks'))
  const drafts = [
    { file: 'proposal.md', make: () => draftProposal({ change, input, criteria: crit }) },
    { file: 'requirements.md', make: () => draftRequirements({ change, criteria: crit, input }) },
    { file: 'design.md', make: () => draftDesignRecord({ change }) },
    { file: 'tasks.md', make: () => draftTasks({ change, criteria: crit, withTasks }) },
  ]
  const ledgerPath = draftLedgerPath(runtimeRoot, change)
  let ledger = null
  try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) } catch { ledger = null }
  const drafted = []
  for (const { file, make } of drafts) {
    if (existsSync(join(changeDir, file))) continue
    const d = make()
    writeAtomicSync(join(changeDir, file), d.text)
    drafted.push(file)
    if (!ledger) ledger = { schemaVersion: 1, change, generatedAt: new Date().toISOString(), files: {}, amendments: [] }
    ledger.files[file] = d.sections
  }
  if (drafted.length > 0) writeAtomicSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  return { drafted }
}

/**
 * 收编追加测试绑定槽（2026-09-25-thin-brainstorm-prestage adopt 路径消费面）：头脑风暴产物
 * requirements 是 agent 手写、无绑定面——按文中实际 FR 编号（###/## FR-NN 标题）追加机器
 * 绑定节（纯 AGENT 槽面，不指纹）；已有绑定槽/无 requirements → no-op（redraft 先产新稿自带槽）。
 */
export function ensureBindingSlots({ changeDir }) {
  const path = join(changeDir, 'requirements.md')
  if (!existsSync(path)) return { appended: false, slots: 0 }
  let text = readFileSync(path, 'utf8')
  if (/<!--\s*AGENT:测试绑定/.test(text)) return { appended: false, slots: 0 }
  const ids = []
  for (const m of text.matchAll(/(?:^|\n)#{2,4}\s*(FR-\d+)[^\n]*/g)) {
    const id = m[1]
    if (!ids.includes(id)) ids.push(id)
  }
  const list = ids.length > 0 ? ids : ['FR-01']
  const slots = list.map((id) => `<!--AGENT:测试绑定${id} 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->`)
  const section = `\n## 测试绑定（收编追加——每条 FR 至少一行：test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）\n\n${slots.join('\n\n')}\n`
  writeAtomicSync(path, text.endsWith('\n') ? text + section : text + '\n' + section)
  return { appended: true, slots: list.length }
}

export default { draftAll, amendFlowDraft, verifyFlowDrafts, verifyDesignRecordFilled, verifyRequirementBindings, extractRequirementBindings, ensureBindingSlots, draftDesignRecord, redraftMissingArtifacts, draftDecisions, extractSuccessCriteria, draftLedgerPath }
