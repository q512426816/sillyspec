/**
 * SillySpec Stage Review Gate — 阶段级审查校验（文档型）
 *
 * 与 task-review.js 的关系：
 *   task-review 校验 execute 每个 task 的 review.json（git 代码 diff 证据：base/head）。
 *   stage-review 校验 brainstorm/plan/execute-acceptance 的阶段级 review.json
 *   （文档证据：reviewedFiles + docHash）。两者 verdict 语义一致（pass/fail/cannot_verify
 *   三态 + cannot_verify 必须带 requiredEvidence 的反逃逸规则），复用 task-review 导出的
 *   VALID_VERDICTS / REVIEW_SCHEMA_VERSION 常量；task-review.js 本身不改、execute 路径零风险。
 *
 * 目录结构：
 *   .sillyspec/.runtime/stage-reviews/<stage>-<reviewRunId>/review.json
 *   （平台模式落 <runtimeRoot>/stage-reviews/...，与 execute-runs 同构）
 */

import { existsSync, readFileSync, mkdirSync, readdirSync } from 'fs'
import { writeAtomicSync } from './fs-atomic.js'
import { join } from 'path'
import { createHash } from 'crypto'
import jsYaml from 'js-yaml'
import { VALID_VERDICTS, REVIEW_SCHEMA_VERSION } from './task-review.js'
import { detectSpecDirTypo } from './spec-dir-typo.js'
import { resolveRuntimeRoot } from './run/shared.js'

// 文档型 stage review 的合法 reviewType
const STAGE_REVIEW_TYPES = ['design', 'plan', 'proposal', 'code', 'acceptance']

// checklist 每项 result 的合法值
const CHECKLIST_RESULTS = ['pass', 'gap', 'fail']

// stage → 主审查文档(brainstorm/execute 审 design.md;plan 审 plan.md)
const STAGE_MAIN_DOC = { brainstorm: 'design.md', plan: 'plan.md', execute: 'design.md' }
// stage → reviewType(对齐 gates.js Stage Review Gate 的映射)
const STAGE_REVIEW_TYPE = { brainstorm: 'design', plan: 'plan', execute: 'acceptance' }

// ── 独立审查通道优先序（2026-09-10 用户裁决：通道顺序是主观权衡，归用户配置不归 CLI 拍死）──
// 可选通道（tier=independent 时按序尝试首个可用）：
//   agent-tool 宿主 Agent tool 派子代理（现状默认首位）
//   platform   CLI 直发平台 worker（sillyspec review-dispatch，P2 落地——P1 指引标注「暂跳过」）
//   host-mcp   宿主自有 MCP 派活（能派独立执行者的 MCP tool）
//   self       降级自审（兜底；reviewerNotes 首行「降级：」+ reviewer.channel="self"，gate ⚠️ 留痕）
const REVIEW_CHANNELS = ['agent-tool', 'platform', 'host-mcp', 'self']
/** 缺省序 = 现状行为（agent-tool 打头），未配置用户零行为变化。 */
export const DEFAULT_REVIEW_CHANNEL_PRIORITY = ['agent-tool', 'platform', 'host-mcp', 'self']

/**
 * 读 local.yaml `review_dispatch.channel_priority`（best-effort 绝不抛）。
 * 语义规则：未知通道名过滤（warn 一次）；`self` 永远隐式垫底（防「全配置但全不可用 → 无路可走」）；
 * 空/缺段/解析失败 → 缺省序。配置只在**可用通道之间**起偏好作用——宿主没 Agent tool 时该通道
 * 自然跳过（PI 上实际生效序退化为 platform → self），配的是偏好不是能力。
 * @param {string} cwd 项目根（local.yaml 定位）
 * @returns {string[]} 通道优先序（恒非空，末位恒为 'self'）
 */
export function readReviewChannelPriority(cwd) {
  let raw = null
  try {
    const p = join(cwd || process.cwd(), '.sillyspec', 'local.yaml')
    if (existsSync(p)) raw = jsYaml.load(readFileSync(p, 'utf8'))
  } catch { raw = null }
  const rd = raw && typeof raw === 'object' && raw.review_dispatch && typeof raw.review_dispatch === 'object'
    ? raw.review_dispatch
    : null
  const arr = rd && Array.isArray(rd.channel_priority) ? rd.channel_priority : null
  if (!arr || arr.length === 0) return DEFAULT_REVIEW_CHANNEL_PRIORITY.slice()
  const picked = []
  for (const v of arr) {
    if (typeof v !== 'string') continue
    const name = v.trim()
    if (!REVIEW_CHANNELS.includes(name)) {
      if (name) console.warn(`[stage-review] review_dispatch.channel_priority 未知通道「${name}」已忽略（可选：${REVIEW_CHANNELS.join(' / ')}）`)
      continue
    }
    if (name !== 'self' && !picked.includes(name)) picked.push(name)
  }
  if (picked.length === 0) return DEFAULT_REVIEW_CHANNEL_PRIORITY.slice()
  return [...picked, 'self']
}

/**
 * reviewer.channel 识别（gate 审计分支依据）。优先级：结构化 reviewer.channel（合法值）>
 * reviewerNotes 首行「降级：」约定（2026-09-10 负面①降级条款的落款形态，向后兼容）>
 * 'unspecified'（既无标记的存量 review——历史产物默认宿主子代理口径，gate 不特殊处理）。
 * @param {object|null} review 解析后的 review.json
 * @returns {string} 'agent-tool'|'platform'|'host-mcp'|'self'|'unspecified'
 */
export function classifyReviewerChannel(review) {
  const ch = review && typeof review === 'object' && review.reviewer
    && typeof review.reviewer === 'object' && typeof review.reviewer.channel === 'string'
    ? review.reviewer.channel.trim()
    : ''
  if (REVIEW_CHANNELS.includes(ch)) return ch
  return isDegradedSelfReview(review) ? 'self' : 'unspecified'
}

