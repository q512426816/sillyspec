/**
 * Plan Postcheck 模块
 *
 * 从 run.js 和 plan.js 拆出的确定性校验逻辑：
 * - 拓扑排序（topoSortWaves）
 * - 蓝图一致性校验（validateBlueprintConsistency）
 * - plan 产物校验（validatePlanArtifacts）
 * - 执行入口（executePlanPostcheck）
 *
 * 这些都是 noAI 步骤，不需要 LLM 参与。
 */
import { existsSync, readFileSync as _readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
// 归一化行尾为 LF：Windows 下 python/编辑器文本模式写 .md 会产生 CRLF，致本模块多处
// frontmatter/字段正则（`^---\n`、`allowed_paths:\s*\n…`、`^goal:` 等）失配，报「缺 frontmatter
// /缺字段」假错误（见缺陷 windows-python-crlf-taskcard）。读取时统一转 LF，一处覆盖全部正则。
const readFileSync = (filePath, encoding) => _readFileSync(filePath, encoding).replace(/\r\n/g, '\n')
import { join as pJoin, basename } from 'path'
import { tmpdir } from 'os'
import jsYaml from 'js-yaml'
import { parseFileChangeList, pathMatches } from '../change-list.js'
import { getRule } from '../stage-contract-spec.js'
import { TASKCARD_PLACEHOLDERS } from '../taskcard-placeholders.js'
import { validateScriptCommands } from './cmd-existence.js'

// ═══════════════════════════════════════════════════════════════
// 解析工具（从 plan.js 迁移）
// ═══════════════════════════════════════════════════════════════

/**
 * 从 task-NN.md frontmatter 解析 depends_on 字段
 * @param {string} content - task 文件内容
 * @returns {string[]}
 */
function parseDependsOn(content) {
  content = content.replace(/\r\n/g, '\n') // 外部调用方（worktree-apply 等）原生 readFileSync 喂 CRLF 时 ^---\n 锚点失配
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  const inlineMatch = fm.match(/depends_on:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
  }
  // 块列表：列表项允许顶格或缩进（[ \t]*，坑6——原 \s* 贪婪吃掉换行与前导空白，
  // 顶格 `depends_on:\n- task-01` 标准 YAML 写法永远失配，静默判「无依赖」）
  const blockMatch = fm.match(/depends_on:[ \t]*\n((?:[ \t]*-[ \t]+.+\n?)+)/)
  if (blockMatch) {
    return blockMatch[1].match(/[ \t]*-[ \t]+(.+)/g)?.map(s => s.replace(/^[ \t]*-[ \t]+/, '').trim().replace(/['"]/g, '')) || []
  }
  return []
}

/**
 * 解析 task-NN.md 的 task id（从 frontmatter 或文件名）
 * @param {string} content - task 文件内容
 * @param {string} filename - 文件名
 * @returns {string|null}
 */
function parseTaskId(content, filename) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const idMatch = fmMatch[1].match(/^id:\s*(.+)/m)
    if (idMatch) return idMatch[1].trim()
  }
  const fileMatch = filename.match(/(task-\d+)/i)
  return fileMatch ? fileMatch[1] : null
}

/**
 * 解析 task-NN.md 的 allowed_paths
 * @param {string} content
 * @returns {string[]}
 */
export function parseAllowedPaths(content) {
  content = content.replace(/\r\n/g, '\n') // 同 parseDependsOn：入口归一，保护喂原始 CRLF 内容的外部调用方
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  const inlineMatch = fm.match(/allowed_paths:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean)
  }
  // 块列表：列表项允许顶格或缩进（坑6①——原 `\s*\n` 的 \s 贪婪匹配换行+前导空白，
  // 标准 YAML 块列表 `allowed_paths:\n- src/a.js`（顶格）永远失配，静默判「缺 allowed_paths」；
  // 缩进式 \s+- 恰可命中是巧合幸存。改 [ \t]*（不吃换行）+ 行内 [ \t]*-[ \t]+ 顶格缩进通吃）
  const blockMatch = fm.match(/allowed_paths:[ \t]*\n((?:[ \t]*-[ \t]+.+\n?)+)/)
  if (blockMatch) {
    // 剥首尾成对反引号（坑7 家族：`src/a.js` 整项以反引号开头时 js-yaml/正则路径带 ` 匹配失败报未覆盖；
    // 与 change-list.js 的 cell 归一化同语义——剥两端包裹引号，不动路径内部字符）
    return blockMatch[1].match(/[ \t]*-[ \t]+(.+)/g)?.map(s => {
      const raw = s.replace(/^[ \t]*-[ \t]+/, '').trim()
      return raw.replace(/^`([^`]*)`$/, '$1').replace(/^['"]|['"]$/g, '').trim()
    }).filter(Boolean) || []
  }
  return []
}

/**
 * 从 task-NN.md frontmatter 解析标量字段（repo / base_commit / head_commit）。
 * 复用 parseTaskContracts 的 frontmatter 提取 + js-yaml load 模式（标量可选字段，正则对引号/空值脆弱）。
 *
 * design §7.2 跨仓 task 卡 frontmatter 协议：
 *   repo: sillyspec          # 可选，缺省='main'（调用方视 null 为 main）
 *   base_commit: <sha>       # 可选，CLI 锡点写入（派发前落盘 base）
 *   head_commit: <sha>       # 可选，CLI 锡点写入（回收 review 前落盘 head）
 *
 * 缺省 / 空值 / 无 frontmatter → null（向后兼容旧 task 卡）。
 * @param {string} content - task 文件内容
 * @param {string} field - frontmatter 字段名
 * @returns {string|null}
 */
function parseFrontmatterScalar(content, field) {
  content = content.replace(/\r\n/g, '\n') // 同 parseAllowedPaths：入口归一 CRLF
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return null
  let fm
  try {
    fm = jsYaml.load(fmMatch[1]) || {}
  } catch {
    return null
  }
  const v = fm[field]
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * 解析 task-NN.md frontmatter 的 repo 字段（跨仓 task 声明）。
 * 缺省=null（=main，调用方按主仓处理）。design §7.2 / D-001。
 * @param {string} content
 * @returns {string|null}
 */
export function parseRepo(content) {
  return parseFrontmatterScalar(content, 'repo')
}

/**
 * 解析 task-NN.md frontmatter 的 base_commit 字段（CLI 派发跨仓 task 前落盘的 base 锡点）。
 * 缺省=null（未锡点 / 单仓 task）。design §7.2 / D-010。
 * @param {string} content
 * @returns {string|null}
 */
export function parseBaseCommit(content) {
  return parseFrontmatterScalar(content, 'base_commit')
}

/**
 * 解析 task-NN.md frontmatter 的 head_commit 字段（CLI 回收 review 前落盘的 head 锡点）。
 * 缺省=null（未锡点 / 单仓 task）。design §7.2 / D-010。
 * @param {string} content
 * @returns {string|null}
 */
export function parseHeadCommit(content) {
  return parseFrontmatterScalar(content, 'head_commit')
}

/**
 * 从 local.yaml 文本解析 repos: 段（跨仓 workspace 注册表）。
 * 与 parseLocalYamlModules 同风格（轻量行扫描，不引 yaml 依赖），结构 Map<repoKey, absolutePath>。
 *
 * design §7.3 local.yaml repos schema：
 *   repos:
 *     sillyspec: C:/Users/qinyi/IdeaProjects/sillyspec
 *     # main 不用注册（隐式 = cwd / specRoot 父目录）
 *
 * 无 repos 段 / 空段 / 入参空 → 空 Map（单仓 change 不读，向后兼容）。
 *
 * **职责边界**：本函数只 parse local.yaml 文本，不读 local.yaml 文件（文件读取入口归
 * execute 启动 / task-09）。本函数不校验 declaredRepos ⊆ registry（D-007 fail-closed
 * 校验在 MultiRepoContext 构造时做）。
 * @param {string} yamlText
 * @returns {Map<string, string>} repoKey → absolutePath
 */
export function parseRepoRegistry(yamlText) {
  const reg = new Map()
  if (!yamlText) return reg
  // CRLF 归一（坑 register-repo-crlf-idempotent-loop，2026-08-23 实证：Windows 下 agent Write
  // 工具/编辑器写出的 local.yaml 带 \r——条目正则 `(.*)$` 的 `.` 不匹配 \r、`$` 又要求真串尾，
  // 行尾残留 \r 时整条失配 → 空 Map → MultiRepoContext fail-closed 报「未注册」→ register-repo
  // 幂等跳过不落盘 → 死循环。同文件 parseAllowedPaths/parseDependsOn/parseBaseCommit 均有此
  // 归一，本函数是唯一缺口）
  const lines = String(yamlText).replace(/\r\n?/g, '\n').split('\n')
  let startIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^repos:\s*(?:#.*)?$/.test(lines[i])) { startIdx = i; break }
  }
  if (startIdx === -1) return reg
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    // 遇到新的顶层 key（行首非空格且非注释）→ repos 段结束
    if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('#') && line.trim() !== '') break
    // 条目格式：  <key>: <value>（key 限 [A-Za-z0-9_.\-]，与 parseLocalYamlModules 对齐）
    const entry = line.match(/^\s+([A-Za-z0-9_.\-]+):\s*(.*)$/)
    if (!entry) continue
    const value = (entry[2] || '').trim()
    if (value === '' || value.startsWith('#')) continue
    // 去可选行内注释（`value # comment`）—— 注意路径不含 ` #`，注释前必带空格
    const cleaned = value.replace(/\s+#.*$/, '').trim()
    if (cleaned === '') continue
    // 去首尾可选引号（YAML 字符串引用），保留路径内反斜杠原样
    const path = cleaned.replace(/^['"]|['"]$/g, '')
    if (path === '') continue
    reg.set(entry[1], path)
  }
  return reg
}

/**
 * 检查 task-NN.md 是否包含验收标准章节
 * @param {string} content
 * @returns {boolean}
 */
function hasAcceptanceCriteria(content) {
  // 新模板把 goal/implementation/acceptance/verify/constraints 放在 frontmatter
  // （acceptance: 作为 fm 字段），老格式或人工写的卡片可能用 body 章节。
  // 两种都认，避免「模板格式」与「postcheck 判定」不一致导致卡片过不了校验。
  if (/^acceptance:/m.test(content)) return true
  return /##\s*验收标准/.test(content) || /##\s*Acceptance/.test(content)
}

/**
 * 检查 task-NN.md 是否包含 TDD/验证步骤
 * @param {string} content
 * @returns {boolean}
 */
function hasTddOrVerify(content) {
  // 同 hasAcceptanceCriteria：新模板用 frontmatter 的 verify: 字段，老格式用 body 章节。
  if (/^verify:/m.test(content)) return true
  return /##\s*TDD/.test(content) || /##\s*验证/.test(content) || /##\s*Verify/.test(content)
}

/**
 * 解析 task-NN.md 的跨任务契约字段 provides / expects_from
 * 用 js-yaml 解析 frontmatter（嵌套结构，正则不可靠）。
 * provides/expects_from 为可选字段；缺失或解析失败时返回空（不阻断）。
 * @param {string} content - task 文件内容
 * @returns {{ provides: Array<{contract, fields}>, expectsFrom: Record<string, Array<{contract, needs}>> }}
 */
export function parseTaskContracts(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return { provides: [], expectsFrom: {} }
  let fm
  try {
    fm = jsYaml.load(fmMatch[1]) || {}
  } catch {
    // frontmatter 非合法 YAML（老格式/手写不规范）—— 当作无契约字段，不阻断
    return { provides: [], expectsFrom: {} }
  }

  const provides = Array.isArray(fm.provides)
    ? fm.provides.map(p => ({
        contract: String(p?.contract || ''),
        fields: Array.isArray(p?.fields) ? p.fields.map(String) : [],
      })).filter(p => p.contract)
    : []

  const expectsFrom = {}
  if (fm.expects_from && typeof fm.expects_from === 'object' && !Array.isArray(fm.expects_from)) {
    for (const [providerTask, contracts] of Object.entries(fm.expects_from)) {
      if (!Array.isArray(contracts)) continue
      expectsFrom[providerTask] = contracts
        .map(c => ({
          contract: String(c?.contract || ''),
          needs: Array.isArray(c?.needs) ? c.needs.map(String) : [],
        }))
        .filter(c => c.contract)
    }
  }

  return { provides, expectsFrom }
}

// ═══════════════════════════════════════════════════════════════
// 核心逻辑
// ═══════════════════════════════════════════════════════════════

/**
 * 拓扑排序：根据 depends_on 计算波次
 * @param {Map<string, string[]>} depMap - taskId → depends_on list
 * @returns {{ waves: string[][], error: string|null }}
 */
export function topoSortWaves(depMap) {
  const tasks = [...depMap.keys()]
  const waves = []
  const assigned = new Set()
  const visited = new Set()

  // 先做循环依赖检测（DFS）
  function hasCycle(task, path) {
    if (path.has(task)) return true
    if (visited.has(task)) return false
    path.add(task)
    const deps = depMap.get(task) || []
    for (const dep of deps) {
      if (!depMap.has(dep)) continue // 依赖不存在（可能是外部引用），跳过
      if (hasCycle(dep, path)) return true
    }
    path.delete(task)
    visited.add(task)
    return false
  }
  for (const task of tasks) {
    if (hasCycle(task, new Set())) {
      return { waves: [], error: `检测到循环依赖，涉及 task: ${task}` }
    }
  }

  // 逐层分配 Wave
  while (assigned.size < tasks.length) {
    const currentWave = []
    for (const task of tasks) {
      if (assigned.has(task)) continue
      const deps = (depMap.get(task) || []).filter(d => depMap.has(d))
      if (deps.every(d => assigned.has(d))) {
        currentWave.push(task)
      }
    }
    if (currentWave.length === 0) {
      const remaining = tasks.filter(t => !assigned.has(t))
      return { waves: [], error: `无法解析依赖关系，剩余 task: ${remaining.join(', ')}` }
    }
    for (const task of currentWave) {
      assigned.add(task)
    }
    waves.push(currentWave)
  }

  return { waves, error: null }
}

/**
 * 解析 plan.md 显式 Wave 分组 → Map<taskId, waveIndex>。
 *
 * Wave 口径与 execute.js parseWavesFromPlan 一致（execute 的真实并行单元，非 topoSort 建议值）：
 *   - `## Wave N` 标题下的 task-XX checkbox 归入 Wave N；
 *   - 非 Wave 标题行（## 自检 等）退出当前 Wave 段，避免其 checkbox 混入。
 * 返回 null = plan.md 不存在或无显式 Wave 标题 → execute 会把所有 task 放进单个隐式 Wave
 * 全并行（execute.js:402-408），调用方据此判「同文件即冲突」。
 *
 * @param {string} planPath - plan.md 绝对路径
 * @returns {Map<string, number>|null} taskId → waveIndex；null = 无显式 Wave
 */
function parseTaskWavesFromPlan(planPath) {
  if (!existsSync(planPath)) return null
  const content = readFileSync(planPath, 'utf8')
  if (!/^#+\s*Wave\s+\d+/im.test(content)) return null
  const map = new Map()
  let currentWave = null
  for (const line of content.split('\n')) {
    const wm = line.match(/^#+\s*Wave\s+(\d+)/i)
    if (wm) { currentWave = parseInt(wm[1], 10); continue }
    if (/^#+\s/.test(line)) { currentWave = null; continue } // 非 Wave 标题退出当前 Wave 段
    // 2026-08-20-task-truth-unify：Wave 段下为纯 ID 引用行（- task-XX）；旧 checkbox 行同收
    // （旧变更读侧兼容——新格式由 validatePlanForExecute 拦旧形态，此处不重复把关）
    const tm = line.match(/^[-*]\s+(?:\[[ x]\]\s*)?(task-\d+)\s*[:：\s]*$/i)
      || line.match(/^[-*]\s*\[[ x]\]\s*(task-\d+)\b/i)
    // id 归一补零（与卡片/注册表 task-01 口径一致，坑 wave-ref-unpadded）：plan.md 写
    // `- task-1` 时裸用捕获原文做 key，永远匹配不到卡片 id task-01 → 被判「未列入任何
    // Wave」，同 Wave 共享文件检测静默跳过。execute.js parseWavesFromPlan 已补零，对齐。
    if (tm && currentWave !== null) map.set(String(tm[1]).replace(/^task-(\d+)$/i, (_, n) => `task-${n.padStart(2, '0')}`), currentWave)
  }
  return map
}

/**
 * 收集任务卡 depends_on → Map<taskId, deps>（Wave 重排 / plan-adopt-waves 共用）。
 * taskId 优先取卡内 frontmatter id:（与文件名解耦——文件名 task-01 但 id 改写过时以 id 为准）。
 * @param {string} tasksDir - changes/<name>/tasks 目录
 * @returns {Map<string, string[]>}
 */
export function collectTaskDepMap(tasksDir) {
  const depMap = new Map()
  if (!existsSync(tasksDir)) return depMap
  for (const file of readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    let taskId = file.replace('.md', '')
    if (fmMatch) {
      const idMatch = fmMatch[1].match(/^id:\s*(.+)/m)
      if (idMatch) taskId = idMatch[1].trim()
    }
    depMap.set(taskId, parseDependsOn(content))
  }
  return depMap
}

/**
 * 本地一致性校验器
 * @param {string} changeDir - 变更目录
 * @param {{ repoRegistry?: Map<string,string> }} [opts]
 *   repoRegistry：local.yaml repos: 段解析结果（executePlanPostcheck 传入）。提供时启用两类
 *   跨仓口径校验：① task 卡 repo: 键未注册 → error（提前到 plan 期拦，不等 execute fail-closed）；
 *   ② allowed_paths 带其他注册键前缀 → warning。缺省（plan-adopt-waves / 单仓旧调用）只做
 *   无注册表依赖的形态校验（绝对路径 / 自仓前缀），零回归。
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateBlueprintConsistency(changeDir, opts = {}) {
  const errors = []
  const warnings = []
  const repoRegistry = opts.repoRegistry instanceof Map ? opts.repoRegistry : null

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: false, errors: ['tasks/ 目录不存在'], warnings }
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: false, errors: ['tasks/ 目录下没有 task-NN.md 文件'], warnings }
  }

  // task 卡片基础字段文案从 manifest 同源(plan.task-card-structure);${id} 由下方 `${taskId} (${file})` 替换。
  const bsRule = getRule('plan.task-card-structure')
  const taskInfo = new Map()
  // pathOwners 按 (repo, path) 二元组聚合（design §5.3 约束③ / D-008）：键 = `${repo}|${path}`，
  // repo 缺省='main'（parseRepo 返 null → main）。跨仓 task 与主仓 task 同名物理路径分属不同 repo
  // → 二元组键不同 → 不误判同 Wave 冲突（如主仓 src/task-review.js vs sillyspec src/task-review.js）。
  // ⚠️ 键分隔符 `|` 假设 repo 名与 path 均不含 `|`（repo 名约束 [A-Za-z0-9_.\-]、path 含 / \，极低概率含 |）。
  // value 结构 { repo, path, owners }：冲突文案对外仍显示纯 path（用户体验），内部按二元组判冲突。
  const pathOwners = new Map()

  for (const file of taskFiles) {
    const filePath = pJoin(tasksDir, file)
    const content = readFileSync(filePath, 'utf8')
    const taskId = parseTaskId(content, file)
    if (!taskId) {
      errors.push(`${file}: 无法解析 task id`)
      continue
    }

    const dependsOn = parseDependsOn(content)
    const allowedPaths = parseAllowedPaths(content)
    const hasAcceptance = hasAcceptanceCriteria(content)
    const hasTdd = hasTddOrVerify(content)
    // repo 缺省='main'（parseRepo 返 null → 单仓 task，与既有行为零回归）
    const repo = parseRepo(content) || 'main'

    taskInfo.set(taskId, { dependsOn, allowedPaths, hasAcceptance, hasTdd, file })

    if (allowedPaths.length === 0) {
      errors.push(bsRule.data.messageAllowedPaths.replaceAll('${id}', `${taskId} (${file})`))
    }
    if (!hasAcceptance) {
      errors.push(bsRule.data.messageAcceptance.replaceAll('${id}', `${taskId} (${file})`))
    }
    if (!hasTdd) {
      warnings.push(bsRule.data.messageTdd.replaceAll('${id}', `${taskId} (${file})`))
    }

    // ── 跨仓路径口径校验（坑 cross-repo-allowed-path-base，2026-08-26 实证）──
    // allowed_paths 的统一口径 = task 卡 repo: 声明仓的**仓根相对路径**（review 归属按
    // `git -C <仓根> diff` 产出的仓根相对路径匹配、design 覆盖对账按「## <repo> 仓变更」
    // 段内相对路径匹配）。agent 生成跨仓 task 卡时易把仓库名前缀 / 绝对盘符路径写进
    // allowed_paths（如 sub-grid-security/src/...），两种对账都永不命中——task 改完却判
    // 「无归属」、design 报「未被覆盖」，错误信号在下游且误导。此处前置拦根因：
    //   绝对路径 / 自仓前缀（repo: X + 路径以 X/ 开头）→ error 硬拦（无合法布局）；
    //   其他注册键前缀 → warning（主仓内与 repo 同名目录的罕见合法布局不阻断）。
    for (const p of allowedPaths) {
      const isAbsoluteShape = p.startsWith('/') || p.startsWith('\\\\') || /^[A-Za-z]:[\\/]/.test(p)
      if (isAbsoluteShape) {
        errors.push(
          `${taskId} (${file}): allowed_paths 含绝对路径「${p}」——必须写 repo 声明仓的仓根相对路径（如 src/routes/x.js）。` +
          `绝对路径在 review 归属对账（git -C <仓根> diff 产仓根相对路径）与 design 覆盖对账中永不命中，task 改完会被判「无归属」。`
        )
        continue
      }
      const firstSeg = p.split(/[\\/]/)[0]
      if (repo !== 'main' && firstSeg === repo) {
        errors.push(
          `${taskId} (${file}): allowed_paths「${p}」带了自仓前缀「${repo}/」——该 task 已声明 repo: ${repo}，子代理 workdir 即该仓根，` +
          `路径应为仓根相对（${p.slice(repo.length + 1)}），去掉前缀「${repo}/」。带前缀路径在两种对账中永不命中。`
        )
      } else if (repoRegistry && firstSeg !== 'main' && repoRegistry.has(firstSeg)) {
        warnings.push(
          `${taskId} (${file}): allowed_paths「${p}」首段「${firstSeg}」是 local.yaml repos: 注册键——` +
          `若本 task 属于该跨仓仓：补 repo: ${firstSeg} 并去掉路径前缀（仓根相对）；` +
          `若主仓内确有同名目录（罕见合法布局）：忽略本警告。`
        )
      }
    }

    // repo: 键注册校验（仅注册表可用时；execute 启动 MultiRepoContext 也会 fail-closed 拦，
    // 此处提前到 plan --done，报错即给注册命令，不等 execute 才发现）
    if (repoRegistry && repo !== 'main' && !repoRegistry.has(repo)) {
      errors.push(
        `${taskId} (${file}): repo: ${repo} 未在 local.yaml repos: 段注册——先跑 ` +
        `\`sillyspec local register-repo ${repo} <${repo} 仓根路径>\` 注册（main 隐式不用注册），` +
        `否则 execute 启动 fail-closed 阻断。`
      )
    }

    for (const p of allowedPaths) {
      const key = `${repo}|${p}`
      if (!pathOwners.has(key)) pathOwners.set(key, { repo, path: p, owners: [] })
      pathOwners.get(key).owners.push(taskId)
    }
  }

  // 路径冲突（Wave 感知）：同 repo 同 Wave 内 >1 task 共享 allowed_path → execute 强制并行（execute.js:603）
  // 子代理会互相覆盖该文件 → error。跨 Wave 同文件 → 串行执行安全 → warning。
  // 按 (repo, path) 二元组判冲突（约束③）：跨仓 task 与主仓 task 同名路径不误判（不同 repo → 不同键）。
  // Wave 口径 = plan.md 显式 `## Wave N`（parseTaskWavesFromPlan，与 execute 同源，非 topoSort 建议值）；
  // plan.md 无显式 Wave → execute 全并行（隐式单 Wave，execute.js:402-408）→ 同 repo 同文件即冲突。
  const waveOfTask = parseTaskWavesFromPlan(pJoin(changeDir, 'plan.md'))
  for (const [, { repo, path: p, owners }] of pathOwners) {
    if (owners.length < 2) continue
    if (waveOfTask === null) {
      errors.push(
        `路径 ${p} 被 ${owners.length} 个 task 修改: ${owners.join(', ')} — plan.md 无显式 Wave 划分，` +
        `execute 会把它们放进同一隐式 Wave 全并行（execute.js:402-408），子代理互相覆盖。` +
        `解法：拆到不同 Wave（串行），或合并为单个 task。`
      )
      continue
    }
    // 显式 Wave：按 wave 分组 owners，找同 Wave 冲突
    const byWave = new Map()
    for (const t of owners) {
      const w = waveOfTask.get(t)
      if (w === undefined) continue // 未列入任何 Wave → execute 不执行，不参与冲突判定
      if (!byWave.has(w)) byWave.set(w, [])
      byWave.get(w).push(t)
    }
    for (const [w, ts] of byWave) {
      if (ts.length > 1) {
        errors.push(
          `路径 ${p} 被 Wave ${w} 内 ${ts.length} 个 task 修改: ${ts.join(', ')} — 同 Wave 任务 execute 强制并行（execute.js:603），` +
          `子代理会互相覆盖该文件。解法：把它们拆到不同 Wave（串行）。` +
          `（注：quick 阶段对同文件并发只提示不阻断——那是轻量流程无并行子代理、最坏后果 git 可分离；` +
          `此处硬拦是因并行覆盖不可自动恢复，两阶段宽严不同是设计使然）`
        )
      }
    }
    // 跨 Wave 共享：串行安全，仅提示
    if (byWave.size > 1) {
      warnings.push(`路径 ${p} 跨 Wave 被修改: ${owners.join(', ')}（不同 Wave 串行执行，安全；确认是否有意共享）`)
    }
  }

  // 任务声明 ↔ tasks/ 卡片双向对账（债单 D-2b；2026-08-20-task-truth-unify：声明源迁 tasks.md 注册表）：
  // 注册表列 17 任务只出 12 卡（尾部文档同步类任务漏卡）时，无卡任务不进 Wave、
  // 不受 execute 审计 → 零失败信号漏做。口径与 execute.js parseTaskRegistry 一致
  // （`- [ ] task-NN` checkbox 行；file 命名 task-NN.md + 卡内 id task-NN 均取，缺一即漏卡）。
  const planMdPath = pJoin(changeDir, 'plan.md')
  const declaredIds = new Set()
  const tasksMdPath = pJoin(changeDir, 'tasks.md')
  if (existsSync(tasksMdPath)) {
    for (const line of readFileSync(tasksMdPath, 'utf8').split('\n')) {
      const m = line.match(/^[-*]\s*\[[ x]\]\s*(task-\d+)\b/i)
      if (m) declaredIds.add(m[1].toLowerCase())
    }
  }
  if (declaredIds.size === 0 && existsSync(planMdPath)) {
    // 兼容读侧：tasks.md 缺失/无声明时回退解析 plan.md 旧 checkbox 声明（旧归档变更）
    for (const line of readFileSync(planMdPath, 'utf8').split('\n')) {
      const m = line.match(/^[-*]\s*\[[ x]\]\s*(task-\d+)\b/i)
      if (m) declaredIds.add(m[1].toLowerCase())
    }
  }
  if (declaredIds.size > 0) {
    const tprRule = getRule('plan.task-plan-reconciliation')
    const cardIds = new Set([...taskInfo.keys()].map(id => id.toLowerCase()))
    const missing = [...declaredIds].filter(id => !cardIds.has(id))
    if (missing.length > 0) {
      errors.push(
        tprRule.data.messageMissingCards
          .replaceAll('${declared}', declaredIds.size)
          .replaceAll('${missing}', missing.join(', '))
      )
    }
    const orphans = [...cardIds].filter(id => !declaredIds.has(id))
    if (orphans.length > 0) {
      errors.push(
        tprRule.data.messageOrphanCards.replaceAll('${orphans}', orphans.join(', '))
      )
    }
  }
  // declaredIds.size === 0：注册表无 task 声明（极端格式）→ 跳过对账，
  // 由 validatePlanArtifacts/validatePlanForExecute 把关，不在此误伤。

  // 拓扑排序 + 循环依赖
  const depMap = new Map()
  for (const [taskId, info] of taskInfo) {
    depMap.set(taskId, info.dependsOn)
  }
  const { error: topoError } = topoSortWaves(depMap)
  if (topoError) {
    errors.push(topoError)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * 跨任务契约校验器：对账 consumer.expects_from ↔ provider.provides
 *
 * 修复场景：consumer task 声明期望 provider 产出某 DTO 的某字段，
 * 但 provider 的 provides 未承诺（或字段缺失）→ plan 阶段阻断，
 * 避免到 execute/verify 才暴露（典型表现：前端 fallback 错误字段 → 403/500）。
 *
 * provides / expects_from 均为可选字段：未声明时不校验（向后兼容）。
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateCrossTaskContracts(changeDir) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: true, errors, warnings }
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings }
  }

  // 第一遍：收集每个 task 的 provides（taskId → Map(contract → Set(fields))）
  const providesByTask = new Map()
  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const taskId = parseTaskId(content, file)
    if (!taskId) continue
    const { provides } = parseTaskContracts(content)
    const contractMap = new Map()
    for (const p of provides) {
      contractMap.set(p.contract, new Set(p.fields))
    }
    providesByTask.set(taskId, contractMap)
  }

  // 第二遍：校验每个 consumer 的 expects_from 是否被 provider.provides 覆盖。
  // 3 种断裂文案(unknown-provider / undeclared / missing-fields)从 manifest 同源
  // (plan.cross-task-contract.data),${consumer}/${provider}/${contract}/${needs}/${available} replaceAll。
  const ctRule = getRule('plan.cross-task-contract')
  const renderCtMsg = (tmpl, consumer, provider, contract, needs, available) => tmpl
    .replaceAll('${consumer}', consumer)
    .replaceAll('${provider}', provider)
    .replaceAll('${contract}', contract)
    .replaceAll('${needs}', needs)
    .replaceAll('${available}', available)
  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const consumerId = parseTaskId(content, file)
    if (!consumerId) continue
    const { expectsFrom } = parseTaskContracts(content)

    for (const [providerTask, contracts] of Object.entries(expectsFrom)) {
      if (!providesByTask.has(providerTask)) {
        for (const c of contracts) {
          errors.push(renderCtMsg(ctRule.data.messageUnknownProvider, consumerId, providerTask, c.contract, c.needs.join(', '), ''))
        }
        continue
      }

      const providerContracts = providesByTask.get(providerTask)
      for (const c of contracts) {
        const providerFields = providerContracts.get(c.contract)
        if (providerFields === undefined) {
          errors.push(renderCtMsg(ctRule.data.messageUndeclaredContract, consumerId, providerTask, c.contract, c.needs.join(', '), ''))
          continue
        }
        const missing = c.needs.filter(f => !providerFields.has(f))
        if (missing.length > 0) {
          errors.push(renderCtMsg(ctRule.data.messageMissingFields, consumerId, providerTask, c.contract, missing.join(', '), [...providerFields].join(', ')))
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * 从 local.yaml 文本解析 modules 块（monorepo 子包定位）。
 *
 * 与 verify-postcheck.extractModules 同风格（轻量行扫描，不引 yaml 依赖），不复用是为避免
 * plan-postcheck → verify-postcheck → contract-matrix → plan-postcheck 的循环导入。
 * 只取 path 字段（test 字段此处用不到），结构 { name: { path } }。
 *
 *   modules:
 *     backend: { path: "backend/", test: "cd backend && uv run pytest" }
 *
 * @param {string} yamlText
 * @returns {Record<string, {path:string}>|null} 无 modules 块或无有效条目 → null
 */
export function parseLocalYamlModules(yamlText) {
  if (!yamlText) return null
  const lines = yamlText.split('\n')
  let startIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^modules:\s*(?:#.*)?$/.test(lines[i])) { startIdx = i; break }
  }
  if (startIdx === -1) return null
  const modules = {}
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    const entry = line.match(/^([ \t]+)([A-Za-z0-9_.\-]+):\s*(.*)$/)
    if (!entry) {
      // 遇到新的顶层 key（行首非空格且非注释）→ modules 块结束
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('#') && line.trim() !== '') break
      continue
    }
    // 条目缩进放宽为「任意非零空白」（坑 modules-indent-hardcoded）：此前硬编码恰 2 空格，
    // 4 空格/Tab 缩进的条目不匹配且不触发块结束 → 被静默跳过 → modules 丢失 →
    // validateScriptCommands 退化为只查根 package.json，monorepo 子包命令被误报不存在。
    const rest = entry[3] || ''
    // path 值：带引号或不带引号（flow mapping），取第一个匹配
    const pathMatch = rest.match(/path:\s*"([^"]+)"/) || rest.match(/path:\s*([^,\s}]+)/)
    if (pathMatch) modules[entry[2]] = { path: pathMatch[1] }
  }
  return Object.keys(modules).length > 0 ? modules : null
}

/**
 * TaskCard 命令存在性校验器（调共享 validateScriptCommands，硬阻断）。
 *
 * 修复场景（design D-04 / 问题 3）：TaskCard verify/implementation 写 `pnpm gen:types`
 * 但根 package.json 无此 script（实际在 monorepo 子包 packages 目录下），plan 阶段零校验
 * → execute 子代理跑死命令。scan-postcheck 的命令校验只看 local.yaml 且维持 warning；
 * 本函数对 TaskCard 升 error（同 helper、严重度由调用方定）。
 *
 * modules 从 local.yaml 提取（monorepo 子包感知）：无 modules 块时仅查根 package.json
 * （与 scan-postcheck 历史行为一致）；有 modules 块时多候选子包 package.json 任一命中即通过。
 *
 * @param {string} changeDir - 变更目录
 * @param {string} projectRoot - 项目根目录（package.json 查找基准）
 * @param {object|null} modules - local.yaml modules 块（{ name: { path } }），可选
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateTaskCommands(changeDir, projectRoot, modules = null) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: true, errors, warnings }
  }
  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings }
  }

  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const taskId = parseTaskId(content, file) || file
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) continue // feasibility 已报 frontmatter 缺失，不重复
    let fm
    try {
      fm = jsYaml.load(fmMatch[1]) || {}
    } catch {
      continue // 非法 YAML 由 feasibility 处理，不重复
    }

    // 合并 verify + implementation 文本（命令可能出现在任一字段）。
    // 字段两形态都收（坑 taskcard-block-list-noop）：规范格式（taskcard.js 骨架 / plan 模板）的
    // verify/implementation 是 YAML 块列表 → js-yaml 解析为数组；此前只收 string，规范卡片
    // 恒落空 → 「命令存在性校验」（hard-error）对合规 TaskCard 整体 no-op，只有违规写成
    // 纯标量的卡片才被校验。数组按行 join 回文本，与标量同管道。
    const toCmdText = (v) => Array.isArray(v) ? v.map(String).join('\n') : (typeof v === 'string' ? v : '')
    const verifyText = toCmdText(fm.verify)
    const implText = toCmdText(fm.implementation)
    const text = `${verifyText}\n${implText}`
    if (!text.trim()) continue

    const { invalid } = validateScriptCommands(text, { projectRoot, modules })
    for (const inv of invalid) {
      errors.push(`${taskId}: ${inv.cmd} 命令不存在（${inv.reason}）`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

// 路径容差匹配（normalizePath / globMatch / pathMatches）复用自 change-list.js，
// design 清单解析与 allowed_paths 对账共用同一套匹配语义，避免两处逻辑漂移。

/**
 * design §6 按仓分段段头识别（D-014）：`## <repo> 仓变更`（如 `## sillyspec 仓变更`）。
 * 段头为 h2，repo 名取段头首 token（去空白/编号前缀）。容忍可选编号前缀与尾随空白/冒号。
 * 不命中（非仓变更段头）→ null。
 */
const REPO_SECTION_HEADER_RE = /^#{2,3}\s+(?:\d+[.)]\s*)?([A-Za-z0-9_.\-]+)\s*仓变更\s*[:：]?\s*$/

/**
 * design §6 文件清单章节标题（与 change-list.js FILE_LIST_SECTION_RE 同源，避免 import 私有常量）。
 * 容忍可选编号前缀（`## 6. 文件变更清单`），与 change-list 解析口径一致。
 */
const FILE_LIST_SECTION_RE = /^#{2,3}\s*(?:\d+[.)]\s*)?(文件变更清单|变更文件清单|文件清单|File Changes|Files to Change)/im

/**
 * 按 repo 解析 design §6 文件清单（约束③ / D-014）。
 *
 * 支持 design §6 按仓分段：`## <repo> 仓变更` 段头下的路径归该 repo；无段头时整章节归 'main'
 * （向后兼容单仓 design，与原 parseFileChangeList 行为等价）。段内路径解析复用 parseFileChangeList
 * （表格列定位 / exclude 子段 / 占位符过滤 / CRLF 容错全部继承，零漂移）——方法是：把每段内容包成
 * 临时 design 文件（前置标准 `## 文件变更清单` 标题），写 OS tmp 调 parseFileChangeList，立即清理。
 *
 * 为什么不复用单次 parseFileChangeList：change-list.js 的通用 parser 把段头 `## <repo> 仓变更`
 * 当成「下一个 ## 章节」截断主章节（line 173 `^##\s`），跨仓段路径会丢——这正是 task-03 要修的。
 *
 * 返回值结构（与 pathOwners 二元组对齐）：
 *   Map<repo, Set<path>> —— 每个 repo 的 design 清单路径集
 *   外加 _hasSegmentHeader 标记（调用方据此决定是否走分段对账路径）
 *
 * @param {string} designPath - design.md 绝对路径
 * @returns {{ byRepo: Map<string, Set<string>>, hasSegmentHeader: boolean, allFiles: string[] }}
 */
function parseDesignCoverageByRepo(designPath) {
  const byRepo = new Map()
  const allFiles = []
  if (!designPath || !existsSync(designPath)) {
    return { byRepo, hasSegmentHeader: false, allFiles }
  }
  const content = readFileSync(designPath, 'utf8')

  const sectionMatch = content.match(FILE_LIST_SECTION_RE)
  if (!sectionMatch) {
    return { byRepo, hasSegmentHeader: false, allFiles }
  }

  // 主章节起点（match index）→ 扫描到下一个非段头的 `## ` 标题或文件末尾。
  // 段头 `## <repo> 仓变更` 是 h2 但属本章节的子分段，不应触发章节结束。
  const lines = content.slice(sectionMatch.index).split('\n')
  // 先扫一遍：本章节内是否含至少一个段头（决定 hasSegmentHeader / 走分段路径 vs 退化路径）
  let hasSegmentHeader = false
  const sectionLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (i > 0 && /^##\s/.test(line) && !REPO_SECTION_HEADER_RE.test(line)) {
      // 遇到非段头的 h2 标题（如 `## 7. 接口定义`）→ 主章节结束
      break
    }
    if (REPO_SECTION_HEADER_RE.test(line)) hasSegmentHeader = true
    sectionLines.push(line)
  }

  if (!hasSegmentHeader) {
    // 无段头 → 整章节归 main（等价原 parseFileChangeList 行为）。
    // keepSillyspecDocs=true：.sillyspec/docs/ 模块文档 = 交付物，与 apply 阶段
    // resolveApplyAllowSet 口径一致（债单 D-2）——design 声明的模块文档更新必须被 task 认领。
    const main = new Set(parseFileChangeList(designPath, { keepSillyspecDocs: true }))
    if (main.size > 0) byRepo.set('main', main)
    for (const p of main) allFiles.push(p)
    return { byRepo, hasSegmentHeader: false, allFiles }
  }

  // 有段头 → 按 repo 切片，每段构造临时 design 调 parseFileChangeList
  // 当前 repo：段头之前的内容（主章节标题到第一个段头之间）归 'main'
  let currentRepo = 'main'
  const segments = new Map() // repo -> 行数组（含表格/列表，不含段头本身）
  let beforeFirstHeader = [] // 段头之前的 main 段内容
  let seenHeader = false
  for (const line of sectionLines.slice(1)) { // 跳过主章节标题行（sectionLines[0]）
    const hdr = line.match(REPO_SECTION_HEADER_RE)
    if (hdr) {
      currentRepo = hdr[1]
      seenHeader = true
      if (!segments.has(currentRepo)) segments.set(currentRepo, [])
      continue
    }
    if (!seenHeader) {
      beforeFirstHeader.push(line)
    } else {
      segments.get(currentRepo).push(line)
    }
  }

  // 段头之前的 main 段（若有内容）也要对账
  if (beforeFirstHeader.filter(l => l.trim()).length > 0) {
    segments.set('main', beforeFirstHeader)
  }

  const tmpDir = mkdtempSync(pJoin(tmpdir(), 'design-cov-seg-'))
  try {
    for (const [repo, segLines] of segments) {
      // 把段内容包成完整 design md（前置主章节标题，让 parseFileChangeList 识别章节起点）
      const virtualDesign = ['## 文件变更清单', '', ...segLines, ''].join('\n')
      const tmpPath = pJoin(tmpDir, `${repo}.md`)
      writeFileSync(tmpPath, virtualDesign)
      const segFiles = [...parseFileChangeList(tmpPath, { keepSillyspecDocs: true })]
      if (segFiles.length === 0) continue
      const set = byRepo.get(repo) || new Set()
      for (const p of segFiles) { set.add(p); allFiles.push(p) }
      byRepo.set(repo, set)
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }

  return { byRepo, hasSegmentHeader: true, allFiles }
}

/**
 * design.md 文件变更清单 → tasks allowed_paths 覆盖对账
 *
 * 修复场景：design.md 声明要改某源码文件（如 access-guide UI），但没有任何 task 的
 * allowed_paths 覆盖它 → execute 子代理被 allowed_paths 锁死不能碰它 → UI 没改
 * （「页面还是错的」），而 verify 一路对照 task 卡片循环验证照样 PASS。
 *
 * 在 plan-postcheck（execute 前）确定性拦截：design 清单中每个源码文件必须被
 * 至少一个 task 的 allowed_paths 覆盖（前缀 / glob 容差匹配）。
 *
 * 跨仓分段对账（约束③ / D-014）：design §6 支持 `## <repo> 仓变更` 段头按仓分段，
 * task allowed_paths 按 (repo, path) 二元组归属——跨仓 task 的 allowed_paths 只覆盖
 * 对应 repo 段的 design 清单，不与主仓段交叉误判。无段头时整章节归 main（零回归）。
 *
 * fail-open 边界（不阻断）：design.md 不存在、无 task 卡片（none 级别）、
 * task 卡片均无 allowed_paths（由 validatePlanFeasibility 把关）。
 * 阻断边界：有 task 卡片但 design 缺清单章节（light/full 已生成 task → design 必有清单）、
 * 清单文件未被任何 task 的 allowed_paths 覆盖。
 *
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[], designFiles: string[], uncovered: string[] }}
 */
export function validateDesignFileCoverage(changeDir) {
  const errors = []
  const warnings = []

  const designPath = pJoin(changeDir, 'design.md')
  if (!existsSync(designPath)) {
    return { ok: true, errors, warnings, designFiles: [], uncovered: [] }
  }

  const tasksDir = pJoin(changeDir, 'tasks')
  const taskFiles = existsSync(tasksDir)
    ? readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
    : []

  // 无 task 卡片（plan_level=none 或老变更）→ 无对账对象，fail-open
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings, designFiles: [], uncovered: [] }
  }

  // 按仓分段解析 design §6（约束③）：段头 `## <repo> 仓变更` → 段内路径归该 repo；无段头 → 全 main
  const { byRepo: designByRepo, hasSegmentHeader, allFiles: designFiles } = parseDesignCoverageByRepo(designPath)
  // 两种断裂文案(缺清单章节 / 文件未覆盖)从 manifest 同源(plan.design-file-coverage.data)。
  const dcRule = getRule('plan.design-file-coverage')
  if (designFiles.length === 0) {
    // 走到 plan-postcheck 说明已生成 task 卡片（light/full），brainstorm 模板规定清单必填。
    // 无清单 = design↔execute 偏差温床（覆盖对账无从对起），阻断，不让它静默放过。
    errors.push(dcRule.data.messageMissingList)
    return { ok: false, errors, warnings, designFiles: [], uncovered: [] }
  }

  // task allowed_paths 也按 (repo, path) 二元组收集（与 pathOwners 同口径，约束③）：
  // 跨仓 task 的 allowed_paths 只覆盖对应 repo 的 design 段，不与主仓段交叉误判。
  const taskAllowedByRepo = new Map() // repo -> string[]
  let totalAllowed = 0
  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const repo = parseRepo(content) || 'main'
    const allowed = parseAllowedPaths(content)
    if (allowed.length === 0) continue
    totalAllowed += allowed.length
    const arr = taskAllowedByRepo.get(repo) || []
    arr.push(...allowed)
    taskAllowedByRepo.set(repo, arr)
  }
  if (totalAllowed === 0) {
    return { ok: true, errors, warnings, designFiles, uncovered: [] }
  }

  // 对账：design 的每条 (repo, path) 必须被同 repo 的 task allowed_paths 覆盖。
  // 无分段（单仓）时 byRepo 只含 main，taskAllowedByRepo 也只含 main → 退化原扁平对账（零回归）。
  const uncovered = []
  for (const [repo, paths] of designByRepo) {
    const allowed = taskAllowedByRepo.get(repo) || []
    for (const df of paths) {
      // 同 repo 无 task 声明 → 整段无覆盖；或有 task 但无 pathMatches → 未覆盖
      if (!allowed.some(ap => pathMatches(df, ap))) {
        uncovered.push(hasSegmentHeader ? `[${repo}] ${df}` : df)
      }
    }
  }
  if (uncovered.length > 0) {
    errors.push(
      dcRule.data.messageUncovered
        .replaceAll('${count}', uncovered.length)
        .replaceAll('${files}', uncovered.map(f => `     • ${f}`).join('\n'))
    )
  }

  return { ok: errors.length === 0, errors, warnings, designFiles, uncovered }
}

/**
 * Plan 可行性校验器（本地代码证明 execute 前置条件）
 * 检查 TaskCard 的完整性和可行性
 * @param {string} changeDir - 变更目录
 * @param {string} projectRoot - 项目根目录（用于检查 allowed_paths 是否存在）
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validatePlanFeasibility(changeDir, projectRoot = null) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: true, errors, warnings } // none/light 可能没有 tasks/
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f)).sort()
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings }
  }

  // task 卡片完整 schema 文案从 manifest 同源(plan.task-card-schema);${id} 随检查点取 ${file} / ${taskId || file} / ${taskId}。
  const fsRule = getRule('plan.task-card-schema')
  const allTaskIds = []
  const depMap = new Map()

  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) {
      // 漏闭合 --- 高频坑细化：只报「缺少 YAML frontmatter」不具体，用户须逐轮试错。
      // 有开头 --- 无闭合 / 完全无 --- 分开报并附修复动作（manifest messageFrontmatter 保持
      // 基础句，细化文案内联——同 title_zh 内联先例）。骨架命令从源头保闭合 + LF。
      const firstLine = (content.split('\n')[0] || '').trim()
      errors.push(
        firstLine === '---'
          ? `${file}: frontmatter 未闭合——有开头 --- 但缺少结尾 ---。修复：补一行 --- 闭合（frontmatter 以 --- 行开始并以 --- 行结束），或 sillyspec taskcard <change> --task <task-id> 重新生成安全骨架后填充`
          : `${fsRule.data.messageFrontmatter.replaceAll('${id}', file)}——文件必须以 --- 行开始。修复：sillyspec taskcard <change> --task <task-id> 生成安全骨架后填充`
      )
      continue
    }
    const fm = fmMatch[1]
    const body = content.slice(fmMatch[0].length)

    // 1. 必要字段检查
    const taskId = (fm.match(/^id:\s*(.+)/m)?.[1] || '').trim()
    const title = (fm.match(/^title:\s*(.+)/m)?.[1] || '').trim()
    // 复用 parseAllowedPaths（认 inline [x] + 块式两种写法），与 blueprint consistency / design coverage
    // 三处统一，消除「feasibility 只认块式 → inline 写法被误报 allowed_paths 为空」的漂移（transcript 卡 3 轮根因）。
    const allowedPaths = parseAllowedPaths(content)

    if (!taskId) errors.push(fsRule.data.messageId.replaceAll('${id}', file))
    if (!title) errors.push(fsRule.data.messageTitle.replaceAll('${id}', file))
    // title_zh（中文标题）完整性：子代理常为压 plan.js 的 20~40 行硬上限合并 title/title_zh（静默丢失），
    // postcheck 不校验行数（那是 prompt 劝说）但强制 frontmatter 字段齐全（enforcement 优于放宽劝说）。
    // 无对应 manifest 文案，内联（其余字段文案走 fsRule.data.messageXxx）。prompt-control-debt plan-b。
    const titleZh = (fm.match(/^title_zh:\s*(.+)/m)?.[1] || '').trim()
    if (!titleZh) errors.push(`${taskId || file}: frontmatter 缺少 title_zh（中文标题）——不得为压行数合并/删除字段`)
    if (taskId) allTaskIds.push(taskId)

    // 2. allowed_paths 不为空
    if (allowedPaths.length === 0) {
      errors.push(fsRule.data.messageAllowedPaths.replaceAll('${id}', taskId || file))
    }

    // 3. allowed_paths 文件存在或父目录存在（仅在 projectRoot 提供时检查）
    if (projectRoot && allowedPaths.length > 0) {
      for (const p of allowedPaths) {
        const fullPath = pJoin(projectRoot, p)
        const parentDir = pJoin(fullPath, '..')
        if (!existsSync(fullPath) && !existsSync(parentDir)) {
          warnings.push(`${taskId}: allowed_paths 中的 ${p} 文件和父目录都不存在`)
        }
      }
    }

    // 4. depends_on 引用存在
    const dependsOn = parseDependsOn(content)
    if (taskId) depMap.set(taskId, dependsOn)

    // 5. body/frontmatter 包含必要字段（TaskCard 格式中这些字段在 frontmatter 内）
    const hasGoal = /^goal:/m.test(fm)
    const hasImplementation = /implementation:/m.test(fm)
    const hasAcceptance = /acceptance:/m.test(fm)
    const hasVerify = /verify:/m.test(fm)
    const hasConstraints = /constraints:/m.test(fm)

    if (!hasGoal) errors.push(fsRule.data.messageGoal.replaceAll('${id}', taskId || file))
    if (!hasImplementation) errors.push(fsRule.data.messageImplementation.replaceAll('${id}', taskId || file))
    if (!hasAcceptance) errors.push(fsRule.data.messageAcceptance.replaceAll('${id}', taskId || file))
    if (!hasVerify) errors.push(fsRule.data.messageVerify.replaceAll('${id}', taskId || file))
    if (!hasConstraints) errors.push(fsRule.data.messageConstraints.replaceAll('${id}', taskId || file))

    // 5b. 骨架占位符拦截（坑 taskcard-placeholder-slip，2026-08-24 用户实证：task 卡留成
    // 空骨架、九字段「存在性」全过，直到人工审计才发现）。占位标记是 taskcard.js 生成的
    // 封闭集合（TASKCARD_PLACEHOLDERS 同源导出），精确匹配；verify 字段的占位命令刻意
    // 不拦（可能是真实 tsc 命令）。占位符视同缺字段，与 9 字段缺失同级 error。
    // 先剥 HTML 注释再匹配——骨架尾部注释自身罗列了占位标记清单（填充指引），不剥会把
    // 已填充卡的注释误判成占位残留。
    const contentNoComments = content.replace(/<!--[\s\S]*?-->/g, '')
    const placeholderHits = TASKCARD_PLACEHOLDERS.filter(p => contentNoComments.includes(p.marker))
    if (placeholderHits.length > 0) {
      errors.push(
        (fsRule.data.messagePlaceholder || '${id}: task 卡仍是未填充的生成骨架')
          .replaceAll('${id}', taskId || file)
          .replaceAll('${fields}', placeholderHits.map(p => p.field).join('、'))
      )
    }

    // 6. acceptance best-effort 字段 grep（D-05 软约束，warning 不阻断）
    // 从 acceptance 文本提取 snake_case/camelCase 标识符，grep allowed_paths 指向的源文件；
    // 找不到 → warning（给 LLM 审查提线索，不阻断 execute）。宁漏不噪：只取 snake/camel，
    // 正则天然避开命令（无 _ 或大写）/路径（无 /）/中文；glob allowed_path / 目录 / 不存在文件一律跳过。
    if (projectRoot && hasAcceptance && allowedPaths.length > 0) {
      let acceptanceText = ''
      try {
        const fmObj = jsYaml.load(fm) || {}
        if (typeof fmObj.acceptance === 'string') acceptanceText = fmObj.acceptance
        else if (Array.isArray(fmObj.acceptance)) acceptanceText = fmObj.acceptance.join('\n')
      } catch {
        // frontmatter 非法 YAML（feasibility 未对 fm 做 YAML 解析，可能字面合法但语义复杂）→ 跳过 best-effort
      }
      if (acceptanceText) {
        const IDENT_RE = /(?<![A-Za-z])[a-z]+(?:_[a-z]+)+|(?<![A-Za-z])[a-z]+(?:[A-Z][a-z]+)+/g
        const idents = [...new Set(acceptanceText.match(IDENT_RE) || [])]
        if (idents.length > 0) {
          const readableFiles = []
          for (const ap of allowedPaths) {
            if (ap.includes('*')) continue // glob，跳过（best-effort，不展开）
            try {
              readableFiles.push(readFileSync(pJoin(projectRoot, ap), 'utf8'))
            } catch {
              // 目录 / 不存在 / 不可读 → 跳过（feasibility 3 已对不存在文件提示 warning）
            }
          }
          // 至少读到一个源文件才比对，避免「全没读到 → 全部标识符误报」噪声
          if (readableFiles.length > 0) {
            for (const ident of idents) {
              if (!readableFiles.some(c => c.includes(ident))) {
                warnings.push(`${taskId}: acceptance 提到 ${ident} 但 allowed_paths 源文件未命中`)
              }
            }
          }
        }
      }
    }
  }

  // 4b. depends_on 引用存在性
  for (const [taskId, deps] of depMap) {
    for (const dep of deps) {
      if (!depMap.has(dep)) {
        errors.push(fsRule.data.messageDependsOnMissing.replaceAll('${id}', taskId).replaceAll('${dep}', dep))
      }
    }
  }

  // 5b. depends_on 无环（topoSortWaves 已含循环检测）
  const { error: topoError } = topoSortWaves(depMap)
  if (topoError) {
    errors.push(topoError)
  }

  // 7. task id 连续性
  if (allTaskIds.length > 0) {
    const nums = allTaskIds.map(id => {
      const m = id.match(/task-(\d+)/i)
      return m ? parseInt(m[1], 10) : null
    }).filter(n => n !== null).sort((a, b) => a - b)
    // nums[0]!==1 时跳过 = 兼容旧变更编号不从 1 起（契约同 validatePlanForExecute 检查 3，
    // test/plan-execute-contract.test.mjs Case 10 钉死，勿改）
    if (nums.length > 0 && nums[0] === 1) {
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== i + 1) {
          errors.push(getRule('plan.task-id-continuity').failMessage.replaceAll('${expected}', String(i + 1).padStart(2, '0')).replaceAll('${actual}', String(nums[i]).padStart(2, '0')))
          break
        }
      }
    }
  }

  // 9. plan.md 通过 validatePlanForExecute（延迟导入避免循环依赖）
  // 这在 run.js 的 postcheck contract 中已检查，这里不重复

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * Plan 产物校验：检查 plan.md 和 tasks/ 是否齐全
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[], planExists: boolean, taskCount: number }}
 */
export function validatePlanArtifacts(changeDir) {
  const errors = []
  const warnings = []

  const planPath = pJoin(changeDir, 'plan.md')
  if (!existsSync(planPath)) {
    return { ok: false, errors: ['plan.md 不存在'], warnings, planExists: false, taskCount: 0 }
  }

  const tasksDir = pJoin(changeDir, 'tasks')
  let taskCount = 0
  if (existsSync(tasksDir)) {
    taskCount = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f)).length
  } else {
    warnings.push('tasks/ 目录不存在（plan_level=none 时可接受）')
  }

  return { ok: true, errors, warnings, planExists: true, taskCount }
}

