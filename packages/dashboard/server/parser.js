import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Parse docs tree for a project
 * @param {string} projectPath - Path to the project directory
 * @returns {object} Docs tree grouped by type
 */
// Known framework detection keywords in package.json dependencies
const FRAMEWORK_PATTERNS = [
  { keys: ['react', 'react-dom'], name: 'React' },
  { keys: ['vue'], name: 'Vue' },
  { keys: ['next'], name: 'Next.js' },
  { keys: ['nuxt'], name: 'Nuxt' },
  { keys: ['express'], name: 'Express' },
  { keys: ['koa'], name: 'Koa' },
  { keys: ['fastify'], name: 'Fastify' },
  { keys: ['nestjs', '@nestjs/core'], name: 'NestJS' },
  { keys: ['svelte'], name: 'Svelte' },
  { keys: ['astro'], name: 'Astro' },
  { keys: ['vite'], name: 'Vite' },
  { keys: ['webpack'], name: 'Webpack' },
  { keys: ['typescript'], name: 'TypeScript' },
  { keys: ['tailwindcss'], name: 'Tailwind' },
  { keys: ['prisma'], name: 'Prisma' },
  { keys: ['drizzle-orm'], name: 'Drizzle' },
]

/**
 * Parse project overview info
 * @param {string} projectPath
 * @returns {object} Overview data
 */
export function parseProjectOverview(projectPath) {
  const result = {
    techStack: [],
    lastActive: null,
    docStats: { design: 0, plan: 0, archive: 0, changes: 0, scan: 0, quicklog: 0, total: 0 },
    git: { branch: '', lastCommit: '', dirtyCount: 0 }
  }

  // --- Tech stack ---
  const pkgPath = join(projectPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) })
      for (const pattern of FRAMEWORK_PATTERNS) {
        if (pattern.keys.some(k => deps.includes(k))) {
          result.techStack.push(pattern.name)
        }
      }
    } catch {}
  }
  if (existsSync(join(projectPath, 'pom.xml'))) {
    result.techStack.push('Java')
    try {
      const content = readFileSync(join(projectPath, 'pom.xml'), 'utf-8')
      if (content.includes('spring-boot')) result.techStack.push('Spring Boot')
    } catch {}
  }
  if (existsSync(join(projectPath, 'build.gradle')) || existsSync(join(projectPath, 'build.gradle.kts'))) {
    if (!result.techStack.includes('Java')) result.techStack.push('Gradle')
  }
  if (existsSync(join(projectPath, 'requirements.txt')) || existsSync(join(projectPath, 'pyproject.toml'))) {
    result.techStack.push('Python')
  }
  if (existsSync(join(projectPath, 'go.mod'))) {
    result.techStack.push('Go')
  }
  if (result.techStack.length === 0) result.techStack = []

  // --- Last active ---
  const sillyspecDir = join(projectPath, '.sillyspec')
  const progressPath = join(sillyspecDir, '.runtime', 'progress.json')
  if (existsSync(progressPath)) {
    try {
      const progress = JSON.parse(readFileSync(progressPath, 'utf-8'))
      if (progress.stages) {
        for (const stageData of Object.values(progress.stages)) {
          if (stageData.lastActive && (!result.lastActive || new Date(stageData.lastActive) > new Date(result.lastActive))) {
            result.lastActive = stageData.lastActive
          }
        }
      }
      if (progress.lastActive) result.lastActive = progress.lastActive
    } catch {}
  }
  if (!result.lastActive) {
    // Fallback: most recently modified file in .sillyspec
    try {
      const findRecent = (dir) => {
        let latest = null
        if (!existsSync(dir)) return latest
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, entry.name)
          try {
            const s = statSync(p)
            if (entry.isDirectory()) {
              const sub = findRecent(p)
              if (sub && (!latest || sub > latest)) latest = sub
            } else if (!latest || s.mtimeMs > latest) {
              latest = s.mtimeMs
            }
          } catch {}
        }
        return latest
      }
      const ts = findRecent(sillyspecDir)
      if (ts) result.lastActive = new Date(ts).toISOString()
    } catch {}
  }

  // --- Doc stats ---
  const docsDir = join(sillyspecDir, 'docs')
  if (existsSync(docsDir)) {
    const typeMap = { brainstorm: 'design', plan: 'plan', archive: 'archive', changes: 'changes', scan: 'scan', quicklog: 'quicklog' }
    try {
      for (const projDir of readdirSync(docsDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
        for (const typeDir of readdirSync(join(docsDir, projDir.name), { withFileTypes: true }).filter(d => d.isDirectory())) {
          const key = typeMap[typeDir.name]
          if (!key) continue
          const count = countMdFiles(join(docsDir, projDir.name, typeDir.name))
          result.docStats[key] += count
          result.docStats.total += count
        }
      }
    } catch {}
  }

  // --- Git info ---
  try {
    result.git.lastCommit = execSync('git log -1 --format=%s', { cwd: projectPath, encoding: 'utf-8' }).trim()
  } catch {}
  try {
    result.git.branch = execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf-8' }).trim()
  } catch {}
  try {
    result.git.dirtyCount = parseInt(execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' }).trim().split('\n').filter(Boolean).length, 10) || 0
  } catch {}

  return result
}

export function parseGitDetail(projectPath) {
  const result = { branch: '', commits: [], untracked: [] }
  try {
    result.branch = execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf-8' }).trim()
  } catch {}
  try {
    const log = execSync('git log -5 --format=%h|%s|%an|%aI', { cwd: projectPath, encoding: 'utf-8' }).trim()
    result.commits = log.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|')
      return { hash, message, author, date }
    })
  } catch {}
  try {
    const status = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' }).trim()
    result.untracked = status.split('\n').filter(Boolean).map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3)
    }))
  } catch {}
  return result
}

