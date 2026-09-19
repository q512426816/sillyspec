/**
 * quick-session-owner.js — quick 会话归属隔离（多 agent 并行防互踩）
 *
 * 坑 quick-shared-pointer-stomp（2026-09-19 实证）：quick 会话 id 经共享指针
 * .runtime/current-quick-run-id（last-writer-wins）+ --done fallback 解析，并行 agent
 * 会话的 --done 会静默步进/收尾他者会话（实证：他者会话 QUICKLOG 条目标题被覆写、
 * 四字段嵌合）。既有护栏两处缺口：resolveSessionIdentity 的 quick 场景身份=会话 id
 * 本身（selfSession==changeName 恒 self，不区分创建者）；Q7 守卫只拦 fallback 命中
 * 已完成/stale 会话，活动中的他者会话照踩。
 *
 * 修复语义（与 change 所有权护栏同三级：--session > SILLYSPEC_SESSION_ID >
 * anon@<host>，缺省机器级只拦他机）：quick 会话创建时把创建者 agent 身份落
 * .runtime/quick-sessions/<sid>/owner.json（与 guard.json 同目录，随 --cancel
 * 目录清理销毁）；变更类操作（--done/--skip/--reset/--reopen/--cancel）前核验归属，
 * 异主 exit 2（接管=显式 --session <owner>）。无 owner 文件的存量会话放行
 * （brownfield 兼容）。核验身份刻意不走 quick 会话三级——那会把身份解析成会话 id
 * 本身，恒 self 失去区分度。
 */
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { writeAtomicSync } from './fs-atomic.js'

/** owner 文件路径（<runtimeRoot>/quick-sessions/<sid>/owner.json，与 guard.json 同目录） */
export function quickSessionOwnerPath(runtimeRoot, sessionId) {
  return join(runtimeRoot, 'quick-sessions', sessionId, 'owner.json')
}

/** 读创建者身份：文件缺失 / 坏 JSON / owner 非法形态 → null（按无 owner 放行处理） */
export function readQuickSessionOwner(runtimeRoot, sessionId) {
  if (!runtimeRoot || !sessionId) return null
  try {
    const doc = JSON.parse(readFileSync(quickSessionOwnerPath(runtimeRoot, sessionId), 'utf8'))
    if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) return null
    const owner = typeof doc.owner === 'string' ? doc.owner.trim() : ''
    return owner ? owner : null
  } catch {
    return null
  }
}

/** 创建时落 owner（fail-open：调用方吞异常，落盘失败不阻断启动，核验侧缺失即放行） */
export function writeQuickSessionOwner(runtimeRoot, sessionId, owner) {
  if (!runtimeRoot || !sessionId || !owner || !owner.trim()) return false
  const p = quickSessionOwnerPath(runtimeRoot, sessionId)
  mkdirSync(dirname(p), { recursive: true })
  writeAtomicSync(p, JSON.stringify({ owner: owner.trim(), at: new Date().toISOString() }, null, 2))
  return true
}

/**
 * 归属核验（纯判定，exit 语义归调用方）：
 *   owner 文件缺失（存量会话/落盘失败）→ { ok: true, legacy: true } 放行；
 *   owner === actor → { ok: true }；
 *   owner !== actor → { ok: false, owner, actor }（调用方 exit 2 + 接管指引）；
 *   入参不全（无法判定）→ { ok: true } 放行（fail-open，Q7 守卫同立场——宁可少拦不误伤单用户流）。
 */
export function checkQuickSessionOwner(runtimeRoot, sessionId, actor) {
  if (!runtimeRoot || !sessionId || !actor) return { ok: true }
  const owner = readQuickSessionOwner(runtimeRoot, sessionId)
  if (owner == null) return { ok: true, legacy: true }
  if (owner === actor) return { ok: true }
  return { ok: false, owner, actor }
}
