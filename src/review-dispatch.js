/**
 * review-dispatch — tier=independent 独立审查的平台派发核心（2026-09-10-review-dispatch task-03 / FR-01~04 / D-001~003@1）
 *
 * 定位：纯逻辑核心 + 注入式编排。MCP 调用全部经注入的 client（SillyHubMcpClient 实例，
 * probe 同款依赖注入风格——本模块不 import client.js，测试零网络）；probe 经参数注入
 * （默认真 probeSillyHub，测试传 stub）。
 *
 * 三链（runReviewDispatch 总入口，task-04 薄壳消费）：
 *   create —— probe 三层前置 → createMission(external) → dispatchWorker(read_only)
 *             → 在途记录（O_EXCL 防双开）→ 立即返回（异步，D-002）
 *   status —— listWorkers 状态迁移 → detectStall（queued 不计时，D-003）
 *             → 终态回收（getWorkerResult → artifacts 提取 → persistStageReview 落盘
 *                既有 stage-reviews 路径 + reviewer.channel=platform 落款）
 *   kill   —— 清本地在途记录 + 平台处置指引（不自动 kill 任何东西，D-003）
 *
 * 失败全链路有出口（design 风险登记）：probe 不可用/网络异常 → {ok:false, reason,
 * guidance}（guidance 按 channel_priority 去 platform 剩余序渲染），绝不抛穿。
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { runtimeStatePath } from './runtime-paths.js'
import { join, dirname } from 'node:path'
import jsYaml from 'js-yaml'
import { writeAtomicSync } from './fs-atomic.js'
import { REVIEW_CHECKLISTS } from './stage-review-checklist.js'
import { assembleProbeLinesForScope } from './review-probes.js'
import { CEREMONY_TIERS } from './ceremony-tier.js'
import { withFileLock } from './quicklog.js'
import {
  renderReviewJsonContract,
  validateStageReviewSchema,
  computeDocHash,
  readReviewChannelPriority,
} from './stage-review.js'

// stage → 主审查文档（与 stage-review.js STAGE_MAIN_DOC 同映射；该常量未导出——本地声明并
// 与 design.md 模块设计对齐，persistStageReview 消费方算 docHash 用）
const STAGE_MAIN_DOC = { brainstorm: 'design.md', plan: 'plan.md', execute: 'design.md' }

/** 在途记录状态机（design 生命周期契约表）：五态，终态即清记录（无 terminalAt 字段）。 */
const DISPATCH_STATES = ['dispatching', 'in-flight', 'completed', 'failed', 'abandoned']

/** 在途记录路径：{SPEC_ROOT}/.runtime/review-dispatch-<change>.json */
function dispatchRecordPath(specBase, changeName) {
  return runtimeStatePath(join(specBase, '.runtime'), `review-dispatch-${changeName}.json`)
}

/** 读在途记录（无/坏 → null，fail-open 调用方按无在途处理）。 */
export function readDispatchRecord(specBase, changeName) {
  try {
    const p = dispatchRecordPath(specBase, changeName)
    if (!existsSync(p)) return null
    const r = JSON.parse(readFileSync(p, 'utf8'))
    return r && typeof r === 'object' && typeof r.missionId === 'string' ? r : null
  } catch { return null }
}

/**
 * 创建在途记录（O_EXCL 语义：已存在即拒绝——防双 CLI 并发双开，D-002 附带契约）。
 * @returns {{created: boolean, existing?: object}} created=false 时带 existing 供调用方给指引。
 */
export function createDispatchRecord(specBase, changeName, record) {
  const p = dispatchRecordPath(specBase, changeName)
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  try {
    writeFileSync(p, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    return { created: true }
  } catch (e) {
    if (e && (e.code === 'EEXIST' || e.code === 'EPERM')) {
      // Windows 上 wx 对已存在文件可能抛 EPERM——两者都按「已存在」处理
      return { created: false, existing: readDispatchRecord(specBase, changeName) }
    }
    throw e
  }
}

/** 更新在途记录（原子替换；无记录时 no-op 返回 false）。 */
function updateDispatchRecord(specBase, changeName, patch) {
  const cur = readDispatchRecord(specBase, changeName)
  if (!cur) return false
  writeAtomicSync(dispatchRecordPath(specBase, changeName), JSON.stringify({ ...cur, ...patch }, null, 2) + '\n')
  return true
}

/** 清在途记录（终态回收 / kill / 失败后调用；设计口径「终态即清」——删除文件不留 tombstone，
 *  review.json（completed）与命令输出（missionId）是持久真相）。不存在 no-op。 */
export function clearDispatchRecord(specBase, changeName) {
  const p = dispatchRecordPath(specBase, changeName)
  try { if (existsSync(p)) { rmSync(p); return true } return false } catch { return false }
}

/**
 * 停滞判定（D-003）：queued 不计时（排队慢是正常形态）；running 后 lastStateAt 超窗 → stalled。
 * @returns {{stalled: boolean, queuedWait: boolean, hint: string}}
 */
export function detectStall(record, nowMs, stallMs) {
  const lastState = record && typeof record.lastState === 'string' ? record.lastState : ''
  const lastAt = record && typeof record.lastStateAt === 'number' ? record.lastStateAt : null
  if (lastState === 'queued' || lastState === 'pending' || lastAt === null) {
    return { stalled: false, queuedWait: lastState === 'queued' || lastState === 'pending', hint: '' }
  }
  const stalled = nowMs - lastAt > stallMs
  return {
    stalled,
    queuedWait: false,
    hint: stalled
      ? `疑似停滞（${lastState} 超 ${Math.round(stallMs / 60000)} 分钟无状态迁移）。三选项：①继续等（慢模型/长任务属正常）②sillyspec review-dispatch --kill 显式处置 ③按通道优先序降级（宿主子代理/降级自审）`
      : '',
  }
}

/**
 * 首个平衡 JSON 对象扫描（通道②/③共用）：从文本首个 { 起括号配对扫描（字符串字面量内的
 * } 不计数），命中即 JSON.parse 返回对象；无 {} / 首个平衡段解析失败 → null。
 */
function scanFirstBalancedJson(text) {
  const t = String(text)
  const start = t.indexOf('{')
  if (start === -1) return null
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < t.length; i++) {
    const ch = t[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          const obj = JSON.parse(t.slice(start, i + 1))
          if (obj && typeof obj === 'object') return obj
        } catch { return null }
      }
    }
  }
  return null
}

/**
 * 从 artifacts / answer 提取 review JSON（三通道容错，design 风险登记「平台 artifacts 形态演进」）：
 * ① kind 含 review/review_json 的 artifact，content/content_ref/text 字段 JSON.parse 优先；
 * ② 兜底任一 artifact 文本字段提取首个平衡 {} 对象；
 * ③ answer 正文扫描（2026-10-21-review-dispatch-answer-salvage / dsh 会话实证：worker 把完整
 *   review JSON 放回答正文而非 artifacts——任务书已明示该兜底形态）。
 * 第二参可缺省——只传 artifacts 时行为与改前逐字一致（向后兼容）。全失败 → null（调用方给 --salvage 兜底指引）。
 */
export function extractReviewFromArtifacts(artifacts, answer) {
  const texts = []
  if (Array.isArray(artifacts)) {
    for (const a of artifacts) {
      if (!a || typeof a !== 'object') continue
      const kind = String(a.kind || '')
      const text = typeof a.content === 'string' ? a.content
        : typeof a.content_ref === 'string' ? a.content_ref
        : typeof a.text === 'string' ? a.text : null
      if (text === null) continue
      if (/review/i.test(kind)) {
        try {
          const obj = JSON.parse(text)
          if (obj && typeof obj === 'object') return obj
        } catch { /* 该条不是合法 JSON，落兜底通道 */ }
      }
      texts.push(text)
    }
  }
  if (typeof answer === 'string' && answer) texts.push(answer)
  for (const t of texts) {
    const obj = scanFirstBalancedJson(t)
    if (obj) return obj
  }
  return null
}

