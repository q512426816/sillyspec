/**
 * forensics.js — 会话取证证据包装配 + 取证任务书渲染（2026-10-15-session-forensics）
 *
 * 定位：`sillyspec diagnose --change <名>` 的只读装配面。对照 obra/superpowers
 * diagnosing-superpowers 的取证形态做 SillySpec 原生版——分工沿本仓哲学：
 * CLI 装配机械事实（证据包六面），agent 做语义判断（按任务书读 transcript、出
 * path:line 证据报告）。全程零写入：证据源全是事后读取的静态文件，单源缺失/
 * 损坏 fail-soft 空清单+注记，不抛错不阻断（取证要容忍现场变动）。
 *
 * 数据源（全部既有，零新格式）：
 *   - 变更目录 / 归档目录（flow-state.yaml 身份面、review 轮次文件）
 *   - <runtimeRoot>/agent-session-log.json（run 命令登记的会话日志路径，
 *     按 change_key 精确相等过滤——登记面唯一键，无子串误命中面）
 *   - <runtimeRoot>/friction-ledger.json（readFrictionLedger 既有 API）
 *   - <runtimeRoot>/verify-runs/<时间戳目录>/test-result.json（mtime 近序取前 N）
 *
 * 红线：零内容枚举——任务书六维度是结构骨架（CLI 自有任务书面集合，同
 * review_probes scope 判例），不是内容词表；CLI 不解析 transcript 本体
 * （三 harness 格式 × 演化泥潭，解读交给 agent）。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { readFrictionLedger } from './friction-ledger.js'

/** verify-runs 证据默认截断数（近序 N 条，防大仓 runtime 灌爆输出；模块内常量——导出即死码债） */
const VERIFY_RUNS_LIMIT = 3

