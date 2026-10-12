/**
 * review-probes.js — 项目评审探针（2026-10-12-review-probe-injection）。
 *
 * 定位：把「项目特有的评审必查面」从主代理手写检查单收归 CLI 单源注入——dogfood 实证
 * （2026-10-10~12 fire-equipment 会话）：三个生产缺陷（dva 双注册、MyBatis typeAliases
 * 撞名、原型表头未实现）全部由用户报障发现，独立评审零捕获，根因是检查单由主代理手写、
 * 主代理没想到的面无人查。
 *
 * 开放世界红线（用户 2026-10-12 定规）：CLI 零内容枚举、零语言/框架绑定——探针是纯数据
 * （local.yaml `review_probes` 段：id 自由文本 / lines 自由文本清单行 / command 任意 shell
 * 命令，stdout 非空行追加），CLI 只做装配与容量治理。scope 枚举（thin|thick|all）是 CLI
 * 自有的两个任务书面（轻量 renderReviewerTaskbook / 厚档 buildReviewerTaskBook），非内容
 * 枚举。与 ceremony/docs-check 等 local.yaml 段同消费哲学：读键容错、缺省空、未配置零注入。
 *
 * 容量帽：防误配把任务书撑爆或命令拖死渲染——条目 ≤16、每条静态行 ≤12、单行 ≤300 字符、
 * 命令超时 10s、命令输出 ≤2KB 且 ≤20 行；超帽截断并在 provenance 留痕（不静默吞）。
 * fail-soft：坏条目跳过+告警、命令失败/超时跳过该行源——探针面永不阻断任务书渲染。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import yaml from 'js-yaml'

export const PROBE_LIMITS = {
  MAX_PROBES: 16,
  MAX_LINES_PER_PROBE: 12,
  MAX_LINE_CHARS: 300,
  COMMAND_TIMEOUT_MS: 10_000,
  COMMAND_OUTPUT_MAX_BYTES: 2048,
  COMMAND_OUTPUT_MAX_LINES: 20,
}

/** scope 合法面（CLI 自有任务书面集合——封闭小集，非内容枚举）。 */
const SCOPES = new Set(['thin', 'thick', 'all'])

const cleanLine = (s) => String(s ?? '').replace(/\s+$/, '')

/**
 * 校验+归一探针声明（纯函数，零抛出）。
 * @param {unknown} raw - local.yaml review_probes 段原值
 * @returns {{ probes: Array<{id:string, scope:string, lines:string[], command:string|null}>, warnings: string[] }}
 */
