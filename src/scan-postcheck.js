/**
 * scan-postcheck.js — CLI 层 scan 完成后强制校验
 *
 * 不依赖 AI agent 的自检报告，由 CLI 代码直接检查文件系统。
 * 平台模式下必须通过所有 check 才能 success，否则降级。
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync, rmdirSync } from 'fs'
import { join, basename } from 'path'
import { SCAN_STATUS, CHECK_SEVERITY, SCAN_REQUIRED_DOCS, SCAN_REQUIRED_DOCS_QUICK } from './constants.js'
import { validateScriptCommands } from './stages/cmd-existence.js'
import { git } from './git-helper.js'
import { nowWallClock } from './datetime.js'
import { collectInvalidDocRefs } from './docs-check.js'

const REQUIRED_SCAN_DOCS = SCAN_REQUIRED_DOCS

/**
 * scan 文档引用事实核验（archify 借鉴 P0，2026-09-04）：
 * 对 scan 产物里显式写的 file:line 引用跑 docs-check 的联合核验（层1 存在性+行号边界 +
 * 层2 引用行符号窗口断言，语义单一源 collectInvalidDocRefs）。
 * repo:// 跨仓引用需要本机映射，跳过本地校验（防跨设备误报，与 docs-check 立场一致）。
 * 只核验「显式写了引用的」事实；没写引用的散文不在范围（P2 的 scan IR 才覆盖）。
 * WARNING 级：scan 刚写完窗口极小，失效多为笔误；docs-gate ratchet 负责长期增量收敛。
 * @param {string} cwd 源码项目根（引用解析锚点）
 * @param {string} scanDir scan 文档目录
 * @param {string[]} docs 存在的文档文件名列表
 * @returns {object|null} check 条目；无引用或全部有效时返回 null
 */
function checkScanDocRefs(cwd, scanDir, docs) {
  let verified
  try {
    verified = collectInvalidDocRefs(cwd, docs.map(d => ({ name: d, absPath: join(scanDir, d) })))
  } catch {
    return null // 核验器自身故障不阻断 postcheck（fail-open，仅损失一层 advisory）
  }
  const { invalid, totalRefs, skippedCrossRepo } = verified
  if (invalid.length === 0) return null
  const sample = invalid.slice(0, 3).map(i => `${i.doc}: \`${i.ref}\`（${i.reason}）`).join('；')
  return {
    name: 'scan_doc_ref_invalid',
    severity: CHECK_SEVERITY.WARNING,
    detail: `${invalid.length} 条 file:line 引用未通过核验（${totalRefs} 条中）: ${sample}${invalid.length > 3 ? ` 等 ${invalid.length} 条` : ''}`,
    evidence: { invalidCount: invalid.length, totalRefs, skippedCrossRepo, checkedDocs: docs.length, sample: invalid.slice(0, 3) },
    supportedFixes: [
      'sillyspec docs check --paths <该文档> --dry-run  查看候选锚点（fixable 条目会给出 newLine），确认后去 --dry-run 落盘重锚',
      'sillyspec docs check --paths <该文档> --fix  对 fixable 引用自动重锚（回执附修复前后失效数对比）',
      '先跑 sillyspec docs check --paths <该文档> 确认零候选锚点后，再删除确认无法核验的引用行',
    ],
  }
}

/**
 * @param {object} opts
 * @param {string} opts.cwd - 源码项目根目录 (source_root)
 * @param {string} opts.specDir - 规范目录 (spec-root)，null 时为非平台模式
 * @param {string} [opts.outputText] - 最后一步（自检）的 AI 输出文本
 * @param {object} [opts.scanMeta] - scan 元数据（由 runCommand 传入）
 * @param {boolean} [opts.scanMeta.projectListParsed] - Step 2 项目列表是否成功解析
 * @param {boolean} [opts.scanMeta.manifestWritten] - manifest.json 是否写入成功
 * @param {number} [opts.scanMeta.projectCount] - 实际展开的项目数量
 * @returns {{ status: 'success'|'completed_with_warnings'|'failed_post_check', checks: Array<{name, severity, detail}> }}
 */
