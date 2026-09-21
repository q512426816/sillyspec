/**
 * run/prompt.js（W6 Step3 从 run.js 抽出）。
 *
 * prompt 渲染主干：outputStep（步骤 prompt 组装 + 占位符替换 + 平台/scanProfile/
 * 模块上下文/铁律注入）+ applyRootPlaceholders（{SPEC_ROOT}/{DOCS_ROOT}/{PROJECTS_ROOT}/
 * {WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT} 路径根占位符替换，平台/常规模式共用）+
 * loadModuleContextIndex/buildModuleContextInjection/parseModuleMapSimple
 * （_module-map.yaml 模块上下文匹配注入，仅 outputStep 用）。
 *
 * 安全锚：run.js 始终 barrel。applyRootPlaceholders 由 run.js import 回来；
 * outputStep（output-step-render / archive-task-completion-injection 测试）+ applyRootPlaceholders
 * （prompt-placeholders 测试）被 test 直接 import 本模块（outputStep 不经 barrel，2026-08-13 起 test
 * 直 import 源模块，`_outputStepForTest` 别名已移除）。
 *
 * 路径修正（相对 src/run/）：
 *   - stageRegistry 从 '../stages/index.js'；resolvePromptIncludes/safeGit/WAIT_MARKER_RE 从 './shared.js'
 *   - 动态 import './knowledge-match.js'/'./task-review.js'/'./review-tier.js'/'./stage-review.js' → '../X.js'（src/ 下，退一层）
 *   - 删除 outputStep 内死代码 `const { execSync } = await import('child_process')`（execSync 解构未用，实际走 safeGit）
 *   - loadModuleContextIndex/buildModuleContextInjection 内 require('fs'/'path') 改顶部静态 import
 */