/**
 * 渲染 review.json 产物契约(markdown)给 review 子代理事前看 —— schema 表 + 完整 JSON 示例 +
 * docHash 算法 + 重算提示 + 位置。复用 validateStageReviewSchema 的同源常量,事前给的 == 事后查的。
 *
 * 历史教训:review 子代理靠读 stage-review.js 源码 + 翻模板才搞清 schema,常错(漏 schemaVersion /
 * checklist 按层嵌套对象 / docHash 用主文档改版前的旧 sha256)。本函数把契约前置进 prompt。
 *
 * @param {{ stage?: string, changeDir?: string, reviewRunId?: string, tier?: string, channelPriority?: string[] }} opts
 *   channelPriority：通道优先序（readReviewChannelPriority 产物）。tier=independent 时渲染
 *   「审查执行通道」段（按用户配置序，缺省现状序）；缺省参数则函数自读（cwd 取 process.cwd，
 *   prompt.js/gates.js 等有精确 cwd 的调用方显式传入）。
 * @returns {string} markdown 段;tier=self 返回简短提示(无需 review.json)
 */
export function renderReviewJsonContract({ stage, changeDir, reviewRunId, tier, channelPriority } = {}) {
  if (tier === 'self') {
    return '> review.json 契约:tier=self(此刻 design.md 变更文件数 ≤3,当前 agent 自审即可)。⚠️ 注意:本判定基于此刻 design.md 快照——Stage Review Gate 会以 --done 时刻的 design.md 重新判定,若 design 后续扩大到 >3 文件,tier 将升级为 independent 并硬要求独立审查子代理产出 review.json。以 gate 实际校验结果为准(FAILED 即 independent 需补 review.json),勿据本提示提前断言无需 review.json。'
  }
  const reviewType = STAGE_REVIEW_TYPE[stage] || 'design'
  const mainDoc = STAGE_MAIN_DOC[stage] || 'design.md'
  const mainDocRel = changeDir ? 'changes/<change>/' + mainDoc : mainDoc
  const stageLbl = stage || '<stage>'
  const runIdLbl = reviewRunId || '<reviewRunId>'
  // 通道指引（2026-09-10 用户裁决：顺序归配置）。platform 通道 P2（review-dispatch 命令）落地前
  // 标注暂跳过——指引不引用不存在的命令（stage prompt 铁律「不编造 CLI 子命令」）。
  const priority = Array.isArray(channelPriority) && channelPriority.length > 0
    ? channelPriority
    : readReviewChannelPriority(process.cwd())
  const CHANNEL_DESC = {
    'agent-tool': '宿主 Agent tool 派独立子代理（subagent_type: general，独立上下文）',
    'platform': 'CLI 直发平台独立 worker（`sillyspec review-dispatch --change <变更名> --stage <stage>` 派发，`--status` 轮询回收——独立进程/会话，宿主无 Agent/MCP 亦可用）',
    'host-mcp': '宿主自有 MCP 派独立执行者（能派活的 MCP tool，如平台 MCP 的 dispatch 类工具）',
    'self': '降级自审：主代理切换审查者角色，reviewerNotes **首行**记「降级：环境无子代理可用」+ reviewer.channel="self"（gate 放行但留 ⚠️ 审计行），逐条结论附源码锚点补偿独立性',
  }
  const channelLines = priority.map((c, i) => `${i + 1}. **${c}** —— ${CHANNEL_DESC[c] || c}`).join('\n')
  const L = [
    '## 审查执行通道（tier=independent，按 local.yaml `review_dispatch.channel_priority` 优先序，**按序尝试首个可用通道**；顺序是用户配置的偏好，不是能力判定——某通道在当前宿主不可用就跳到下一个）',
    '',
    channelLines,
    '',
    '无论走哪个通道，review.json 落款 `reviewer: { "channel": "<通道名>", "missionId": null, "model": null }`（channel 用上方通道名；platform 通道填 missionId，可查模型时填 model）。这是审计面：gate 按 channel 留痕，self 触发 ⚠️——如实声明，勿伪装通道。',
    '',
    '## review.json 产物契约(CLI Stage Review Gate 将硬校验,以下为精确 schema —— 事前给的 == 事后查的)',
    '',
    '> 路径:`{SPEC_ROOT}/.runtime/stage-reviews/' + stageLbl + '-' + runIdLbl + '/review.json`(本次 reviewType=' + reviewType + ',主审查文档=' + mainDocRel + ')',
    '',
    '### 必填字段(validateStageReviewSchema 硬校验,缺任一即 schema 失败阻断)',
    '- `schemaVersion`: ' + REVIEW_SCHEMA_VERSION,
    '- `reviewType`: "' + reviewType + '"(必须与本 stage 一致;合法值 ' + STAGE_REVIEW_TYPES.join(' / ') + ')',
    '- `specVerdict` / `qualityVerdict`: ∈ { ' + VALID_VERDICTS.join(' / ') + ' }',
    '- `reviewedFiles`: 非空数组,[0] = 主审查文档 = `' + mainDocRel + '`',
    '- `docHash`: reviewedFiles[0] 文件内容的 sha256(hex,见下方算法)',
    '- `requiredEvidence`: 非空数组(specVerdict 或 qualityVerdict = cannot_verify 时必填,反逃逸)',
    '- `checklist`(可选): 扁平数组 —— 每项 { item: string, result: ∈ { ' + CHECKLIST_RESULTS.join(' / ') + ' }, note?: string }。注意是**扁平数组**,不是按层(定义/一致/可行性)嵌套对象',
    '- `reviewer`(可选,审计字段): { "channel": "agent-tool|platform|host-mcp|self", "missionId"?: string, "model"?: string } —— 审查执行通道落款(见上方「审查执行通道」段)',
    '- `reviewerNotes`: 说明(verdict=fail 时写明阻断项;宿主环境无 Agent tool 降级自审时**首行**记「降级：环境无子代理可用」——gate 放行但留 ⚠️ 审计行,勿伪装子代理审查)',
    '',
    '### docHash(一键代填,勿手算)',
    '- **推荐**:docHash 先占位(如 `"TODO"`),review.json 写完后跑',
    '  `sillyspec register-stage-review --change <变更名> --stage ' + stageLbl + ' --refresh-hash`',
    '  —— CLI 重算真实 sha256 代填,verdict/checklist 原样保留;主文档改版后同样跑这条',
    '  (多阶段联动用 `--all` 一次处理)。',
    '- **忘了跑也没关系**:' + mainDoc + ' 改版后 --done 的 gate 检测到 docHash 失配会**自动机械重算放行**',
    '  (verdict 保留;结论是否仍适用于新文档需人工确认,reviewerNotes 会留审计行)。',
    '- 兜底手算口径(极端无 CLI 场景):node `crypto.createHash(\'sha256\').update(readFileSync(...))` (原始字节)/ `sha256sum <file>` 首列 hex。',
    '- ⚠️ **review.json 写入后若 ' + mainDoc + ' 再被改,须重算 docHash** —— 忘算也没关系:gate 会自动机械重算放行,',
    '  但那只是「机械对齐」;大幅改版(设计要点/接口变更)时审查结论可能已过时,应人工确认结论续用或重审,',
    '  不要把自动放行当「新文档已审过」(历史翻车根因:design 改了 rev 后结论未复核)。',
    '',
    '### 完整 JSON 示例(照抄改值)',
    '```json',
    '{',
    '  "schemaVersion": ' + REVIEW_SCHEMA_VERSION + ',',
    '  "reviewType": "' + reviewType + '",',
    '  "specVerdict": "pass",',
    '  "qualityVerdict": "pass",',
    '  "reviewedFiles": ["' + mainDocRel + '"],',
    '  "docHash": "<上面算出的 sha256 hex>",',
    '  "checklist": [',
    '    { "item": "<审查项>", "result": "pass", "note": "<证据/说明>" }',
    '  ],',
    '  "reviewer": { "channel": "<agent-tool|platform|host-mcp|self>", "missionId": null, "model": null },',
    '  "reviewerNotes": "<总结>"',
    '}',
    '```',
  ]
  return L.join('\n')
}

