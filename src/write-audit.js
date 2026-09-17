/**
 * write-audit.js — 批量写入方留痕（2026-09-17 用户驾驭小结⑥②法证收口，ql 20260917-006）。
 *
 * 背景：平台内容回放（platform resolve --take-platform / pull --spec）与 worktree apply 都是
 * 「单命令内批量整文件重写、逐字节保留来源行尾」——sillyspec 自产文件一律 LF，而回放路径会把
 * 他机编辑器写出的 CRLF 内容原样落盘。事后定位只能靠 mtime 考古（2026-09-17 实证：3 文件毫秒
 * 级同 mtime + CRLF + 内容增量，「平台同步回写」被冤枉一整天后才还原真凶候选）。本模块在每个
 * 批量写入口追加一条 JSONL 审计行（.sillyspec/.runtime/write-audit.jsonl）：时间 / 触发命令 /
 * 文件集 / CRLF 命中——下次「18:09 谁动了 design.md」查一行即中。
 *
 * 约束：fail-open（任何异常只丢审计不改写入行为）；零依赖；单行 appendFileSync（并行会话
 * 各自整行写入，Windows 下最坏交错按行丢失计，不损主行为）。
 */
import { appendFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

const CRLF_BUF = Buffer.from('\r\n')

/**
 * 追加一条批量写入审计记录。
 * @param {string} specDir .sillyspec 根（审计落 .runtime/write-audit.jsonl）
 * @param {{ via: string, change?: string, files?: string[], crlfPaths?: string[], detail?: object }} record
 *   via=触发命令锚（'platform-resolve-take-platform' | 'pull-spec-bundle' | 'worktree-apply'）
 * @returns {boolean} 是否落盘成功（fail-open：false 只损失审计）
 */
export function appendWriteAudit(specDir, record) {
  try {
    const p = join(specDir, '.runtime', 'write-audit.jsonl')
    mkdirSync(dirname(p), { recursive: true })
    appendFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8')
    return true
  } catch { return false }
}

/**
 * CRLF 命中探测（法证关键字段：本仓 sillyspec 自产文件一律 LF——落盘后呈 CRLF 的文件
 * 几乎必来自「他机内容逐字节回放」或仓外工具写入）。
 * @param {Array<[string, Buffer|string]>} entries [path, 写入内容] 对
 * @returns {string[]} 含 \r\n 的路径（探测失败的条目不连坐）
 */
export function detectCrlfFiles(entries) {
  const out = []
  for (const pair of Array.isArray(entries) ? entries : []) {
    if (!Array.isArray(pair)) continue
    const [path, data] = pair
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data))
      if (buf.includes(CRLF_BUF)) out.push(path)
    } catch { /* 单条探测失败跳过 */ }
  }
  return out
}

/** 文件清单截断帽（防大树/大面把审计行撑爆；截断时附 +N 标记由调用方自理） */
export const WRITE_AUDIT_FILE_CAP = 20
