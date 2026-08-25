/**
 * verify-probes.js — `sillyspec verify-probes` 的机械探针实现 + verify-result.md 骨架生成
 * （2026-08-21 agent-手工产出审计第三批 H1/H3/H5/H7/F9）。
 *
 * verify-probes.md 模板定义六个探针，agent 此前逐条手跑 grep/递归查找/git 对账再手工拼表格。
 * 本模块把纯机械的四个探针命令化（语义判断的留 agent，输出里显式标注）：
 *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等
 *   探针3 测试覆盖：逐 task 按 allowed_paths 定位模块目录，递归找测试文件（co-located tests/ 陷阱）
 *   探针5 API 契约对账：复用 contract-matrix.verifyApiParity（endpoints.json × 前端调用）+ 表格渲染
 *   探针6 删除对账：git diff --name-status HEAD 的 D/R × design 声明操作三态判定
 * 探针2（关键词提取半语义）/探针3.4 集成盲区/3.5 断言抽查/探针4（决策追踪语义）留 agent。
 *
 * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。
 * 结论章节留「待填」——extractVerifyConclusion 找不到 PASS/FAIL 关键词即判不过，骨架不能
 * 直接过门（与 symbol-impact 骨架同款防偷懒语义）。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import { gitQuiet } from './git-helper.js'
import { parseFileChangeListDetailed } from './change-list.js'
import { parseAllowedPaths } from './stages/plan-postcheck.js'
import { verifyApiParity, _readWorktreeMeta } from './contract-matrix.js'
import { splitOwnVsForeignDiffFiles } from './foreign-declared.js'
import { resolveSpecDir, resolveRuntimeRoot, detectWorktreeSpecDrift } from './run/shared.js'

const TODO_MARKER_RE = /尚未实现|TODO|FIXME|HACK|XXX/
const TEST_FILE_RE = /test|spec/i
const PROBE1_MAX_MATCHES = 200

/**
 * verify-probes 的 spec 根解析（含 worktree 副本漂移锚定）。
 *
 * 坑 worktree-spec-artifact-misplace（2026-08-24 用户实证）：在 worktree 内跑
 * `verify-probes --init` 时 spec 根随 cwd 落进 worktree 的 .sillyspec checkout 副本——骨架
 * 写进副本、主仓 verify gate 读不到，副本随 worktree 清理蒸发。与 run/command.js 对
 * plan/execute/verify/archive 的漂移守卫同口径：命中副本自动锚回主仓后继续（不 exit）；
 * 平台模式 / 显式 --spec-dir 已明确指定，不纠正。
 * @param {string} cwd
 * @param {string|null} [specDir] --spec-dir（显式指定则不锚定）
 * @param {string|null} [platformBase] 平台 spec 根（仅 .sillyspec-platform.json pointer 存在时传入；
 *   resolvePlatformSpecDir 无 pointer 时回退本地解析会返回 worktree 副本根，不能当平台根传）
 * @returns {string} spec 根绝对路径（漂移时为主仓）
 */
export function resolveVerifyProbesSpecBase(cwd, specDir = null, platformBase = null) {
  if (platformBase) return platformBase
  const base = resolveSpecDir(cwd, { specDir: specDir || undefined })
  if (specDir) return base
  const wt = detectWorktreeSpecDrift(base)
  if (wt) {
    console.warn(`⚠️ 已自动锚定主仓 spec：${wt.mainSpecBase}（原 cwd 命中 worktree 副本 ${wt.changeName}，verify-probes 产物落主仓，已纠正，流程继续）`)
    return wt.mainSpecBase
  }
  return base
}

function listTaskIds(tasksPath) {
  if (!existsSync(tasksPath)) return []
  const ids = []
  for (const line of readFileSync(tasksPath, 'utf8').split('\n')) {
    const m = line.match(/^[-*]\s*\[[ xX]\]\s*(task-\d+)\b/)
    if (m) ids.push(m[1])
  }
  return ids
}

