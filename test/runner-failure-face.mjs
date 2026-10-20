/**
 * runner-failure-face.mjs — 失败面清单纯函数（2026-10-20-scoped-verify-policy）
 *
 * run-tests.mjs 的 --failed 复跑与失败清单落盘逻辑提纯：全量失败后定位/修复不需要整体重跑
 * （实测 3.5-5 分钟/轮），清单落 gitignored runtime、全绿自清；路径可经 env
 * SILLYSPEC_TEST_FAILURE_LIST 覆写（并行双套件/测试场景分家，与套件 TEMP 隔离同哲学）。
 * 纯函数无 IO 副作用（persistFailureList 仅收 path 由调用方决定写入时机）。
 */
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/** 清单文本 → 失败文件名数组（trim/去空行/去重保序）。 */
export function parseFailureList(text) {
  const out = []
  const seen = new Set()
  for (const line of String(text || '').split(/\r?\n/)) {
    const name = line.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * 当前文件集 ∩ 清单 → { face, dropped }
 * face=要跑的绝对路径列表（按当前 files 顺序）；dropped=清单中不在当前文件集的名字（改名/已删，调用方 warn）。
 */
export function filterToFailedFace(files, failedNames) {
  const wanted = new Set(failedNames)
  const face = []
  const dropped = []
  const hit = new Set()
  for (const f of files) {
    const name = f.split(/[\\/]/).pop()
    if (wanted.has(name)) {
      face.push(f)
      hit.add(name)
    }
  }
  for (const n of wanted) if (!hit.has(n)) dropped.push(n)
  return { face, dropped }
}

/** 落盘失败清单（failures 为空数组/全绿 → 删除清单文件）。fail-soft：写失败 warn 不抛。 */
export function persistFailureList(listPath, failures) {
  try {
    if (!failures || failures.length === 0) {
      if (existsSync(listPath)) rmSync(listPath, { force: true })
      return { cleared: true }
    }
    mkdirSync(dirname(listPath), { recursive: true })
    writeFileSync(listPath, failures.join('\n') + '\n', 'utf8')
    return { cleared: false, count: failures.length }
  } catch (e) {
    console.warn(`[runner] ⚠️ 失败清单落盘失败（不阻断套件）：${e && e.message}`)
    return { cleared: false, error: String(e) }
  }
}

/** 读清单（env 覆写路径由调用方解析后传入）；缺席返回 null（=全量照常）。 */
export function readFailureList(listPath) {
  try {
    if (!existsSync(listPath)) return null
    const text = readFileSync(listPath, 'utf8')
    const names = parseFailureList(text)
    return names.length > 0 ? names : null
  } catch {
    return null
  }
}