/**
 * 组装 reviewer 任务书（FR-01 派发质量的核心）：四要素——①单源清单（前缀按 checklist
 * docblock 规则）②review.json 契约（与 gate 同源）③期望产出方式（read_only worker：
 * 结论经 artifacts 返回，**不写任何文件**——落盘归 CLI；宿主不支持 artifacts 时放回答正文
 * 首个 ```json 块，回收链第三通道兜底）④铁律段（禁改文件/禁 git commit）。
 */
export function buildReviewerTaskBook({ stage, changeDir, reviewRunId, channelPriority, probeLines = null }) {
  const mainDoc = STAGE_MAIN_DOC[stage] || 'design.md'
  const items = (REVIEW_CHECKLISTS[stage] || []).map((t, i) => `${i + 1}. ${t}`).join('\n')
  const contract = renderReviewJsonContract({ stage, changeDir, reviewRunId, tier: 'independent', channelPriority })
  // 项目评审探针（2026-10-12-review-probe-injection）：local.yaml 数据驱动注入，缺省零变化。
  const probeSection = Array.isArray(probeLines) && probeLines.length > 0
    ? ['', '## 项目评审探针（local.yaml 注入——逐条 pass/gap/fail + 证据锚点，未答=未审）', ...probeLines.map((l) => `- ${l}`)]
    : []
  const workerPrompt = [
    `你是独立审查者（platform 通道派发）。审查对象：${changeDir ? join(changeDir, mainDoc) : mainDoc}`,
    '',
    '## 审查清单（逐条给 pass/gap/fail + 证据锚点）',
    items,
    ...probeSection,
    '',
    contract,
    '',
    '## 产出方式（read_only 约束）',
    '- **禁止修改任何文件、禁止 git commit、禁止写盘**——你只读文档与必要的源码佐证。',
    '- 把**完整 review.json 文本**（按上方契约 schema，含 reviewer: {"channel":"platform"}）作为产出返回（artifacts 里的 content 字段放纯 JSON 文本）。',
    '- 宿主/平台不支持 artifacts 回传时，把**完整 review.json 文本**放进回答正文的**首个 ```json 代码块**（CLI 回收链会从回答正文扫描兜底）。',
    '- docHash 可占位（调度方 CLI 会按主文档机械重算），其余字段照实填写。',
  ].join('\n')
  return {
    objective: `独立审查 ${mainDoc}（stage=${stage}，清单 ${items.split('\n').length} 条）并产出 review.json 结论`,
    workerPrompt,
  }
}

/**
 * 落盘 stage review（FR-04 终态回收）：reviewer 落款补 channel=platform + missionId；
 * docHash 机械重算（worker 只读无盘，占位 hash 由真值替换——与 gate auto-refresh 同哲学）；
 * schema 校验不过 → 返回错误（不落盘坏 review）。
 * @returns {{ok: boolean, reviewPath?: string, errors?: string[]}}
 */
export function persistStageReview({ runtimeRoot, stage, changeName, reviewRunId, reviewObj, missionId, mainDocPath }) {
  const review = {
    ...reviewObj,
    reviewer: { channel: 'platform', missionId: missionId || null, model: (reviewObj && reviewObj.reviewer && reviewObj.reviewer.model) || null },
  }
  if (mainDocPath && existsSync(mainDocPath)) {
    const h = computeDocHash(mainDocPath)
    if (h) review.docHash = h
  }
  // ql-20260915-001 修复③：透传 stage——schema 错误文案给本 stage 期望 reviewType
  const schema = validateStageReviewSchema(review, stage)
  if (!schema.ok) return { ok: false, errors: schema.errors }
  review.reviewedFiles = Array.isArray(review.reviewedFiles) && review.reviewedFiles.length > 0
    ? review.reviewedFiles
    : [`changes/${changeName}/${STAGE_MAIN_DOC[stage] || 'design.md'}`]
  const dir = join(runtimeRoot, 'stage-reviews', `${stage}-${reviewRunId}`)
  mkdirSync(dir, { recursive: true })
  const reviewPath = join(dir, 'review.json')
  writeAtomicSync(reviewPath, JSON.stringify(review, null, 2) + '\n')
  return { ok: true, reviewPath }
}

/**
 * worker 终态原文落盘（2026-10-21-review-dispatch-answer-salvage FR-04 证据链）：completed
 * 回收路径统一调用——answer 原文优先，缺省序列化 artifacts 原文；两者皆空返回 null（无原文
 * 可落，调用方走「确无结果」口径）。与 review.json 同 run 目录（结构化结论 + 原文证据并存，
 * dsh 事故里人工只能靠平台 UI 贴回原文——原文必须本地在场）。best-effort：写失败 warn 不抛。
 * @returns {string|null} 落盘绝对路径；无内容/写失败 null
 */
function writeWorkerAnswer({ runtimeRoot, stage, reviewRunId, gr }) {
  try {
    const answer = gr && typeof gr.answer === 'string' && gr.answer
      ? gr.answer
      : gr && Array.isArray(gr.artifacts) && gr.artifacts.length > 0
        ? JSON.stringify(gr.artifacts, null, 2) + '\n'
        : null
    if (!answer) return null
    const dir = join(runtimeRoot, 'stage-reviews', `${stage}-${reviewRunId}`)
    mkdirSync(dir, { recursive: true })
    const p = join(dir, 'worker-answer.md')
    writeAtomicSync(p, answer.endsWith('\n') ? answer : answer + '\n')
    return p
  } catch (e) {
    console.warn(`[sillyspec] worker-answer.md 落盘失败（不阻断回收）: ${e && e.message ? e.message : String(e)}`)
    return null
  }
}

/** 降级指引（channel_priority 去 platform 的剩余序渲染；probe 失败 / worker 失败共用）。 */
export function renderFallbackGuidance(cwd) {
  const rest = readReviewChannelPriority(cwd).filter((c) => c !== 'platform')
  const DESC = {
    'agent-tool': '宿主 Agent tool 派独立子代理（subagent_type: general）',
    'host-mcp': '宿主自有 MCP 派独立执行者',
    'self': '降级自审：reviewerNotes 首行记「降级：环境无子代理可用」+ reviewer.channel="self"（gate ⚠️ 留痕）',
  }
  return rest.map((c, i) => `${i + 1}. ${c} —— ${DESC[c] || c}`).join('\n')
}

/**
 * 总入口（task-04 薄壳消费契约）：三链编排。
 * @param {object} opts
 *   mode: 'create'|'status'|'kill'；cwd/specBase/changeName 必填；stage（create 必填）；
 *   client: SillyHubMcpClient 实例（create/status 用）；probe: 可注入（默认真 probeSillyHub）；
 *   budgetUsd（默认 1.0）；stallMs（默认 900000）；reviewRunId（status 回收时缺省读 marker）；
 *   salvage（status 专用，默认 false——completed 提取失败时返回 salvagePath + --from 回收指引，
 *   在途记录不清可重试；CLI 形态 `--status --salvage`）。
 * @returns {Promise<{ok: boolean, ...}>} 永不抛——所有异常转 {ok:false, reason}
 */
