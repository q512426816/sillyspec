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
  // spec 共享面他者噪声（坑 foreign-spec-churn-fail-closed）：并行会话归档移动/文档收尾的
  // 删除与 EOL-only 假 M——软警告点名归因，不再逼 --allow-delete/--allow-new 解锁。
  if (review.foreignSpecChurn && review.foreignSpecChurn.length > 0) {
    console.warn(`⚠️ spec 共享面 ${review.foreignSpecChurn.length} 个非本会话声明的删除（.sillyspec/ docs/，疑似并行会话归档移动/收尾——归其会话收口，本会话不阻断）：`)
    for (const f2 of review.foreignSpecChurn.slice(0, 6)) console.warn(`   - ${f2}`)
    if (review.foreignSpecChurn.length > 6) console.warn(`   … 共 ${review.foreignSpecChurn.length} 个`)
  }
  if (review.eolOnlyFiles && review.eolOnlyFiles.length > 0) {
    console.warn(`⚠️ ${review.eolOnlyFiles.length} 个文件仅行尾重写（内容零变化，生成命令/编辑器 CRLF 假 M——已剔出本会话审计）：${review.eolOnlyFiles.slice(0, 5).join('、')}${review.eolOnlyFiles.length > 5 ? ' 等' : ''}`)
    console.warn(`   根治：.gitattributes 声明 text=auto eol=lf（或按文件类型钉死），生成器重写不再制造假 M`)
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

  // ── [gate] 分级门禁 advisory 块（FR-03，2026-09-14-quick-exit-tiered-gates task-02）：L1/L2 画像
  // 打印级别/跨度/模块清单/风险命中/检查项 + --no-docs 指引，L0 零输出。全部 advisory：不改 status
  // 三态与 exit code（D-003）；窗口内未声明脏文件维持既有归属分流（上方 ⚖️/🔍 块），不并入文档
  // 认领判定（D-005）；数据源 = review.gateProfile（auditQuickCompletion 挂载，scope-audit 重放同源）。
  const gate = review.gateProfile
  if (gate && (gate.level === 'L1' || gate.level === 'L2')) {
    const isL2 = gate.level === 'L2'
    const spanTxt = gate.degraded
      ? 'module-map 缺失（降级档：按文件数判级）'
      : `跨 ${gate.moduleSpan} 模块${Array.isArray(gate.modules) && gate.modules.length > 0 ? `（${gate.modules.map(m => m.id).join(' · ')}）` : ''}`
    console.warn(`\n${isL2 ? '🛑' : '🚧'} [gate] ${gate.level} 规模门（${spanTxt} · ${gate.fileCount} 文件：${gate.codeFileCount} 代码 / ${gate.testFileCount} 测试）——advisory 提示不阻断：`)
    if (Array.isArray(gate.unmappedFiles) && gate.unmappedFiles.length > 0) {
      console.warn(`   ⚠️ ${gate.unmappedFiles.length} 个文件未命中 module-map（${gate.unmappedFiles.slice(0, 5).join(', ')}${gate.unmappedFiles.length > 5 ? ' 等' : ''}）`)
    }
    if (!isL2) {
      // L1 检查项：每文件注记（--file-notes 覆盖率）+ 测试增量（机械规则）
      console.warn(`   - 每文件注记检查：${gate.checks?.perFileNotes ? '✅ --file-notes 已覆盖全部变更文件' : `❌ 缺失——补 --file-notes "path1::注 || path2::注"（覆盖变更文件全集）`}`)
      const td = gate.checks?.testDelta
      console.warn(`   - 测试增量检查：${td === 'missing' ? `❌ missing——${gate.codeFileCount} 个代码文件改动无测试文件（补 test 改动进本会话）` : td === 'ok' ? '✅ 已含测试改动' : '— 不适用（≤1 代码文件）'}`)
    } else {
      // L2 检查项：模块文档认领（claimed/missing/exempt-no-docs）+ 风险命中的运行时证据要求
      const dc = gate.checks?.docClaim
      const noClaimable = gate.degraded || !Array.isArray(gate.modules) || gate.modules.length === 0
      if (dc === 'exempt-no-docs') {
        console.warn(`   - 模块文档认领：🛡️ 已 --no-docs 显式豁免（豁免已留痕 QUICKLOG 审计行）`)
      } else if (noClaimable) {
        // degraded / 无触及模块：computeGateProfile 空真 claimed——如实显示不适用，不出「已认领」误导
        console.warn(`   - 模块文档认领：— 不适用（${gate.degraded ? '无 module-map' : '触及文件均未命中模块'}，无可认领卡片）`)
      } else if (dc === 'claimed') {
        console.warn(`   - 模块文档认领：✅ 触及模块的卡片文件已在改动集`)
      } else {
        console.warn(`   - 模块文档认领：❌ missing——触及模块（${Array.isArray(gate.modules) && gate.modules.length > 0 ? gate.modules.map(m => m.id).join(' · ') : '—'}）的卡片文件不在改动集`)
        console.warn(`     ➜ 同步模块卡进本次改动，或确认无需文档落盘时 --done 带 --no-docs 显式豁免（豁免留痕，不阻断完成）`)
      }
      if (Array.isArray(gate.riskHits) && gate.riskHits.length > 0) {
        console.warn(`   - 风险命中 ${gate.riskHits.length} 处（运行时证据要求——风险路径改动需在 --result「结果：」附运行验证说明，advisory 不等待）：`)
        for (const h of gate.riskHits.slice(0, 8)) {
          console.warn(`       ⚠️ ${h.pattern} ← ${h.file}`)
        }
        if (gate.riskHits.length > 8) console.warn(`       … 共 ${gate.riskHits.length} 处`)
      }
    }
  }
}

