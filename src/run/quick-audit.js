/**
 * run/quick-audit.js（W6 Step2 从 run.js 抽出）。
 *
 * quick 审计结论打印 + quick 多变更关联选择（自洽，不依赖 run.js 闭包）。
 * 安全锚：run.js 始终 barrel，本模块函数 run.js import 回来；无 test 直接 import，无需 re-export。
 *
 * 路径修正（相对 src/run/）：
 *   - resolveQuickLinkedChanges 的 quick-recommend.js 动态 import './quick-recommend.js' → '../quick-recommend.js'
 *   - 脏文件信号改用 safeGit（带 safe.directory，Q3）；不再 import execSync
 *   - parsePorcelainPath 从 ./shared.js 重 import；checkbox 改交互分支内动态 import——
 *     本模块被 command.js 静态 import，顶部静态拉 @inquirer/prompts 会进**每条** run 命令
 *     启动路径（实测冷加载 100-150ms），而 checkbox 仅"≥2 活跃变更 + TTY"分支用到
 */
import { join } from 'node:path'
import { parsePorcelainPath, safeGit } from './shared.js'
import { collectRecentForeignDelivery, detectAssertionRewrites, readSemanticGuardEnabled } from '../semantic-guard.js'

/**
 * 打印 quick 完成审计结论（按 review.status 输出 SAFE/WARNING/BLOCKED）。
 */
