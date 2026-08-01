/**
 * run/scan-profile.js（W6 Step2 从 run.js 抽出）。
 *
 * scan profile 数据生成 + quick scan CLI preflight/postcheck（自洽，不依赖 run.js 闭包）。
 * 安全锚：run.js 始终 barrel，本模块函数 run.js import 回来；无 test 直接 import，无需 re-export。
 *
 * 路径修正（相对 src/run/）：
 *   - executeScanPostcheck 的 scan-postcheck.js 动态 import './scan-postcheck.js' → '../scan-postcheck.js'
 *   - executeScanPostcheck 原冗余动态 import('fs'/'path'/'child_process') 删除，改顶部静态（execSync 实际未直接用，纯遗留）
 */
import { join, basename, extname } from 'node:path'
import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { safeGit } from './shared.js'

/**
 * 估算源码规模（文件数 + 字节数）—— 跨平台 Node 遍历，替代 Unix `find`（原生 Windows 无 find，
 * 原 find 失效会让所有 Windows 项目永远 fallback 到 standard profile）。
 * 扩展名限定源码后缀；skipDirs 排除依赖/构建产物/覆盖率等非源码目录；maxFiles 封顶避免超大仓库遍历过久
 * （超限时 fileCount 已远超 quick/standard 阈值，不影响 profile 判定）；maxDepth 兜底防极深嵌套产物。
 */
export function estimateSourceSize(cwd, maxFiles = 5000, maxDepth = 6) {
  const sourceExts = new Set(['.js','.ts','.tsx','.py','.java','.go','.rs','.rb','.php','.c','.cpp','.h','.jsx','.vue','.svelte'])
  // skipDirs：排除依赖、版本控制、构建产物、覆盖率、临时目录等非源码目录。
  // 原清单只排了 node_modules/.git/dist/build 等，漏了 .next/.nuxt/coverage/.svelte-kit 等构建产物，
  // 导致带构建产物的小项目被产物里的海量 .js 拉高 fileCount/sourceBytes → 误判 deep。
  const skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', 'target',
    '__pycache__', '.venv', 'venv',
    '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.turbo', '.parcel-cache',
    'coverage', '.nyc_output', '.vitest', '.cache',
    'vendor', 'bower_components',
    'dist-types',
    '.sillyspec', '.claude',
    'tmp', 'temp', '.tmp', 'logs',
  ])
  let fileCount = 0
  let sourceBytes = 0
  // stack 存 [dir, depth]：maxDepth 兜底，防极深嵌套的产物/生成目录在 skipDirs 漏网时被全遍历。
  const stack = [[cwd, 0]]
  while (stack.length) {
    const [dir, depth] = stack.pop()
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) }
    catch { continue }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name) && depth < maxDepth) stack.push([join(dir, e.name), depth + 1])
      } else if (e.isFile() && sourceExts.has(extname(e.name))) {
        fileCount++
        try { sourceBytes += statSync(join(dir, e.name)).size } catch {}
        if (fileCount >= maxFiles) return { fileCount, sourceBytes }
      }
    }
  }
  return { fileCount, sourceBytes }
}

/**
 * 根据 project 规模计算 scan profile
 * quick:   fileCount≤30 && sourceBytes≤80KB && projectCount≤3 → 3 步，0 子代理，5 份文档
 * standard: fileCount≤200 && sourceBytes≤800KB → 压缩步骤，最多 1 子代理
 * deep:    大项目或 --deep → 完整流程
 */
