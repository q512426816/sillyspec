// 流程命令卡注入器（2026-09-21-flow-command-cards）——init 按 --tools 把包内
// assets/command-cards/*.md 落到工具命令目录（zcode/claude），尾部锚行三态幂等。
// 基准（Grill P1-3 修订）：锚行记录「剥离锚行后的落盘正文 sha」，重跑剥离重算比对
// ——检测的是用户手改正文；「锚行 vs 包资产」字面比对检测不到正文手改（已否决）。
import { readdirSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { writeAtomicSync } from './fs-atomic.js'

export const COMMAND_CARD_TARGETS = { zcode: '.zcode/commands/sillyspec', claude: '.claude/commands/sillyspec' }
export const COMMAND_CARD_NAMES = ['run-brainstorm', 'run-plan', 'run-execute', 'run-verify', 'run-archive', 'run-quick', 'status']

const ANCHOR_TAIL_RE = /\n?<!-- sillyspec-card: v(\S+) sha256=([0-9a-f]{64}) -->\s*$/
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex')
// 尾换行对称归一（首版 bug 实证：锚行正则 \n? 吞掉正文末换行，重算侧 replace(/\s+$/,'\n')
// 对无尾随空白的串是 no-op 换行补不回 → 完好文件恒判「手改」。先全剥尾随空白再统一补单个 \n，
// 两侧（资产读取/落盘重解析）同函数 → 对称。
const canonical = (raw) => raw.replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n'

/** 读包内卡资产（import.meta.url 相对——npm 全局安装/本地 checkout 双形态同源）。 */
export function readCardAssets() {
  const dir = fileURLToPath(new URL('../assets/command-cards/', import.meta.url))
  const assets = new Map()
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    assets.set(f.replace(/\.md$/, ''), canonical(readFileSync(join(dir, f), 'utf8')))
  }
  return assets
}

/**
 * 三态四分支注入（判据源唯一=尾部锚行；frontmatter 不承载管理面）：
 *  1 目标不存在 → 写（正文+锚行）
 *  2 锚行在且剥离重算正文 sha 一致（完好）：与包资产一致 → no-op（mtime 不动）；不一致（CLI 更新）→ 覆盖
 *  3 锚行缺失（外来同名文件）或重算 sha 不符（用户手改正文）→ warn 跳过，force 才覆盖
 * @returns {Promise<{written:string[], updated:string[], skipped:string[], warnings:string[]}>}（元素为相对目标目录的卡名）
 */
export async function injectCommandCards(projectDir, { tools = [], force = false, version = '' } = {}) {
  const written = [], updated = [], skipped = [], warnings = []
  const assets = readCardAssets()
  if (assets.size === 0) {
    warnings.push('包内 assets/command-cards/ 为空——npm 发布是否漏 assets/（白屏防线：npm pack --dry-run | grep assets/command-cards）')
    return { written, updated, skipped, warnings }
  }
  for (const name of COMMAND_CARD_NAMES) {
    if (!assets.has(name)) warnings.push(`资产缺失：${name}.md 不在包内 assets/command-cards/`)
  }
  for (const tool of [...new Set(tools)].filter((t) => COMMAND_CARD_TARGETS[t])) {
    const dir = join(projectDir, COMMAND_CARD_TARGETS[tool])
    mkdirSync(dir, { recursive: true })
    for (const [name, body] of assets) {
      const file = join(dir, `${name}.md`)
      const out = `${body}<!-- sillyspec-card: v${version} sha256=${sha256(body)} -->\n`
      let landed = null
      try { landed = readFileSync(file, 'utf8') } catch { /* 不存在走分支 1 */ }
      if (landed === null) { writeAtomicSync(file, out); written.push(name); continue }
      const m = landed.match(ANCHOR_TAIL_RE)
      if (!m) {
        if (force) { writeAtomicSync(file, out); updated.push(name); warnings.push(`${tool}/${name}：外来同名文件被 --force 覆盖`) }
        else { skipped.push(name); warnings.push(`${tool}/${name}：无锚行（外来同名文件），跳过——确认后删它重跑 init 或 --force`) }
        continue
      }
      const bodyNow = canonical(landed.slice(0, m.index))
      if (sha256(bodyNow) === m[2]) {
        if (bodyNow === body) { skipped.push(name); continue } // 完好且同资产：no-op（mtime 不动）
        writeAtomicSync(file, out); updated.push(name); continue // 完好且新资产：版本更新
      }
      if (force) { writeAtomicSync(file, out); updated.push(name); warnings.push(`${tool}/${name}：手改正文被 --force 覆盖（原改动已丢）`) }
      else { skipped.push(name); warnings.push(`${tool}/${name}：正文与锚行记录不符（用户手改），跳过——保留改动；--force 可覆盖`) }
    }
  }
  return { written, updated, skipped, warnings }
}