import { basename, join } from 'node:path'
import { existsSync, readFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import jsYaml from 'js-yaml'
import { writeAtomicSync } from '../fs-atomic.js'
import { stageRegistry } from '../stages/index.js'
import { resolvePromptIncludes, resolveRuntimeRoot, safeGit, parsePorcelainPath, WAIT_MARKER_RE, QUICK_SID_RE, triggerStepStartSync } from './shared.js'
import { renderSemanticGuardBlock, readSemanticGuardEnabled } from '../semantic-guard.js'

// ── M1 步骤指引静态段指纹（2026-09-21-r5-efficiency-batch2 task-01 / D-001@v1）──
// 易变占位符全集（值因运行而异）：指纹掩码 + 复入附录照常渲染。新增易变占位符时同步此表
// （漏登会令指纹误变——退化后果只是多一次全量重印，不产生错误指引；多登同理只多印）。
const VOLATILE_PLACEHOLDER_RES = [
  /<now-datetime>/g, /<now-timestamp>/g, /<now-date>/g, /<now-iso-datetime>/g, /<git-head-short>/g, /<quicklog-id>/g,
  /{SCAN_STALENESS}/g, /{SCAN_FACTS}/g, /{QUICK_CONTEXT_DIGEST}/g, /{DECISION_HITS}/g,
  /{KNOWLEDGE_HIT_REPORT}/g, /{DOCS_DEBT}/g, /{MODULE_RESOLVE_TABLE}/g, /{REVIEW_MATERIALS}/g,
  /{EXECUTE_RUN_ID}/g, /{STAGE_REVIEW_RUN_ID}/g, /{PROGRESS_SNAPSHOT}/g, /{TASK_COMPLETION_REPORT}/g,
  /{WORKTREE_META}/g, /{WORKTREE_BASELINE_INFO}/g, /{TASKS_CHECKBOX}/g, /{GIT_DIRTY}/g,
  /{SCOPE_AUDIT_TABLE}/g, /{FR_INDEX_DIGEST}/g, /{HANDOVER_SUMMARY}/g, /{PREFLIGHT_FAILURES}/g,
  /{PRIOR_REVIEW_FACTS}/g, /{ARCHIVE_IMPACT_AUDIT}/g, /{EVIDENCE_AUTO_RECOMMENDATION}/g,
]
const VOLATILE_MASK = '⟦dyn⟧'
function maskVolatileForGuide(text) {
  let out = text
  for (const re of VOLATILE_PLACEHOLDER_RES) out = out.replace(re, VOLATILE_MASK)
  return out
}
/** M1：步骤指引静态段指纹——模板原文（include 解析后、占位符替换前）掩码易变占位符后的 sha256。
 *  确定性：同模板同指纹；模板文本/静态占位符变更即变；易变占位符的值不参与（值在替换后，不在此面）。 */
export function computeStepGuideFingerprint(template) {
  return createHash('sha256').update(maskVolatileForGuide(String(template))).digest('hex')
}
import { renderStageContract } from '../stage-contract-spec.js'
import { nowWallClock } from '../datetime.js'
import { parseModuleMapSimple } from '../modules.js'
import { readModuleRecentChanges } from '../module-changelog.js'
import { REVIEW_SCHEMA_VERSION, isValidExecuteRunId } from '../task-review.js'
// 机械知识注入（2026-09-14-knowledge-loop-close task-04，FR-04）：两者均为 fs/path 叶子模块，
// 静态 import 不引入环（stages/* 反向引用本文件会撞 index.js 顶层 stageRegistry TDZ——见
// buildKnowledgeInjection docstring）。
import { matchKnowledge } from '../knowledge-match.js'
import { appendKnowledgeHit } from '../knowledge-hits.js'
import { readActiveFrDigest } from '../fr-index.js'
// 前置失败清单 validator 面（2026-09-18-preflight-slimming task-01）：design-facts /
// stage-contract-engine 均为 src/ 叶子方向（不反向 import 本模块），静态 import 不引入环。
import { validateDesignFileList } from '../design-facts.js'
import { evaluateRules } from '../stage-contract-engine.js'
// 注入账本锁（2026-09-18-preflight-slimming task-02，R-06）：withFileLock（quicklog.js:40 先例，
// 防多会话 read-modify-write 丢更新）——quicklog.js 仅 import path/fs/crypto/git-helper/
// stage-contract-spec，不反向引用本模块，静态 import 不引入环。
import { withFileLock } from '../quicklog.js'

// ═══════════════════════════════════════════════════════════════
// ceremony 档位仪式菜单（2026-09-18-ceremony-risk-pricing task-05，D-002/D-005）
// ═══════════════════════════════════════════════════════════════

/** ceremony 档位序（与 ceremony-tier.js CEREMONY_TIERS 同序；此处仅作消费侧排序/枚举校验，不 reimport） */
const CEREMONY_TIER_ORDER = ['S0', 'S1', 'S2', 'S3']

/** 档位→仪式菜单（消费侧映射，design「档位→仪式菜单」契约：引擎只定价不映射） */
const CEREMONY_TIER_MENUS = [
  ['S0', 'CLI 清单核验（stage-review-checklist 机械项逐条核对，零 token 发散）'],
  ['S1', 'CLI 清单核验 + 定向探针抽查（机械项全查 + 高风险交叉点定向源码探针，无需独立子代理）'],
  ['S2', '独立评审×1（独立审查子代理单轮 + review.json）'],
  ['S3', '两轮独立评审 + Grill 深查（两轮独立子代理交叉 + review.json）'],
]

/**
 * 读 local.yaml `ceremony:` 段（best-effort 绝不抛，对齐 readReviewChannelPriority 范式）。
 * force_tier：S0|S1|S2|S3 枚举逃生阀（非法值 warn 后忽略）；shadow：boolean 缺省 true。
 * config-schema.js ceremony 节的 prompt 面 reader（影子派发侧消费随 task-06 接线）。
 */
export function readCeremonyLocalConfig(cwd) {
  let raw = null
  try {
    const p = join(cwd || process.cwd(), '.sillyspec', 'local.yaml')
    if (existsSync(p)) raw = jsYaml.load(readFileSync(p, 'utf8'))
  } catch { raw = null }
  const c = raw && typeof raw === 'object' && raw.ceremony && typeof raw.ceremony === 'object'
    ? raw.ceremony
    : null
  const forceRaw = c && typeof c.force_tier === 'string' ? c.force_tier.trim() : null
  const forceTier = CEREMONY_TIER_ORDER.includes(forceRaw) ? forceRaw : null
  if (forceRaw && !forceTier) {
    console.warn(`[sillyspec] ceremony.force_tier 未知档位「${forceRaw}」已忽略（可选：${CEREMONY_TIER_ORDER.join(' | ')}）`)
  }
  const shadow = c && typeof c.shadow === 'boolean' ? c.shadow : true
  return { forceTier, shadow }
}

/**
 * ceremony 档位菜单渲染（{REVIEW_TIER} 注入值的追加块——追加不替换：tier: self/independent
 * 语义与 {REVIEW_TIER_REASON} 注入机制原样保留，菜单块按 ceremonyTier 标注当前档）。
 *
 * 逃生阀（ceremony.force_tier）只升不降：强制档高于客观定价档 → 菜单当前档随调、注入
 * tier 值升为 independent（S2/S3）；低于客观档 → 只留注记不降档——防 prompt 面与 gate 侧
 * classifyReviewTier（未读逃生阀）判定分裂（prompt 说 self 而 gate 等 review.json 的错位阻断）。
 *
 * 强制轻仪审计痕（FR-02）：agent 报 plan_level=full 而档位 S0/S1 → 菜单块追加固定审计行
 * （照「分级异常降级 self」既有降级戳先例：注入文案即留痕），明示勿因「计划写得完整」自行升仪。
 *
 * @param {{ ceremonyTier?: string, tierValue?: string, planLevel?: string|null, cwd?: string }} args
 * @returns {{ tierValue: string, menuMd: string }} menuMd 以 \n 开头（拼在 tier 值后）；无有效档位时为 ''
 */
export function renderCeremonyTierInjection({ ceremonyTier, tierValue, planLevel, cwd } = {}) {
  const baseTierValue = tierValue || 'self'
  if (!CEREMONY_TIER_ORDER.includes(ceremonyTier)) {
    return { tierValue: baseTierValue, menuMd: '' }
  }
  const { forceTier, shadow } = readCeremonyLocalConfig(cwd)
  let active = ceremonyTier
  let forceNote = ''
  let effectiveTierValue = baseTierValue
  if (forceTier && forceTier !== ceremonyTier) {
    if (CEREMONY_TIER_ORDER.indexOf(forceTier) > CEREMONY_TIER_ORDER.indexOf(ceremonyTier)) {
      active = forceTier
      forceNote = `——local.yaml ceremony.force_tier=${forceTier} 强制升档（逃生阀，绕过客观定价）`
      if (active === 'S2' || active === 'S3') effectiveTierValue = 'independent'
    } else {
      forceNote = `——local.yaml ceremony.force_tier=${forceTier} 低于客观定价档，不降档（只升不降）`
    }
  }
  const menuLines = CEREMONY_TIER_MENUS.map(([t, menu]) => `- ${t}：${menu}${t === active ? ' ◀ 当前档' : ''}`)
  const lightTier = active === 'S0' || active === 'S1'
  const shadowNote = lightTier && shadow
    ? '\n（影子期 on：轻档明面轻仪，后台静默派发重仪式对照只记账不阻断——local.yaml ceremony.shadow 开关，对照报告见 doctor）'
    : ''
  const auditTrail = planLevel === 'full' && lightTier
    ? '\n⚠️ 强制轻仪审计痕：agent 报 plan_level=full 但 ceremony 档为轻档——仪式按 risk 计价、plan_level 仅编排，按当前轻档菜单执行，勿因「计划写得完整」自行升回 independent×2'
    : ''
  const menuMd = `\nceremony_tier: ${active}${forceNote}（仪式按 risk 计价，plan_level 仅编排——四档菜单：）\n${menuLines.join('\n')}${shadowNote}${auditTrail}`
  return { tierValue: effectiveTierValue, menuMd }
}

/**
 * 从 _module-map.yaml 读取模块上下文索引
 * 用于 brainstorm/plan/execute 阶段按任务命中模块精准注入上下文
 *
 * @param {string} specBase - 规范目录（.sillyspec 或 specRoot）
 * @param {string} projectName - 项目名
 * @returns {object|null} 解析后的模块索引，null 表示无索引
 */
export function loadModuleContextIndex(specBase, projectName) {
  try {
    const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
    if (!existsSync(mapPath)) return null
    const content = readFileSync(mapPath, 'utf8')
    // schema_version 校验：仅缺失 schema_version（真 malformed，parseModuleMapSimple 必错位）时 warn；
    // schema_version=1（旧格式）静默——读端 buildModuleContextInjection 已 v1/v2 双兼容
    // （data.paths || data.core_files），v1 解析正常。原 v1 warn 是过激噪声（每步渲染 prompt 刷屏）。
    // v1→v2 根因在 scan prompt 模板仍写 schema_version:1，升级 scan.js 是单独改动（见 troubleshooting）。
    const sv = content.match(/^schema_version:\s*(\d+)/m)
    if (!sv) {
      console.warn(`⚠️  _module-map.yaml 缺少 schema_version 声明（期望 2），模块解析可能错位：${mapPath}（跑 \`sillyspec modules rebuild\` 升级到 schema_version: 2 可消除此警告）`)
    }
    return parseModuleMapSimple(content)
  } catch {
    return null
  }
}

/**
 * 根据 AI 输出的任务描述，匹配相关模块并生成上下文注入文本
 * 匹配策略：模块 id / role / doc 路径中的关键词
 *
 * @param {string} taskDescription - 任务描述（来自 plan.md / step prompt / outputText）
 * @param {object} moduleIndex - loadModuleContextIndex 返回值
 * @param {string} specBase - 规范目录
 * @param {string} projectName - 项目名
 * @param {object} [opts] - { change }：变更名 / quick sessionId（docs-inject 遥测 change 字段；缺省 ''）
 * @returns {{text: string, frModules: Array<{id: string, count: number}>}} 上下文注入文本（空=无匹配模块）+ 有活需求的模块清单（供遥测）
 */
export function buildModuleContextInjection(taskDescription, moduleIndex, specBase, projectName, opts = {}) {  if (!moduleIndex || !taskDescription) return { text: '', frModules: [] }

  const taskLower = taskDescription.toLowerCase()
  const matched = []

  for (const [moduleId, data] of Object.entries(moduleIndex)) {
    let score = 0
    let matchReasons = []
    // 模块 id 匹配
    if (taskLower.includes(moduleId.toLowerCase())) { score += 3; matchReasons.push(`id:${moduleId}`) }
    // role 描述匹配
    if (data.role && taskLower.includes(data.role.toLowerCase())) { score += 2; matchReasons.push('role') }
    // core_files 路径匹配
    const coreFiles = data.paths || data.core_files || []
    for (const p of coreFiles) {
      if (taskLower.includes(p.toLowerCase())) { score += 1; matchReasons.push(`file:${p}`); break }
    }
    if (score > 0) matched.push({ moduleId, data, score, matchReasons })
  }

  if (matched.length === 0) return { text: '', frModules: [] }

  matched.sort((a, b) => b.score - a.score)

  let injection = '\n### 📦 模块上下文（按相关性排序，来自 Module Context Index）\n\n'
  injection += `> 以下模块上下文由 scan 阶段生成的 _module-map.yaml 自动匹配。\n`
  injection += `> 活需求来自 knowledge/fr 索引（active 以索引为准，现场 join）——承接/取代指引见 step8 digest\n`
  injection += `> Matched modules: ${matched.map(m => m.moduleId).join(', ')}\n`
  injection += `> Reasons: ${matched.map(m => m.matchReasons.join(', ')).join('; ')}\n\n`

  // FR 活需求注入期 join（ql-20260919-002，L2 替代形态）：join 键 = 域≡模块 id
  // （fr-index.js resolveTouchedDomains 同键），现场查 active 条目——id+标题紧凑行（场景名
  // 留给 brainstorm step8 digest：此处设计期感知，digest 写作期指引——**有意冗余勿当重复
  // 优化掉**）。截前 5 条+溢出指针行；空段消隐（与 digest 空态同款）。fail-open：读失败该
  // 模块无活需求行，绝不阻塞注入。
  const frModules = []
  for (const { moduleId, data } of matched) {
    injection += `#### ${moduleId}\n`
    if (data.role) injection += `- **职责**: ${String(data.role).slice(0, 100)}\n`
    const riskLevel = data.risk_level || 'medium'
    injection += `- **风险等级**: ${riskLevel}\n`
    const coreFiles = data.paths || data.core_files || []
    if (coreFiles.length > 0) injection += `- **核心文件**: ${coreFiles.join(', ')}\n`
    if (data.doc) {
      const docPath = join(specBase, 'docs', projectName, data.doc)
      const exists = existsSync(docPath)
      injection += `- **模块文档**: ${data.doc}${exists ? ' ✅' : ' ⚠️ 不存在'}\n`
    }
    const deps = data.depends_on || []
    if (deps.length > 0) injection += `- **依赖**: ${deps.join(', ')}\n`
    const usedBy = data.used_by || []
    if (usedBy.length > 0) injection += `- **被引用**: ${usedBy.join(', ')}\n`
    // 最近变更（模块卡「变更索引」惯例解析，2026-08-31 变更关联审计）：三阶段免扫描即知
    // 该模块最近被谁动过。懒读命中模块的卡 + sidecar（matched 通常 ≤3 个，不做全目录扫描）
    const recentChanges = readModuleRecentChanges(join(specBase, 'docs', projectName, 'modules'), moduleId)
    if (recentChanges.length > 0) {
      injection += `- **最近变更**: ${recentChanges.slice(0, 3).map(e => e.name).join('、')}\n`
    }
    // 活需求行（注入期 join 本体）
    try {
      const frs = readActiveFrDigest(join(specBase, 'knowledge'), [moduleId])
      if (frs.length > 0) {
        const top = frs.slice(0, 5).map(f => `${f.id} ${f.title}`.trim()).join('；')
        injection += `- **活需求**: ${top}`
        if (frs.length > 5) injection += `；+${frs.length - 5} 条见 knowledge/fr/${moduleId}.md`
        injection += '\n'
        frModules.push({ id: moduleId, count: frs.length })
      }
    } catch { /* fail-open：FR 读失败该模块无活需求行 */ }
    injection += '\n'
  }

  // docs-inject 遥测（2026-09-21-scan-docs-ops-panel task-04，FR-06 / D-003@v1 Wave 0）：模块
  // 上下文注入命中（≥1 模块、注入段已渲染）经 task-01 底座 appendKnowledgeHit 落一行
  // type:docs-inject，供平台 scan-docs 注入频次聚合消费（knowledge-stats 未知 type 前向兼容
  // 静默跳过，不污染知识 stats 口径）。matchedFiles 取命中模块 doc 字段原值（modules/<x>.md，
  // _module-map.yaml 实际形态）。未命中零行；fail-soft：遥测写失败不影响注入本体（对齐上方
  // buildKnowledgeInjection 遥测分离先例）。
  try {
    appendKnowledgeHit(join(specBase, '.runtime'), {
      type: 'docs-inject',
      change: String((opts && opts.change) || ''),
      query: String(taskDescription || ''),
      matchedFiles: matched.map(m => m.data && m.data.doc).filter(Boolean),
    })
  } catch { /* 遥测 fail-soft（R-04）：hits 落盘失败不影响注入本体 */ }

  return { text: injection, frModules }
}

/**
 * 读 quick session guard 的任务描述（刀①）：启动 --input 由 stage.js 落 guard.taskDescription，
 * 渲染 step1 模块上下文注入时作匹配源（changeName 是 quick-<hash> 无语义）。
 * 与 <quicklog-id>/<linked-changes> 占位符同源同容错（session guard 优先，legacy 单文件回退）。
 */
export function readQuickGuardField(changeName, specBase, field) {
  try {
    const sessionGuardFile = join(specBase, '.runtime', 'quick-sessions', changeName, 'guard.json')
    const legacyGuardFile = join(specBase, '.runtime', 'quick-guard.json')
    const guard = existsSync(sessionGuardFile)
      ? JSON.parse(readFileSync(sessionGuardFile, 'utf8'))
      : (existsSync(legacyGuardFile) ? JSON.parse(readFileSync(legacyGuardFile, 'utf8')) : null)
    return guard ? (guard[field] || '') : ''
  } catch {
    return ''
  }
}

/**
 * quick step1 项目上下文摘要（刀①）：CLI 代读 projects/*.yaml 与 CONVENTIONS.md 开头注入
 * prompt——替代 agent 两轮 cat（quick 是最高频路径，省 token + 省轮次）。fail-soft：
 * 读不到落单行说明，绝不阻断 prompt 输出。
 */
export function buildQuickContextDigest(specBase, projectName) {
  try {
    const sections = []
    // 项目登记摘要（name/path/status 一行一个——技术栈等扩展字段按行透传 top-level 短行）
    const projectsDir = join(specBase, 'projects')
    if (existsSync(projectsDir)) {
      const lines = []
      for (const f of readdirSync(projectsDir).filter(f => f.endsWith('.yaml'))) {
        const text = readFileSync(join(projectsDir, f), 'utf8')
        const name = (text.match(/^name:\s*(.+)$/m) || [])[1]
        const path = (text.match(/^path:\s*(.+)$/m) || [])[1]
        const status = (text.match(/^status:\s*(.+)$/m) || [])[1]
        lines.push(`- ${name ? name.trim() : f.replace(/\.yaml$/, '')}（${path ? path.trim() : '?'}）${status ? ` — ${status.trim()}` : ''}`)
      }
      if (lines.length > 0) sections.push('### 项目登记（projects/*.yaml 摘要）\n' + lines.join('\n'))
    }
    // CONVENTIONS.md 开头（截断保底——全文可能很长，注入是省读取税不是塞全文）
    const convPath = join(specBase, 'docs', projectName, 'scan', 'CONVENTIONS.md')
    if (existsSync(convPath)) {
      const text = readFileSync(convPath, 'utf8')
      const HEAD_CHARS = 1200
      const head = text.length > HEAD_CHARS
        ? text.slice(0, HEAD_CHARS) + `\n…（截断——全文 ${convPath}，需要时再读）`
        : text
      sections.push('### 项目约定（CONVENTIONS.md 开头，CLI 代读）\n' + head)
    }
    return sections.length > 0
      ? sections.join('\n\n')
      : '（无项目登记/约定文档——需要时按 prompt 内路径自查）'
  } catch (e) {
    return `（项目上下文注入失败：${e && e.message ? e.message : e}——需要时再 cat {SPEC_ROOT}/projects/*.yaml 与 CONVENTIONS.md）`
  }
}

/**
 * quick step1 语义护栏进场注入拼装（task-05，FR-03，D-001@v1 模块四）：开关 → 候选文件采集 →
 * renderSemanticGuardBlock 反查。候选 = 会话声明文件（guard.allowedFiles，readQuickGuardField
 * 同源读取：session guard 优先 / legacy 单文件回退）∪ git status --porcelain 脏文件
 * （parsePorcelainPath 同款解析口径：引号剥离 / -> rename / 反斜杠归一），反斜杠归一去重封顶 20。
 * 返回 ''（开关关 / 无候选 / 双零命中——prompt 与现状字节一致，零命中静默）或 advisory 段；
 * 全链 fail-soft：异常返回单行降级说明，不阻断 quick 启动。导出供注入单测直测
 * （test/semantic-guard-prompt-inject.test.mjs）。
 */
export function buildQuickSemanticGuardInjection({ specBase, cwd, changeName } = {}) {
  try {
    // 开关首行（Grill X-012）：false 直接零输出——不采候选文件、不跑反查（开关语义全停非半停）
    if (!readSemanticGuardEnabled(specBase)) return ''
    // 会话声明文件（--files 落 guard.allowedFiles；缺失 / 形态异常按空）
    const declaredRaw = readQuickGuardField(changeName, specBase, 'allowedFiles')
    const declared = Array.isArray(declaredRaw) ? declaredRaw : []
    // git 脏文件：porcelain 解析同源 quick-audit（trim:false——首列前导空格是状态码，trim 会削掉
    // 致 parsePorcelainPath 丢首字符；.sillyspec/ 运行时产物过滤同款——候选面是代码文件）
    let dirty = []
    const statusResult = safeGit(cwd, ['status', '--porcelain'], { trim: false })
    if (!statusResult.error) {
      dirty = (statusResult.value || '').split('\n').filter(Boolean)
        .map(l => parsePorcelainPath(l))
        .filter(Boolean)
        .filter(f => !f.startsWith('.sillyspec/'))
    }
    // 去重（反斜杠归一后；renderSemanticGuardBlock 内侧亦有同款归一，此处为封顶前的口径）
    // 封顶 20 —— 与 collectRecentForeignDelivery 内侧文件封顶同数
    const candidateFiles = [...new Set(
      [...declared, ...dirty].map(f => String(f || '').trim().replace(/\\/g, '/')).filter(Boolean)
    )].slice(0, 20)
    if (candidateFiles.length === 0) return ''
    return renderSemanticGuardBlock({ specBase, cwd, candidateFiles, currentChange: changeName })
  } catch (e) {
    return `【语义护栏】注入失败（${e && e.message ? e.message : e}）——跳过反查，不阻断本步骤；需要时自查 knowledge/INDEX.md 与 git log`
  }
}

// ── 机械知识注入共享底座（2026-09-14-knowledge-loop-close task-04，FR-04 / D-002@v1 总体方案 D）──
// 知识消费从 report 级升级为正文级：matchKnowledge 命中 → 按 entries 出现序（INDEX 行序）取
// 前 3 个不同 file，单文件首 40 行截断 + 截断标记，渲染「📚 命中知识」段（R-02 膨胀控制）；
// 未命中 section=''（调用方零字节零变化）。命中同时经 task-01 的 appendKnowledgeHit 落
// .runtime/knowledge-hits.jsonl 一条 type:inject 记录；既有 knowledge-hit-report.json 由
// execute 调用方照旧落盘（X-004 升级既有机制而非并行新建，新旧遥测共存）。
//
// ⚠️ 同款格式在 src/stages/execute.js buildWavePrompt 内有本地孪生实现（Wave 粒度注入）——
// 本文件无法被 execute.js 静态 import（prompt.js → stages/index.js → execute.js 既有依赖方向，
// 反向边会在 execute.js 作模块图入口时触发 index.js 顶层 stageRegistry 对其 definition const 的
// TDZ 求值，2026-09-14 ESM 环实证）。格式漂移由 test/knowledge-inject.test.mjs 的格式等价断言
// 锁定——改此处必同步改孪生。
export const KNOWLEDGE_INJECT_MAX_FILES = 3
export const KNOWLEDGE_INJECT_MAX_LINES = 40

/** top-N 选取：按 entries 出现序（INDEX 行序）取前 N 个不同 file（matchKnowledge 布尔 filter
 *  无相关度排序，X-009——出现序即唯一稳定序），每 file 取首个命中 entry 作代表。 */
function pickTopKnowledgeEntries(entries, maxFiles) {
  const seen = new Set()
  const picked = []
  for (const e of entries) {
    if (seen.has(e.file)) continue
    seen.add(e.file)
    picked.push(e)
    if (picked.length >= maxFiles) break
  }
  return picked
}

/** 命中正文段渲染（段头 + Status/Sources 命中报告语义 + top-3 文件截断正文）。 */
function renderKnowledgeInjectSection(knowledgeResult, { knowledgeDir, maxFiles, maxLines }) {
  const ref = e => (e.anchor ? `${e.file}#${e.anchor}` : e.file)
  const lines = []
  lines.push(`📚 命中知识（CLI 按任务描述机械匹配，top-${maxFiles}）`)
  lines.push(`Status: matched | Entries: ${knowledgeResult.entries.length} | Sources:`)
  for (const e of knowledgeResult.entries) lines.push(` - ${ref(e)}`)
  lines.push(`（命中清单如上；正文按 INDEX 行序注入前 ${maxFiles} 个不同文件，单文件首 ${maxLines} 行截断——未注入条目需要时按 Sources 路径自行读取）`)
  for (const e of pickTopKnowledgeEntries(knowledgeResult.entries, maxFiles)) {
    lines.push('')
    lines.push(`── ${ref(e)}${e.display ? `（${e.display}）` : ''} ──`)
    let body = ''
    try {
      // CRLF/CR 归一（Windows 知识文件 + 行数截断按 \n 切分）
      body = readFileSync(join(knowledgeDir, e.file), 'utf8').replace(/\r\n?/g, '\n')
    } catch (err) {
      lines.push(`（文件不可读：${err && err.message ? err.message : err}）`)
      continue
    }
    const bodyLines = body.split('\n')
    if (bodyLines.length > maxLines) {
      lines.push(bodyLines.slice(0, maxLines).join('\n'))
      lines.push('…（截断）')
    } else {
      lines.push(body.replace(/\n+$/, ''))
    }
  }
  return lines.join('\n')
}

/**
 * 机械知识注入一站式入口（execute「确认执行范围」step 与 quick step1 两个 prompt.js 内注入点共用）。
 *
 * @param {object} opts
 * @param {string} opts.knowledgeDir - knowledge 目录（INDEX.md 所在）
 * @param {string} opts.runtimeDir - .runtime 目录（hits.jsonl 落点）
 * @param {string} opts.change - 变更名 / quick sessionId（进遥测记录 change 字段）
 * @param {string} opts.query - 匹配查询串（execute: changeName+tasks.md 任务行；quick: guard.taskDescription）
 * @returns {{matched: boolean, section: string, report: string, json: object}}
 *   section：命中时的「📚 命中知识」段（含段头与正文）；未命中恒 ''（调用方零字节）。
 *   report/json：matchKnowledge 原样透传（execute 调用方沿用旧 report.json 落盘与未命中替换口径）。
 *   遥测 append 单独 fail-soft（hits 写失败不影响注入本体）；匹配/渲染异常向上抛由调用方降级。
 */
export function buildKnowledgeInjection({ knowledgeDir, runtimeDir, change, query, maxFiles = KNOWLEDGE_INJECT_MAX_FILES, maxLines = KNOWLEDGE_INJECT_MAX_LINES } = {}) {
  const knowledgeResult = matchKnowledge(knowledgeDir, String(query || ''))
  if (!knowledgeResult.matched) {
    return { matched: false, section: '', report: knowledgeResult.report, json: knowledgeResult.json }
  }
  const section = renderKnowledgeInjectSection(knowledgeResult, { knowledgeDir, maxFiles, maxLines })
  try {
    appendKnowledgeHit(runtimeDir, {
      type: 'inject',
      change: change || '',
      query: String(query || ''),
      matchedFiles: knowledgeResult.entries.map(e => (e.anchor ? `${e.file}#${e.anchor}` : e.file)),
    })
  } catch { /* 遥测 fail-soft（R-04）：hits 落盘失败不阻断注入本体 */ }
  return { matched: true, section, report: knowledgeResult.report, json: knowledgeResult.json }
}

// parseModuleMapSimple 复用 modules.js 的 canonical 实现（合并历史 copy-paste 副本，2026-08-07；
// 无循环依赖：modules.js 仅 import fs/path/db.js，prompt.js → modules.js 单向）。

/**
 * 等效验证先例库（坑 verify-precedent-only-in-prose，2026-09-15 EHS 生产实证：mvn test 被
 * 公司框架 parent pom pluginManagement 硬编码 surefire skip=true、-D 覆盖无效——等效口径
 * dependency:build-classpath+javac+JUnitCore 第二次复用靠 agent 翻旧 verify-result.md 正文
 * 续命；先例只活在散文里 = 换个 agent/换个变更就断档）。结构化登记进 local.yaml
 * verify_precedents 段，verify prompt 时点注入提示（与 test_strategy 预检提示同挂点）。
 *
 * 对象数组形态（行扫描，同 extractKnownFailures 免 YAML 依赖口径——注释/空行/块界容错）：
 *   verify_precedents:
 *     - id: mvn-test-surefire-skip
 *       standard_command: mvn test
 *       reason: <标准命令为何不可用>
 *       equivalent: <已验证的等效口径>
 *       established_by: <确立该口径的变更名>
 *       notes: <可选补充>
 * 残项（standard_command 与 equivalent 双缺）过滤——登记不完整的先例没有可执行口径。
 * @param {string|null} yamlText local.yaml 全文
 * @returns {Array<object>} 先例对象数组
 */
export function parseVerifyPrecedents(yamlText) {
  const lines = String(yamlText || '').split(/\r?\n/)
  const headIdx = lines.findIndex(l => /^verify_precedents:\s*(?:#.*)?$/.test(l))
  if (headIdx < 0) return []
  const items = []
  let cur = null
  const clean = (v) => String(v || '').replace(/\s+#.*$/, '').trim()
  for (let i = headIdx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (/^\S/.test(l)) break // 下一个顶层键 → 块结束
    if (!l.trim() || /^\s*#/.test(l)) continue
    const item = l.match(/^\s*-\s+([A-Za-z_][\w-]*):\s*(.*)$/)
    if (item) {
      cur = {}
      items.push(cur)
      cur[item[1]] = clean(item[2])
      continue
    }
    const kv = l.match(/^\s*([A-Za-z_][\w-]*):\s*(.*)$/)
    if (kv && cur) cur[kv[1]] = clean(kv[2])
  }
  return items.filter(x => x && (x.standard_command || x.equivalent))
}

/**
 * 先例提示渲染（verify prompt 注入用；空输入 → ''，调用方零输出）。
 * 行动指引刻意指向「把等效命令配进 commands.test 照常全量实测对账」而非 test_strategy: skip
 * 放行——EHS 实证里被环境阻断 deferred 的集成测试正是 P1 缺陷藏身处，能实测就实测。
 * @param {Array<object>|null} precedents
 * @returns {string}
 */
export function renderVerifyPrecedentHint(precedents) {
  if (!Array.isArray(precedents) || precedents.length === 0) return ''
  const L = [`【验证先例提示】本仓已登记 ${precedents.length} 条等效验证先例（标准命令不可用时的既有替代口径）：`]
  for (const p of precedents.slice(0, 5)) {
    L.push(`- ${p.id || '（无 id）'}：\`${p.standard_command || '?'}\` 不可用（${p.reason || '原因未注'}）→ 等效口径 \`${p.equivalent || '?'}\`（确立于 ${p.established_by || '?'}${p.notes ? `；${p.notes}` : ''}）`)
  }
  if (precedents.length > 5) L.push(`- …另有 ${precedents.length - 5} 条未展开（读 local.yaml verify_precedents 段看全量）`)
  L.push('适用时把等效命令配进 local.yaml commands.test（或 modules.<m>.test）后照常全量实测对账，而不是只靠 test_strategy: skip 放行；先例不适用（环境已变/口径失效）可忽略并在 verify-result 注记。')
  return L.join('\n')
}

/**
 * 提示词路径根的单一解析：specRoot(平台) > specDriftAnchor(worktree 漂移锚定主仓) > cwd/.sillyspec(本地)。
 * 治 execute review.json 提示路径写 worktree 副本、--done 校验读主仓的分裂（坑 execute-prompt-spec-drift）：
 * CLI 自动锚定主仓 spec（command.js detectWorktreeSpecDrift → platformOpts.specDriftAnchor）只修正了
 * resolveRuntimeRoot 的 runtime 落点，outputStep 拼 {SPEC_ROOT}/.runtime/execute-runs/… 若仍用 cwd
 * （worktree）→ 提示的 review.json 路径落到 worktree 副本 .sillyspec，而 gate/checkbox 从主仓
 * resolveRuntimeRoot 读 → agent 落盘错位，marker 漂移改用他 run / task 未勾。specDriftAnchor 非空即主仓
 * specBase，优先于 cwd。平台模式 specRoot 优先语义不变。
 */
export function resolvePromptSpecBase(platformOpts, cwd) {
  return platformOpts?.specRoot || platformOpts?.specDriftAnchor || join(cwd, '.sillyspec')
}

/**
 * 收集某阶段全部步骤已记录的用户等待回答（跨会话恢复回放数据源）。
 *
 * 背景（坑 stage-wait-history-not-replayed）：waitAnswers 从 --continue / --done --answer 起就
 * 持久化在进度库（steps.wait_answers），但 outputStep 此前只在 --continue 即时路径注入
 * 「📩 上一步用户回答」（prevStepAnswer）——新会话 `run <stage>` 续跑时历史回答不回放，
 * agent 只能重问已答过的问题、用户描述随旧会话丢失。此助手把整阶段（含当前步骤多轮）
 * 的回答按步骤聚合，供 outputStep 恢复渲染；与 complete.js 的 formatWaitHistory（单步、
 * 带追问指引）分工：本助手面向跨会话恢复语境，只做数据聚合不含指引。
 *
 * @param {object|null} progress - ProgressManager.read() 的进度对象
 * @param {string} stageName - 阶段名
 * @returns {Array<{stepName: string, rounds: Array<{round: number, answer: string, question: string|null, answeredAt: string|null}>}>|null}
 *          无进度/无任何回答记录时返回 null（调用方零输出）
 */
export function collectStageWaitHistory(progress, stageName) {
  const steps = progress?.stages?.[stageName]?.steps
  if (!Array.isArray(steps)) return null
  const entries = []
  for (const step of steps) {
    if (!step || typeof step.name !== 'string') continue
    const rounds = []
    if (Array.isArray(step.waitAnswers)) {
      for (const item of step.waitAnswers) {
        if (item && typeof item.answer === 'string' && item.answer.trim() !== '') {
          rounds.push({
            round: typeof item.round === 'number' ? item.round : rounds.length + 1,
            answer: item.answer,
            question: typeof item.question === 'string' && item.question.trim() !== '' ? item.question : null,
            answeredAt: typeof item.answeredAt === 'string' ? item.answeredAt : null,
          })
        }
      }
    }
    // 旧进度/部分路径只写单值列 wait_answer（--done --answer 坑1 路径）：并入为第 1 轮，避免丢
    if (rounds.length === 0 && typeof step.waitAnswer === 'string' && step.waitAnswer.trim() !== '') {
      rounds.push({ round: 1, answer: step.waitAnswer, question: null, answeredAt: null })
    }
    if (rounds.length > 0) entries.push({ stepName: step.name, rounds })
  }
  return entries.length > 0 ? entries : null
}

/**
 * 输出当前步骤的 prompt
 */
/**
 * requiresUser —— auto driver 元数据（change: 2026-09-08-auto-driver，D-002@v1）的四源判定纯函数：
 * step.requiresWait / conditionalWait / requiresConfirm 三键（step 定义权威信号）+ WAIT_MARKER_RE 正文扫描
 * （execute/verify 的 step 定义无三键，纯三源会漏真 wait 步）。全缺兜底 **false**——auto 默认语义是
 * 继续驱动（Grill P1-①：保守 true 会让 execute/verify 逐步人工确认，推翻 FR-01）。
 * 与 outputStep 内既有 mayNeedWait 计算同源（:1019 附近），仅多 requiresConfirm 一源。
 */
export function requiresUser(step, promptText) {
  if (!step) return false
  if (step.requiresWait === true || step.conditionalWait === true || step.requiresConfirm === true) return true
  return WAIT_MARKER_RE.test(String(promptText || ''))
}

// ── 前置失败清单 + 注入账本分叉（2026-09-18-preflight-slimming task-01，D-001@v1 / D-002@v1）──
// 纯函数面三导出之二/之三（hasDecisionId 在 src/decisions-io.js）。本节只打底零接线：
// {PREFLIGHT_FAILURES} 占位符渲染与模块/scan 注入分叉归 task-02，stages 步骤定义上的
// preflightValidators 声明归 task-04——声明落地前 renderPreflightFailures 恒返 ''，旧 prompt
// 逐字节不变（design 兼容策略第一条）。

/** 前置清单聚合条数帽（R-01 防打架三约束：条数帽 5——截断防清单全文顶回上下文） */
const PREFLIGHT_MAX_ITEMS = 5

/** 单 validator 超时帽 ms（R-02：只读快跑不拖慢 prompt 渲染；超时该 validator 计为跳过） */
const PREFLIGHT_VALIDATOR_TIMEOUT_MS = 3000

/** 超时哨兵（Promise.race 输出侧标记；Symbol 防与 validator 返回值撞车） */
const PREFLIGHT_TIMEOUT = Symbol('preflight-validator-timeout')

/**
 * 已声明 validator 名 → 只读校验函数映射（分发骨架的映射表）。
 *
 * 步骤定义在 stages/* 上声明 `preflightValidators: ['<键名>', ...]`（task-04 落地），渲染时按
 * 声明序查本表调用。本表收录键：
 *   - `design-file-list`：design-facts.validateDesignFileList 只读快查（design.md 文件清单
 *     幻觉路径 gate 前置）——errors 项为 {path, message}，取 message。
 *   - `four-piece-rules`：stage-contract 引擎轻查 brainstorm 四件套规则（evaluateRules 纯 kind
 *     dispatch，existsSync/readFileSync 量级）。scale 读取与 stage-contract.js
 *     validateBrainstormOutputs 同源（design.md frontmatter，fail-safe 无 scale → 四件套全
 *     要求），保证「事前给的 == 事后查的」。v2 扩展点：若内容类规则实测拖慢渲染，可按
 *     rule.id 白名单只跑四件套 file-exists 子集。
 *   - `postcheck-lite`（plan postcheck 轻子集）/ `allowed-paths-scan`（execute allowed_paths
 *     越界速查）：v2 扩展点——task-04 先声明亦安全跳过（未收录键零贡献，不报错）。
 *
 * 每个 validator 返回 { errors: string[] }（error 级失败消息；warning 不入清单——帽 5 内
 * 只放会拦 --done 的项，防噪声挤占）。
 */
const PREFLIGHT_VALIDATORS = {
  'design-file-list': ({ changeDir, cwd }) => {
    const r = validateDesignFileList({ changeDir, cwd })
    const errors = (r && Array.isArray(r.errors)) ? r.errors : []
    return { errors: errors.map((e) => (e && e.message) ? e.message : String(e)) }
  },
  'four-piece-rules': ({ changeDir }) => {
    let scale = null
    const designPath = join(changeDir, 'design.md')
    if (existsSync(designPath)) {
      const fm = readFileSync(designPath, 'utf8').match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/)
      const sm = fm && fm[1].match(/^scale:[ \t]*['"]?(\w+)/m)
      if (sm) scale = sm[1]
    }
    const r = evaluateRules('brainstorm', { changeDir, scale })
    return { errors: (r && Array.isArray(r.errors)) ? r.errors : [] }
  },
}

/**
 * 单 validator 只读快跑（带 3s 超时帽）：Promise.race 模式——超时计为跳过（零贡献）；
 * validator 抛错原样上抛（由 renderPreflightFailures 外层 catch 整体 fail-open 返 ''——
 * 验收口径「validator 抛错或无失败返回空串」）。finally clearTimeout 防 3s 定时器
 * 拖住 CLI 短进程退出（prompt 渲染完即退，悬挂 handle 会多挂 3s）。
 *
 * @param {string} name PREFLIGHT_VALIDATORS 键名
 * @param {{ changeDir: string|null, cwd: string, specBase: string, stageName: string, stepName: string, changeName: string|null }} ctx
 * @returns {Promise<string[]>} 该 validator 的 error 级失败消息（超时/未收录键 → []）
 */
async function runPreflightValidator(name, ctx) {
  const fn = PREFLIGHT_VALIDATORS[name]
  if (typeof fn !== 'function') return [] // 未收录键安全跳过（v2 扩展点见 PREFLIGHT_VALIDATORS 注释）
  let timerId = null
  try {
    const timeout = new Promise((resolve) => { timerId = setTimeout(() => resolve(PREFLIGHT_TIMEOUT), PREFLIGHT_VALIDATOR_TIMEOUT_MS) })
    const result = await Promise.race([Promise.resolve().then(() => fn(ctx)), timeout])
    if (result === PREFLIGHT_TIMEOUT) return []
    return (result && Array.isArray(result.errors)) ? result.errors : []
  } finally {
    if (timerId != null) clearTimeout(timerId)
  }
}

/**
 * renderPreflightFailures —— 产出型步骤 prompt 的前置失败清单渲染（D-001@v1 Phase 1 纯函数面）。
 *
 * 只读快跑本步骤 --done 将消费的 validator 子集，聚合 error 级失败为清单文本：
 *   - 分发骨架：从 stages 注册表步骤定义读 `preflightValidators` 键（task-04 落声明；无声明/
 *     无该 stage/无该步骤名 → 返 ''——渐进兼容，声明落地前零注入）。
 *   - 聚合帽：条数帽 5 截断，截断时加「…另 N 项见 gate」行（完整判定归 gate，清单是预检
 *     不是替身）；单 validator 超时帽 3s 计跳过；任何异常整体返 ''（fail-open 注入面——
 *     绝不阻塞 prompt 渲染与门判定，R-02）。
 *   - 防应试头行（R-07/FR-01）：清单头固定「已知失败项（非全部要求）」明示，防清单被当
 *     待办清单应试打磨致清单外质量失查；尾行指路 gate 完整清单。
 *
 * 零副作用：只读不写（validator 全部只读函数），不碰 stages 定义与 outputStep 渲染路径。
 *
 * @param {{ stageName?: string, stepName?: string, cwd?: string, specBase?: string, changeName?: string }} args
 * @returns {Promise<string>} 清单文本；无失败 / 无声明 / 异常 → ''
 */
export async function renderPreflightFailures({ stageName, stepName, cwd, specBase, changeName } = {}) {
  try {
    const stageDef = stageRegistry[stageName]
    const steps = (stageDef && Array.isArray(stageDef.steps)) ? stageDef.steps : []
    const step = steps.find((s) => s && s.name === stepName)
    const declared = (step && Array.isArray(step.preflightValidators)) ? step.preflightValidators : []
    if (declared.length === 0) return ''
    const changeDir = (specBase && changeName) ? join(specBase, 'changes', changeName) : null
    const ctx = { changeDir, cwd, specBase, stageName, stepName, changeName }
    // 并行只读快跑（R-02）：validator 抛错 → Promise.all 整体 reject → 外层 catch 返 ''
    const outcomes = await Promise.all(declared.map(async (name) => ({ name, errors: await runPreflightValidator(name, ctx) })))
    // 聚合（声明序）+ 折行压平（gate failMessage 可能含换行，清单一项一行）
    const items = []
    for (const o of outcomes) {
      for (const msg of o.errors) items.push(`- ${o.name}: ${String(msg).replace(/\s*\n\s*/g, ' ')}`)
    }
    if (items.length === 0) return ''
    const shown = items.slice(0, PREFLIGHT_MAX_ITEMS)
    const hidden = items.length - shown.length
    return [
      '⚠️ 已知失败项（非全部要求），清单外仍需按步骤说明自检：',
      ...shown,
      ...(hidden > 0 ? [`…另 ${hidden} 项见 gate`] : []),
      `完整清单：sillyspec gate ${stageName} --json`,
    ].join('\n')
  } catch {
    return '' // fail-open：任何异常静默不注（不阻 prompt 渲染）
  }
}

/**
 * shouldInjectFullContext —— 阶段注入账本分叉判定（D-002@v1 Phase 2 纯函数面）。
 *
 * 读 `<runtimeRoot>/prompt-inject-<changeName>.json` 账本（{stages:{[stage]:{firstStep,digest,at}}}）：
 *   - 文件不存在 / JSON 坏 / 无该 stage 记录 → { full: true }（首步语义：本阶段尚未注过全量）
 *   - 有记录 → { full: false, digest, firstStep }（同阶段后续步骤注摘要行的判定输入——
 *     「本阶段上下文已于步骤 N 注入（digest 前 8 位）」）
 *   - 账本读/解析异常 → { full: true }（design 兼容策略：分叉失败回退每步全量现状）
 *
 * 纯读不写：账本写入（首步全量注入后 withFileLock 幂等落盘）归 task-02；archive 回收
 * （pruneArchivedChangeRuntime 枚举登记）归 task-03。
 *
 * @param {{ changeName?: string, stageName?: string, runtimeRoot?: string }} args
 * @returns {{ full: boolean, digest?: string, firstStep?: number }}
 */
export function shouldInjectFullContext({ changeName, stageName, runtimeRoot } = {}) {
  try {
    if (!runtimeRoot || !changeName || !stageName) return { full: true }
    const ledgerPath = join(runtimeRoot, `prompt-inject-${changeName}.json`)
    if (!existsSync(ledgerPath)) return { full: true }
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    const rec = (ledger && ledger.stages && typeof ledger.stages === 'object') ? ledger.stages[stageName] : null
    if (!rec || typeof rec !== 'object') return { full: true }
    return { full: false, digest: rec.digest, firstStep: rec.firstStep }
  } catch {
    return { full: true }
  }
}

/**
 * 阶段注入摘要行渲染（task-02 接线，D-002@v1 Phase 2）：shouldInjectFullContext 判 full=false
 * 时的一行替代注入——同阶段后续步骤不再重注全量模块/scan 上下文，改指路（首步步骤号 + digest
 * 前 8 位 + 可 Read 路径，R-03 摘要丢上下文风险的对冲：该读可读回）。firstStep/digest 缺失
 * （账本记录不完整）给占位符不抛（渲染层永不因账本数据炸）。
 *
 * @param {{ firstStep?: number, digest?: string, specBase: string, projectName: string }} args
 * @returns {string} 单行摘要（「> 」引语形态）
 */
function renderPromptInjectSummaryLine({ firstStep, digest, specBase, projectName }) {
  const moduleMapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
  const scanDocsDir = join(specBase, 'docs', projectName, 'scan')
  return `> 本阶段模块/scan 上下文已于步骤 ${firstStep ?? '?'} 注入（digest ${digest || 'unknown'}）；需要时 Read ${moduleMapPath}（模块索引）或 ${scanDocsDir}/ 下 scan 文档（ARCHITECTURE.md / _facts.md）`
}

/**
 * 阶段注入账本落账（task-02 接线，D-002@v1 Phase 2 / R-06）：首步全量注入后写
 * `<runtimeRoot>/prompt-inject-<changeName>.json`（{stages:{[stage]:{firstStep,digest,at}}}，
 * design 数据模型节）。withFileLock 串行化 read-modify-write（quicklog.js:40 先例——多会话
 * 并行写同账本防丢更新）；幂等：已有该 stage 记录不覆盖（并发首步/同步重渲染不改写首步锚点）。
 * digest=全量注入内容 sha256 前 8 位（摘要行可核对的指纹）。异常上抛由调用方 catch 静默
 * （fail-open：账本写失败 → 后续步仍判 full 全量注入，绝不阻塞渲染）；archive 回收登记
 * （pruneArchivedChangeRuntime 枚举补本文件名）归 task-03。
 *
 * @param {{ runtimeRoot: string, changeName: string, stageName: string, firstStep: number, digest: string }} args
 */
async function recordPromptInjectLedger({ runtimeRoot, changeName, stageName, firstStep, digest }) {
  const ledgerPath = join(runtimeRoot, `prompt-inject-${changeName}.json`)
  await withFileLock(ledgerPath + '.lock', () => {
    let ledger = null
    try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) } catch { ledger = null }
    if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) ledger = {}
    if (!ledger.stages || typeof ledger.stages !== 'object' || Array.isArray(ledger.stages)) ledger.stages = {}
    if (ledger.stages[stageName] && typeof ledger.stages[stageName] === 'object') return // 幂等：已有该 stage 记录不覆盖
    ledger.stages[stageName] = { firstStep, digest, at: new Date().toISOString() }
    mkdirSync(runtimeRoot, { recursive: true })
    writeAtomicSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  })
}

export async function outputStep(stageName, stepIndex, steps, cwd, changeName, dbProjectName, platformOpts = {}, prevStepAnswer = null, waitHistory = null, autoMeta = null) {
  const step = steps[stepIndex]
  const total = steps.length
  // ── 越界防御 ──
  // steps/defSteps 来自 getStageSteps（如 buildPlanSteps），其长度可能与 progress.steps
  // 不一致（例如平台模式下 changeDir 解析失败导致 buildPlanSteps(null) 只返回 2 步 fixedPrefix）。
  // 此时 stepIndex 可能越界，访问 step.name 会 TypeError 崩溃。降级处理而非崩溃。
  if (!step) {
    console.error(`⚠️  无法输出步骤 ${stepIndex + 1}/${total}：步骤定义缺失`)
    console.error(`   stage=${stageName} stepIndex=${stepIndex} defSteps.length=${steps.length}`)
    console.error(`   可能原因：平台模式下 getStageSteps 未传 specRoot，或 plan/execute 步骤动态生成后 defSteps 未同步。`)
    console.error(`   请检查 --change 指定的变更目录是否存在、specRoot 是否正确，然后重试。`)
    return false
  }

  // X3 渲染侧接线（2026-08-29-change-delete-closure-and-spec-pull 遗留活跃坑收口；曾因并行
  // 会话提交丢弃一次，2026-09-12 复检重接）：步骤 prompt 渲染即步骤起点——补推一次 progress
  // 刷新平台 last_pushed_at（停滞判定不再把长步骤误报为「停滞」）。不 await：prompt 渲染不被
  // 网络阻塞；未连接平台静默 / quick 会话降级跳过 / 8s 熔断 / 失败只 warn，契约全在
  // triggerStepStartSync 内（shared.js docstring 即本接线点的说明），Node 事件循环保证在飞
  // POST 落地后进程才退出。
  triggerStepStartSync(cwd, changeName, platformOpts)

  // ── 首个 agent 可见步索引（「首步一次建立」类注入的锚点）──
  // step0 为 noAI（brainstorm/execute/verify 的 step1「进度确认」，2026-09-07）时不渲染 prompt，
  // persona/护栏/完成契约/铁律/平台路径约束等 step0 专属注入须顺延到首个渲染步，否则整段丢失
  //（spec-dir.test.mjs Test4 平台 specDir 断言即此坑的行为探针）。全 noAI 防御性回退 0。
  const firstRenderableIdx = (() => {
    const i = steps.findIndex(s => s?.noAI !== true)
    return i === -1 ? 0 : i
  })()

  const projectName = dbProjectName || basename(cwd)

  // ── Revision context injection ──
  const revisionCtx = platformOpts?._revision
  if (revisionCtx) {
    console.log(`### 🔄 Revision Context`)
    console.log(`本阶段处于修订模式（revision ${revisionCtx.revision}），不是首次执行。`)
    console.log(`- 修订起始步骤：${revisionCtx.fromStep}`)
    console.log(`- 当前步骤之前已完成的步骤仍然有效，不需要重做。`)
    console.log(`- 当前步骤及之后的步骤需要重新生成或调整已有产物。`)
    console.log(`- 已有产物文件（design.md、plan.md 等）被保留，审视并更新它们，而不是从零创建。`)
    console.log(`- 不要绕过 CLI 进度追踪。\n`)
  }

  const personas = {
    brainstorm: `### 🎯 你的角色：资深架构师
你是一位有 15 年经验的系统架构师。先理解业务本质，再设计技术方案。决策附理由，方案列 trade-off。不确定就说不确定，不猜。`,
    plan: `### 📋 你的角色：技术项目经理
你是一位经验丰富的技术项目经理。任务拆解粒度均匀，依赖关系明确。每个任务有完成标准，Wave 间有依赖说明。条理清晰，不做模糊描述。`,
    execute: `### 💻 你的角色：高级工程师
你是一位严谨的高级工程师。先读规范再写代码，严格遵循 CONVENTIONS.md 和 plan.md。**你不是设计师，是执行者——按 plan 搬砖，禁止发散思维。** 发现 plan 不合理就停下来反馈，不要自己改方案。代码有清晰职责划分，边界处理完善。少说多做，遇到规范冲突优先问。`,
    verify: `### 🔍 你的角色：QA 专家
你是一位吹毛求疵的 QA 专家。假设所有代码都有 bug，用最坏情况测试。关注边界、异常、并发。有问题直说，用证据说话，不写"看起来没问题"。`,
    quick: `### 💻 你的角色：全栈老兵
你是一位实战经验丰富的全栈工程师。不纠结架构和流程，理解需求就直接干。不确定的地方先问清楚再动手，先读后写，改完就收。问题排查思路开阔，前端报错不一定是前端问题——可能是后端数据、浏览器兼容、甚至设备硬件。解决方案实用接地气，用户描述有误敢于直接指出。`,
    explore: `### 🧭 你的角色：技术探索伙伴
你帮助用户澄清问题、调查代码库、比较方案和暴露风险。探索阶段不写实现代码，不安装依赖，不把讨论强行推进成开发。`
  }

  console.log(`---`)
  console.log(`stage: ${stageName}`)
  console.log(`step: ${stepIndex + 1}/${total}`)
  console.log(`stepName: ${step.name}`)
  console.log(`project: ${projectName}`)
  if (changeName) {
    console.log(`change: ${changeName}`)
    // changeDir 根（坑 change-dir-base-mismatch）：平台/漂移锚定用绝对根（specDriftAnchor 防
    // worktree 副本错位），普通本地保持相对 '.sillyspec' 展示契约（test 钉死）。此前
    // isPlatform 用 specRoot||runtimeRoot 判定、取值只拿 specRoot——runtimeRoot-only 平台组合
    // join(null,...) 直接 TypeError。
    const changeDirBase = platformOpts?.specRoot || platformOpts?.specDriftAnchor || '.sillyspec'
    const changeDir = join(changeDirBase, 'changes', changeName)
    console.log(`changeDir: ${changeDir}`)
  }
  console.log(`---\n`)
  // persona 只在首个 agent 可见步注入——角色设定一次即可，后续 step 重复注入纯属 token 浪费
  if (personas[stageName] && stepIndex === firstRenderableIdx) {
    console.log(personas[stageName])
    console.log('')
  }
  // 注入全局护栏（如 _globalGuardrails）
  const stageDef = stageRegistry[stageName]
  const guardrails = stageDef && stageDef._globalGuardrails ? stageDef._globalGuardrails : ''

  console.log(`## Step ${stepIndex + 1}/${total}: ${step.name}\n`)
  if (guardrails) {
    if (stepIndex === firstRenderableIdx) {
      console.log(guardrails.trim())
      console.log('')
    } else {
      // 护栏已在首步全文注入并留在 context；后续步只留一行精简提醒——
      // 防 context 压缩后 agent 遗忘安全约束（如 verify 禁破坏性 git/源码操作），又避免每步重复 ~1KB。
      console.log(`⛔ 本阶段护栏生效中（禁止破坏性操作，详见首步护栏）\n`)
    }
  }
  // 先解析 {{include: name}}（把外部模板片段拉进 prompt），再做下方占位符替换，
  // 保证模板内容里的 {SPEC_ROOT}/<change-name> 等也能被替换
  let promptText = resolvePromptIncludes(step.prompt)
  // ── M1 步骤指引静态段指纹增量（2026-09-21-r5-efficiency-batch2 task-01 / FR-01 / D-001@v1）──
  // P8 实证（round5）：73 次 CLI 调用注入 252KB、同步骤复入全量重印。契约：静态段按渲染指纹落盘
  // .runtime/step-guides/，同指纹复入静态部分 ≤10 行（指纹+路径+提示），动态注入段（值因运行而异）
  // 每次渲染永不缓存（附录照常输出）。--json（console.log 劫持形态，src/index.js withJsonOutput）与
  // SILLYSPEC_STEP_GUIDE=0 走全量——机器消费方与逃生门不读盘。
  const guideTemplate = promptText // 替换管线入口的模板原文（指纹基面）
  const dynSegments = [] // 动态注入段值收集（复入附录素材，顺序即渲染顺序）
  const substitute = (re, value, isStaticToken = false) => {
    const v = String(value)
    if (!isStaticToken) dynSegments.push(v) // 非白名单占位符默认按动态收集（错收只多不少，漏收才是坑）
    promptText = promptText.replace(re, v)
    return promptText
  }
  const substituteSplitJoin = (token, value) => {
    const v = String(value)
    dynSegments.push(v)
    promptText = promptText.split(token).join(v)
    return promptText
  }
  // 替换 prompt 中的占位符
  if (projectName && promptText.includes('<project>')) {
    substitute(/<project>/g, projectName, true)
  }
  // 替换 <git-user> 占位符
  if (promptText.includes('<git-user>')) {
    try {
      const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
      substitute(/<git-user>/g, gitUser, true)
    } catch {
      substitute(/<git-user>/g, 'unknown', true)
    }
  }
  // 替换时间戳占位符（本地墙钟统一走 nowWallClock——坑 taskcard-created-at-utc：人读字段用
  // UTC 会偏一个时区，子代理手工改）
  const now = new Date()
  const nowDatetime = nowWallClock(now)
  const nowTimestamp = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0') + String(now.getSeconds()).padStart(2,'0')
  const nowDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
  substitute(/<now-datetime>/g, nowDatetime)
  substitute(/<now-timestamp>/g, nowTimestamp)
  substitute(/<now-date>/g, nowDate)
  // <now-iso-datetime>（scan frontmatter updated_at 用；与 scan-fix-headers 同款秒级格式）。
  // 占位符名带 iso 是历史遗留——值已统一为本地墙钟（同 <now-datetime>），改名会破坏 stages 引用。
  substitute(/<now-iso-datetime>/g, nowWallClock(now))
  // <git-head-short>（scan frontmatter source_commit 用；CLI 代查，agent 勿自跑 rev-parse）
  if (promptText.includes('<git-head-short>')) {
    let headShort = 'unknown'
    try {
      headShort = safeGit(cwd, ['rev-parse', '--short', 'HEAD']).value || 'unknown'
    } catch { /* git 不可用 → unknown，scan-postcheck 失配时再核 */ }
    substitute(/<git-head-short>/g, headShort)
  }
  // 替换 {REVIEW_SCHEMA_VERSION} 占位符（task review 示例模板用，值=CLI 当前 REVIEW_SCHEMA_VERSION 常量，
  // 避免 agent 照抄 design 目标版本与 CLI 写侧常量漂移；与 stage review 契约 renderReviewJsonContract 动态注入同源）
  if (promptText.includes('{REVIEW_SCHEMA_VERSION}')) {
    substitute(/\{REVIEW_SCHEMA_VERSION\}/g, String(REVIEW_SCHEMA_VERSION))
  }
  // 替换 <change-name> 占位符
  if (changeName && promptText.includes('<change-name>')) {
    substitute(/<change-name>/g, changeName, true)
  }
  // 替换 <quick-session-id> 占位符（quick 阶段专用：sessionId == changeName == quick-<uuid8>，
  // 见 runStage 参数解析 quickSessionId 生成。告知 agent 本会话 id + --done 需带 --change）
  if (changeName && promptText.includes('<quick-session-id>')) {
    substitute(/<quick-session-id>/g, changeName, true)
  }
  // 替换 <quicklog-id> 占位符（quick 阶段：从 session guard.json 读 CLI 分配的 ql-ID，
  // 供 agent 在模块文档变更索引等处引用）
  if (promptText.includes('<quicklog-id>')) {
    const specBaseQl = resolvePromptSpecBase(platformOpts, cwd)
    let qlIdVal = ''
    try {
      const sessionGuardFile = join(specBaseQl, '.runtime', 'quick-sessions', changeName, 'guard.json')
      if (existsSync(sessionGuardFile)) {
        qlIdVal = JSON.parse(readFileSync(sessionGuardFile, 'utf8')).quicklogId || ''
      }
    } catch (err) {
      console.warn(`⚠️ quicklog-id 占位符读取 guard.json 失败: ${err && err.message ? err.message : err}`);
    }
    substitute(/<quicklog-id>/g, qlIdVal || '(未分配)')
  }
  // 替换 <linked-changes> 占位符（quick 阶段：从 .runtime/quick-sessions/<sessionId>/guard.json 读关联变更）
  if (promptText.includes('<linked-changes>')) {
    const specBaseLc = resolvePromptSpecBase(platformOpts, cwd)
    let linkedChanges = []
    try {
      // D-002：guard 按 session 存。changeName == quick-<uuid8>（见 runStage 参数解析）。回退读旧单文件（兼容 task-03 前）
      const sessionGuardFile = join(specBaseLc, '.runtime', 'quick-sessions', changeName, 'guard.json')
      const legacyGuardFile = join(specBaseLc, '.runtime', 'quick-guard.json')
      const guard = existsSync(sessionGuardFile)
        ? JSON.parse(readFileSync(sessionGuardFile, 'utf8'))
        : (existsSync(legacyGuardFile) ? JSON.parse(readFileSync(legacyGuardFile, 'utf8')) : null)
      if (guard) linkedChanges = Array.isArray(guard.linkedChanges) ? guard.linkedChanges : []
    } catch {}
    const display = linkedChanges.length > 0 ? linkedChanges.join(', ') : '（无）'
    substitute(/<linked-changes>/g, display, true)
  }
  // 平台模式：注入路径覆盖指令
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) {
    const projectName = dbProjectName || basename(cwd)
    // platformOpts.specRoot 现在指向 specDir 本身（可能是 cwd/.sillyspec 或外部路径）
    const specSillyspec = resolvePromptSpecBase(platformOpts, cwd)
    const docsRoot = join(specSillyspec, 'docs', projectName)
    const projectsRoot = join(specSillyspec, 'projects')
    const changesRoot = join(specSillyspec, 'changes')
    const workflowsRoot = join(specSillyspec, 'workflows')
    const knowledgeRoot = join(specSillyspec, 'knowledge')

    promptText = applyRootPlaceholders(promptText, { specRoot: specSillyspec, docsRoot, projectsRoot, workflowsRoot, knowledgeRoot })

    const platformDirectives = []
    platformDirectives.push(
      `## ⚠️ 平台模式 — 写入路径约束（必须严格遵守）\n` +
      `\n` +
      `规范目录（specDir）: \`${specSillyspec}\`\n` +
      `- 文档根目录: \`${docsRoot}/\`\n` +
      `- 项目注册表: \`${projectsRoot}/\`\n` +
      `- 变更目录: \`${changesRoot}/\`\n` +
      `- 工作流目录: \`${workflowsRoot}/\`\n` +
      `- 术语目录: \`${knowledgeRoot}/\`\n` +
      `\n` +
      `### ⛔ 写入规则\n` +
      `1. **所有文档、配置、产物只能写入上述路径**。严禁写入源码目录或相对路径 \`.sillyspec/\`。\n` +
      `2. **不允许**从 cwd 推导文档路径，必须使用上面列出的绝对路径。\n` +
      `3. **源码扫描范围**必须排除：.sillyspec/、.claude/、.git/、node_modules/、dist/、build/、__pycache__/\n` +
      `4. **local.yaml 校验**：commands 中引用的命令必须在 package.json 的 scripts 中存在，不存在的标记为 unavailable，不能写 "配置良好"\n` +
      `\n` +
      `### ⛔ Write 工具规则\n` +
      `1. 如果 Write 返回 \"File has not been read yet\"，正确动作是：先 Read 目标文件 → 再 Write 覆盖。\n` +
      `2. **不允许**用 cat >、tee、heredoc 等 Bash 方式绕过 Write 工具。\n` +
      `3. 如果 Write 和 Read 均失败，记录失败并停止当前 step。\n` +
      `\n` +
      `### 📍 Workflow YAML 占位符映射（task-05）\n` +
      `读取 \`{WORKFLOWS_ROOT}/scan-docs.yaml\` 时，yaml 内的占位符按以下映射替换为绝对路径：\n` +
      `- \`{SPEC_ROOT}\` → \`${specSillyspec}\`（规范目录根）\n` +
      `- \`<project>\` → 当前项目名（见下方 step 提示，等于 \`${projectName}\`）\n` +
      `- 例：\`{SPEC_ROOT}/docs/<project>/scan/ARCHITECTURE.md\` → \`${docsRoot}/scan/ARCHITECTURE.md\`\n` +
      `\n` +
      `创建目录: \`mkdir -p ${docsRoot}/{scan,modules,flows} ${projectsRoot} ${changesRoot}\`\n`
    )
    if (platformOpts.runtimeRoot) {
      const scanRunId = platformOpts.scanRunId || 'scan-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      platformDirectives.push(
        `运行时产物写入: \`${platformOpts.runtimeRoot}/scan-runs/${scanRunId}/\`\n`
      )
    }
    if (platformOpts.workspaceId) {
      platformDirectives.push(`workspace_id: ${platformOpts.workspaceId}`)
    }
    // 平台 directives 前置条件：
    //   - 首个 agent 可见步（对齐 persona 仅 step0 策略）：路径列表/Write 规则/占位符映射
    //     一次建立即可——step0 为 noAI（brainstorm/execute/verify 的 step1「进度确认」，
    //     2026-09-07）时首个可见步顺延，按 defSteps 计算（坑同 scan quick 档 noAI preflight）；
    //   - scan 阶段所有 step：scan 的 profileDirectives 本就每步注入（见下方 L917），平台路径
    //     约束也需每步可见——否则 quick profile 的 step0 是 noAI preflight（自动执行），run scan
    //     输出的首个可见 step 是 step1，会漏掉 specDir 路径，导致平台模式写入约束丢失。
    //     后续 step 靠 changeDir header + footer 平台规则（L1077+）维持，platformDirectives
    //     每步重复约 500 tokens 仅在 scan（步数有限）可接受。
    if (stepIndex === firstRenderableIdx || stageName === 'scan') {
      promptText = platformDirectives.join('\n') + '\n\n' + promptText
    }
  } else {
    // 常规模式（无平台 specRoot）：占位符替换为 cwd/.sillyspec 下对应路径
    // 让用 {SPEC_ROOT}/{DOCS_ROOT} 等占位符的 prompt（如 quick/scan）在常规模式也写到正确位置
    const projectName = dbProjectName || basename(cwd)
    const specSillyspec = resolvePromptSpecBase(platformOpts, cwd)
    promptText = applyRootPlaceholders(promptText, {
      specRoot: specSillyspec,
      docsRoot: join(specSillyspec, 'docs', projectName),
      projectsRoot: join(specSillyspec, 'projects'),
      workflowsRoot: join(specSillyspec, 'workflows'),
      knowledgeRoot: join(specSillyspec, 'knowledge'),
    })
  }

  // 注入 scanProfile 硬约束指令
  if (stageName === 'scan' && platformOpts?.scanProfile) {
    const sp = platformOpts.scanProfile
    const profileDirectives = []
    profileDirectives.push(`## 📊 Scan Profile: ${sp.mode} (${sp.reason})`)
    if (sp.maxAgentCalls === 0) {
      profileDirectives.push(`**⛔ 严禁使用子代理（Agent/Task 工具）。** 必须在本 turn 内完成所有工作。`)
    } else if (sp.maxAgentCalls > 0) {
      profileDirectives.push(`**子代理上限：${sp.maxAgentCalls} 个。** 不要超出。`)
    }
    if (sp.maxDocs < 99) {
      profileDirectives.push(`**文档上限：${sp.maxDocs} 份。** 只生成核心文档，不要额外生成 flows/glossary/module-card。`)
    }
    profileDirectives.push(`--output 只需要列出文件名，不要写长篇总结。`)
    promptText = profileDirectives.join('\n') + '\n\n' + promptText

    // scanProfile 分支也要替换占位符（非 platform 模式也会走到这里）
    const _pName = dbProjectName || basename(cwd)
    const _specSS = resolvePromptSpecBase(platformOpts, cwd)
    const _docsRoot = join(_specSS, 'docs', _pName)
    promptText = applyRootPlaceholders(promptText, {
      specRoot: _specSS,
      docsRoot: _docsRoot,
      projectsRoot: join(_specSS, 'projects'),
      workflowsRoot: join(_specSS, 'workflows'),
      knowledgeRoot: join(_specSS, 'knowledge'),
    })
  } else {
    // 非 platform 模式也要替换占位符
    const projectName = dbProjectName || basename(cwd)
    const specSillyspec = resolvePromptSpecBase(platformOpts, cwd)
    const docsRoot = join(specSillyspec, 'docs', projectName)
    const projectsRoot = join(specSillyspec, 'projects')
    const workflowsRoot = join(specSillyspec, 'workflows')
    const knowledgeRoot = join(specSillyspec, 'knowledge')
    promptText = applyRootPlaceholders(promptText, { specRoot: specSillyspec, docsRoot, projectsRoot, workflowsRoot, knowledgeRoot })
  }

  // scan 漂移事实注入（债单 D-7 方案 A）：brainstorm「加载项目上下文」读 scan 文档前，
  // CLI 算出 staleness（source_commit vs HEAD）注入一行事实——"算事实注入"原则（债单第六节），
  // 不是劝说指令。computeScanStaleness 内部全降级（无文档 null / git 失败 unknown），不阻断。
  if (stageName === 'brainstorm' && promptText.includes('{SCAN_STALENESS}')) {
    try {
      const { computeScanStaleness } = await import('../scan-staleness.js')
      const stalenessSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const projectName = dbProjectName || basename(cwd)
      const fact = computeScanStaleness({ projectRoot: cwd, specBase: stalenessSpecBase, projectName })
      const injected = fact
        ? `[docs-debt] scan 基线漂移：${fact.message}`
        : '[docs-debt] scan 基线漂移：无 scan 文档（绿地项目），跳过判定'
      substitute(/\{SCAN_STALENESS\}/g, injected)
    } catch (e) {
      substitute(/\{SCAN_STALENESS\}/g, `[docs-debt] scan 漂移检测异常（${e.message}），跳过判定`)
    }
  }

  // 机械事实底稿注入（IR P3c task-03，D-003@v1 三件套之三）：brainstorm「加载项目上下文」Step2
  // 的 {SCAN_FACTS} → docs/<project>/scan/_facts.md 全文（scan facts CLI 确定性抽取的端点/依赖/
  // 规模底稿）+ 红线一句（措辞对齐 scan 子代理先例 stages/scan.js——禁止重新 grep 发现底稿覆盖
  // 的机械事实，冲突以底稿为准），探索期直接消费省 token。>15KB 按 UTF-8 字节截断并提示跑
  // `sillyspec scan facts` 刷新（design R-04）；文件不存在/读取失败空注入（fail-soft，不留残留
  // 占位符）。只挂 brainstorm：双重条件（stageName 判定 + 占位符仅存在于 brainstorm Step2
  // prompt），与下方 buildModuleContextInjection（横跨 brainstorm/plan/execute 三阶段）相互独立。
  if (stageName === 'brainstorm' && promptText.includes('{SCAN_FACTS}')) {
    let factsInjected = ''
    try {
      const factsSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const factsProjectName = dbProjectName || basename(cwd)
      const factsPath = join(factsSpecBase, 'docs', factsProjectName, 'scan', '_facts.md')
      if (existsSync(factsPath)) {
        const factsBuf = readFileSync(factsPath) // Buffer：按 UTF-8 字节判 15KB 阈值
        const FACTS_LIMIT = 15 * 1024
        const factsBody = factsBuf.length > FACTS_LIMIT
          ? factsBuf.subarray(0, FACTS_LIMIT).toString('utf8') +
            `\n\n（⚠️ 底稿超过 15KB 已截断——完整内容可读 \`${factsPath}\`；底稿已过期时可跑 \`sillyspec scan facts\` 刷新）`
          : factsBuf.toString('utf8')
        factsInjected =
          '\n\n### 🧾 机械事实底稿（scan facts CLI 抽取，docs/' + factsProjectName + '/scan/_facts.md 全文注入）\n\n' +
          factsBody +
          '\n\n⛔ 红线（同 scan 子代理先例）：禁止重新 grep 发现底稿覆盖的机械事实（端点/依赖/规模），冲突以底稿为准。\n'
      }
    } catch { /* fail-soft：读取失败空注入，不阻断 prompt 输出 */ }
    substitute(/\{SCAN_FACTS\}/g, factsInjected)
  }

  // ── 机械事实注入三件（2026-09-07 注入缺口批次）：{LOCAL_COMMANDS} / {GIT_DIRTY} / {TASKS_CHECKBOX} ──
  // CLI 渲染 prompt 时已能确定性拿到的机械事实，替代 agent 各自跑一趟 cat local.yaml /
  // git status / 手数勾选（全流程 7+ 处步骤的高频机械读）。全部 fail-soft：异常注入单行
  // 说明，不留残留占位符；替换后占位符即消失（不存在的档位自然零输出）。

  // ① {LOCAL_COMMANDS}：local.yaml commands 段原文（brainstorm/plan/execute/verify/quick 多步消费）
  if (promptText.includes('{LOCAL_COMMANDS}')) {
    let localBlock = ''
    try {
      const lcSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const localPath = join(lcSpecBase, 'local.yaml')
      if (existsSync(localPath)) {
        const lcLines = String(readFileSync(localPath, 'utf8')).replace(/\r\n?/g, '\n').split('\n')
        const start = lcLines.findIndex(l => /^commands:\s*(#.*)?$/.test(l))
        if (start !== -1) {
          const body = []
          for (let i = start + 1; i < lcLines.length && !/^\S/.test(lcLines[i]); i++) body.push(lcLines[i])
          // unavailable 标记的条目按未配置语义剔除行（与 extractTestCommand 同口径）
          const avail = body.filter(l => !/^\s*[\w.-]+:\s*['"]?unavailable['"]?\s*(#.*)?$/i.test(l))
          const trimmed = avail.join('\n').trim()
          localBlock = trimmed
            ? 'commands:\n' + trimmed
            : '（local.yaml 存在但 commands 段为空——可跑 `sillyspec local detect` 补默认骨架）'
        } else {
          localBlock = '（local.yaml 存在但无 commands 段——可跑 `sillyspec local detect` 补默认骨架）'
        }
      } else {
        localBlock = '（未配置 local.yaml——先跑 `sillyspec local detect` 生成骨架，以命令输出为准）'
      }
    } catch (e) {
      localBlock = `（构建命令注入失败：${e.message}——可自行读 local.yaml）`
    }
    substitute(/\{LOCAL_COMMANDS\}/g, localBlock)
  }

  // ①b {QUICK_CONTEXT_DIGEST}（刀①，2026-09-08）：quick step1 的项目/约定上下文 CLI 代读注入
  // ——替代 agent cat projects/*.yaml 与 CONVENTIONS.md 两轮文件读取（quick 是最高频路径）。
  // fail-soft 同三件套；无 quick 占位符自然零输出。
  if (stageName === 'quick' && promptText.includes('{QUICK_CONTEXT_DIGEST}')) {
    const digestSpecBase = resolvePromptSpecBase(platformOpts, cwd)
    substitute(/\{QUICK_CONTEXT_DIGEST}/g, buildQuickContextDigest(digestSpecBase, projectName))
  }

  // ①c {FR_INDEX_DIGEST}（2026-09-18-fr-index-l1 L1，D-004）：brainstorm step8 的触达域现行 FR 注入
  // ——写作期防重复 FR 的确定性清单（superseded 默认藏）；无触达域索引/索引空 → 段消隐。
  // fr-inject 遥测（L3 证据发生器指标①）fail-soft；token 本体在 stages/brainstorm.js step8 模板。
  if (stageName === 'brainstorm' && promptText.includes('{FR_INDEX_DIGEST}')) {
    try {
      const frSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const { discoverModuleIndex } = await import('../decision-distill.js')
      const { resolveTouchedDomains, readActiveFrDigest } = await import('../fr-index.js')
      const frChangeDir = join(frSpecBase, 'changes', String(changeName || ''))
      const knowledgeRoot = join(frSpecBase, 'knowledge')
      const domains = resolveTouchedDomains(frChangeDir, discoverModuleIndex(knowledgeRoot))
      const entries = readActiveFrDigest(knowledgeRoot, domains)
      if (entries.length === 0) {
        substitute(/\{FR_INDEX_DIGEST\}/g, '（触达域暂无 active FR 索引条目——本变更大概率是这些域的首批需求，照常写作）')
      } else {
        const lines = entries.map((e) => `- ${e.id} ${e.title}（来源 ${e.change}${e.scenarios.length ? '；场景：' + e.scenarios.slice(0, 3).join('，') : ''}${(e.decisions || []).length ? '；依据：' + e.decisions.slice(0, 3).join('、') : ''}）${e.needsReview ? ` ⚠️ 待复核（${e.needsReview}）——该 FR 覆盖的代码近期被 quick 触达，行为可能已变；本变更若触及同域先核对现状再决定承接/新写` : ''}`)
        lines.push('')
        lines.push('> 域解析自本变更 design.md 文件清单（漏域先核对清单）。改写/取代已有行为 → 对应 FR 块加承接行；新行为 → 新 FR 块。superseded 条目默认不列（历史回溯自行读 knowledge/fr/）。依据决策（L2）= 当年取舍锚——翻案须先读 knowledge/decisions/<域>.md 的否决理由，满足复潮条件走 D-xxx@vN+1，不得静默改行为。承接行可带退役理由：`承接: FR-<域>-NNN（退役理由：一句话）`——归档时写进被取代条目（理由内禁逗号）；条目正文是截断摘要，全文锚（全文：<归档路径>#FR-NN）由 CLI 自动落。')
        substitute(/\{FR_INDEX_DIGEST\}/g, lines.join('\n'))
      }
      try {
        const { appendKnowledgeHit } = await import('../knowledge-hits.js')
        appendKnowledgeHit(join(frSpecBase, '.runtime'), {
          type: 'fr-inject', change: changeName, domains, count: entries.length, source: 'digest',
        })
      } catch { /* 遥测 fail-soft */ }
    } catch (e) {
      substitute(/\{FR_INDEX_DIGEST\}/g, `（FR 索引注入失败：${e && e.message ? e.message : e}——可自行读 {SPEC_ROOT}/knowledge/fr/）`)
    }
  }

  // ② {GIT_DIRTY}：工作区脏文件清单（git status --porcelain，quick 收尾步消费）
  if (promptText.includes('{GIT_DIRTY}')) {
    let dirtyBlock = ''
    try {
      const { gitQuiet } = await import('../git-helper.js')
      // gitQuiet 返回裸 string（失败 null）——非 safeGit 的 {value,error} 形状
      const lines = String(gitQuiet(cwd, ['status', '--porcelain']) || '').split('\n').filter(Boolean)
      dirtyBlock = lines.length === 0
        ? '（工作区干净，无脏文件）'
        : lines.slice(0, 40).join('\n') + (lines.length > 40 ? `\n（…共 ${lines.length} 行，超出 40 行截断——完整清单可自行跑 git status --porcelain）` : '')
    } catch (e) {
      dirtyBlock = `（脏文件注入失败：${e.message}——可自行跑 git status --porcelain）`
    }
    substitute(/\{GIT_DIRTY\}/g, dirtyBlock)
  }

  // ③ {TASKS_CHECKBOX}：tasks.md 任务勾选状态投影（verify 逐项检查步消费——省 agent 手数）
  if (promptText.includes('{TASKS_CHECKBOX}')) {
    let tasksBlock = ''
    try {
      const tcSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const tasksPath = changeName ? join(tcSpecBase, 'changes', changeName, 'tasks.md') : null
      if (tasksPath && existsSync(tasksPath)) {
        const re = /^(\s*[-*]\s+\[([ xX])\]\s+task-\d+.*)$/
        const rows = String(readFileSync(tasksPath, 'utf8')).replace(/\r\n?/g, '\n').split('\n')
          .map(l => l.match(re)).filter(Boolean).map(m => m[1].trim())
        const checked = rows.filter(r => /\[x\]/i.test(r)).length
        tasksBlock = rows.length === 0
          ? '（tasks.md 无 task-NN checkbox 行）'
          : `已勾 ${checked}/${rows.length}：\n` + rows.slice(0, 60).join('\n') + (rows.length > 60 ? `\n（…共 ${rows.length} 条，超出 60 条截断）` : '')
      } else {
        tasksBlock = '（tasks.md 不存在——跳过勾选对照）'
      }
    } catch (e) {
      tasksBlock = `（勾选状态注入失败：${e.message}——可自行读 tasks.md）`
    }
    substitute(/\{TASKS_CHECKBOX\}/g, tasksBlock)
  }

  // 决策防复潮注入（W1.1 第 3 点，task-04，FR-05）：brainstorm「加载项目上下文」Step2 的
  // {DECISION_HITS} → matchKnowledge decisionHits——命中 rejected 条目时渲染「否决决策提示」段
  // （ID/标题/否决理由/复潮条件），无命中替换为空串零输出（不留残留占位符）；注入结果同步落
  // runtime JSON（与 KNOWLEDGE_HIT_REPORT 的 json 落盘同口径）。advisory 展示，不改变步骤流程；
  // 全降级不抛（异常 → 单行说明）。
  if (stageName === 'brainstorm' && promptText.includes('{DECISION_HITS}')) {
    try {
      const { matchKnowledge } = await import('../knowledge-match.js')
      const decSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const decKnowledgeDir = join(decSpecBase, 'knowledge')
      // taskContext：changeName（brainstorm Step2 时 tasks.md 尚未生成，变更名是唯一稳定任务
      // 语料；与 execute 分支的 changeName 基底同口径）
      const decResult = matchKnowledge(decKnowledgeDir, changeName || '')
      const rejectedHits = (decResult.decisionHits || []).filter(h => h.status === 'rejected')
      let decInjected = ''
      if (rejectedHits.length > 0) {
        const lines = [
          '⚠️ 否决决策提示（历史已否决，防复潮）——下列决策此前已被否决。看到否决理由后，除非复潮条件明确满足，不要在本次方案中重新提出；若认为复潮条件已满足，须在本变更 decisions.md 记录新版本条目（D-xxx@vN+1）说明依据：'
        ]
        for (const h of rejectedHits) {
          lines.push(`- ${h.id} ${h.title}（${h.file}）`)
          lines.push(`  - 否决理由：${h.reason || '（未记录）'}`)
          lines.push(`  - 复潮条件：${h.revisitWhen || '（未记录）'}`)
        }
        decInjected = '\n\n' + lines.join('\n')
      }
      substitute(/\{DECISION_HITS\}/g, decInjected)
      // 注入结果同步落 runtime JSON（与既有 KNOWLEDGE_HIT_REPORT 落盘口径一致）
      const decRuntimeDir = join(decSpecBase, '.runtime')
      mkdirSync(decRuntimeDir, { recursive: true })
      writeAtomicSync(join(decRuntimeDir, 'decision-hits.json'), JSON.stringify({ matched: decResult.matched, decisionHits: decResult.decisionHits || [] }, null, 2) + '\n')
    } catch (e) {
      substitute(/\{DECISION_HITS\}/g, `[decisions] 决策命中检测异常（${e.message}），跳过`)
    }
  }

  // Knowledge hit report: execute 阶段注入匹配结果
  // 2026-09-14-knowledge-loop-close task-04（FR-04，X-004 升级既有机制）：命中清单报告 → 命中
  // 正文注入——命中时占位符替换为「📚 命中知识」段（top-3 不同 file + 首 40 行截断，段头保留
  // Status/Entries/Sources 命中报告语义），并逐条 appendKnowledgeHit 落 hits.jsonl 遥测；
  // 未命中替换值与升级前字节一致（knowledgeResult.report == 'Status: no matches'，零膨胀）。
  // 既有 knowledge-hit-report.json 照旧落盘（未命中也写 matched:false 快照，行为不变）。
  if (stageName === 'execute' && promptText.includes('{KNOWLEDGE_HIT_REPORT}')) {
    try {
      const effectiveSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const knowledgeDir = join(effectiveSpecBase, 'knowledge')
      // taskContext: changeName + tasks.md 任务名（注册表唯一真相，2026-08-20-task-truth-unify）
      let taskContext = changeName || ''
      if (changeName) {
        const tasksMdPath = join(effectiveSpecBase, 'changes', changeName, 'tasks.md')
        const planPath = join(effectiveSpecBase, 'changes', changeName, 'plan.md')
        const srcPath = existsSync(tasksMdPath) ? tasksMdPath : planPath
        try {
          const registryContent = readFileSync(srcPath, 'utf8')
          // match "- [ ] task-01: title" / "## task-01: title"（兼容旧 plan.md 内联两种形态）
          const taskLines = [...registryContent.matchAll(/(?:^\- \[[ x]\] |^## )task-\d+[^:]*:?\s*(.+)/gm)]
          if (taskLines.length > 0) {
            taskContext += ' ' + taskLines.map(t => t[1]).join(' ')
          }
        } catch {}
      }
      const runtimeDir = join(effectiveSpecBase, '.runtime')
      const knowledgeInjection = buildKnowledgeInjection({
        knowledgeDir,
        runtimeDir,
        change: changeName || '',
        query: taskContext,
      })
      substitute(
        /\{KNOWLEDGE_HIT_REPORT\}/g,
        knowledgeInjection.matched ? knowledgeInjection.section : knowledgeInjection.report
      )
      // 写入 runtime JSON（既有机制照旧，新旧遥测共存）
      mkdirSync(runtimeDir, { recursive: true })
      writeAtomicSync(join(runtimeDir, 'knowledge-hit-report.json'), JSON.stringify(knowledgeInjection.json, null, 2) + '\n')
    } catch (e) {
      substitute(/\{KNOWLEDGE_HIT_REPORT\}/g, 'Status: no matches (error: ' + e.message + ')')
    }
  }

  // docs-debt 模块文档欠账事实注入（2026-08-15 docs-debt-inject D-006，债单第六节"CLI 算事实"）：
  // Wave prompt {DOCS_DEBT} → computeDocsDebt（git diff × module-map）facts；空 facts 替换为空串
  // （无债零输出，无残留占位符）。changedFiles 口径（D-001/FR-007）：worktree 根
  // （meta.json 所在）git status --porcelain + diff baselineCommit..HEAD 并集——公共实现已抽至
  // docs-debt.collectExecuteChangedFiles（execute.js Wave 步渲染点同源复用，勿双写）。
  // 全降级不抛（异常 → 单行说明）。
  if (stageName === 'execute' && promptText.includes('{DOCS_DEBT}')) {
    try {
      const debtSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const debtProjectName = dbProjectName || basename(cwd)
      const { collectExecuteChangedFiles, computeDocsDebt, computeDecisionTouches, renderDecisionTouchFacts } = await import('../docs-debt.js')
      const { root: debtProjectRoot, changedFiles } = collectExecuteChangedFiles({ specBase: debtSpecBase, changeName, cwd })
      const result = computeDocsDebt({
        projectRoot: debtProjectRoot,
        specBase: debtSpecBase,
        projectName: debtProjectName,
        changedFiles,
      })
      // 决策锚点触碰事实（2026-08-24-decision-touch-cli-drift task-01，W-A 次渲染点）：重入/reset
      // 场景 changedFiles 非空时呈现。advisory 追加渲染分支——既有 docs-debt facts 逐字不变，
      // 无触碰 render 返回 ''（零输出）；主渲染点在 execute.js buildWavePrompt（同源 facts 计算）。
      let debtTouchFacts = ''
      try {
        debtTouchFacts = renderDecisionTouchFacts(computeDecisionTouches(changedFiles, join(debtSpecBase, 'knowledge')).touches)
      } catch { /* 触碰计算降级为空——不影响欠账 facts 注入 */ }
      substitute(/\{DOCS_DEBT\}/g, [result.facts, debtTouchFacts].filter(Boolean).join('\n'))
    } catch (e) {
      substitute(/\{DOCS_DEBT\}/g, `[docs-debt] 欠账计算异常（${e.message}），跳过`)
    }
  }

  // 模块卡分级表注入（token 成本优化 P0a，2026-08-22-token-cost-optimization）：execute
  // 「加载上下文」步 {MODULE_RESOLVE_TABLE} → resolveChangeModuleCards（tasks 卡 allowed_paths
  // × 全部 _module-map.yaml 跨层最长前缀匹配，子项目细卡优先于根层大卡）。全降级不抛
  // （异常 → 单行说明），无 map 由渲染函数给出跳过提示——占位符恒被替换。
  if (stageName === 'execute' && promptText.includes('{MODULE_RESOLVE_TABLE}')) {
    try {
      const { renderModuleResolveTable } = await import('../module-resolve.js')
      const mrSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const table = renderModuleResolveTable({ cwd, specBase: mrSpecBase, changeName })
      substitute(/\{MODULE_RESOLVE_TABLE\}/g, table)
    } catch (e) {
      substitute(/\{MODULE_RESOLVE_TABLE\}/g, `[modules-resolve] 模块卡分级解析异常（${e.message}），跳过——可手跑 sillyspec modules resolve --change <变更名>`)
    }
  }

  // Execute: 注入 currentExecuteRunId（从变更专属标记文件读取）
  if (stageName === 'execute' && promptText.includes('{EXECUTE_RUN_ID}')) {
    let runId = ''
    const execSpecBase = resolvePromptSpecBase(platformOpts, cwd)
    const runtimeRoot = resolveRuntimeRoot(platformOpts, execSpecBase)
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    try {
      if (existsSync(runIdFile)) {
        const c = readFileSync(runIdFile, 'utf8').trim()
        // marker 是 agent 可写内容，直接注入 prompt + 拼进 gate 读 review.json 的路径——
        // 格式校验同时防提示词注入与路径穿越（对齐 stage-review marker 的前缀校验范式）
        if (c && !isValidExecuteRunId(c)) {
          console.warn(`[sillyspec] execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），视为缺失重新生成`)
        } else {
          runId = c
        }
      }
    } catch {}
    if (!runId) {
      const { generateExecuteRunId, claimExecuteRunId } = await import('../task-review.js')
      runId = generateExecuteRunId(changeName)
      // 落盘（与启动站点一致），保证 agent 收到的 ID == gate/checkbox 读取的 ID
      // D-001#1 fallback 写入点：mkdir execute-runs/<runId>/tasks 先于 marker（不变量：marker 在则目录在）。
      // 渲染路径异常不能炸 prompt 输出 → catch 内 console.error 留痕 + 保留降级（ID 注入继续，
      // 目录由下游 review 写入 / 其他写入点补齐）。
      try {
        // 排他认领（坑 exec-run-id-same-second-collision）：并行会话同秒碰撞在认领处消解
        runId = claimExecuteRunId(runtimeRoot, runId)
        mkdirSync(join(runtimeRoot, 'execute-runs', runId, 'tasks'), { recursive: true })
        writeAtomicSync(runIdFile, runId + '\n')
      } catch (e) {
        console.error(`[sillyspec] execute run marker/目录写入失败（降级继续，ID ${runId} 仍注入 prompt）: ${e.message}`)
      }
    }
    substitute(/\{EXECUTE_RUN_ID\}/g, runId)
  }

  // Stage Review Tier：brainstorm/plan/execute 阶段注入审查分级占位符
  // （scanProfile 只在 scan 生效、change-risk-profile 只管 apply/verify，都不约束这些阶段的审查方式，
  //  故按 ceremony_tier 风险定价分级——2026-09-18-ceremony-risk-pricing task-05 起 plan_level 降级为
  //  编排标签不再驱动仪式档：S0/S1 → self 轻仪，S2 → independent×1，S3 → independent 多轮；
  //  {REVIEW_TIER} 注入值 = tier 值 + 追加 ceremony 档位菜单块（renderCeremonyTierInjection），
  //  {REVIEW_TIER_REASON} 注入机制不动（reason 已含 ceremony 档与 blast 来源，task-02 契约））
  if (['brainstorm', 'plan', 'execute'].includes(stageName) && promptText.includes('{REVIEW_TIER}')) {
    try {
      const { classifyReviewTier } = await import('../review-tier.js')
      const { generateStageReviewRunId, renderReviewJsonContract, stageReviewMarkerPath, readReviewChannelPriority, getLatestStageReviewRunId, collectSameStagePriorReview, renderPriorRoundFindingsMd } = await import('../stage-review.js')
      const tierSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const tierChangeDir = changeName ? join(tierSpecBase, 'changes', changeName) : null
      const designPath = tierChangeDir ? join(tierChangeDir, 'design.md') : null
      let planLevel = null
      if (tierChangeDir) {
        const planPath = join(tierChangeDir, 'plan.md')
        if (existsSync(planPath)) {
          const fmLine = readFileSync(planPath, 'utf8').split('\n').find(l => l.trim().startsWith('plan_level:'))
          if (fmLine) planLevel = fmLine.split(':')[1].trim()
        }
      }
      const tier = classifyReviewTier({ planLevel, designPath })
      // ceremony 档位菜单（第三消费面，task-05）：classifyReviewTier 双字段的 ceremonyTier 驱动
      // 仪式档渲染；force_tier 逃生阀只升不降（升向强制 S2/S3 时注入 tier 值随调 independent，
      // 与下方契约渲染/前序事实注入同用 effective 值，防 prompt 与注入块自相矛盾）
      const ceremonyInjection = renderCeremonyTierInjection({
        ceremonyTier: tier.ceremonyTier, tierValue: tier.tier, planLevel, cwd,
      })
      // reviewRunId：优先读 marker 复用（保证多次渲染 prompt 注入同一 ID == gate 读取的 ID，
      // 修复「prompt 多次渲染 / 多次 review 时 gate 取错 ID 读错 review.json」），marker 缺失才
      // generate + 落盘。对齐 execute {EXECUTE_RUN_ID} 段（prompt.js:449-467）。
      const tierRuntimeRoot = resolveRuntimeRoot(platformOpts, tierSpecBase)
      const reviewRunIdMarker = stageReviewMarkerPath(tierRuntimeRoot, stageName, changeName)
      let reviewRunId = ''
      try {
        if (existsSync(reviewRunIdMarker)) {
          reviewRunId = readFileSync(reviewRunIdMarker, 'utf8').trim()
        }
      } catch {}
      if (!reviewRunId) {
        reviewRunId = generateStageReviewRunId()
        try {
          mkdirSync(tierRuntimeRoot, { recursive: true })
          writeAtomicSync(reviewRunIdMarker, reviewRunId + '\n')
          // plan-c: echo 完整 review 目录路径，避免 agent 拿裸 runId 给子代理时漏连字符拼错路径
          const reviewDir = `${tierRuntimeRoot}/stage-reviews/${stageName}-${reviewRunId}`
          console.log(`  📁 Stage Review 写入目录（直接复制给 review 子代理，勿手拼 runId）：${reviewDir}/`)
        } catch {}
      }
      // review.json 产物契约(schema + 示例 + docHash 算法 + 重算提示)事前注入,与 validateStageReviewSchema 同源。
      // 通道优先序显式传入（readReviewChannelPriority 吃精确 cwd——平台模式 specRoot 异位时
      // process.cwd 兜底会读错 local.yaml，2026-09-10 通道配置批次）；tier=independent 时契约
      // 头部渲染「审查执行通道」段（按用户配置序，见 local.yaml review_dispatch.channel_priority）。
      const reviewChannelPriority = readReviewChannelPriority(cwd)
      const reviewContractMd = renderReviewJsonContract({ stage: stageName, changeDir: tierChangeDir, reviewRunId, tier: ceremonyInjection.tierValue, channelPriority: reviewChannelPriority })
      // C2 前阶段实证清单机械附带（坑 review-subagent-redundant-verify，2026-09-15 wp EHS 实证：
      // plan 审查把 brainstorm 已两轮实证的三仓源码全量重验——94 分钟不收敛被用户三催。此前只有
      // prompt 散文说「前序实证勿重验」，子代理并不知道前序具体审过了什么；现把前序 stage review
      // 的 checklist pass 项机械注入派发 prompt（封顶 15 条防灌爆），审查子代理据此跳过已实证面。
      let priorFactsMd = ''
      if (ceremonyInjection.tierValue === 'independent') {
        try {
          const priorStages = stageName === 'plan' ? ['brainstorm'] : stageName === 'execute' ? ['brainstorm', 'plan'] : []
          const factLines = []
          for (const ps of priorStages) {
            let priorRunId = null
            try { priorRunId = getLatestStageReviewRunId(tierRuntimeRoot, ps, changeName) } catch {}
            if (!priorRunId) continue
            const priorReviewPath = join(tierRuntimeRoot, 'stage-reviews', `${ps}-${priorRunId}`, 'review.json')
            if (!existsSync(priorReviewPath)) continue
            try {
              const priorReview = JSON.parse(readFileSync(priorReviewPath, 'utf8'))
              for (const c of (Array.isArray(priorReview.checklist) ? priorReview.checklist : [])) {
                if (c && c.result === 'pass' && c.item) factLines.push(`- [${ps}] ${String(c.item).replace(/\s+/g, ' ').slice(0, 100)}`)
              }
            } catch {}
          }
          if (factLines.length > 0) {
            const shown = factLines.slice(0, 15)
            priorFactsMd = `\n**前序阶段独立审查已实证（pass）结论——直接引用勿重验**（展示 ${shown.length}/${factLines.length} 条；EHS 复盘实证：重验已实证面 = 94 分钟不收敛的同款浪费；本阶段只审自己特有面，结论存疑时才定向补证）：\n${shown.join('\n')}\n`
          }
        } catch {}
      }
      // 同阶段上一轮复审基线（ql-20260916-021，Superpowers scoped re-review 采纳①）：上一轮
      // FAIL 的 findings 与已实证 pass 面机械回灌给复审子代理——复审以增量为主（核验修复 +
      // 本次改版新增面），防全量重读与重复报告已修问题（独立复审子代理无对话历史，不知上一轮
      // 审过什么/报过什么）。骨架轮/他变更轮由采集端过滤；tier=self 不注入（当前 agent 自带
      // 上一轮上下文）。
      try {
        const priorRound = await collectSameStagePriorReview(tierRuntimeRoot, stageName, changeName)
        if (priorRound) {
          const blockMd = renderPriorRoundFindingsMd(priorRound)
          priorFactsMd = priorFactsMd ? priorFactsMd + blockMd : blockMd
        }
      } catch {}
      // {REVIEW_MATERIALS} 机械组装（2026-09-19-review-material-cli-wiring，Gap 1 收口）：CLI 半边
      // 素材（designDigest/fileList/硬约束/diff 摘要/热区/checklist）经 assembleStageReviewMaterials
      // 组包注入（specBase 用上方 tierSpecBase——块内唯一解析源，平台模式不漂）；主代理点名半边
      // （五交叉点/plan 差量）留位，模板补位指引接手。占位符在场才组装（省无槽步骤的 git IO）；
      // best-effort：失败空串（与占位符缺失同态，模板散文兜底）。
      let reviewMaterialsMd = ''
      if (promptText.includes('{REVIEW_MATERIALS}')) {
        try {
          const { assembleStageReviewMaterials } = await import('../review-material-pack.js')
          const matStage = stageName === 'brainstorm' ? 'grill-first' : stageName === 'plan' ? 'plan-review' : 'execute-qa'
          reviewMaterialsMd = await assembleStageReviewMaterials({ stage: matStage, cwd, changeName, specBase: tierSpecBase })
        } catch { /* 组装 best-effort：失败零注入 */ }
      }
      promptText = promptText
        .split('{REVIEW_TIER}').join(ceremonyInjection.tierValue + ceremonyInjection.menuMd)
        .split('{REVIEW_TIER_REASON}').join(tier.reason)
        .split('{STAGE_REVIEW_RUN_ID}').join(reviewRunId)
        .split('{REVIEW_JSON_CONTRACT}').join(reviewContractMd)
        .split('{PRIOR_REVIEW_FACTS}').join(priorFactsMd)
        .split('{REVIEW_MATERIALS}').join(reviewMaterialsMd) // 三阶段材料包槽（CLI 组装注入，Gap 1 收口——此前恒空串靠主代理手组，机械保证断一半；主代理点名半边由模板补位指引接手）
    } catch (e) {
      // 降级 self，避免 prompt 残留占位符
      promptText = promptText
        .split('{REVIEW_TIER}').join('self')
        .split('{REVIEW_TIER_REASON}').join('分级异常降级 self: ' + e.message)
        .split('{STAGE_REVIEW_RUN_ID}').join('review-unknown')
        .split('{REVIEW_JSON_CONTRACT}').join('(review 契约注入失败,按 schemaVersion=1 + reviewType + verdicts∈pass/fail/cannot_verify + reviewedFiles + docHash=主文档 sha256 产出)')
        .split('{PRIOR_REVIEW_FACTS}').join('')
        .split('{REVIEW_MATERIALS}').join('') // 降级分支同步 join（plan 审查提示：防占位符字面量残留）
    }
  }

  // 三主阶段 Step1「进度确认」快照注入（2026-09-05 全流程审计）已随 step1 整体 noAI 化退役
  // （2026-09-07）：brainstorm/execute/verify 的 step1 不再渲染 prompt，快照改由
  // run/progress-confirm.js 的 progressConfirm 动作 console 直出（占位符 {PROGRESS_SNAPSHOT}
  // 无消费者，注入分支删除）。

  // execute Step「确认 worktree 路径」meta 注入（2026-09-05 全流程审计）：worktree meta 由 CLI
  // 读出直接注入，agent 省一趟 worktree meta 工具往返；工具链可用性检查（真实工作）仍归 agent。
  if (stageName === 'execute' && promptText.includes('{WORKTREE_META}')) {
    let metaInfo
    try {
      const { WorktreeManager } = await import('../worktree.js')
      const wm = new WorktreeManager({ cwd })
      const meta = changeName ? wm.getMeta(changeName) : null
      if (meta && meta.worktreePath) {
        const dirOk = existsSync(meta.worktreePath)
        metaInfo =
          `- worktreePath：${meta.worktreePath}\n` +
          `- branch：${meta.branch || '（meta 未记录）'}\n` +
          `- mode：${meta.mode || 'worktree'}\n` +
          `- worktree 目录存在：${dirOk ? '是' : '否——in-place 模式属正常；worktree/native-worktree 模式缺失则停止并报错'}`
      } else {
        metaInfo = '（worktree meta 不可读——meta.json 不存在说明创建失败，停止并报错；可运行 sillyspec worktree meta ' + (changeName || '<change-name>') + ' 自查）'
      }
    } catch (e) {
      metaInfo = '（注入失败：' + e.message + '——运行 sillyspec worktree meta 自查，meta.json 不存在则停止并报错）'
    }
    promptText = promptText.split('{WORKTREE_META}').join(metaInfo)
  }

  // archive Step1「任务完成度检查」客观真相源注入：以 review.json verdict 算完成度，
  // 替代「机械数 plan.md checkbox」（checkbox 依赖 autoCheckPlanFromReviews 回填，runId marker /
  // review 缺失时回填静默 no-op，会停在未勾态导致完成度失真 → archive 误判「全未完成」）。
  // summarizeTaskCompletion 内部已 fail-safe 降级（无 plan / 无 runId → checkbox 统计 + 标注 source），
  // 此处仅兜底注入异常，绝不阻断 archive。
  if (stageName === 'archive' && promptText.includes('{TASK_COMPLETION_REPORT}')) {
    try {
      const { summarizeTaskCompletion } = await import('../task-review.js')
      const tcrSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const tcrRuntimeRoot = resolveRuntimeRoot(platformOpts, tcrSpecBase)
      const tcrChangeDir = changeName ? join(tcrSpecBase, 'changes', changeName) : null
      const summary = tcrChangeDir
        ? summarizeTaskCompletion({ changeDir: tcrChangeDir, runtimeRoot: tcrRuntimeRoot, changeName })
        : null
      promptText = promptText.split('{TASK_COMPLETION_REPORT}').join(summary ? summary.report : '（无法计算完成度：变更目录缺失）')
    } catch (e) {
      promptText = promptText.split('{TASK_COMPLETION_REPORT}').join('（完成度计算异常：' + e.message + '，请手动核对 plan.md 与 .runtime/execute-runs/*/tasks/task-NN/review.json）')
    }
  }

  // verify Step2「加载规范并锚定」worktree 基线锚点注入：execute 在 worktree 分支上 commit，
  // verify 的 diff 对账基点 = worktree 分支的真实基点（git merge-base），不是主仓当前 HEAD。
  // agent 拿不到基点时会拿主仓 HEAD / 旧 release commit 兜底——主仓在 execute 期间推进时
  // （并行 session commit）会把别人的演进误判为本变更越权新增（2026-08-17 实录：误用 d192f89
  // 而实际 merge-base 49ade71，第 6/7 条铁律被误判新增）。注入 fail-soft：worktree/分支/meta
  // 读不到时降级为自查指引，绝不阻断 verify。
  if (stageName === 'verify' && promptText.includes('{WORKTREE_BASELINE_INFO}')) {
    let baselineInfo
    try {
      const { WorktreeManager } = await import('../worktree.js')
      const wm = new WorktreeManager({ cwd })
      const meta = changeName ? wm.getMeta(changeName) : null
      const branch = meta?.branch || (changeName ? 'sillyspec/' + changeName : null)
      const branchExists = branch
        ? safeGit(cwd, ['rev-parse', '--verify', '--quiet', branch + '^{commit}']).error === null
        : false
      if (branchExists) {
        const baseBranch = meta?.baseBranch || 'main'
        const mergeBase = safeGit(cwd, ['merge-base', baseBranch, branch]).value
        baselineInfo =
          `- 本变更 worktree 分支：${branch}（存在）\n` +
          (meta
            ? `- worktree 基点（创建时锚定）：baseHash=${meta.baseHash || '未知'}，actualBaseHash=${meta.actualBaseHash || '未知'}（含 dirty overlay 后的 worktree 起点）\n`
            : '- worktree meta 已不可读（可能已被 cleanup），用下方 merge-base 即可\n') +
          `- ⚠️ diff 对账基点：\`git merge-base ${baseBranch} ${branch}\` = ${mergeBase || '（计算失败，手动跑上面命令）'}\n` +
          `  不要用主仓当前 HEAD / 最近 release commit 当基点——主仓在 execute 期间可能已被并行 session 推进，用错基点会把别人的演进误判为本变更越权改动。\n` +
          `- task review 的 base/head 引用分支上的 commit，逐 task 核验 diff 用 \`git diff <base>..<head>\`（分支 ref 若已被 cleanup 删除，hash 仍可直达，但不要主动删分支）。`
      } else if (meta) {
        baselineInfo =
          '- 本变更 worktree meta 存在但分支不可达（可能已被 cleanup）：按主仓 git log 对照本变更各 commit 核验；task review 的 base/head 若悬空，在 verify-result.md 标注审计链风险。'
      } else {
        baselineInfo =
          '- 本变更无 worktree（in-place / 纯文档变更 / worktree 已清理且 meta 不可读）：按主仓 git log 最近提交对照核验。'
      }
    } catch (e) {
      baselineInfo = '（worktree 基线注入失败：' + e.message + '——diff 对账前先 git branch -a 查 sillyspec/<change> 分支并用 git merge-base <main> <branch> 自查基点，勿用主仓 HEAD 当基点）'
    }
    promptText = promptText.split('{WORKTREE_BASELINE_INFO}').join(baselineInfo)
  }

  // verify「运行测试和质量扫描」evidence-auto 推荐注入（task-12，FR-11 / D-005@v2）：
  // verify-postcheck 在 --done 事后解析 evidence-auto，agent 写 verify-result.md 时看不到
  // 推荐组合、无从否决——故在 prompt 时点经 {EVIDENCE_AUTO_RECOMMENDATION} 把 task-11
  // resolveTestStrategy 的 evidence_auto_recommendation.summary 渲染进 step prompt（含推荐
  // 理由、降级注记与「可在 verify-result.md 否决并改跑全量」路径），供用户否决（FR-11）。
  // 仅 test_strategy=evidence-auto 且 recommendation 非空时渲染推荐；full/module/skip/已配置
  // 替换为空串零输出；**未配置**且 commands.test 已配时渲染 test_strategy 预检提示（2026-09-15
  // 复盘：环境硬伤的全量实测打回返工，提前在 prompt 时点给配置指引）。fail-soft：读取/解析异常降级单行说明不抛，
  // 绝不阻断 verify prompt 输出（对齐上方 {WORKTREE_BASELINE_INFO} 注入先例）。
  if (stageName === 'verify' && promptText.includes('{EVIDENCE_AUTO_RECOMMENDATION}')) {
    let eaInjected = ''
    try {
      const { resolveTestStrategy, extractTestCommand, extractTestStrategy } = await import('../verify-postcheck.js')
      const eaSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      // 信任边界：local.yaml 只读 specBase（平台 specRoot / 漂移锚定主仓 / cwd 本地），与
      // runVerifyTestCheck 的 specBase 来源同口径，不读 agent 可写的 worktree 副本。
      const eaYamlPath = join(eaSpecBase, 'local.yaml')
      const eaYamlText = existsSync(eaYamlPath) ? readFileSync(eaYamlPath, 'utf8') : null
      const eaChangeDir = changeName ? join(eaSpecBase, 'changes', changeName) : null
      const resolution = resolveTestStrategy({ yamlText: eaYamlText, changeDir: eaChangeDir })
      const rec = resolution.evidence_auto_recommendation
      if (rec && rec.summary) {
        eaInjected = rec.summary
      } else if (eaYamlText && extractTestCommand(eaYamlText) && !extractTestStrategy(eaYamlText)) {
        // test_strategy 预检提示（2026-09-15 复盘教训「test_strategy 该在进 verify 前配好，
        // 而不是被 verify-test gate 打回后才补」）：已配 commands.test 但顶层 test_strategy
        // 未设（缺省=全量实测对账），prompt 时点先给配置指引——环境注定跑不了全量时省一轮
        // 「--done 实测打回 → 补配置 → 重跑」返工
        eaInjected = '【test_strategy 预检提示】local.yaml 已配置 commands.test 但未设顶层 test_strategy（缺省=全量实测对账）。若该命令在当前环境无法真实执行（框架/环境硬伤，如测试框架硬编码 skip、依赖外部服务），先在 local.yaml 显式配 `test_strategy: skip`（或 `module` + modules 映射收窄）并注释理由再继续——避免 verify --done 实测对账打回后返工。'
      }
      // 等效验证先例注入（verify-precedent-only-in-prose，2026-09-15 EHS 实证）：先例与
      // 预检提示同挂点追加——标准命令不可用但已有验证过的等效口径时，指引优先配进
      // commands.test 实测对账而非 skip 放行。
      const _precHint = renderVerifyPrecedentHint(parseVerifyPrecedents(eaYamlText))
      if (_precHint) eaInjected = eaInjected ? `${eaInjected}\n\n${_precHint}` : _precHint
    } catch (e) {
      eaInjected = `（evidence-auto 推荐注入失败：${e.message}——请读 .sillyspec/local.yaml 确认 test_strategy；--done 时 CLI 仍会按 resolveTestStrategy 实测对账，推荐不可用时可显式设 test_strategy: full/module）`
    }
    promptText = promptText.split('{EVIDENCE_AUTO_RECOMMENDATION}').join(eaInjected)
  }

  // {ARCHIVE_IMPACT_AUDIT}（2026-09-09 ql-20260909-004）：archive extract-module-impact 步的
  // 三重核对机械预填——auditModuleImpactAgainstDiff 代算（module-impact × diff × map 归属），
  // agent 只裁决不一致项。fail-soft：审计异常降级单行指引（回退手跑 git diff）。
  if (stageName === 'archive' && promptText.includes('{ARCHIVE_IMPACT_AUDIT}')) {
    let auditBlock = ''
    try {
      const { auditModuleImpactAgainstDiff } = await import('../archive-delta.js')
      const auditSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const r = auditModuleImpactAgainstDiff({ cwd, changeName, specDir: auditSpecBase })
      auditBlock = [
        '【三重核对报告（CLI 机械预填）】',
        r.summary,
        ...(r.mismatches.length > 0 ? ['不一致项：', ...r.mismatches.map(m => '  - ' + m), '→ 逐项裁决并修正 module-impact.md；其余（未列出的 diff 文件为 .sillyspec 产物不参与核对）无需处理。'] : ['一致 ✓——第 3 步修正可跳过。']),
      ].join(String.fromCharCode(10))
    } catch (e) {
      auditBlock = '（三重核对机械预填失败：' + (e && e.message ? e.message : e) + '——回退手跑 git diff --name-only 比对）'
    }
    promptText = promptText.split('{ARCHIVE_IMPACT_AUDIT}').join(auditBlock)
  }

  // {SCOPE_AUDIT_TABLE}（2026-09-10-change-scope-audit task-05，FR-03）：archive「确认归档」步的
  // 变更范围对账全表注入——computeChangeScopeAudit + renderScopeAuditTable 代算（计划×实际
  // 三态 + 行数，D-003 同源：只 import scope-audit.js 导出，不自研采集）。maxRows 60 截断防
  // prompt 膨胀（R-03，表尾自带「完整表跑 scope-audit」指引）。fail-soft：注入异常降级单行
  // 指引（回退手跑 scope-audit 命令），不阻断归档 prompt 输出（对齐 {ARCHIVE_IMPACT_AUDIT}
  // 注入先例）；ok=false（quick 会话不存在 / 实际侧整体失败等）同样附手跑指引——归档零新增
  // 阻断面（D-006）。
  if (stageName === 'archive' && promptText.includes('{SCOPE_AUDIT_TABLE}')) {
    let scopeTable = ''
    try {
      const { computeChangeScopeAudit, renderScopeAuditTable } = await import('../scope-audit.js')
      const saSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const saResult = await computeChangeScopeAudit({ cwd, specBase: saSpecBase, changeName, platformOpts })
      scopeTable = renderScopeAuditTable(saResult, { maxRows: 60 })
      if (saResult && saResult.ok === false) {
        scopeTable += '\n（对账降级——回退手跑 sillyspec scope-audit --change <name> 查看原因后再确认归档，注入失败不阻断归档）'
      }
    } catch (e) {
      scopeTable = '（变更范围对账表注入失败：' + (e && e.message ? e.message : e) + '——回退手跑 sillyspec scope-audit --change <name> 查看后再确认归档，注入失败不阻断归档）'
    }
    promptText = promptText.split('{SCOPE_AUDIT_TABLE}').join(scopeTable)
  }

  // {HANDOVER_SUMMARY}（2026-09-17-pass-cap-semantics task-04，FR-06 注入态）：archive「确认
  // 归档」步的移交项清单注入——读 changes/<name>/verify-facts.json 的 facts.handover（task-01
  // 产出 { count, items[] }，items 行含 type/item/condition/severity），blocking 置顶 + severity
  // 标注 + 封顶渲染（maxRows 8，对齐 {SCOPE_AUDIT_TABLE} 60/量级收窄——移交项是裁决面不是
  // 对账面），表尾指路 verify-facts.json 看全量。fail-soft：handover 段缺失/零条目/facts.json
  // 缺失 → 空串（正常态零输出）；读取异常降级单行指引——注入永不阻断归档 prompt 输出
  //（与门阻断语义分离，对齐 {SCOPE_AUDIT_TABLE} 注入先例）。
  if (stageName === 'archive' && promptText.includes('{HANDOVER_SUMMARY}')) {
    let handoverBlock = ''
    try {
      const hsSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const hsFactsPath = changeName ? join(hsSpecBase, 'changes', changeName, 'verify-facts.json') : null
      if (hsFactsPath && existsSync(hsFactsPath)) {
        const hsFacts = JSON.parse(readFileSync(hsFactsPath, 'utf8'))
        const hsItems = (hsFacts && hsFacts.handover && Array.isArray(hsFacts.handover.items)) ? hsFacts.handover.items : []
        if (hsItems.length > 0) {
          const HS_MAX_ROWS = 8
          const sevOf = (it) => (it && it.severity === 'blocking') ? 'blocking' : 'advisory'
          const sorted = [...hsItems].sort((a, b) => (sevOf(a) === 'blocking' ? 0 : 1) - (sevOf(b) === 'blocking' ? 0 : 1))
          const rows = sorted.slice(0, HS_MAX_ROWS).map((it) => {
            const cond = it && it.condition ? ` | 条件: ${it.condition}` : ''
            return `- [${sevOf(it)}] ${(it && it.type) || 'unknown'} | ${(it && it.item) || ''}${cond}`
          })
          handoverBlock = [
            `【移交项清单（CLI 机械注入，共 ${hsItems.length} 条，blocking 置顶）】`,
            ...rows,
            ...(sorted.length > HS_MAX_ROWS ? [`……（其余 ${sorted.length - HS_MAX_ROWS} 条略——全量见 verify-facts.json）`] : []),
          ].join(String.fromCharCode(10))
        }
      }
    } catch (e) {
      handoverBlock = '（移交项清单注入失败：' + (e && e.message ? e.message : e) + '——回退读 changes/<变更名>/verify-facts.json 的 handover 段核对后再确认归档，注入失败不阻断归档）'
    }
    promptText = promptText.split('{HANDOVER_SUMMARY}').join(handoverBlock)
  }

  // 注入模块上下文（brainstorm/plan/execute 阶段 + quick 首步「理解任务」——刀①：quick
  // step1 原让 agent cat module-map 再挑模块卡读，改为按任务描述匹配后注入，基于 Module Context Index）
  // ── 阶段感知注入分叉（2026-09-18-preflight-slimming task-02，D-002@v1 Phase 2）──
  // 三主阶段由「每步全注」改「每阶段首步全量、后续摘要行」：shouldInjectFullContext（task-01）
  // 读 .runtime/prompt-inject-<change>.json 账本判定——full=真注全量（现状）并在注入后
  // recordPromptInjectLedger 落账（withFileLock 幂等，R-06）；full=假改注一行摘要（首步步骤号 +
  // digest 前 8 位 + 可 Read 路径，R-03）。quick 不分叉：仅首步注入，本无重注面（现状逐字保留）。
  // fail-open 红线（design 兼容策略）：分叉判定/账本读写任何异常 → 回退全量注入（现状），
  // 绝不阻塞渲染。
  const quickFirstStep = stageName === 'quick' && step && step.name === '理解任务'
  const mainStageModuleInject = ['brainstorm', 'plan', 'execute'].includes(stageName)
  if ((mainStageModuleInject || quickFirstStep) && projectName) {
    const effectiveSpecBase = resolvePromptSpecBase(platformOpts, cwd)
    const moduleIndex = loadModuleContextIndex(effectiveSpecBase, projectName)
    if (moduleIndex && Object.keys(moduleIndex).length > 0) {
      // runtimeRoot 与 {EXECUTE_RUN_ID}/{REVIEW_TIER} 段同源解析（resolveRuntimeRoot(platformOpts, specBase)）
      let injectFork = { full: true } // 缺省=现状全量（quick / 无 changeName / 分叉判定异常）
      if (mainStageModuleInject && changeName) {
        try {
          injectFork = shouldInjectFullContext({
            changeName, stageName,
            runtimeRoot: resolveRuntimeRoot(platformOpts, effectiveSpecBase),
          })
        } catch { injectFork = { full: true } } // fail-open：判定异常回退全量（现状）
      }
      if (!injectFork.full) {
        // 同阶段后续步骤：不重注全量，改摘要行（digest 前 8 位 + 可 Read 路径）
        promptText = renderPromptInjectSummaryLine({
          firstStep: injectFork.firstStep, digest: injectFork.digest,
          specBase: effectiveSpecBase, projectName,
        }) + '\n' + promptText
      } else {
        // 尝试从 step prompt / changeName 匹配模块；quick 用 guard.taskDescription（启动 --input）——
        // changeName 是 quick-<hash> 无语义、step.prompt 全文噪音大（刀①）
        let taskDesc = step.prompt || changeName || ''
        if (stageName === 'quick') {
          taskDesc = readQuickGuardField(changeName, effectiveSpecBase, 'taskDescription') || taskDesc
        }
        const injRes = buildModuleContextInjection(taskDesc, moduleIndex, effectiveSpecBase, projectName, { change: changeName || '' }) || { text: '', frModules: [] }
        const injection = injRes.text
        if (injection) {
          promptText = injection + '\n' + promptText
          // fr-inject 遥测（module-inject 源，ql-20260919-002）：仅 count>0 模块发事件（防 jsonl
          // 堆 count-0 噪音）；type 不变+source 归因（新 type 会静默漏过 knowledge-stats 的 if 链
          // 缩水 D-006 总数——source 字段保口径）。与 step8 digest 侧可能对同一变更各发一次，
          // frInjectChanges 按 change 去重不受双发影响。fail-soft。
          if (injRes.frModules && injRes.frModules.length > 0 && changeName) {
            try {
              for (const fm of injRes.frModules) {
                appendKnowledgeHit(join(effectiveSpecBase, '.runtime'), {
                  type: 'fr-inject', change: changeName, domains: [fm.id], count: fm.count, source: 'module-inject',
                })
              }
            } catch { /* 遥测 fail-soft */ }
          }
          // 首步全量注入后落账：本阶段首个非空注入即「首步」锚点（记 firstStep/digest/at——后续
          // 步骤摘要行的判定输入）。只在真注入非空内容时落账——空注入不占首步位（防摘要行
          // 「已于步骤 N 注入」指向一个实际没注入任何模块内容的步骤，丢真上下文）。fail-open：
          // 落账异常静默（语义=后续步仍全量注入），绝不阻塞渲染。
          if (mainStageModuleInject && changeName) {
            try {
              await recordPromptInjectLedger({
                runtimeRoot: resolveRuntimeRoot(platformOpts, effectiveSpecBase),
                changeName, stageName,
                firstStep: stepIndex + 1,
                digest: createHash('sha256').update(injection, 'utf8').digest('hex').slice(0, 8),
              })
            } catch { /* fail-open：账本写失败 → 后续步仍全量注入（现状），不阻塞渲染 */ }
          }
        }
      }
    }
  }

  // ── 机械知识注入（quick step1，2026-09-14-knowledge-loop-close task-04，FR-04）──
  // 判定口径与上方模块上下文注入同锚（quickFirstStep）：查询串用 guard.taskDescription 现成
  // 读取（X-008——changeName 是 quick-<hash> 无语义）；命中追加「📚 命中知识」段到 prompt 末尾
  // （top-3 同规则），并 appendKnowledgeHit 落 hits.jsonl；未命中零字节（prompt 与现状字节一致，
  // 零命中静默）。全链 fail-soft：注入失败不阻断 quick 启动。
  if (quickFirstStep) {
    try {
      const kiSpecBase = resolvePromptSpecBase(platformOpts, cwd)
      const kiQuery = String(readQuickGuardField(changeName, kiSpecBase, 'taskDescription') || '')
      if (kiQuery.trim() !== '') {
        const ki = buildKnowledgeInjection({
          knowledgeDir: join(kiSpecBase, 'knowledge'),
          runtimeDir: join(kiSpecBase, '.runtime'),
          change: changeName || '',
          query: kiQuery,
        })
        if (ki.section) {
          promptText = promptText + '\n\n' + ki.section
        }
      }
    } catch { /* fail-soft：知识注入异常不阻断 quick step1 prompt 输出 */ }
  }

  // ── 语义护栏进场注入（task-05，FR-03，D-001@v1 模块四）──
  // 判定口径独立：与上方模块上下文注入同锚（quickFirstStep——quick step1「理解任务」），不嵌进
  // {QUICK_CONTEXT_DIGEST} 占位符守卫内——模板改版去占位符时护栏静默失效（plan 审查 N2）。
  // 非空追加到 step1 prompt 末尾；空串（开关关 / 零命中）prompt 与现状字节一致（零命中静默）。
  // 渲染层注入，src/stages/quick.js 模板零变更（design 明确不改清单）。全链 fail-soft 见 helper。
  if (quickFirstStep) {
    const sgSpecBase = resolvePromptSpecBase(platformOpts, cwd)
    const semanticGuardBlock = buildQuickSemanticGuardInjection({ specBase: sgSpecBase, cwd, changeName })
    if (semanticGuardBlock) {
      promptText = promptText + '\n\n' + semanticGuardBlock
    }
  }

  // 平台模式 prompt 自检：确保没有裸相对输出路径
  // 只匹配正向写入指令中的裸路径，避免误杀「禁止写入 .sillyspec/」等安全说明
  if ((platformOpts?.specRoot || platformOpts?.runtimeRoot) && stageName === 'scan') {
    const writeCtx = /(?<!不要|禁止|严禁)(?:save[\s.]+to|write|create|mkdir|git add|写入|保存到|写入到)[^a-zA-Z]*\.sillyspec\/[a-z]/i
    if (writeCtx.test(promptText)) {
      console.error(`❌ [sillyspec] BUG: 平台模式 scan prompt 包含写入指令指向裸相对路径 .sillyspec/`)
      console.error(`   这会导致 agent 写入源码目录而非 spec-root，属于源码污染 bug。`)
      console.error(`   请将路径改为对应的 {DOCS_ROOT}/{PROJECTS_ROOT}/{WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT}/{SPEC_ROOT} 占位符。`)
      process.exit(2) // 内部异常（SillySpec 自身 prompt 配置 bug）→ exit 2，与 machine-interface 三段契约一致
    }
  }

  // ── 跨会话恢复回放（坑 stage-wait-history-not-replayed）──
  // 整阶段历史等待回答：数据由调用方从进度库 collectStageWaitHistory 聚合传入。与下方
  // 「📩 上一步用户回答」分工：本块是恢复语境（跨步骤、含多轮），那块是刚收到的最新回答
  // （更贴近 prompt 末尾）。同一轮内容可能短暂重复出现，属预期——两块框架语义不同。
  if (waitHistory && waitHistory.length > 0) {
    console.log(`\n### 📜 本阶段历史用户回答（进度库回放，跨会话恢复用）`)
    console.log(`以下问答已由用户确认并记录在进度库，续跑时据此恢复上下文——已回答过的问题不要重复追问：`)
    for (const entry of waitHistory) {
      console.log(`\n**「${entry.stepName}」**（${entry.rounds.length} 轮）`)
      for (const r of entry.rounds) {
        if (r.question) console.log(`   问：${r.question}`)
        console.log(`   第${r.round}轮答：${r.answer}`)
      }
    }
  }

  if (prevStepAnswer) {
    console.log(`\n### 📩 上一步用户回答`)
    console.log(prevStepAnswer)
  }

  // 完成契约(事前预知):该 stage 的机械校验通过条件,从 stage-contract-spec.js manifest 渲染,
  // 与 CLI 完成校验严格同源(事前给的 == 事后查的)。仅首个 agent 可见步注入(与 persona/guardrails
  // 同模式,一次建立即可;后续步靠 context 保留)。
  if (stepIndex === firstRenderableIdx) {
    const stageContract = renderStageContract(stageName)
    if (stageContract) {
      promptText = `${promptText}\n\n${stageContract}`
    }
  }

  // ── {PREFLIGHT_FAILURES} 前置失败清单接线（2026-09-18-preflight-slimming task-02，D-001@v1 Phase 1）──
  // renderPreflightFailures（task-01 纯函数）从 stageRegistry 步骤定义读 preflightValidators
  // 声明（三 stages 声明统一归 task-04）只读快跑本步骤 --done 将消费的 validator 子集：
  // 未声明/无失败/超时/异常 → ''。注入位（计划锚点）：步骤说明之后、门禁提示（铁律/完成后
  // 执行/gate 预检）之前——非空且模板无字面占位符时追加到 promptText 末尾；模板含字面
  // {PREFLIGHT_FAILURES} 时按既有占位符替换机制原位替换（空串替换零残留——「空串时占位符
  // 零出现」）。空串零注入：声明落地（task-04）前恒 ''——旧 prompt 逐字节不变（design 兼容
  // 策略第一条，knowledge-inject A/B 双渲染字节一致金丝雀守护）。接线层再包一层 try：
  // 任何异常静默不注不阻（fail-open 注入面，plan 全局硬约束 2）。
  let preflightFailuresMd = ''
  try {
    const pfSpecBase = resolvePromptSpecBase(platformOpts, cwd)
    preflightFailuresMd = await renderPreflightFailures({
      stageName, stepName: step.name, cwd, specBase: pfSpecBase, changeName,
    })
  } catch { preflightFailuresMd = '' }
  if (promptText.includes('{PREFLIGHT_FAILURES}')) {
    promptText = substituteSplitJoin('{PREFLIGHT_FAILURES}', preflightFailuresMd)
  } else if (preflightFailuresMd) {
    promptText = `${promptText}\n\n${preflightFailuresMd}`
  }

  // ── M1 打印分流：同指纹复入短输出 + 动态附录；首见全量 + guide 落盘 ──
  const jsonHijacked = String(console.log).includes('stderr.write') // --json 劫持形态探测（withJsonOutput 同款函数体）
  // v1 默认关闭（D-001@v1 修订：跨进程短输出与 CLI stdout 确定性测试族冲突——别名路由奇偶校验等
  // 要求同参两次调用字节一致）。SILLYSPEC_STEP_GUIDE=1 显式开启（R5 对撞重跑开启验证，达标后
  // 迁移测试面再翻默认）；'0' 维持显式关闭语义（历史逃生门）。
  const guideEnabled = process.env.SILLYSPEC_STEP_GUIDE === '1'
  const fingerprint = computeStepGuideFingerprint(guideTemplate)
  const runtimeRoot = platformOpts?.specRoot || join(cwd, '.sillyspec')
  const guideRoot = join(runtimeRoot, '.runtime', 'step-guides')
  const guideFile = join(guideRoot, `${stageName}-step${stepIndex}-${fingerprint.slice(0, 8)}.md`)
  // 复入状态=变更级（change+stage+step → 指纹）：「复入」锚定同一变更同一步的重渲染（跨 CLI 进程
  // 持续生效——实验里每次 run 都是独立进程，进程内缓存无意义）；他变更渲染同模板不误短路
  // （knowledge-inject 两路径字节一致测试的机制依赖此界——模板级寻址会短路其第二次全量渲染）。
  const stateRoot = join(runtimeRoot, '.runtime', 'step-guide-state')
  const stateFile = join(stateRoot, `${stageName}-step${stepIndex}-${String(changeName || '_nochange').replace(/[^A-Za-z0-9._-]/g, '_')}.json`)
  let prevState = null
  try { prevState = JSON.parse(readFileSync(stateFile, 'utf8')) } catch { /* 无状态=首见 */ }
  const reentryHit = guideEnabled && !jsonHijacked && prevState != null && prevState.fingerprint === fingerprint && existsSync(prevState.guidePath)
  if (reentryHit) {
    // 复入：静态部分 ≤10 行；动态段照常渲染为附录
    console.log(`📄 步骤指引未变（fingerprint=${fingerprint.slice(0, 8)}）——静态全文不再重印。需要全文时 Read：`)
    console.log(`   ${guideFile}`)
    console.log(`   （首见渲染已在上下文中；上下文被压缩丢失时才需要 Read）`)
    console.log(`⛔ 本步骤安全铁律仍在生效（破坏性操作禁令见首见渲染/guide 全文）`)
    if (dynSegments.filter(x => x.trim() !== '').length > 0) {
      console.log(`## 动态注入段（本次运行——永不缓存，每次照常渲染）`)
      for (const seg of dynSegments) if (seg.trim() !== '') console.log(seg)
    }
  } else {
    console.log(promptText)
    try {
      // 特性开启且有 spec 根才落盘：默认关时不写（stdout 确定性）；无 spec 根不凭空造目录
      //（spec-dir 向上命中类测试会被新建的 test/.sillyspec 污染——本批实证）。
      if (guideEnabled && (platformOpts?.specRoot || existsSync(join(cwd, '.sillyspec')))) {
      mkdirSync(guideRoot, { recursive: true })
      writeFileSync(guideFile, `<!--fp=${fingerprint}-->
# ${stageName} step ${stepIndex + 1} 指引静态全文（${step.name}）

> 动态占位符（时间/材料包/知识命中/欠账等）以当次渲染为准，本文件只存静态模板面。

${maskVolatileForGuide(guideTemplate)}
`, 'utf8')
      mkdirSync(stateRoot, { recursive: true })
      writeFileSync(stateFile, JSON.stringify({ fingerprint, guidePath: guideFile, changeName: changeName || null, stage: stageName, stepIndex, at: new Date().toISOString() }, null, 1) + '\n', 'utf8')
      }
    } catch { /* guide/state 落盘 best-effort：失败仅退化回全量重印，不阻断步骤输出 */ }
  }
  // 铁律拆分（W3 token 效率）：通用流程纪律（文档优先/不跳步/不编造命令）只在首个 agent 可见步注入——
  // 每步重复 ~800B 纯耗 context。但【平台写入规则 + 路径规则】是安全关键（防写错目录/绕过 Write），
  // 且依赖 changeName/platformOpts，必须【每步注入】（context 压缩丢失会让 agent 越界写源码）。
  if (stepIndex === firstRenderableIdx) {
    console.log(`\n### ⚠️ 铁律`)
    console.log('- 文档优先：代码产出必须先有对应的设计/规范文档支撑。')
    console.log('- 聚焦本步骤：只执行本步骤描述的操作并完整做完；自行扩展或跳步会破坏状态机推进，后续步骤再做后续事。')
    console.log('- 已完成步骤视为只读：需修订用 `sillyspec run <stage> --reopen --from-step N` 回退重做，直接回头改会让进度记录与产物脱节。')
    console.log('- CLI 子命令以本 prompt 或上一条 --done 输出的字面为准；不确定时停下问用户，猜测命令会让状态机推进到错误位置。')
    console.log('- 本步骤产物落盘后立即执行 prompt 末尾的 --done：CLI 据此校验产出并推进状态机；不跑则进度永远停在本步。')
    console.log('- 变更目录改名用 `sillyspec change-rename <旧名> <新名>`：mv/rename 会漏改进度库引用，导致变更失联。')
    console.log('- 变更产物文档一律用 CLI 骨架命令生成（fourpiece-init / design-init / taskcard / module-impact / verify-probes --init）——骨架已预填 author/created_at/generated_by 元数据，勿删勿手拼 frontmatter；仅从零手写的补充文档才需手填 author（git 用户名）与 created_at（精确到秒）')
    console.log('- 执行构建/测试前必须先读 local.yaml，优先使用其中配置的命令、路径和环境变量；未配置时才使用默认值')
  }
  // 平台模式 + 路径规则（安全关键，每步注入；step1+ 起带精简标题，不复述通用铁律）
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot || changeName) {
    if (stepIndex !== 0) console.log(`\n### ⚠️ 路径与平台规则（每步提醒，通用铁律见首步）`)
    if (platformOpts?.specRoot || platformOpts?.runtimeRoot) {
      const specSillyspec = resolvePromptSpecBase(platformOpts, cwd)
      console.log(`- **平台模式：所有文件只能写入 \`${specSillyspec}/\` 下的对应子目录，严禁写入源码目录。**`)
      console.log('- **平台模式：Write 工具失败时，不允许用 cat > / tee / heredoc 等方式绕过。先 Read 再 Write，仍失败则记录并停止。**')
      console.log('- **平台模式：local.yaml 中的 commands 必须在 package.json scripts 中真实存在，不存在的标记 unavailable。**')
    }
    if (changeName) {
      // changeDir 根与上方头部同源（坑 change-dir-base-mismatch）：平台/漂移锚定绝对根，
      // 普通本地保持相对 '.sillyspec' 展示；runtimeRoot-only 组合不再 join(null) 崩溃
      const changeDirBase = platformOpts?.specRoot || platformOpts?.specDriftAnchor || '.sillyspec'
      const changeDir = join(changeDirBase, 'changes', changeName)
      // quick 会话（quick-<hex8>）按设计无实体变更目录（progress.js initChange 同款跳过），
      // 纯代码 quick 根本不产 spec 文档——「所有变更文件必须写入 changes/<change>/」的硬规则
      // 对它是误导（ql-20260821-011 实证：CLI 反复提示一个用不到的目录）。改述条件化：
      // 仅「若本 quick 决定补文档」才落该目录，代码改动照常写源码目录。
      if (QUICK_SID_RE.test(changeName)) {
        console.log(`- **文件路径规则（quick 会话）：纯代码改动直接写源码目录，无目录限制。仅当本 quick 需要落 spec 文档（design/plan 等，复杂任务建议升级完整流程）时才写 \`${changeDir}/\`；QUICKLOG/tasks.md 记录由 CLI 接管，不要手建。**`)
      } else {
        console.log(`- **文件路径规则：所有变更文件必须写入 \`${changeDir}/\` 目录下。不要自己拼接路径，直接使用 changeDir 值。示例：\`${changeDir}/proposal.md\`**`)
      }
    }
  }
  const changeFlag = changeName ? ` --change ${changeName}` : ''
  // 检测当前 step prompt 是否包含 WAIT 指令（即可能需要等待用户）
  const stepPrompt = promptText || ''
  const requiresWait = step.requiresWait === true
  const conditionalWait = step.conditionalWait === true
  const mayNeedWait = WAIT_MARKER_RE.test(stepPrompt) || requiresWait || conditionalWait

  console.log(`\n### 完成后执行`)
  // P0-3（noai-ir-roadmap §3）：gate 预检前置——gate 失败 → rollback → 重做一轮是最贵的循环，
  // 多数失败是机械的（占位符未替换/文件未建/行号失效）。gate 是只读聚合预检，--done 前跑一次
  // 把「重做一轮」变「本地预检」。主阶段且有 change 才提示（quick 边界审计在 --done 内联、
  // 辅助阶段无 gate 语义）。
  if (['brainstorm', 'plan', 'execute', 'verify', 'archive'].includes(stageName) && changeName) {
    console.log(`💡 预检（只读，省一轮 gate 失败重跑）：sillyspec gate ${stageName} --change ${changeName} [--json]`)
  }
  // requiresConfirm 步骤（如 archive「确认归档」）的完成命令必须带 --confirm——坑
  // archive-batch-31-tool-notes ②：通用 --done 模板不带该 flag，agent 照抄执行撞
  // 「请添加 --confirm」确认门，误以为参数没带。
  const confirmFlag = step.requiresConfirm === true ? ' --confirm' : ''
  // auto driver（2026-09-08-auto-driver D-002/P1-Ⅲ）：auto 模式下命令一律 run auto 形态——
  // 与 SS-META 的 doneCommand 同源（同一 cmdStage 变量），消灭「正文 run <stage> / 元数据 run auto」双命令
  const cmdStage = autoMeta ? 'auto' : stageName
  // 意图断言（坑 execute-concurrent-done-skips-next-wave 终解）：execute 的 Wave 步骤是动态
  // 步骤表，并发 --done 会落到错误 Wave 且用旧摘要静默完成——完成命令带 --step "<本步名>"
  //（CLI 校验一致才放行），照抄命令即得并发防护。仅 execute 注入（quick/静态阶段测试断言
  // 提示格式，且静态步骤名稳定无漂移风险）。
  const stepAssertFlag = (stageName === 'execute' && step?.name) ? ` --step "${step.name}"` : ''
  const doneCommand = `sillyspec run ${cmdStage} --done${confirmFlag}${stepAssertFlag}${changeFlag} --output "你的摘要"`
  if (requiresWait) {
    console.log(`本步骤必须等待用户输入，不能直接 --done：`)
    console.log(`sillyspec run ${cmdStage} --wait --reason "${step.waitReason || '等待用户输入'}" --options "${(step.waitOptions || ['确认']).join(',')}"${changeFlag} --output "你的问题/方案摘要"`)
    console.log(``)
    console.log(`用户回答后执行：`)
    console.log(`sillyspec run ${cmdStage} --continue --answer "用户回答"${changeFlag}`)
    console.log(``)
    console.log(`收到回答并完成本步骤总结后，再执行：`)
  } else if (mayNeedWait) {
    console.log(`如果需要用户决策（选择方案/确认设计等）：`)
    console.log(`sillyspec run ${cmdStage} --wait --reason "${step.waitReason || '等待原因'}" --options "${(step.waitOptions || ['选项1', '选项2']).join(',')}"${changeFlag} --output "你的摘要"`)
    console.log(``)
    console.log(`如果不需要用户决策，正常完成：`)
  }
  console.log(doneCommand + (autoMeta ? '' : ' --input "用户原始需求/反馈"'))
  // P0-2（noai-ir-roadmap §3）：--output 可省略提示（auto 模式除外——auto driver 的
  // SS-META doneCommand 仍带 --output，照抄路径零变化；省略路径由 command.js 同源合成）。
  if (!autoMeta) {
    console.log(`（--output 可省略：省略时 CLI 按门禁与 diff 事实合成事实性摘要；方案取舍/用户反馈等语义说明才需要手写）`)
  }

  // ── SS-META 机器可读元数据块（change: 2026-09-08-auto-driver，D-002@v1，FR-01）──
  // 单行 HTML 注释内 JSON，agent 低噪可读、脚本一行正则可提取（<!--SS-META:(.*)-->）。
  // requiresUser 四源见上方纯函数；doneCommand 与正文同源。
  // P1-3（noai-ir-roadmap §4）：SS-META 从 auto 专属毕业——常规模式 `run <stage> --meta`
  // 同样渲染（command.js 置 SILLYSPEC_RUN_META=1，CLI 短进程生命周期内有效，不跨调用泄漏）；
  // meta 增补 change 字段（宿主脚本免再从正文 header 行解析变更名，向后兼容追加）。
  if (autoMeta || process.env.SILLYSPEC_RUN_META === '1') {
    const meta = {
      stage: stageName,
      stepIndex: stepIndex + 1,
      stepName: step.name,
      change: changeName || null,
      requiresUser: requiresWait || mayNeedWait || step.requiresConfirm === true,
      doneCommand,
      waitHint: (requiresWait || mayNeedWait)
        ? 'requiresUser=true：先与用户交互（wait/continue 或 --wait-interactive 直通），再 done'
        : '直接执行任务后逐字跑 doneCommand',
    }
    console.log('<!--SS-META:' + JSON.stringify(meta) + '-->')
  }
}
/**
 * 替换 prompt 文本中的路径根占位符 {SPEC_ROOT}/{DOCS_ROOT}/{PROJECTS_ROOT}/
 * {WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT}。平台模式与常规模式共用：仅传入的 roots 值不同。
 * 占位符值都是绝对路径、互不包含其它占位符，故替换顺序不影响结果。
 *
 * 注：本函数由并行会话引入（outputStep 两处逐字重复逻辑的抽取），重构期间 run.js 一次
 * git checkout 误覆盖其未提交版本，此处按 test/prompt-placeholders.test.mjs 的契约重建，
 * 行为等价。
 */
export function applyRootPlaceholders(text, roots) {
  return text
    .replaceAll('{SPEC_ROOT}', roots.specRoot)
    .replaceAll('{DOCS_ROOT}', roots.docsRoot)
    .replaceAll('{PROJECTS_ROOT}', roots.projectsRoot)
    .replaceAll('{WORKFLOWS_ROOT}', roots.workflowsRoot)
    .replaceAll('{KNOWLEDGE_ROOT}', roots.knowledgeRoot)}