export function computeScanProfile(cwd, platformOpts) {
  // 显式 profile flag 优先于自动判定（三档互斥由 command.js 检测；此处取首个命中即可）
  const flags = process.argv.slice(2)
  if (flags.includes('--quick')) {
    return { mode: 'quick', reason: '用户指定 --quick', maxAgentCalls: 0, maxDocs: 5 }
  }
  if (flags.includes('--standard')) {
    return { mode: 'standard', reason: '用户指定 --standard', maxAgentCalls: 1, maxDocs: 8 }
  }
  if (flags.includes('--deep')) {
    return { mode: 'deep', reason: '用户指定 --deep', maxAgentCalls: 4, maxDocs: 99 }
  }

  const specDir = platformOpts?.specRoot || join(cwd, '.sillyspec')
  const projectsDir = join(specDir, 'projects')
  let projectCount = 1
  try {
    if (existsSync(projectsDir)) {
      projectCount = readdirSync(projectsDir).filter(f => f.endsWith('.yaml')).length
    }
  } catch {}

  // 快速估算源码规模（Node 遍历，跨平台；原 Unix find 在原生 Windows 上失效会永远 fallback standard）
  let fileCount = 0
  let sourceBytes = 0
  try {
    const est = estimateSourceSize(cwd)
    fileCount = est.fileCount
    sourceBytes = est.sourceBytes
  } catch {
    // 遍历异常时假设中等规模
    return { mode: 'standard', reason: '无法估算项目规模', maxAgentCalls: 1, maxDocs: 8 }
  }

  if (fileCount <= 30 && sourceBytes <= 80_000 && projectCount <= 3) {
    return { mode: 'quick', reason: `${fileCount} 源文件, ${Math.round(sourceBytes / 1024)}KB`, maxAgentCalls: 0, maxDocs: 5, _fileCount: fileCount, _sourceBytes: sourceBytes, _projectCount: projectCount }
  }
  if (fileCount <= 200 && sourceBytes <= 800_000) {
    return { mode: 'standard', reason: `${fileCount} 源文件, ${Math.round(sourceBytes / 1024)}KB`, maxAgentCalls: 1, maxDocs: 8, _fileCount: fileCount, _sourceBytes: sourceBytes, _projectCount: projectCount }
  }
  return { mode: 'deep', reason: `${fileCount} 源文件, ${Math.round(sourceBytes / 1024)}KB`, maxAgentCalls: 4, maxDocs: 99, _fileCount: fileCount, _sourceBytes: sourceBytes, _projectCount: projectCount }
}

/**
 * 根据 scanProfile 裁剪步骤
 * quick:   3 步 — CLI preflight / AI generate / CLI postcheck
 * standard: 跳过续扫检测(4), 跳过可选步骤(9)
 */
export function applyScanProfileSteps(stageData, profile, cwd, platformOpts) {
  const steps = stageData.steps
  const mode = profile.mode

  if (mode === 'quick') {
    const specBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const projectName = basename(cwd)
    const docsRoot = join(specBase, 'docs', projectName)

    // Step 1: CLI preflight（不调 AI，自动完成）
    const step1 = {
      name: '项目概览（自动探测）',
      status: 'pending',
      noAI: true,
      _cliAction: 'scanPreflight',
      prompt: '',
      outputHint: 'preflight 结果',
      optional: false
    }
    // Step 2: AI 生成核心文档（唯一 AI roundtrip）
    const step2 = {
      name: '生成核心文档',
      status: 'pending',
      prompt: `## Quick Scan — 核心文档生成

当前为 quick profile（小项目自动判定 或 用户显式 --quick），一次性生成核心文档用于快速接入。

### 操作
1. 读取项目结构和关键文件（package.json / pyproject.toml / README / 入口文件）
2. 生成以下 4 份文档并写入 \`{DOCS_ROOT}/scan/\`：
   - **PROJECT.md** — 项目简介、技术栈、模块划分
   - **ARCHITECTURE.md** — 架构概览、模块关系、技术决策
   - **CONVENTIONS.md** — 代码风格、框架隐形规则
   - **STRUCTURE.md** — 目录树 + 模块说明
3. 如发现子项目，注册到 \`{PROJECTS_ROOT}/\` 下

每份文档 frontmatter 必须包含：\`author\`、\`created_at\`、\`scan_depth: quick\`（标记快速接入的浅层版本；后续深度扫描 --deep 会识别此标记并覆盖升级为完整文档）。

### ⛔ 硬约束
- **严禁使用子代理（Agent/Task 工具）。** 所有文档在一个 turn 内完成。
- 不要搜索 .sillyspec/ .claude/ .git/ node_modules/ dist/ build/
- --output 只需要列出生成的文件名，不要写长篇总结

### 输出
生成的文件列表`,
      outputHint: '文件列表',
      optional: false
    }
    // Step 3: CLI postcheck（不调 AI，自动完成）
    const selfCheck = steps.find(s => s.name === '自检和提交') || {
      name: '自检和提交', status: 'pending', prompt: '', outputHint: '结果', optional: false
    }
    const step3 = { ...selfCheck, status: 'pending', noAI: true, _cliAction: 'scanPostcheck', prompt: '' }
    stageData.steps = [step1, step2, step3]
    return
  }

  if (mode === 'standard') {
    // 跳过 Step 4（断点续扫检测），跳过 Step 9（flows+glossary，可选）
    const skipNames = ['断点续扫检测', '生成业务流程和术语表（可选）']
    for (const step of stageData.steps) {
      if (skipNames.includes(step.name) && step.status === 'pending') {
        step.status = 'skipped'
        step.skippedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      }
    }
  }
}

