/**
 * scan-postcheck.js — CLI 层 scan 完成后强制校验
 *
 * 不依赖 AI agent 的自检报告，由 CLI 代码直接检查文件系统。
 * 平台模式下必须通过所有 check 才能 success，否则降级。
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import { SCAN_STATUS, CHECK_SEVERITY } from './constants.js'

const REQUIRED_SCAN_DOCS = [
  'ARCHITECTURE.md',
  'CONVENTIONS.md',
  'STRUCTURE.md',
  'INTEGRATIONS.md',
  'TESTING.md',
  'CONCERNS.md',
  'PROJECT.md',
]

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
export function runScanPostCheck({ cwd, specDir, outputText = '', scanMeta = {} } ) {
  const isPlatform = !!specDir
  const checks = []

  if (!isPlatform) {
    // 非平台模式：只做轻量检查
    const localSpec = join(cwd, '.sillyspec')
    const scanDir = join(localSpec, 'docs', basename(cwd), 'scan')

    // 检查 7 份文档是否存在
    const missing = REQUIRED_SCAN_DOCS.filter(f => !existsSync(join(scanDir, f)))
    if (missing.length > 0) {
      checks.push({ name: 'missing_docs', severity: CHECK_SEVERITY.WARNING, detail: `缺少 ${missing.length} 份 scan 文档: ${missing.join(', ')}` })
    }

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

  // 2. spec_root 检查 7 份必需文档
  const specScanDir = join(specDir, 'docs', projectName, 'scan')
  const missingDocs = REQUIRED_SCAN_DOCS.filter(f => !existsSync(join(specScanDir, f)))
  if (missingDocs.length > 0) {
    checks.push({
      name: missingDocs.length === REQUIRED_SCAN_DOCS.length ? 'all_docs_missing' : 'partial_docs_missing',
      severity: CHECK_SEVERITY.FAILED,
      detail: missingDocs.length === REQUIRED_SCAN_DOCS.length
        ? `spec_root 下无任何 scan 文档（${specScanDir}/），扫描可能未执行`
        : `spec_root 缺少必需文档: ${missingDocs.join(', ')}（7 份 scan 文档均为 required）`
    })
  }

  // 3. 检查文档 header（author / created_at）— 只看文件头部，避免正文出现同名词被误判
  const existingDocs = REQUIRED_SCAN_DOCS.filter(f => existsSync(join(specScanDir, f)))
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
      detail: `${docsMissingHeader.length} 份文档缺少 author/created_at: ${docsMissingHeader.join(', ')}`
    })
  }

  // 4. local.yaml 校验
  const localYamlPath = join(specDir, 'local.yaml')
  if (existsSync(localYamlPath)) {
    const yamlContent = readFileSync(localYamlPath, 'utf8')
    const packageJsonPath = join(cwd, 'package.json')
    const invalidCommands = []

    // 简单提取 local.yaml 中的 commands
    const commandMatch = yamlContent.match(/build:\s*"([^"]+)"/) ||
                        yamlContent.match(/test:\s*"([^"]+)"/) ||
                        yamlContent.match(/lint:\s*"([^"]+)"/)

    if (commandMatch) {
      // 提取所有 npm run <script> 形式的命令
      const npmRunCommands = yamlContent.match(/npm run (\S+)/g) || []
      if (npmRunCommands.length > 0 && existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
          const scripts = pkg.scripts || {}
          for (const cmd of npmRunCommands) {
            const scriptName = cmd.replace('npm run ', '')
            if (!scripts[scriptName]) {
              invalidCommands.push(`${cmd} (package.json 无 ${scriptName} script)`)
            }
          }
        } catch {}
      }
    }

    if (invalidCommands.length > 0) {
      checks.push({
        name: 'local_config_invalid',
        severity: CHECK_SEVERITY.WARNING,
        detail: `local.yaml 引用不存在的命令: ${invalidCommands.join('; ')}`
      })
    }
  }

  // 5. 检查 AI 输出中的错误标记
  if (outputText) {
    const errorPatterns = [
      { pattern: /tool_use_error/i, name: 'tool_use_error', detail: 'AI 输出中包含 tool_use_error' },
      { pattern: /API Error.*529/i, name: 'api_error_529', detail: 'AI 输出中包含 API Error 529' },
      { pattern: /rate.?limit.*exhausted/i, name: 'rate_limit_exhausted', detail: 'AI 输出中包含 rate_limit exhausted' },
      { pattern: /fallback|retry.*failed|skipped.*validat/i, name: 'fallback_or_skip', detail: 'AI 输出中出现 fallback/retry failed/skipped validation' },
    ]
    for (const ep of errorPatterns) {
      if (ep.pattern.test(outputText)) {
        checks.push({ name: ep.name, severity: CHECK_SEVERITY.WARNING, detail: ep.detail })
      }
    }
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
    else if (check.name === 'local_config_invalid') {
      structured.failure_categories.bad_references.push(entry)
    }
    // AI 输出质量类
    else if (['tool_use_error', 'api_error_529', 'rate_limit_exhausted', 'fallback_or_skip'].includes(check.name)) {
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
