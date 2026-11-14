/**
 * scan-codegraph — CodeGraph CLI 统一封装层（change: 2026-11-14-scan-incremental / task-01）。
 *
 * 定位：增量 scan（scan-incremental.js / run 层探测）对 codegraph 子进程调用的唯一入口——
 * 探测三态（fail-soft）、Windows .cmd shim 解析、输出形状防御式映射、分级超时、统一 env。
 * 设计依据：design.md Phase 1（2026-11-14 实测 codegraph 1.6.2 发布包输出形状）+
 *   D-002（探测失败绝不阻断 scan）+ daemon 参考实现（multi-agent-platform 仓
 *   sillyhub-daemon/src/codegraph/cli.ts 的超时分级/env 注入/形状映射思路，本层为
 *   零 daemon 依赖的 JS 轻量版；Windows .cmd 解析参考同仓 cmd-shim.ts 模式 1/2）。
 *
 * 边界（design 非目标）：不做索引状态机判定、不做 init/index/sync 维护编排；
 * 任何异常 → available:false / null，绝不抛出（调用方零 try-catch 包裹）。
 * 1.6.2 发布包无 --local-only / --no-telemetry 参数（已实测），全模块禁止携带。
 */
import { execFile as cpExecFile, execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { promisify } from 'node:util'

/** 统一注入环境（D-007 参考口径）：CODEGRAPH_DIR 是相对 root 的单段目录名（禁嵌套），以 cwd=root 执行使其落在 <root>/.sillyspec-codegraph */
export const CODEGRAPH_ENV = Object.freeze({
  CODEGRAPH_DIR: '.sillyspec-codegraph',
  CODEGRAPH_TELEMETRY: '0',
  DO_NOT_TRACK: '1',
})

/** 分级超时（ms，对齐 daemon 参考实现 CODEGRAPH_TIMEOUTS_MS 档位；本变更消费面只用 status/affected/files） */
export const CODEGRAPH_TIMEOUTS_MS = Object.freeze({
  version: 5_000,
  status: 5_000,
  query: 10_000,
  affected: 15_000,
  sync: 60_000,
})

/** affected 受影响测试清单硬上限：CLI 无 limit 参数，本层截断并置 truncated（防大仓输出失控） */
export const AFFECTED_TESTS_LIMIT = 200

/** 大仓 query/affected 输出可能远超 execFile 默认 1MB（daemon 参考 32MB 档） */
const MAX_BUFFER_BYTES = 32 * 1024 * 1024

// ── Windows 命令解析（cmd-shim 轻量版，参考 daemon cmd-shim.ts 模式 1/2）──────────
// 背景：npm 全局 bin 在 Windows 是 cmd-shim 生成的 .cmd 包装，execFile('codegraph') 无
// PATHEXT 解析必 ENOENT（Node>=18.20 CVE-2024-27980 拒无 shell 调 .cmd）。解析出真实
// node 入口后 execFile 参数数组执行，全程不经 shell。解析失败 fallback 裸名（让 ENOENT
// 自然冒给探测层判 available:false——fail-safe 方向正确）。

/** 模块级解析缓存：探测在整个 scan 生命周期只需解析一次 */
let resolvedCmdCache = null

/**
 * 解析 Windows .cmd 包装文件内容，返回真实可执行入口。
 * @param {string} cmdPath .cmd 文件绝对路径
 * @returns {{exe: string, prependArgs: string[]}|null} 非 Windows / 读失败 / 无匹配 → null
 */
export function parseCmdShim(cmdPath) {
  let content
  try {
    content = readFileSync(cmdPath, 'utf-8')
  } catch {
    return null
  }
  const dp0 = dirname(cmdPath)
  const expand = (s) => s.replace(/%dp0%/gi, dp0)
  // 模式 1（node + js，cmd-shim 标准）：`"%_prog%"  "...\codegraph.js" %*`
  const m1 = /"%_prog%"\s+"([^"]+)"\s+%\*/.exec(content)
    ?? /"([^"]+)"\s+"([^"]+)"\s+%\*/.exec(content)
  if (m1) {
    const target = expand(m1[1])
    const localNode = `${dp0}\\node.exe`
    const exe = existsSync(localNode) ? localNode : process.execPath
    return { exe, prependArgs: [target] }
  }
  // 模式 2（原生 exe）：`"%dp0%\...\codegraph.exe"   %*`
  const m2 = /"([^"]+)"\s+%\*/.exec(content)
  if (m2) {
    const exe = expand(m2[1])
    if (!/%[A-Za-z0-9_]+%/.test(exe)) return { exe, prependArgs: [] }
  }
  return null
}