export function printQuickAuditReview(review) {
  if (review.status === 'blocked') {
    console.error(`\n🚫 quick 变更边界审计 — BLOCKED：`)
    for (const r of review.reasons) {
      console.error(`   - ${r}`)
    }
    console.error(`\n   quick 已停止：请恢复/拆分这些变更，或重新运行 quick 并显式声明范围。`)
    // 解锁咒语须在 BLOCKED 分支也给出 —— 原只在 confirm/review 分支打印，
    // 普通 --done 走这里只看到「恢复/拆分」反方向指引，正确解法（带 flag 重跑）根本不出现。
    // 删除：默认 fail-closed（高危操作），但 --allow-delete 显式 opt-in 可解锁（对称 --allow-new）。
    if (review.deletedFiles && review.deletedFiles.length > 0) {
      console.error(`\n   ⛔ 本次含删除文件 ${review.deletedFiles.length} 个：${review.deletedFiles.join(', ')}`)
      console.error(`   删除是破坏性操作默认 fail-closed，确认删除这些文件请带 --allow-delete 显式解锁：`)
      console.error(`     sillyspec run quick --done --allow-delete --change <id> --output "..."`)
      console.error(`   （--force-baseline / --allow-new 不能解锁删除；不确认请 git restore 撤回删除后再 --done，或走完整流程 execute 由 review 把关）`)
    } else {
      // 分流点名（2026-09-11 用户实证：allowedFiles 推断漏了三个实改文件，被与「危险文件」
      // 混在一起推 --force-baseline——语义过宽且吓人）。按 reason 类别给精确最小解锁：
      //   超出 allowedFiles（非危险）→ 追加 --files 并入边界即可；危险/baseline → --force-baseline；
      //   新增 → --allow-new。未命中的 flag 不再出现在咒语里。
      const prot = review.reasons.filter((r) => r.startsWith('危险文件变更') || r.startsWith('覆盖 baseline'))
        .map((r) => r.split(': ')[1]).filter(Boolean)
      const news = review.reasons.filter((r) => r.startsWith('新增文件'))
        .map((r) => r.split(': ')[1]).filter(Boolean)
      const undecl = review.reasons.filter((r) => r.startsWith('超出 allowedFiles'))
        .map((r) => r.split(': ')[1]).filter(Boolean)
      const flags = []
      if (undecl.length > 0) {
        flags.push('--files <原声明文件>,' + undecl.join(','))
        console.error(`   📋 边界归属未声明（非危险变更）：${undecl.join(', ')}——本会话实际改动但未在 --files 边界内（自动推断漏掉），追加声明即可：`)
        console.error(`     sillyspec run quick --files ${undecl.join(',')} --change <id>（恢复会话追加边界，追加不替换）`)
      }
      if (news.length > 0) {
        flags.push('--allow-new')
        console.error(`   📋 新增文件待放行：${news.join(', ')}——确认收进本会话带 --allow-new。`)
      }
      if (prot.length > 0) {
        flags.push('--force-baseline')
        console.error(`   ⛔ 受保护/危险文件变更：${prot.join(', ')}——放行开关唯 --force-baseline（--files 只声明归属不改变危险判定）。`)
      }
      if (flags.length > 0) {
        console.error(`   解锁命令（按上方分类携带最小 flag 集）：`)
        console.error(`     sillyspec run quick --done ${flags.join(' ')} --change <id> --output "..."`)
      } else {
        console.error(`   如确认接受这些变更，重新运行 --done 时带上对应 flag 即可解锁：`)
        console.error(`     sillyspec run quick --done --force-baseline --allow-new --change <id> --output "..."`)
        console.error(`     （--force-baseline 覆盖受保护/危险文件如 src/run.js；--allow-new 允许新增文件；--allow-delete 允许删除文件）`)
      }
      // 两套开关明示（坑 files-flag-not-unlock-protected，2026-08-22 实证：模块文档被判危险
      // 文件，追加 --files 边界不解锁仍被拦——「追加边界」与「解锁拦截」是两套开关，交互上易误解
      // 前者能解决后者）。命中危险文件 reason 时点名：--files 只改归属口径（哪些文件计入本
      // 会话），不改变危险判定；受保护/危险文件的放行开关唯 --force-baseline。
      if (review.reasons.some(r => r.startsWith('危险文件变更'))) {
        console.error(`   ⛔ 注意：追加 --files 边界不会解锁受保护/危险文件的拦截（两套开关——--files 只声明哪些文件计入本会话，不改变危险判定）。改这类文件必须 --force-baseline。`)
      }
    }
  } else if (review.status === 'warning') {
    console.warn(`\n⚠️ quick 变更边界审计 — WARNING：`)
    for (const r of review.reasons) {
      console.warn(`   - ${r}`)
    }
    // WARNING 也给解法（坑 quick-audit-warning-no-guidance，2026-09-03 用户实证：--files 声明后
    // 追加测试文件 →「超出 allowedFiles」只列问题不给出路，非阻断但体验差——「别只警告」）。
    // 指引按 reason 类型给；其他 advisory（文档欠账/引用失效等）已有各自的处置行。
    const outOfDecl = review.reasons.filter((r) => r.startsWith('超出 allowedFiles'))
    const undeclaredNew = review.reasons.filter((r) => r.startsWith('新增文件'))
    if (outOfDecl.length > 0) {
      const sample = outOfDecl.map((r) => r.split(': ')[1]).filter(Boolean)[0] || '<追加文件>'
      console.warn(`   ➜ 出路：文件属本会话 → 带 --files（全量逗号分隔）重跑 --done 即并入边界，一条命令消掉本警告：`)
      console.warn(`     sillyspec run quick --done --files <已声明文件>,${sample} --change <会话ID>`)
      console.warn(`     （--files 只声明归属口径；确认收尾不想再改也可直接忽略本警告——非阻断。）`)
    }
    if (undeclaredNew.length > 0) {
      const sampleNew = undeclaredNew.map((r) => r.split(': ')[1]).filter(Boolean)[0] || '<新增文件>'
      console.warn(`   ➜ 出路：新增文件确认收进本会话 → --done 时 --files 声明归属 + --allow-new 放行新增：`)
      console.warn(`     sillyspec run quick --done --allow-new --files <原声明文件>,${sampleNew} --change <会话ID>`)
      console.warn(`     （两套开关：--files 管归属口径，--allow-new 管新增放行；不想要该文件可删除后再 --done。）`)
    }
  } else {
    // 区分「本轮新增」（changedFiles，已扣前序 baseline）vs「累计暂存」（stagedTotal，全部未提交）。
    // 仅当存在前序 baseline 残留（累计 > 本轮新增）时才追加括注，避免普通场景冗余。
    const stagedTotal = typeof review.stagedTotal === 'number' ? review.stagedTotal : review.changedFiles.length
    if (stagedTotal > review.changedFiles.length) {
      console.log(`\n✅ quick 变更边界审计 — SAFE (本轮新增变更 ${review.changedFiles.length} 个文件；累计暂存 ${stagedTotal} 个，含前序 baseline ${stagedTotal - review.changedFiles.length} 个未计入本轮)`)
    } else {
      console.log(`\n✅ quick 变更边界审计 — SAFE (本轮新增变更 ${review.changedFiles.length} 个文件)`)
    }
  }
  // 关联变更遗留放行提示（坑 linked-change-leftover-false-block，独立于三态都打——放行可见
  // 可审计，不静默）：这些文件属关联变更目录但不在本会话归属（启动后出现的他者遗留），
  // 已剔除出本会话文件行，由关联变更自己的流程收尾。
  if (Array.isArray(review.linkedChangeLeftovers) && review.linkedChangeLeftovers.length > 0) {
    console.warn(`
🧹 关联变更目录检测到 ${review.linkedChangeLeftovers.length} 个遗留脏文件（他者/上个 session 残留，非本会话改动）——已放行不计入本会话：`)
    for (const f of review.linkedChangeLeftovers) console.warn(`   - ${f}`)
    console.warn(`   它们归关联变更自己的流程管；若确系本会话需要改，用 --files 显式声明归属。`)
  }

  // 他者会话声明豁免提示（坑 foreign-session-declared-false-block，独立于三态都打——放行可见
  // 可审计，不静默，与上块同哲学）：多 agent 并发时并行 quick 会话 --files 已声明的文件在本会话
  // 窗口内出现——不属本会话，已退栈归该会话审计，本会话无需 --force-baseline。
  if (Array.isArray(review.foreignSessionDeclared) && review.foreignSessionDeclared.length > 0) {
    console.warn(`
🔗 ${review.foreignSessionDeclared.length} 个文件已由其他 active quick 会话声明——已剔除出本会话审计，归该会话边界管：`)
    for (const x of review.foreignSessionDeclared) console.warn(`   - ${x.file} ← ${(x.sessions || []).join(', ')}`)
    console.warn(`   并发下无需 --force-baseline：这些文件不属本会话。若确系本会话改动，恢复会话时 --files 追加声明归属（sillyspec run quick --files <file> --change <本会话ID>）；`)
    console.warn(`   他者会话若为崩溃残留（超 7 天未收尾），sillyspec run quick --cancel --change <他者会话ID> 清理后声明即失效。`)
  }

  // D-8 文档欠账显性化（advisory，独立于 status 三态都打）：改了源码没动文档 → 一行欠账标记。
  // 不阻断、不解锁、纯显性化——累积欠账可事后审计 QUICKLOG reasons 追溯。
  if (review.docSyncHint && review.docSyncHint.touchedSource > 0 && review.docSyncHint.docFiles.length === 0) {
    console.warn(`\n📝 文档欠账标记（D-8）：本次 ${review.docSyncHint.touchedSource} 个源码文件改动未同步任何模块文档。`)
    // O-1（docs-signals-o12）：模块归属——从"改了 N 文件"到"欠在哪"（matchFilesToModules 纯函数，map 缺失时空数组降级）
    if (Array.isArray(review.docSyncHint.modules) && review.docSyncHint.modules.length > 0) {
      console.warn(`   涉及模块：${review.docSyncHint.modules.map(m => m.id).join(' · ')}（模块卡待同步，execute 场景详见 [docs-debt] 块）`)
    }
    console.warn(`   quick 不强制文档同步，欠账已随本条 QUICKLOG「审计：」行落盘（可事后追溯）。若改动触及接口/契约，建议顺手同步模块文档。`)
  }
  if (review.docsCheckHint && review.docsCheckHint.invalid > 0) {
    console.warn(`\n📎 文档引用失效（docs check）：本次改动的文档含 ${review.docsCheckHint.invalid}/${review.docsCheckHint.total} 处失效 file:line 引用。`)
    // 逐条指名（2026-09-11 用户实证：只报计数不指名哪处，四轮复现才定位——门禁输出
    // 直接带 文件:行号，另跑命令是复现不是定位）；封顶 10 与生产端对齐，超出提示全量口径
    for (const i of (review.docsCheckHint.invalidRefs || [])) {
      console.warn(`   ❌ [${i.doc}:${i.docLine}] ${i.ref} → ${i.reason}`)
    }
    if (review.docsCheckHint.invalidTruncated) {
      console.warn(`   … 共 ${review.docsCheckHint.invalid} 处（上方封顶 10，全量跑 sillyspec docs check）`)
    }
    console.warn(`   行号漂移 → 更新到当前源码；文件删改名 → 更新引用路径。跑 sillyspec docs check 可看完整清单。`)
    console.warn(`   引用格式：\`src/foo.js:42\`（或 42-48）+ 同行反引号代码符号（如 \`runDocsCheck\`）——符号可让 --suggest 给出候选行号。`)
  }
  // task-03: 活文档引用真失效提示（advisory 不阻断，不改 status 三态判定）——方向与上方互补：
  // 上方查「本次改的文档」，这里查「本次改的 src 被活文档（platform-interface-map 等）引用」。
  // 2026-08-18 精度对齐：只渲染真失效引用（drift.invalid，auditQuickCompletion 已跑 runDocsCheck
  // 分层校验），行号锚未真断时零输出——不再「被引用即提示」误报。
  if (review.docsCheckHint && review.docsCheckHint.livingDocDrift) {
    const drift = review.docsCheckHint.livingDocDrift
    const invalid = Array.isArray(drift.invalid) ? drift.invalid : []
    const total = typeof drift.total === 'number' ? drift.total : drift.files.length
    if (invalid.length > 0) {
      console.warn(`\n📎 活文档引用真失效：${drift.files.length}/${total} 个改动 src 文件被 ${drift.docs.join('、')} 引用，其中 ${invalid.length} 处引用校验失败：`)
      for (const x of invalid.slice(0, 8)) {
        console.warn(`   - ${x.doc}:${x.docLine} \`${x.ref}\` → ${x.reason}`)
      }
      if (invalid.length > 8) console.warn(`   … 共 ${invalid.length} 处，跑 sillyspec docs check 看全量与建议行号`)
      else console.warn(`   行号漂移 → 更新到当前源码；跑 sillyspec docs check 可看建议行号。`)
    }
  }
}