export function parseTechStackDetail(projectPath) {
  const result = { frameworks: [], dependencies: {}, devDependencies: {} }
  const pkgPath = join(projectPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      result.dependencies = pkg.dependencies || {}
      result.devDependencies = pkg.devDependencies || {}
      const allDeps = Object.keys({ ...result.dependencies, ...result.devDependencies })
      for (const pattern of FRAMEWORK_PATTERNS) {
        if (pattern.keys.some(k => allDeps.includes(k))) {
          result.frameworks.push(pattern.name)
        }
      }
    } catch {}
  }
  return result
}

export function parseDocsList(projectPath) {
  const sillyspecDir = join(projectPath, '.sillyspec')
  const docsDir = join(sillyspecDir, 'docs')
  const groups = []
  if (!existsSync(docsDir)) return groups
  const typeMap = {
    brainstorm: { label: '设计文档', icon: '📋' },
    plan: { label: '实现计划', icon: '📐' },
    archive: { label: '已归档', icon: '📦' },
    changes: { label: '当前变更', icon: '⚙️' },
    scan: { label: '架构文档', icon: '🔍' },
    quicklog: { label: '快速修复', icon: '⚡' }
  }
  try {
    for (const projDir of readdirSync(docsDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
      for (const typeDir of readdirSync(join(docsDir, projDir.name), { withFileTypes: true }).filter(d => d.isDirectory())) {
        const cfg = typeMap[typeDir.name]
        if (!cfg) continue
        const files = listFilesRecursive(join(docsDir, projDir.name, typeDir.name))
        if (files.length) {
          groups.push({ key: typeDir.name, label: cfg.label, icon: cfg.icon, files })
        }
      }
    }
  } catch {}
  return groups
}

function listFilesRecursive(dir) {
  const files = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) {
        const sub = listFilesRecursive(p)
        for (const f of sub) f.name = entry.name + '/' + f.name
        files.push(...sub)
      } else if (entry.name.endsWith('.md')) {
        const s = statSync(p)
        files.push({ name: entry.name, path: p, size: s.size, mtime: s.mtime.toISOString() })
      }
    }
  } catch {}
  return files
}

function countMdFiles(dir) {
  let count = 0
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        count += countMdFiles(join(dir, entry.name))
      } else if (entry.name.endsWith('.md')) {
        count++
      }
    }
  } catch {}
  return count
}