// ═══════════════════════════════════════════════════════════════
// 执行入口（从 run.js 迁移）
// ═══════════════════════════════════════════════════════════════

/**
 * Plan postcheck 主函数：Wave 重排 + 一致性校验 + 产物确认
 *
 * @param {{ cwd: string, specRoot?: string, resolveChangeDir: Function, progress?: object }} context
 * @throws {Error} 校验失败时抛出
 */
export async function executePlanPostcheck(context) {
  const { cwd, specRoot, resolveChangeDir, progress } = context

  const specDir = specRoot || pJoin(cwd, '.sillyspec')
  const changesDir = pJoin(specDir, 'changes')
  if (!existsSync(changesDir)) {
    console.warn('  ⚠️ 未找到 changes 目录，跳过 postcheck')
    return
  }

  // 找到当前变更目录（progress 由调用方从 SQLite 读取并传入；.runtime/progress.json 已废弃）
  let changeDir = null
  if (progress) {
    changeDir = resolveChangeDir(cwd, progress, specDir)
  }
  if (!changeDir) {
    // 回退：找最新的变更目录
    const dirs = readdirSync(changesDir)
      .filter(d => existsSync(pJoin(changesDir, d, 'plan.md')))
      .sort().reverse()
    if (dirs.length > 0) changeDir = pJoin(changesDir, dirs[0])
  }
  if (!changeDir) {
    console.warn('  ⚠️ 未找到当前变更目录，跳过 postcheck')
    return
  }

  console.log(`  📂 变更目录: ${changeDir}`)

  // ── 报错聚合（坑6③）：六个检查全部跑完后统一输出全部失败项，一轮 --done 暴露全部问题，
  // 不再「失败一个抛一个、修一个冒一个」的迭代盲盒。各检查相互独立（都只读 changeDir 产物），
  // 前置检查失败不使后续检查失真——唯一例外是 tasks/ 目录缺失时后续检查都无意义，仍提前短路。
  const failures = [] // { name, errors, hint }
  const printSectionWarnings = (label, warnings) => {
    if (warnings.length > 0) {
      console.warn(`\n⚠️  ${label}警告（不阻断）：`)
      for (const w of warnings) console.warn(`   - ${w}`)
    }
  }

  // ── local.yaml 预读（跨仓 repos 注册表 + monorepo modules，一次读两用）──
  // repos 喂检查 1 的 allowed_paths 路径口径校验 + repo: 键注册校验；
  // modules 喂检查 1c-b 的命令存在性校验（monorepo 子包感知）。
  const localYamlPath = pJoin(specDir, 'local.yaml')
  let taskModules = null
  let repoRegistry = null
  if (existsSync(localYamlPath)) {
    const localYamlText = readFileSync(localYamlPath, 'utf8')
    taskModules = parseLocalYamlModules(localYamlText)
    repoRegistry = parseRepoRegistry(localYamlText)
  }

  // ── 1. 一致性校验 ──
  const consistency = validateBlueprintConsistency(changeDir, { repoRegistry })
  if (consistency.errors.length > 0) {
    failures.push({ name: '蓝图一致性校验', errors: consistency.errors, hint: '请修复上述问题后重新完成此步骤。' })
  }
  printSectionWarnings('蓝图一致性', consistency.warnings)

  // ── 1b. 可行性校验 ──
  const feasibility = validatePlanFeasibility(changeDir, context.cwd)
  if (feasibility.errors.length > 0) {
    failures.push({ name: 'Plan 可行性校验', errors: feasibility.errors, hint: null })
  }
  printSectionWarnings('Plan 可行性', feasibility.warnings)

  // ── 1c. 跨任务契约校验 ──
  // 对账 consumer.expects_from ↔ provider.provides，拦截「consumer 期望字段
  // 但 provider 未承诺」的契约断裂（避免到 execute/verify 才暴露成 403/500）
  const crossTask = validateCrossTaskContracts(changeDir)
  if (crossTask.errors.length > 0) {
    failures.push({
      name: '跨任务契约校验（consumer 期望的字段未被 provider 承诺）',
      errors: crossTask.errors,
      hint: '修复方式：要么在 provider task 的 provides.fields 补上缺失字段，要么修正 consumer task 的 expects_from.needs（确认依赖是否真实）。',
    })
  }

  // ── 1c-b. TaskCard 命令存在性校验 ──
  // TaskCard verify/implementation 的 `npm|pnpm|yarn run <script>` 必须在 package.json
  // scripts 中存在（monorepo 子包感知——读 local.yaml modules 块定位）。
  // invalid → error 硬阻断，避免 execute 子代理跑死命令（design D-04 / 问题 3）。
  // modules 块可选：无块时仅查根 package.json（与 scan-postcheck 历史行为一致）。
  // local.yaml 已在检查 1 前预读（taskModules），此处直接消费。
  const taskCmds = validateTaskCommands(changeDir, context.cwd, taskModules)
  if (taskCmds.errors.length > 0) {
    failures.push({
      name: 'TaskCard 命令存在性校验（verify/implementation 的 npm/pnpm/yarn run <script> 不存在）',
      errors: taskCmds.errors,
      hint: '修复方式：要么在 package.json scripts 补上缺失命令（monorepo 注意子包路径），要么修正 TaskCard 的 verify/implementation（确认命令是否真实、是否需 cd 子包）。',
    })
  }

  // ── 1d. design 文件覆盖对账 ──
  // design.md 清单中的每个源码文件必须被某 task 的 allowed_paths 覆盖，
  // 否则 execute 子代理无权改它 → 漏改（典型表现：「页面还是错的」）。
  const coverage = validateDesignFileCoverage(changeDir)
  for (const w of coverage.warnings) console.warn(`\n  ⚠️  ${w}`)
  if (coverage.errors.length > 0) {
    failures.push({ name: 'design.md 文件覆盖对账（清单中的文件未被任何 task 覆盖）', errors: coverage.errors, hint: null })
  }
  if (coverage.designFiles.length > 0 && coverage.uncovered.length === 0) {
    console.log(`  ✅ design.md ${coverage.designFiles.length} 个文件全部被 task allowed_paths 覆盖`)
  }

  // ── 1e. 阶段完成产物校验（plan stage contract）──
  // plan 完成 gate 还会跑 stage-contract.validatePlanOutputs；为免「postcheck 通过 →
  // stage gate 又报 module-impact 缺失/entry-point-wiring 未覆盖」的修一层撞一层，
  // 在此把 stage contract 的 error/warning 也聚合进本轮输出。
  const { validatePlanOutputs } = await import('../stage-contract.js')
  if (typeof validatePlanOutputs === 'function') {
    const contract = validatePlanOutputs(context.cwd, basename(changeDir), { specRoot })
    if (contract.errors.length > 0) {
      failures.push({
        name: 'plan 阶段产物契约校验（stage-contract validatePlanOutputs）',
        errors: contract.errors,
        hint: '修复方式：补缺失产物（如 module-impact.md）、在 design.md 明示不改理由、或修正 task allowed_paths 覆盖 design.md 提及的入口文件。',
      })
    }
    if (contract.warnings.length > 0) {
      for (const w of contract.warnings) {
        console.warn(`\n  ⚠️  ${w}`)
      }
    }
  }

  // ── 聚合输出：一轮 --done 暴露全部失败项（坑6③）──
  if (failures.length > 0) {
    console.error(`\n❌ plan postcheck 失败（${failures.length} 类问题，已全部列出——一次修复后重跑，无需逐个迭代）：`)
    for (const f of failures) {
      console.error(`\n   【${f.name}】`)
      for (const err of f.errors) console.error(`   - ${err}`)
      if (f.hint) console.error(`   ${f.hint}`)
    }
    throw new Error(`planPostcheck: ${failures.length} 组校验失败（${failures.map(f => f.name).join('；')}）`)
  }

  // ── 2. Wave 重排 ──
  const tasksDir = pJoin(changeDir, 'tasks')
  if (existsSync(tasksDir)) {
    const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
    const depMap = collectTaskDepMap(tasksDir)

    const { waves, error: topoError } = topoSortWaves(depMap)
    if (topoError) {
      console.error(`\n❌ Wave 重排失败: ${topoError}`)
      throw new Error('planPostcheck: ' + topoError)
    }

    console.log('\n  📊 Wave 分组（基于 depends_on 拓扑排序）：')
    waves.forEach((wave, i) => {
      console.log(`     Wave ${i + 1}: ${wave.join(', ')}`)
    })

    // 比较 plan.md 现有 Wave 分组 + 依赖方向硬校验（坑 wave-dep-direction-unchecked，
    // 2026-08-24 用户反馈二期：主控手排 Wave 与拓扑比对只警告不阻断，而真正的正确性违规
    // ——depends_on 落同 Wave / 后置 Wave——此前完全没有校验）
    if (taskFiles.length > 0) {
      const planPath = pJoin(changeDir, 'plan.md')
      if (existsSync(planPath)) {
        const planContent = readFileSync(planPath, 'utf8')
        if (/##\s*Wave\s+\d/i.test(planContent)) {
          const existingWaves = []
          const lines = planContent.split('\n')
          let currentWaveTasks = null
          for (const line of lines) {
            const wm = line.match(/^#+\s*Wave\s+(\d+)/i)
            if (wm) {
              if (currentWaveTasks) existingWaves.push(currentWaveTasks)
              currentWaveTasks = []
              continue
            }
            // 非 Wave 标题行（## 自检 等）退出当前 Wave 段，避免自检 checkbox
            // 被混入 task 列表导致 Wave 结构比对误判。
            if (/^#+\s/.test(line)) {
              if (currentWaveTasks) existingWaves.push(currentWaveTasks)
              currentWaveTasks = null
              continue
            }
            // 2026-08-20-task-truth-unify：Wave 段下纯 ID 引用行（- task-NN）；旧 checkbox 行同收。
            // 编号补零对齐卡片口径（坑 wave-ref-unpadded，同 parseTaskWavesFromPlan）
            const tm = line.match(/^[-*]\s+(?:\[[ x]\]\s*)?task-(\d+)\s*[:：\s]*$/i)
              || line.match(/^[-*]\s*\[[ x]\]\s*task-(\d+)/i)
            if (tm && currentWaveTasks) {
              currentWaveTasks.push(`task-${String(tm[1]).padStart(2, '0')}`)
            }
          }
          if (currentWaveTasks) existingWaves.push(currentWaveTasks)

          // ── 依赖方向硬校验 ──
          // Wave 契约（execute.js Wave 要点 1）：同一 Wave 的子代理强制并行；有依赖的 task
          // 必须落在其依赖的后置 Wave。同 Wave / 后置 Wave 引用都是正确性违规（并行破坏依赖
          // / 顺序颠倒），硬拦；仅分组数差异（手工过度串行化）合法，保留下方 warning。
          const waveOf = new Map()
          existingWaves.forEach((ws, i) => { for (const t of ws) waveOf.set(t, i) })
          const directionViolations = []
          for (const [taskId, deps] of depMap) {
            const w = waveOf.get(taskId)
            if (w === undefined) continue // 卡片未列入任何 Wave → 由 validatePlanForExecute 覆盖校验兜底
            for (const dep of deps) {
              const dw = waveOf.get(dep)
              if (dw === undefined) continue // 依赖不存在的 task → feasibility depends_on 引用校验兜底
              if (dw === w) directionViolations.push(`${taskId} depends_on ${dep}，但两者同在 Wave ${w + 1}（同 Wave 强制并行，依赖被破坏）`)
              else if (dw > w) directionViolations.push(`${taskId} depends_on ${dep}，但 ${dep} 在后置 Wave ${dw + 1}（顺序颠倒）`)
            }
          }
          if (directionViolations.length > 0) {
            console.error(`\n❌ Wave 依赖方向违规（${directionViolations.length} 处）：`)
            for (const v of directionViolations) console.error(`   ${v}`)
            console.error('   解法：sillyspec plan-adopt-waves --change <变更名> 一键按 depends_on 拓扑重排 plan.md Wave 段，或手动调整分组')
            throw new Error('planPostcheck: Wave 依赖方向违规（depends_on 同 Wave / 后置 Wave）——' + directionViolations.join('；'))
          }

          const sameStructure = waves.length === existingWaves.length &&
            waves.every((w, i) => {
              const a = [...w].sort().join(',')
              const b = [...(existingWaves[i] || [])].sort().join(',')
              return a === b
            })

          if (sameStructure) {
            console.log('  ✅ Wave 分组与拓扑排序一致，无需更新 plan.md')
          } else {
            console.log('  ⚠️  Wave 分组与拓扑排序不一致（依赖方向已校验合法——手工比拓扑更细的串行化是安全做法，可保持现状）')
            console.log('     标准分组见上方 📊；如需对齐：sillyspec plan-adopt-waves --change <变更名>（重排 plan.md Wave 段并同步任务总表 W 列）')
          }
        }
      }
    }
  }

  // ── 3. 产物确认 ──
  const artifacts = validatePlanArtifacts(changeDir)
  if (!artifacts.ok) {
    for (const err of artifacts.errors) console.error(`❌ ${err}`)
    throw new Error('planPostcheck: artifact validation failed')
  }
  console.log('\n  ✅ plan.md 存在')

  if (artifacts.taskCount > 0) {
    console.log(`  ✅ tasks/ 目录有 ${artifacts.taskCount} 个 TaskCard 文件`)
  }

  console.log('\n  ✅ Plan postcheck 完成')
}