export function runScanPostCheck({ cwd, specDir, outputText = '', scanMeta = {}, scanProfile = null } ) {
  const isPlatform = !!specDir
  // profile 感知：quick 档只要求 4 份核心文档，否则要求完整 7 份。
  // 否则 quick 扫描（--quick 显式 或 小项目自动判定）在平台模式会因缺 INTEGRATIONS/TESTING/CONCERNS 直接判 failed。
  const mode = scanProfile?.mode || null
  const requiredDocs = mode === 'quick' ? SCAN_REQUIRED_DOCS_QUICK : SCAN_REQUIRED_DOCS
  const checks = []

  if (!isPlatform) {
    // 非平台模式：只做轻量检查
    const localSpec = join(cwd, '.sillyspec')
    const scanDir = join(localSpec, 'docs', basename(cwd), 'scan')

    // 检查必需文档是否存在（quick profile 按 4 份清单，否则 7 份）
    const missing = requiredDocs.filter(f => !existsSync(join(scanDir, f)))
    if (missing.length > 0) {
      checks.push({ name: 'missing_docs', severity: CHECK_SEVERITY.WARNING, detail: `缺少 ${missing.length} 份 scan 文档（${mode || 'full'} profile）: ${missing.join(', ')}` })
    }
    if (mode === 'quick') {
      checks.push({ name: 'quick_profile_notice', severity: CHECK_SEVERITY.WARNING, detail: 'quick scan：仅生成 4 份核心文档（PROJECT/ARCHITECTURE/CONVENTIONS/STRUCTURE），深度扫描待补齐' })
    }

    // 引用事实核验（archify P0）：本地模式与平台模式同规则，防「本地过平台挂」
    const existingLocalDocs = requiredDocs.filter(f => existsSync(join(scanDir, f)))
    const refCheck = checkScanDocRefs(cwd, scanDir, existingLocalDocs)
    if (refCheck) checks.push(refCheck)

    const hasWarning = checks.some(c => c.severity === 'warning')
    return { status: hasWarning ? 'completed_with_warnings' : 'success', checks }
  }

  // ── 平台模式：严格检查 ──

  const projectName = basename(cwd)

  // 1. source_root 污染检查（docs/projects/workflows/knowledge/manifest/local）
  const pollutePaths = ['docs', 'projects', 'workflows', 'knowledge']
  const polluteFiles = ['manifest.json', 'local.yaml']
  for (const sub of pollutePaths) {
    const localSub = join(cwd, '.sillyspec', sub)
    if (existsSync(localSub)) {
      try {
        const leaked = readdirSync(localSub, { recursive: true }).filter(e => String(e).endsWith('.md') || String(e).endsWith('.yaml') || String(e).endsWith('.json'))
        if (leaked.length > 0) {
          checks.push({
            name: sub === 'docs' ? 'source_root_docs_leak' : 'source_root_leak',
            severity: CHECK_SEVERITY.FAILED,
            detail: `source_root/.sillyspec/${sub}/ 下存在 ${leaked.length} 个文件（${localSub}/），agent 写入到了错误路径`
          })
        }
      } catch {}
    }
  }
  for (const file of polluteFiles) {
    const filePath = join(cwd, '.sillyspec', file)
    if (existsSync(filePath)) {
      checks.push({
        name: 'source_root_leak',
        severity: CHECK_SEVERITY.FAILED,
        detail: `source_root/.sillyspec/${file} 存在，agent 写入到了错误路径（${filePath}）`
      })
    }
  }

  // 2. spec_root 检查必需文档（quick profile 按 4 份清单，否则 7 份）
  const specScanDir = join(specDir, 'docs', projectName, 'scan')
  const missingDocs = requiredDocs.filter(f => !existsSync(join(specScanDir, f)))
  if (missingDocs.length > 0) {
    checks.push({
      name: missingDocs.length === requiredDocs.length ? 'all_docs_missing' : 'partial_docs_missing',
      severity: CHECK_SEVERITY.FAILED,
      detail: missingDocs.length === requiredDocs.length
        ? `spec_root 下无任何 scan 文档（${specScanDir}/），扫描可能未执行`
        : `spec_root 缺少必需文档: ${missingDocs.join(', ')}（${mode === 'quick' ? 'quick profile 要求 4 份核心文档' : '7 份 scan 文档均为 required'}）`
    })
  }
  if (mode === 'quick') {
    checks.push({ name: 'quick_profile_notice', severity: CHECK_SEVERITY.WARNING, detail: 'quick scan：仅生成 4 份核心文档（PROJECT/ARCHITECTURE/CONVENTIONS/STRUCTURE），深度扫描待补齐' })
  }

  // 3. 检查文档 header（author / created_at）— 只看文件头部，避免正文出现同名词被误判
  const existingDocs = requiredDocs.filter(f => existsSync(join(specScanDir, f)))
  const docsMissingHeader = []
  for (const doc of existingDocs) {
    const content = readFileSync(join(specScanDir, doc), 'utf8')
    const headerSlice = content.slice(0, 512)
    if (!/author\s*:/.test(headerSlice) || !/created_at\s*:/.test(headerSlice)) {
      docsMissingHeader.push(doc)
    }
  }
  if (docsMissingHeader.length > 0) {
    checks.push({
      name: 'docs_missing_header',
      severity: CHECK_SEVERITY.WARNING,
      detail: `${docsMissingHeader.length} 份文档缺少 author/created_at: ${docsMissingHeader.join(', ')}（sillyspec scan-fix-headers 一键补齐）`,
      evidence: { count: docsMissingHeader.length, docs: docsMissingHeader },
      supportedFixes: ['sillyspec scan-fix-headers'],
    })
  }

  // 3.5 引用事实核验（archify 借鉴 P0）：scan 文档里显式写的 file:line 引用逐条核验
  const refCheck = checkScanDocRefs(cwd, specScanDir, existingDocs)
  if (refCheck) checks.push(refCheck)

  // 4. local.yaml 校验
  const localYamlPath = join(specDir, 'local.yaml')
  if (existsSync(localYamlPath)) {
    const yamlContent = readFileSync(localYamlPath, 'utf8')
    // 改调共享 validateScriptCommands（H2，去重 plan/scan 两处命令校验）。
    // 严重度维持 WARNING（design D-04：scan 阶段保守，local.yaml 命令误报不阻断 init）；
    // 不传 modules → 仅查根 package.json，与历史行为一致（monorepo 子包感知由 plan-postcheck 启用）。
    // 仅校验 `npm|pnpm|yarn run <script>` 这类可静态对账的命令；install/typecheck/npx 等直接
    // 包管理器调用不在范围（沿用 cmd-existence.js:126-129 注释立场，正则天然不匹配它们）。
    const { invalid } = validateScriptCommands(yamlContent, { projectRoot: cwd })
    if (invalid.length > 0) {
      checks.push({
        name: 'local_config_invalid',
        severity: CHECK_SEVERITY.WARNING,
        detail: `local.yaml 引用不存在的命令: ${invalid.map(i => `${i.cmd} (${i.reason})`).join('; ')}`,
        evidence: { invalid },
        supportedFixes: ['修正 .sillyspec/local.yaml commands 中引用的 script 名（与 package.json scripts 对齐）'],
      })
    }
  }

  // 5. 检查 AI 输出中的真实错误标记
  // 注意：不对 agent 描述性文本做全文正则匹配，防止误报。
  // 只检测明显是 agent 运行时失败的信号（未被捕获的错误块），
  // 而非 agent 正常描述中提到这些词。
  if (outputText) {
    // 5a: 检测未被恢复的 API 错误（连续多次、非描述性提及）
    const apiErrorCount = (outputText.match(/API Error\b.*?\b529\b/gi) || []).length
    if (apiErrorCount >= 2) {
      checks.push({ name: 'api_error_529', severity: CHECK_SEVERITY.WARNING, detail: 'AI 输出中包含多次 API Error 529' })
    }
    const rateLimitCount = (outputText.match(/rate.?limit.*?exhausted/gi) || []).length
    if (rateLimitCount >= 2) {
      checks.push({ name: 'rate_limit_exhausted', severity: CHECK_SEVERITY.WARNING, detail: 'AI 输出中包含多次 rate_limit exhausted' })
    }
    // tool_use_error 和 fallback 已移除：agent 描述性文本中正常提及这些词
    // 不应触发 warning。真正的问题会通过文档缺失、manifest 失败等其他检查捕获。
  }

  // 6. manifest 写入状态检查
  if (scanMeta.manifestWritten === false) {
    checks.push({
      name: 'manifest_write_failed',
      severity: CHECK_SEVERITY.FAILED,
      detail: 'manifest.json 写入失败，平台无法消费 scan 结果'
    })
  }

  // 7. 项目列表解析状态检查
  if (scanMeta.projectListParsed === false) {
    checks.push({
      name: 'project_list_parse_failed',
      severity: CHECK_SEVERITY.WARNING,
      detail: 'Step 2 项目列表解析失败，回退到注册项目列表，可能遗漏子项目'
    })
  }

  // 7.5 knowledge 产物校验
  const knowledgeDir = join(specDir, 'knowledge')
  if (existsSync(knowledgeDir)) {
    const indexPath = join(knowledgeDir, 'INDEX.md')
    if (!existsSync(indexPath)) {
      checks.push({
        name: 'knowledge_index_missing',
        severity: CHECK_SEVERITY.WARNING,
        detail: `knowledge/INDEX.md 不存在`
      })
    } else {
      // 检查 INDEX.md 引用的文件是否真实存在
      const indexContent = readFileSync(indexPath, 'utf8')
      const referencedFiles = [...indexContent.matchAll(/\(([^)]+\.md)/g)].map(m => m[1])
      const missingRefs = referencedFiles.filter(f => !existsSync(join(knowledgeDir, f)))
      if (missingRefs.length > 0) {
        checks.push({
          name: 'knowledge_broken_refs',
          severity: CHECK_SEVERITY.WARNING,
          detail: `INDEX.md 引用了不存在的文件: ${missingRefs.join(', ')}`
        })
      }
    }
  } else {
    checks.push({
      name: 'knowledge_dir_missing',
      severity: CHECK_SEVERITY.WARNING,
      detail: `knowledge/ 目录不存在`
    })
  }

  // 8. 计算 finalStatus
  const hasFailed = checks.some(c => c.severity === CHECK_SEVERITY.FAILED)
  const hasWarning = checks.some(c => c.severity === CHECK_SEVERITY.WARNING)

  let status
  if (hasFailed) {
    status = SCAN_STATUS.FAILED_POST_CHECK
  } else if (hasWarning) {
    status = SCAN_STATUS.COMPLETED_WITH_WARNINGS
  } else {
    status = SCAN_STATUS.SUCCESS
  }

  return { status, checks }
}

