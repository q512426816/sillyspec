/**
 * semantic-guard.js — quick 语义护栏聚合模块（change: 2026-09-11-cross-change-decision-guard，
 * task-03，FR-03/FR-04，D-001@v1）：近因他者交付归因 + 断言重写检测 + advisory 渲染 + 总开关。
 *
 * 被 run/prompt.js（task-05，进场注入）与 run/quick-audit.js（task-06，--done 断言 WARNING）
 * 两端消费。纯模块纪律：不 console（渲染返回字符串，输出留给消费端）、不写盘、
 * 不 import run/ 下模块（避免与 task-05/06 循环依赖）。
 *
 * git 交互一律走 git-helper 的 safeGit（数组参数不经 shell，Windows 路径安全）；失败静默
 * 降级空结果不抛（acceptance：git 不可用 → 全部降级空结果）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { safeGit } from './git-helper.js'
import { matchDecisionsByFiles } from './knowledge-match.js'

/** 路径反斜杠归一 POSIX（Windows 调用方传 \ 分隔时不丢匹配；与 matchDecisionsByFiles 双侧归一口径一致） */
function toPosix(p) {
  return String(p || '').trim().replace(/\\/g, '/')
}

// ───────────────────────── 交付归因（FR-03） ─────────────────────────

/** 提交信息里的完整变更名标记：init 生成的 change 目录名形态（2026-09-11-cross-change-decision-guard） */
const CHANGE_NAME_RE = /\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*/g
/** quicklog 条目 ID 标记：ql-YYYYMMDD-NNN-xxxx（quick 会话提交信息的归因键） */
const QL_ID_RE = /ql-\d{8}-\d{3}-[a-z0-9]{4}/g

/** 单条提交信息 → 两类标记列表（按出现位置排序；两类正则无交集，ql-ID 的日期段无连字符） */
function extractChangeMarkers(subject) {
  const found = []
  for (const re of [CHANGE_NAME_RE, QL_ID_RE]) {
    for (const m of subject.matchAll(re)) found.push({ token: m[0], at: m.index })
  }
  return found.sort((a, b) => a.at - b.at).map(f => f.token)
}

/**
 * 近因他者交付归因：每文件查最近 days 天提交信息（--format=%s，仅 subject），解析变更名 /
 * ql-ID 两类标记，取最新一条非 currentChange 标记 → { [file]: changeName }。
 * git log 输出行为提交 subject，无 porcelain 首行前导空格语义（git-helper.js:88 的
 * trim 坑不影响此处），safeGit 默认 trim 安全。
 * @param {{ cwd?: string, files?: string[], currentChange?: string, days?: number }} opts
 * @returns {{ [file]: string }} 键 = POSIX 归一路径；无标记 / 仅本变更标记 / git 失败 /
 *   第 20 个之后的文件 → 不记
 */
export function collectRecentForeignDelivery({ cwd, files, currentChange, days = 7 } = {}) {
  const result = {}
  if (!cwd || !Array.isArray(files)) return result
  const list = files.map(toPosix).filter(Boolean).slice(0, 20)
  for (const file of list) {
    const r = safeGit(cwd, ['log', `--since=${days}.days`, '--format=%s', '--', file])
    if (r.error || !r.value) continue
    // git log 新→旧：逐提交找第一条非 currentChange 标记，命中即止（取最新他者标记）
    for (const subject of r.value.split('\n')) {
      const foreign = extractChangeMarkers(subject).find(m => m !== currentChange)
      if (foreign) {
        result[file] = foreign
        break
      }
    }
  }
  return result
}

// ───────────────────────── 断言重写检测（FR-04） ─────────────────────────