/**
 * quick 阶段多变更交互式选择关联变更。
 * - 0 活跃变更 → []（仅记 QUICKLOG，不关联）
 * - 1 活跃变更 → 默认关联它（保持现状友好，不弹交互）
 * - ≥2 活跃变更 + 交互 → checkbox 多选（推荐项默认勾，空选 = 不关联）
 * - ≥2 活跃变更 + 非交互 → []（不关联）+ 提示用 --change a,b
 */
export async function resolveQuickLinkedChanges({ pm, cwd, specDir, quickFiles, taskDescription, nonInteractive }) {
  let activeChanges = []
  try {
    activeChanges = pm.listChanges(cwd)
  } catch {
    activeChanges = []
  }
  if (activeChanges.length === 0) return []
  if (activeChanges.length === 1) return [activeChanges[0]]

  if (nonInteractive || !process.stdin.isTTY) {
    console.log('💡 非交互环境，已默认不关联变更；如需关联请用 --change a,b')
    return []
  }

  // 脏文件（推荐信号之一）。safeGit 带 safe.directory，避免 linked worktree/容器/挂载点下裸
  // `git status` 抛错致推荐信号静默丢失（multi-agent-review Q3 同类）。推荐非关键路径，失败回退 []。
  // trim:false：porcelain 首行前导空格是状态码，trim 会削掉致 parsePorcelainPath 丢首字符。
  let baselineFiles = []
  const statusResult = safeGit(cwd, ['status', '--porcelain'], { trim: false })
  if (!statusResult.error) {
    baselineFiles = (statusResult.value || '').split('\n').filter(Boolean)
      .map(l => parsePorcelainPath(l))
      .filter(Boolean)
      .filter(f => !f.startsWith('.sillyspec/'))
  }

  // 推荐打分（脏文件 + 任务描述双信号）
  let recommendations = []
  try {
    // quick-recommend.js 在 src/，本模块在 src/run/ → 退一层（真环依赖，保留动态 import）
    const { recommendChanges } = await import('../quick-recommend.js')
    recommendations = recommendChanges({ activeChanges, specDir, baselineFiles, quickFiles, taskDescription })
  } catch {
    recommendations = activeChanges.map(name => ({ name, score: 0, reasons: [] }))
  }
  const scoreMap = new Map(recommendations.map(r => [r.name, r.score]))
  const reasonMap = new Map(recommendations.map(r => [r.name, r.reasons]))
  const recommendedSet = new Set(recommendations.filter(r => r.score > 0).map(r => r.name))

  // 按推荐分降序展示
  const ordered = [...activeChanges].sort((a, b) =>
    (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0) || a.localeCompare(b))

  const choices = ordered.map(name => {
    const reasons = reasonMap.get(name) || []
    const isRec = recommendedSet.has(name)
    return {
      name: `${isRec ? '⭐ ' : '   '}${name}`,
      value: name,
      description: reasons.length > 0 ? reasons.join('；') : '无推荐信号',
      checked: isRec,
    }
  })

  console.log('🔗 检测到多个活跃变更，选择本次 quick 关联哪些（可多选；不勾选任何项 = 仅记 QUICKLOG，不关联变更）')
  if (recommendedSet.size > 0) {
    console.log('   ⭐ = 基于脏文件/任务描述推荐，已默认勾选')
  }
  // 动态 import：@inquirer/prompts 只在本交互分支加载，不进 run 命令通用启动路径
  const { checkbox } = await import('@inquirer/prompts')
  const selected = await checkbox({ message: '关联变更（空格切换，回车确认）', choices })
  return selected
}

