/**
 * flow-draft.js — 轻量道工件起草器（双代并存：指纹 v1 / 纯 markdown v2）。
 *
 * v2（2026-10-04-thin-docs-v2，OpenSpec 对照 + 厚道结构门禁经验）：文档=纯 markdown 人类
 * 可读正文——零 MACHINE-DRAFT 指纹标记、零 AGENT 槽注释；FR 骨架只到标题锚（### FR-NN:
 * <成功标准原文>），SHALL 正文与 Scenario 场景块由 agent 撰写（空答/缺强度词在 flow done
 * 拒收）；防篡改锚点（成功标准原文 + design 四问文本）搬进 draft ledger 机器态
 * （schemaVersion:2 的 anchor 字段），flow done 做文档↔锚对比——问题被删/节被清空拒收，
 * 成功标准在 requirements/tasks 面消失出漂移 advisory。四问文本单一源=DESIGN_QUESTIONS
 * 常量（起草端与验收端同源，防镜像漂移）。tasks.md：镜像行=成功标准逐条全文本（不截断）
 * 任务锚 + 显式允许 agent 追加细化行（task-NN 编号顺延）。
 *
 * v1（存量在途变更，冻结不改）：全件机器起草 + MACHINE-DRAFT 指纹标记 + AGENT 槽书写面；
 *   - proposal：--input 机械转写；requirements：GWT 骨架预填；tasks：成功标准→checkbox 镜像；
 *   - 机器段经 machine-draft.wrapSection 包裹（sha256 指纹），draft-ledger 记段哈希+首版原文；
 *   - 守卫在验收侧：flow done verifyMarkers 三态拒收；flow amend-draft 唯一留痕修改通道。
 *   v1 判据=ledger.schemaVersion 缺省（1）；redraft/verify 按 ledger 代别自动选轨（双轨）。
 */