/**
 * 将 postcheck 结果转换为结构化 JSON（SillyHub 可消费格式）
 *
 * failure_category 标准化：
 *   - warning  : 非致命问题，不阻塞流程
 *   - error    : 文档缺失/内容不完整，需要修复
 *   - critical : 安全问题（source_root 泄漏/路径污染）
 *
 * 结构化字段：
 *   - violations      : 明确违反约束的条目（source_root 泄漏等）
 *   - missing_outputs : 预期文件不存在
 *   - path_pollution  : 产物写入了错误路径
 *   - bad_references  : 引用了不存在的命令/资源
 *   - quality_warnings: AI 输出中包含错误标记等质量信号
 *
 * @param {object} result - runScanPostCheck 返回值
 * @param {object} [meta] - 附带元数据（workspace_id, scan_run_id, timestamp 等）
 * @returns {object} 结构化 JSON
 */
export function formatStructuredResult(result, meta = {}) {
  const structured = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    overall_status: result.status,
    // 路径溯源（供平台消费）
    ...(meta.workspace_id ? { workspace_id: meta.workspace_id } : {}),
    ...(meta.scan_run_id ? { scan_run_id: meta.scan_run_id } : {}),
    ...(meta.source_root ? { source_root: meta.source_root } : {}),
    ...(meta.spec_root ? { spec_root: meta.spec_root } : {}),
    ...(meta.runtime_root ? { runtime_root: meta.runtime_root } : {}),
    summary: {
      total_checks: result.checks.length,
      critical: 0,
      error: 0,
      warning: 0,
    },
    failure_categories: {
      violations: [],
      missing_outputs: [],
      path_pollution: [],
      bad_references: [],
      quality_warnings: [],
    },
    checks: result.checks.map(c => ({
      name: c.name,
      severity: c.severity === 'failed' ? 'critical' : c.severity,
      detail: c.detail,
      // 诊断信封升级（archify 借鉴 P1a，2026-09-04）：additive 字段，机器可路由的修复建议
      ...(c.evidence !== undefined ? { evidence: c.evidence } : {}),
      ...(Array.isArray(c.supportedFixes) ? { supportedFixes: c.supportedFixes } : {}),
    })),
  }

  // 分类到 failure_categories
  for (const check of result.checks) {
    const severity = check.severity === 'failed' ? 'critical' : check.severity
    const entry = { name: check.name, detail: check.detail, severity }

    // 路径污染类
    if (check.name === 'source_root_leak' || check.name === 'source_root_docs_leak') {
      structured.failure_categories.path_pollution.push(entry)
      structured.failure_categories.violations.push(entry)
    }
    // 文档缺失类
    else if (check.name === 'all_docs_missing' || check.name === 'partial_docs_missing' || check.name === 'missing_docs') {
      structured.failure_categories.missing_outputs.push(entry)
    }
    // 引用无效类
    else if (check.name === 'local_config_invalid' || check.name === 'scan_doc_ref_invalid') {
      structured.failure_categories.bad_references.push(entry)
    }
    // AI 输出质量类
    else if (['api_error_529', 'rate_limit_exhausted'].includes(check.name)) {
      structured.failure_categories.quality_warnings.push(entry)
    }
    // manifest/project 列表问题
    else if (check.name === 'manifest_write_failed' || check.name === 'project_list_parse_failed') {
      structured.failure_categories.violations.push(entry)
    }
    // 文档缺少 header
    else if (check.name === 'docs_missing_header') {
      structured.failure_categories.quality_warnings.push(entry)
    }
    // quick profile 说明（informational warning，非缺陷）
    else if (check.name === 'quick_profile_notice') {
      structured.failure_categories.quality_warnings.push(entry)
    }
    // 兜底：归入 violations
    else {
      structured.failure_categories.violations.push(entry)
    }
  }

  // 汇总计数
  for (const check of result.checks) {
    if (check.severity === 'failed') structured.summary.critical++
    else structured.summary.warning++
  }

  return structured
}