// ============ quick --done test+lint 硬门禁（2026-09-02 跨 agent 工单 P0-2）============

/**
 * 语义护栏命中组装（change: 2026-09-11-cross-change-decision-guard，task-06，FR-04，
 * D-001@v1）：断言重写检测 ∩ 近因他者交付归因 → hits 清单，gate 内一行调用拼进返回对象。
 * 单独抽出导出是为了可测性（runQuickTestLintGate 会真跑 test/lint 命令，检测组装层
 * 独立测可避免测试里真跑 npm test——卡内可测性豁免）。
 * - 步骤 0 总开关：readSemanticGuardEnabled false → 跳过检测，hits 恒空（fail-open 同 task-03）
 * - 纯新增断言（detect 不命中）/ 无他者归因标记 / 非测试文件 → 落不到 hits
 * - WARNING 级非阻断：本函数只组装数据，不参与 gate action/failed 判定
 * @param {{ cwd?: string, specBase?: string, files?: string[], changeName?: string|null }} opts
 * @returns {{ hits: Array<{ file: string, deliveredBy: string, sampleLines: string[] }> }}
 */
export function buildSemanticGuardHits({ cwd, specBase, files, changeName } = {}) {
  if (!readSemanticGuardEnabled(specBase)) return { hits: [] }
  const rewrites = detectAssertionRewrites({ cwd, files: Array.isArray(files) ? files : [] })
  if (Object.keys(rewrites).length === 0) return { hits: [] }
  // 归因只查断言命中文件（省 git log 调用；collectRecentForeignDelivery 内部封顶 20 文件）
  const delivery = collectRecentForeignDelivery({ cwd, files: Object.keys(rewrites), currentChange: changeName })
  const hits = []
  for (const file of Object.keys(rewrites)) {
    // 无归因不点名：纯新增断言 / 无标记提交 / 交付者是本变更（currentChange 透传跳过）同落空
    if (!delivery[file]) continue
    hits.push({ file, deliveredBy: delivery[file], sampleLines: rewrites[file] })
  }
  return { hits }
}