export async function runReviewDispatch(opts = {}) {
  const {
    mode = 'create', cwd = process.cwd(), specBase, changeName,
    stage, client, probe, budgetUsd = 1.0, stallMs = 900_000, reviewRunId, salvage = false,
  } = opts
  if (!specBase || !changeName) return { ok: false, reason: '缺少 specBase/changeName' }

  try {
    if (mode === 'kill') {
      const rec = readDispatchRecord(specBase, changeName)
      clearDispatchRecord(specBase, changeName)
      return {
        ok: true,
        killedLocally: true,
        platformHint: rec
          ? `本地在途记录已清。平台侧 mission ${rec.missionId} 的 lease 请在平台 UI 处置（或等 daemon 自然回收）——本命令不自动 kill（D-003 处置权在人）。后续走通道降级：\n${renderFallbackGuidance(cwd)}`
          : '无在途记录（已清或从未派发）。',
      }
    }

    if (mode === 'create') {
      if (!stage || !STAGE_MAIN_DOC[stage]) return { ok: false, reason: `stage 必填 ∈ ${Object.keys(STAGE_MAIN_DOC).join('|')}` }
      // 幂等闸：已有 in-flight/dispatching 记录拒双开
      const cur = readDispatchRecord(specBase, changeName)
      if (cur && (cur.state === 'in-flight' || cur.state === 'dispatching')) {
        return { ok: false, reason: `已有在途派发（mission ${cur.missionId}，state ${cur.state}）`, existing: cur, guidance: '先 sillyspec review-dispatch --status 轮询；或 --kill 显式放弃后重派。' }
      }
      if (!client || !client.probeDaemon) {
        return { ok: false, reason: 'client 未注入（SillyHubMcpClient 实例）' }
      }
      // probe 三层前置（no-config / daemon-unreachable / daemon-offline 任一 → 非零退 + 降级指引）
      const probeFn = probe || (await import('./dispatch/probe.js')).probeSillyHub
      const pr = await probeFn({ client, worktreePath: null, cwd })
      if (!pr || pr.available !== true) {
        const why = pr && pr.reason ? pr.reason : 'probe 异常'
        // token 失效给「重连再配对」出口（2026-09-11 用户实测：gateway/daemon 都活着，
        // 死的只是凭据——一把 platform connect 就能救活平台通道，比直接降级更对症）。
        const tokenHint = why === 'mcp-token-invalid'
          ? `mcp token 已失效（吊销/过期）——重跑 \`sillyspec platform connect ${client && client._url ? client._url : '<平台url>'} --token <user级token>\` 重连（connect 会成对签发 read+dispatch 新 token 自动覆盖写 mcp 段），然后重试平台通道。\n若暂不重连，按通道优先序降级：\n`
          : ''
        return { ok: false, reason: `平台通道不可用（${why}）`, guidance: tokenHint + renderFallbackGuidance(cwd) }
      }
      // reviewRunId：优先复用 marker（与 prompt/gate 同链，勿手算）
      let runId = reviewRunId
      if (!runId) {
        const { getLatestStageReviewRunId, generateStageReviewRunId, stageReviewMarkerPath } = await import('./stage-review.js')
        const runtimeRoot = join(specBase, '.runtime')
        runId = getLatestStageReviewRunId(runtimeRoot, stage, changeName) || generateStageReviewRunId()
        try {
          mkdirSync(runtimeRoot, { recursive: true })
          writeAtomicSync(stageReviewMarkerPath(runtimeRoot, stage, changeName), runId + '\n')
        } catch { /* marker 写失败不阻断派发（status 回收时再补） */ }
      }
      const changeDir = join(specBase, 'changes', changeName)
      const book = buildReviewerTaskBook({ stage, changeDir, reviewRunId: runId, channelPriority: readReviewChannelPriority(cwd), probeLines: probeLinesForThick(specBase) })
      const mission = await client.createMission({ objective: book.objective, orchestrationMode: 'external', budgetUsd })
      const missionId = mission && mission.missionId
      if (!missionId) return { ok: false, reason: 'create_mission 未返回 missionId', guidance: renderFallbackGuidance(cwd) }
      const cr = createDispatchRecord(specBase, changeName, {
        change: changeName, stage, missionId, workerId: null, state: 'dispatching',
        createdAt: new Date().toISOString(), lastState: 'dispatching', lastStateAt: Date.now(), reviewRunId: runId,
      })
      if (!cr.created) {
        return { ok: false, reason: '并发双开被拒（O_EXCL）', existing: cr.existing, guidance: '先 --status 或 --kill。' }
      }
      let worker = null
      try {
        worker = await client.dispatchWorker({
          missionId, objective: book.objective, readOnly: true,
          worktreePath: cwd, workerPrompt: book.workerPrompt,
        })
      } catch (e) {
        updateDispatchRecord(specBase, changeName, { state: 'abandoned', errorCode: 'dispatch_worker_threw' })
        return { ok: false, reason: `dispatch_worker 异常: ${e && e.message}`, guidance: '记录已转 abandoned——可重派；平台侧 mission 请在 UI 核对。' }
      }
      const workerId = worker && worker.workerId
      if (!workerId) {
        updateDispatchRecord(specBase, changeName, { state: 'abandoned', errorCode: 'no_worker_id' })
        return { ok: false, reason: 'dispatch_worker 未返回 workerId', guidance: '记录已转 abandoned；可重派或降级：\n' + renderFallbackGuidance(cwd) }
      }
      updateDispatchRecord(specBase, changeName, { workerId, state: 'in-flight', lastState: 'queued', lastStateAt: Date.now() })
      return {
        ok: true, missionId, workerId, reviewRunId: runId,
        nextStep: `已异步派发（D-002，不阻塞等待）。轮询：sillyspec review-dispatch --status --change ${changeName}`,
      }
    }

    if (mode === 'status') {
      const rec = readDispatchRecord(specBase, changeName)
      if (!rec) return { ok: false, reason: '无在途记录——先 create（缺省形态）派发。' }
      if (!client || !client.listWorkers) return { ok: false, reason: 'client 未注入' }
      const workers = await client.listWorkers(rec.missionId)
      const w = Array.isArray(workers) ? workers.find((x) => x && (x.id === rec.workerId || x.worker_id === rec.workerId)) : null
      const st = w ? String(w.status || '') : 'unknown'
      const statusLine = `mission ${rec.missionId} worker ${rec.workerId}: ${st}（最近迁移 ${new Date(rec.lastStateAt).toLocaleString('zh-CN')}）`
      // 状态迁移更新（同态不刷时间戳——停滞计时基于真实迁移）
      if (w && st && st !== rec.lastState) {
        updateDispatchRecord(specBase, changeName, { lastState: st, lastStateAt: Date.now() })
        rec.lastState = st; rec.lastStateAt = Date.now()
      }
      if (st === 'completed') {
        const gr = await client.getWorkerResult({ missionId: rec.missionId, workerId: rec.workerId })
        const runtimeRoot = join(specBase, '.runtime')
        // 终态原文先落盘再提取（FR-04：无论提取成败，原文证据与 review.json 同 run 目录在场）
        const answerPath = writeWorkerAnswer({ runtimeRoot, stage: rec.stage, reviewRunId: rec.reviewRunId, gr })
        const review = extractReviewFromArtifacts(gr && gr.artifacts, gr && gr.answer)
        if (!review) {
          // 两步出口（dsh 事故复盘：旧文案「--kill 降级」混写处置与降级，误导 agent 跳过回收直接自审）：
          // ① --salvage 兜底回收（落盘原文 + --from 指引）② 确认平台确无结果才降级
          const reason = 'worker completed 但三通道（artifacts kind / artifacts 文本 / answer 正文）均提取不到 review JSON'
          if (salvage) {
            return {
              ok: false, state: 'completed-no-artifact', statusLine, salvagePath: answerPath, reason,
              guidance: answerPath
                ? `① worker 终态原文已落盘 ${answerPath}——人工核对/修整出 review.json 后运行 sillyspec register-stage-review --change ${changeName} --stage ${rec.stage} --from <修整后的review.json> 回收\n② 确认平台确无结果（UI 核对 mission ${rec.missionId}）才按通道优先序降级：\n${renderFallbackGuidance(cwd)}`
                : `① 平台未回传任何终态原文（answer 与 artifacts 均空）——在平台 UI 核对 mission ${rec.missionId} / worker ${rec.workerId}\n② 确认确无结果才按通道优先序降级：\n${renderFallbackGuidance(cwd)}`,
            }
          }
          return {
            ok: false, state: 'completed-no-artifact', statusLine, reason,
            guidance: `① 回收兜底：sillyspec review-dispatch --status --salvage --change ${changeName}（自动落盘 worker-answer.md 并提示 register-stage-review --from 回收；平台 UI 可先核对 mission ${rec.missionId}）\n② 确认平台确无结果才按通道优先序降级：\n${renderFallbackGuidance(cwd)}`,
          }
        }
        const mainDocPath = join(specBase, 'changes', changeName, STAGE_MAIN_DOC[rec.stage] || 'design.md')
        const p = persistStageReview({
          runtimeRoot, stage: rec.stage, changeName, reviewRunId: rec.reviewRunId,
          reviewObj: review, missionId: rec.missionId, mainDocPath,
        })
        if (!p.ok) {
          return { ok: false, state: 'bad-review', statusLine, errors: p.errors, guidance: `① 提取到的 review 不符 schema——按契约修整（终态原文参考：${answerPath || '同目录 worker-answer.md'}）后运行 sillyspec register-stage-review --change ${changeName} --stage ${rec.stage} --from <修整后的review.json> 回收\n② 确认平台确无结果才按通道优先序降级：\n${renderFallbackGuidance(cwd)}` }
        }
        clearDispatchRecord(specBase, changeName)
        return { ok: true, state: 'completed', statusLine, reviewPath: p.reviewPath, verdict: `${review.specVerdict}/${review.qualityVerdict}`, nextStep: answerPath ? `终态原文已留存 ${answerPath}` : undefined }
      }
      if (st === 'failed' || st === 'killed') {
        clearDispatchRecord(specBase, changeName)
        return { ok: false, state: st, statusLine, reason: `worker 终态 ${st}`, guidance: '降级：\n' + renderFallbackGuidance(cwd) }
      }
      // 在途：停滞检测（queued 不计时）
      const stall = detectStall(rec, Date.now(), stallMs)
      return {
        ok: true, state: st || 'in-flight', statusLine,
        stalled: stall.stalled, stallHint: stall.hint,
        nextStep: stall.stalled ? stall.hint : '继续轮询 --status（或稍后重查）。',
      }
    }

    return { ok: false, reason: `未知 mode: ${mode}` }
  } catch (e) {
    return { ok: false, reason: `review-dispatch 异常: ${e && e.message ? e.message : String(e)}` }
  }
}