/**
 * 将结构化结果写入 JSON 文件（平台模式供 SillyHub 消费）
 *
 * 本地模式：写入 specDir/.runtime/postcheck-result.json
 * 平台模式：写入 runtimeRoot/scan-runs/{scan_run_id}/postcheck-result.json
 *
 * @param {object} structured - formatStructuredResult 返回值
 * @param {string} specDir - 规范目录（本地模式使用）
 * @param {object} [opts] - 平台模式选项
 * @param {string} [opts.runtimeRoot] - 平台模式运行时根目录
 * @param {string} [opts.scanRunId] - scan run ID
 * @returns {string|null} 写入的文件路径，失败时返回 null
 */
export function writeStructuredResult(structured, specDir, opts = {}) {
  if (!specDir && !opts.runtimeRoot) return null
  try {
    let outPath
    if (opts.runtimeRoot && opts.scanRunId) {
      const scanRunDir = join(opts.runtimeRoot, 'scan-runs', opts.scanRunId)
      mkdirSync(scanRunDir, { recursive: true })
      outPath = join(scanRunDir, 'postcheck-result.json')
    } else if (specDir) {
      const runtimeDir = join(specDir, '.runtime')
      mkdirSync(runtimeDir, { recursive: true })
      outPath = join(runtimeDir, 'postcheck-result.json')
    } else {
      return null
    }

    writeFileSync(outPath, JSON.stringify(structured, null, 2) + '\n')
    return outPath
  } catch (e) {
    console.warn(`  ⚠️ postcheck-result.json 写入失败: ${e.message}`)
    return null
  }
}

