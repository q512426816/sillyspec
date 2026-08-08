/**
 * run/complete-handlers.js（W6 Step5 从 run.js 抽出）。
 *
 * completeStep 的子 handler + archive 收尾（自洽叶子模块，仅被 completeStep 调用）：
 *   - handleArchiveConfirmStep：archive「确认归档」步骤 --confirm 门控 + 推荐文档校验
 *   - handlePlanGeneratePlanStep：plan「generate_plan」完成后动态插入 coordinator + postcheck 步骤
 *   - handleScanProjectListStep：scan step 2 完成后按项目展开 perProject 步骤（用 sanitizeProjectName/validateParsedProjects）
 *   - archiveChangeDirectory：归档移动变更目录（6 处 process.exit(1) + worktree 清理；handleArchiveConfirmStep 内部调用）
 *   - sanitizeProjectName / validateParsedProjects：项目名清洗 + 列表校验纯函数（handleScanProjectListStep 专用）
 *
 * 安全锚：run.js 始终 barrel。3 handler 由 run.js import 回来；sanitizeProjectName + validateParsedProjects
 * 被 test 直接 import（run-sanitize-project-name / run-scan-project-parse），run.js barrel re-export 契约保留。
 * 4 目标 handler + archive 无 test 直接 import，无需 re-export。completeStep（Step7 搬）将把 import 行带走。
 *
 * 路径修正（相对 src/run/）：
 *   - resolveChangeDir 从 './shared.js'；renameSyncRetry 从 '../fs-atomic.js'；stageRegistry 从 '../stages/index.js'
 *   - 动态 import './stages/plan.js' / './worktree.js' → '../'（src/ 下，退一层；真环依赖保留动态）
 *   - 删除 archiveChangeDirectory 内死代码 `const { renameSync } = await import('fs')`（renameSync 解构未用，实际走 renameSyncRetry）
 *
 * archiveChangeDirectory 的 6 处 process.exit 全 exit(1)：5 个顶层 guard 直接终止；L1325 在 catch 内主动 exit
 * （非被外层吞）；process.exit 不可被 try 捕获 → 搬迁行为完全等价。
 */
import { basename, join, resolve, relative, isAbsolute } from 'node:path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, rmSync } from 'node:fs'
import { renameSyncRetry, writeAtomicSync } from '../fs-atomic.js'
import { resolveChangeDir, resolveQuickSessionsDir, safeGit, auditQuickCompletion, triggerSync, isQuickMetadata } from './shared.js'
import { stageRegistry } from '../stages/index.js'
import { SCAN_STATUS, POINTER_STATUS } from '../constants.js'
import { printQuickAuditReview } from './quick-audit.js'
import { validateQuickResult, allocateQuicklogEntry, findQuicklogEntry, completeQuicklogEntry } from '../quicklog.js'
import { getRule } from '../stage-contract-spec.js'
import { archiveDestDirName } from '../stage-contract.js'

/**
 * 清洗项目名：只保留 ASCII 字母/数字/横线/下划线/点，过滤中文和特殊字符。
 * - 必须含至少一个字母（拒绝纯数字 "0"/"7"/"07"，避免 scan-projects.json 脏数据）
 * - 长度必须 ≥ 2（拒绝单字符 "a"/"0"）
 * @param {string} name - 原始项目名候选
 * @returns {string | null} 合法项目名或 null（拒绝）
 */
export function sanitizeProjectName(name) {
  if (!name) return null
  const clean = String(name).replace(/[^a-zA-Z0-9_\-.]/g, '').trim()
  if (!clean) return null
  if (!/[a-zA-Z]/.test(clean)) return null    // 纯数字/符号拒绝（"0"/"7"/"07"）
  if (clean.length < 2) return null           // 单字符拒绝（"a"/"0"）
  return clean
}
/**
 * 校验从 step 2 解析出的项目列表。
 * 不通过则不落盘 projects/*.yaml、不展开 perProject 步骤。
 *
 * @param {Array<{id: string, path?: string}>} projects - 项目列表（含可选 path）
 * @param {string} sourceRoot - 源码根目录，用于 path 安全校验
 */