/** 递归找测试文件（排除 node_modules/.git/dist 等；返回 posix 相对 cwd 路径，封顶展示） */
function findTestFiles(rootDir, cwd, cap = 10) {
  const found = []
  const skip = new Set(['node_modules', '.git', '.gradle', '__pycache__', '.venv', 'dist', 'build', 'target', 'out'])
  const walk = (d) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(d, e.name)
      if (e.isDirectory()) {
        if (!skip.has(e.name)) walk(full)
      } else if (e.isFile() && TEST_FILE_RE.test(basename(e.name))) {
        found.push(full.split('\\').join('/').replace(cwd.split('\\').join('/').replace(/\/$/, '') + '/', ''))
        if (found.length >= cap) return
      }
    }
  }
  if (existsSync(rootDir)) walk(rootDir)
  return found
}

/**
 * 跑四个机械探针。
 * @param {{ cwd: string, changeName: string, specDir?: string|null }} opts
 * @returns {{ probe1: object, probe3: object, probe5: object, probe6: object }}
 */
export function runVerifyProbes({ cwd, changeName, specDir = null }) {
  const specBase = resolveVerifyProbesSpecBase(cwd, specDir)
  const changeDir = join(specBase, 'changes', changeName)
  const designPath = join(changeDir, 'design.md')
  const detailed = existsSync(designPath) ? parseFileChangeListDetailed(designPath) : []
  const designOps = new Map(detailed.map(e => [e.path, e.operation]))

  // ── 探针 1：未实现标记扫描（design 清单具体文件；glob 项列出让 agent 展开）──
  // worktree 路径回退（坑 probe1-worktree-path-blind，2026-08-24 用户实证：verify 从主仓跑、
  // apply 前 design 清单新文件只在 worktree → 6 个新文件被报「不存在」跳过不扫）。主仓路径
  // 缺失且存在真实 worktree（gitDir≠cwd，与探针 5 的 _readWorktreeMeta 同源解析）→ 读 worktree
  // 版本并计数；两处皆缺才进 skippedFiles。in-place meta（gitDir==cwd）零行为变化。
  const wtInfo = _readWorktreeMeta(specBase, cwd, changeName)
  const wtRoot = (wtInfo && wtInfo.gitDir && wtInfo.gitDir !== cwd) ? wtInfo.gitDir : null
  const probe1 = { matches: [], globEntries: [], skippedFiles: [], worktreeHits: 0 }
  for (const e of detailed) {
    if (e.path.startsWith('.sillyspec/')) continue
    if (/[*?[\]]/.test(e.path)) {
      probe1.globEntries.push(e.path)
      continue
    }
    let abs = join(cwd, e.path)
    if (!existsSync(abs)) {
      const wtAbs = wtRoot ? join(wtRoot, e.path) : null
      if (wtAbs && existsSync(wtAbs)) {
        abs = wtAbs
        probe1.worktreeHits++
      } else {
        probe1.skippedFiles.push(e.path)
        continue
      }
    }
    try {
      const lines = readFileSync(abs, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (probe1.matches.length >= PROBE1_MAX_MATCHES) return
        if (TODO_MARKER_RE.test(line)) probe1.matches.push({ file: e.path, line: i + 1, content: line.trim().slice(0, 160) })
      })
    } catch {
      probe1.skippedFiles.push(e.path)
    }
  }

  // ── 探针 3：验收标准测试覆盖（task 卡 allowed_paths → 模块目录递归找测试文件）──
  const tasksPath = join(changeDir, 'tasks.md')
  const probe3 = { tasks: [], note: '集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️' }
  for (const taskId of listTaskIds(tasksPath)) {
    const cardPath = join(changeDir, 'tasks', `${taskId}.md`)
    let allowed = []
    if (existsSync(cardPath)) allowed = parseAllowedPaths(readFileSync(cardPath, 'utf8'))
    const moduleDirs = [...new Set(allowed.map(p => dirname(p.split('\\').join('/'))).filter(d => d && d !== '.'))]
    const testFiles = []
    for (const d of moduleDirs) {
      // 同探针 1 的 worktree 回退（坑 probe1-worktree-path-blind）：新模块目录 apply 前只在
      // worktree——主仓目录缺失时到 worktree 找 co-located 测试（路径相对 worktree 根呈现）
      let searchRoot = join(cwd, d)
      let relBase = cwd
      if (!existsSync(searchRoot) && wtRoot && existsSync(join(wtRoot, d))) {
        searchRoot = join(wtRoot, d)
        relBase = wtRoot
      }
      for (const f of findTestFiles(searchRoot, relBase)) {
        if (!testFiles.includes(f)) testFiles.push(f)
      }
    }
    probe3.tasks.push({
      task: taskId,
      moduleDirs,
      testFiles: testFiles.slice(0, 10),
      testFileCount: testFiles.length,
      hasTest: testFiles.length > 0,
      located: moduleDirs.length > 0,
    })
  }

  // ── 探针 5：API 契约对账（复用 verifyApiParity：endpoints.json × 前端调用）──
  const runtimeRoot = resolveRuntimeRoot({ specRoot: specDir }, specBase)
  const probe5 = verifyApiParity(specBase, cwd, runtimeRoot, changeName)

  // ── 探针 6：代码删除对账（git diff --name-status HEAD 的 D/R × design 声明三态）──
  const probe6 = { deletions: [], note: '以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定' }
  // 他者声明归属过滤（坑 verify-reconcile-foreign-wip）：并行会话在途删除/改动不进本变更对账
  const nsOut = gitQuiet(cwd, ['diff', '--name-status', 'HEAD']) || ''
  let nsRows = nsOut.split('\n').filter(Boolean)
  {
    const rawTargets = nsRows.map(row => ((row.split('\t')[1]) || ''))
      .filter(Boolean).map(t => t.split('\\').join('/'))
    const { foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, rawTargets)
    if (foreign.length > 0) {
      const foreignSet = new Set(foreign.map(x => x.file))
      nsRows = nsRows.filter(row => !foreignSet.has((row.split('\t')[1] || '').split('\\').join('/')))
      console.warn(`⚠️ 探针6 已排除 ${foreign.length} 个并行会话声明的删除/改动（${foreign.slice(0, 5).map(x => x.file).join(', ')}${foreign.length > 5 ? ' 等' : ''}）`)
    }
  }
  for (const row of nsRows) {
    const [status, ...paths] = row.split('\t')
    const st = (status || '').trim().toUpperCase()
    if (!/^[DRC]/.test(st)) continue
    // R/C 的旧路径等价删除（paths[0]）；D 的唯一路径
    const target = (st.startsWith('D') ? paths[0] : paths[0]) || ''
    const posix = target.split('\\').join('/')
    if (!posix || posix.startsWith('.sillyspec/') || posix === 'meta.json' || basename(posix) === 'meta.json') continue
    const op = designOps.get(posix)
    let verdict
    if (op && /删除|delete|del/i.test(op)) verdict = '✅ 合规（design 声明删除）'
    else if (op) verdict = `❌ 高风险（design 声明「${op}」却整文件删除）`
    else verdict = '⚠️ 未声明删除（design 清单未列出）'
    probe6.deletions.push({ path: posix, status: st, designOp: op || null, verdict })
  }

  return { probe1, probe3, probe5, probe6 }
}