/**
 * 打印 post-check 结果到 stdout
 */
export function printScanPostCheckResult(result) {
  if (result.checks.length === 0) {
    console.log('  ✅ CLI post-check: 全部通过')
    return
  }

  for (const check of result.checks) {
    const icon = check.severity === 'failed' ? '❌' : '⚠️'
    console.log(`  ${icon} CLI post-check [${check.name}]: ${check.detail}`)
  }
  console.log(`  📋 最终状态: ${result.status}`)
}

/**
 * scan 文档 header 幂等补填（2026-08-21 agent-手工产出审计第三批 E3）。
 *
 * runScanPostCheck 对缺 author/created_at 只 warning，agent 手改常忘——本函数补齐：
 * author = git user.name（回退 unknown），created_at = 当前时间。已有两键的文件不动；
 * 有 frontmatter（--- 开头）就地插缺失键，无则补一段 frontmatter。
 * `sillyspec scan-fix-headers [--project <名>]` 入口；与 runScanPostCheck 的
 * 「头部 512 字符含 author:/created_at:」判定口径一致。
 *
 * @param {{ cwd: string, specDir?: string|null, project?: string|null }} opts
 * @returns {{ fixed: string[], skipped: string[] }}
 */
export function fixScanDocHeaders({ cwd, specDir = null, project = null }) {
  const specBase = specDir ? specDir : join(cwd, '.sillyspec')
  const docsRoot = join(specBase, 'docs')
  const projects = project
    ? [project]
    : (existsSync(docsRoot) ? readdirSync(docsRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) : [])

  let author = 'unknown'
  try {
    author = git(cwd, ['config', 'user.name']) || 'unknown'
  } catch { /* git 不可用 → unknown */ }
  const now = nowWallClock()

  const fixed = []
  const skipped = []
  for (const p of projects) {
    const scanDir = join(docsRoot, p, 'scan')
    if (!existsSync(scanDir)) continue
    for (const f of readdirSync(scanDir)) {
      if (!f.endsWith('.md')) continue
      const filePath = join(scanDir, f)
      let content
      try {
        content = readFileSync(filePath, 'utf8')
      } catch {
        continue
      }
      const r = backfillFrontmatter(content, { author, createdAt: now })
      if (!r.changed) {
        skipped.push(filePath)
        continue
      }
      try {
        writeFileSync(filePath, r.content)
        fixed.push(filePath)
      } catch { /* 只读文件等写失败 → 跳过不抛 */ }
    }
  }
  return { fixed, skipped }
}