export function validateParsedProjects(projects, sourceRoot) {
  const errors = []
  if (!projects || projects.length === 0) {
    return { ok: false, errors: ['项目列表为空'] }
  }
  if (projects.length > 10) {
    return { ok: false, errors: [`项目数量 ${projects.length} 超过上限 10，疑似误解析`] }
  }
  const safeRoot = resolve(sourceRoot)
  const seen = new Set()
  for (const proj of projects) {
    const id = proj.id || proj
    if (seen.has(id)) {
      errors.push(`重复项目名: ${id}`)
    }
    seen.add(id)
    // slug 合法性：只允许 a-z 0-9 _ - .，长度 2-64
    if (!/^[a-zA-Z][\w\-.]{1,63}$/.test(id)) {
      errors.push(`项目名 "${id}" 不合法（需 slug 格式：字母开头，只含 a-zA-Z0-9_-., 长度 2-64）`)
    }
    // path 安全校验（如果提供了 path）
    if (proj.path) {
      if (proj.path.includes('..')) {
        errors.push(`项目 "${id}" 的 path 包含 .. ，拒绝越界`)
      } else {
        const absPath = resolve(safeRoot, proj.path)
        const rel = relative(safeRoot, absPath)
        if (rel.startsWith('..') || isAbsolute(rel)) {
          errors.push(`项目 "${id}" 的 path "${proj.path}" 解析后超出 source_root`)
        }
        if (!existsSync(absPath)) {
          errors.push(`项目 "${id}" 的 path "${proj.path}" 不存在`)
        }
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, errors: [] }
}
async function archiveChangeDirectory(pm, cwd, progress, specBase) {
  const archiveChangeName = progress.currentChange
  if (!archiveChangeName) {
    console.error('❌ 归档失败：未找到当前变更名（currentChange）')
    process.exit(1)
  }
  const changesDir = join(specBase, 'changes')
  const archiveDir = join(changesDir, 'archive')
  const srcDir = join(changesDir, archiveChangeName)
  const date = new Date().toISOString().slice(0, 10)
  const destName = archiveDestDirName(date, archiveChangeName)
  const destDir = join(archiveDir, destName)

  if (!existsSync(srcDir)) {
    console.error(`❌ 归档失败：源目录不存在 ${srcDir}`)
    process.exit(1)
  }
  // 移动前硬校验：变更包必须含 plan.md，否则不该归档。
  // 在移动前阻断（而非移动后），目录尚未动，用户可直接修复后重试。
  if (!existsSync(join(srcDir, 'plan.md'))) {
    console.error(`❌ 归档失败：变更目录缺少 plan.md（${srcDir}）`)
    console.error(`   plan.md 是归档的必需产物。请先补全 plan 阶段产出再归档。`)
    process.exit(1)
  }
  if (existsSync(destDir)) {
    console.error(`❌ 归档失败：目标目录已存在 ${destDir}`)
    process.exit(1)
  }
  mkdirSync(archiveDir, { recursive: true })
  try {
    renameSyncRetry(srcDir, destDir)
  } catch (e) {
    console.error(`❌ 归档失败：移动变更目录时出错（${e.message}）`)
    console.error(`   常见原因：变更目录内文件被 IDE / 杀毒 / 索引占用，已重试 5 次仍失败。请关闭相关程序后重试。`)
    process.exit(1)
  }

  if (!existsSync(destDir) || existsSync(srcDir)) {
    console.error('❌ 归档校验失败：移动操作异常')
    process.exit(1)
  }

  await pm.unregisterChange(cwd, archiveChangeName)

  // CLI 下沉 git add（坑4，FR-04）：确定性暂存归档目录 + 模块文档，不靠 step5 prompt 驱动。
  // step5 prompt 的 git add 保留作幂等兜底；POSIX 路径跨平台（git 接受正斜杠）。
  // safeGit 内部已 try-catch（返回 {value,error} 不抛），外层 try 兜底防御；失败不阻断归档
  // （目录已移动 + change 已注销），由 step5 prompt git add + agent git status 核对兜底。
  try {
    safeGit(cwd, ['add', '--', '.sillyspec/changes/archive/'])
    safeGit(cwd, ['add', '--', '.sillyspec/docs/'])
  } catch {}

  // 归档时清理可能残留的 worktree（execute 自动清理未走到 / 有未 apply 变更被遗弃）。
  // 安全策略：有未 apply 变更时保留 worktree 并警告，避免误删用户未应用的代码。
  try {
    const { WorktreeManager } = await import('../worktree.js')
    const wm = new WorktreeManager({ cwd })
    const meta = wm.getMeta(archiveChangeName)
    if (meta) {
      const check = meta.mode !== 'in-place-fallback' ? wm.hasUnappliedChanges(archiveChangeName) : { hasChanges: false }
      if (check.hasChanges) {
        console.warn(`⚠️  归档时 worktree 仍有 ${check.changedFiles.length} 个未 apply 变更，保留 worktree`)
        console.warn(`   确认不需要后手动清理: sillyspec worktree cleanup ${archiveChangeName} --force`)
      } else {
        const cleanResult = wm.cleanup(archiveChangeName)
        if (cleanResult.residual?.length > 0) {
          console.warn(`⚠️  归档 worktree 清理残留: ${cleanResult.residual.join('; ')}`)
          console.warn(`   手动处理: sillyspec worktree cleanup ${archiveChangeName} --force`)
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️  归档 worktree 清理失败（不阻断归档）: ${e.message}`)
  }

  console.log(`📦 已归档：${archiveChangeName} → archive/${destName}/`)
  return destDir
}
/**
 * archive 阶段「确认归档」步骤的收尾处理器（从 completeStep 抽出，行为保持）。
 *
 * 两件事：
 *   1. --confirm 门控：缺 --confirm → 回退 step 状态、提示、返回 early-return 对象（completeStep 透传）
 *   2. --confirm 通过 → archiveChangeDirectory 移动变更目录 + 推荐文档（design.md / module-impact.md）校验
 *      （contracts.archive.validators 为空，两个 validator 生效窗口互斥；plan.md 已在移动前硬校验阻断）
 *
 * @returns {{stageCompleted:false,currentIdx,nextPendingIdx:number}|null}
 */
export async function handleArchiveConfirmStep({ stageName, steps, currentIdx, confirm, outputText, pm, cwd, progress, changeName, specBase }) {
  if (stageName !== 'archive' || steps[currentIdx]?.name !== '确认归档') return null
  if (!confirm) {
    steps[currentIdx].status = 'pending'
    steps[currentIdx].completedAt = null
    if (outputText) steps[currentIdx].output = null
    await pm._write(cwd, progress, changeName)
    console.log('⚠️  请添加 --confirm 确认归档，例如：sillyspec run archive --done --confirm --output "确认归档"')
    return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
  }
  const archivedDir = await archiveChangeDirectory(pm, cwd, progress, specBase)
  if (archivedDir && existsSync(archivedDir)) {
    const recommendedDocs = ['design.md', 'module-impact.md']
    const missingRecommended = recommendedDocs.filter(d => !existsSync(join(archivedDir, d)))
    if (missingRecommended.length > 0) {
      console.warn(`\n⚠️ 归档校验警告：归档目录缺少推荐文档`)
      for (const d of missingRecommended) console.warn(`   - ${d}（${archivedDir}）`)
    } else {
      console.log(`\n✅ 归档校验通过：核心文档齐全`)
    }
  }
  return null
}
/**
 * plan 阶段「generate_plan」步骤完成后，动态插入任务蓝图（coordinator）+ postcheck 步骤
 * （从 completeStep 抽出，行为保持）。使用稳定 id 匹配，不依赖中文标题。
 *
 * plan.md 已含任务时，buildPlanSteps 返回 [fixedPrefix(classify/generate_plan/review_plan),
 * coordinator, postcheck]；本函数把 generate_plan 之后的 coordinator+postcheck 插到当前步后。
 */
export async function handlePlanGeneratePlanStep({ stageName, steps, currentIdx, defStepsForCurrent, cwd, progress }) {
  if (stageName !== 'plan') return
  const currentStepDef = defStepsForCurrent?.[currentIdx]
  const currentStepEntry = steps[currentIdx]
  const stepId = currentStepDef?.id || currentStepEntry?.id || currentStepEntry?._stepId
  if (stepId !== 'generate_plan') return
  const changeDir = resolveChangeDir(cwd, progress)
  if (!changeDir) return
  const planFile = join(changeDir, 'plan.md')
  if (!existsSync(planFile)) return
  const planContent = readFileSync(planFile, 'utf8')
  const { buildPlanSteps, fixedPrefix, fixedSuffix } = await import('../stages/plan.js')
  const fullSteps = buildPlanSteps(changeDir, planContent)
  const prefixLen = fixedPrefix.length
  const suffixLen = fixedSuffix.length
  // 新结构：[...fixedPrefix, coordinatorStep?, postcheckStep?]；fixedSuffix 为空，coordinator+postcheck 都在 prefix 之后
  const coordinatorSteps = fullSteps.slice(prefixLen, suffixLen > 0 ? -suffixLen : undefined)
  if (coordinatorSteps.length === 0) return
  for (let i = 0; i < coordinatorSteps.length; i++) {
    const stepDef = coordinatorSteps[i]
    const stepEntry = {
      id: stepDef.id,
      name: stepDef.name,
      status: 'pending',
      prompt: stepDef.prompt || '',
      outputHint: stepDef.outputHint,
      optional: stepDef.optional
    }
    // 传递 noAI / _cliAction 属性
    if (stepDef.noAI) stepEntry.noAI = true
    if (stepDef._cliAction) stepEntry._cliAction = stepDef._cliAction
    steps.splice(currentIdx + 1 + i, 0, stepEntry)
  }
  console.log(`  📝 已动态插入 ${coordinatorSteps.length} 个步骤（${coordinatorSteps.map(s => s.name).join(', ')}）`)
}
/**
 * scan 阶段 step 2「构建扫描项目列表」完成后，按项目展开 perProject 步骤（从 completeStep 抽出，行为保持）。
 *
 * 只接受结构化输出（scan_projects YAML block 或 BEGIN_PROJECT_LIST 标记块），校验通过后
 * 自动注册 projects/<id>.yaml + 写 scan-projects.json + 把 perProject 步骤按项目展开。
 * 不展开 completeStep 提前 return（失败只记 validationError，由 completeStep 继续推进下一步）。
 */
export async function handleScanProjectListStep({ stageName, steps, currentIdx, outputText, stageData, specBase, cwd, platformOpts }) {
  if (stageName !== 'scan' || steps[currentIdx]?.name !== '构建扫描项目列表') return
  // 解析项目列表：只接受结构化输出（YAML block 或 BEGIN_PROJECT_LIST 标记）
  // 不再从自由文本猜测项目名——自由文本列表的误解析会导致垃圾项目落盘
  let parsedProjects = [] // Array<{id, path?}>
  let parsedFromStructuredOutput = false
  if (outputText) {
    // 格式 A: YAML block — 匹配 scan_projects: 下所有 - id: xxx 条目（含多行属性）
    const yamlBlock = outputText.match(/scan_projects:\s*\n([\s\S]+?)(?=$|\n[^\s])/)
    if (yamlBlock) {
      const entries = [...yamlBlock[1].matchAll(/-\s+id:\s*(\S+)(?:[\s\S]*?)(?=\n\s+-\s+id:|$)/g)]
      for (const m of entries) {
        const id = sanitizeProjectName(m[1])
        if (!id) continue
        // 提取可选 path 字段
        const pathMatch = m[0].match(/path:\s*(\S+)/)
        const entry = pathMatch ? { id, path: pathMatch[1].trim() } : { id }
        parsedProjects.push(entry)
      }
      parsedFromStructuredOutput = parsedProjects.length > 0
    }
    // 格式 B: BEGIN_PROJECT_LIST ... END_PROJECT_LIST 标记块
    if (!parsedFromStructuredOutput) {
      const blockMatch = outputText.match(/BEGIN_PROJECT_LIST\s*\n([\s\S]*?)\n*END_PROJECT_LIST/)
      if (blockMatch) {
        const raw = [...blockMatch[1].matchAll(/^-\s+(\S+)/gm)].map(m => m[1])
        parsedProjects = raw.map(s => sanitizeProjectName(s)).filter(Boolean).map(id => ({ id }))
        parsedFromStructuredOutput = parsedProjects.length > 0
      }
    }
  }

  const projectNames = parsedProjects.map(p => p.id)

  if (parsedFromStructuredOutput) {
    stageData.scanMeta = stageData.scanMeta || {}
    stageData.scanMeta.projectListParsed = true
  } else {
    // 结构化输出未解析到 → 回退读取已有 projects/*.yaml
    // 读取时也校验：path 不存在的 yaml 视为垃圾，直接跳过
    console.warn('⚠️  step 2 未输出结构化项目列表，回退扫描已注册项目')
    stageData.scanMeta = stageData.scanMeta || {}
    stageData.scanMeta.projectListParsed = false
    const projectsDir = join(specBase, 'projects')
    if (existsSync(projectsDir)) {
      const yamlFiles = readdirSync(projectsDir).filter(f => f.endsWith('.yaml'))
      const fallbackProjects = []
      const fallbackSkipped = []
      for (const yf of yamlFiles) {
        const pName = yf.replace(/\.yaml$/, '')
        const yamlContent = readFileSync(join(projectsDir, yf), 'utf8')
        const pathMatch = yamlContent.match(/^path:\s*(.+)/m)
        const pPath = pathMatch ? pathMatch[1].trim() : pName
        // 校验 path 是否存在且在 source_root 内
        const absPath = resolve(cwd, pPath)
        if (pPath.includes('..') || (!absPath.startsWith(resolve(cwd)) && absPath !== resolve(cwd))) {
          fallbackSkipped.push(`${pName} (path 越界: ${pPath})`)
          continue
        }
        if (!existsSync(absPath)) {
          fallbackSkipped.push(`${pName} (path 不存在: ${pPath})`)
          continue
        }
        fallbackProjects.push({ id: pName, path: pPath })
      }
      if (fallbackSkipped.length > 0) {
        console.warn(`⚠️  跳过 ${fallbackSkipped.length} 个垃圾/过期项目配置：${fallbackSkipped.join(', ')}`)
        console.warn('   建议清理 projects/ 下的无效 yaml 文件')
      }
      parsedProjects = fallbackProjects
      projectNames.length = 0
      projectNames.push(...fallbackProjects.map(p => p.id))
    }
    if (parsedProjects.length === 0) {
      // 无结构化输出 + 无合法已有项目 → step 2 失败
      console.error('❌ step 2 未输出结构化项目列表，且 projects/ 下无合法项目配置')
      console.error('   请在 --output 中输出 scan_projects YAML block 或 BEGIN_PROJECT_LIST 标记块')
      steps[currentIdx].validationError = '未输出结构化项目列表且无合法 fallback'
      // 不展开 perProject 步骤，直接跳到下一步
    }
  }

  // 校验解析出的项目列表（原子守卫：不通过就不落盘）
  const validation = validateParsedProjects(parsedProjects, cwd)
  if (!validation.ok) {
    console.error(`❌ 项目列表校验失败: ${validation.errors.join('; ')}`)
    console.error('   step 2 完成，但不展开 perProject 步骤。请检查 --output 中的项目列表。')
    steps[currentIdx].validationError = validation.errors.join('; ')
  }

  // 自动注册 + 保存 runtime + 展开 perProject 步骤（仅在校验通过时）
  const projectsDir = join(specBase, 'projects')
  if (validation.ok) {
    for (const proj of parsedProjects) {
      const pName = proj.id
      const projYaml = join(projectsDir, `${pName}.yaml`)
      if (!existsSync(projYaml)) {
        mkdirSync(projectsDir, { recursive: true })
        const candidates = [
          join(cwd, pName),
          join(cwd, 'backend', pName),
          join(cwd, 'packages', pName),
          join(cwd, 'apps', pName),
          join(cwd, 'services', pName),
        ]
        const detected = candidates.find(c => existsSync(c))
        const regPath = detected || join(cwd, pName)
        writeFileSync(projYaml, `name: ${pName}\npath: ${regPath}\nstatus: active\n`)
        console.log(`  📝 自动注册子项目: ${pName} → ${regPath}`)
      }
    }

    // 保存 runtime 状态
    const scanStatePath = join(specBase, '.runtime', 'scan-projects.json')
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
    let scanState = { projects: projectNames, expanded: false }
    if (existsSync(scanStatePath)) {
      try { scanState = JSON.parse(readFileSync(scanStatePath, 'utf8')) } catch {}
    }

    // 收集当前步骤之后所有 perProject 步骤
    const stageDef = stageRegistry[stageName]
    const allSteps = stageDef?.steps || []
    const perProjectSteps = allSteps.filter(s => s.perProject)

    // 防重复展开
    const alreadyExpanded = scanState.expanded || steps.some(s => s.name?.match(/\[.+\]\s*$/))
    if (!alreadyExpanded && perProjectSteps.length > 0) {
    // 找到当前步骤（step 2）在动态 steps 中的位置
    const insertBase = currentIdx + 1
    let insertPos = insertBase
    for (const pName of projectNames) {
      // 读取项目配置获取 projectRoot
      const projYaml = join(specBase, 'projects', `${pName}.yaml`)
      let projectRoot = '.'
      if (existsSync(projYaml)) {
        const yamlContent = readFileSync(projYaml, 'utf8')
        const pathMatch = yamlContent.match(/^path:\s*(.+)/m)
        if (pathMatch) projectRoot = pathMatch[1].trim()
      }
      const docOutputDir = platformOpts.specRoot ? `${specBase}/docs/${pName}` : `.sillyspec/docs/${pName}`
      const contextPrefix = `\n---\n## 当前项目\n- **项目名**: ${pName}\n- **项目路径**: ${projectRoot}\n- **文档输出**: ${docOutputDir}\n\n⚠️ 本步骤只处理上面这个项目，不要处理其他项目。\n---\n\n`

      for (const ppStep of perProjectSteps) {
        steps.splice(insertPos, 0, {
          name: `${ppStep.name} [${pName}]`,
          project: pName,
          status: 'pending',
          prompt: contextPrefix + ppStep.prompt,
          outputHint: ppStep.outputHint,
          optional: ppStep.optional
        })
        insertPos++
      }
    }
    // 移除原始的 perProject 步骤（未展开的版本）
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].perProject && !steps[i].name?.includes('[')) {
        steps.splice(i, 1)
      }
    }
    console.log(`  📝 已按项目展开 ${perProjectSteps.length} 个步骤 × ${projectNames.length} 个项目 = ${perProjectSteps.length * projectNames.length} 个项目步骤`)
    console.log(`  📁 扫描项目：${projectNames.join(', ')}`)
    // 标记已展开，防止 resume 重复插入
    scanState.expanded = true
    writeFileSync(scanStatePath, JSON.stringify(scanState))
  } // end !alreadyExpanded
  } // end validation.ok
}
/**
 * Workflow post_check（W6 Step6 从 completeStep 内联块抽出）：
 *   - scan「深度扫描」完成 → 跑 scan-docs workflow postcheck，失败阻断推进（early-return）
 *   - archive「extract-module-impact」完成 → 跑 archive-impact workflow postcheck（impact-analyzer 结果）
 * 返回 early-return 对象（{stageCompleted:false,...}）由 completeStep 透传；null = 放行。
 *
 * ctx 字段：stageName/steps/currentIdx/cwd/specBase/progress/platformOpts/changeName（completeStep 局部）。
 * 辅助函数直接 import：basename/join/existsSync/readdirSync（顶部静态）；loadWorkflow/runPostCheck/
 * formatCheckReport/saveWorkflowRun 动态 import ../workflow.js（真环依赖保留动态）。
 *
 *搬迁清理：删除死代码 `typeof change !== 'undefined'`（completeStep 作用域无 change 变量，恒 null）。
 */
