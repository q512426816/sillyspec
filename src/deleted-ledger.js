/**
 * 删除台账（deleted-changes.jsonl）——终态转换的追加式账本。
 *
 * 背景（2026-10-13-new-change-e5a27813 幽灵变更事故，multi-agent-platform 仓实证）：
 * X1 墓碑链（sync.js 对 DB status='deleted'/'archived' 行追加墓碑 POST）依赖 DB 行存活；
 * DB 行被外部手段物理清除后（rm + 裸 SQL，任何 sillyspec 官方路径都不物理删行），后续
 * platform sync --change 一律「变更无进度数据」空转，平台行永挂 in_progress/active。
 * 台账让「存在过且已达终态」这一事实脱离 DB 行存活而可查：deleteChange/unregisterChange
 * 在事务提交后追加一行；sync() 的行缺失分支据此合成墓碑补推（见 sync.js 台账分支）。
 *
 * 形态契约：`.sillyspec/.runtime/deleted-changes.jsonl`，每行一个 JSON 对象
 * { name, status: 'deleted'|'archived', at: ISO }；追加-only（读取侧 latest-wins），
 * 不旋转不清空——每行百余字节、终态转换频度=归档/删除频度，增长可忽略。
 * 坏行容错：单行 JSON 解析失败跳过该行（外部编辑/半写截断不拖垮读取）。
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { runtimeStatePath } from './runtime-paths.js'
import { join } from 'node:path'

const LEDGER_FILENAME = 'deleted-changes.jsonl'

function ledgerPath(specDir) {
  return runtimeStatePath(join(specDir, '.runtime'), LEDGER_FILENAME)
}

/**
 * 追加一条终态台账。fail-open：任何写入失败只 warn 不抛——台账是 DB 行存活时的
 * 冗余信息（X1 链已闭环），它的缺失最多让「行被外部清除」这一非官方场景退回平台
 * 7 天 reparse 兜底，不值得阻断删除/归档主流程。
 * @param {string} specDir 已解析的 .sillyspec 根（与 sillyspec.db 同根）
 * @param {string} changeName 变更名
 * @param {'deleted'|'archived'} status 终态
 * @param {string} [at] ISO 时间戳（缺省当前时间）
 */
export function appendDeletedLedger(specDir, changeName, status, at = new Date().toISOString()) {
  if (!specDir || !changeName || (status !== 'deleted' && status !== 'archived')) {
    console.warn(`⚠️  appendDeletedLedger: 参数不完整（name=${changeName} status=${status}），跳过台账追加`)
    return
  }
  try {
    appendFileSync(ledgerPath(specDir), JSON.stringify({ name: changeName, status, at }) + '\n', 'utf8')
  } catch (err) {
    console.warn(`⚠️  删除台账追加失败（fail-open 不阻断主流程）: ${changeName}: ${(err && err.message) || err}`)
  }
}

/**
 * 查询变更的最新终态台账条目（同名多条取最后一条——latest-wins）。
 * 容错：文件不存在 → null；坏行跳过不抛。
 * @param {string} specDir 已解析的 .sillyspec 根
 * @param {string} changeName 变更名
 * @returns {{name: string, status: string, at: string} | null}
 */
export function lookupDeletedLedger(specDir, changeName) {
  if (!specDir || !changeName) return null
  const p = ledgerPath(specDir)
  if (!existsSync(p)) return null
  let text
  try {
    text = readFileSync(p, 'utf8')
  } catch {
    return null // 读失败按无台账处理（消费侧退回普通「无进度数据」路径）
  }
  let hit = null
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const obj = JSON.parse(trimmed)
      if (obj && obj.name === changeName && (obj.status === 'deleted' || obj.status === 'archived')) {
        hit = { name: obj.name, status: obj.status, at: obj.at }
      }
    } catch { /* 坏行跳过：半写截断/外部编辑不拖垮整本台账 */ }
  }
  return hit
}