/**
 * 渲染探针结果为 markdown（可直接粘进 verify-result.md「探针结果」章节）。
 */
export function renderVerifyProbesReport(result) {
  const L = []
  const { probe1, probe3, probe5, probe6 } = result

  L.push('#### 探针 1：未实现标记扫描（design 清单文件）')
  if (probe1.matches.length === 0) {
    L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中')
  } else {
    for (const m of probe1.matches) L.push(`- ⚠️ \`${m.file}:${m.line}\` ${m.content}`)
  }
  if (probe1.globEntries.length > 0) L.push(`- ℹ️ glob 项未展开（agent 手动展开扫描）：${probe1.globEntries.join('、')}`)
  if (probe1.worktreeHits > 0) L.push(`- ℹ️ ${probe1.worktreeHits} 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）`)
  if (probe1.skippedFiles.length > 0) L.push(`- ℹ️ 清单文件不存在（跳过）：${probe1.skippedFiles.join('、')}`)
  L.push('')

  L.push('#### 探针 2：设计关键词覆盖')
  L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->')
  L.push('')

  L.push('#### 探针 3：验收标准测试覆盖')
  if (probe3.tasks.length === 0) {
    L.push('- ℹ️ tasks.md 无 checkbox 任务')
  } else {
    for (const t of probe3.tasks) {
      if (!t.located) {
        L.push(`- ⚠️ ${t.task}: 无 task 卡/allowed_paths，无法定位模块目录（agent 手查）`)
      } else if (t.hasTest) {
        L.push(`- ✅ ${t.task}: 模块目录（${t.moduleDirs.join('、')}）找到 ${t.testFileCount} 个测试文件（${t.testFiles.slice(0, 5).join('、')}${t.testFileCount > 5 ? ' …' : ''}）`)
      } else {
        L.push(`- ⚠️ ${t.task}: 模块目录（${t.moduleDirs.join('、')}）递归未找到测试文件（含 co-located tests/）`)
      }
    }
  }
  L.push(`- ℹ️ ${probe3.note}`)
  L.push('')

  L.push('#### 探针 4：决策追踪覆盖')
  L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->')
  L.push('')

  L.push('#### 探针 5：API Contract Parity')
  L.push(`- ${probe5.summary || `backend ${probe5.backendCount ?? 0} 端点 / frontend ${probe5.frontendCount ?? 0} 调用`}`)
  if ((probe5.scanRoots || []).length > 1) {
    L.push(`- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 ${probe5.scanRoots.length} 个根`)
  }
  if ((probe5.missingBackend || []).length > 0) {
    L.push('')
    L.push('| 状态 | 前端调用 | 后端端点 | 文件 |')
    L.push('|---|---|---|---|')
    for (const m of probe5.missingBackend) {
      L.push(`| ❌ missing | ${m.method} ${m.path} | — | ${m.consumerFile || '?'}${m.consumerLine ? ':' + m.consumerLine : ''} |`)
    }
    L.push('')
    L.push('- ❌ contract gap 是真实集成缺陷——诚实判 FAIL 并回 execute 补端点（CLI 仅 advisory 不硬阻断）')
  }
  if ((probe5.unusedBackend || []).length > 0) {
    L.push(`- ⚠️ ${probe5.unusedBackend.length} 个后端端点前端未调用（warning 不阻断）：${probe5.unusedBackend.slice(0, 5).map(u => `${u.method} ${u.path}`).join('、')}${probe5.unusedBackend.length > 5 ? ' …' : ''}`)
  }
  L.push('')

  L.push('#### 探针 6：代码删除对账')
  if (probe6.deletions.length === 0) {
    L.push('- ✅ git diff 无整文件删除（D/R/C）记录')
  } else {
    for (const d of probe6.deletions) {
      L.push(`- ${d.verdict} \`${d.path}\`（git 状态 ${d.status}）`)
    }
  }
  L.push(`- ℹ️ ${probe6.note}`)
  return L.join('\n')
}

/**
 * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
 * 结论章节留「待填」——extractVerifyConclusion 无 PASS/FAIL 关键词即判不过，骨架不能直接过门。
 * @returns {string|null} 骨架全文；无 design.md/tasks.md（非完整流程变更）→ null
 */
export function generateVerifyResultSkeleton(result) {
  const L = [
    '# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）',
    '',
    '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论必须写明 PASS / FAIL**——',
    '> 留「待填」会被 gate 判不过（fail-closed）。',
    '',
    '## 结论：<待填：PASS 或 FAIL（+一句话理由）>',
    '',
    '## 任务完成度',
    '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->',
    '',
    '## 设计一致性',
    '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->',
    '',
    '## 探针结果（CLI 机械预填）',
    renderVerifyProbesReport(result),
    '',
    '## 测试结果',
    '<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->',
    '',
    '## 决策追踪矩阵（如存在 decisions.md；无则删本节）',
    '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
    '',
    '## 技术债务',
    '<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->',
    '',
    '## 变更风险等级',
    '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->',
    '',
    '## Runtime Evidence',
    '<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->',
    '',
    '## 代码审查',
    '<!--TODO: 问题列表 + 总体评价-->',
    '',
  ]
  return L.join('\n')
}
