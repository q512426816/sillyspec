/**
 * knowledge.js — agent-safe knowledge 管理命令
 *
 * 设计原则：
 * - 所有输出为 JSON（--json 是默认行为，不需要显式传）
 * - agent 可安全调用，不打开编辑器，不直接覆盖人工区
 * - 失败有明确错误码
 *
 * 子命令：
 *   search   — 关键词搜索知识库
 *   inspect  — 读取单条知识详情
 *   validate — 校验知识库完整性
 *   refresh  — 从 scan 文档刷新自动知识（仅写 generated/）
 *   propose  — 提议新知识（写入 proposed/）
 */

import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from 'fs'
import { join, basename } from 'path'
import { parseKnowledgeIndex, matchKnowledge } from '../knowledge-match.js'

// ── 工具函数 ──

function resolveKnowledgeDir(dir, specDir) {
  const base = specDir || join(dir, '.sillyspec')
  return join(base, 'knowledge')
}

function output(ok, data, error) {
  const result = { ok, ...data }
  if (error) result.error = error
  console.log(JSON.stringify(result, null, 2))
}

/**
 * 从文件路径生成知识 ID
 * knowledge/conventions.md → conventions
 * knowledge/generated/patterns.md → generated/patterns
 */
function pathToId(basePath, knowledgeDir) {
  let rel = basePath
  if (rel.startsWith(knowledgeDir + '/')) rel = rel.slice(knowledgeDir.length + 1)
  if (rel.endsWith('.md')) rel = rel.slice(0, -3)
  return rel
}

/**
 * 从知识条目提取摘要（取第一段非空非标题文本）
 */
function extractSummary(content, maxLen = 120) {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue
    if (trimmed.startsWith('---')) continue
    if (trimmed.startsWith('author:') || trimmed.startsWith('created_at:')) continue
    if (trimmed.startsWith('>')) continue
    if (trimmed.startsWith('<!--')) continue
    return trimmed.slice(0, maxLen) + (trimmed.length > maxLen ? '...' : '')
  }
  return ''
}