/**
 * 跨平台命令解析（可注入测试 mock）。
 * @returns {{command: string, baseArgs: string[]}} exe 后固定的前置参数，用户参数追加其后
 */
export function resolveCodegraphCommand() {
  if (process.platform === 'win32') {
    if (!resolvedCmdCache) {
      let cmdPath = null
      try {
        // where 是系统 exe（非 .cmd），execFileSync 数组形式不经 shell；PATH 首个命中即 .cmd 包装
        const out = execFileSync('where', ['codegraph'], { encoding: 'utf-8', timeout: 3_000, windowsHide: true })
        cmdPath = out.split(/\r?\n/).map((l) => l.trim()).find((l) => l.toLowerCase().endsWith('.cmd')) || null
      } catch { /* where 失败 → fallback 裸名 */ }
      if (cmdPath) {
        const parsed = parseCmdShim(cmdPath)
        if (parsed) resolvedCmdCache = { command: parsed.exe, baseArgs: parsed.prependArgs }
      }
    }
    if (resolvedCmdCache) return resolvedCmdCache
  }
  return { command: 'codegraph', baseArgs: [] }
}

/** 测试专用：清空命令解析缓存 */
export function _resetCodegraphCommandCache() {
  resolvedCmdCache = null
}

// ── 底层执行（可注入）────────────────────────────────────────────────────────

/**
 * 执行一条 codegraph 命令（参数数组，env 注入，cwd=root，分级超时）。
 * @private
 * @param {{execFile?: Function, env?: object, timeouts?: object}} deps 可注入（测试 mock）
 */
async function runCodegraph(root, userArgs, timeoutMs, { execFile, env, timeouts } = {}) {
  const doExec = execFile || promisify(cpExecFile)
  const resolved = resolveCodegraphCommand()
  const mergedEnv = { ...(env === undefined ? process.env : env), ...CODEGRAPH_ENV }
  const t = timeouts || CODEGRAPH_TIMEOUTS_MS
  const { stdout } = await doExec(resolved.command, [...resolved.baseArgs, ...userArgs], {
    cwd: root,
    env: mergedEnv,
    timeout: t[timeoutKey(userArgs)] || timeoutMs,
    maxBuffer: MAX_BUFFER_BYTES,
    windowsHide: true,
  })
  return stdout
}

/** 按命令首 token 映射超时键（status→status、files→query 档、affected→affected） */
function timeoutKey(userArgs) {
  const first = String(userArgs[0] || '')
  if (first === 'status' || first === 'version') return first
  if (first === 'query' || first === 'files' || first === 'callers' || first === 'callees') return 'query'
  if (first === 'affected' || first === 'impact') return 'affected'
  if (first === 'sync') return 'sync'
  return null
}

/** 防御式 JSON 提取：输出混入 npm 噪声行（前缀警告/空行）时截取首个 { 或 [ 到末个 } 或 ] 的段落再解析；失败 → null（不 throw） */
function parseJsonLoose(stdout) {
  if (typeof stdout !== 'string' || !stdout) return null
  const objStart = stdout.indexOf('{')
  const arrStart = stdout.indexOf('[')
  let start = -1
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) start = objStart
  else if (arrStart !== -1) start = arrStart
  if (start === -1) return null
  const objEnd = stdout.lastIndexOf('}')
  const arrEnd = stdout.lastIndexOf(']')
  let end = -1
  if (objEnd !== -1 && (arrEnd === -1 || objEnd > arrEnd)) end = objEnd
  else if (arrEnd !== -1) end = arrEnd
  if (end <= start) return null
  try {
    return JSON.parse(stdout.slice(start, end + 1))
  } catch {
    return null
  }
}