/**
 * 计算文件内容的 sha256（用于 docHash 真实性校验，防 agent 凭空伪造 review.json）
 * @param {string} filePath - 绝对路径
 * @returns {string|null} sha256 hex；文件不存在返回 null
 */
export function computeDocHash(filePath) {
  if (!filePath || !existsSync(filePath)) return null
  const content = readFileSync(filePath)
  return createHash('sha256').update(content).digest('hex')
}

/**
 * 校验文档型 stage review.json 的 schema
 *
 * 与 task-review.validateReviewSchema 的区别：
 *   - 不要求 git base/head（证据形态不同）
 *   - 改要求 reviewedFiles（被审查文档路径数组）+ docHash（主文档内容 sha256）
 *   - 新增 reviewType（design/plan/proposal/code/acceptance）+ checklist
 *   - 复用 VALID_VERDICTS 三态 + cannot_verify 联动规则（task-review.js:65-69）
 *
 * @param {object} review - 解析后的 JSON 对象
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateStageReviewSchema(review) {
  const errors = []
  if (!review || typeof review !== 'object') {
    return { ok: false, errors: ['stage review.json 不是有效 JSON 对象'] }
  }

  if (review.schemaVersion !== REVIEW_SCHEMA_VERSION) {
    errors.push(`schemaVersion 应为 ${REVIEW_SCHEMA_VERSION}，实际为 ${review.schemaVersion}`)
  }

  if (!STAGE_REVIEW_TYPES.includes(review.reviewType)) {
    errors.push(`reviewType 无效：${review.reviewType}（应为 ${STAGE_REVIEW_TYPES.join('/')}）`)
  }

  if (!VALID_VERDICTS.includes(review.specVerdict)) {
    errors.push(`specVerdict 无效：${review.specVerdict}（应为 ${VALID_VERDICTS.join('/')}）`)
  }
  if (!VALID_VERDICTS.includes(review.qualityVerdict)) {
    errors.push(`qualityVerdict 无效：${review.qualityVerdict}（应为 ${VALID_VERDICTS.join('/')}）`)
  }

  // cannot_verify 必须提供非空 requiredEvidence（与 task-review:65-69 一致，反逃逸）
  if (review.specVerdict === 'cannot_verify' || review.qualityVerdict === 'cannot_verify') {
    if (!Array.isArray(review.requiredEvidence) || review.requiredEvidence.length === 0) {
      errors.push('cannot_verify 的 verdict 必须提供非空的 requiredEvidence 数组')
    }
  }

  // reviewedFiles 必须是非空数组
  if (!Array.isArray(review.reviewedFiles) || review.reviewedFiles.length === 0) {
    errors.push('缺少 reviewedFiles 字段（应为被审查文档路径数组，[0] 为主审查对象，docHash 对应它）')
  }

  // docHash 非空
  if (!review.docHash || typeof review.docHash !== 'string') {
    errors.push('缺少 docHash 字段（被审查主文档内容的 sha256）')
  }

  // checklist 若提供，校验每项结构
  if (review.checklist !== undefined) {
    if (!Array.isArray(review.checklist)) {
      errors.push('checklist 若提供必须是数组')
    } else {
      for (let i = 0; i < review.checklist.length; i++) {
        const item = review.checklist[i]
        if (!item || typeof item !== 'object' || !item.item) {
          errors.push(`checklist[${i}] 缺少 item 描述`)
          continue
        }
        if (item.result !== undefined && !CHECKLIST_RESULTS.includes(item.result)) {
          errors.push(`checklist[${i}].result 无效：${item.result}（应为 ${CHECKLIST_RESULTS.join('/')}）`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

/**
 * docHash 真实性交叉校验：review 声称审查了某文档，重算该文档 sha256 对比。
 *
 * 对应 task-review.verifyReviewGitEvidence 的"防伪造"职责——agent 不能凭空编一份
 * review.json 贴个假 hash。约定 docHash 对应 reviewedFiles[0]（主审查对象）。
 *
 * searchDirs 依次尝试解析 reviewedFiles[0] 的相对路径（effectiveSpecBase / changeDir / cwd）。
 * 主文档在所有基准下都找不到时 fail-closed 阻断——连主审查文档都定位不到，要么 reviewedFiles[0]
 * 是伪造路径（防 agent 填假路径跳过校验），要么路径基准严重错位，两者都不该静默放行。
 *
 * @param {object} review - 已通过 schema 校验
 * @param {string[]} searchDirs - 解析相对路径的候选基准目录（绝对路径）
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function verifyStageReviewDocHash(review, searchDirs) {
  const errors = []
  const warnings = []
  const files = Array.isArray(review.reviewedFiles) ? review.reviewedFiles : []
  if (files.length === 0) {
    return { ok: false, errors: ['reviewedFiles 为空，无法做 docHash 校验'], warnings }
  }

  const primaryRel = files[0]

  for (const base of searchDirs || []) {
    const abs = join(base, primaryRel)
    if (!existsSync(abs)) continue
    // 找到主文档，比对 hash。容忍「原始字节」与「LF 规范化」两种口径：Windows 下 CRLF/LF 在
    // git add / eol 规范化前后字节会漂移，同一文件 sha256 偶发不一致（坑 worktree-execute-apply-friction
    // 坑3）——agent 写的 docHash（原始 sha256sum）与 gate 重算只要任一口径匹配即认可，消除 CRLF
    // 漂移导致的反复「疑似伪造」误报。两口径都对不上仍判不匹配（防伪造能力不降级）。
    const content = readFileSync(abs, 'utf8')
    const actualRaw = createHash('sha256').update(content).digest('hex')
    const actualLf = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
    const claimed = String(review.docHash).toLowerCase()
    if (claimed !== actualRaw.toLowerCase() && claimed !== actualLf.toLowerCase()) {
      errors.push(
        `docHash 与主审查文档 ${primaryRel} 的实际内容不匹配。` +
        `若刚改过该文档（如 design 修订后忘重算），--done gate 会自动机械重算放行（verdict 保留）；` +
        `本调用方未走自动刷新时可手动执行：` +
        `sillyspec register-stage-review --change <变更名> --stage <阶段> --refresh-hash` +
        `（CLI 重算 docHash 代填，verdict 保留；多阶段联动加 --all）；` +
        `若未改文档，则 review.json 疑似伪造（未真正读取文档）。`
      )
      return { ok: false, errors, warnings }
    }
    return { ok: true, errors, warnings }
  }

  // 所有基准都找不到主文档 → fail-closed。连主审查文档都定位不到，说明 reviewedFiles[0] 要么
  // 是伪造路径（恶意 agent 填假路径跳过 docHash 校验），要么路径基准严重错位——两者都该阻断
  // 而非静默放行（历史降级 warning 是可被利用的伪造通道）。searchDirs =
  // [effectiveSpecBase(.sillyspec), reviewChangeDir(changes/<change>), cwd]，契约规定的
  // reviewedFiles[0]（changes/<change>/<mainDoc> 或 <mainDoc>）在这三个基准下必命中其一。
  errors.push('主审查文档 ' + primaryRel + ' 在 ' + (searchDirs || []).length + ' 个候选基准目录下均不存在 — 无法做 docHash 校验（reviewedFiles[0] 路径伪造或基准错位）')
  return { ok: false, errors, warnings }
}

/**
 * 生成 stage review run id
 * @returns {string} 如 'review-2026-07-16-143000'
 */