/**
 * quick --done 内置 test+lint 实测门禁：把 CLAUDE.md 规则 8「触及 src/test 的改动先
 * npm test + npm run lint」从 agent 自律下沉为 CLI 卡点。
 *
 * 语义（对齐规则 8 + verify-postcheck 既有降级哲学）：
 *   - 变更文件未触及 src/ 或 test/（纯 doc/配置改动）→ skip（不跑不阻断）
 *   - 触及 → 亲自执行 local.yaml 的 commands.test / commands.lint（复用 verify 阶段
 *     对账引擎 runVerifyTestCheck/runVerifyLintCheck，含 test_strategy/known_failures/
 *     超时语义）；未配置命令 → 内部 skipped，不阻断（兼容无测试项目）
 *   - 任一实测 failed → fail（调用方阻断 --done，step 回 pending）
 *   - 逃生门：SILLYSPEC_QUICK_TEST_GATE=skip 显式跳过（CI/特殊场景，审计留痕）
 *   - 倒推 B 模式兜底（2026-09-07，quick-f9138c2f 实证）：代码先行会话的文件全部早于
 *     启动时间窗 → 审计 changedFiles 为空 → 此前静默 skip；--files 声明边界
 *     （declaredFiles = guard.allowedFiles）明确触及 src/test 时实测仍应跑。
 *
 * verify-postcheck 顶层 import 链较重（contract-matrix 等），且本函数仅 quick --done
 * 收尾路径调用——用动态 import，不进 run 命令通用启动路径（与上方 @inquirer/prompts 同款纪律）。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 仓库根（命令执行 cwd）
 * @param {string} opts.specBase - .sillyspec 目录（local.yaml 读取源，信任边界见 runVerifyTestCheck SEC-02 注释）
 * @param {string[]} [opts.changedFiles] - 审计口径的本轮变更文件（仓库根相对 POSIX 路径；空/null → 回退 declaredFiles）
 * @param {string[]} [opts.declaredFiles] - 会话声明边界（guard.allowedFiles；changedFiles 为空时的兜底判定源）
 * @param {string} [opts.changeName] - quick 会话名（evidence-auto 策略解析用 + 语义护栏归因 currentChange 透传）
 * @returns {Promise<{action:'pass'|'fail'|'skip', failed:string[], reason:string, test:object|null, lint:object|null,
 *   semanticGuard?:{hits:Array<{file:string,deliveredBy:string,sampleLines:string[]}>}}>}
 *   semanticGuard 仅检测跑过（三条早退 skip 路径不跑检测、无字段）时挂载；WARNING 级
 *   非阻断——action/failed 判定不受它影响（调用方 complete-handlers.js 只读 action/failed，零改动）。
 */