export function parseReviewProbes(raw) {
  const warnings = []
  if (raw == null) return { probes: [], warnings }
  if (!Array.isArray(raw)) return { probes: [], warnings: ['review_probes 段非数组——整段忽略'] }
  const probes = []
  raw.slice(0, PROBE_LIMITS.MAX_PROBES).forEach((entry, i) => {
    const label = `review_probes[${i}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      warnings.push(`${label} 非对象——跳过`); return
    }
    const id = cleanLine(entry.id)
    if (!id || id.length > 64) { warnings.push(`${label} id 缺失或超 64 字符——跳过`); return }
    let scope = entry.scope == null ? 'all' : String(entry.scope)
    if (!SCOPES.has(scope)) { warnings.push(`${label}(${id}) scope 非法（${scope}，合法 thin|thick|all）——按 all 处理`); scope = 'all' }
    const lines = Array.isArray(entry.lines)
      ? entry.lines.map(cleanLine).filter((l) => l.length > 0)
      : []
    if (lines.length > PROBE_LIMITS.MAX_LINES_PER_PROBE) {
      warnings.push(`${label}(${id}) lines ${lines.length} 行超帽 ${PROBE_LIMITS.MAX_LINES_PER_PROBE}——截断`)
      lines.length = PROBE_LIMITS.MAX_LINES_PER_PROBE
    }
    for (const l of lines) {
      if (l.length > PROBE_LIMITS.MAX_LINE_CHARS) {
        warnings.push(`${label}(${id}) 单行超 ${PROBE_LIMITS.MAX_LINE_CHARS} 字符——截断`)
        break
      }
    }
    const linesCapped = lines.map((l) => l.length > PROBE_LIMITS.MAX_LINE_CHARS ? l.slice(0, PROBE_LIMITS.MAX_LINE_CHARS) : l)
    const command = typeof entry.command === 'string' && entry.command.trim() ? entry.command : null
    if (linesCapped.length === 0 && !command) { warnings.push(`${label}(${id}) lines 与 command 均空——跳过`); return }
    probes.push({ id, scope, lines: linesCapped, command })
  })
  if (raw.length > PROBE_LIMITS.MAX_PROBES) {
    warnings.push(`review_probes ${raw.length} 条超帽 ${PROBE_LIMITS.MAX_PROBES}——仅取前 ${PROBE_LIMITS.MAX_PROBES} 条`)
  }
  return { probes, warnings }
}

/**
 * 装载 local.yaml 的 review_probes 段（IO，容错缺省空——无段/无文件/解析失败均零探针零阻断）。
 * @returns {{ probes: Array, warnings: string[] }}
 */
export function loadReviewProbes(specBase) {
  try {
    const p = join(specBase || '', 'local.yaml')
    if (!existsSync(p)) return { probes: [], warnings: [] }
    const doc = yaml.load(readFileSync(p, 'utf8'))
    const section = doc && typeof doc === 'object' ? doc.review_probes : null
    return parseReviewProbes(section)
  } catch (e) {
    return { probes: [], warnings: [`review_probes 装载失败（${e && e.message ? e.message : e}）——按未配置处理`] }
  }
}

/**
 * 命令输出封帽（纯函数，评审 P3①② 清偿）：字节帽按 UTF-8 实字节数（非 UTF-16 字符数——中文
 * 场景旧口径实际可注入 ~3× 标称值）；行帽 20；命令输出行同享静态行单行 300 字符帽。
 * 多字节截断可能切在字符中间（Buffer subarray + utf8 解码产生替换符）——留痕已示截断，可接受。
 */
export function capCommandOutput(raw) {
  let out = String(raw ?? '')
  const provenance = []
  const bytes = Buffer.byteLength(out, 'utf8')
  if (bytes > PROBE_LIMITS.COMMAND_OUTPUT_MAX_BYTES) {
    out = Buffer.from(out, 'utf8').subarray(0, PROBE_LIMITS.COMMAND_OUTPUT_MAX_BYTES).toString('utf8')
    provenance.push(`命令输出超 ${PROBE_LIMITS.COMMAND_OUTPUT_MAX_BYTES}B 截断`)
  }
  let lines = out.split(/\r?\n/).map(cleanLine).filter((l) => l.length > 0)
  if (lines.some((l) => l.length > PROBE_LIMITS.MAX_LINE_CHARS)) {
    lines = lines.map((l) => (l.length > PROBE_LIMITS.MAX_LINE_CHARS ? l.slice(0, PROBE_LIMITS.MAX_LINE_CHARS) : l))
    provenance.push(`命令输出单行超 ${PROBE_LIMITS.MAX_LINE_CHARS} 字符截断`)
  }
  if (lines.length > PROBE_LIMITS.COMMAND_OUTPUT_MAX_LINES) {
    lines = lines.slice(0, PROBE_LIMITS.COMMAND_OUTPUT_MAX_LINES)
    provenance.push(`命令输出超 ${PROBE_LIMITS.COMMAND_OUTPUT_MAX_LINES} 行截断`)
  }
  return { lines, provenance }
}

/** 缺省命令执行器：shell 执行 + 超时 + 输出帽（字节/行/单行三帽，超帽截断留痕）。 */
function defaultRunCommand(command) {
  const r = spawnSync(command, { shell: true, timeout: PROBE_LIMITS.COMMAND_TIMEOUT_MS, encoding: 'utf8', windowsHide: true })
  if (r.error || r.status !== 0) {
    const why = r.error && r.error.code === 'ETIMEDOUT' ? `超时 >${PROBE_LIMITS.COMMAND_TIMEOUT_MS}ms` : `退出码 ${r.status ?? '?'}`
    return { ok: false, warning: `命令失败（${why}）`, lines: [] }
  }
  const { lines, provenance } = capCommandOutput(r.stdout)
  return { ok: true, lines, provenance }
}

/**
 * 解析某任务书面的探针清单行（纯函数，runCommand 注入可测）。
 * @param {{ probes: Array, scope?: 'thin'|'thick', runCommand?: (cmd:string)=>{ok:boolean,lines:string[],warning?:string,provenance?:string[]} }} opts
 * @returns {{ lines: string[], provenance: string[] }}
 */
export function resolveProbeLines({ probes, scope = 'thin', runCommand = defaultRunCommand } = {}) {
  const lines = []
  const provenance = []
  for (const p of probes || []) {
    if (p.scope !== 'all' && p.scope !== scope) continue
    for (const l of p.lines) lines.push(`${p.id}｜${l}`)
    if (p.command) {
      const r = runCommand(p.command)
      if (!r.ok) { provenance.push(`探针 ${p.id} ${r.warning || '命令失败'}——命令行源跳过`); continue }
      for (const l of r.lines) lines.push(`${p.id}｜${l}`)
      for (const pv of r.provenance || []) provenance.push(`探针 ${p.id}：${pv}`)
    }
  }
  return { lines, provenance }
}

/** 装配便捷面（调用点单行接线）：装载→scope 过滤→行合并，warnings 汇含装载告警与帽留痕。 */
export function assembleProbeLinesForScope(specBase, scope) {
  const { probes, warnings } = loadReviewProbes(specBase)
  const { lines, provenance } = resolveProbeLines({ probes, scope })
  return { lines, warnings: [...warnings, ...provenance] }
}

export default { parseReviewProbes, loadReviewProbes, resolveProbeLines, assembleProbeLinesForScope, capCommandOutput, PROBE_LIMITS }
