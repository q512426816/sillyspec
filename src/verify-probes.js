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
 * 结论走「结论枚举：」固定槽行（刀③）——占位符不含枚举词，槽未填 extractVerifyConclusionSlot
 * 返回 '' 即判不过，骨架不能直接过门（与 symbol-impact 骨架同款防偷懒语义）。
 * P3b 增量：①章节标题行末尾 claims 层标注（可复跑探针/确定性检查/人工判断，纯后缀不新增行）；
 * ②--init 同步落盘 verify-facts.json 机器底稿（探针命令行 + 首跑关键指标 + 时间戳，CLI 全权写，
 * 供事后独立复跑审计；重复 --init 覆盖为最近一次 init 快照）。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import { gitQuiet } from './git-helper.js'
import {
  FACTS_SCHEMA_VERSION, EVIDENCE_SLOT_HEADING, RECEIPT_SLOT_HEADING, parseEvidenceSlots,
} from './verify-facts-schema.js'
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
  const probe6 = { deletions: [], unavailable: false, note: '以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定' }
  // 他者声明归属过滤（坑 verify-reconcile-foreign-wip）：并行会话在途删除/改动不进本变更对账
  // gitQuiet 失败（非仓库/git 缺失/报错）返回 null ≠ 空结果：null 必须显式标记不可用，
  // 否则半截对账被渲染成「✅ 无删除」的错误全清信号（对照 verify-postcheck runVerifyDeletionCheck 的 skipped 口径）
  const nsOut = gitQuiet(cwd, ['diff', '--name-status', 'HEAD'])
  if (nsOut === null) probe6.unavailable = true
  let nsRows = (nsOut || '').split('\n').filter(Boolean)
  {
    const rawTargets = nsRows.map(row => ((row.split('\t')[1]) || ''))
      .filter(Boolean).map(t => t.split('\\').join('/'))
    const { foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, rawTargets, { specBase, runtimeRoot })
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
    // R/C 的旧路径等价删除（paths[0]）；D 的唯一路径——两者都取 paths[0]
    const target = paths[0] || ''
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
  if (probe5.prefixAlignedCount > 0) {
    L.push(`- ℹ️ ${probe5.prefixAlignedCount} 处前端调用经挂载前缀对齐匹配（endpoints 提取不含 include_router/app.use 挂载点前缀，比对时剥除对齐——非契约缺口）`)
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
  if (probe6.unavailable) {
    L.push('- ⚠️ git 不可用或非仓库，删除对账无法执行（不能视为「无删除」，agent 需人工核对）')
  } else if (probe6.deletions.length === 0) {
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
 * 从 runVerifyProbes 结果构造 verify-facts.json 机器底稿对象（P3b 可复跑审计底稿）。
 * 命令行统一 `sillyspec verify-probes --change <name>`；指标 fail-soft——字段不可得时少列
 * 该键而非报错（probe5 形态随 verifyApiParity 演进，宁可少列不可失真）。
 * @param {{ probe1?: object, probe3?: object, probe5?: object, probe6?: object }} result
 * @param {{ changeName?: string, now?: string }} [opts] now 缺省取当前时刻（ISO）
 * @returns {{ schemaVersion: number, change: string, generatedAt: string, probes: object }}
 */
export function buildVerifyFacts(result, { changeName, now } = {}) {
  const command = `sillyspec verify-probes --change ${changeName}`
  // undefined 值键不进 metrics（「取不到的字段宁可少列」）
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  const len = (a) => (Array.isArray(a) ? a.length : undefined)
  const num = (v) => (typeof v === 'number' ? v : undefined)
  const p1 = (result && result.probe1) || {}
  const p3 = (result && result.probe3) || {}
  const p5 = (result && result.probe5) || {}
  const p6 = (result && result.probe6) || {}
  // v2（2026-09-08-ir-verify-facts）：probes 机器段原样；conclusion/tests/requiredEvidence/
  // runtimeEvidence/factsConsistency 五段是 slot-backfill/实测回填段（D-001@v2），--init 快照
  // 不落键（writeVerifyFacts 分段合并时保留既有固化段），由 backfillFactsFromMdAndTests 填。
  return {
    schemaVersion: 2,
    change: changeName,
    generatedAt: now || new Date().toISOString(),
    probes: {
      probe1: {
        command,
        metrics: defined({
          matches: len(p1.matches),
          skippedFiles: len(p1.skippedFiles),
          worktreeHits: num(p1.worktreeHits),
          globEntries: len(p1.globEntries),
        }),
      },
      probe3: {
        command,
        metrics: defined({
          tasks: len(p3.tasks),
          hasTest: Array.isArray(p3.tasks) ? p3.tasks.filter(t => t && t.hasTest).length : undefined,
        }),
      },
      probe5: {
        command,
        metrics: defined({
          backendEndpoints: num(p5.backendCount),
          frontendCalls: num(p5.frontendCount),
        }),
      },
      probe6: {
        command,
        metrics: defined({
          deletions: len(p6.deletions),
          unavailable: typeof p6.unavailable === 'boolean' ? p6.unavailable : undefined,
        }),
      },
    },
  }
}

/**
 * 平台模式产物路径回显注记（2026-09-10 驾驭小结②，用户实锤「显示混乱」）：
 * verify-probes --init 在平台模式（.sillyspec-platform.json pointer 存在）下 spec 根解析为
 * hub 镜像目录——回显的物理路径（骨架生成/已存在/facts 刷新）都在镜像根下，而产物经
 * daemon spec-sync 落主仓 .sillyspec/changes/<change>/。agent/人工核对以主仓路径为准，
 * 回显行尾追加本注记消歧义（本地模式返回空串，回显零变化）。
 * @param {string|null} platformBase 平台镜像根（null/undefined = 非平台模式）
 * @param {string} changeName 变更名
 * @param {string} file 产物文件名（verify-result.md / verify-facts.json）
 * @returns {string} 注记文本（非平台模式为 ''）
 */
export function formatPlatformPathNote(platformBase, changeName, file) {
  if (!platformBase) return ''
  return `（平台模式：物理写盘在 hub 镜像根 ${platformBase}；主仓同步位置 .sillyspec/changes/${changeName}/${file}，核对以主仓路径为准）`
}

/**
 * verify-probes --init 落盘 verify-facts.json（CLI 全权写）。v2（2026-09-08-ir-verify-facts）改
 * 分段合并：re-init 刷新机器段（probes/generatedAt），保留既有 slot-backfill/实测固化段
 * （conclusion/tests/requiredEvidence/runtimeEvidence）——旧「无条件覆盖」会抹掉 --done 回填数据
 * （设计审查 P1-5）。agent 勿手改：复跑审计的对照快照，防篡改基准是 verify-result.md 正文。
 * @param {string} changeDir 变更目录（spec 根下 changes/<name>）
 * @param {object} result runVerifyProbes 返回值
 * @param {string} changeName 变更名（统一命令行呈现）
 * @param {{ platformNote?: string }} [opts] platformNote 回显行尾追加（平台模式路径消歧，纯回显层不进落盘）
 * @returns {{ facts: object, path: string }}
 */
export function writeVerifyFacts(changeDir, result, changeName, opts = {}) {
  const fresh = buildVerifyFacts(result, { changeName })
  const factsPath = join(changeDir, 'verify-facts.json')
  let facts = fresh
  try {
    const prev = JSON.parse(readFileSync(factsPath, 'utf8'))
    if (prev && prev.schemaVersion === FACTS_SCHEMA_VERSION) {
      facts = {
        ...fresh,
        conclusion: prev.conclusion,
        tests: prev.tests,
        requiredEvidence: prev.requiredEvidence,
        runtimeEvidence: prev.runtimeEvidence,
        factsConsistency: prev.factsConsistency, // 保留至上次对比结论（下次 --done 重算覆盖）
      }
    }
  } catch { /* 首次落盘/v1/损坏 → 全新快照（v1 无固化段，直接升 v2） */ }
  writeFileSync(factsPath, JSON.stringify(facts, null, 2) + '\n')
  console.log(`📝 已刷新 verify-facts.json 机器底稿: ${factsPath}（v2 分段合并，固化段保留；CLI 全权写，勿手改）${opts.platformNote || ''}`)
  return { facts, path: factsPath }
}

/**
 * --done 回填（D-001@v2 slot-backfill）：结论枚举槽 + 证据/回执槽解析固化进 facts；
 * testCheckResult 提供时回填 tests 段（实测在 runValidators 之后 → gates 二次回填，FR-03 次序）。
 * 机器段（probes/factsConsistency）不经本函数（writeVerifyFacts / checkProbeConsistency 所有）。
 * fail-soft：facts 缺失时原地升 v2（probes 保留或空）；落盘失败 warn 不抛。
 * @param {string} factsPath verify-facts.json 路径
 * @param {{ verifyMd: string, testCheckResult?: object|null }} opts
 * @returns {{ facts: object, conclusion: string|null, evidenceCount: number, receiptCount: number, testsBackfilled: boolean }}
 */
export function backfillFactsFromMdAndTests(factsPath, { verifyMd, testCheckResult = null, conclusion = null }) {
  let facts = null
  try { facts = JSON.parse(readFileSync(factsPath, 'utf8')) } catch { /* 缺失见下 */ }
  // 只固化既有底稿，不无中生有（2026-09-08-ir-verify-facts 接线实证）：无 facts 的存量变更
  // （未跑过 --init）若被回填凭空建出 facts.json，checkProbeConsistency 的「有 facts 无探针
  // 子节 → error」判别会把存量兼容 skip 误升 error（run-complete-step-verify e2e 抓出）。
  // 底稿创建唯一入口是 verify-probes --init。
  if (!facts) {
    return { facts: null, skipped: true, conclusion: null, evidenceCount: 0, receiptCount: 0, testsBackfilled: false, reason: '无 verify-facts.json（未跑 --init），回填跳过——底稿创建唯一入口是 --init' }
  }
  if (facts.schemaVersion !== FACTS_SCHEMA_VERSION) {
    facts = { ...facts, schemaVersion: FACTS_SCHEMA_VERSION, probes: (facts && facts.probes) || {} }
  }
  const slots = parseEvidenceSlots(verifyMd || '')
  // conclusion 由调用方传 stage-contract.extractVerifyConclusionSlot(verifyMd) 的结果
  // （避免 verify-probes → stage-contract 静态 import 的潜在环，分层单向）
  const conclusionSlot = conclusion || null
  if (conclusionSlot) facts.conclusion = conclusionSlot
  if (slots.hasEvidenceSlot && slots.requiredEvidence.length > 0) {
    facts.requiredEvidence = slots.requiredEvidence.map(e => ({
      task: e.task, status: e.status, verifiedFiles: e.verifiedFiles,
      ...(e.exempt ? { exempt: true, exemptionReason: e.exemptionReason } : {}),
    }))
  }
  if (slots.hasReceiptSlot && slots.runtimeEvidence.length > 0) {
    facts.runtimeEvidence = slots.runtimeEvidence
  }
  let testsBackfilled = false
  if (testCheckResult && testCheckResult.status && testCheckResult.status !== 'skipped') {
    facts.tests = {
      command: testCheckResult.command || null,
      exitCode: typeof testCheckResult.exitCode === 'number' ? testCheckResult.exitCode : null,
      strategy: testCheckResult.mode || testCheckResult.strategy || null,
      failedRemaining: testCheckResult.failureNames || testCheckResult.failedTests || [],
      passedAt: new Date().toISOString(),
    }
    testsBackfilled = true
  }
  try {
    writeFileSync(factsPath, JSON.stringify(facts, null, 2) + '\n')
  } catch (e) {
    console.warn(`⚠️ facts 回填落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
  }
  return { facts, conclusion: conclusionSlot, evidenceCount: slots.requiredEvidence.length, receiptCount: slots.runtimeEvidence.length, testsBackfilled }
}

/**
 * md 槽段缺失补齐（--init 段落级补齐，2026-09-08-ir-verify-facts R-02）：已存在的
 * verify-result.md 缺「证据账/集成验证回执」槽段时仅追加骨架（不触碰既有正文），幂等二跑零改动。
 * @param {string} mdPath verify-result.md 路径
 * @param {Array<{task:string,evidence:string[]}>} [requiredEvidenceItems] verify-required-evidence.json items（预填 task 行）
 * @returns {{ added: string[] }} 追加的槽段标题列表
 */
export function backfillMissingEvidenceSlots(mdPath, requiredEvidenceItems = []) {
  let text = ''
  try { text = readFileSync(mdPath, 'utf8') } catch { return { added: [] } }
  const normalized = text.replace(/\r\n/g, '\n')
  const added = []
  const blocks = []
  if (!normalized.includes(EVIDENCE_SLOT_HEADING)) {
    const lines = [EVIDENCE_SLOT_HEADING, '[层：人工判断——CLI 核验]', '', '<!-- 无 cannot_verify 任务时本节写「无」 -->']
    if (requiredEvidenceItems.length > 0) {
      for (const it of requiredEvidenceItems) {
        lines.push(`- ${it.task}: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）`)
      }
    } else {
      lines.push('无（本次变更无 cannot_verify 任务）')
    }
    lines.push('')
    blocks.push(lines.join('\n'))
    added.push(EVIDENCE_SLOT_HEADING)
  }
  if (!normalized.includes(RECEIPT_SLOT_HEADING)) {
    blocks.push([
      RECEIPT_SLOT_HEADING, '[层：自述声明——CLI 一致性校验]', '',
      '<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->',
      '- claim: <待填：一句话> | command: <待填：命令> | exit: <待填：0 或非 0> | log: <待填：日志路径>',
      '',
    ].join('\n'))
    added.push(RECEIPT_SLOT_HEADING)
  }
  if (added.length > 0) {
    writeFileSync(mdPath, normalized.replace(/\n?$/, '\n') + blocks.join('\n') + '\n')
  }
  return { added }
}

/**
 * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
 * 结论走「结论枚举：」固定槽行（刀③，2026-09-08）——占位符不含枚举词（<待填：三选一>），
 * 槽未填 → extractVerifyConclusionSlot 返回 '' → gate 判不过（fail-closed；旧占位符
 * `<待填：PASS 或 FAIL>` 含 PASS 字样会被窗口正则误读成已填 PASS，已修）。
 * 章节标题行末尾带 claims 层标注（P3b）：探针结果=可复跑探针 / 测试结果=确定性检查 / 其余=
 * 人工判断——纯渲染层后缀，不新增行；结论解析槽优先于标题关键词窗口（存量兼容）。
 * @returns {string|null} 骨架全文；无 design.md/tasks.md（非完整流程变更）→ null
 */
export function generateVerifyResultSkeleton(result) {
  const L = [
    '# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）',
    '',
    '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——',
    '> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`<待填：三选一>`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一；一句话理由写在枚举后同行或下一行）',
    '',
    '## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]',
    '<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->',
    '- task-NN: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）',
    '',
    '## 集成验证回执 [层：自述声明——CLI 一致性校验]',
    '<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->',
    '- claim: <待填：一句话> | command: <待填：命令> | exit: <待填：0 或非 0> | log: <待填：日志路径>',
    '',
    '## 任务完成度 [层：人工判断]',
    '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->',
    '',
    '## 设计一致性 [层：人工判断]',
    '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->',
    '',
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    renderVerifyProbesReport(result),
    '',
    '## 测试结果 [层：确定性检查——CLI 实测对账]',
    '<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->',
    '',
    '## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]',
    '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
    '',
    '## 技术债务 [层：人工判断]',
    '<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->',
    '',
    '## 变更风险等级 [层：人工判断]',
    '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->',
    '',
    '## Runtime Evidence [层：人工判断]',
    '<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->',
    '',
    '## 代码审查 [层：人工判断]',
    '<!--TODO: 问题列表 + 总体评价-->',
    '',
  ]
  return L.join('\n')
}