/**
 * 提取文件标题（第一个 # 标题）
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

// ── search ──

export async function cmdSearch(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const queryIdx = args.indexOf('--query')
  const query = queryIdx >= 0 && args[queryIdx + 1] ? args[queryIdx + 1] : ''
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1]) : 10

  if (!query) {
    output(false, {}, '--query is required')
    return
  }

  if (!existsSync(knowledgeDir)) {
    output(false, {}, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // 复用 knowledge-match 引擎
  const result = matchKnowledge(knowledgeDir, query)

  if (!result.matched) {
    output(true, { query, matches: [] })
    return
  }

  // 增强：为每个匹配项补充 path、title、summary、score
  const matches = result.entries.slice(0, limit).map(entry => {
    const filePath = join(knowledgeDir, entry.file)
    let title = entry.display
    let summary = ''
    let score = entry.keywords.length // 简单评分：匹配关键词数量

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8')
      title = extractTitle(content) || entry.display
      summary = extractSummary(content)
    }

    return {
      id: pathToId(entry.file, knowledgeDir),
      path: join('knowledge', entry.file),
      title,
      summary,
      score,
      tags: entry.keywords,
      category: entry.category,
    }
  })

  output(true, { query, matches })
}

// ── inspect ──

export async function cmdInspect(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const idIdx = args.indexOf('--id')
  const id = idIdx >= 0 && args[idIdx + 1] ? args[idIdx + 1] : ''

  if (!id) {
    output(false, {}, '--id is required')
    return
  }

  if (!existsSync(knowledgeDir)) {
    output(false, {}, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // ID → 文件路径：conventions → knowledge/conventions.md
  // generated/patterns → knowledge/generated/patterns.md
  const filePath = join(knowledgeDir, id + '.md')

  if (!existsSync(filePath)) {
    output(false, {}, { code: 'not_found', id, path: filePath })
    return
  }

  const content = readFileSync(filePath, 'utf8')
  const title = extractTitle(content)
  const summary = extractSummary(content)

  // 元数据
  const meta = {}
  const authorMatch = content.match(/^author:\s*(.+)$/m)
  const createdAtMatch = content.match(/^created_at:\s*(.+)$/m)
  if (authorMatch) meta.author = authorMatch[1].trim()
  if (createdAtMatch) meta.created_at = createdAtMatch[1].trim()

  // 文件修改时间
  const stat = statSync(filePath)
  meta.updated_at = stat.mtime.toISOString()

  // 分区检测
  let zone = 'manual'
  if (id.startsWith('generated/')) zone = 'generated'
  else if (id.startsWith('proposed/')) zone = 'proposed'

  output(true, {
    entry: {
      id,
      title,
      summary,
      zone,
      path: join('knowledge', id + '.md'),
      meta,
      body: content,
    }
  })
}

// ── validate ──

export async function cmdValidate(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const errors = []
  const warnings = []

  if (!existsSync(knowledgeDir)) {
    output(false, { errors, warnings }, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // 1. INDEX.md 存在
  const indexPath = join(knowledgeDir, 'INDEX.md')
  if (!existsSync(indexPath)) {
    errors.push({ code: 'missing_index', path: 'knowledge/INDEX.md' })
  } else {
    // 2. INDEX.md 引用的文件是否存在
    const entries = parseKnowledgeIndex(knowledgeDir)
    for (const entry of entries) {
      const refPath = join(knowledgeDir, entry.file)
      if (!existsSync(refPath)) {
        errors.push({
          code: 'broken_reference',
          path: join('knowledge', entry.file),
          referenced_in: 'INDEX.md',
          display: entry.display,
        })
      }
    }
  }

  // 3. 扫描所有 .md 文件，检查是否在 INDEX 中注册
  const allMdFiles = scanMdFiles(knowledgeDir, '')
  const indexedFiles = new Set(
    parseKnowledgeIndex(knowledgeDir).map(e => e.file)
  )

  for (const mdFile of allMdFiles) {
    if (mdFile === 'INDEX.md') continue
    // generated/ 和 proposed/ 区不强制要求 INDEX 注册
    if (mdFile.startsWith('generated/') || mdFile.startsWith('proposed/')) continue
    if (!indexedFiles.has(mdFile)) {
      warnings.push({
        code: 'unregistered_file',
        path: join('knowledge', mdFile),
      })
    }
  }

  // 4. uncategorized.md 条目数（多了提示需清理）
  const uncategorizedPath = join(knowledgeDir, 'uncategorized.md')
  if (existsSync(uncategorizedPath)) {
    const content = readFileSync(uncategorizedPath, 'utf8')
    const entryCount = (content.match(/^###\s+/gm) || []).length
    if (entryCount >= 10) {
      warnings.push({
        code: 'too_many_uncategorized',
        count: entryCount,
        path: 'knowledge/uncategorized.md',
      })
    }
  }

  // 5. 空文件检测
  for (const mdFile of allMdFiles) {
    if (mdFile === 'INDEX.md') continue
    const fullPath = join(knowledgeDir, mdFile)
    const content = readFileSync(fullPath, 'utf8')
    if (content.trim().length === 0) {
      errors.push({
        code: 'empty_file',
        path: join('knowledge', mdFile),
      })
    }
  }

  output(errors.length === 0, { errors, warnings })
}

// ── refresh ──

export async function cmdRefresh(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const generatedDir = join(knowledgeDir, 'generated')

  if (!existsSync(knowledgeDir)) {
    output(false, {}, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // refresh 只写 generated/ 区
  mkdirSync(generatedDir, { recursive: true })

  // 扫描 scan 文档
  const base = opts.specDir || join(dir, '.sillyspec')
  const projectName = basename(dir)
  const scanDir = join(base, 'docs', projectName, 'scan')

  if (!existsSync(scanDir)) {
    output(false, {}, { code: 'scan_docs_missing', path: scanDir })
    return
  }

  const scanFiles = readdirSync(scanDir).filter(f => f.endsWith('.md'))
  const generated = []
  const overwritten = []

  for (const scanFile of scanFiles) {
    const scanPath = join(scanDir, scanFile)
    const content = readFileSync(scanPath, 'utf8')
    const title = extractTitle(content) || scanFile.replace('.md', '')

    // 简单提取：取每个 ## 章节作为一个知识条目候选
    const sections = extractSections(content)
    for (const section of sections) {
      if (section.lines < 3) continue // 太短的章节跳过

      const slug = section.heading.toLowerCase()
        .replace(/[^\w\u4e00-\u9fff]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)

      const fileName = `${slug}.md`
      const genPath = join(generatedDir, fileName)
      const isNew = !existsSync(genPath)

      const entryContent = [
        `---`,
        `source: scan/${scanFile}`,
        `section: ${section.heading}`,
        `generated_at: ${new Date().toISOString()}`,
        `---`,
        ``,
        `# ${title} — ${section.heading}`,
        ``,
        section.body,
      ].join('\n')

      writeFileSync(genPath, entryContent)
      generated.push({ file: `generated/${fileName}`, title: `${title} — ${section.heading}`, new: isNew })
      if (!isNew) overwritten.push(`generated/${fileName}`)
    }
  }

  // 更新 generated/INDEX.md
  const genIndexPath = join(generatedDir, 'INDEX.md')
  const indexLines = [
    '---',
    `generated_at: ${new Date().toISOString()}`,
    '---',
    '',
    '# Generated Knowledge Index',
    '',
    '> Auto-generated from scan documents. Do not edit manually.',
    '',
  ]
  for (const g of generated) {
    indexLines.push(`- ${g.title} → [${g.file}](${g.file})`)
  }
  writeFileSync(genIndexPath, indexLines.join('\n'))

  output(true, {
    generated_count: generated.length,
    new_count: generated.filter(g => g.new).length,
    overwritten_count: overwritten.length,
    files: generated,
  })
}

// ── propose ──

export async function cmdPropose(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const proposedDir = join(knowledgeDir, 'proposed')

  const titleIdx = args.indexOf('--title')
  const title = titleIdx >= 0 && args[titleIdx + 1] ? args[titleIdx + 1] : ''
  const categoryIdx = args.indexOf('--category')
  const category = categoryIdx >= 0 && args[categoryIdx + 1] ? args[categoryIdx + 1] : 'uncategorized'
  const bodyIdx = args.indexOf('--body')
  const body = bodyIdx >= 0 && args[bodyIdx + 1] ? args[bodyIdx + 1] : ''
  const fromIdx = args.indexOf('--from')
  const from = fromIdx >= 0 && args[fromIdx + 1] ? args[fromIdx + 1] : ''

  if (!title) {
    output(false, {}, '--title is required')
    return
  }

  mkdirSync(proposedDir, { recursive: true })

  // 生成 slug
  const slug = title.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const fileName = `${slug}.md`
  const propPath = join(proposedDir, fileName)
  const isNew = !existsSync(propPath)

  const content = [
    '---',
    `proposed_at: ${new Date().toISOString()}`,
    `category: ${category}`,
    ...(from ? [`source: ${from}`] : []),
    'status: pending_review',
    '---',
    '',
    `# ${title}`,
    '',
    body || '(no body provided)',
    '',
    '---',
    '> This is a proposed knowledge entry. Review and merge into manual/ or generated/.',
  ].join('\n')

  writeFileSync(propPath, content)

  output(true, {
    id: `proposed/${slug}`,
    path: `knowledge/proposed/${fileName}`,
    title,
    category,
    new: isNew,
    action: isNew ? 'created' : 'updated',
  })
}

// ── 辅助函数 ──

function scanMdFiles(baseDir, prefix) {
  const results = []
  const items = readdirSync(baseDir, { withFileTypes: true })
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name
    if (item.isDirectory()) {
      results.push(...scanMdFiles(join(baseDir, item.name), rel))
    } else if (item.name.endsWith('.md')) {
      results.push(rel)
    }
  }
  return results
}

function extractSections(content) {
  const lines = content.split('\n')
  const sections = []
  let currentHeading = null
  let currentLines = []
  let currentBody = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join('\n').trim(),
          lines: currentLines.length,
        })
      }
      currentHeading = line.slice(3).trim()
      currentLines = [line]
      currentBody = []
    } else if (currentHeading) {
      currentLines.push(line)
      // 跳过 frontmatter 和标题行
      if (!line.startsWith('---') && !line.startsWith('#')) {
        currentBody.push(line)
      }
    }
  }

  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      body: currentBody.join('\n').trim(),
      lines: currentLines.length,
    })
  }

  return sections.filter(s => s.lines >= 3)
}

// ── 入口路由 ──

/**
 * @param {string[]} args - filteredArgs.slice(1)（去掉 'knowledge'）
 * @param {string} dir - 项目根目录
 * @param {object} opts - { specDir }
 */
export async function cmdKnowledge(args, dir, opts = {}) {
  const subCommand = args[0] || ''

  switch (subCommand) {
    case 'search':
      return cmdSearch(dir, args.slice(1), opts)
    case 'inspect':
      return cmdInspect(dir, args.slice(1), opts)
    case 'validate':
      return cmdValidate(dir, args.slice(1), opts)
    case 'refresh':
      return cmdRefresh(dir, args.slice(1), opts)
    case 'propose':
      return cmdPropose(dir, args.slice(1), opts)
    default:
      output(false, {}, {
        code: 'unknown_subcommand',
        subcommand: subCommand,
        available: ['search', 'inspect', 'validate', 'refresh', 'propose'],
      })
  }
}
