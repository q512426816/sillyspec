/**
 * commit-guard.js — pre-commit 提交边界守卫（fail-open，只警告不阻断）。
 *
 * 为什么需要（2026-09-17 实证）：多会话共享仓里 git 暂存区是共享状态——他会话 git add 过的
 * 文件会被本会话的裸 git commit 一并带走（当日事故：add 带 pathspec 但 commit 裸跑，并行
 * 会话 5 个 staged 文件被扫入 fb5bc11，事后 reset --soft + pathspec 重提交外科手术拆回）。
 * AGENTS.md 第 18 条已加厚为「add/commit 同清单 pathspec」，本守卫是同一约束的工具化兜底：
 * 纪理会漏，钩子卡点不会漏（与 write-audit / concurrent-detect 同族——确定性的事 CLI 兜）。
 *
 * 信号（只警告，exit 恒 0）：
 *   S1 quick 声明面对账：staged 含 .sillyspec/quicklog/patches/ql-<id>.json 时，读其
 *      rows[].declared 声明面——staged 中超出声明面的文件（quicklog 账本/补丁自身除外）
 *      即警告「疑似扫入他者文件」。
 *   S2 跨变更目录：staged 里 .sillyspec/changes/<name>/（含 archive/）命中 ≥2 个不同
 *      name → 警告「正常提交只携带一个变更的面」。
 * 命中即 stderr 警告 + appendWriteAudit 留痕（via: 'commit-guard'）。
 *
 * fail-open 硬约束（钩子挂在所有会话共享的 .husky/ 上，守卫自身绝不拦任何人的提交）：
 *   非 git 仓 / git 失败 / ql json 损坏 / 任何异常 → 静默 exit 0；钩子侧再垫 || true 双保险。
 */
import { execFileSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { appendWriteAudit } from './write-audit.js'

const QUICKLOG_PREFIX = '.sillyspec/quicklog/'
const QL_PATCH_JSON_RE = /^\.sillyspec\/quicklog\/patches\/ql-[^/]+\.json$/
const CHANGES_RE = /^\.sillyspec\/changes\/(?:archive\/)?([^/]+)\//

/**
 * S1+S2 纯函数：staged 面 + ql patch json 映射 → 警告数组（无 git/文件系统依赖，可直测）。
 * @param {string[]} stagedFiles staged 相对路径
 * @param {Record<string, any>} qlPatches { json路径 → 解析结果 }（损坏的已由调用方跳过）
 * @returns {{signal: string, files: string[], message: string}[]}
 */
export function analyzeStagedFace(stagedFiles, qlPatches) {
  const staged = Array.isArray(stagedFiles) ? stagedFiles.filter((f) => typeof f === 'string' && f) : []
  const warnings = []
  // S1 quick 声明面对账
  const qlJsons = staged.filter((f) => QL_PATCH_JSON_RE.test(f))
  if (qlJsons.length > 0) {
    const declared = new Set()
    for (const j of qlJsons) {
      const parsed = (qlPatches || {})[j]
      if (!parsed || !Array.isArray(parsed.rows)) continue
      for (const r of parsed.rows) {
        if (r && r.declared && typeof r.path === 'string') declared.add(r.path)
      }
    }
    if (declared.size > 0) {
      const offending = staged.filter((f) => !f.startsWith(QUICKLOG_PREFIX) && !declared.has(f))
      if (offending.length > 0) {
        warnings.push({
          signal: 'quick_declared_face_exceeded',
          files: offending,
          message: `staged 超出 quick 声明面（${qlJsons.map((f) => f.split('/').pop()).join(', ')}）：${offending.join('、')}——疑似扫入他者文件，核对是否该随本提交带走`,
        })
      }
    }
  }
  // S2 跨变更目录
  const changeNames = new Set()
  for (const f of staged) {
    const m = f.match(CHANGES_RE)
    if (m) changeNames.add(m[1])
  }
  if (changeNames.size >= 2) {
    warnings.push({
      signal: 'multi_change_dirs_staged',
      files: staged.filter((f) => CHANGES_RE.test(f)),
      message: `staged 同时含 ${changeNames.size} 个变更目录（${[...changeNames].join('、')}）——正常提交只携带一个变更的面，疑似夹带并行会话产物`,
    })
  }
  return warnings
}

function main() {
  const cwd = process.cwd()
  let staged = []
  try {
    staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd,
      encoding: 'utf8',
      // stderr 必须管道化：execFileSync 默认把子进程 stderr 透传给父进程——非 git 目录下
      // git 落 --no-index 模式报 unknown option 的 usage 长文会漏进守卫 stderr（噪声）。
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return 0 // 非 git 仓 / git 异常 → 放行
  }
  if (staged.length === 0) return 0
  const qlPatches = {}
  for (const f of staged) {
    if (!QL_PATCH_JSON_RE.test(f)) continue
    try {
      qlPatches[f] = JSON.parse(readFileSync(join(cwd, f), 'utf8'))
    } catch { /* 单个 json 损坏 → 跳过该信号源，不连坐 */ }
  }
  const warnings = analyzeStagedFace(staged, qlPatches)
  if (warnings.length === 0) return 0
  for (const w of warnings) process.stderr.write(`⚠️ [commit-guard] ${w.message}\n`)
  const specDir = join(cwd, '.sillyspec')
  if (existsSync(specDir)) {
    appendWriteAudit(specDir, {
      via: 'commit-guard',
      files: [...new Set(warnings.flatMap((w) => w.files))].slice(0, 20),
      detail: { signals: warnings.map((w) => ({ signal: w.signal, files: w.files.slice(0, 20) })) },
    })
  }
  return 0
}

// 直接执行（node src/commit-guard.js）才跑 main；被 import 时不跑
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) process.exit(main())