export async function handleWorkflowPostCheck({ stageName, steps, currentIdx, cwd, specBase, progress, platformOpts, changeName }) {
  // Workflow post_check：scan 深度扫描完成后自动检查产物
  if (stageName === 'scan' && steps[currentIdx]?.name?.includes('深度扫描')) {
    try {
      const { loadWorkflow, runPostCheck, formatCheckReport, saveWorkflowRun } = await import('../workflow.js')
      const wf = loadWorkflow(cwd, 'scan-docs')
      if (wf) {
        // 确定当前项目（优先级链）：
        //   progress.project (dbProjectName，平台模式真实项目名，与 outputStep 占位符渲染对齐)
        //   > change?.project (变更对象的项目字段，平台模式 change 创建时传入)
        //   > steps[idx].project (perProject 展开标记，兼容旧模式)
        //   > steps[idx].name 正则提取 [xxx] 后缀
        //   > null（回退检查所有项目）
        // task-05 修复：日志显示项目名变 frontend 是 perProject 误展开 bug，
        // 用 progress.project（与 outputStep 占位符渲染路径一致）修正 myaaa/frontend 分裂。
        const currentProjectName = progress.project
          || steps[currentIdx].project
          || (steps[currentIdx].name.match(/\[([^\]]+)\]\s*$/) || [])[1]
          || null

        // 确定要检查的项目列表
        let projectsToCheck = []
        if (currentProjectName) {
          // 按项目展开模式：只检查当前项目
          projectsToCheck = [currentProjectName]
        } else {
          // 兼容旧模式（未展开）：检查所有项目
          const projectsDir = join(specBase, 'projects')
          const projectFiles = existsSync(projectsDir)
            ? readdirSync(projectsDir).filter(f => f.endsWith('.yaml'))
            : []
          projectsToCheck = projectFiles.map(f => f.replace(/\.yaml$/, ''))
        }

        let anyFailed = false
        for (const pName of projectsToCheck) {
          const result = runPostCheck(wf, cwd, pName, {}, specBase)
          const report = formatCheckReport(result)
          console.log(report)
          if (result.status === 'fail') {
            anyFailed = true
            // retry_prompts 由 _checkWorkflow 自动生成
            for (const rp of (result.retry_prompts || [])) {
              console.log(`\n🔄 重试提示（项目 ${pName}）：\n`)
              console.log(rp.prompt)
            }
          }
          const saved = saveWorkflowRun(result, {
            cwd,
            source: 'run.js',
            stage: 'scan',
            step: steps[currentIdx]?.name,
            ...(platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot } : {}),
            ...(platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId } : {})
          })
          if (saved) console.log(`📁 结果已归档：${saved}`)
        }
        if (anyFailed) {
          console.log(`\n⚠️ 存在检查失败项，请按上面的重试提示修复后再继续。`)
          // task-07: 阻断推进（与 task-06 平台模式 scan-postcheck 失败分支 return 结构对齐）
          // scan 深度扫描产物校验未通过时，不允许 clean success / 进入下一 step，
          // 让上层走"完成但不推进"分支，--done 被拒。
          return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
        }
      }
    } catch (e) {
      console.warn(`⚠️ workflow 检查跳过：${e.message}`)
    }
  }

  // Workflow post_check：archive extract-module-impact 完成后检查产物
  if (stageName === 'archive' && steps[currentIdx]?.name?.includes('extract-module-impact')) {
    try {
      const { loadWorkflow, runPostCheck, formatCheckReport, saveWorkflowRun } = await import('../workflow.js')
      const wf = loadWorkflow(cwd, 'archive-impact')
      if (wf && changeName) {
        const raw = JSON.stringify(wf)
        const resolved = JSON.parse(raw.replace(/<change-name>/g, changeName))
        const result = runPostCheck(resolved, cwd, progress.project || basename(cwd), {}, specBase)
        // 只报告 impact-analyzer 的结果（doc-syncer 是后续步骤）
        const impactResult = (result.roles || []).find(r => r.id === 'impact-analyzer')
        if (impactResult) {
          const icon = impactResult.status === 'pass' ? '✅' : '❌'
          console.log(`${icon} module-impact.md 检查${impactResult.status === 'pass' ? '通过' : '失败'}`)
          for (const f of (result.failures || []).filter(f => f.role_id === 'impact-analyzer')) {
            console.log(`   └─ ${f}`)
          }
        }
        const saved = saveWorkflowRun(result, {
          cwd,
          source: 'run.js',
          stage: 'archive',
          step: steps[currentIdx]?.name,
          ...(platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot } : {}),
          ...(platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId } : {})
        })
        if (saved) console.log(`📁 结果已归档：${saved}`)
      }
    } catch (e) {
      console.warn(`⚠️ workflow 检查跳过：${e.message}`)
    }
  }
  return null
}
/**
 * quick 阶段完成收尾（W6 Step6b 从 completeStep 内联块抽出）：
 * 强校验 QUICKLOG 条目 + 审计（auditQuickCompletion）+ 结果摘要结构校验 + 翻状态/勾 tasks.md
 * （CLI 接管 QUICKLOG 分配/写入/收尾）。blocked → process.exit(1)（无 early-return，调用点纯 await）。
 *
 * ctx：stageName/steps/currentIdx/cwd/progress/changeName/specBase/outputText/confirm/
 * isForceBaseline/isAllowNew/platformOpts。辅助函数直接 import（safeGit/auditQuickCompletion ← shared，
 * printQuickAuditReview ← quick-audit，4 个 quicklog fns ← quicklog，unlinkSync/rmSync ← fs 静态）。
 */
