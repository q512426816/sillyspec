/**
 * scan-postcheck.js — CLI 层 scan 完成后强制校验
 *
 * 不依赖 AI agent 的自检报告，由 CLI 代码直接检查文件系统。
 * 平台模式下必须通过所有 check 才能 success，否则降级。
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'

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
 * @returns {{ status: 'success'|'completed_with_warnings'|'failed_post_check', checks: Array<{name, severity, detail}> }}
 */
export function runScanPostCheck({ cwd, specDir, outputText = '' }) {
  const isPlatform = !!specDir
  const checks = []

  if (!isPlatform) {
    // 非平台模式：只做轻量检查
    const localSpec = join(cwd, '.sillyspec')
    const scanDir = join(localSpec, 'docs', basename(cwd), 'scan')

    // 检查 7 份文档是否存在
    const missing = REQUIRED_SCAN_DOCS.filter(f => !existsSync(join(scanDir, f)))
    if (missing.length > 0) {
      checks.push({ name: 'missing_docs', severity: 'warning', detail: `缺少 ${missing.length} 份 scan 文档: ${missing.join(', ')}` })
    }

    const hasWarning = checks.some(c => c.severity === 'warning')
    return { status: hasWarning ? 'completed_with_warnings' : 'success', checks }
  }

  // ── 平台模式：严格检查 ──

  const projectName = basename(cwd)

  // 1. source_root 污染检查
  const localDocsDir = join(cwd, '.sillyspec', 'docs')
  if (existsSync(localDocsDir)) {
    try {
      const leaked = readdirSync(localDocsDir, { recursive: true }).filter(e => String(e).endsWith('.md'))
      if (leaked.length > 0) {
        checks.push({
          name: 'source_root_docs_leak',
          severity: 'failed',
          detail: `source_root 下存在 ${leaked.length} 个文档文件（${localDocsDir}/），agent 可能写入到了错误路径`
        })
      }
    } catch {}
  }

  // 2. spec_root 检查 7 份必需文档
  const specScanDir = join(specDir, 'docs', projectName, 'scan')
  const missingDocs = REQUIRED_SCAN_DOCS.filter(f => !existsSync(join(specScanDir, f)))
  if (missingDocs.length > 0) {
    checks.push({
      name: missingDocs.length === REQUIRED_SCAN_DOCS.length ? 'all_docs_missing' : 'partial_docs_missing',
      severity: 'failed',
      detail: missingDocs.length === REQUIRED_SCAN_DOCS.length
        ? `spec_root 下无任何 scan 文档（${specScanDir}/），扫描可能未执行`
        : `spec_root 缺少必需文档: ${missingDocs.join(', ')}（7 份 scan 文档均为 required）`
    })
  }

  // 3. 检查文档 header（author / created_at）
  const existingDocs = REQUIRED_SCAN_DOCS.filter(f => existsSync(join(specScanDir, f)))
  const docsMissingHeader = []
  for (const doc of existingDocs) {
    const content = readFileSync(join(specScanDir, doc), 'utf8')
    if (!content.includes('author') || !content.includes('created_at')) {
      docsMissingHeader.push(doc)
    }
  }
  if (docsMissingHeader.length > 0) {
    checks.push({
      name: 'docs_missing_header',
      severity: 'warning',
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
        severity: 'warning',
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
        checks.push({ name: ep.name, severity: 'warning', detail: ep.detail })
      }
    }
  }

  // 6. 计算 finalStatus
  const hasFailed = checks.some(c => c.severity === 'failed')
  const hasWarning = checks.some(c => c.severity === 'warning')

  let status
  if (hasFailed) {
    status = 'failed_post_check'
  } else if (hasWarning) {
    status = 'completed_with_warnings'
  } else {
    status = 'success'
  }

  return { status, checks }
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
