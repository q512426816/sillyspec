/**
 * 他者会话显式声明文件集（坑 verify-reconcile-foreign-wip，2026-08-23 实证：verify 实测
 * 对账在主仓共享工作区取 git diff，无 meta 回退时把并行会话在途 WIP 全量算进本变更——误
 * 命中他者模块跑他者测试 / 他者删除进本变更删除对账误报）。
 *
 * 归属口径与坑 35（quick 审计豁免，run/shared 的 collectOtherQuickSessionDeclarations）
 * 同款：只认**显式声明**——其他 quick 会话 guard.allowedFiles + 其他变更 design §6 清单；
 * 无主文件保留参与判定（fail-closed，不放松「未声明删除/越界」的抓取底线）。
 *
 * 独立零环模块：被 verify-postcheck / verify-probes / contract-matrix 共用（verify-
 * postcheck import contract-matrix，parity 侧不能反向 import verify-postcheck）。
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseFileChangeListDetailed } from './change-list.js'

/**
 * @param {string} cwd 项目根
 * @param {string|null} currentChangeName 本变更名（quick 会话名或 change 名，排除自身）
 * @returns {Map<string, string[]>} file → 声明者列表（quick-<hex> 或变更名）
 */
export function collectForeignDeclaredFiles(cwd, currentChangeName) {
  const foreign = new Map()
  const add = (file, owner) => {
    const f = String(file || '').replace(/\\/g, '/')
    if (!f) return
    if (!foreign.has(f)) foreign.set(f, [])
    if (!foreign.get(f).includes(owner)) foreign.get(f).push(owner)
  }
  try {
    const specBase = join(cwd, '.sillyspec')
    // ① 其他 quick 会话的 --files 显式声明（guard.json）
    const sessionsDir = join(specBase, '.runtime', 'quick-sessions')
    let sessionDirs = []
    try { sessionDirs = readdirSync(sessionsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) } catch {}
    for (const sid of sessionDirs) {
      if (sid === currentChangeName) continue
      try {
        const guard = JSON.parse(readFileSync(join(sessionsDir, sid, 'guard.json'), 'utf8'))
        for (const f of Array.isArray(guard.allowedFiles) ? guard.allowedFiles : []) add(f, sid)
      } catch { /* 损坏/缺失跳过 */ }
    }
    // ② 其他变更的 design §6 清单（目录在即视为在途变更；archive/ 下不算）
    const changesDir = join(specBase, 'changes')
    let changeDirs = []
    try { changeDirs = readdirSync(changesDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) } catch {}
    for (const cn of changeDirs) {
      if (cn === currentChangeName || cn === 'archive') continue
      const designPath = join(changesDir, cn, 'design.md')
      if (!existsSync(designPath)) continue
      try {
        for (const e of parseFileChangeListDetailed(designPath)) add(e.path, cn)
      } catch { /* 清单解析失败跳过该变更 */ }
    }
  } catch { /* 整体异常 → 空集（等价不过滤，回到原行为） */ }
  return foreign
}

/**
 * 按他者声明集切分 diff 文件（collectForeignDeclaredFiles 的消费端快捷封装）。
 * @param {string} cwd 项目根
 * @param {string|null} currentChangeName 本变更名
 * @param {string[]|null} diffFiles 待切分文件列表（null 透传，保持调用方 null 语义）
 * @returns {{ own: string[]|null, foreign: Array<{file: string, owners: string[]}> }}
 */
export function splitOwnVsForeignDiffFiles(cwd, currentChangeName, diffFiles) {
  if (!Array.isArray(diffFiles)) return { own: diffFiles, foreign: [] }
  const foreignMap = collectForeignDeclaredFiles(cwd, currentChangeName)
  if (foreignMap.size === 0) return { own: diffFiles, foreign: [] }
  const own = []
  const foreign = []
  for (const f of diffFiles) {
    const owners = foreignMap.get(String(f).replace(/\\/g, '/'))
    if (owners) foreign.push({ file: f, owners })
    else own.push(f)
  }
  return { own, foreign }
}