/**
 * 通用 frontmatter 补齐（纯函数）：首 512 字节缺 author:/created_at: 时补缺失键。
 * 有 frontmatter（--- 开头）→ 插到开标签后（CRLF 归一 LF 写回）；无 → 头部整块前置。
 * fixScanDocHeaders 与 decisions.md 自动补（stage-contract.js ensureDecisionDocHeader）共用，
 * 单一实现杜绝两处行尾/插入位置漂移。
 * @param {string} content
 * @param {{ author: string, createdAt: string }} p
 * @returns {{ changed: boolean, content: string }}
 */
export function backfillFrontmatter(content, { author, createdAt }) {
  const header = String(content || '').slice(0, 512)
  const hasAuthor = /author\s*:/.test(header)
  const hasCreated = /created_at\s*:/.test(header)
  if (hasAuthor && hasCreated) return { changed: false, content }
  const inserts = []
  if (!hasAuthor) inserts.push(`author: ${author}`)
  if (!hasCreated) inserts.push(`created_at: ${createdAt}`)
  if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
    // 有 frontmatter：插到开标签后（CRLF 归一写回，与其它 CLI 写入口径一致）
    const normalized = content.replace(/\r\n?/g, '\n')
    return { changed: true, content: normalized.replace(/^---\n/, `---\n${inserts.join('\n')}\n`) }
  }
  return { changed: true, content: `---\n${inserts.join('\n')}\n---\n\n` + content.replace(/\r\n?/g, '\n') }
}