export function generateStageReviewRunId() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `review-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/**
 * stage review marker 文件路径（prompt 渲染时写 / getLatestStageReviewRunId 读，同源）。
 *
 * 对齐 execute 的 current-execute-run-id-<change> 语义：含 change 防多 change 串台
 * （同一 stage 不同变更的 review 各自独立 marker）；changeName 缺失时退化为按 stage 分。
 *
 * @param {string} runtimeRoot - .runtime 绝对路径
 * @param {string} stage - brainstorm|plan|execute
 * @param {string} [changeName] - 变更名（防多 change 串台）
 * @returns {string} marker 文件绝对路径
 */
export function stageReviewMarkerPath(runtimeRoot, stage, changeName) {
  const suffix = changeName ? `${stage}-${changeName}` : stage
  return join(runtimeRoot, `current-stage-review-run-id-${suffix}`)
}

/**
 * 获取最新的 stage review run id
 *
 * 优先读 marker 文件（prompt 渲染 {REVIEW_TIER} 时写入，保证 gate 取的 ID == 注入给 agent
 * 的 ID —— 修复「prompt 多次渲染 / 多次 review 时 gate 取错 ID 读错 review.json」），
 * 对齐 getLatestExecuteRunId（task-review.js:420-428）。marker 缺失时 fallback 扫描
 * stage-reviews/<stage>-review-* 目录取字典序最新（向后兼容无 marker 旧数据）。
 *
 * @param {string} runtimeRoot - .runtime 绝对路径
 * @param {string} stage - brainstorm|plan|execute
 * @param {string} [changeName] - 变更名（读对应 marker，防多 change 串台）
 * @returns {string|null} run id（如 'review-2026-07-16-143000'），无则 null
 */
export function getLatestStageReviewRunId(runtimeRoot, stage, changeName) {
  // 优先读 marker（prompt 写 / gate 读同源，对齐 execute current-execute-run-id 机制）
  try {
    const markerPath = stageReviewMarkerPath(runtimeRoot, stage, changeName)
    if (existsSync(markerPath)) {
      const content = readFileSync(markerPath, 'utf8').trim()
      // marker 内容格式校验（execute 复盘 b2）：必须 review- 前缀（generateStageReviewRunId 格式）。
      // agent 手写 marker 可能误填 execute 的 exec- 前缀 → 按 stage-reviews/<stage>-<runId> 拼目录必找不到，
      // 与其读坏 ID 报误导错误，不如显式 warn 并退回目录扫描。
      if (content) {
        if (/^review-/.test(content)) return content
        console.warn(`⚠️ stage-review marker ${markerPath} 内容 "${content.slice(0, 40)}" 不是 review- 前缀（应为 generateStageReviewRunId 格式，勿填 execute 的 exec- ID），忽略并退回目录扫描`)
      }
    }
  } catch {}

  // fallback：扫描 stage-reviews/<stage>-review-* 目录取字典序最新（向后兼容无 marker 旧数据）
  const dir = join(runtimeRoot, 'stage-reviews')
  if (!existsSync(dir)) return null
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith(`${stage}-review-`))
      .map(e => e.name)
      .sort()
      .reverse()
    if (!entries[0]) return null
    // cross-change 防护（execute 复盘 b1）：changeName 提供时按 review.json 的 reviewedFiles[0] 归属过滤。
    // 契约 reviewedFiles[0] = `changes/<change>/<mainDoc>`（renderReviewJsonContract），据此排除他变更的 review，
    // 否则批量完成 marker 缺失时可能读到 proxy 等其他变更的 acceptance review 报错误导。
    if (changeName) {
      const matching = entries.find(e => {
        try {
          const rj = JSON.parse(readFileSync(join(dir, e, 'review.json'), 'utf8'))
          const r0 = Array.isArray(rj.reviewedFiles) ? String(rj.reviewedFiles[0]) : ''
          return r0.includes(`changes/${changeName}/`)
        } catch { return false }
      })
      if (matching) return matching.slice(stage.length + 1)
      console.warn(`⚠️ 无 ${stage} 的 review marker，且 stage-reviews/ 下无归属变更 ${changeName} 的 review（reviewedFiles 应含 changes/${changeName}/）；为避免跨变更串台不再取最新，返回 null（fail-closed，由调用方报缺 review.json）`)
      return null
    }
    // entries[0] = "plan-review-2026-..."，剥掉 `${stage}-` 前缀得到 runId "review-2026-..."
    return entries[0].slice(stage.length + 1)
  } catch {
    return null
  }
}

/**
 * 降级自审检测（2026-09-10 用户反馈①：PI agent 等宿主环境无 Agent tool，tier=independent
 * 硬要求子代理时只能降级自审——stage prompts 降级条款约定 reviewerNotes **首行**记
 * 「降级：环境无子代理可用」）。gate 侧配套：检测到该标记 → 放行但留 ⚠️ 审计行——独立性折损
 * 可见可追溯，与「宁可见的折损，不可静默的伪装」口径一致（静默放行会把降级 review 与真子代理
 * review 混同，事后审计无法区分）。best-effort：无标记视为未降级（向后兼容，不构成新阻断）。
 * @param {object|null} review - 解析后的 review.json（validateStageReview 的返回值 .review）
 * @returns {boolean}
 */
export function isDegradedSelfReview(review) {
  const notes = review && typeof review.reviewerNotes === 'string' ? review.reviewerNotes : ''
  const firstLine = notes.split(/\r?\n/, 1)[0].trim()
  return /^降级[：:]/.test(firstLine)
}

/**
 * stage-level review 总校验（brainstorm/plan/execute-acceptance 的 done gate）
 *
 * 规则（与 task-review.validateTaskReviews 对称）：
 *   - review.json 缺失 → error 阻断
 *   - 解析失败 / schema 失败 → error 阻断
 *   - reviewType 与期望不符 → error（agent 复制模板未改）
 *   - specVerdict 或 qualityVerdict 为 fail → error 阻断
 *   - cannot_verify + 非空 requiredEvidence → warning
 *   - cannot_verify + 空 requiredEvidence → error（schema 已拦，双保险）
 *   - docHash 与主文档实际内容不符 → error（伪造）
 *
 * 调用方约定：先用 classifyReviewTier 判定 tier——tier=self 不调用本函数（直接放行），
 * tier=independent 才调用。
 *
 * @param {object} opts
 * @param {string} opts.stage - brainstorm|plan|execute
 * @param {string} opts.reviewType - design|plan|proposal|code|acceptance
 * @param {string} opts.runtimeRoot - .runtime 绝对路径（平台模式为 runtimeRoot）
 * @param {string} opts.reviewRunId - stage review run id（review-<ts>）
 * @param {string[]} [opts.searchDirs] - docHash 校验的候选基准目录
 * @param {boolean} [opts.verifyDocHash=true] - 是否做 docHash 真实性校验
 * @returns {{ ok: boolean, errors: string[], warnings: string[], review: object|null }}
 */
export function validateStageReview(opts) {
  const { stage, reviewType, runtimeRoot, reviewRunId, searchDirs = [], verifyDocHash = true } = opts
  const errors = []
  const warnings = []

  const reviewDir = join(runtimeRoot, 'stage-reviews', `${stage}-${reviewRunId}`)
  const reviewPath = join(reviewDir, 'review.json')

  if (!reviewRunId || !existsSync(reviewPath)) {
    const errs = [`缺少 ${stage} 阶段的 stage review.json — tier=independent 要求独立审查子代理产出（期望路径：${reviewPath}）；宿主环境无 Agent tool（如 PI agent）时按 prompt 降级条款由当前 agent 自审产出，reviewerNotes 首行记「降级：环境无子代理可用」`]
    const typo = detectSpecDirTypo(runtimeRoot)
    if (typo) errs.push(`💡 路径疑似拼错：发现 ${typo.typoDir} 目录（应为 ${typo.canonical}），review.json 可能误存于此——检查是否把 .sillyspec 拼成了变体`)
    return {
      ok: false,
      errors: errs,
      warnings,
      review: null,
    }
  }

  let raw
  try {
    raw = readFileSync(reviewPath, 'utf8')
  } catch (e) {
    return { ok: false, errors: [`${stage} review.json 读取失败: ${e.message}`], warnings, review: null }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return { ok: false, errors: [`${stage} review.json 解析失败: ${e.message}`], warnings, review: null }
  }

  const schemaResult = validateStageReviewSchema(parsed)
  if (!schemaResult.ok) {
    return { ok: false, errors: [`${stage} review.json schema 校验失败 — ${schemaResult.errors.join('; ')}`], warnings, review: parsed }
  }

  // reviewType 与期望一致性
  if (parsed.reviewType && parsed.reviewType !== reviewType) {
    errors.push(`${stage} review.json 的 reviewType 为 "${parsed.reviewType}"，与期望 "${reviewType}" 不符 — agent 可能复制模板未修改`)
  }

  // fail verdict
  if (parsed.specVerdict === 'fail' || parsed.qualityVerdict === 'fail') {
    errors.push(`${stage} review 未通过 — spec: ${parsed.specVerdict}, quality: ${parsed.qualityVerdict}`)
    if (parsed.reviewerNotes) errors.push(`${stage}: ${parsed.reviewerNotes}`)
  }

  // docHash 真实性（fail verdict 已错时跳过，避免噪声）
  if (errors.length === 0 && verifyDocHash && searchDirs.length > 0) {
    const dh = verifyStageReviewDocHash(parsed, searchDirs)
    for (const w of dh.warnings) warnings.push(`${stage}: ${w}`)
    if (!dh.ok) {
      for (const err of dh.errors) errors.push(`${stage}: ${err}`)
    }
  }

  // cannot_verify → warning（requiredEvidence 非空已由 schema 保证）
  if (errors.length === 0 && (parsed.specVerdict === 'cannot_verify' || parsed.qualityVerdict === 'cannot_verify')) {
    const verdicts = []
    if (parsed.specVerdict === 'cannot_verify') verdicts.push('spec')
    if (parsed.qualityVerdict === 'cannot_verify') verdicts.push('quality')
    warnings.push(`${stage}: ${verdicts.join('+')}=cannot_verify，requiredEvidence 需在后续阶段满足`)
  }

  return { ok: errors.length === 0, errors, warnings, review: parsed }
}

/**
 * validateStageReview 的 gate 时刻自动刷新包装（坑 stage-review-refresh-hash-manual-forget，
 * 2026-09-04 用户实证③：design 每次改版都要手动重跑 register-stage-review --refresh-hash，
 * 易忘——忘则 --done 被 docHash 失配拦一轮，纯机械损耗）。
 *
 * 语义与 --refresh-hash 完全同源：主文档改版后的 hash 机械重算，verdict/checklist/
 * requiredEvidence 原样保留（结论是否仍适用由人工确认——reviewerNotes 追加审计行留痕）。
 * 自动刷新不放宽防伪造边界：
 *   - 真正判伪造/错位的「主文档在候选基准下均不存在」不触发自动刷新（仍 fail-closed）；
 *   - schema 失败 / verdict=fail 不碰（照常阻断）；
 *   - 写盘失败回落原失败结果（fail-closed，不静默放行）。
 *
 * @param {object} opts - 同 validateStageReview，另加 opts.autoRefresh（true 才尝试自动刷新）
 * @returns {{ result: object, autoRefreshed: boolean, refreshedPath?: string, previousErrors?: string[] }}
 */
export function validateStageReviewWithAutoRefresh(opts) {
  const result = validateStageReview(opts)
  if (result.ok) return { result, autoRefreshed: false }
  if (!opts.autoRefresh) return { result, autoRefreshed: false }
  // 仅「docHash 与主审查文档 …不匹配」类错误才自动刷新；「均不存在」（路径伪造/基准错位）
  // 与 schema/verdict 错误一律原样返回
  const mismatchOnly = result.review
    && Array.isArray(result.errors) && result.errors.length > 0
    && result.errors.every(e => String(e).includes('docHash 与主审查文档'))
  if (!mismatchOnly) return { result, autoRefreshed: false }

  const reviewDir = join(opts.runtimeRoot, 'stage-reviews', `${opts.stage}-${opts.reviewRunId}`)
  const reviewPath = join(reviewDir, 'review.json')
  // 定位主文档并重算 hash（与 verifyStageReviewDocHash 同法：reviewedFiles[0] × searchDirs）
  const primaryRel = Array.isArray(result.review.reviewedFiles) ? result.review.reviewedFiles[0] : null
  let docHash = null
  if (primaryRel) {
    for (const base of (opts.searchDirs || [])) {
      const abs = join(base, primaryRel)
      if (existsSync(abs)) { docHash = computeDocHash(abs); break }
    }
  }
  if (!docHash) return { result, autoRefreshed: false }

  const refreshedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const refreshed = {
    ...result.review,
    docHash,
    reviewerNotes: `${result.review.reviewerNotes || ''}\ndocHash auto-refreshed at ${refreshedAt}（gate 检测主文档改版，机械重算；verdict 保留，结论是否仍适用需人工确认）`.trim(),
  }
  try {
    writeAtomicSync(reviewPath, JSON.stringify(refreshed, null, 2) + '\n')
  } catch {
    return { result, autoRefreshed: false } // 写失败回落原失败结果，不静默放行
  }
  const recheck = validateStageReview(opts)
  return { result: recheck, autoRefreshed: recheck.ok, refreshedPath: reviewPath, previousErrors: result.errors }
}

/**
 * 打印 stage review 校验结果
 * @param {{ ok: boolean, errors: string[], warnings: string[] }} result
 * @param {object} context - { stage, reviewRunId } 用于错误提示路径
 */
export function printStageReviewResult(result, context = {}) {
  const { stage, reviewRunId, runtimeRoot, changeName } = context
  if (result.ok && result.warnings.length === 0) {
    console.log(`\n✅ Stage Review Gate — ${stage} 阶段独立审查通过`)
    return
  }

  if (result.errors.length > 0) {
    console.error(`\n🚫 Stage Review Gate — ${stage} FAILED`)
    for (const err of result.errors) {
      console.error(`   - ${err}`)
    }
    // echo 完整 review.json 路径：runId + marker 已由 CLI 自动生成写入（prompt.js review step
    // 渲染 / gate 触发），agent 直接派独立子代理把 review.json 写到此路径，勿手算 runId、勿手写
    // marker（历史坑：agent 撞 gate 后自己算 runId 猜错 review- 前缀，填 exec-/裸 ts 被 CLI 忽略）。
    if (reviewRunId) {
      const reviewDir = runtimeRoot ? `${runtimeRoot}/stage-reviews/${stage}-${reviewRunId}` : `.sillyspec/.runtime/stage-reviews/${stage}-${reviewRunId}`
      console.error(`\n   📁 review.json 直接写此路径（runId/marker CLI 已生成写入，勿手算 runId、勿手写 marker）：`)
      console.error(`      ${reviewDir}/review.json`)
    }
    console.error(`\n   提示：tier=independent 要求独立审查子代理产出 review.json，补全后重新 --done`)
    console.error(`   宿主环境无 Agent tool（如 PI agent）→ 降级条款：当前 agent 切审查者角色自审产出，reviewerNotes 首行记「降级：环境无子代理可用」（gate 放行但留 ⚠️ 审计行），勿伪装子代理审查`)
    // 在途区分（2026-09-10-review-dispatch FR-06）：review-dispatch 已派发平台审查但 worker 未终态时，
    // 提示区分「在途」而非只有笼统缺件——agent 看得懂该等（--status 回收）还是该处置（--kill 后降级）。
    // 内联读在途记录（同步 readFileSync，不经 import——review-dispatch.js 静态 import 本模块，反向
    // import 成环；路径契约 = review-dispatch.js dispatchRecordPath：runtimeRoot/review-dispatch-<change>.json）。
    // fail-open：无 changeName / 无记录 / 读失败 → 零输出（旧口径）。
    if (changeName && runtimeRoot) {
      try {
        const recPath = join(runtimeRoot, `review-dispatch-${changeName}.json`)
        if (existsSync(recPath)) {
          const rec = JSON.parse(readFileSync(recPath, 'utf8'))
          if (rec && typeof rec === 'object' && (rec.state === 'in-flight' || rec.state === 'dispatching')) {
            console.error(`\n   🛰️ 平台审查在途：mission ${rec.missionId}（state ${rec.lastState || rec.state}，最近进展 ${rec.lastStateAt ? new Date(rec.lastStateAt).toLocaleString('zh-CN') : '未知'}）`)
            console.error(`      → 先 sillyspec review-dispatch --status --change ${changeName} 轮询回收（worker completed 后自动落盘 review.json）；`)
            console.error(`      → 或 sillyspec review-dispatch --kill --change ${changeName} 显式放弃后走通道降级。`)
          }
        }
      } catch { /* fail-open */ }
    }
    console.error(`   可用 sillyspec register-stage-review --change <名> --stage ${stage} [--from <已有review.json>] 一步生成 run 目录 + review.json 骨架（docHash 自动算）+ 写 marker + 自检，省掉手动建目录/写 marker`)
    // docHash 失配精确指路（2026-08-21 agent-手工产出审计项②）：改版后忘重算是最高频失败，
    // 一键重算命令带上真实 change 名，agent 可直接照抄执行（--refresh-hash 保 verdict）。
    if (result.errors.some(e => String(e).includes('docHash')) && changeName) {
      console.error(`   docHash 失配修复：sillyspec register-stage-review --change ${changeName} --stage ${stage} --refresh-hash（主文档改版多阶段联动用 --all）`)
    }
  }

  if (result.warnings.length > 0) {
    console.warn(`\n⚠️ Stage Review Gate — ${stage} WARNING`)
    for (const w of result.warnings) {
      console.warn(`   - ${w}`)
    }
  }
}

/**
 * 注册一个 stage 级 review（确定性 writer）—— 生成 run 目录 + review.json 骨架（或 adopt
 * agent 草稿）+ 写 marker，治 tier=independent 时「调度者手动派独立子代理 → marker 不写 →
 * gate 取错 run」的死锁。与 task 级 generateTaskReviewDrafts（task-review.js）对称。
 *
 * docHash 由 CLI 直接 computeDocHash 算（命令有文件访问权），消除 agent 手算 hash 易错
 * （部分实现 P6.1b defer：仅本 scaffold 路径确定性，不改 agent 自写 review.json 的 hash 链路）。
 *
 * 纯新增，不改 validateStageReview / getLatestStageReviewRunId / renderReviewJsonContract 等
 * 现有函数；self-check 只验 mechanics（schema + docHash），verdict 留给 Stage Review Gate 判。
 *
 * @param {object} opts
 * @param {string} opts.changeName - 变更名
 * @param {string} opts.stage - brainstorm|plan|execute
 * @param {string} [opts.fromFile] - adopt 模式：agent 已写的 review.json（保留 verdict/checklist，重算 docHash + 规范化 reviewedFiles[0]）
 * @param {string} opts.cwd - 主仓 cwd（解析 specBase）
 * @param {object} [opts.platformOpts] - 平台选项（specRoot 等）
 * @returns {{ ok: boolean, reviewRunId: string, reviewPath: string, markerPath: string, mode: 'skeleton'|'adopted', mainDoc: string, review: object }}
 * @throws {Error} changeName 空 / stage 非法 / 主文档缺失 / --from 不存在或 schema 不过
 */
export function registerStageReview({ changeName, stage, fromFile, cwd, platformOpts = {}, refreshHash = false }) {
  if (!changeName) throw new Error('register-stage-review: changeName 不能为空')
  if (!stage || !STAGE_MAIN_DOC[stage]) {
    throw new Error(`register-stage-review: stage 无效 "${stage}"（应为 brainstorm|plan|execute）`)
  }

  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  const changeDir = join(specBase, 'changes', changeName)
  const reviewType = STAGE_REVIEW_TYPE[stage]
  const mainDoc = STAGE_MAIN_DOC[stage]
  const mainDocPath = join(changeDir, mainDoc)
  if (!existsSync(mainDocPath)) {
    throw new Error(`register-stage-review: 主审查文档不存在 ${mainDocPath}（${stage} 审 ${mainDoc}），无法算 docHash`)
  }
  const docHash = computeDocHash(mainDocPath)
  if (!docHash) {
    throw new Error(`register-stage-review: 计算 docHash 失败（computeDocHash 返回 null）：${mainDocPath}`)
  }
  const reviewedFiles = [`changes/${changeName}/${mainDoc}`]

  // ── refresh-hash 模式（坑 stage-review-dochash-manual-resync，2026-08-21 实证）：改一版 design
  // 要重算 2-3 个 stage review 的 docHash（brainstorm/execute 都锚 design.md），手工易漏、gate
  // 报错才补。就地更新 marker 指向的已有 review.json——保留 verdict/checklist/requiredEvidence
  // （结论是否仍适用由人确认），仅重算 docHash + reviewerNotes 追加刷新记录；不换 run 目录
  // （换新 run 会把 marker 重定向到骨架，丢已审结论）。无既有 review → 报错（该用骨架模式生成）。
  if (refreshHash) {
    if (fromFile) throw new Error('register-stage-review: --refresh-hash 与 --from 互斥（refresh 就地更新既有 review，adopt 引入新文件）')
    const existingRunId = getLatestStageReviewRunId(runtimeRoot, stage, changeName)
    const existingPath = existingRunId
      ? join(runtimeRoot, 'stage-reviews', `${stage}-${existingRunId}`, 'review.json')
      : null
    if (!existingPath || !existsSync(existingPath)) {
      throw new Error(`register-stage-review: --refresh-hash 找不到 ${stage} 的既有 review.json（marker ${existingRunId || '无'} 无对应 run）——先去掉 --refresh-hash 生成骨架，或派审查子代理产出 review`)
    }
    let existing
    try {
      existing = JSON.parse(readFileSync(existingPath, 'utf8'))
    } catch (e) {
      throw new Error(`register-stage-review: 既有 review.json 解析失败 ${existingPath}: ${e.message}`)
    }
    const refreshedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const review = {
      ...existing,
      docHash,
      reviewedFiles,
      reviewerNotes: `${existing.reviewerNotes || ''}\ndocHash refreshed at ${refreshedAt}（主文档改版后机械重算；verdict 结论是否仍适用需人工确认）`.trim(),
    }
    writeAtomicSync(existingPath, JSON.stringify(review, null, 2) + '\n')
    const schemaRecheck = validateStageReviewSchema(review)
    if (!schemaRecheck.ok) {
      throw new Error(`register-stage-review: refresh 后 schema 自检失败 — ${schemaRecheck.errors.join('; ')}（原 review 字段异常，先修原文件）`)
    }
    const hashRecheck = verifyStageReviewDocHash(review, [specBase, changeDir, cwd])
    if (!hashRecheck.ok) {
      throw new Error(`register-stage-review: refresh 后 docHash 自检失败（不应发生）— ${hashRecheck.errors.join('; ')}`)
    }
    return { ok: true, reviewRunId: existingRunId, reviewPath: existingPath, markerPath: stageReviewMarkerPath(runtimeRoot, stage, changeName), mode: 'refreshed', mainDoc, review }
  }

  let review
  let mode
  if (fromFile) {
    // adopt 模式：保留 agent 的 verdict/checklist/reviewerNotes/requiredEvidence，仅修 mechanics
    const fromAbs = existsSync(fromFile) ? fromFile : join(cwd, fromFile)
    if (!existsSync(fromAbs)) {
      throw new Error(`register-stage-review: --from 文件不存在 ${fromFile}（相对 cwd ${fromAbs} 也未命中）`)
    }
    let parsed
    try {
      parsed = JSON.parse(readFileSync(fromAbs, 'utf8'))
    } catch (e) {
      throw new Error(`register-stage-review: --from 文件 JSON 解析失败 ${fromAbs}: ${e.message}`)
    }
    const schemaResult = validateStageReviewSchema(parsed)
    if (!schemaResult.ok) {
      throw new Error(`register-stage-review: --from 文件 schema 校验失败 — ${schemaResult.errors.join('; ')}`)
    }
    review = { ...parsed, docHash, reviewedFiles }
    mode = 'adopted'
  } else {
    // 骨架模式：cannot_verify 待审占位（schema 反逃逸：cannot_verify 必须带非空 requiredEvidence）
    review = {
      schemaVersion: REVIEW_SCHEMA_VERSION,
      reviewType,
      specVerdict: 'cannot_verify',
      qualityVerdict: 'cannot_verify',
      reviewedFiles,
      docHash,
      requiredEvidence: [`待独立审查子代理对照 ${mainDoc} 逐节核验（骨架由 register-stage-review 生成）`],
      reviewer: { channel: null, missionId: null, model: null },
      reviewerNotes: '骨架由 register-stage-review 生成，verdict 待独立审查子代理填写',
    }
    mode = 'skeleton'
  }

  const reviewRunId = generateStageReviewRunId()
  const reviewDir = join(runtimeRoot, 'stage-reviews', `${stage}-${reviewRunId}`)
  const reviewPath = join(reviewDir, 'review.json')
  mkdirSync(reviewDir, { recursive: true })
  writeAtomicSync(reviewPath, JSON.stringify(review, null, 2) + '\n')
  // stage-reviews 回收不在此处（ql-20260908-005 已定分野）：变更归属类证据走归档时精确
  // 回收（pruneArchivedChangeRuntime 按 reviewedFiles 归属）；写入侧滚动是启发式，
  // 活跃变更的 review 可能因他端高频写而跌出 keep 窗，不进证据类目录。

  const markerPath = stageReviewMarkerPath(runtimeRoot, stage, changeName)
  if (existsSync(markerPath)) {
    console.warn(`⚠️ register-stage-review: marker 已存在 ${markerPath}，将被覆盖为 ${reviewRunId}`)
  }
  mkdirSync(runtimeRoot, { recursive: true })
  writeAtomicSync(markerPath, reviewRunId + '\n')

  // self-check（fail-closed）：刚写的 review 必过 schema + docHash 真实性。只验 mechanics，
  // 不判 verdict（verdict 是 agent/子代理的审查结论，even fail 也如实落盘，由 Stage Review Gate 裁决）。
  const schemaRecheck = validateStageReviewSchema(review)
  if (!schemaRecheck.ok) {
    throw new Error(`register-stage-review: 写入后 schema 自检失败（不应发生）— ${schemaRecheck.errors.join('; ')}`)
  }
  const hashRecheck = verifyStageReviewDocHash(review, [specBase, changeDir, cwd])
  if (!hashRecheck.ok) {
    throw new Error(`register-stage-review: 写入后 docHash 自检失败（不应发生）— ${hashRecheck.errors.join('; ')}`)
  }

  return { ok: true, reviewRunId, reviewPath, markerPath, mode, mainDoc, review }
}