/** 删除侧断言 token：expect( / assert / t.equal / toBe / toEqual / strictEqual / should. */
const ASSERTION_TOKEN_RE = /expect\(|assert|t\.equal|toBe|toEqual|strictEqual|should\./

/** 测试文件判定：test/ 前缀 或 *.test.* / *_test.* 命名（路径先 POSIX 归一） */
function isTestFilePath(p) {
  return p.startsWith('test/') || /\.test\./.test(p) || /_test\./.test(p)
}

/**
 * 断言重写检测：测试文件跑 git diff HEAD -U0（HEAD 口径非 index——quick step3 先 git add
 * 暂存的时序下裸 diff 恒空转，坑 Grill X-001），hunk 删除侧（- 行）含断言 token → 命中；
 * 纯新增 hunk（无 - 行）不算；样例行封顶 5/文件。
 * @param {{ cwd?: string, files?: string[] }} opts
 * @returns {{ [file]: string[] }} 键 = POSIX 归一测试文件路径，值 = 删除侧含 token 的原行
 *   （去 - 前缀）；非测试文件不查；无命中 / git 失败 → 不记
 */
export function detectAssertionRewrites({ cwd, files } = {}) {
  const result = {}
  if (!cwd || !Array.isArray(files)) return result
  for (const raw of files) {
    const file = toPosix(raw)
    if (!file || !isTestFilePath(file)) continue
    const r = safeGit(cwd, ['diff', 'HEAD', '-U0', '--', file])
    if (r.error || !r.value) continue
    const samples = []
    let inHunk = false
    let deletedLines = []
    const flushHunk = () => {
      if (!inHunk || deletedLines.length === 0) return // 纯新增 hunk（无 - 行）不算
      for (const line of deletedLines) {
        if (samples.length >= 5) break
        if (ASSERTION_TOKEN_RE.test(line)) samples.push(line)
      }
    }
    for (const line of r.value.split('\n')) {
      if (line.startsWith('@@')) {
        flushHunk()
        inHunk = true
        deletedLines = []
        continue
      }
      if (!inHunk) continue // 文件头（diff --git / index / --- / +++）不进 hunk 统计
      if (line.startsWith('-')) deletedLines.push(line.slice(1)) // + 行与 "\ No newline" 行跳过
    }
    flushHunk()
    if (samples.length > 0) result[file] = samples
  }
  return result
}

// ───────────────────────── advisory 渲染（FR-03/FR-04 组合） ─────────────────────────

/**
 * advisory 文本段渲染：决策命中（matchDecisionsByFiles，knowledge 目录 = specBase/knowledge，
 * task-02 契约）+ 交付归因（collectRecentForeignDelivery 默认 7 天窗）组合成注入文本，
 * 供 task-05 进场注入 / task-06 --done WARNING 拼接；两类均零命中 → ''（不留空段）。
 * @param {{ specBase?: string, cwd?: string, candidateFiles?: string[], currentChange?: string }} opts
 * @returns {string}
 */
export function renderSemanticGuardBlock({ specBase, cwd, candidateFiles, currentChange } = {}) {
  if (!Array.isArray(candidateFiles) || candidateFiles.length === 0) return ''
  const files = [...new Set(candidateFiles.map(toPosix).filter(Boolean))]
  if (files.length === 0) return ''
  const decisions = specBase
    ? matchDecisionsByFiles(join(specBase, 'knowledge'), files)
    : {}
  const delivery = cwd
    ? collectRecentForeignDelivery({ cwd, files, currentChange })
    : {}
  const decisionFiles = files.filter(f => Array.isArray(decisions[f]) && decisions[f].length > 0)
  const deliveryFiles = files.filter(f => delivery[f])
  if (decisionFiles.length === 0 && deliveryFiles.length === 0) return ''
  const lines = ['【语义护栏】改动文件触及既有决策 / 近期他者交付，动手前请对照：']
  if (decisionFiles.length > 0) {
    lines.push(`■ 决策库命中（${decisionFiles.length} 文件）`)
    for (const f of decisionFiles) {
      for (const hit of decisions[f]) {
        const rejected = hit.status === 'rejected'
        lines.push(`  - ${f} → ${hit.id} ${hit.title}［${rejected ? 'rejected，已否决，勿复潮' : hit.status || 'unknown'}］`)
        lines.push(`      理由：${hit.reason || '（未记录）'}`)
        if (hit.file) lines.push(`      详见：knowledge/${hit.file}`)
      }
    }
  }
  if (deliveryFiles.length > 0) {
    lines.push('■ 近 7 天他者交付归因（最后交付的非本变更标记）')
    for (const f of deliveryFiles) lines.push(`  - ${f} ← ${delivery[f]}`)
  }
  return lines.join('\n')
}

// ───────────────────────── 总开关（D-001@v1） ─────────────────────────

/** YAML 布尔宽松解析：仅显式 false（含引号形态）为关，其余值一律 true（fail-open，先例 friction-tally R-05） */
function parseEnabledValue(raw) {
  const v = String(raw || '').trim().replace(/^['"]|['"]$/g, '')
  return v.toLowerCase() !== 'false'
}

/**
 * 读 specBase/local.yaml 的 semantic_guard.enabled 总开关（D-001@v1）：默认 true；
 * 缺键 / 文件缺失 / 解析异常 → true（fail-open——配置读取异常不该把护栏误判为关）。
 * 轻量行式解析不引 yaml 依赖（先例 friction-tally readFrictionHintEnabled 同款形态），
 * 兼容嵌套（semantic_guard:\n  enabled: false）与 flat（semantic_guard.enabled: false）；
 * 行尾先归一（Windows CRLF 残留致行式正则整体失配）。
 * @param {string} specBase - spec 根（local.yaml 所在目录）
 * @returns {boolean}
 */
export function readSemanticGuardEnabled(specBase) {
  try {
    const yamlPath = join(specBase, 'local.yaml')
    if (!existsSync(yamlPath)) return true
    const text = String(readFileSync(yamlPath, 'utf8')).replace(/\r\n?/g, '\n')
    let inSection = false
    let sectionIndent = -1
    for (const line of text.split('\n')) {
      // flat 形态优先：键名带点，不与嵌套段头冲突
      const flat = line.match(/^\s*semantic_guard\.enabled\s*:\s*(.*?)\s*(?:#.*)?$/)
      if (flat) return parseEnabledValue(flat[1])
      const section = line.match(/^(\s*)semantic_guard\s*:\s*(?:#.*)?$/)
      if (section) {
        inSection = true
        sectionIndent = section[1].length
        continue
      }
      if (!inSection) continue
      if (line.trim() === '' || line.trim().startsWith('#')) continue
      // 缩进回落到段头层级（或更浅）= semantic_guard 段结束，之后的 enabled 不属于它
      if (/^\s*/.exec(line)[0].length <= sectionIndent) {
        inSection = false
        continue
      }
      const kv = line.match(/^\s*enabled\s*:\s*(.*?)\s*(?:#.*)?$/)
      if (kv) return parseEnabledValue(kv[1])
    }
    return true
  } catch {
    return true
  }
}