/**
 * scan 文档 frontmatter CLI 原子注入（2026-09-05 ②，archify 借鉴：机器校验替代 agent 自检）。
 *
 * agent 只写正文，元数据由 CLI「盖章」：author / created_at / source_commit（HEAD 短哈希）/
 * updated_at / generator: sillyspec-scan（quick 档另加 scan_depth: quick）。
 * 只补缺失键、**绝不覆盖已有**（增量扫描时旧文档保留原 source_commit 溯源）；
 * 插入口径与 backfillFrontmatter 逐字一致（有 --- 就地插入、无则前置整块、CRLF 归一写回）。
 * 幂等——三个调用路径（scanFinalize / quick postcheck / 平台收尾）重复执行无害。
 * 消灭 agent 手抄 CLI 注入值的失败模式（scan-fix-headers 从「兜底」降级为「历史文档修复工具」）。
 *
 * @param {{ cwd: string, specDir?: string|null, project?: string|null, mode?: string|null }} opts
 * @returns {{ fixed: string[], skipped: string[], stampedKeys: number }}
 */
export function stampScanDocHeaders({ cwd, specDir = null, project = null, mode = null }) {
  const specBase = specDir ? specDir : join(cwd, '.sillyspec')
  const docsRoot = join(specBase, 'docs')
  const projects = project
    ? [project]
    : (existsSync(docsRoot) ? readdirSync(docsRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) : [])

  let author = 'unknown'
  try { author = git(cwd, ['config', 'user.name']) || 'unknown' } catch { /* git 不可用 → unknown */ }
  let headShort = null
  try { headShort = String(git(cwd, ['rev-parse', '--short', 'HEAD']) || '').trim() || null } catch { /* 非 git 仓 → 省略 source_commit */ }
  const now = nowWallClock()
  const updatedIso = new Date().toISOString()

  const fixed = []
  const skipped = []
  let stampedKeys = 0
  for (const p of projects) {
    const scanDir = join(docsRoot, p, 'scan')
    if (!existsSync(scanDir)) continue
    for (const f of readdirSync(scanDir)) {
      if (!f.endsWith('.md')) continue
      const filePath = join(scanDir, f)
      let content
      try { content = readFileSync(filePath, 'utf8') } catch { continue }
      const header = content.slice(0, 600)
      const inserts = []
      if (!/author\s*:/.test(header)) { inserts.push(`author: ${author}`); stampedKeys++ }
      if (!/created_at\s*:/.test(header)) { inserts.push(`created_at: ${now}`); stampedKeys++ }
      if (headShort && !/source_commit\s*:/.test(header)) { inserts.push(`source_commit: ${headShort}`); stampedKeys++ }
      if (!/updated_at\s*:/.test(header)) { inserts.push(`updated_at: ${updatedIso}`); stampedKeys++ }
      if (!/generator\s*:/.test(header)) { inserts.push(`generator: sillyspec-scan`); stampedKeys++ }
      if (mode === 'quick' && !/scan_depth\s*:/.test(header)) { inserts.push(`scan_depth: quick`); stampedKeys++ }
      if (inserts.length === 0) { skipped.push(filePath); continue }
      const out = content.startsWith('---\n') || content.startsWith('---\r\n')
        ? content.replace(/\r\n?/g, '\n').replace(/^---\n/, `---\n${inserts.join('\n')}\n`)
        : `---\n${inserts.join('\n')}\n---\n\n` + content.replace(/\r\n?/g, '\n')
      try {
        writeFileSync(filePath, out)
        fixed.push(filePath)
      } catch { /* 只读文件等写失败 → 跳过不抛 */ }
    }
  }
  return { fixed, skipped, stampedKeys }
}