export async function handleQuickStageCompletion({ stageName, steps, currentIdx, cwd, progress, changeName, specBase, outputText, confirm, isForceBaseline, isAllowNew, platformOpts, pm }) {
  // quick 收尾：强校验 QUICKLOG 条目 + 翻状态 + 勾 tasks.md（CLI 接管）
  if (stageName === 'quick') {
    // §4.6 从 session guard.json 读 guard（不依赖 progress.quickGuard）。
    // D-003@v1：progress._write 不持久化顶层 quickGuard，跨进程 --done 时读出的 progress 无 quickGuard，
    // 若仍用 if (progress.quickGuard) 驱动收尾会整体跳过，导致 .runtime/quick-sessions/<sessionId>/ 残留僵尸。
    // 改为从文件读 guard：优先 session 目录 guard.json，回退旧单文件 quick-guard.json（task-03 前兼容）。
    // sessionId == changeName == quick-<uuid8>（completeStep 作用域内 changeName 已解构自 options）。
    // session 目录经 resolveQuickSessionsDir 单一解析（multi-agent-review Q4）：与 stage.js 写入路径对齐，
    // 平台模式 runtimeRoot 与 specBase/.runtime 不同时不再读不到 guard。
    const sessionGuardFile = join(resolveQuickSessionsDir(platformOpts, specBase), changeName, 'guard.json')
    const legacyGuardFile = join(specBase, '.runtime', 'quick-guard.json')
    let guard = null
    try {
      guard = existsSync(sessionGuardFile)
        ? JSON.parse(readFileSync(sessionGuardFile, 'utf8'))
        : (existsSync(legacyGuardFile) ? JSON.parse(readFileSync(legacyGuardFile, 'utf8')) : null)
    } catch {}

    // 强校验 / 收尾：本会话必须有一条真实 QUICKLOG 条目（治「报 SAFE 但漏写」bug）。
    // guard 缺失（brownfield：新代码前启动的会话）不阻断——兜底补写一条记录，保住「完成必有记录」不变量。
    const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
    let qlId = guard?.quicklogId || null
    const linkedChanges = Array.isArray(guard?.linkedChanges) ? guard.linkedChanges : []
    // 审计结果（仅 guard 存在时填充）。提到 if(guard) 外声明，供下方回填 QUICKLOG 文件行复用
    // review.changedFiles；brownfield 无 guard 时保持 null → 文件行不回填（降级，不报错）。
    let review = null

    // 审计：仅在有 guard 时跑（brownfield 无 guard 跳过，兼容 D-003 brownfield 行为）。
    if (guard) {
      // --done 的 --force-baseline/--allow-new 并入 guard（与 step1 持久化值取或）。
      // 修复 ql-20260713-002-7628：旧代码解析了这两个 flag 但只传 {isConfirm} 给审计，
      // 致 --done --force-baseline 静默无效、用户被误导「重跑 --confirm」也无法解锁。
      const mergedGuard = {
        ...guard,
        forceBaseline: guard.forceBaseline || isForceBaseline,
        allowNew: guard.allowNew || isAllowNew,
      }
      review = await auditQuickCompletion(cwd, mergedGuard, { isConfirm: confirm })
      printQuickAuditReview(review)
      if (review.status === 'blocked') {
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
      progress.lastQuickReview = review
    }

    // 结果摘要结构校验（最后一步、isDone 且带了 --output 时）：--output 是 QUICKLOG「结果：」
    // 归档的唯一来源，要求按 需求/根因/方案/结果 模板给全（见 stages/quick.js step3 prompt）。
    // 确定性校验：只查必填字段是否齐全，不判内容质量。缺字段 → 本次不完成（回滚 step 状态 +
    // exit 1），保留「进行中」条目，agent 补全 --output 后重跑 --done 即可，不丢进度。
    // 仅 completeQuicklogEntry 会实际持久化时才校验；前两个 step 的 --done output 不入 QUICKLOG，不校验。
    if (outputText) {
      const resultCheck = validateQuickResult(outputText)
      if (!resultCheck.ok) {
        console.error('\n' + getRule('quick.result-labels').failMessage.replaceAll('${missing}', resultCheck.missing.join('、')))
        console.error(`   --output 是 QUICKLOG「结果：」归档的唯一来源，四个标签必须放在 --output 里（不是 --input）。`)
        console.error(`   补全后重跑 --done（不丢进度），直接照抄此模板：`)
        console.error(`     sillyspec run quick --done --change <changeName> --output "需求：用户/任务要什么`)
        console.error(`     根因：为什么这样改（纯新增/样式则写「无，纯新增/纯样式」）`)
        console.error(`     方案：怎么改的`)
        console.error(`     结果：验证情况（测试数 / lint / typecheck / 部署状态）"`)
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
    }

    if (!qlId) {
      // 无 ql-ID（guard 缺失或 brownfield 无 quicklogId）：补分配后立即完成，不阻断。
      try {
        const alloc = await allocateQuicklogEntry(specBase, gitUser, {
          description: guard?.taskDescription || '(补分配)',
          linkedChanges,
          allowedFiles: Array.isArray(guard?.allowedFiles) ? guard.allowedFiles : [],
        })
        qlId = alloc.qlId
        console.log(`📝 QUICKLOG 兜底补写: ${qlId}（guard 缺失/brownfield 会话）`)
      } catch (e) {
        console.error(`\n❌ QUICKLOG 补分配失败: ${e.message}`)
        steps[currentIdx].status = 'pending'
        steps[currentIdx].completedAt = null
        if (outputText) steps[currentIdx].output = null
        process.exit(1)
      }
    }
    if (!findQuicklogEntry(specBase, gitUser, qlId)) {
      console.error(`\n❌ quick 阶段完成校验失败：QUICKLOG 条目 ${qlId} 不存在。`)
      console.error(`   会话期间记录被删除或从未写入。请检查 .sillyspec/quicklog/ 后重跑 --done。`)
      steps[currentIdx].status = 'pending'
      steps[currentIdx].completedAt = null
      if (outputText) steps[currentIdx].output = null
      process.exit(1)
    }
    // 翻状态进行中→已完成 + 追加结果 + 勾选关联 tasks.md
    // resultText 不再截断：结构化结果块（需求/根因/方案/结果）完整落盘，多行写成字段化块。
    try {
      // 回填实际改动文件：review.changedFiles 含 quick 自身元数据（quicklog/.runtime/modules 等），
      // 用 isQuickMetadata 过滤掉，只留真实业务文件。brownfield 无 review → 空数组，文件行不动。
      const realFiles = Array.isArray(review?.changedFiles)
        ? review.changedFiles.filter(f => !isQuickMetadata(f, linkedChanges))
        : []
      await completeQuicklogEntry(specBase, gitUser, qlId, {
        resultText: outputText || '',
        linkedChanges,
        changedFiles: realFiles,
      })
      console.log(`📝 QUICKLOG 条目 ${qlId} 已标记完成`)
    } catch (e) {
      console.warn(`⚠️ QUICKLOG 完成态写入失败: ${e.message}`)
    }

    // 清理 session 目录（rmSync/unlinkSync 容忍不存在）。路径与写入对齐（Q4 resolveQuickSessionsDir）。
    try {
      if (changeName) {
        const sessionDir = join(resolveQuickSessionsDir(platformOpts, specBase), changeName)
        rmSync(sessionDir, { recursive: true, force: true })
      }
      if (existsSync(legacyGuardFile)) unlinkSync(legacyGuardFile)
    } catch {}

    // 注销 quick 会话注册的 changes 行（quick-<uuid8>），避免 active 行随每次 quick 单调累积污染
    // listChanges / doctor / resolveQuickLinkedChanges（multi-agent-review Q1）。quick 是收尾型会话，
    // 不走 archive，旧代码从不调 unregisterChange → DB 里 active 的 quick-<hex> 行只增不减。
    // 仅对 quick-<8hex> sessionId 注销——非 sessionId 形态的变更名是旧兼容路径/真实关联变更，
    // 误注销会把用户真实变更标 archived（与 command.js:569 sessionId 守卫同形正则）。
    if (changeName && /^quick-[0-9a-f]{8}$/.test(changeName)) {
      try {
        await pm.unregisterChange(cwd, changeName)
      } catch (e) {
        console.warn(`⚠️ 注销 quick 会话 changes 行失败（不阻断完成）: ${e.message}`)
      }
    }
  }
  return null
}
/**
 * execute「Wave N 执行」步骤完成后扫 worktree 提取 provider endpoint artifact（W6 Step6c 从
 * completeStep 内联块抽出）。供 verify 阶段 parity 对账 + consumer task 上游契约注入。
 * 接线自 contract-matrix pipeline。step 级（每个 Wave 执行步骤后跑），无 early-return（try/catch warn）。
 *
 * ctx：stageName/steps/currentIdx/changeName/specBase/cwd。extractArtifactsForChange ← 动态 ../contract-matrix.js，
 * WorktreeManager ← 动态 ../worktree.js（真环依赖保留动态）。
 */
export async function handleExecuteWaveArtifact({ stageName, steps, currentIdx, changeName, specBase, cwd }) {
  if (stageName === 'execute' && /^Wave \d+ 执行$/.test(steps[currentIdx]?.name || '')) {
    try {
      const { extractArtifactsForChange } = await import('../contract-matrix.js')
      let worktreePath = null
      try {
        const { WorktreeManager } = await import('../worktree.js')
        const meta = new WorktreeManager({ cwd }).getMeta(changeName)
        if (meta?.worktreePath && existsSync(meta.worktreePath)) worktreePath = meta.worktreePath
      } catch {}
      const msg = extractArtifactsForChange({ changeDir: join(specBase, 'changes', changeName), specBase, changeName, worktreePath })
      if (msg) console.log(msg)
    } catch (e) { console.warn(`⚠️ 契约 artifact 提取跳过: ${e?.message || e}`) }
  }
  return null
}

/**
 * execute 阶段完成时条件性清理 worktree（W6 Step6c 从 completeStep 完成路径内联块抽出）。
 * 不依赖 AI agent 的完成确认步骤：有未 apply 变更 → 保留 worktree；否则 cleanup（含 in-place 安全清理）。
 * stage 级（execute 阶段全部完成时跑），无 early-return（try/catch warn）。
 *
 * ctx：stageName/changeName/cwd。WorktreeManager ← 动态 ../worktree.js。
 */
export async function handleExecuteWorktreeCleanup({ stageName, changeName, cwd }) {
  if (stageName === 'execute' && changeName) {
    try {
      const { WorktreeManager } = await import('../worktree.js');
      const wm = new WorktreeManager({ cwd });
      const meta = wm.getMeta(changeName);
      if (!meta) {
        console.log('🔗 Worktree: n/a (no meta)');
      } else if (meta.mode === 'native-worktree') {
        console.log('🔗 Worktree: kept (外部隔离环境)');
      } else {
        // in-place 模式不再短路：cleanup 现在能安全处理 in-place（只清 meta，不碰主工作区）
        const check = wm.hasUnappliedChanges(changeName);
        if (check.hasChanges) {
          console.log(`🔗 Worktree: pending apply (${check.changedFiles.length} 个未应用变更)`);
          console.log(`   下一步: sillyspec worktree apply ${changeName}`);
        } else {
          const cleanResult = wm.cleanup(changeName);
          console.log(`🔗 Worktree: ${cleanResult.result}`);
          if (cleanResult.residual?.length > 0) {
            console.warn(`   ⚠️ 清理残留: ${cleanResult.residual.join('; ')}`);
            console.warn(`   手动处理: sillyspec worktree cleanup ${changeName} --force`);
          } else if (cleanResult.details?.length > 0) {
            for (const d of cleanResult.details) {
              if (d.startsWith('⚠️')) console.log(`   ${d}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`🔗 Worktree: check failed — ${e.message}`);
    }
  }
  return null
}
/**
 * scan 阶段完成后处理（W6 Step6d 从 completeStep 完成路径内联块抽出）：
 *   - 平台模式（specRoot/runtimeRoot）：写 manifest.json + 跑 scan-postcheck + 结构化结果 +
 *     更新平台指针（SCAN_COMPLETED）+ failed_post_check 阻断（exit 1 / early-return）
 *   - 非平台模式：轻量 postcheck + 结构化结果写 .runtime/
 * 返回 early-return 对象（platform failed_post_check 非 exit 路径）由 completeStep 透传；null = 放行。
 *
 * ctx：stageName/currentIdx/cwd/progress/pm/stageData/changeName/outputText/platformOpts。
 * safeGit/triggerSync ← shared；writeAtomicSync ← fs-atomic；SCAN_STATUS/POINTER_STATUS ← constants；
 * mkdirSync/writeFileSync/readFileSync/unlinkSync/join ← 顶部静态；runScanPostCheck 等 ← 动态 ../scan-postcheck.js。
 *
 * 搬迁清理：删 4 个冗余动态 builtin import（fs/path/child_process，execSync 死代码）+ _readFileSync 别名改回 readFileSync。
 */
export async function handleScanStageCompleted({ stageName, currentIdx, cwd, progress, pm, stageData, changeName, outputText, platformOpts }) {
  // 平台模式：scan 完成后生成 manifest.json + post-check
  if (stageName === 'scan' && (platformOpts.specRoot || platformOpts.runtimeRoot)) {
    try {
      stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = false; // 默认失败
      const manifestDir = platformOpts.specRoot
      mkdirSync(manifestDir, { recursive: true })
      let sourceCommit = null
      let sourceCommitError = null
      try {
        const gitResult = safeGit(cwd, ['rev-parse', 'HEAD'])
        sourceCommit = gitResult.value
        sourceCommitError = gitResult.error
      } catch (e) {
        sourceCommitError = e.message
      }
      const manifest = {
        workspace_id: platformOpts.workspaceId || null,
        scan_run_id: platformOpts.scanRunId || null,
        source_root: cwd,
        spec_root: platformOpts.specRoot || null,
        runtime_root: platformOpts.runtimeRoot || null,
        source_commit: sourceCommit,
        source_commit_error: sourceCommit === null ? (sourceCommitError || 'unknown') : undefined,
        generated_at: new Date().toISOString(),
        schema_version: 1,
        scan_profile: stageData.scanProfile
          ? { mode: stageData.scanProfile.mode, reason: stageData.scanProfile.reason }
          : null,
        postcheck_result_path: null,
        workflow_runs_dir: platformOpts.runtimeRoot
          ? join(platformOpts.runtimeRoot, 'scan-runs', platformOpts.scanRunId || 'unknown', 'workflow-runs')
          : null,
        platform_pointer_path: join(cwd, '.sillyspec-platform.json'),
        platform_pointer_status: POINTER_STATUS.ACTIVE,
      }
      const manifestPath = join(manifestDir, 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`📄 manifest.json 已写入: ${manifestPath}`)
      stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = true;
      if (!sourceCommit) {
        console.log(`⚠️  source_commit 无法获取（可能非 git 目录），已设为 null`)
      }
      // 清理平台参数临时文件
      const platformOptsFile = join(manifestDir, '.runtime', 'platform-scan.json')
      try { unlinkSync(platformOptsFile) } catch {}

      // CLI 层 post-check（替代旧的简单检查）
      const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult } = await import('../scan-postcheck.js')
      const postResult = runScanPostCheck({
        cwd,
        specDir: platformOpts.specRoot,
        outputText,
        scanMeta: {
          projectListParsed: stageData.scanMeta?.projectListParsed ?? null,
          manifestWritten: stageData.scanMeta?.manifestWritten ?? null,
        },
        scanProfile: stageData.scanProfile || null,
      })
      printScanPostCheckResult(postResult)

      // 生成结构化 JSON 并写入 runtime（供 SillyHub 消费）
      const structured = formatStructuredResult(postResult, {
        workspace_id: platformOpts.workspaceId,
        scan_run_id: platformOpts.scanRunId,
        source_root: cwd,
        spec_root: platformOpts.specRoot,
        runtime_root: platformOpts.runtimeRoot,
      })
      const postcheckJsonPath = writeStructuredResult(structured, platformOpts.specRoot, {
        runtimeRoot: platformOpts.runtimeRoot,
        scanRunId: platformOpts.scanRunId,
      })
      if (postcheckJsonPath) {
        console.log(`📄 postcheck-result.json 已写入: ${postcheckJsonPath}`)
        manifest.postcheck_result_path = postcheckJsonPath
      }

      // 将 post-check 结果写入 manifest
      manifest.scan_post_check = {
        status: postResult.status,
        checks: postResult.checks,
      }
      // 更新 manifest
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`📄 manifest.json 已更新（含 post-check 结果）`)

      // 更新平台指针状态为 scan_completed
      const pointerPath = join(cwd, '.sillyspec-platform.json')
      try {
        const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'))
        pointer.status = POINTER_STATUS.SCAN_COMPLETED
        pointer.completedAt = new Date().toISOString()
        pointer.scanStatus = postResult.status
        writeAtomicSync(pointerPath, JSON.stringify(pointer, null, 2) + '\n')
      } catch (e) {
        // 不阻断 scan 主流程，但暴露失败——pointer 写失败会让平台看不到 scan_completed，
        // 与项目 fail-loud 原则一致：宁可可见地 warn，也不静默吞错。
        console.warn(`⚠️ 更新平台指针状态失败（scan_completed 可能未落盘）: ${e.message}`)
      }

      // failed_post_check 时强制阻止 clean success
      if (postResult.status === 'failed_post_check') {
        stageData.status = SCAN_STATUS.FAILED_POST_CHECK
        stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
        await pm._write(cwd, progress, changeName)
        triggerSync(cwd, changeName, platformOpts)
        console.error(`\n❌ scan post-check 失败，状态设为 failed_post_check。不允许 clean success。`)
        console.error(`   请检查上方错误信息并修复后重新 scan。`)
        // 平台模式：exit(1) 让 daemon/SillyHub 感知非 0 退出码（manifest.json 已落盘，不会被撤销）
        if (platformOpts.specRoot || platformOpts.runtimeRoot) {
          console.error('   平台模式：CLI 将以 exit code 1 退出，通知 SillyHub scan 失败。')
          process.exit(1)
        }
        // 接口与 plan contract (run.js:2551 附近 plan 失败分支) 对齐：
        // 返回 { stageCompleted:false, currentIdx, nextPendingIdx: currentIdx }
        // 让上层 runStage 走"完成但不推进"分支，--done 被拒
        return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
      } else if (postResult.status === 'completed_with_warnings') {
        // 警告不阻止完成，但记录
        stageData.status = 'completed'
        stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
        await pm._write(cwd, progress, changeName)
      }
    } catch (e) {
      console.warn(`⚠️  manifest.json 写入失败: ${e.message}`)
    }
  }

  // 非 platform 模式 scan 也做轻量 post-check + 结构化输出
  if (stageName === 'scan' && !platformOpts.specRoot && !platformOpts.runtimeRoot) {
    const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult } = await import('../scan-postcheck.js')
    const postResult = runScanPostCheck({ cwd, specDir: null, outputText, scanProfile: stageData.scanProfile || null })
    printScanPostCheckResult(postResult)
    // 结构化结果写入 .sillyspec/.runtime/
    const structured = formatStructuredResult(postResult, { source_root: cwd })
    const postcheckJsonPath = writeStructuredResult(structured, join(cwd, '.sillyspec'))
    if (postcheckJsonPath) {
      console.log(`📄 postcheck-result.json 已写入: ${postcheckJsonPath}`)
    }
  }
  return null
}