// ════════ 薄道评审平台单调用派发（2026-10-23-review-inline-dispatch）════════
/**
 * 薄道（thin flow）review 子步的平台单调用通道：flow done 评审缺席分支经 local.yaml
 * review_inline_wait 键门控调用——薄道任务书（renderReviewerTaskbook 产物+平台产出方式
 * 尾注，任务书生产权仍在 CLI）派发平台 readOnly worker，有界轮询至完成/超时，三通道
 * 提取复用厚道 extractReviewFromArtifacts（JSON 对象提取与 schema 无关）+ 薄道
 * validateReviewJson 同一源校验，通过才落 changeDir/review.json（reviewer=platform-inline
 * 如实标注）——成功后调用方同调用继续登记子步，missing→PASS 往返消灭。
 * 任何失败返回 {ok:false, reason}——调用方回退现状任务书面（零治理损失）。
 * 不写 dispatch record（那是厚道跨命令异步形态；单调用在途态只随返回值与输出留痕）。
 */
export async function runThinReviewInline(opts = {}) {
  const {
    cwd = process.cwd(), specBase, change, changeDir, taskbookText,
    waitMs = 60_000, pollIntervalMs = 5_000, budgetUsd = 1.0,
    client = null, probe = null, log = null,
  } = opts
  const say = typeof log === 'function' ? log : () => {}
  if (!specBase || !change || !changeDir || typeof taskbookText !== 'string' || !taskbookText.trim()) {
    return { ok: false, reason: '缺少 specBase/change/changeDir/taskbookText' }
  }
  let cl = client
  if (!cl) {
    try {
      const { SillyHubMcpClient } = await import('./sillyhub-mcp/client.js')
      cl = new SillyHubMcpClient({ cwd })
    } catch (e) {
      return { ok: false, reason: `client 构建失败（${(e && e.message) || e}）` }
    }
  }
  if (!cl || typeof cl.createMission !== 'function' || typeof cl.dispatchWorker !== 'function'
    || typeof cl.listWorkers !== 'function' || typeof cl.getWorkerResult !== 'function') {
    return { ok: false, reason: 'client 不具备平台派发接口（create/dispatch/list/result）' }
  }
  try {
    const probeFn = probe || (await import('./dispatch/probe.js')).probeSillyHub
    const pr = await probeFn({ client: cl, worktreePath: null, cwd })
    if (!pr || pr.available !== true) {
      return { ok: false, reason: `平台通道不可用（${pr && pr.reason ? pr.reason : 'probe 异常'}）` }
    }
    const objective = `轻量变更独立评审（${change}）——按任务书产出 review.json 结论`
    const workerPrompt = taskbookText + '\n' + [
      '',
      '【平台通道产出方式（read_only 约束——覆盖上方「写到文件」指引）】',
      '- 平台 worker 禁止写任何文件、禁止 git 操作：把完整 review.json 文本（上方 schema）作为产出返回。',
      '- 优先放 artifacts（kind 含 review，content 字段放纯 JSON 文本）；宿主不支持 artifacts 时放回答正文首个 ```json 代码块（CLI 回收链三通道兜底）。',
    ].join('\n')
    const mission = await cl.createMission({ objective, orchestrationMode: 'external', budgetUsd })
    const missionId = mission && mission.missionId
    if (!missionId) return { ok: false, reason: 'create_mission 未返回 missionId' }
    say(`🛰️ 平台评审已派发（mission ${String(missionId).slice(0, 8)}）——有界等待 ${Math.round(waitMs / 1000)}s（review_inline_wait）`)
    let worker = null
    try {
      worker = await cl.dispatchWorker({ missionId, objective, readOnly: true, worktreePath: cwd, workerPrompt })
    } catch (e) {
      return { ok: false, reason: `dispatch_worker 异常（${(e && e.message) || e}）`, missionId }
    }
    const workerId = worker && worker.workerId
    if (!workerId) return { ok: false, reason: 'dispatch_worker 未返回 workerId', missionId }
    const deadline = Date.now() + Math.max(1000, waitMs)
    let lastState = ''
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, Math.max(200, Math.min(pollIntervalMs, deadline - Date.now()))))
      let w = null
      try {
        const workers = await cl.listWorkers(missionId)
        w = Array.isArray(workers) ? workers.find((x) => x && (x.id === workerId || x.worker_id === workerId)) : null
      } catch { /* 单次轮询抖动按在途继续（下轮重试） */ }
      const st = w ? String(w.status || '') : 'unknown'
      if (st !== lastState) {
        say(`🛰️ 平台评审状态：${st}（剩 ${Math.max(0, Math.ceil((deadline - Date.now()) / 1000))}s）`)
        lastState = st
      }
      if (st === 'failed' || st === 'killed') return { ok: false, reason: `worker 终态 ${st}`, missionId, workerId }
      if (st === 'completed') {
        const gr = await cl.getWorkerResult({ missionId, workerId })
        const extracted = extractReviewFromArtifacts(gr && gr.artifacts, gr && gr.answer)
        if (!extracted || typeof extracted !== 'object') {
          return { ok: false, reason: 'worker completed 但三通道提取不到 review JSON（artifacts kind/文本、answer 正文）——平台 UI 可回看 mission', missionId, workerId }
        }
        // reviewer 如实标注（覆盖 worker 任意填法）；change 对齐本变更；其余字段产物原样不改写
        const candidate = { ...extracted, change, reviewer: 'platform-inline' }
        const reviewPath = join(changeDir, 'review.json')
        writeAtomicSync(reviewPath, JSON.stringify(candidate, null, 2) + '\n')
        const { validateReviewJson } = await import('./flow-review.js')
        const v = validateReviewJson(reviewPath)
        if (!v.ok) {
          try { rmSync(reviewPath, { force: true }) } catch { /* 删件失败由下轮覆盖兜底 */ }
          return { ok: false, reason: `提取的 review 不符薄道 schema（${v.errors.join('；')}）——原文可参考平台 mission UI`, missionId, workerId }
        }
        return { ok: true, missionId, workerId, reviewPath }
      }
    }
    return { ok: false, reason: `等待 ${Math.round(waitMs / 1000)}s 未完成（在途 mission ${missionId} 可在平台 UI 回看；本轮回退任务书面）`, missionId, workerId }
  } catch (e) {
    return { ok: false, reason: `inline 派发异常（${(e && e.message) || String(e)}）` }
  }
}