/**
 * [gate] 分级门禁 auditNote 组装（FR-03 task-02，gate-audit-note）：L1/L2 → 单行 `[gate]` 注记
 * （随 complete-handlers 既有 auditNotes 通道落 QUICKLOG，--no-docs 豁免同通道留痕）；
 * L0 / 无画像 → null（零落账，验收「L0 无 gate 落账行」）。纯函数、与上方 [gate] 打印块同一
 * review.gateProfile 数据源；单独导出为可测（buildSemanticGuardHits 同款考量——避开
 * handleQuickStageCompletion 的 quicklog 重机件直测组装层）。
 * @param {object|null} gate review.gateProfile（auditQuickCompletion 产物；null/异常形状 → null）
 * @returns {string|null}
 */
export function buildGateAuditNote(gate) {
  if (!gate || typeof gate !== 'object' || (gate.level !== 'L1' && gate.level !== 'L2')) return null
  const span = gate.degraded
    ? 'module-map 缺失（降级档按文件数判级）'
    : `跨 ${gate.moduleSpan} 模块`
  const seg = [`[gate] ${gate.level}（${span} · ${gate.fileCount} 文件：${gate.codeFileCount} 代码/${gate.testFileCount} 测试）advisory`]
  if (gate.level === 'L1') {
    seg.push(`每文件注记${gate.checks?.perFileNotes ? '已全覆盖' : '缺失（--file-notes 覆盖变更文件全集）'}`)
    const td = gate.checks?.testDelta
    seg.push(`测试增量${td === 'ok' ? '已含' : td === 'missing' ? `缺失（${gate.codeFileCount} 个代码文件无测试改动）` : '不适用（≤1 代码文件）'}`)
  } else {
    const dc = gate.checks?.docClaim
    const noClaimable = gate.degraded || !Array.isArray(gate.modules) || gate.modules.length === 0
    seg.push(dc === 'exempt-no-docs' ? '模块文档认领已 --no-docs 显式豁免'
      : noClaimable ? '模块文档认领不适用（无可认领模块）'
        : dc === 'claimed' ? '模块文档认领已覆盖（模块卡在改动集）'
          : '模块文档认领缺失（同步模块卡进改动集，或 --no-docs 显式豁免）')
    if (Array.isArray(gate.riskHits) && gate.riskHits.length > 0) {
      seg.push(`风险命中 ${gate.riskHits.length} 处（${gate.riskHits.slice(0, 5).map(h => `${h.pattern}←${h.file}`).join('、')}${gate.riskHits.length > 5 ? ' 等' : ''}）需运行时证据`)
    }
  }
  return seg.join('；')
}

