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
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { renameSyncRetry } from '../fs-atomic.js'
import { resolveChangeDir } from './shared.js'
import { stageRegistry } from '../stages/index.js'

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
  const destDir = join(archiveDir, `${date}-${archiveChangeName}`)

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

  console.log(`📦 已归档：${archiveChangeName} → archive/${date}-${archiveChangeName}/`)
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