/**
 * source_root 污染一键修复（2026-08-21 agent-手工产出审计第四批 C-3）。
 *
 * runScanPostCheck 对「agent 把产物写到 <source_root>/.sillyspec/ 而非平台 specRoot」只报
 * FAILED 不修——agent 手工搬目录常搬错。本函数把检查枚举的同款清单（docs/projects/workflows/
 * knowledge 目录 + manifest.json/local.yaml）搬到 specRoot 对应位置（已存在的不覆盖，报告
 * skipped），搬完源目录若空则删除。与检查的路径口径逐字一致（pollutePaths/polluteFiles）。
 *
 * @param {{ cwd: string, specDir: string }} opts cwd=source_root，specDir=平台 spec_root 绝对路径
 * @returns {{ moved: string[], skipped: string[], removedDirs: string[] }}
 */
export function fixSourceRootLeak({ cwd, specDir }) {
  if (!cwd || !specDir) return { moved: [], skipped: [], removedDirs: [] }
  const moved = []
  const skipped = []
  const removedDirs = []
  const pollutePaths = ['docs', 'projects', 'workflows', 'knowledge']
  const polluteFiles = ['manifest.json', 'local.yaml']

  // 目标目录确保存在
  try { mkdirSync(join(specDir, '.runtime'), { recursive: true }) } catch {}

  for (const file of polluteFiles) {
    const src = join(cwd, '.sillyspec', file)
    const dst = join(specDir, file)
    if (!existsSync(src)) continue
    if (existsSync(dst)) {
      skipped.push(`local.yaml 已存在于 specRoot（保留两份，人工合并凭据后删源）`.replace('local.yaml', file))
      continue
    }
    try {
      renameSync(src, dst)
      moved.push(`.sillyspec/${file} → specRoot/${file}`)
    } catch (e) {
      skipped.push(`.sillyspec/${file} 搬移失败: ${e.message}`)
    }
  }

  for (const sub of pollutePaths) {
    const srcDir = join(cwd, '.sillyspec', sub)
    if (!existsSync(srcDir)) continue
    let entries = []
    try { entries = readdirSync(srcDir, { withFileTypes: true }) } catch { continue }
    if (entries.length === 0) {
      try { rmdirSync(srcDir); removedDirs.push(`.sillyspec/${sub}/（空目录）`) } catch {}
      continue
    }
    const dstDir = join(specDir, sub)
    mkdirSync(dstDir, { recursive: true })
    let allMoved = true
    for (const e of entries) {
      const src = join(srcDir, e.name)
      const dst = join(dstDir, e.name)
      if (existsSync(dst)) {
        skipped.push(`.sillyspec/${sub}/${e.name}（specRoot 已有同名，不覆盖——人工比对后择一保留）`)
        allMoved = false
        continue
      }
      try {
        renameSync(src, dst)
        moved.push(`.sillyspec/${sub}/${e.name} → specRoot/${sub}/${e.name}`)
      } catch (err) {
        skipped.push(`.sillyspec/${sub}/${e.name} 搬移失败: ${err.message}`)
        allMoved = false
      }
    }
    if (allMoved) {
      try { rmdirSync(srcDir); removedDirs.push(`.sillyspec/${sub}/`) } catch {}
    }
  }
  return { moved, skipped, removedDirs }
}
