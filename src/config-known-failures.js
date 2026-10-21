/**
 * config-known-failures —— local.yaml known_failures 键的行级增删查（2026-10-21-p0-p1-hardening FR-07）
 *
 * 背景（dsh z2 实证）：agent 用 PS5.1 `Set-Content -Encoding UTF8` 手改 50KB local.yaml 的
 * known_failures 行 → BOM/mojibake 不可逆损坏（510 个 `?`），恢复等用户人工贴备份 2h13m。
 * known_failures 无 CLI 管理面 = 手改场景必然存在。本模块给 `sillyspec config known-failures
 * list|add|remove` 提供纯逻辑核心：
 *   - 行级定向手术（块式/流式两种既有形态都认），保留文件其余内容与注释——禁止 js-yaml 整体
 *     重序列化（丢注释，用户文档性受损）；
 *   - 改前 YAML 全文可解析性门（jsYaml.load 抛错 → 拒改，坏文件上叠加手术只会更坏）；
 *   - 写入 writeAtomicSync（tmp+rename 原子替换）+ UTF-8 无 BOM 新写。
 * 读法口径对齐 docs-check.js known_failures 键提取（块式 + 流式）——不 import（该模块拖重链）。
 */
import { existsSync, readFileSync } from 'node:fs'
import jsYaml from 'js-yaml'
import { writeAtomicSync } from './fs-atomic.js'

/** 块式头行：known_failures: 顶格、后接注释或空（docs-check.js:982 同口径） */
const BLOCK_HEADER_RE = /^known_failures:\s*(?:#.*)?$/
/** 流式行：known_failures: [a, b]（docs-check.js:971 同口径） */
const INLINE_HEADER_RE = /^known_failures:\s*\[(.*)\]\s*(?:#.*)?$/
/** 块式条目行：缩进 + 列表杠 + 键（支持裸/双引/单引形态，尾注释剥除） */
const ITEM_RE = /^(\s+)-\s*(?:"([^"]*)"|'([^']*)'|([^#]*?))\s*(?:#.*)?$/

/** 键的裸写安全性：字母数字/下划线/连字符/点/中文——其余（逗号方括号引号#等）写回时加双引号 */
const BARE_KEY_SAFE_RE = /^[\w.\-\u4e00-\u9fff]+$/

/**
 * 纯函数：从 local.yaml 文本提取 known_failures 键清单（块式 + 流式两形态）。
 * 无 known_failures 段 → 空数组；块头无条目（含 `known_failures: []` 流式空）→ 空数组。
 * @param {string} text
 * @returns {string[]}
 */
export function parseKnownFailureKeys(text) {
  const src = String(text || '')
  const lines = src.split(/\r?\n/)
  // 流式优先（同键只可能一种形态在场；流式正则更具体）
  for (const l of lines) {
    const m = l.match(INLINE_HEADER_RE)
    if (m) {
      return (m[1] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => unquoteKey(s))
    }
  }
  const idx = lines.findIndex((l) => BLOCK_HEADER_RE.test(l))
  if (idx === -1) return []
  const keys = []
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (/^\S/.test(l)) break // 下一个顶层键——段结束
    const m = l.match(ITEM_RE)
    if (m) {
      const k = m[2] ?? m[3] ?? (m[4] || '').trim()
      if (k) keys.push(k)
    }
  }
  return keys
}

function unquoteKey(s) {
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1)
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1)
  return s
}

