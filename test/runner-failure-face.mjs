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
 * 匹配双形态（评审 P2 清偿：清单落盘是 relative(testDir) 形态——子目录测试是 `dispatch/x.test.mjs`
 * （Windows 下 backslash），单按 basename 匹配会把实存子目录测试误判 dropped）：
 * 清单项分隔符归一后，等于文件的相对路径（relOf 可注入，runner 传 relative(testDir) 形态）或 basename 即命中。
 * face=要跑的路径列表（按当前 files 顺序）；dropped=清单中未命中任何文件的名字（调用方 warn）。
 */
export function filterToFailedFace(files, failedNames, relOf = null) {
  const wanted = new Set((failedNames || []).map((n) => String(n).replace(/\\/g, '/')))
  const face = []
  const dropped = []
  const hit = new Set()
  for (const f of files) {
    const basename = f.split(/[\\/]/).pop()
    const rel = relOf ? String(relOf(f)).replace(/\\/g, '/') : null
    if (wanted.has(basename)) {
      face.push(f)
      hit.add(basename)
    } else if (rel && wanted.has(rel)) {
      face.push(f)
      hit.add(rel)
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