// ════════ 影子期派发（2026-09-18-ceremony-risk-pricing task-06 / FR-04 / D-007@v1 / R-04 / R-06）════════
// 依据：design.md「总体方案 Phase 3」+「风险登记 R-04/R-06」+ plan.md「Wave 4」+ 全局硬约束 2。
// 定位：S0/S1 轻档变更在明面轻仪主线外，后台静默派发重仪式独立评审**只记账不阻断**——
// 影子 verdict 任何取值不回流任何 gate / verify / archive 判定面，为轻仪转正攒对照数据证据。
//
// 隔离面双通道（R-06，缺一不可）：
//   ① 目录隔离——影子产物一律落 .runtime/stage-reviews-shadow/<change>-<stage>-<ts>/review.json，
//     与主线 .runtime/stage-reviews/<stage>-review-* 物理分离（目录名模式亦不匹配主线
//     `${stage}-review-` 前缀扫描，双保险）；
//   ② marker 写入隔离——getLatestStageReviewRunId 优先读 current-stage-review-run-id-* marker
//     （stage-review.js:377-390），本节任何代码**绝不调用 stageReviewMarkerPath / 绝不写主线
//     marker**，影子 runId 独立生成（shadow- 前缀）不复用主线 marker ID。
//
// 通道复用口径：CLI 可自动派发的独立通道是 platform（agent-tool / host-mcp 是宿主侧通道，
// CLI 无法代为派发——缺 client / probe 不可用时按 skip 留痕，不渲染交互式降级指引防噪音）。

/** 影子命名空间目录名（挂在 runtimeRoot 下，随 .runtime 生命周期回收——design 对照账落盘契约） */
export const SHADOW_NAMESPACE_DIR = 'stage-reviews-shadow'
/** 影子派发覆盖的轻档（task-03 档位契约：S0/S1 轻仪、S2/S3 本就是重仪式无影子意义） */
const SHADOW_LIGHT_TIERS = ['S0', 'S1']
/** 转正判据样本目标（design Phase 3：N=10 轻档变更对照样本；计数逻辑消费方在 doctor 维度） */
export const SHADOW_PROMOTION_SAMPLE_TARGET = 10
/** skip 留痕上限（防高频 skip 无界膨胀；entries 是对照证据不截断） */
const SHADOW_LEDGER_MAX_SKIPS = 100

/** 影子对照账路径：{runtimeRoot}/stage-reviews-shadow/shadow-ledger.json（doctor 影子对照维度经 readShadowLedger 同源读取） */
function shadowLedgerPath(runtimeRoot) {
  return join(runtimeRoot, SHADOW_NAMESPACE_DIR, 'shadow-ledger.json')
}

/**
 * 读影子对照账（doctor 影子对照维度消费；best-effort 绝不抛）。
 * @returns {{schemaVersion: number, entries: object[], skips: object[]}} 无/坏账 → 空账壳
 */
export function readShadowLedger(runtimeRoot) {
  try {
    const p = shadowLedgerPath(runtimeRoot)
    if (!existsSync(p)) return { schemaVersion: 1, entries: [], skips: [] }
    const doc = JSON.parse(readFileSync(p, 'utf8'))
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { schemaVersion: 1, entries: [], skips: [] }
    return {
      schemaVersion: 1,
      entries: Array.isArray(doc.entries) ? doc.entries : [],
      skips: Array.isArray(doc.skips) ? doc.skips : [],
    }
  } catch {
    return { schemaVersion: 1, entries: [], skips: [] }
  }
}

/**
 * 对照账读改写（withFileLock + writeAtomicSync，多会话并发追加安全——对齐 gates.js 档位文件
 * 锁口径）。mutator 直接改 ledger 对象；skips 段自动截尾。锁/写失败 warn 后吞（fire-and-forget
 * 语义：影子链路任何失败只留日志，不向调用方抛）。
 */
async function mutateShadowLedger(runtimeRoot, mutator) {
  const p = shadowLedgerPath(runtimeRoot)
  try {
    await withFileLock(p + '.lock', () => {
      const ledger = readShadowLedger(runtimeRoot)
      mutator(ledger)
      ledger.skips = (Array.isArray(ledger.skips) ? ledger.skips : []).slice(-SHADOW_LEDGER_MAX_SKIPS)
      mkdirSync(dirname(p), { recursive: true })
      writeAtomicSync(p, JSON.stringify(ledger, null, 2) + '\n')
      return ledger
    })
  } catch (e) {
    console.warn(`[sillyspec] 影子对照账写入失败（只记账不阻断）: ${e && e.message ? e.message : String(e)}`)
  }
}

/** skip 留痕（前置不满足 / 平台通道不可用——acceptance「skip 留痕可查」落点） */
function appendShadowLedgerSkip(runtimeRoot, skip) {
  return mutateShadowLedger(runtimeRoot, (ledger) => {
    ledger.skips.push({ at: new Date().toISOString(), ...skip })
  })
}

/**
 * 读档位文件（task-03 契约消费：.runtime/ceremony-tier-<change>.json {tier,components,reasons,transitions[]}）。
 * gates.js readCeremonyTierDoc 未导出——本地镜像同一容错口径（缺失/坏 JSON/非对象/tier 不在
 * S0~S3 序 → null，不修复不报错）。影子只读不写：升档判定与迁移记录归 gates 阶段门。
 */
function readCeremonyTierForShadow(runtimeRoot, changeName) {
  try {
    const p = runtimeStatePath(runtimeRoot, `ceremony-tier-${changeName}.json`)
    if (!existsSync(p)) return null
    const doc = JSON.parse(readFileSync(p, 'utf8'))
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null
    return CEREMONY_TIERS.includes(doc.tier) ? doc : null
  } catch {
    return null
  }
}

/** 影子 runId 独立生成（shadow- 前缀 + 毫秒尾——不与主线 review- 前缀 marker 格式互通） */
function generateShadowReviewRunId() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `shadow-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${String(now.getMilliseconds()).padStart(3, '0')}`
}

// ── 影子在途记录（独立于主线 review-dispatch-<change>.json——互不触发对方幂等闸，
//    stage-review.js:751 的主线在途提示内联读的也是主线文件名，不会被影子记录污染）──

function shadowRecordPath(specBase, changeName) {
  return runtimeStatePath(join(specBase, '.runtime'), `review-dispatch-shadow-${changeName}.json`)
}

function readShadowRecord(specBase, changeName) {
  try {
    const p = shadowRecordPath(specBase, changeName)
    if (!existsSync(p)) return null
    const r = JSON.parse(readFileSync(p, 'utf8'))
    return r && typeof r === 'object' && typeof r.missionId === 'string' ? r : null
  } catch { return null }
}