export async function runQuickTestLintGate({ cwd, specBase, changedFiles = [], declaredFiles = [], changeName = null }) {
  if (process.env.SILLYSPEC_QUICK_TEST_GATE === 'skip') {
    return { action: 'skip', failed: [], reason: 'SILLYSPEC_QUICK_TEST_GATE=skip 显式跳过（审计留痕）', test: null, lint: null }
  }
  const audited = Array.isArray(changedFiles) ? changedFiles : []
  // 倒推 B 模式兜底：审计口径为空时回退声明边界（文件早于会话启动被基线吸收的场景）
  const files = audited.length > 0 ? audited : (Array.isArray(declaredFiles) ? declaredFiles : [])
  const fileSource = audited.length > 0 ? '审计' : (files.length > 0 ? '声明边界兜底（倒推 B：文件早于会话启动被基线吸收）' : '无')
  const codeFiles = files.filter(f => typeof f === 'string' && (f.startsWith('src/') || f.startsWith('test/')))
  if (files.length === 0) {
    return { action: 'skip', failed: [], reason: `无变更文件清单（${fileSource}口径均空——brownfield 无 guard 或空审计），跳过`, test: null, lint: null }
  }
  if (codeFiles.length === 0) {
    return { action: 'skip', failed: [], reason: `纯 doc/配置改动（${files.length} 个文件均未触及 src/test，规则 8 语义跳过 test+lint）`, test: null, lint: null }
  }

  // ── 语义护栏检测（task-06，FR-04 断言重写 WARNING，D-001@v1 非阻断）──
  // 三条早退（env skip / 无文件 / 纯 doc）已在上文 return，检测不跑——语义一致。
  // 检测对主仓 cwd 执行而非 gateCwd 隔离快照（下方才建快照）：检测对象是本会话工作树
  // 未提交改动（git diff HEAD 须见它），快照语义是 test/lint 实测隔离——两者不同层
  // （Grill X-001 附注）。specBase 同理用主仓的（快照副本 local.yaml 不参与开关判定）。
  const semanticGuard = buildSemanticGuardHits({ cwd, specBase, files, changeName })

  const { runVerifyTestCheck, runVerifyLintCheck } = await import('../verify-postcheck.js')

  // ── 隔离快照执行（2026-09-10 驾驭小结第六批②，用户实证「lint 实测对账在主仓跑被并行
  // 会话脏文件拦门」）：HEAD 干净快照 + 本会话文件 overlay 后在快照内跑 test+lint——并行
  // 会话的未提交改动不再污染本会话门禁。快照基建失败 → 回退主仓现行为（零回归）。
  // 门禁结果归属：快照内失败 = HEAD+本会话文件的真实失败（拦得对）；主仓 fallback 失败
  // 语义同旧版。两条路径的命令/超时/known_failures 语义同源（runVerify*Check 只换 cwd）。
  let gateCwd = cwd
  let gateSpecBase = specBase
  let snapshot = null
  if (files.length > 0 && !process.env.SILLYSPEC_QUICK_GATE_SNAPSHOT_OFF) {
    try {
      const { createGateSnapshot } = await import('./gate-snapshot.js')
      snapshot = createGateSnapshot({ cwd, files })
      if (snapshot) {
        gateCwd = snapshot.snapshotRoot
        gateSpecBase = join(snapshot.snapshotRoot, '.sillyspec')
        console.log(`🧪 门禁隔离快照：HEAD + 本会话 ${snapshot.overlaid} 个文件（并行会话脏文件不参与判定）`)
      }
    } catch { /* 快照链路异常 → 主仓现行为 */ }
  }
  try {
    const test = runVerifyTestCheck({ cwd: gateCwd, specBase: gateSpecBase, changeName })
    const lint = runVerifyLintCheck({ cwd: gateCwd, specBase: gateSpecBase })
    const failed = []
    if (test.status === 'failed') failed.push('test')
    if (lint.status === 'failed') failed.push('lint')
    return {
      action: failed.length > 0 ? 'fail' : 'pass',
      failed,
      reason: failed.length > 0
        ? `实测失败：${failed.join(' + ')}（命令与输出尾部见上；修复后重跑 --done 不丢进度）`
        : `触及 src/test 共 ${codeFiles.length} 个文件，test+lint 实测通过（或未配置命令自动跳过）${snapshot ? '（隔离快照口径：并行会话脏文件不计入）' : ''}`,
      test,
      lint,
      // 语义护栏 WARNING（task-06）：只增可选字段，action/failed 判定与调用方读取面均不受影响
      semanticGuard,
    }
  } finally {
    if (snapshot) { try { snapshot.cleanup() } catch { /* 清理失败不连坐门禁结论 */ } }
  }
}

