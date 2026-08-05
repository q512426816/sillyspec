/**
 * cmd-existence.js — 共享命令存在性校验 helper（H2）
 *
 * 抽自 scan-postcheck.js:118-158 的 `npm run <script>` 存在性判定，扩展到 pnpm/yarn，
 * 并感知 monorepo 子目录（`cd <subdir> &&` 前缀 或 local.yaml `modules` 块定位）。
 *
 * 严重度由调用方决定（D-04 同 helper 双严重度）：
 *   - scan-postcheck 调用时维持 warning（local.yaml 命令误报不阻断 init）
 *   - plan-postcheck 调用时升 error（plan 阶段命令更结构化可硬阻断）
 *
 * 仅校验 `npm|pnpm|yarn run <script>` 这一类可静态对账的命令；
 * install / typecheck / npx / uv run 等直接包管理器调用不在范围（沿用 scan-postcheck:126-129 注释立场）。
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

// 提取 `npm|pnpm|yarn run <script>` 命令。
// 对齐 scan-postcheck:136 的 `/npm run (\S+)/g`，扩展包管理器 + 容忍多空白。
// 捕获组 1 = 包管理器（npm|pnpm|yarn），捕获组 2 = script 名。
const SCRIPT_CMD_RE = /(npm|pnpm|yarn)\s+run\s+(\S+)/g

// 识别紧贴命令前的 `cd <subdir> &&` 前缀（anchored at end of the slice before the command）。
// subdir token 不含空白与 & ; | 等分隔符；末尾的 `&&` 可带任意空白后接命令。
const CD_PREFIX_RE = /cd\s+([^\s&;|()]+)\s*&&\s*$/

/**
 * 读取 package.json 的 scripts 字段。
 * @param {string} pkgPath
 * @returns {{ status: 'ok'|'missing'|'unreadable'|'no-scripts', scripts: object|null }}
 *   - ok          : 文件存在且 JSON 解析成功，含 scripts 对象
 *   - missing     : 文件不存在
 *   - unreadable  : 文件存在但 JSON 解析失败（与 scan-postcheck:147 try/catch 一致，不抛）
 *   - no-scripts  : 解析成功但无 scripts 字段（视作 script 不存在）
 */
function readScripts(pkgPath) {
  if (!existsSync(pkgPath)) return { status: 'missing', scripts: null }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (pkg && typeof pkg === 'object' && pkg.scripts && typeof pkg.scripts === 'object') {
      return { status: 'ok', scripts: pkg.scripts }
    }
    return { status: 'no-scripts', scripts: null }
  } catch {
    return { status: 'unreadable', scripts: null }
  }
}

/**
 * 为单条命令计算候选 package.json 路径列表。
 *
 * 规则（blueprint task-02 + design §5 H2）：
 *   - 有 `cd <subdir> &&` 前缀 → 仅查 `<projectRoot>/<subdir>/package.json`（cd 锁定子目录，不回退根）
 *   - 无前缀 + modules 块提供 → 查每个 module.path 的子包 + 根 package.json（多候选任一命中即视为存在）
 *   - 无前缀 + 无 modules → 仅查 `<projectRoot>/package.json`
 *
 * @param {string} text 全文
 * @param {number} matchIndex 当前命令在 text 中的起始位置
 * @param {string} projectRoot
 * @param {object|null|undefined} modules local.yaml modules 块（{ name: { path, test } }）
 * @returns {string[]} 候选 package.json 绝对路径列表（至少 1 个）
 */
function resolveCandidates(text, matchIndex, projectRoot, modules) {
  const before = text.slice(0, matchIndex)
  const cdMatch = before.match(CD_PREFIX_RE)
  if (cdMatch) {
    const subdir = cdMatch[1].replace(/^["']|["']$/g, '')
    return [join(projectRoot, subdir, 'package.json')]
  }
  if (modules && typeof modules === 'object') {
    const candidates = []
    for (const [, mod] of Object.entries(modules)) {
      if (mod && typeof mod === 'object' && typeof mod.path === 'string' && mod.path.trim() !== '') {
        candidates.push(join(projectRoot, mod.path, 'package.json'))
      }
    }
    candidates.push(join(projectRoot, 'package.json'))
    return candidates
  }
  return [join(projectRoot, 'package.json')]
}

/**
 * 校验文本中所有 `npm|pnpm|yarn run <script>` 命令在 package.json scripts 中存在（monorepo 感知）。
 *
 * @param {string} text 待校验文本（local.yaml 内容 / TaskCard verify+implementation 字段等）
 * @param {{ projectRoot: string, modules?: object|null }} opts
 *   - projectRoot : 项目根目录绝对路径
 *   - modules     : local.yaml modules 块（可选），结构如 `{ frontend: { path: "frontend/", test: "..." } }`
 * @returns {{ invalid: Array<{ cmd: string, reason: string }>, checked: number }}
 *   - invalid : 找不到 script 的命令列表，每项含 { cmd, reason }；reason 区分
 *               「package.json 不存在」「package.json 解析失败」「package.json 无 <script> script」
 *   - checked : 从 text 提取到的命令总数（含合法与非法）
 */
export function validateScriptCommands(text, { projectRoot, modules } = {}) {
  const invalid = []
  if (!text || typeof text !== 'string') {
    return { invalid, checked: 0 }
  }

  const matches = [...text.matchAll(SCRIPT_CMD_RE)]
  const checked = matches.length

  for (const m of matches) {
    const pm = m[1]
    const scriptName = m[2]
    const cmd = `${pm} run ${scriptName}`

    const candidates = resolveCandidates(text, m.index ?? 0, projectRoot, modules)

    let found = false
    let existedAny = false // 至少一个候选文件存在且可解析（ok 或 no-scripts）
    let parseFailedAny = false // 至少一个候选文件解析失败（unreadable）
    for (const pkgPath of candidates) {
      const result = readScripts(pkgPath)
      if (result.status === 'ok') {
        existedAny = true
        if (Object.prototype.hasOwnProperty.call(result.scripts, scriptName)) {
          found = true
          break
        }
      } else if (result.status === 'no-scripts') {
        existedAny = true
        // scripts 字段缺失 → 该候选肯定不含此 script，继续看其他候选
      } else if (result.status === 'unreadable') {
        parseFailedAny = true
      }
      // missing → 既不算 existed 也不算 parseFailed
    }

    if (!found) {
      let reason
      if (!existedAny && parseFailedAny) {
        reason = `package.json 解析失败: ${candidates.join(', ')}`
      } else if (!existedAny) {
        reason = `package.json 不存在: ${candidates.join(', ')}`
      } else {
        reason = `package.json 无 ${scriptName} script`
      }
      invalid.push({ cmd, reason })
    }
  }

  return { invalid, checked }
}