// ── 对外探测/映射 API ───────────────────────────────────────────────────────

/**
 * 探测三态：索引是否可用（fail-soft——任何异常返回 available:false，绝不抛出）。
 * @param {string} root 项目根（cwd；索引落在 root/.sillyspec-codegraph）
 * @param {{execFile?: Function, env?: object, timeouts?: object}} deps 可注入
 * @returns {Promise<{available: boolean, reason: string, status?: object}>}
 */
export async function probeCodegraph(root, deps = {}) {
  try {
    const out = await runCodegraph(root, ['status', root, '-j'], CODEGRAPH_TIMEOUTS_MS.status, deps)
    const st = parseJsonLoose(out)
    if (!st || typeof st !== 'object') {
      return { available: false, reason: 'codegraph status 输出不可解析（非 JSON 或字段缺失）' }
    }
    if (st.initialized !== true) return { available: false, reason: 'codegraph 索引未初始化（initialized=false）', status: st }
    if (!st.index || st.index.state !== 'complete') {
      return { available: false, reason: `codegraph 索引未完成（state=${st.index ? st.index.state : '缺失'}）`, status: st }
    }
    return { available: true, reason: '索引就绪', status: st }
  } catch (e) {
    const msg = String((e && e.message) || e)
    if (/ENOENT/i.test(msg)) return { available: false, reason: '未安装 codegraph（命令不存在）' }
    if (/ETIMEDOUT|timed?\s*out/i.test(msg)) return { available: false, reason: 'codegraph 探测超时' }
    return { available: false, reason: `codegraph 探测失败（${msg.split('\n')[0].slice(0, 120)}）` }
  }
}

/**
 * 索引全量文件清单（对账数据源）。
 * @returns {Promise<Array<{path: string, language: string, nodeCount: number, size: number}>|null>} 失败/形状不符 → null
 */
export async function listIndexFiles(root, deps = {}) {
  try {
    const out = await runCodegraph(root, ['files', '-p', root, '--format', 'flat', '-j'], CODEGRAPH_TIMEOUTS_MS.query, deps)
    const arr = parseJsonLoose(out)
    if (!Array.isArray(arr)) return null
    // 防御式映射：逐项取字段，缺字段的项跳过（不 throw）；全部无效 → null
    const files = []
    for (const it of arr) {
      if (!it || typeof it.path !== 'string') continue
      files.push({
        path: it.path.replace(/\\/g, '/'),
        language: typeof it.language === 'string' ? it.language : '',
        nodeCount: Number.isFinite(it.nodeCount) ? it.nodeCount : 0,
        size: Number.isFinite(it.size) ? it.size : 0,
      })
    }
    return files.length > 0 ? files : null
  } catch {
    return null
  }
}

/**
 * 受影响测试清单（截断 AFFECTED_TESTS_LIMIT 并置 truncated）。
 * @param {string[]} files 变更源码文件（仓库相对 POSIX）
 * @returns {Promise<{affectedTests: string[], truncated: boolean}|null>} 失败 → null
 */
export async function affectedTests(root, files, deps = {}) {
  if (!Array.isArray(files) || files.length === 0) return { affectedTests: [], truncated: false }
  try {
    const out = await runCodegraph(root, ['affected', '-p', root, '-j', ...files], CODEGRAPH_TIMEOUTS_MS.affected, deps)
    const obj = parseJsonLoose(out)
    if (!obj || !Array.isArray(obj.affectedTests)) return null
    const list = obj.affectedTests.filter((t) => typeof t === 'string')
    return {
      affectedTests: list.slice(0, AFFECTED_TESTS_LIMIT),
      truncated: list.length > AFFECTED_TESTS_LIMIT,
    }
  } catch {
    return null
  }
}