/**
 * 打印 quick test+lint 门禁结论（fail 时附输出尾部，供 agent 直接定位修复）。
 */
export function printQuickTestLintGate(gate) {
  if (!gate) return
  if (gate.action === 'skip') {
    console.log(`\n🧪 quick test+lint 门禁 — SKIP：${gate.reason}`)
    return
  }
  for (const [label, r] of [['test', gate.test], ['lint', gate.lint]]) {
    if (!r) continue
    const icon = r.status === 'failed' ? '❌' : r.status === 'passed' ? '✅' : '⏭️'
    const dur = typeof r.durationMs === 'number' ? ` (${(r.durationMs / 1000).toFixed(1)}s)` : ''
    console.log(`${icon} ${label}: ${r.status}${r.command ? ` ← ${r.command}${dur}` : ''}${r.status === 'skipped' && r.reason ? ` — ${r.reason}` : ''}`)
  }
  if (gate.action === 'fail') {
    console.error(`\n🚫 quick test+lint 门禁 — BLOCKED：${gate.reason}`)
    for (const key of gate.failed) {
      const r = gate[key]
      if (r && r.outputTail) console.error(`   ── ${key} 输出尾部 ──\n${r.outputTail}`)
    }
    console.error(`   quick 已停止：修复后重跑 --done（进度不丢）；确认要跳过实测请设 SILLYSPEC_QUICK_TEST_GATE=skip（审计留痕）。`)
  } else {
    console.log(`\n✅ quick test+lint 门禁 — PASS（${gate.reason}）`)
  }

  // 语义护栏 WARNING（task-06 / FR-04，非阻断——D-001@v1：误报校准数据为零先 advisory，
  // 复潮条件：误报率实证后可升 block）：他者近因交付的测试文件既有断言行被改 → 点名
  // 文件 + 交付变更 + 被改样例行（上游 detectAssertionRewrites 已封顶 5/文件，渲染侧
  // 再 slice(0,5) 兜底）。hits 空 / 字段缺失（三条早退 skip 路径不跑检测）→ 零输出。
  const sgHits = gate.semanticGuard && Array.isArray(gate.semanticGuard.hits) ? gate.semanticGuard.hits : []
  if (sgHits.length > 0) {
    console.warn(`\n⚠️ 语义护栏 — 断言重写 WARNING（非阻断）：他者近因交付的测试文件既有断言被改`)
    for (const h of sgHits) {
      console.warn(`   - ${h.file} ← ${h.deliveredBy} 交付`)
      for (const s of (h.sampleLines || []).slice(0, 5)) console.warn(`       被改: ${String(s).trim()}`)
    }
    console.warn(`   ➜ 若确需重写：重写理由写进 quicklog --solution（--done 四参数收尾）；并复查 ${[...new Set(sgHits.map(h => h.deliveredBy))].join('、')} 的关联决策——勿以改断言重定义绿灯。`)
  }
}