/** 读 JSON 文件，失败/不存在返回 null（fail-soft 取证立场）。 */
function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/** 读 YAML 文件，失败/不存在返回 null。 */
function readYamlSafe(path) {
  try {
    return yaml.load(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/**
 * 装配证据包六面。纯读函数，零写入。
 * @param {{ specBase: string, runtimeRoot: string, changeName: string, verifyRunsLimit?: number }} p
 * @returns {{ identity: object, agentLogs: object[], friction: object[], verifyRuns: object[], reviews: object[], warnings: string[] }}
 */
export function assembleForensicsPack({ specBase, runtimeRoot, changeName, verifyRunsLimit = VERIFY_RUNS_LIMIT }) {
  const warnings = []
  const changeDir = join(specBase, 'changes', changeName)
  const archivedDir = join(specBase, 'changes', 'archive', changeName)

  // ① 变更身份（active / archived / missing + flow-state 态）
  const identity = { changeName, status: 'missing', changeDir: null, archivedDir: null, tier: null, substeps: null }
  if (existsSync(changeDir)) {
    identity.status = 'active'
    identity.changeDir = changeDir
  } else if (existsSync(archivedDir)) {
    identity.status = 'archived'
    identity.changeDir = archivedDir
    identity.archivedDir = archivedDir
    warnings.push('变更已归档——证据包从归档目录读取，transcript 仍按登记路径取')
  }
  const flowStatePath = identity.changeDir ? join(identity.changeDir, 'flow-state.yaml') : null
  if (flowStatePath && existsSync(flowStatePath)) {
    const fs_ = readYamlSafe(flowStatePath)
    if (fs_ && typeof fs_ === 'object') {
      identity.tier = fs_.tier ?? null
      identity.substeps = fs_.substeps && typeof fs_.substeps === 'object' ? fs_.substeps : null
    } else {
      warnings.push(`flow-state.yaml 解析失败（${flowStatePath}）——身份面降级`)
    }
  } else {
    warnings.push('无 flow 态（archive 件或无 flow-state.yaml）')
  }

  // ② agent 会话日志（change_key 精确相等——登记面唯一键）
  const registryPath = join(runtimeRoot, 'agent-session-log.json')
  const registry = readJsonSafe(registryPath)
  let agentLogs = []
  if (registry && Array.isArray(registry.entries)) {
    agentLogs = registry.entries.filter((e) => e && typeof e === 'object' && e.change_key === changeName)
  } else {
    warnings.push(`会话日志登记缺失或不可解析（${registryPath}）——本机未跑过 run 命令或登记面损坏`)
  }

  // ③ 摩擦账本（readFrictionLedger 容错：缺文件/坏 JSON → []）
  const friction = readFrictionLedger(runtimeRoot).filter((e) => e.change === changeName)

  // ④ verify-runs（mtime 近序，同 mtime 路径字典序破平；截断前 N）
  const runsRoot = join(runtimeRoot, 'verify-runs')
  const verifyRuns = []
  if (existsSync(runsRoot)) {
    const dirs = readdirSync(runsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(runsRoot, d.name))
    const withTime = dirs
      .map((dir) => {
        try {
          return { dir, mtimeMs: statSync(dir).mtimeMs }
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b.mtimeMs - a.mtimeMs) || (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0))
    for (const { dir, mtimeMs } of withTime.slice(0, Math.max(1, verifyRunsLimit))) {
      const resultPath = join(dir, 'test-result.json')
      verifyRuns.push({
        dir,
        resultPath: existsSync(resultPath) ? resultPath : null,
        mtimeIso: new Date(mtimeMs).toISOString(),
      })
    }
  } else {
    warnings.push(`无 verify-runs 目录（${runsRoot}）——本变更未跑过收口实测或 runtime 已清理`)
  }

  // ⑤ 评审轮次（review.json + superseded-*，mtime 近序）
  const reviews = []
  if (identity.changeDir && existsSync(identity.changeDir)) {
    const files = readdirSync(identity.changeDir).filter((f) => /^review\.json(\.superseded-.+)?$/.test(f))
    for (const f of files) {
      const p = join(identity.changeDir, f)
      let mtimeIso = null
      try {
        mtimeIso = new Date(statSync(p).mtimeMs).toISOString()
      } catch { /* 文件刚被删——列名不留 mtime */ }
      reviews.push({ file: p, superseded: f !== 'review.json', mtimeIso })
    }
    reviews.sort((a, b) => (b.mtimeIso || '').localeCompare(a.mtimeIso || ''))
  } else {
    warnings.push('变更目录不存在——评审轮次面为空')
  }

  return { identity, agentLogs, friction, verifyRuns, reviews, warnings }
}

/**
 * 渲染取证任务书（markdown）。六维度是结构骨架不是封闭清单；四纪律钉死
 * diagnosing-superpowers 的核心铁律（path:line 锚、唯一可写产物、先读本体、时间盒）。
 * @param {{ identity: object, agentLogs: object[], friction: object[], verifyRuns: object[], reviews: object[], warnings: string[] }} pack
 * @returns {string}
 */
export function renderForensicsTaskbook(pack) {
  const { identity, agentLogs, friction, verifyRuns, reviews, warnings } = pack
  const lines = []
  lines.push(`# 会话取证任务书 — ${identity.changeName}`)
  lines.push('')
  lines.push(`【角色】你是取证分析员（干净上下文）——还原这个会话里实际发生了什么，拿证据说话，不替流程辩护也不替人辩护。报告读者是「要决定下一步怎么办的人」。`)
  lines.push('')
  lines.push('## 证据包（CLI 装配的机械事实——先读这些文件本体，再下结论）')
  lines.push('')
  lines.push(`- 变更身份：status=${identity.status}｜tier=${identity.tier ?? '无'}｜目录=${identity.changeDir ?? '（不存在）'}`)
  lines.push(`- agent 会话日志（${agentLogs.length} 条，change_key=${identity.changeName} 精确过滤）：`)
  for (const e of agentLogs) {
    lines.push(`  - [${e.harness}/${e.format ?? '?'}] ${e.log_path}（session=${e.session_id ?? '?'}${e.exists === false ? '，⚠️ 文件不在场' : ''}）`)
  }
  if (agentLogs.length === 0) lines.push('  - （零命中——本机未登记过本变更的会话日志）')
  lines.push(`- 摩擦账本（${friction.length} 条）：${friction.map((e) => JSON.stringify(e.counts ?? {})).join(' / ') || '（无）'}`)
  lines.push(`- verify-runs（近 ${verifyRuns.length} 次）：`)
  for (const r of verifyRuns) lines.push(`  - ${r.resultPath ?? r.dir + '（无 test-result.json）'} @ ${r.mtimeIso}`)
  lines.push(`- 评审轮次（${reviews.length} 份，含 superseded）：`)
  for (const r of reviews) lines.push(`  - ${r.file}${r.superseded ? '（superseded——前轮评审结论，对比两轮可还原修复轨迹）' : ''}`)
  if (warnings.length) {
    lines.push(`- 降级注记：${warnings.join('；')}`)
  }
  lines.push('')
  lines.push('## 分析维度（结构骨架——常见失事面，不是封闭清单：证据指向维度外时照报，报告允许增设章节）')
  lines.push('')
  lines.push('1. **时间线重建**：这个会话按时间实际做了什么（步骤推进/等待/回滚/中断点）。')
  lines.push('2. **计划遵从**：做的是计划内的事吗？偏离处有没有留痕（决策/账本/提交消息）？')
  lines.push('3. **重复工作**：有没有同一件事做两遍（重派/重审/重跑）？根因是什么？')
  lines.push('4. **停等与重试**：哪里停等了用户/子代理？重试了几次？是否有可避免的空转？')
  lines.push('5. **成本与轮次**：轮次/token 花在哪了（读文件长尾？全量重验？）？')
  lines.push('6. **门禁摩擦**：gate 回滚/评审打回/实测失败的完整链条与最终清偿方式。')
  lines.push('')
  lines.push('## 取证纪律')
  lines.push('')
  lines.push('1. **每条 finding 必须带 `path:line` 锚，无锚不成立**——锚指向证据包列出的文件或其内容（行号取自你实际读到的文件）。')
  lines.push('2. **唯一可写产物是 `diagnosis-report.md`**（写在变更目录）——禁止修改任何其他文件、禁止 git 操作。固定章节：`## 问题陈述` / `## 时间线` / `## Findings`（分维度）/ `## 无法证实面`（证据不足的疑点如实列，不脑补）。')
  lines.push('3. **先读证据包列出的文件本体再下结论，禁止全量扫读仓**——矛盾经常藏在交叉处，定向读那一处。')
  lines.push('4. **时间盒收敛**：结论存疑时定向补证；连续扩面仍零结论 = 基于已读材料收敛，把疑点写进「无法证实面」。')
  lines.push('')
  lines.push('【无子代理通道时】主会话按本任务书自行分析即可，如实标注执行方式；有子代理通道时按维度分派并行分析、汇总时逐条核对锚点。')
  lines.push('')
  return lines.join('\n')
}

/**
 * 命令入口：sillyspec diagnose --change <名> [--detect] [--json]
 * 只读零写入；--detect 先透传 agent-session-log 现场探测（不落盘语义随既有 cmdAgentLog）。
 * @param {string[]} args - filteredArgs.slice(1)（'diagnose' 之后）
 * @param {{ json?: boolean, cwd?: string, specDir?: string|null }} opts
 */
export async function cmdForensics(args, { json = false, cwd = process.cwd(), specDir = null } = {}) {
  const changeIdx = args.indexOf('--change')
  const changeName = changeIdx >= 0 && args[changeIdx + 1] && !String(args[changeIdx + 1]).startsWith('--') ? args[changeIdx + 1] : null
  if (!changeName) {
    console.error('用法: sillyspec diagnose --change <名> [--detect] [--json] [--spec-dir <路径>]')
    console.error('  只读装配会话取证证据包 + 取证任务书（path:line 铁律；唯一可写产物是变更目录的 diagnosis-report.md，由执行任务书的 agent 产出）')
    process.exit(2)
  }
  const specBase = specDir || join(cwd, '.sillyspec')
  const runtimeRoot = join(specBase, '.runtime')

  if (args.includes('--detect')) {
    const { cmdAgentLog } = await import('./agent-session-log.js')
    await cmdAgentLog(['--detect'], { json: false, cwd, specDir })
  }

  const pack = assembleForensicsPack({ specBase, runtimeRoot, changeName })
  const taskbook = renderForensicsTaskbook(pack)

  if (json || args.includes('--json')) {
    console.log(JSON.stringify({ ...pack, taskbook }))
    return
  }
  console.log(taskbook.trimEnd())
}