/**
 * CLI-only: quick scan preflight
 * 收集项目快照，打印 summary，不调 AI
 */
export async function executeScanPreflight(cwd, platformOpts, scanProfile) {
  const specBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
  const projectName = basename(cwd)
  console.log(`  📁 项目: ${projectName}`)
  console.log(`  📊 Profile: ${scanProfile.mode} (${scanProfile.reason})`)
  // 快速列出顶层结构（readdirSync 跨平台，避免 spawn shell + 5 个 grep 进程）
  try {
    const skip = new Set(['node_modules', '.git', '.sillyspec', '.claude'])
    const dirNames = readdirSync(cwd, { withFileTypes: true })
      .filter(d => d.isDirectory() && !skip.has(d.name) && !d.name.startsWith('.'))
      .slice(0, 20)
      .map(d => d.name)
    if (dirNames.length) {
      console.log(`  📂 目录: ${dirNames.join(', ')}`)
    }
  } catch {}
  console.log(`  ✅ Preflight 完成，准备生成核心文档\n`)
}

/**
 * CLI-only: quick scan postcheck
 * 执行文件存在性 + manifest 检查，不调 AI
 */
export async function executeScanPostcheck(cwd, platformOpts, scanProfile) {
  // scan-postcheck.js 在 src/，本模块在 src/run/ → 退一层（真环依赖，保留动态 import）
  const { runScanPostCheck, printScanPostCheckResult } = await import('../scan-postcheck.js')
  const specDir = platformOpts?.specRoot || null
  const result = runScanPostCheck({
    cwd,
    specDir,
    scanMeta: {
      projectListParsed: true,
      manifestWritten: undefined,
    },
  })
  printScanPostCheckResult(result)
  // 写 manifest（如果还没写）
  if (platformOpts?.specRoot) {
    try {
      const manifestDir = platformOpts.specRoot
      let sourceCommit = null
      let sourceCommitError = null
      try {
        const gitResult = safeGit(cwd, ['rev-parse', 'HEAD'])
        sourceCommit = gitResult.value
        sourceCommitError = gitResult.error
      } catch (e) {
        sourceCommitError = e.message
      }
      mkdirSync(manifestDir, { recursive: true })
      const manifest = {
        scan_profile: {
          mode: scanProfile.mode,
          file_count: scanProfile._fileCount || 0,
          source_bytes: scanProfile._sourceBytes || 0,
          project_count: scanProfile._projectCount || 0,
          reason: scanProfile.reason,
        },
        workspace_id: platformOpts.workspaceId || null,
        scan_run_id: platformOpts.scanRunId || null,
        source_commit: sourceCommit,
        source_commit_error: sourceCommit === null ? (sourceCommitError || 'unknown') : undefined,
        generated_at: new Date().toISOString(),
        schema_version: 2,
      }
      const manifestPath = join(manifestDir, 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`  📄 manifest.json 已写入: ${manifestPath}`)
    } catch (e) {
      console.warn(`  ⚠️ manifest 写入失败: ${e.message}`)
    }
  }
}
