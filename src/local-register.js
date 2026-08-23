/**
 * local-register.js — `sillyspec local register-repo <key> <path>` 的 repos: 段外科手术式写入。
 *
 * 背景（2026-08-21 agent-手工产出审计项④）：跨仓 change 的 repo key 必须在 local.yaml
 * `repos:` 段注册（MultiRepoContext 约束② fail-closed），此前靠 agent 手编 YAML——正是
 * agent 满目录找/在根目录乱建 local.yaml 的上游。本模块只动 `repos:` 段：已有该 key 就地
 * 改值，没有就插入段内；其余内容（注释/凭据段/手调配置）逐行原样保留，绝不整文件重序列化。
 *
 * 写入口径与 parseRepoRegistry（plan-postcheck.js，读侧）成对：
 *   repos:
 *     sillyspec: C:/Users/you/IdeaProjects/sillyspec
 *     # main 不用注册（隐式 = cwd）
 *
 * 文件不存在时新建只含 repos: 段的 minimal local.yaml（真实 local.yaml 其余段由
 * `sillyspec local detect` / `platform connect` 各自补齐）。落盘走 writeAtomicSync
 * （tmp+rename，防多会话并发写半截，与 local detect 写入口径一致）。
 */
import { existsSync, readFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { writeAtomicSync } from './fs-atomic.js'

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 把 `<key>: <path>` 注册进 local.yaml 的 repos: 段（幂等，已有该 key 则改值）。
 *
 * @param {string} yamlPath - local.yaml 绝对路径（不存在则新建）
 * @param {string} key - repo key（限 [A-Za-z0-9_.\-]+，'main' 隐式禁止注册）
 * @param {string} repoPath - 跨仓仓根绝对路径（写入时统一正斜杠，与示例格式一致）
 * @returns {{ fileCreated: boolean, sectionCreated: boolean, replaced: boolean }}
 * @throws {Error} key 非法 / key='main' / repoPath 空 / 读写失败
 */
export function registerRepoInLocalYaml(yamlPath, key, repoPath) {
  if (!yamlPath) throw new Error('registerRepoInLocalYaml: yamlPath 不能为空')
  if (!key || !/^[A-Za-z0-9_.\-]+$/.test(key)) {
    throw new Error(`repo key 非法: "${key}"（限字母数字 . _ -，与 parseRepoRegistry 读侧口径一致）`)
  }
  if (key === 'main') {
    throw new Error("repo key 'main' 不用注册（隐式 = 主仓 cwd），跨仓仓才需要 register-repo")
  }
  if (!repoPath) throw new Error('registerRepoInLocalYaml: repoPath 不能为空')

  const existed = existsSync(yamlPath)
  // CRLF 归一后按 LF 写回（同 task 卡锚点写入的 CRLF 坑；local.yaml 各 CLI 写入口径均 LF）
  const raw0 = existed ? readFileSync(yamlPath, 'utf8') : ''
  const hadCr = raw0.includes('\r') // 磁盘原文带 CRLF → 幂等路径也要落盘治愈（见下方幂等分支）
  const raw = existed ? raw0.replace(/\r\n?/g, '\n') : ''
  const posixPath = String(repoPath).replace(/\\/g, '/')
  const entryLine = `  ${key}: ${posixPath}`

  const write = (text) => {
    mkdirSync(dirname(yamlPath), { recursive: true })
    writeAtomicSync(yamlPath, text)
  }

  const lines = raw.split('\n')
  // repos: 段起点（顶层 key 行，与 parseRepoRegistry 同口径）
  let reposIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^repos:\s*(?:#.*)?$/.test(lines[i])) { reposIdx = i; break }
  }

  if (reposIdx === -1) {
    // 无 repos: 段 → 文件尾追加（保留既有内容与注释；空文件/新文件直接起段）
    const sep = raw.trim() === '' ? '' : (raw.endsWith('\n') ? '' : '\n') + '\n'
    write(raw + sep + `repos:\n${entryLine}\n`)
    return { fileCreated: !existed, sectionCreated: true, replaced: false }
  }

  // 段范围：reposIdx+1 起到下一个顶层 key（行首非空白非注释）为止（与 parseRepoRegistry 同口径）
  let end = lines.length
  for (let i = reposIdx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.length > 0 && !/^[\s#]/.test(l) && l.trim() !== '') { end = i; break }
  }

  // 已有该 key → 就地改值（幂等）
  const keyRe = new RegExp(`^\\s+${escapeRe(key)}:\\s`)
  for (let i = reposIdx + 1; i < end; i++) {
    if (keyRe.test(lines[i])) {
      if (lines[i] === entryLine) {
        // 坑 register-repo-crlf-idempotent-loop：磁盘原文带 CRLF 时（agent Write 工具/Windows
        // 编辑器写入），内存归一后比对相等直接跳过 → 磁盘永不治愈 + CLI 报 ✅ 假成功 → 解析侧
        // （修复前）空 Map → MultiRepoContext 报「未注册」→ 死循环。幂等路径也落盘一次治愈。
        if (hadCr) write(lines.join('\n'))
        return { fileCreated: false, sectionCreated: false, replaced: false } // 值未变，幂等跳过
      }
      lines[i] = entryLine
      write(lines.join('\n'))
      return { fileCreated: false, sectionCreated: false, replaced: true }
    }
  }

  // 无该 key → 插到段内最后一个非空行（条目或段内注释）之后
  let insertAt = reposIdx + 1
  for (let i = reposIdx + 1; i < end; i++) {
    if (lines[i].trim() !== '') insertAt = i + 1
  }
  lines.splice(insertAt, 0, entryLine)
  write(lines.join('\n'))
  return { fileCreated: false, sectionCreated: false, replaced: false }
}