function renderKey(k) {
  return BARE_KEY_SAFE_RE.test(k) ? k : `"${String(k).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * 纯函数：行级手术增删 known_failures 键。
 * - 增：去重后追加（块式→段尾插条目行；流式→行内数组追加；无段→文件尾整段追加）；
 * - 删：移除命中条目（块式删行；流式重拼数组）；删空后流式写 `[]`、块式头改写 `known_failures: []`；
 * - 改前全文 jsYaml 可解析门：抛错 → { ok:false }（坏文件上拒绝手术）；
 * - 文件其余行（含注释/空行/换行风格）逐字节保留——只动 known_failures 相关行。
 * @param {string} text 原 local.yaml 全文
 * @param {{ add?: string[], remove?: string[] }} edit
 * @returns {{ ok: true, next: string, keys: string[] } | { ok: false, error: string }}
 */
export function applyKnownFailureEdit(text, { add = [], remove = [] } = {}) {
  const src = String(text || '')
  // 坏 YAML 拒改门（FR-07：mojibake/残缺文件上手术只会更坏——先修文件再管理键）
  try {
    const doc = jsYaml.load(src)
    if (doc !== null && typeof doc !== 'object') {
      return { ok: false, error: 'local.yaml 顶层不是映射（YAML 合法但形态异常）——拒改，请人工核对' }
    }
  } catch (e) {
    return { ok: false, error: `local.yaml YAML 解析失败（${String(e && e.message ? e.message : e).split('\n')[0]}）——拒改。先从备份/git 历史恢复或重建文件，再用本命令管理 known_failures` }
  }
  const nl = src.includes('\r\n') ? '\r\n' : '\n'
  const lines = src.split(/\r?\n/)
  // trailing newline 语义：原文以换行结尾 → 重组时补回
  const endedWithNl = /\n$/.test(src) || /\r\n$/.test(src)

  const addSet = [...add].filter(Boolean)
  const removeSet = new Set([...remove].filter(Boolean))

  // 流式形态
  const inlineIdx = lines.findIndex((l) => INLINE_HEADER_RE.test(l))
  if (inlineIdx !== -1) {
    const cur = parseKnownFailureKeys(src)
    const curSet = new Set(cur)
    let next = cur.filter((k) => !removeSet.has(k))
    for (const k of addSet) {
      if (!next.includes(k) && !curSet.has(k)) next.push(k)
      else if (curSet.has(k) && !removeSet.has(k) && !next.includes(k)) next.push(k)
    }
    const inlineMatch = lines[inlineIdx].match(INLINE_HEADER_RE)
    const trailingComment = (inlineMatch[0].match(/#.*$/)?.[0]) || ''
    lines[inlineIdx] = next.length > 0
      ? `known_failures: [${next.map(renderKey).join(', ')}]${trailingComment ? ` ${trailingComment}` : ''}`
      : `known_failures: []${trailingComment ? ` ${trailingComment}` : ''}`
    const out = lines.join(nl) + (endedWithNl ? nl : '')
    return { ok: true, next: out, keys: next }
  }

  // 块式形态
  const blockIdx = lines.findIndex((l) => BLOCK_HEADER_RE.test(l))
  if (blockIdx !== -1) {
    const cur = parseKnownFailureKeys(src)
    const removeHit = cur.filter((k) => removeSet.has(k))
    const keep = cur.filter((k) => !removeSet.has(k))
    const curSet = new Set(cur)
    for (const k of addSet) if (!keep.includes(k) && !curSet.has(k)) keep.push(k)
    // 段边界：块头行之后连续的缩进行（条目/空行/注释行都属于段——条目行重写，其余保留）
    let end = blockIdx + 1
    while (end < lines.length && !/^\S/.test(lines[end])) end++
    // 重组段：保留段内注释/空行的相对位置有过度工程之嫌——known_failures 段语义就是键清单，
    // 直写键条目行（段内注释罕见，注释保真交给其余 99% 的文件内容）
    const section = keep.map((k) => `  - ${renderKey(k)}`)
    lines.splice(blockIdx + 1, end - (blockIdx + 1), ...section)
    if (keep.length === 0) {
      // 删空：块头改流式空（两种 reader 都认 `[]`；裸块头= null 语义靠 reader 兜底，不赌）
      lines[blockIdx] = 'known_failures: []'
    }
    const out = lines.join(nl) + (endedWithNl ? nl : '')
    return { ok: true, next: out, keys: keep, removedCount: removeHit.length }
  }

  // 无段：文件尾整段追加（add 空且 remove 命不中 → 无事可做，原样返回）
  if (addSet.length === 0) return { ok: true, next: src, keys: [] }
  const keys = addSet.filter((k, i) => addSet.indexOf(k) === i)
  const header = src.length === 0 ? '' : (endedWithNl ? '' : nl)
  const out = `${src}${header}known_failures:${nl}${keys.map((k) => `  - ${renderKey(k)}`).join(nl)}${nl}`
  return { ok: true, next: out, keys }
}

/**
 * 读文件列键（CLI list / doctor 联动用）。
 * @param {string} yamlPath
 * @returns {{ ok: boolean, keys?: string[], error?: string, missing?: boolean }}
 */
export function listKnownFailures(yamlPath) {
  if (!existsSync(yamlPath)) return { ok: false, missing: true, error: `local.yaml 不存在: ${yamlPath}` }
  let text
  try {
    text = readFileSync(yamlPath, 'utf8')
  } catch (e) {
    return { ok: false, error: `读取失败: ${e && e.message ? e.message : e}` }
  }
  try {
    jsYaml.load(text)
  } catch (e) {
    return { ok: false, error: `local.yaml YAML 解析失败（${String(e && e.message ? e.message : e).split('\n')[0]}）——键清单不可信，先修复文件（doctor local_yaml_integrity 维度有指引）` }
  }
  return { ok: true, keys: parseKnownFailureKeys(text) }
}

/**
 * 文件级增删（读 → applyKnownFailureEdit → 原子写）。
 * @param {string} yamlPath
 * @param {{ add?: string[], remove?: string[] }} edit
 * @returns {{ ok: boolean, keys?: string[], error?: string }}
 */
export function mutateKnownFailuresFile(yamlPath, edit) {
  if (!existsSync(yamlPath)) return { ok: false, error: `local.yaml 不存在: ${yamlPath}——先 sillyspec local detect / platform connect 生成，再管理 known_failures` }
  let text
  try {
    text = readFileSync(yamlPath, 'utf8')
  } catch (e) {
    return { ok: false, error: `读取失败: ${e && e.message ? e.message : e}` }
  }
  const r = applyKnownFailureEdit(text, edit)
  if (!r.ok) return r
  if (r.next !== text) writeAtomicSync(yamlPath, r.next)
  return { ok: true, keys: r.keys }
}

/**
 * CLI 入口薄壳（index.js config known-failures 接线消费）：打印 + 退出码。
 * @param {{ yamlPath: string, exists: boolean, verb: string, keys: string[], json: boolean }} p
 * @returns {number} process.exitCode
 */
export function runKnownFailuresCommand({ yamlPath, exists, verb, keys = [], json = false }) {
  const want = verb || 'list'
  if (!['list', 'add', 'remove'].includes(want)) {
    console.error(`❌ 未知动作: config known-failures ${want}`)
    console.error('用法: sillyspec config known-failures list | add <key…> | remove <key…>')
    return 2
  }
  if (want !== 'list' && keys.filter(Boolean).length === 0) {
    console.error(`❌ config known-failures ${want} 需要至少一个键参数（空格分隔多个）`)
    return 2
  }
  if (want === 'list') {
    if (!exists) {
      if (json) console.log(JSON.stringify({ cmd: 'config known-failures list', exists: false }))
      else console.error(`📭 未找到 local.yaml（${yamlPath}）——无 known_failures 可列`)
      return 1
    }
    const r = listKnownFailures(yamlPath)
    if (!r.ok) {
      if (json) console.log(JSON.stringify({ cmd: 'config known-failures list', ok: false, error: r.error }))
      else console.error(`❌ ${r.error}`)
      return 1
    }
    if (json) {
      console.log(JSON.stringify({ cmd: 'config known-failures list', ok: true, count: r.keys.length, keys: r.keys }))
    } else if (r.keys.length === 0) {
      console.log('📭 known_failures 为空（无豁免键）')
    } else {
      console.log(`📋 known_failures（${r.keys.length} 个）:`)
      for (const k of r.keys) console.log(`   - ${k}`)
    }
    return 0
  }
  if (!exists) {
    console.error(`📭 未找到 local.yaml（${yamlPath}）——先 sillyspec local detect / platform connect 生成`)
    return 1
  }
  const r = mutateKnownFailuresFile(yamlPath, want === 'add' ? { add: keys } : { remove: keys })
  if (!r.ok) {
    console.error(`❌ 拒改：${r.error}`)
    return 1
  }
  const uniq = [...new Set(keys.filter(Boolean))]
  if (json) console.log(JSON.stringify({ cmd: `config known-failures ${want}`, ok: true, changed: uniq, keys: r.keys }))
  else {
    console.log(`✅ known_failures 已${want === 'add' ? '添加' : '移除'}：${uniq.join('、')}${want === 'remove' ? '（未命中键静默忽略）' : ''}——现共 ${r.keys.length} 个`)
    console.log(`   校验：sillyspec config known-failures list`)
  }
  return 0
}