/**
 * quick 阶段关联变更解析（含单候选信号门控）。
 * - 0 活跃变更 → 不关联
 * - 1 活跃变更 → 跑 recommendChanges 双信号打分：命中（score>0）→ 自动关联 + 大声提示
 *   + autoLinked 溯源；未命中 → 不关联 + 提示。坑 quick-single-change-auto-link（2026-09-14
 *   实证）：原实现无条件 `return [activeChanges[0]]`——多 agent 仓库里唯一活跃变更常是他者
 *   会话遗留，挂载污染 tasks.md 且 --done 僵尸清理通道可误归档他者变更；单候选还绕过
 *   recommend 的 quick-<hex8> 会话过滤（新 quick 互挂另一活跃 quick）。
 * - ≥2 活跃变更 + 交互 → checkbox 多选（推荐项默认勾，空选 = 不关联）
 * - ≥2 活跃变更 + 非交互 → 不关联 + 提示用 --change a,b
 * @returns {Promise<{changes: string[], autoLinked: string[]}>} changes=最终关联清单；
 *   autoLinked=其中机器自动关联的子集（guard 落 linkedChangesAuto 溯源，--done 归档闸消费）
 */
export async function resolveQuickLinkedChanges({ pm, cwd, specDir, quickFiles, taskDescription, nonInteractive }) {
  let activeChanges = []
  try {
    activeChanges = pm.listChanges(cwd)
  } catch {
    activeChanges = []
  }
  if (activeChanges.length === 0) return { changes: [], autoLinked: [] }

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

  // 推荐打分（脏文件 + 任务描述双信号）——单候选也跑（信号门控），非仅 ≥2 交互推荐用
  let recommendations = []
  try {
    // quick-recommend.js 在 src/，本模块在 src/run/ → 退一层（真环依赖，保留动态 import）
    const { recommendChanges } = await import('../quick-recommend.js')
    recommendations = recommendChanges({ activeChanges, specDir, baselineFiles, quickFiles, taskDescription })
  } catch {
    recommendations = activeChanges.map(name => ({ name, score: 0, reasons: [] }))
  }

  // 单候选信号门控（坑 quick-single-change-auto-link）：有真实信号（脏文件命中 design 清单 /
  // 任务描述命中 proposal）才自动关联，且大声提示可反悔；无信号一律不关联。quick-<hex8> 会话
  // 行已被 recommendChanges 过滤 → recommendations 无该候选 → 不关联（防会话互挂）。
  if (activeChanges.length === 1) {
    const name = activeChanges[0]
    const rec = recommendations.find(r => r.name === name)
    if (rec && rec.score > 0) {
      console.log(`🔗 唯一活跃变更 ${name} 命中关联信号（${rec.reasons.slice(0, 2).join('；')}）——已自动关联；无关请带 --linked-changes none 重启`)
      return { changes: [name], autoLinked: [name] }
    }
    console.log(`💡 唯一活跃变更 ${name} 未命中关联信号（任务描述/脏文件无重叠）——默认不关联；如需关联请带 --linked-changes ${name} 重启`)
    return { changes: [], autoLinked: [] }
  }

  if (nonInteractive || !process.stdin.isTTY) {
    console.log('💡 非交互环境，已默认不关联变更；如需关联请用 --change a,b')
    return { changes: [], autoLinked: [] }
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
  // 用户在 TTY 上亲手勾选确认 = 显式协作声明，不进 autoLinked
  return { changes: selected, autoLinked: [] }
}

// ============ quick --done test+lint 硬门禁（2026-09-02 跨 agent 工单 P0-2）============

// ── 测试最低面 advisory（资产三小件②，2026-09-23）口径常量 ──
// 代码文件判定双通道（原为 runQuickTestLintGate 函数内常量，advisory 复用同口径提为模块级；
// 无 /g 标志无状态，提级零行为差）：
//   ① 路径段匹配：任意层出现 src / test / tests / __tests__ 段（src-guide 等长名不误蹭——按段全等）
//   ② 代码扩展名兜底：src/test 目录约定外的代码（backend/app/**.py、scripts/*.go 等）
const CODE_PATH_SEGMENT_RE = /(^|\/)(src|tests?|__tests__)(\/|$)/
const CODE_EXTENSION_RE = /\.(?:js|mjs|cjs|ts|tsx|jsx|py|pyw|go|rs|java|kt|kts|rb|php|cs|c|h|cpp|cc|hpp|swift|scala|groovy|vue|svelte)$/

// 测试文件判定：目录段（test/tests/__tests__——比 quick-gate-profile 的 TEST_DIR_RE 多认裸
// test/ 段，本仓 test/ 下即有无 .test. 后缀的 .mjs）+ basename test_ 前缀 + .test./_test./.spec.
// 命名三信号任一命中（与 quick-gate-profile isTestPath 同判法补 test 段）。
const ADVISORY_TEST_DIR_RE = /(^|\/)(test|tests|__tests__)(\/|$)/i

function isAdvisoryTestPath(p) {
  if (ADVISORY_TEST_DIR_RE.test(p)) return true
  const base = p.slice(p.lastIndexOf('/') + 1)
  if (/^test_/i.test(base)) return true
  return /[._](test|spec)\.[^.]+$/i.test(base)
}

/** 最低测试面 advisory 阈值：src 类交付文件 ≥3 且测试改动 0 才出警示（R7-L 重放校准） */
const MIN_SRC_FILES_FOR_TEST_ADVISORY = 3

/**
 * 测试最低面 advisory（资产三小件②，advisory 不阻断——测试门 fail-closed 语义零改动）。
 *
 * 背景：R7-L 重放实测测试量仅为旧流程 40%（1162 vs 2909 行）——薄道/burst 收口走
 * runQuickTestLintGate，无 quick 出口 L1 门禁的 testDelta 检查，测试厚度零约束。
 * 判定：变更交付文件（非 .sillyspec）中 src 类文件（代码双通道判定 × 非测试文件）
 * ≥3 个而测试文件 0 个改动（P2 账本测试面亦无增量可对账——账本测试面=test/ 目录
 * 内容摘要，测试零改动=两信号同态）→ 返回一行警告文案；负例（有测试改动/纯 doc/
 * 少文件）返回 null。
 * @param {string[]} files 变更文件清单（changedFiles 审计口径或 declaredFiles 兜底口径）
 * @returns {string|null}
 */
export function buildTestSurfaceAdvisory(files) {
  const list = (Array.isArray(files) ? files : [])
    .map((f) => String(f).replace(/\\/g, '/'))
    .filter((f) => f && !f.startsWith('.sillyspec/'))
  let srcCount = 0
  let testCount = 0
  for (const f of list) {
    if (isAdvisoryTestPath(f)) { testCount++; continue }
    if (CODE_PATH_SEGMENT_RE.test(f) || CODE_EXTENSION_RE.test(f)) srcCount++
  }
  if (srcCount < MIN_SRC_FILES_FOR_TEST_ADVISORY || testCount > 0) return null
  return `⚠️ 测试面厚度 advisory：交付面 ${srcCount} 个 src 类文件但测试面为空（0 个测试文件改动，P2 账本测试面无增量可对账），确认无需测试增量？（advisory 不阻断——薄道/burst 实证测试量仅为旧流程 40%）`
}

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
/**
 * 门禁文件集合并（ql-018）：审计口径 ∪ 声明边界，去重保序（审计在前）。声明文件即使被
 * 审计判为「前序 baseline 未计入本轮」也随会话进快照——声明即边界（治 declared∩前序脏
 * 被二选一丢弃→快照 HEAD 旧版→门禁恒假红，2026-09-23 ql-017 三轮实证）。纯函数。
 */
export function mergeGateFiles(audited, declared) {
  const out = []
  const seen = new Set()
  for (const f of [...(Array.isArray(audited) ? audited : []), ...(Array.isArray(declared) ? declared : [])]) {
    if (typeof f !== 'string' || !f || seen.has(f)) continue
    seen.add(f)
    out.push(f)
  }
  return out
}

export async function runQuickTestLintGate({ cwd, specBase, changedFiles = [], declaredFiles = [], changeName = null }) {
  if (process.env.SILLYSPEC_QUICK_TEST_GATE === 'skip') {
    return { action: 'skip', failed: [], reason: 'SILLYSPEC_QUICK_TEST_GATE=skip 显式跳过（审计留痕）', test: null, lint: null }
  }
  const audited = Array.isArray(changedFiles) ? changedFiles : []
  // 门禁文件集 = 审计 ∪ 声明边界（并集，2026-09-23 ql-018 修复）：旧口径二选一（审计非空时
  // 丢弃 declaredFiles）致「declared ∩ 会话启动前已脏」的文件不进快照 overlay——快照装 HEAD
  // 旧版，本会话新增导出缺失，快照内测试 import 即炸且重跑恒红（快照分叉家族第三 sibling
  // 的根治件：声明过的文件无论审计口径是否计入，一律随会话进快照——声明即边界）。倒推 B
  // 兜底语义保留（审计为空时 declaredFiles 独撑，与旧版一致）；并集对快照零成本（overlay 与
  // HEAD 同内容的文件不产生差异）。
  const files = mergeGateFiles(audited, Array.isArray(declaredFiles) ? declaredFiles : [])
  const fileSource = audited.length > 0
    ? (files.length > audited.length ? `审计∪声明（审计 ${audited.length} + 声明补入 ${files.length - audited.length}）` : '审计')
    : (files.length > 0 ? '声明边界兜底（倒推 B：文件早于会话启动被基线吸收）' : '无')
  // 代码文件判定（2026-09-19 monorepo 子包实证修复：multi-agent-platform 回带收口 6 个
  // sillyhub-daemon/src/**、frontend/src/** 文件被「纯 doc/配置」误判跳过实测）：旧口径只认
  // 仓根 src/、test/ 前缀——monorepo 子包（<pkg>/src/**、backend/app/**.py）全漏。
  // 新口径双通道，方向取「宁可多跑不可漏跑」（门禁漏跑=静默放行，多跑只是费一次实测），
  // 常量已提为模块级 CODE_PATH_SEGMENT_RE / CODE_EXTENSION_RE（advisory 同口径复用）。
  const codeFiles = files.filter(
    (f) => typeof f === 'string' && (CODE_PATH_SEGMENT_RE.test(f) || CODE_EXTENSION_RE.test(f)),
  )
  if (files.length === 0) {
    return { action: 'skip', failed: [], reason: `无变更文件清单（${fileSource}口径均空——brownfield 无 guard 或空审计），跳过`, test: null, lint: null }
  }
  if (codeFiles.length === 0) {
    return { action: 'skip', failed: [], reason: `纯 doc/配置改动（${files.length} 个文件均未触及 src/test，规则 8 语义跳过 test+lint）`, test: null, lint: null }
  }

  // ── 测试最低面 advisory（资产三小件②）：放在两条早退之后——纯 doc/env skip/空清单
  //    天然零输出（负例语义）；此处测试门确定要跑，厚度提示与实测结论同场可见。──
  const surfaceAdvisory = buildTestSurfaceAdvisory(files)
  if (surfaceAdvisory) console.warn(`\n${surfaceAdvisory}`)

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
    // worktree 会话跳快照（2026-09-23 R9/R10 根治，与 verify-quality-scan 同款）：worktree
    // 已是会话独占隔离，快照只剩 junction 冻结/慢 I/O 纯成本——直接 worktree 实测。
    let skipForWorktree = false
    try {
      const { shouldSkipGateSnapshotForWorktree } = await import('./gate-snapshot.js')
      skipForWorktree = shouldSkipGateSnapshotForWorktree(cwd)
    } catch { /* 判定异常按不跳走原路 */ }
    if (skipForWorktree) {
      console.log('🔀 cwd 是会话专属 worktree——隔离快照冗余（并行会话不在场），直接在 worktree 实测')
    } else {
    try {
      const { createGateSnapshot } = await import('./gate-snapshot.js')
      // 账本 runtimeRoot（2026-09-24-gate-snapshot-lifecycle task-03）：同本文件 P2 三键
      // 账本咨询口径（下方 ~570 行 resolveRuntimeRoot(null, specBase)）单源；解析失败传 null
      // （账本链路 no-op，禁从 cwd 猜）
      let runtimeRoot = null
      try {
        const { resolveRuntimeRoot } = await import('./shared.js')
        runtimeRoot = resolveRuntimeRoot(null, specBase)
      } catch { runtimeRoot = null }
      snapshot = createGateSnapshot({ cwd, files, runtimeRoot })
      if (snapshot) {
        gateCwd = snapshot.snapshotRoot
        gateSpecBase = join(snapshot.snapshotRoot, '.sillyspec')
        console.log(`🧪 门禁隔离快照（根：${snapshot.snapshotRoot}）：HEAD + 本会话 ${snapshot.overlaid} 个文件（并行会话脏文件不参与判定）`)
      }
    } catch { /* 快照链路异常 → 主仓现行为 */ }
    }
  }
  try {
    // ── P2 三键账本（D-001@v1，batch3 task-01）：同码同环境免重跑（fail-closed——无记录/
    //    键不等/分量不可得=真跑，行为不变）。quick 会话名 per-change 天然隔离账本文件。──
    let testLedgerReuse = null
    if (changeName) {
      try {
        const { consultTestLedger } = await import('./test-ledger.js')
        const { resolveRuntimeRoot } = await import('./shared.js')
        const consult = consultTestLedger({
          runtimeRoot: resolveRuntimeRoot(null, specBase), changeName,
          projectRoot: gateCwd, testRoot: join(gateCwd, 'test'), specBase: gateSpecBase, cwd: gateCwd,
        })
        if (consult.reuse) testLedgerReuse = consult
      } catch { /* 咨询异常 → 真跑 */ }
    }
    if (!testLedgerReuse) {
      // 沙箱实测预告（坑 quick-done-长静默与快照行尾假阳性 坑1，2026-09-21 实证）：快照内
      // test+lint 实测大仓可达 841-1054s 且期间零输出——外层 exec 按「疑似挂死」杀进程每轮
      // 重建沙箱耗时成倍。预告时长预期与勿杀指引（心跳输出需异步改造留专项，预告先消除
      // 「零信息误判」主因）。
      console.log(`⏳ 开始 test+lint 实测${snapshot ? '（隔离快照内）' : ''}——大仓全量可达 15-20 分钟，期间无输出属正常；后台跑 + 长容忍（≥20 分钟），勿按超时杀进程（杀掉不丢进度，但每轮重建沙箱重跑实测耗时成倍）。`)
    }
    let test = testLedgerReuse
      ? { status: 'passed', reason: `♻️ P2 三键账本复用（代码×测试面×环境全等；实测于 ${testLedgerReuse.result.ranAt}）`, command: `${testLedgerReuse.runPlan?.[0]?.runner || 'npm test'} (ledger-reuse)`, exitCode: 0, durationMs: 0, outputTail: null }
      // restrictFiles = 本会话声明文件（坑 quick-gate-并行全流程变更脏文件误伤）：模块选择
      // 与 deps(auto) 只取「实际变更 ∩ 本会话声明」，并行全流程变更 WIP 不再挡死本会话
      : runVerifyTestCheck({ cwd: gateCwd, specBase: gateSpecBase, changeName, restrictFiles: files })
    // 快照 test 超时/零输出冻结 → 主仓复跑（R9 实证 2026-09-23；对齐 2026-09-12 lint 同款
    // 回退先例——快照内 junction I/O 病态慢/venv 冻结无解，主仓口径保硬门；并行噪声混入时
    // 失败输出带归属鉴定提示兜底）。冻结特征=超时且 outputTail 空（真慢套件有持续输出）。
    if (snapshot && test.status === 'failed' && /超时/.test(String(test.reason || ''))) {
      console.warn(`⚠️ 快照 test ${test.outputTail ? '超时' : '超时且零输出（疑似冻结）'}（junction I/O 病态慢/冻结）→ 主仓复跑 test（并行噪声可能混入——失败先做归属鉴定）`)
      test = runVerifyTestCheck({ cwd, specBase, changeName, restrictFiles: files })
    }
    if (!testLedgerReuse && changeName && test.status === 'passed') {
      try {
        const { recordTestLedger } = await import('./test-ledger.js')
        const { resolveRuntimeRoot } = await import('./shared.js')
        recordTestLedger({
          runtimeRoot: resolveRuntimeRoot(null, specBase), changeName,
          projectRoot: gateCwd, testRoot: join(gateCwd, 'test'), specBase: gateSpecBase, cwd: gateCwd,
          result: { pass: true, durationMs: test.durationMs ?? null, strategy: test.strategy ?? null },
        })
      } catch { /* 记账异常不影响门禁（下次仍真跑） */ }
    }
    let lint = runVerifyLintCheck({ cwd: gateCwd, specBase: gateSpecBase, timeoutMs: snapshot ? 5 * 60 * 1000 : undefined })
    // 快照 lint 超时回退主仓（2026-09-12 dogfood 两连实证：junction I/O 病态慢，3min/5min 均被
    // 超时杀——主仓 60~110s 正常。按用户建议「自动回退」而非假败/advisory：主仓复跑保硬门，
    // 并行噪声混入时失败输出带归属鉴定提示）
    if (snapshot && lint.status === 'failed' && /超时/.test(String(lint.reason || ''))) {
      console.warn('⚠️ 快照 lint 超时（node_modules junction I/O 慢）→ 主仓复跑 lint（并行噪声可能混入——失败先做归属鉴定）')
      lint = runVerifyLintCheck({ cwd, specBase })
    }
    const failed = []
    // 纯超时降档（R4 门禁价值考古：36/106 失败是 600s 帽杀纯超时假拦——超时=未完成非测试挂）。
    // 所有失败单元 reason 均含超时 → advisory 不计入 failed；任一单元真实挂测 → 维持硬拦。
    if (test.status === 'failed') {
      const { isTimeoutOnlyTestFailure } = await import('../verify-postcheck.js')
      if (isTimeoutOnlyTestFailure(test)) {
        console.warn(`\n⚠️ quick test 实测纯超时（无任何挂掉的测试）——不拦完成：${test.reason || ''}`)
        console.warn('   处置：定向复跑触碰模块自证；常发超时建议 local.yaml 配 modules: 块启用模块子集实测。')
      } else {
        failed.push('test')
      }
    }
    // ── lint 归属鉴定降档（R4-S-F/R4-S-Q 同根因：隔离快照含 HEAD 存量债文件时 lint 恒败，
    //    agent 被逼范围外清偿才过门）。失败输出提及文件 × 本会话文件集零交集 → 存量债
    //    advisory 放行不拦完成；有交集 / 输出无可识别路径（unattributable）→ 维持硬拦。──
    if (lint.status === 'failed') {
      const { triageLintOwnership } = await import('../verify-postcheck.js')
      const own = triageLintOwnership({
        failureFiles: lint.failureFiles || [],
        changeFiles: files.map(f => String(f).replace(/\\/g, '/')),
      })
      if (own.verdict === 'pre-existing') {
        console.warn(`\n⚠️ quick lint 实测失败，但归属鉴定为 HEAD 存量债（失败提及文件与本会话文件集零交集）——不拦完成`)
        console.warn(`   存量债文件：${(lint.failureFiles || []).join('、') || '（见上方输出）'}`)
        console.warn('   处置建议：单独 quick 机械清偿解锁全仓 lint 门（顺手清债）；确与本会话无关可忽略本行。')
      } else if (snapshot) {
        // 主仓对照复核（坑 quick-done-长静默与快照行尾假阳性 坑2，2026-09-21 实证：快照
        // Would reformat 本会话文件、主仓同命令 1294 文件全绿——快照 checkout 行尾转换
        // 与 ruff 字节级比对不一致的环境假阳性）。失败文件与本会话有交集时主仓复跑同命令：
        // 主仓绿 = 环境假阳性 advisory 放行（本会话文件在真实工作区是格式合规的）；主仓
        // 也红 = 真实格式债维持硬拦（主仓可能有并行噪声，失败输出带归属鉴定提示）。
        const mainLint = runVerifyLintCheck({ cwd, specBase })
        if (mainLint.status === 'passed') {
          console.warn(`\n⚠️ 快照 lint 失败但主仓同命令全绿——判定为快照环境假阳性（行尾转换类），不拦完成`)
          console.warn(`   快照失败面：${(lint.failureFiles || []).join('、') || '（见上方输出）'}；主仓口径已实证格式合规。`)
        } else {
          failed.push('lint')
        }
      } else {
        failed.push('lint')
      }
    }
    if (failed.length > 0 && snapshot) {
      try { const { printSnapshotFailureHint } = await import('./gate-snapshot.js')
        printSnapshotFailureHint({ snapshotRoot: snapshot.snapshotRoot, changeFileCount: snapshot.overlaid, sourceRoot: snapshot.sourceRoot || null }, { offEnv: 'SILLYSPEC_QUICK_GATE_SNAPSHOT_OFF' })
      } catch { /* 提示失败不影响门禁语义 */ }
    }
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
