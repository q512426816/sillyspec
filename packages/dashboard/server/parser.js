import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Parse docs tree for a project
 * @param {string} projectPath - Path to the project directory
 * @returns {object} Docs tree grouped by type
 */
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
          key: group.key,
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

  let currentStage = 'unknown'
  let nextStep = null
  let progress = { stages: {} }
  let stages = []
  let specs = []
  let lastActive = null

  // Read STATE.md for current stage and next step
  const statePath = join(sillyspecDir, 'STATE.md')
  if (existsSync(statePath)) {
    try {
      const stateContent = readFileSync(statePath, 'utf-8')
      const stageMatch = stateContent.match(/当前阶段[：:]\s*(\w+)/) || stateContent.match(/current_stage:\s*(\w+)/i)
      const stepMatch = stateContent.match(/下一步[：:]\s*(.+)/) || stateContent.match(/next_step:\s*(.+)/i)

      if (stageMatch) currentStage = stageMatch[1]
      if (stepMatch) nextStep = stepMatch[1].trim()
    } catch (err) {
      // State file exists but couldn't be read
    }
  }

  // Read progress.json from .runtime directory
  const progressPath = join(sillyspecDir, '.runtime', 'progress.json')
  if (existsSync(progressPath)) {
    try {
      const progressContent = readFileSync(progressPath, 'utf-8')
      progress = JSON.parse(progressContent)
      stages = Object.keys(progress.stages || {})

      // Find last active stage
      if (progress.stages) {
        for (const [stageName, stageData] of Object.entries(progress.stages)) {
          if (stageData.lastActive) {
            if (!lastActive || new Date(stageData.lastActive) > new Date(lastActive)) {
              lastActive = stageData.lastActive
            }
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
