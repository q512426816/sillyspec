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
import { join } from 'node:path'
import jsYaml from 'js-yaml'
import { writeAtomicSync } from './fs-atomic.js'
import { REVIEW_CHECKLISTS } from './stage-review-checklist.js'
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
  return join(specBase, '.runtime', `review-dispatch-${changeName}.json`)
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
 * 从 artifacts 提取 review JSON（双通道容错，design 风险登记「平台 artifacts 形态演进」）：
 * ① kind 含 review/review_json 的 artifact，content/content_ref/text 字段 JSON.parse 优先；
 * ② 兜底任一 artifact 文本字段提取首个平衡 {} 对象。全失败 → null（调用方给人工 get_worker_result 指引）。
 */
export function extractReviewFromArtifacts(artifacts) {
  if (!Array.isArray(artifacts)) return null
  const texts = []
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
  for (const t of texts) {
    const start = t.indexOf('{')
    if (start === -1) continue
    // 首个平衡对象：括号配对扫描（字符串字面量内的 } 不计数）
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
          } catch { break }
        }
      }
    }
  }
  return null
}

/**
 * 组装 reviewer 任务书（FR-01 派发质量的核心）：四要素——①单源清单（前缀按 checklist
 * docblock 规则）②review.json 契约（与 gate 同源）③期望产出方式（read_only worker：
 * 结论经 artifacts 返回，**不写任何文件**——落盘归 CLI）④铁律段（禁改文件/禁 git commit）。
 */
export function buildReviewerTaskBook({ stage, changeDir, reviewRunId, channelPriority }) {
  const mainDoc = STAGE_MAIN_DOC[stage] || 'design.md'
  const items = (REVIEW_CHECKLISTS[stage] || []).map((t, i) => `${i + 1}. ${t}`).join('\n')
  const contract = renderReviewJsonContract({ stage, changeDir, reviewRunId, tier: 'independent', channelPriority })
  const workerPrompt = [
    `你是独立审查者（platform 通道派发）。审查对象：${changeDir ? join(changeDir, mainDoc) : mainDoc}`,
    '',
    '## 审查清单（逐条给 pass/gap/fail + 证据锚点）',
    items,
    '',
    contract,
    '',
    '## 产出方式（read_only 约束）',
    '- **禁止修改任何文件、禁止 git commit、禁止写盘**——你只读文档与必要的源码佐证。',
    '- 把**完整 review.json 文本**（按上方契约 schema，含 reviewer: {"channel":"platform"}）作为产出返回（artifacts 里的 content 字段放纯 JSON 文本）。',
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
  const schema = validateStageReviewSchema(review)
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
 *   budgetUsd（默认 1.0）；stallMs（默认 900000）；reviewRunId（status 回收时缺省读 marker）。
 * @returns {Promise<{ok: boolean, ...}>} 永不抛——所有异常转 {ok:false, reason}
 */
export async function runReviewDispatch(opts = {}) {
  const {
    mode = 'create', cwd = process.cwd(), specBase, changeName,
    stage, client, probe, budgetUsd = 1.0, stallMs = 900_000, reviewRunId,
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
        return { ok: false, reason: `平台通道不可用（${pr && pr.reason ? pr.reason : 'probe 异常'}）`, guidance: renderFallbackGuidance(cwd) }
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
      const book = buildReviewerTaskBook({ stage, changeDir, reviewRunId: runId, channelPriority: readReviewChannelPriority(cwd) })
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
        const review = extractReviewFromArtifacts(gr && gr.artifacts)
        if (!review) {
          return { ok: false, state: 'completed-no-artifact', statusLine, reason: 'worker completed 但 artifacts 提取不到 review JSON', guidance: `人工核对：平台 get_worker_result（mission ${rec.missionId} / worker ${rec.workerId}）；确认无法回收再 --kill 降级。` }
        }
        const runtimeRoot = join(specBase, '.runtime')
        const mainDocPath = join(specBase, 'changes', changeName, STAGE_MAIN_DOC[rec.stage] || 'design.md')
        const p = persistStageReview({
          runtimeRoot, stage: rec.stage, changeName, reviewRunId: rec.reviewRunId,
          reviewObj: review, missionId: rec.missionId, mainDocPath,
        })
        if (!p.ok) {
          return { ok: false, state: 'bad-review', statusLine, errors: p.errors, guidance: 'artifacts 里的 review 不符 schema——--kill 后降级，或人工按契约修 review.json（mission 证据保留）。' }
        }
        clearDispatchRecord(specBase, changeName)
        return { ok: true, state: 'completed', statusLine, reviewPath: p.reviewPath, verdict: `${review.specVerdict}/${review.qualityVerdict}` }
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

// task-06 消费契约预留（配置读取在该 task 落地；此处常量为缺省值单一来源）
const DEFAULT_REVIEW_DISPATCH_CONFIG = { budget_usd: 1.0, stall_ms: 900_000, timeout_ms: 0 }
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
