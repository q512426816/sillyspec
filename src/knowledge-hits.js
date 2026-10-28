/**
 * knowledge-hits.js — 知识闭环遥测事件流（.runtime/knowledge-hits.jsonl）
 *
 * 2026-09-14-knowledge-loop-close task-01 交付的共享底座（KnowledgeHitsAPI）：
 * - 写：appendKnowledgeHit —— 每次恰好一行 JSON + '\n'（Node fs 不做换行翻译，Windows 下同为 LF）
 * - 读：readKnowledgeHits —— 逐行 JSON.parse，坏行/残行跳过不抛（R-04：并发 append 交错容忍）
 * - 记录类型：inject（机械注入命中，task-04 写入）/ classify（归类审计，task-02 写入）；
 *   聚合侧 stats（task-05）统一经 readKnowledgeHits 读取
 *
 * 数据模型按 design.md：{"type":"inject"|"classify","change":…,"query":…,"matchedFiles":[…],"at":"ISO-8601"}
 * classify 记录可携带 qlId/targetFile（字段原样序列化，不裁剪）。
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { runtimeStatePath } from './runtime-paths.js'
import { join } from 'path'
import { readPlatformPushConfig } from './agent-session-log.js'

const HITS_FILENAME = 'knowledge-hits.jsonl'

// 直报超时上限（2026-10-28-knowledge-hits-cli-push）：对齐 agent-log PUSH_TIMEOUT_MS
// 量级——最坏情况下进程退出被活跃 socket 拖住的时长有界。
const HITS_PUSH_TIMEOUT_MS = 10_000

function hitsFilePath(runtimeDir) {
  return runtimeStatePath(runtimeDir, HITS_FILENAME)
}

/**
 * runtimeDir → specBase 反推（剥尾 `.runtime` 段；跨平台：正反斜杠与尾分隔符容忍）。
 *
 * 全部 appendKnowledgeHit 调用形态的 runtimeDir 最终都是 `<specBase>/.runtime`
 * （join(specBase,'.runtime') 或 resolveRuntimeRoot 产物）——统一剥最后一段反推
 * specBase 供平台配置读取（local.yaml 在 specBase 根）。结果保留输入的分隔符
 * 形态（不做平台归一——Node fs 对 / 与 \ 双向兼容，归一反而扭曲 POSIX 形态输入）。
 *
 * @param {string} runtimeDir
 * @returns {string} specBase（runtimeDir 末段不是 .runtime 时原样返回——容错面）
 */
export function specBaseFromRuntimeDir(runtimeDir) {
  const raw = String(runtimeDir)
  const norm = raw.replace(/\\/g, '/').replace(/\/+$/, '')
  const idx = norm.lastIndexOf('/')
  const last = idx === -1 ? norm : norm.slice(idx + 1)
  if (last !== '.runtime') return runtimeDir
  // \→/ 等长替换、去尾 / 只动末尾——norm 前 idx 字符与原串位置一一对应，
  // 直接按剥点切片即保留原分隔符形态的 specBase。
  return raw.slice(0, idx)
}

/**
 * 单行遥测直报平台（2026-10-28-knowledge-hits-cli-push FR-01）。
 *
 * POST {url}/api/changes/-/hits-sync（Bearer shpsync_ 令牌——workspace 由令牌派生），
 * body {lines:[line], daemon_local_id:'cli'}；接收端行级幂等（行 sha256 去重，
 * 平台仓 2026-10-28-knowledge-hits-cli-direct）。best-effort 语义照
 * pushAgentLogToPlatform 先例：无配置/被禁用静默跳过（返回 pushed:null）；
 * 网络/非 2xx/超时 warn 一行不抛（返回 pushed:false, reason）——本地行已落盘、
 * daemon 周期上行与平台按钮 flush 为兜底通道。
 *
 * @param {object} p
 * @param {string} p.specBase - local.yaml 所在 spec 基路径
 * @param {object} [p.env]    - env（默认 process.env；测试注入用）
 * @param {string} p.line     - 已落盘的遥测行（JSON 字符串）
 * @returns {Promise<{pushed:boolean|null, reason?:string}>}
 */
export async function pushKnowledgeHitToPlatform({ specBase, env = process.env, line }) {
  if (env.SILLYSPEC_HITS_PUSH === '0') {
    return { pushed: null, reason: 'disabled' }
  }
  const cfg = readPlatformPushConfig(specBase, env)
  if (!cfg) return { pushed: null, reason: 'no-config' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HITS_PUSH_TIMEOUT_MS)
  try {
    const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/api/changes/-/hits-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ lines: [line], daemon_local_id: 'cli' }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[knowledge-hits-push] → HTTP ${res.status}（本地行已落盘，daemon 兜底）`)
      return { pushed: false, reason: `http-${res.status}` }
    }
    return { pushed: true }
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? '超时' : (err && err.message ? err.message : err)
    console.warn(`[knowledge-hits-push] 直报失败: ${msg}（本地行已落盘，daemon 兜底）`)
    return { pushed: false, reason: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 追加一条遥测记录（目录/文件缺失自动创建）。
 *
 * 2026-10-28-knowledge-hits-cli-push：落盘成功后 void fire 平台直报（FR-01/02）——
 * 不 await 不抛（失败 warn 一行由 pushKnowledgeHitToPlatform 内部收口），主流程
 * 同步语义与返回值不变；无配置/被禁用时零行为差异。
 *
 * @param {string} runtimeDir - .runtime 目录
 * @param {object} hit - 记录对象，常用字段 { type:'inject'|'classify', change, query, matchedFiles, at }
 *   （at 缺省时补当前 ISO 时间；其余字段原样序列化，classify 的 qlId/targetFile 等照写）
 * @returns {object} 实际落盘的记录对象
 */
export function appendKnowledgeHit(runtimeDir, hit) {
  const record = { ...hit }
  if (record.at === undefined || record.at === null) {
    record.at = new Date().toISOString()
  }
  mkdirSync(runtimeDir, { recursive: true })
  const line = JSON.stringify(record)
  appendFileSync(hitsFilePath(runtimeDir), line + '\n', 'utf8')
  // 写后直报（void fire）：本地已落盘，直报成败不影响本函数语义（FR-02）。
  void pushKnowledgeHitToPlatform({ specBase: specBaseFromRuntimeDir(runtimeDir), line }).catch(() => {})
  return record
}

/**
 * 读取遥测记录（坏行/残行容忍，解析失败不抛）。
 *
 * @param {string} runtimeDir - .runtime 目录
 * @param {object} [opts] - { sinceDays }：仅保留 at 在近 N 天内的记录
 *   （过滤启用时 at 缺失/不可解析的记录一并跳过——无法证明在窗口内）
 * @returns {object[]} 解析成功的记录数组（文件缺失/为空 → []）
 */
export function readKnowledgeHits(runtimeDir, opts = {}) {
  const file = hitsFilePath(runtimeDir)
  if (!existsSync(file)) return []

  const records = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let record
    try {
      record = JSON.parse(trimmed)
    } catch {
      continue // 坏行/残行：跳过不抛（R-04）
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue
    records.push(record)
  }

  const sinceDays = opts ? Number(opts.sinceDays) : NaN
  if (!Number.isFinite(sinceDays) || sinceDays < 0) return records
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000
  return records.filter((record) => {
    const at = Date.parse(record.at)
    return Number.isFinite(at) && at >= cutoff
  })
}