function createShadowRecord(specBase, changeName, record) {
  const p = shadowRecordPath(specBase, changeName)
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  try {
    writeFileSync(p, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    return { created: true }
  } catch (e) {
    if (e && (e.code === 'EEXIST' || e.code === 'EPERM')) {
      return { created: false, existing: readShadowRecord(specBase, changeName) }
    }
    throw e
  }
}

function updateShadowRecord(specBase, changeName, patch) {
  const cur = readShadowRecord(specBase, changeName)
  if (!cur) return false
  writeAtomicSync(shadowRecordPath(specBase, changeName), JSON.stringify({ ...cur, ...patch }, null, 2) + '\n')
  return true
}

function clearShadowRecord(specBase, changeName) {
  const p = shadowRecordPath(specBase, changeName)
  try { if (existsSync(p)) { rmSync(p); return true } return false } catch { return false }
}

// ── 对照账口径：catch = checklist result ∈ {fail, gap} 的项（与 collectSameStagePriorReview
//    openFindings 同口径）；漏检 = 影子 catch 项的主线侧文本不匹配项（主线 S0/S1 轻仪通常无
//    review.json → caught 空 → 影子全部 catch 记为漏检——这正是要攒的证据）──────────────────

function normalizeShadowItemKey(item) {
  return String(item || '').replace(/\s+/g, ' ').trim()
}

function extractCaughtItems(review) {
  const out = []
  for (const c of (Array.isArray(review && review.checklist) ? review.checklist : [])) {
    if (!c || typeof c !== 'object' || !c.item) continue
    if (c.result === 'fail' || c.result === 'gap') {
      out.push({
        item: String(c.item).replace(/\s+/g, ' ').trim().slice(0, 200),
        result: c.result === 'fail' ? 'fail' : 'gap',
        note: c.note ? String(c.note).replace(/\s+/g, ' ').slice(0, 160) : '',
      })
    }
  }
  return out
}

/**
 * 主线轻仪结论快照（派发时点定妆，此后主线改判不影响对照口径）。
 * 有主线 review.json（轻档降级自审等场景）→ 采其 verdict + caught；无 → light-cli 形态
 * （S0/S1 CLI 清单核验无 review.json，按零 catch 记账——漏检判据的保守侧）。
 */
async function collectMainlineLightConclusion(runtimeRoot, stage, changeName) {
  try {
    const { getLatestStageReviewRunId } = await import('./stage-review.js')
    const runId = getLatestStageReviewRunId(runtimeRoot, stage, changeName)
    if (runId) {
      const rp = join(runtimeRoot, 'stage-reviews', `${stage}-${runId}`, 'review.json')
      if (existsSync(rp)) {
        const review = JSON.parse(readFileSync(rp, 'utf8'))
        if (review && typeof review === 'object') {
          const r0 = Array.isArray(review.reviewedFiles) ? String(review.reviewedFiles[0]) : ''
          // cross-change 防护同 getLatestStageReviewRunId 口径；空 reviewedFiles 的存量容过
          if (!r0 || r0.includes(`changes/${changeName}/`)) {
            return {
              source: 'review.json', reviewRunId: runId,
              specVerdict: String(review.specVerdict || ''), qualityVerdict: String(review.qualityVerdict || ''),
              caught: extractCaughtItems(review),
            }
          }
        }
      }
    }
  } catch { /* best-effort 快照，失败按 light-cli 记账 */ }
  return {
    source: 'light-cli', reviewRunId: null, specVerdict: '', qualityVerdict: '', caught: [],
    note: 'S0/S1 轻仪主线（CLI 清单核验）无 review.json——按零 catch 记账',
  }
}

/**
 * 落盘影子 stage review（R-06 隔离双通道的目录通道）。
 *
 * ⚠️ 与 persistStageReview 的三处刻意差异：①目录落 stage-reviews-shadow/<change>-<stage>-<ts>/
 * （独立命名空间，目录名模式不匹配主线 `${stage}-review-` 前缀扫描）；②reviewer 落款带
 * shadow: true 标记；③**绝不触碰 stageReviewMarkerPath / 主线 marker**（marker 写入通道隔离）。
 * schema 不过 → 不落 review.json（影子命名空间同样不放宽 schema），原始产物存 review-raw.json
 * 供人工核对、errors 返回记账。
 * @returns {{ok: boolean, reviewPath?: string, rawPath?: string, errors?: string[]}}
 */
function persistShadowStageReview({ runtimeRoot, stage, changeName, shadowRunId, reviewObj, missionId, mainDocPath }) {
  const review = {
    ...reviewObj,
    reviewer: {
      channel: 'platform', shadow: true,
      missionId: missionId || null,
      model: (reviewObj && reviewObj.reviewer && reviewObj.reviewer.model) || null,
    },
  }
  if (mainDocPath && existsSync(mainDocPath)) {
    const h = computeDocHash(mainDocPath)
    if (h) review.docHash = h
  }
  const schema = validateStageReviewSchema(review, stage)
  const ts = String(shadowRunId || '').startsWith('shadow-') ? String(shadowRunId).slice('shadow-'.length) : String(shadowRunId || Date.now())
  const dir = join(runtimeRoot, SHADOW_NAMESPACE_DIR, `${changeName}-${stage}-${ts}`)
  mkdirSync(dir, { recursive: true })
  if (!schema.ok) {
    const rawPath = join(dir, 'review-raw.json')
    writeAtomicSync(rawPath, JSON.stringify(reviewObj, null, 2) + '\n')
    return { ok: false, rawPath, errors: schema.errors }
  }
  review.reviewedFiles = Array.isArray(review.reviewedFiles) && review.reviewedFiles.length > 0
    ? review.reviewedFiles
    : [`changes/${changeName}/${STAGE_MAIN_DOC[stage] || 'design.md'}`]
  const reviewPath = join(dir, 'review.json')
  writeAtomicSync(reviewPath, JSON.stringify(review, null, 2) + '\n')
  return { ok: true, reviewPath }
}

/**
 * 影子期派发总入口（task-06 落地；gates.js 阶段门接线归收尾批次——本函数只导出不挂载）。
 *
 * 调用协议（gates 阶段门 / task-07 接线用）：
 *   await dispatchShadowReview({
 *     mode: 'create',            // 'create' | 'status' | 'kill'（与 runReviewDispatch 同形）
 *     cwd, specBase, changeName, // 必填；stage（create 必填）∈ brainstorm|plan|execute
 *     client,                    // SillyHubMcpClient 实例（create/status 用；缺 → skip 留痕不报错）
 *     probe,                     // 可注入（默认真 probeSillyHub，测试传 stub）
 *     budgetUsd, stallMs,        // 缺省读 readReviewDispatchConfig（local.yaml review_dispatch 段）
 *     mainline,                  // 可选：主线轻仪结论快照注入 {specVerdict, qualityVerdict, caught:[{item,result,note}]}；
 *                                //   缺省自动采（collectMainlineLightConclusion）
 *   })
 * 建议挂点：阶段完成门升档检查点（escalateCeremonyTierAtGate）之后 fire-and-forget 调用
 * （不 await 阻塞门判定亦可用——返回值只用于日志，任何 {ok:false}/{skipped} 形态都不是错误）。
 *
 * 前置校验两项硬条件（acceptance）：① .runtime/ceremony-tier-<change>.json 当前档 ∈ {S0, S1}；
 * ② local.yaml ceremony.shadow ≠ false（task-05 readCeremonyLocalConfig 契约，缺省 true）。
 * 不满足 → skip 留痕（对照账 skips 段）+ {ok:true, skipped:true}，不报错不阻断主线。
 *
 * 只记账不阻断（FR-04）：本函数永不抛（异常吞掉留 warning 日志）；影子 verdict / 影子结论
 * 不进入任何主线 gate、verify、archive 判定面——对照数据只落 stage-reviews-shadow/ 命名空间。
 *
 * @returns {Promise<{ok: boolean, shadow: true, ...}>}
 */
export async function dispatchShadowReview(opts = {}) {
  const {
    mode = 'create', cwd = process.cwd(), specBase, changeName, stage,
    client, probe, budgetUsd, stallMs, mainline,
  } = opts
  try {
    if (!specBase || !changeName) return { ok: false, shadow: true, reason: '缺少 specBase/changeName' }
    const cfg = readReviewDispatchConfig(cwd)
    const budget = typeof budgetUsd === 'number' && budgetUsd > 0 ? budgetUsd : cfg.budget_usd
    const stall = typeof stallMs === 'number' && stallMs > 0 ? stallMs : cfg.stall_ms
    const runtimeRoot = join(specBase, '.runtime')

    if (mode === 'kill') {
      const rec = readShadowRecord(specBase, changeName)
      if (rec) {
        await mutateShadowLedger(runtimeRoot, (ledger) => {
          const e = ledger.entries.find((x) => x && x.shadowRunId === rec.shadowRunId)
          if (e && e.state !== 'completed') {
            e.state = 'failed'
            e.failReason = `人工 kill（影子在途放弃——平台 mission ${rec.missionId} 处置权在人）`
          }
        })
      }
      clearShadowRecord(specBase, changeName)
      return { ok: true, shadow: true, killedLocally: true, platformHint: rec ? `影子在途记录已清；平台侧 mission ${rec.missionId} 请在平台 UI 处置。` : '无影子在途记录（已清或从未派发）。' }
    }

    if (mode === 'create') {
      if (!stage || !STAGE_MAIN_DOC[stage]) return { ok: false, shadow: true, reason: `stage 必填 ∈ ${Object.keys(STAGE_MAIN_DOC).join('|')}` }
      const tierDoc = readCeremonyTierForShadow(runtimeRoot, changeName)
      const skip = async (reason) => {
        await appendShadowLedgerSkip(runtimeRoot, { change: changeName, stage, tier: tierDoc ? tierDoc.tier : null, reason })
        return { ok: true, shadow: true, skipped: true, reason }
      }
      // 前置①：档位 ∈ S0/S1（task-03 档位文件契约；无档位文件 = 未定价变更，不开影子）
      if (!tierDoc) return skip('tier-file-missing（.runtime/ceremony-tier-<change>.json 不存在——影子派发只对已定价的轻档变更开跑）')
      if (!SHADOW_LIGHT_TIERS.includes(tierDoc.tier)) return skip(`tier-not-light（当前档 ${tierDoc.tier}——影子派发只覆盖 S0/S1 轻档，S2/S3 本就是重仪式）`)
      // 前置②：ceremony.shadow ≠ false（task-05 readCeremonyLocalConfig；动态 import 防静态环）
      const { readCeremonyLocalConfig } = await import('./run/prompt.js')
      const ceremony = readCeremonyLocalConfig(cwd)
      if (ceremony && ceremony.shadow === false) return skip('shadow-off（local.yaml ceremony.shadow: off——轻仪已转正，影子期关闭）')
      // 幂等闸（影子记录独立文件，与主线派发并行不互斥）
      const cur = readShadowRecord(specBase, changeName)
      if (cur && (cur.state === 'in-flight' || cur.state === 'dispatching')) {
        return { ok: false, shadow: true, reason: `已有在途影子派发（mission ${cur.missionId}，state ${cur.state}）`, existing: cur }
      }
      if (!client || !client.probeDaemon) {
        return skip('platform-client-missing（影子派发复用 platform 通道；agent-tool/host-mcp 是宿主侧通道 CLI 无法自动派发——宿主可自行派重仪式对照，结论不入本账）')
      }
      const probeFn = probe || (await import('./dispatch/probe.js')).probeSillyHub
      const pr = await probeFn({ client, worktreePath: null, cwd })
      if (!pr || pr.available !== true) {
        return skip(`platform-unavailable（${pr && pr.reason ? pr.reason : 'probe 异常'}——影子链路不渲染交互式降级指引，静默记账）`)
      }
      // 主线轻仪结论快照（派发时点定妆；调用方可经 mainline 注入覆盖自动采集）
      const mainlineSnapshot = mainline && typeof mainline === 'object'
        ? { source: 'caller-injected', specVerdict: String(mainline.specVerdict || ''), qualityVerdict: String(mainline.qualityVerdict || ''), caught: extractCaughtItems({ checklist: mainline.caught }) }
        : await collectMainlineLightConclusion(runtimeRoot, stage, changeName)
      // 影子 runId 独立生成（R-06 隔离通道②：绝不读写主线 marker / stageReviewMarkerPath）
      const shadowRunId = generateShadowReviewRunId()
      const changeDir = join(specBase, 'changes', changeName)
      const book = buildReviewerTaskBook({ stage, changeDir, reviewRunId: shadowRunId, channelPriority: readReviewChannelPriority(cwd), probeLines: probeLinesForThick(specBase) })
      const workerPrompt = book.workerPrompt + '\n（影子审查：本结论将由 CLI 回收到 stage-reviews-shadow/ 独立命名空间做轻/重对照记账，不影响主线任何判定。）\n'
      const mission = await client.createMission({ objective: book.objective, orchestrationMode: 'external', budgetUsd: budget })
      const missionId = mission && mission.missionId
      if (!missionId) return skip('create-mission-no-id（平台未返回 missionId）')
      const cr = createShadowRecord(specBase, changeName, {
        change: changeName, stage, shadow: true, missionId, workerId: null, state: 'dispatching',
        createdAt: new Date().toISOString(), lastState: 'dispatching', lastStateAt: Date.now(), shadowRunId,
      })
      if (!cr.created) {
        return { ok: false, shadow: true, reason: '并发双开被拒（O_EXCL，影子记录）', existing: cr.existing }
      }
      let worker = null
      try {
        worker = await client.dispatchWorker({
          missionId, objective: book.objective, readOnly: true,
          worktreePath: cwd, workerPrompt,
        })
      } catch (e) {
        updateShadowRecord(specBase, changeName, { state: 'abandoned', errorCode: 'dispatch_worker_threw' })
        await mutateShadowLedger(runtimeRoot, (ledger) => {
          ledger.entries.push({
            id: shadowRunId, change: changeName, stage, tier: tierDoc.tier, shadowRunId,
            at: new Date().toISOString(), state: 'abandoned', failReason: `dispatch_worker 异常: ${e && e.message ? e.message : String(e)}`,
            mainline: mainlineSnapshot,
          })
        })
        clearShadowRecord(specBase, changeName)
        console.warn(`[sillyspec] 影子派发失败（只记账不阻断）: dispatch_worker 异常 ${e && e.message ? e.message : String(e)}`)
        return { ok: false, shadow: true, reason: 'dispatch_worker 异常（已记对照账 abandoned）' }
      }
      const workerId = worker && worker.workerId
      if (!workerId) {
        updateShadowRecord(specBase, changeName, { state: 'abandoned', errorCode: 'no_worker_id' })
        await mutateShadowLedger(runtimeRoot, (ledger) => {
          ledger.entries.push({
            id: shadowRunId, change: changeName, stage, tier: tierDoc.tier, shadowRunId,
            at: new Date().toISOString(), state: 'abandoned', failReason: 'dispatch_worker 未返回 workerId',
            mainline: mainlineSnapshot,
          })
        })
        clearShadowRecord(specBase, changeName)
        return { ok: false, shadow: true, reason: 'dispatch_worker 未返回 workerId（已记对照账 abandoned）' }
      }
      updateShadowRecord(specBase, changeName, { workerId, state: 'in-flight', lastState: 'queued', lastStateAt: Date.now() })
      // 对照账登记（in-flight 态——回收时补影子结论与 catch 差异）
      await mutateShadowLedger(runtimeRoot, (ledger) => {
        ledger.entries.push({
          id: shadowRunId, change: changeName, stage, tier: tierDoc.tier, shadowRunId,
          at: new Date().toISOString(), state: 'in-flight',
          missionId, mainline: mainlineSnapshot,
        })
      })
      return {
        ok: true, shadow: true, missionId, workerId, shadowRunId,
        nextStep: '影子派发 fire-and-forget：只记账不阻断——status 回收随主线检查点顺带跑（dispatchShadowReview mode="status"）或由 doctor 影子对照维度报告在途。',
      }
    }

    if (mode === 'status') {
      const rec = readShadowRecord(specBase, changeName)
      if (!rec) return { ok: false, shadow: true, reason: '无影子在途记录——先 create。' }
      if (!client || !client.listWorkers) return { ok: false, shadow: true, reason: 'client 未注入' }
      const workers = await client.listWorkers(rec.missionId)
      const w = Array.isArray(workers) ? workers.find((x) => x && (x.id === rec.workerId || x.worker_id === rec.workerId)) : null
      const st = w ? String(w.status || '') : 'unknown'
      const statusLine = `影子 mission ${rec.missionId} worker ${rec.workerId}: ${st}`
      if (w && st && st !== rec.lastState) {
        updateShadowRecord(specBase, changeName, { lastState: st, lastStateAt: Date.now() })
        rec.lastState = st; rec.lastStateAt = Date.now()
      }
      if (st === 'completed') {
        const gr = await client.getWorkerResult({ missionId: rec.missionId, workerId: rec.workerId })
        // 通道③同步受益（answer 正文——主线同款；影子 accounting-only 不加 salvage 交互面）
        const review = extractReviewFromArtifacts(gr && gr.artifacts, gr && gr.answer)
        if (!review) {
          await mutateShadowLedger(runtimeRoot, (ledger) => {
            const e = ledger.entries.find((x) => x && x.shadowRunId === rec.shadowRunId)
            if (e && e.state !== 'completed') { e.state = 'failed'; e.failReason = 'completed-no-artifact（worker completed 但 artifacts 提取不到 review JSON）' }
          })
          clearShadowRecord(specBase, changeName)
          return { ok: false, shadow: true, state: 'completed-no-artifact', statusLine, accountingOnly: true }
        }
        const mainDocPath = join(specBase, 'changes', changeName, STAGE_MAIN_DOC[rec.stage] || 'design.md')
        const p = persistShadowStageReview({
          runtimeRoot, stage: rec.stage, changeName, shadowRunId: rec.shadowRunId,
          reviewObj: review, missionId: rec.missionId, mainDocPath,
        })
        // 对照账补全：影子重仪式结论 + catch 差异（漏检 = 影子抓到而主线轻仪没抓到）
        await mutateShadowLedger(runtimeRoot, (ledger) => {
          const e = ledger.entries.find((x) => x && x.shadowRunId === rec.shadowRunId)
          if (!e) return
          const shadowCaught = extractCaughtItems(review)
          const mainlineCaught = e.mainline && Array.isArray(e.mainline.caught) ? e.mainline.caught : []
          const mainKeys = new Set(mainlineCaught.map((c) => normalizeShadowItemKey(c.item)))
          const missedByLight = shadowCaught
            .filter((c) => !mainKeys.has(normalizeShadowItemKey(c.item)))
            .map((c) => ({ item: c.item, result: c.result, note: c.note }))
          const shadowFailed = review.specVerdict === 'fail' || review.qualityVerdict === 'fail'
          const lightFailed = (e.mainline && (e.mainline.specVerdict === 'fail' || e.mainline.qualityVerdict === 'fail')) || false
          e.state = p.ok ? 'completed' : 'bad-review'
          e.completedAt = new Date().toISOString()
          e.shadow = {
            specVerdict: String(review.specVerdict || ''), qualityVerdict: String(review.qualityVerdict || ''),
            caught: shadowCaught,
          }
          e.diff = {
            missedByLight,
            shadowFailed,
            lightFailed,
            verdictDelta: shadowFailed && !lightFailed,
          }
          e.reviewPath = p.ok ? p.reviewPath : p.rawPath
          if (!p.ok) e.schemaErrors = p.errors
        })
        clearShadowRecord(specBase, changeName)
        return {
          ok: p.ok, shadow: true, state: p.ok ? 'completed' : 'bad-review', statusLine,
          reviewPath: p.reviewPath || p.rawPath, verdict: `${review.specVerdict}/${review.qualityVerdict}`,
          errors: p.errors, accountingOnly: true,
        }
      }
      if (st === 'failed' || st === 'killed') {
        await mutateShadowLedger(runtimeRoot, (ledger) => {
          const e = ledger.entries.find((x) => x && x.shadowRunId === rec.shadowRunId)
          if (e && e.state !== 'completed') { e.state = 'failed'; e.failReason = `worker 终态 ${st}` }
        })
        clearShadowRecord(specBase, changeName)
        return { ok: false, shadow: true, state: st, statusLine, accountingOnly: true }
      }
      const stallInfo = detectStall(rec, Date.now(), stall)
      return {
        ok: true, shadow: true, state: st || 'in-flight', statusLine,
        stalled: stallInfo.stalled, stallHint: stallInfo.hint, accountingOnly: true,
      }
    }

    return { ok: false, shadow: true, reason: `未知 mode: ${mode}` }
  } catch (e) {
    // fire-and-forget 兜底：影子链路任何异常吞掉留 warning，绝不向主线抛（FR-04 只记账不阻断）
    console.warn(`[sillyspec] 影子派发异常（只记账不阻断）: ${e && e.message ? e.message : String(e)}`)
    return { ok: false, shadow: true, reason: `影子派发异常: ${e && e.message ? e.message : String(e)}` }
  }
}

// task-06 消费契约预留（配置读取在该 task 落地；此处常量为缺省值单一来源）
const DEFAULT_REVIEW_DISPATCH_CONFIG = { budget_usd: 1.0, stall_ms: 900_000, timeout_ms: 0 }
/** 厚档任务书探针装配（2026-10-12-review-probe-injection）：失败/未配置返回 null（零注入零阻断）。 */
function probeLinesForThick(specBase) {
  try {
    const { lines, warnings } = assembleProbeLinesForScope(specBase, 'thick')
    for (const w of warnings) console.warn(`⚠️ review_probes：${w}`)
    return lines.length > 0 ? lines : null
  } catch { return null }
}

export function readReviewDispatchConfig(cwd) {
  try {
    const p = join(cwd || process.cwd(), '.sillyspec', 'local.yaml')
    if (!existsSync(p)) return { ...DEFAULT_REVIEW_DISPATCH_CONFIG }
    const doc = jsYaml.load(readFileSync(p, 'utf8'))
    const rd = doc && typeof doc === 'object' && doc.review_dispatch && typeof doc.review_dispatch === 'object' ? doc.review_dispatch : {}
    const num = (v, dflt) => (typeof v === 'number' && v >= 0 ? v : dflt)
    return {
      budget_usd: num(rd.budget_usd, DEFAULT_REVIEW_DISPATCH_CONFIG.budget_usd),
      stall_ms: num(rd.stall_ms, DEFAULT_REVIEW_DISPATCH_CONFIG.stall_ms),
      timeout_ms: num(rd.timeout_ms, DEFAULT_REVIEW_DISPATCH_CONFIG.timeout_ms),
    }
  } catch { return { ...DEFAULT_REVIEW_DISPATCH_CONFIG } }
}