import { existsSync, readFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'
import { wrapSection, verifyMarkers, reanchorText, bodyHash, parseMarkerBlocks } from './machine-draft.js'
// 占位句常量真同源（2026-10-03-fr-skeleton-gate 评审 P3 清偿）：起草端 Then 兜底与骨架判据
// （fr-index.isThinSkeletonBodies）共用同一字面量——两处独立字符串会被评审实证为「镜像非同源」。
import { SKELETON_THEN_PLACEHOLDER } from './fr-index.js'

/** 读文件并归一化 CRLF→LF（2026-09-25-feedback-fixes④：Python/编辑器写盘 CRLF 会破坏 
 锚定的槽位识别 regex）。 */
function readText(path) { return readFileSync(path, 'utf8').replace(/\r\n/g, '\n') }

const AMEND_CMD = (change) => `sillyspec flow amend-draft --change ${change}`
const GUARD_NOTE = '整段改写会被 flow done 拒收'

/** v2 ledger 代别标记（draft ledger schemaVersion === 2 → 纯 markdown 轨；缺省=1 指纹轨）。 */
export const DRAFT_SCHEMA_V2 = 2

/**
 * design 四问单一源常量（v2）：起草端逐字写入 design.md，验收端（verifyThinDocsV2）对
 * ledger.anchor.designQuestions 逐字比对——两处独立字符串会被评审实证为「镜像非同源」。
 * v1 指纹稿的问题文本冻结在其 wrapped 段内（存量在途变更零影响），不回读本常量。
 */
export const DESIGN_QUESTIONS = {
  sections: [
    { key: 'approach', heading: '做法概述', lines: ['本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。'] },
    { key: 'contract', heading: '接口契约', lines: ['动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？'] },
    {
      key: 'boundaries',
      heading: '边界与并发（盲维四问——每问必答，答不了即设计缺口）',
      lines: [
        '1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？',
        '2. 并发写：两个执行体同时操作同一数据/文件会发生什么？',
        '3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？',
        '4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？',
      ],
    },
    { key: 'risks', heading: '风险与死路', lines: ['本方案最大的风险是什么？试过但放弃的方案及放弃理由？'] },
  ],
}

/** FR 行为句强度词判据（v2 验收端与模板指引共用）：正文行含任一 → 视为已撰写行为句。
 *  词表=SHALL/MUST/SHOULD（2026-10-04-strength-should P2 清偿：模板指引列 SHOULD 为合法
 *  强度，SHOULD NOT 由 SHOULD\b 前缀覆盖）+中文 必须/禁止。
 *  位置中英同构（2026-10-05-wordpos：anchor-triggerpull 收口实证——旧版英文被行首锚定
 *  （须「- 系统 MUST」形态）而中文任意命中，句中写英文强度词的合法行为句被误拒收；
 *  占位句自带词表字样的误放行由 pending 检查（（待撰写 前缀）独立拦截，不依赖本判据）。 */
const FR_STRENGTH_RE = /\b(SHALL|MUST|SHOULD)\b|必须|禁止/

/** sidecar 台账路径（.runtime 下，verify-draft sidecar 同族；命名空间=文件:段键）。 */
export function draftLedgerPath(runtimeRoot, changeName) {
  return join(runtimeRoot, `draft-ledger-${changeName}.json`)
}

const AGENT_SLOT = (n, hint) => `<!--AGENT:槽${n} ${hint}——例外裁决书写面（机器段之外合法） -->`

/**
 * 复合标准拆分 v2 起退役（2026-10-04-thin-docs-v2 FR-03）：「A/B」「A；B」保持整条——
 * 拆分是静默变形（谓词词表误判成对短名词/路径形态的历史坑全在同链），一条标准一行是
 * --input 书写者的责任，机器不做语义猜测。v1 在途变更的 redraft 同享本口径（摘录端
 * 单一实现，双轨差异只在文档形态不在摘录语义）。
 */

/**
 * 从任务原话摘「成功标准」条目（行级机械提取：「成功标准/验收」节下的条目行；无节则回退列表行）。
 * 编号劫持通道 v2 起退役（2026-10-04-thin-docs-v2 FR-03）：正文「1. …」编号条目不再取代成功
 * 标准节（动机/背景节的编号列点被误劫持为 FR 是实证变形）——条目只认「成功标准」节与无节时的
 * 列表行。opts.numberedChannel 参数保留兼容（redraft 调用面）但恒无效。
 */
/**
 * 续行合并判定（cli-protocol-trust，R17 实证）：括号/引号未闭合，或行尾悬空连接符
 * （冒号/顿号/逗号/开括号）→ 该行与下一行本是一条标准（--input 手写换行拆散）。
 * 节标题行（成功标准：/动机：等）不参与合并——它们必须独立成行才能被节检测正则命中。
 */
const SECTION_HEAD_RE = /^(?:#+\s*)?(成功标准|验收标准|验收|acceptance|动机|背景|关键问题|变更范围|需求|非目标)[：:]?$/i
function needsContinuationMerge(line) {
  if (SECTION_HEAD_RE.test(line)) return false
  if (/[：:、，,（(【\[「『]$/u.test(line)) return true // 行尾悬空连接符/开括号收尾
  const pairs = [['(', ')'], ['（', '）'], ['【', '】'], ['[', ']'], ['「', '」'], ['『', '』']]
  for (const [o, c] of pairs) {
    const open = (line.match(new RegExp('\\' + o, 'g')) || []).length
    const close = (line.match(new RegExp('\\' + c, 'g')) || []).length
    if (open > close) return true
  }
  return false
}

/** 碎片特征检测（cli-protocol-trust）：括号不平衡/开括号收尾/闭括号开头——只警告不阻断
 * （句子级强切与「完整标点收尾」自检经方案评审否决：误伤复合条目/无标点短条目）。 */
function detectFragmentedCriteria(criteria, context) {
  for (const c of criteria || []) {
    const open = (c.match(/[（(【\[「『]/g) || []).length
    const close = (c.match(/[）)】\]」』]/g) || []).length
    if (open !== close || /[（(【\[「『]$/u.test(c) || /^[）)】\]」』]/.test(c)) {
      console.warn(`⚠️ 摘录碎片特征：条目「${String(c).slice(0, 50)}${String(c).length > 50 ? '…' : ''}」括号不平衡（${open} 开/${close} 闭）——疑为切分残留，请核对 ${context || 'requirements/tasks'} 机器段`)
    }
  }
}

/** tasks 行截断（cli-protocol-trust）：60 字硬切改句界感知（窗内取末个句读，无则硬切），
 * 带省略号收尾。下游消费按 `- [ ] task-NN` 前缀锚（complete.js 勾选正则/--step 断言），
 * 不依赖截断长度——放宽安全（方案评审确认）。导出供 test/draft-continuation 直测。 */
export function clipTaskText(s) {
  const str = String(s || '')
  if (str.length <= 80) return str
  const win = str.slice(0, 80)
  const m = win.match(/[。；;！!？?，,][^。；;！!？?，,]*$/)
  const cut = m ? win.slice(0, win.length - m[0].length + 1) : win
  return cut.replace(/[,，、;；\s]+$/, '') + '…'
}

export function extractSuccessCriteria(input, opts = {}) {
  if (!input) return []
  const NL = /\r\n|\r|\n/
  const rawLines = String(input).split(NL).map((l) => l.trim()).filter(Boolean)
  // 续行合并（R17 实证：括号换行的单条标准被行级切分拆成两条碎片）
  const lines = []
  for (const l of rawLines) {
    const prev = lines[lines.length - 1]
    if (prev != null && needsContinuationMerge(prev)) lines[lines.length - 1] = prev + l
    else lines.push(l)
  }
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

// ════════════════════════════ v2 纯 markdown 起草族（2026-10-04-thin-docs-v2）════════════════════════════
// 文档=人类可读正文（零指纹标记零 AGENT 槽注释）；FR 只给标题锚（成功标准原文逐字），
// SHALL 正文/Scenario 场景块/绑定行由 agent 撰写，空答在验收端拒收（护栏#2：守卫在验收侧）。

/** proposal v2：动机原话转写 + 范围/成功标准纯文本清单。 */
function draftProposalV2({ change, input, criteria }) {
  const crit = criteria || []
  const lines = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 提案书（Proposal）— ${change}`,
    '',
    '## 动机',
    '',
    `任务原话转写：${input || '（未提供 --input）'}`,
    '',
    '## 变更范围',
    '',
    ...(crit.length > 0
      ? [`按成功标准机械推导，共 ${crit.length} 条验收面：`, ...crit.map((c, i) => `${i + 1}. ${c}`)]
      : ['（--input 未含成功标准条目——flow done 测试门与工件校验为默认验收面）']),
    '',
    '## 成功标准（可验证）',
    '',
    ...(crit.length > 0
      ? crit.map((c, i) => `${i + 1}. ${c}`)
      : ['1. flow done 六子步全绿（测试门实测通过+工件校验通过）']),
    '',
  ]
  return lines.join('\n')
}

/** requirements v2：FR 标题锚（成功标准原文逐字、不截断）+ SHALL/Scenario 撰写指引 + 纯文本绑定行。 */
function draftRequirementsV2({ change, criteria }) {
  const crit = criteria && criteria.length > 0 ? criteria : null
  const n = crit ? crit.length : 1
  const frBlocks = (crit || ['（按任务语义撰写）']).map((c, i) => {
    const id = `FR-${String(i + 1).padStart(2, '0')}`
    return [
      `### ${id}: ${c}`,
      '',
      `- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）`,
      '',
      '#### 场景：主路径',
      '',
      '（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）',
    ].join('\n')
  })
  const bindingRows = Array.from({ length: n }, (_, i) =>
    `FR-${String(i + 1).padStart(2, '0')}: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）`)
  return [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 需求规格（Requirements）— ${change}`,
    '',
    '## 功能需求',
    '',
    '> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；',
    '> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。',
    '> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。',
    '',
    ...frBlocks.flatMap((b) => [b, '']),
    '## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）',
    '',
    ...bindingRows.join('\n').split('\n'),
    '',
  ].join('\n')
}

/** design v2：四节问题文本（DESIGN_QUESTIONS 单一源逐字）+ 作答区（答案写在问题下方）。 */
function draftDesignRecordV2({ change }) {
  const secs = DESIGN_QUESTIONS.sections.map((s) => [
    `## ${s.heading}`,
    '',
    ...s.lines,
    '',
  ])
  return [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 设计记录（Design Record）— ${change}`,
    '',
    '> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。',
    '> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。',
    '> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。',
    '',
    ...secs.flat(),
  ].join('\n')
}

/** tasks v2：镜像行=成功标准逐条全文本（不截断）任务锚 + agent 细化行追加指引。 */
function draftTasksV2({ change, criteria, withTasks }) {
  const crit = criteria || []
  const rows = crit.length > 0
    ? crit.map((c, i) => `- [ ] task-${String(i + 1).padStart(2, '0')}: ${c}`)
    : ['- [ ] task-01: 完成实现并使 flow done 六子步全绿']
  return [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 任务注册表（Tasks）— ${change}`,
    '',
    '> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径',
    '> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——',
    `> ${withTasks ? '任务卡模式（--with-tasks/--thick）：tasks/task-NN.md 卡已生成，中间自愿 task done，收尾仍 flow done' : '默认 thin：无任务卡文件，收口=flow done 唯一裁决'}）。`,
    `> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change ${change} --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。`,
    `> \`flow status --change ${change}\` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。`,
    '',
    ...rows,
    '',
  ].join('\n')
}

/**
 * v2 工件校验（flow done artifacts 子步消费面；ledger.schemaVersion===2 时取代指纹三态+槽位门）。
 * 拒收项（violations）：四问被删/节空答、FR 未撰写行为句（缺强度词）、绑定行空/待填、
 * 四件缺失/结构缺失。漂移 advisory：锚内成功标准在 requirements FR 标题与 tasks 镜像行中
 * 失踪（门柱漂移嫌疑——agent 改写是合法例外，advisory 提示审核面核对，不阻断）。
 * adopted brainstorm 变更（opts.skipDesign）豁免 design 四节门（设计承诺以 brainstorm design 为准）。
 */
export function verifyThinDocsV2({ changeDir, ledger, skipDesign = false }) {
  const violations = []
  const advisories = []
  const anchorCriteria = Array.isArray(ledger?.anchor?.criteria) ? ledger.anchor.criteria : []
  const read = (f) => {
    try { return readFileSync(join(changeDir, f), 'utf8').replace(/\r\n/g, '\n') } catch { return null }
  }

  // design 四节：问题在场（对锚逐字）+ 实质作答
  if (!skipDesign) {
    const dText = read('design.md')
    if (dText === null) violations.push('design.md 缺失（v2 起草件在案）——删除后重入 flow start 补生成')
    else {
      const anchorSections = ledger?.anchor?.designQuestions?.sections || DESIGN_QUESTIONS.sections
      const dLines = dText.split('\n')
      for (const sec of anchorSections) {
        if (!dLines.some((l) => l.trim() === `## ${sec.heading}`)) {
          violations.push(`design「${sec.heading}」节被删（标题缺失）——恢复小节与四问原文后作答`)
          continue
        }
        for (const q of sec.lines) {
          if (!dLines.some((l) => l.trim() === q)) violations.push(`design「${sec.heading}」问题文本被改写：「${q.slice(0, 30)}…」——恢复原文（问题钉死，答案写在下方）`)
        }
        // 实质作答：节内非空行 - 标题行 - 问题行 - 引导行（> 开头）≥1
        const start = dLines.findIndex((l) => l.trim() === `## ${sec.heading}`)
        let end = dLines.findIndex((l, i) => i > start && /^##\s/.test(l))
        if (end === -1) end = dLines.length
        const qSet = new Set(sec.lines)
        const answered = dLines.slice(start + 1, end).some((l) => {
          const t = l.trim()
          return t && !qSet.has(t) && !t.startsWith('>') && !t.startsWith('##')
        })
        if (!answered) violations.push(`design「${sec.heading}」未作答——每节至少一行（小改动可写「不适用：<理由>」）`)
      }
    }
  }

  // requirements：FR 行为句 + 绑定行
  const rText = read('requirements.md')
  const frIds = []
  if (rText === null) violations.push('requirements.md 缺失——删除后重入 flow start 补生成')
  else {
    const rLines = rText.split('\n')
    const frHeadRe = /^### (FR-\d{2}):\s*(.*)$/
    for (let i = 0; i < rLines.length; i++) {
      const m = rLines[i].match(frHeadRe)
      if (!m) continue
      frIds.push(m[1])
      // 块体：到下一 ### / ## 或文尾
      let j = i + 1
      const body = []
      while (j < rLines.length && !/^(###|##)\s/.test(rLines[j])) { body.push(rLines[j]); j++ }
      const hasStrength = body.some((l) => FR_STRENGTH_RE.test(l))
      const pending = body.some((l) => /^\s*-?\s*（待撰写/.test(l.trim()))
      if (!hasStrength || pending) violations.push(`${m[1]} 行为句未撰写——正文须含强度词（必须/禁止/SHOULD/SHOULD NOT/MUST）的一句可判定行为规定`)
      i = j - 1
    }
    if (frIds.length === 0) violations.push('requirements 功能需求区为空——至少一条 `### FR-NN: 标题` + 行为句')
    // 绑定行：## 测试绑定 节内 `FR-NN: 内容`
    const bindStart = rLines.findIndex((l) => /^##\s*测试绑定/.test(l))
    if (bindStart === -1) violations.push('requirements「## 测试绑定」节缺失——每条 FR 至少一行绑定')
    else {
      const bindRows = new Map()
      for (let i = bindStart + 1; i < rLines.length && !/^##\s/.test(rLines[i]); i++) {
        const bm = rLines[i].match(/^(FR-\d{2})[：:]\s*(.*)$/)
        if (bm) bindRows.set(bm[1], bm[2].trim())
      }
      for (const id of frIds) {
        const v = bindRows.get(id)
        if (v === undefined) violations.push(`${id} 测试绑定行缺失——格式 \`FR-NN: test/路径「用例名」\`（无测试面写「不适用：理由」）`)
        else if (!v || v.startsWith('（待填')) violations.push(`${id} 测试绑定未作答——空行/待填在收口拒收`)
      }
    }
  }

  // tasks：镜像行在场（缺失 → advisory 漂移；零任务行 → 拒收）
  const tText = read('tasks.md')
  if (tText === null) violations.push('tasks.md 缺失——删除后重入 flow start 补生成')
  else {
    const taskRows = [...tText.matchAll(/^- \[([ xX])\] (task-\d+):/gm)]
    if (taskRows.length === 0) violations.push('tasks.md 无任何 task-NN 行——镜像任务锚不可整删（细化可追加，锚行勿删）')
  }

  // proposal：在场 + 成功标准节非空
  const pText = read('proposal.md')
  if (pText === null) violations.push('proposal.md 缺失——删除后重入 flow start 补生成')
  else if (!/^##\s*成功标准/m.test(pText)) violations.push('proposal「## 成功标准」节缺失——门柱锚（删除会致漂移判定失真）')

  // 漂移 advisory：requirements 的 FR 标题锚是对账面（归档索引用它）——锚文本从 requirements
  // 消失即 advisory（子串包含语义：轻改写保留原文不误报；agent 合法改写是书写面权利，advisory
  // 交审核面核对语义未失真，不阻断）。tasks 镜像行同判（仅 requirements 在场时才查——FR 面已
  // 漂移的不重复报）。proposal 不参与（成功标准节=--input 转写件，非对账面）。
  for (let i = 0; i < anchorCriteria.length; i++) {
    const c = String(anchorCriteria[i] || '').trim()
    if (!c) continue
    const inFr = rText !== null && rText.includes(c)
    const inTasks = tText !== null && tText.includes(c)
    if (!inFr) advisories.push(`成功标准第 ${i + 1} 条原文未在 requirements 见到（FR 标题锚漂移嫌疑——若属有意改写请核对语义未失真）：${c.slice(0, 40)}${c.length > 40 ? '…' : ''}`)
    else if (!inTasks) advisories.push(`成功标准第 ${i + 1} 条未在 tasks.md 见到镜像行（任务锚漂移嫌疑——镜像行勿删，细化行可追加）`)
  }
  return { violations, advisories }
}


/**
 * 成功标准 → GWT 骨架预填（governance-autopilot，R20 实证：agent 手写 FR +12 轮 Edit）——
 * 从标准文本机械推导三段。骨架进场 agent 可覆盖（消灭空槽冷启动，agent 只需改错的不需从零写）。
 */
/** When/Then 分隔符扫描（2026-10-03-fr-inject-relevance-rank）：只在括号深度 0 处生效——
 * 括号内箭头/「则/使得」不切（实证：平台仓 2026-09-30-breadcrumb-dedupe-zh FR-03 的
 * 「（changes→变更中心 等）」被当分隔符，When=半截括号、Then=后半截）。返回 [when, then] 或
 * null（无深度 0 切分点）。导出供 test 直测。 */
export function splitGwtSeparator(criterion) {
  const OPEN = new Set(['（', '(', '【', '[', '「', '『'])
  const CLOSE = new Set(['）', ')', '】', ']', '」', '』'])
  const s = String(criterion || '')
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (OPEN.has(ch)) { depth++; continue }
    if (CLOSE.has(ch)) { if (depth > 0) depth--; continue }
    if (depth > 0) continue
    if (ch === '→' || ch === '➜') return [s.slice(0, i), s.slice(i + 1)]
    if (ch === '则') return [s.slice(0, i), s.slice(i + 1)]
    if (ch === '使' && s.startsWith('使得', i)) return [s.slice(0, i), s.slice(i + 2)]
  }
  return null
}

function draftGwtSkeleton(criterion, index) {
  const c = String(criterion || '').trim()
  const id = `FR-${String(index + 1).padStart(2, '0')}`
  if (!c) return `### ${id}: （待描述）\nGiven 系统就绪\nWhen 执行目标行为\nThen 达成预期`
  const kw = c.match(/(api|端点|接口|存储|迁移|鉴权|幂等|上限|正序|增量|append-only|前端|组件|折叠|高亮|徽标|轮询|测试|E2E|curl)/gi)
  const given = kw && kw.length > 0 ? `Given ${[...new Set(kw.map(k => k.toLowerCase()))].slice(0, 3).join(' / ')} 相关模块就绪` : 'Given 系统就绪'
  const parts = splitGwtSeparator(c)
  const when = (parts && parts[0] ? parts[0] : c).trim().slice(0, 80)
  const then = (parts && parts[1] ? parts[1] : SKELETON_THEN_PLACEHOLDER).trim().slice(0, 80)
  // 标题不截断（2026-10-03-fr-inject-relevance-rank）：旧 slice(0,50) 硬切留永久残句（平台仓
  // FR-components-shared-038「…专业术语除」实证）且随归档固化进知识索引——标题全量保留。
  return `### ${id}: ${c}\n${given}\nWhen ${when}\nThen ${then}`
}

/** requirements 机器稿 v1（指纹代，存量在途变更 redraft 专用；新生成走 draftRequirementsV2）。 */
function draftRequirements({ change, criteria, input }) {
  const crit = criteria || []
  // GWT 骨架预填（governance-autopilot）：FR 区直接生成完整 Given/When/Then 块——agent 可覆盖
  const frBlocks = crit.length > 0
    ? crit.map((c, i) => draftGwtSkeleton(c, i)).join('\n\n')
    : '### FR-01: （按任务语义填写）\nGiven 系统就绪\nWhen 执行目标行为\nThen 达成预期'
  const n = crit.length > 0 ? crit.length : 1
  const bindingSlots = Array.from({ length: n }, (_, i) => {
    const id = `FR-${String(i + 1).padStart(2, '0')}`
    return `<!--AGENT:测试绑定${id} 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->`
  }).join('\n\n')
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 需求规格（Requirements）— ${change}`,
    '',
    '## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）',
    '',
    `<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->`,
    frBlocks,
    '',
    '## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）',
    '',
    bindingSlots,
    '',
  ].join('\n')
  return { text, sections: collectSections(text) }
}

/**
 * requirements「测试绑定」槽位门（flow done artifacts 子步消费面）：每条 FR 的绑定行非空
 * （「不适用：理由」=已答）。双格式：v2 纯文本行（`## 测试绑定` 节内 `FR-NN: 内容`——
 * 空行/（待填=未答）；v1 AGENT 槽标记（<!--AGENT:测试绑定FR-NN → 下一段非空=已答）。
 * FR 机器段在场但零绑定面 = 骨架早于本机制的旧版——修复路径是删 requirements.md 重入
 * flow start。纯读盘面；无 requirements.md → not-applicable（redraft 补生成）。
 */
export function verifyRequirementBindings({ changeDir }) {
  const path = join(changeDir, 'requirements.md')
  if (!existsSync(path)) return { applicable: false, emptySlots: [] }
  const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  // v2 纯文本绑定：文档含 ## 测试绑定 节且无 AGENT 绑定槽 → 走行级校验
  if (/^##\s*测试绑定/m.test(text) && !/<!--\s*AGENT:测试绑定/.test(text)) {
    const lines = text.split('\n')
    const frIds = [...text.matchAll(/^### (FR-\d{2}):/gm)].map((m) => m[1])
    const bindStart = lines.findIndex((l) => /^##\s*测试绑定/.test(l))
    const rows = new Map()
    for (let i = bindStart + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
      const bm = lines[i].match(/^(FR-\d{2})[：:]\s*(.*)$/)
      if (bm) rows.set(bm[1], bm[2].trim())
    }
    const emptySlots = []
    for (const id of frIds.length > 0 ? frIds : ['FR-01']) {
      const v = rows.get(id)
      if (v === undefined) emptySlots.push(`测试绑定${id}（行缺失）`)
      else if (!v || v.startsWith('（待填')) emptySlots.push(`测试绑定${id}`)
    }
    if (frIds.length === 0) emptySlots.push('FR区（agent 未填写功能需求——每条 FR 格式 ### FR-NN: 标题 + 强度词行为句）')
    return { applicable: true, emptySlots }
  }
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
 *
 * 2026-09-26-binding-anchor-fidelity：tests 条目从纯路径扩为「路径＋可选用例锚」——
 * 用例锚只在路径 token 后的紧邻窗口（到下一路径 token 或文本尾）捕获，四形态任一：
 * 「X」＋可选 组/用例 后缀、#id、::id、> name（书写原形只摘不译，「：」后是描述不捕）；
 * 裸文件名/残缺路径段解析为项目相对全路径（直取存在优先，仓内唯一后缀命中，歧义原样保留）。
 */
// 扩展名交替按长度降序（tsx 先于 ts——坑 fr-domain-suggest 同链实证：2026-09-28 归档绑定行
// governance-cards.test.tsx 被截成 .test.ts，test-bindings 的 .ts→.tsx 变体兜底正是本序的
// 历史代偿；正则交替贪心取首个命中，短扩展名在前吃掉长扩展名的尾字符）
const TEST_PATH_TOKEN_RE = /[A-Za-z0-9_/.-]+\.(?:mjs|cjs|tsx|ts|js|py)/g
// 用例锚四形态（「X」＋可选 组/用例 后缀、#id、::id、> name）——字符类排除竖线：锚条目
// 在 FR 机器子块按 `tests: a | b` 序列化、split('|') 回读（评审 P2），带竖线的锚在竖线处
// 截断（诚实降级），不产出裂格式幻影条目。
const CASE_ANCHOR_RE = /^\s*(?:(#[^\s：；;，。\n|]+)|(::[^\s：；;，。\n|]+)|(>\s*[^：；;，。\n|]+)|(「[^」\n|]+」(?:组|用例)?))/
const isTestPathToken = (p) => /(^|\/)(test|tests)\//.test(p) || /\.(test|spec)\./.test(p) || /_test\b/.test(p) || /_spec\b/.test(p)

/** 仓内文件索引（懒建：首个直取未命中的 token 才扫描；单次提取调用内缓存）。
 *  排除依赖/生成物/治理面目录（点目录全跳）；条目上限熔断防病态大仓。 */
function buildRepoFileIndex(root) {
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'out', 'target', 'vendor', 'venv', '.venv', '__pycache__'])
  const files = []
  const walk = (dir) => {
    if (files.length >= 100000) return
    let ents
    try { ents = readdirSync(dir, { withFileTypes: true }) } catch { return }
    ents.sort((a, b) => (a.name < b.name ? -1 : 1))
    for (const e of ents) {
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name)) }
      else files.push(join(dir, e.name))
    }
  }
  walk(root)
  return files
}

/** 裸文件名/路径段 → 项目相对全路径：直取命中原样返回；否则仓内唯一命中（rel===p /
 *  rel 以 /p 结尾 / 基名相等）解析；零/多命中原样保留（诚实——dangling 校验自然暴露）。 */
function resolveTestPathRel(p, root, indexRef) {
  if (!root || existsSync(join(root, p))) return p
  if (!indexRef.files) indexRef.files = buildRepoFileIndex(root)
  const want = p.replace(/\\/g, '/')
  const hits = []
  for (const abs of indexRef.files) {
    const rel = abs.slice(root.length + 1).replace(/\\/g, '/')
    if (rel === want || rel.endsWith('/' + want) || rel.split('/').pop() === want) hits.push(rel)
    if (hits.length > 1) break
  }
  return hits.length === 1 ? hits[0] : p
}

function extractTestAnchors(content, root, indexRef) {
  const matches = [...content.matchAll(TEST_PATH_TOKEN_RE)]
  const out = []
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const raw = m[0].replace(/^[./\\]+/, '').replace(/\\/g, '/')
    if (!isTestPathToken(raw)) continue
    const winEnd = i + 1 < matches.length ? matches[i + 1].index : content.length
    const file = resolveTestPathRel(raw, root, indexRef)
    // 连续锚段全收（坑 test-trace-tests-glue-bracket-note 边角，2026-09-27 实证：`path「a」「b」`
    // 只粘首段、「b」静默丢弃）：路径后紧跟的每一段用例锚（四形态任意序列）各产一条
    // 书写原形条目；无锚产纯路径条目（原行为零变化）。
    let rest = content.slice(m.index + m[0].length, winEnd)
    let anchored = false
    for (;;) {
      const cm = rest.match(CASE_ANCHOR_RE)
      if (!cm) break
      out.push(file + cm[0].trim().replace(/^>\s*/, ' > '))
      rest = rest.slice(cm[0].length)
      anchored = true
    }
    if (!anchored) out.push(file)
  }
  return [...new Set(out)]
}

export function extractRequirementBindings({ changeDir, change }) {
  const path = join(changeDir, 'requirements.md')
  if (!existsSync(path)) return []
  const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  // v2 纯文本绑定行（`## 测试绑定` 节内 `FR-NN: 内容`）——tests 锚与 v1 同规则
  // （extractTestAnchors：路径 token＋可选用例锚；「不适用」/「（待填」不产行）。
  if (/^##\s*测试绑定/m.test(text) && !/<!--\s*AGENT:测试绑定/.test(text)) {
    let root = null
    try {
      const r = dirname(dirname(dirname(changeDir)))
      root = existsSync(join(r, '.sillyspec')) ? r : process.cwd()
    } catch { root = process.cwd() }
    const indexRef = { files: null }
    const lines = text.split('\n')
    const bindStart = lines.findIndex((l) => /^##\s*测试绑定/.test(l))
    const rows = []
    for (let i = bindStart + 1; i >= 0 && i < lines.length && !/^##\s/.test(lines[i]); i++) {
      const bm = lines[i].match(/^(FR-\d{2})[：:]\s*(.*)$/)
      if (!bm) continue
      const content = bm[2].trim()
      if (!content || content.startsWith('（待填') || /^不适用/.test(content)) continue
      const tests = extractTestAnchors(content, root, indexRef)
      if (tests.length === 0) continue
      rows.push({ anchor: bm[1], row_id: `${change}:flow:测试绑定${bm[1]}`, tests, reason: 'spec', state: 'candidate', discovery: 'machine', confirmed_by: null, source_change: change })
    }
    return rows
  }
  const lines = text.split('\n')
  // 仓根推导：changeDir 形如 <root>/.sillyspec/changes/<名>（主仓/worktree 同构，三层上溯）；
  // 推导失效（目录形态异构）回退 cwd
  let root = null
  try {
    const r = dirname(dirname(dirname(changeDir)))
    root = existsSync(join(r, '.sillyspec')) ? r : process.cwd()
  } catch { root = process.cwd() }
  const indexRef = { files: null }
  const rows = []
  let current = null
  let buf = []
  const flush = () => {
    if (!current) return
    const content = buf.join('\n').trim()
    buf = []
    if (!content || /^不适用/.test(content)) return
    const tests = extractTestAnchors(content, root, indexRef)
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

/** tasks 机器稿（成功标准 → 逐条 checkbox 预填草稿）。计划面归 agent（2026-09-26-thin-agent-tasks，
 * 用户否决 thin-workunits 的域关键词聚类——开放世界任务形态不可穷举，枚举分类表是错误方向）：
 * 预填只是零冷启动兜底，简报明示可按实际实现路径覆写（保持 `- [ ] task-NN:` 行形态）——
 * 验收面锚定在 requirements FR（指纹保护），任务面不做机器分类。任务卡分岔：withTasks 才生成 tasks/task-NN.md。 */
function draftTasks({ change, criteria, withTasks }) {
  const crit = criteria || []
  const wrapped = (key, body) => wrapSection({ key, body, amendCmd: AMEND_CMD(change), guardNote: GUARD_NOTE })
  const rows = crit.length > 0
    ? crit.map((c, i) => `- [ ] task-${String(i + 1).padStart(2, '0')}: ${clipTaskText(c)}`)
    : ['- [ ] task-01: 完成实现并使 flow done 六子步全绿']
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 任务注册表（Tasks）— ${change}`,
    '',
    '> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；',
    `> ${withTasks ? '任务卡模式（--with-tasks/--thick）：tasks/task-NN.md 卡已生成，中间自愿 task done，收尾仍 flow done' : '默认 thin：无任务卡文件，收口=flow done 唯一裁决'}。`,
    `> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针 + 2026-10-03-voluntary-task-tick tick 动词）：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾 \`[x]\`（sillyspec task tick --change ${change} --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（勾选是进度锚与哨兵证据面，watcher 实时上平台）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口证据只读 tasks.md。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 \`- [ ]\`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。\`flow status --change <名>\` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。`,
    '',
    // tasks-rows 去指纹化（2026-09-25-feedback-fixes，平台狗粮反馈①）：勾选行在指纹段内导致
    // 勾一条就失配 → 必走 amend → editRatio=1 被判该走厚档——勾选纪律与指纹门自相矛盾。
    // 改为裸 markdown，agent 直接勾；哨兵的防假勾逻辑独立于指纹（按提交 token 判据）。
    rows.join('\n'),
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
 * 起草全件落盘 + draft-ledger 记账（flow start 消费面）。
 * v2（新生成）：纯 markdown 文档 + 锚入 ledger（criteria 原文 + 四问文本 + 首版全文——
 * 漂移对比与 editRatio 的基准）；文档正文零机器标记。
 * @returns {{written: string[], ledgerPath: string, criteria: string[], schema: number}}
 */
export function draftAll({ changeDir, change, input, withTasks = false, runtimeRoot }) {
  const criteria = extractSuccessCriteria(input)
  detectFragmentedCriteria(criteria, `flow start --input 摘录（change=${change}）`)
  const texts = {
    'proposal.md': draftProposalV2({ change, input, criteria }),
    'requirements.md': draftRequirementsV2({ change, criteria }),
    'design.md': draftDesignRecordV2({ change }),
    'tasks.md': draftTasksV2({ change, criteria, withTasks }),
  }
  const written = []
  const ledger = {
    schemaVersion: DRAFT_SCHEMA_V2,
    change,
    generatedAt: new Date().toISOString(),
    anchor: { criteria, designQuestions: DESIGN_QUESTIONS },
    files: {},
    amendments: [],
  }
  for (const [file, text] of Object.entries(texts)) {
    writeAtomicSync(join(changeDir, file), text)
    ledger.files[file] = { text }
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
  return { written, ledgerPath, criteria, schema: DRAFT_SCHEMA_V2 }
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
  // v2（2026-10-04-thin-docs-v2）：无指纹段可重锚——editRatio 改对「首版全文↔当前全文」算
  // （决策密度代理延续，基准=ledger.files[].text；口径=内容行——剥空行/frontmatter/标题/引导行，
  // 结构行会把比例稀释到阈值下失真）。路由信号（返回的 sectionRatios→CLI 取段级最大）只含
  // 决策载体 proposal/design：requirements 的 FR 撰写=需求澄清、tasks 的勾选/细化=合法日常动作，
  // 计入会把每个 v2 变更都误报 route_hint:thick（与 v1「FR 段不进决策密度/tasks 去指纹」同裁）
  // ——审计面在 ledger amendment 全量记录。
  if (ledger.schemaVersion === DRAFT_SCHEMA_V2) {
    const contentLines = (t) => String(t || '').split('\n').filter((l) => {
      const s = l.trim()
      return s && s !== '---' && !s.startsWith('#') && !s.startsWith('>')
    })
    const reanchored = []
    const sectionRatios = {}
    const auditRatios = {}
    let totalOrig = 0
    let totalChanged = 0
    for (const [file, rec] of Object.entries(ledger.files || {})) {
      if (!rec || typeof rec.text !== 'string') continue
      let cur
      try { cur = readText(join(changeDir, file)) } catch { continue }
      const ratio = Math.round(computeEditRatio(contentLines(rec.text).join('\n'), contentLines(cur).join('\n')) * 1000) / 1000
      auditRatios[file] = ratio
      if (cur !== rec.text) reanchored.push(file)
      if (file === 'proposal.md' || file === 'design.md') {
        sectionRatios[file] = ratio
        const aLines = contentLines(rec.text).length
        totalOrig += aLines
        totalChanged += Math.round(ratio * aLines)
      }
    }
    if (reanchored.length > 0) {
      ledger.amendments = [...(ledger.amendments || []), { at: new Date().toISOString(), files: reanchored, schema: DRAFT_SCHEMA_V2, sectionRatios: auditRatios }]
      writeAtomicSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
    }
    const editRatio = totalOrig > 0 ? Math.round((totalChanged / totalOrig) * 1000) / 1000 : 0
    return { reanchored, files: Object.keys(ledger.files || {}), editRatio, sectionRatios }
  }
  const reanchored = []
  const sectionRatios = {}
  let totalOrig = 0
  let totalChanged = 0
  for (const file of Object.keys(ledger.files || {})) {
    const mdPath = join(changeDir, file)
    let text
    try { text = readText(mdPath) } catch { continue }
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

/** 三态拒收校验（flow done 工件子步消费面；无 ledger=not-applicable）。双轨：
 *  schemaVersion===2 → verifyThinDocsV2（文档↔锚对比：问题/节/FR/绑定拒收 + 漂移 advisory）；
 *  v1（缺省）→ verifyMarkers 指纹三态（存量在途变更零影响）。
 *  opts.skipDesign：adopted brainstorm 变更豁免 design 四节门（flow.js 判定后透传）。 */
export function verifyFlowDrafts({ changeDir, change, runtimeRoot, skipDesign = false }) {
  const ledgerPath = draftLedgerPath(runtimeRoot, change)
  if (!existsSync(ledgerPath)) return { applicable: false, violations: [] }
  let ledger
  try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) } catch { return { applicable: false, violations: [] } }
  if (ledger.schemaVersion === DRAFT_SCHEMA_V2) {
    const r = verifyThinDocsV2({ changeDir, ledger, skipDesign })
    return { applicable: true, schema: DRAFT_SCHEMA_V2, ...r }
  }
  const violations = []
  for (const [file, sections] of Object.entries(ledger.files || {})) {
    const mdPath = join(changeDir, file)
    let text
    try { text = readText(mdPath) } catch {
      violations.push(`机器稿「${file}」不可读（draft ledger 在案）`)
      continue
    }
    violations.push(...verifyMarkers({ text, sections, amendCmd: AMEND_CMD(change) }))
  }
  return { applicable: true, schema: 1, violations, advisories: [] }
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
      const pText = readText(join(changeDir, 'proposal.md'))
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
  const ledgerPath = draftLedgerPath(runtimeRoot, change)
  let ledger = null
  try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) } catch { ledger = null }
  // 双轨（2026-10-04-thin-docs-v2 FR-09）：v1 在途变更（ledger.schemaVersion 缺省=1）补件
  // 沿用指纹稿（否则补件与存量件混代，verifyMarkers 拒收）；无 ledger / v2 → 纯 markdown v2。
  const legacy = ledger != null && ledger.schemaVersion !== DRAFT_SCHEMA_V2
  const drafts = legacy
    ? [
        { file: 'proposal.md', make: () => draftProposal({ change, input, criteria: crit }) },
        { file: 'requirements.md', make: () => draftRequirements({ change, criteria: crit, input }) },
        { file: 'design.md', make: () => draftDesignRecord({ change }) },
        { file: 'tasks.md', make: () => draftTasks({ change, criteria: crit, withTasks }) },
      ]
    : [
        { file: 'proposal.md', make: () => ({ text: draftProposalV2({ change, input, criteria: crit }) }) },
        { file: 'requirements.md', make: () => ({ text: draftRequirementsV2({ change, criteria: crit }) }) },
        { file: 'design.md', make: () => ({ text: draftDesignRecordV2({ change }) }) },
        { file: 'tasks.md', make: () => ({ text: draftTasksV2({ change, criteria: crit, withTasks }) }) },
      ]
  const drafted = []
  const criteriaForAnchor = crit || []
  for (const { file, make } of drafts) {
    if (existsSync(join(changeDir, file))) continue
    const d = make()
    writeAtomicSync(join(changeDir, file), d.text)
    drafted.push(file)
    if (!ledger) ledger = { schemaVersion: DRAFT_SCHEMA_V2, change, generatedAt: new Date().toISOString(), anchor: { criteria: criteriaForAnchor, designQuestions: DESIGN_QUESTIONS }, files: {}, amendments: [] }
    ledger.files[file] = legacy ? d.sections : { text: d.text }
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
  let text = readText(path)
  // 双格式在场即 no-op：v1 AGENT 槽或 v2 纯文本节任一在场（redraft 先产新稿自带绑定面）
  if (/<!--\s*AGENT:测试绑定/.test(text) || /^##\s*测试绑定/m.test(text)) return { appended: false, slots: 0 }
  const ids = []
  for (const m of text.matchAll(/(?:^|\n)#{2,4}\s*(FR-\d+)[^\n]*/g)) {
    const id = m[1]
    if (!ids.includes(id)) ids.push(id)
  }
  const list = ids.length > 0 ? ids : ['FR-01']
  // v2 纯文本绑定节（2026-10-04-thin-docs-v2）：行式 `FR-NN: （待填…）`——与 draftRequirementsV2
  // 及 verifyRequirementBindings/extractRequirementBindings 的 v2 分支同格式
  const slots = list.map((id) => `${id}: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）`)
  const section = `\n## 测试绑定（每条 FR 至少一行：\`FR-NN: test/路径「用例名」\`；不适用要写理由；flow done 空行拒收）\n\n${slots.join('\n')}\n`
  writeAtomicSync(path, text.endsWith('\n') ? text + section : text + '\n' + section)
  return { appended: true, slots: list.length }
}

export default { draftAll, amendFlowDraft, verifyFlowDrafts, verifyDesignRecordFilled, verifyRequirementBindings, verifyThinDocsV2, extractRequirementBindings, ensureBindingSlots, draftDesignRecord, redraftMissingArtifacts, draftDecisions, extractSuccessCriteria, draftLedgerPath, DESIGN_QUESTIONS, DRAFT_SCHEMA_V2 }