export function parseDocsTree(projectPath) {
  const sillyspecDir = join(projectPath, '.sillyspec')
  const docsDir = join(sillyspecDir, 'docs')

  if (!existsSync(docsDir)) {
    return { groups: [] }
  }

  const groupConfig = [
    { key: 'brainstorm', label: '📋 设计文档', icon: '📋', dir: 'brainstorm' },
    { key: 'plan', label: '📐 实现计划', icon: '📐', dir: 'plan' },
    { key: 'changes', label: '⚙️ 当前变更', icon: '⚙️', dir: 'changes' },
    { key: 'archive', label: '📦 已归档', icon: '📦', dir: 'archive' },
    { key: 'scan', label: '🔍 架构文档', icon: '🔍', dir: 'scan' },
    { key: 'quicklog', label: '⚡ 快速修复', icon: '⚡', dir: 'quicklog' },
  ]

  const groups = []

  // Find project dirs under docs/
  const projectDirs = existsSync(docsDir) ? readdirSync(docsDir, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name) : []

  for (const projName of projectDirs) {
    const projDocsDir = join(docsDir, projName)

    for (const group of groupConfig) {
      const groupDir = join(projDocsDir, group.dir)
      if (!existsSync(groupDir)) continue

      const files = []
      try {
        const entries = readdirSync(groupDir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // For changes/ and archive/ subdirs
            const subDir = join(groupDir, entry.name)
            try {
              const subFiles = readdirSync(subDir).filter(f => f.endsWith('.md'))
              for (const sf of subFiles) {
                const filePath = join(subDir, sf)
                files.push({
                  name: `${entry.name}/${sf}`,
                  path: filePath,
                  title: sf.replace('.md', '')
                })
              }
            } catch {}
          } else if (entry.name.endsWith('.md')) {
            const filePath = join(groupDir, entry.name)
            let title = entry.name.replace('.md', '')
            try {
              const content = readFileSync(filePath, 'utf-8')
              const titleMatch = content.match(/^#\s+(.+)$/m)
              if (titleMatch) title = titleMatch[1]
            } catch {}
            files.push({ name: entry.name, path: filePath, title })
          }
        }
      } catch {}

      if (files.length > 0) {
        groups.push({
          key: `${projName}::${group.key}`,
          label: group.label,
          project: projName,
          files
        })
      }
    }
  }

  return { groups }
}

/**
 * Parse project state from .sillyspec directory
 * @param {string} projectPath - Path to the project directory
 * @returns {object} Project state with currentStage, nextStep, progress, stages, specs, lastActive
 */
export function parseProjectState(projectPath) {
  const sillyspecDir = join(projectPath, '.sillyspec')

  if (!existsSync(sillyspecDir)) {
    return null
  }

  let currentStage = ''
  let nextStep = null
  let progress = { stages: {} }
  let stages = []
  let specs = []
  let lastActive = null

  // Read progress.json for current stage
  const progressPath = join(sillyspecDir, '.runtime', 'progress.json')
  if (existsSync(progressPath)) {
    try {
      const progressData = JSON.parse(readFileSync(progressPath, 'utf-8'))
      progress = progressData
      currentStage = progressData.currentStage || ''
      stages = Object.keys(progressData.stages || {})

      // Find last active
      if (progressData.lastActive) lastActive = progressData.lastActive
      if (progressData.stages) {
        for (const [stageName, stageData] of Object.entries(progressData.stages)) {
          if (stageData.lastActive || stageData.startedAt) {
            const t = stageData.lastActive || stageData.startedAt
            if (!lastActive || new Date(t) > new Date(lastActive)) lastActive = t
          }
        }
      }
    } catch (err) {
      // Progress file exists but couldn't be parsed
    }
  }

  // List all spec files
  const specsDir = join(sillyspecDir, 'specs')
  if (existsSync(specsDir)) {
    try {
      const specFiles = readdirSync(specsDir)
        .filter(f => f.endsWith('.md'))
        .sort()

      specs = specFiles.map(f => {
        const specPath = join(specsDir, f)
        try {
          const content = readFileSync(specPath, 'utf-8')
          const titleMatch = content.match(/^#\s+(.+)$/m)
          return {
            name: f,
            title: titleMatch ? titleMatch[1] : f,
            path: specPath
          }
        } catch {
          return { name: f, title: f, path: specPath }
        }
      })
    } catch (err) {
      // Specs directory couldn't be read
    }
  }

  return {
    currentStage,
    nextStep,
    progress,
    stages,
    specs,
    lastActive
  }
}

/**
 * Parse spec file content
 * @param {string} specPath - Path to the spec file
 * @returns {object} Parsed spec with title, sections, and metadata
 */
export function parseSpecFile(specPath) {
  if (!existsSync(specPath)) {
    return null
  }

  try {
    const content = readFileSync(specPath, 'utf-8')
    const lines = content.split('\n')

    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : 'Unknown'

    const sections = []
    let currentSection = null
    let currentContent = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{2,4})\s+(.+)$/)

      if (headingMatch) {
        if (currentSection) {
          sections.push({
            level: currentSection.level,
            title: currentSection.title,
            content: currentContent.join('\n').trim()
          })
        }
        currentSection = { level: headingMatch[1].length, title: headingMatch[2] }
        currentContent = []
      } else if (currentSection) {
        currentContent.push(line)
      }
    }

    if (currentSection) {
      sections.push({
        level: currentSection.level,
        title: currentSection.title,
        content: currentContent.join('\n').trim()
      })
    }

    return { title, sections, content }
  } catch (err) {
    return null
  }
}
