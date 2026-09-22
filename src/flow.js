/**
 * flow.js — 2-调用协议（R7 切片二 / D-002 D-003 D-007 / FR-03~06）。
 *
 * 协议形状属性（机械 harness 可验，非 agent 配额）：薄跑道 CLI 必需交互 = 2——
 *   ① `flow start`（一次下发：建 change + 基线锚定 + 薄流程说明 + 全部材料**路径**清单
 *      ——稳定前缀=缓存最优；已存在 change → 恢复简报（盘面状态：checkbox/提交/账本/
 *      dirty files → 做到哪、剩什么））；
 *   ② `flow done`（唯一裁决点：六子步幂等——工件校验/P2 账本对账+亲测/探针/distill/
 *      归档/事件收口）。
 * 中间零协议必需交互；agent 自愿 status/verify 合法不计入（D-007：协议记账单位=change 级
 * ≈ 一次 GSD Phase；task 卡是干活单位非协议检查点）。
 *
 * fail-closed 三句（用户裁定钉死）：①亲自实测失败=整单 FAIL exit≠0（不继续 distill/归档）；
 * ②实测超时=失败（同 quick 门，无部分成功当绿）；③半态可重入不可假绿——归档子步未完成前
 * change 仍 active，重入从断点续不新开 change。
 *
 * 配置（local.yaml，config-schema 注册；design 措辞 `flow: thin|legacy` 落地为单键
 * `flow.mode: thin|legacy`——YAML 单键形态语义一致）：缺省 thin；legacy=既有 run <stage>
 * 全族逐字不动，flow start 拒跑并指路（回滚一行 yaml）。thin change 上跑 run <stage> =
 * 混跑回退（flow-state 落 legacy_fallback，flow done 按厚档裁决——两套记账不叠加）。
 *
 * 状态落文件不落 DB（红线）：.sillyspec/changes/<名>/flow-state.yaml（tier/baseline_commit/
 * 六子步完成标记/legacy_fallback/route_hint）——fs-atomic 原子写，缺文件=未参与 thin。
 * 幂等循 task-done 先例：子步各查自身完成标记，中断半态重入断点续，中段失败精确报告。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { git, gitQuiet } from './git-helper.js'
import { writeAtomicSync } from './fs-atomic.js'
import { resolveRuntimeRoot, triggerSync } from './run/shared.js'

const FLOW_STATE_FILE = 'flow-state.yaml'
const SUBSTEPS = ['artifacts', 'ledger', 'probes', 'distill', 'archive', 'events']

/** 读 flow-state（缺文件/损坏 → null = 未参与 thin）。 */
export function readFlowState(changeDir) {
  try {
    const raw = readFileSync(join(changeDir, FLOW_STATE_FILE), 'utf8')
    const obj = yaml.load(raw)
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}

/** 原子写 flow-state（patch 合并，幂等）。 */
export function writeFlowState(changeDir, patch) {
  const cur = readFlowState(changeDir) || {}
  writeAtomicSync(join(changeDir, FLOW_STATE_FILE), yaml.dump({
    tier: 'thin',
    legacy_fallback: false,
    substeps: {},
    ...cur,
    ...patch,
    substeps: { ...(cur.substeps || {}), ...(patch.substeps || {}) },
    updatedAt: new Date().toISOString(),
  }, { lineWidth: 120 }) + '\n')
}

/** 读 local.yaml 的 flow 配置（缺省 thin；文本级读同既有 parseSimpleYaml 习惯）。 */
export function readFlowConfig(specBase) {
  try {
    const raw = readFileSync(join(specBase, 'local.yaml'), 'utf8')
    const m = raw.match(/^\s*mode\s*:\s*(thin|legacy)\s*$/m)
    let mode = m ? m[1] : 'thin'
    if (/^flow\s*:\s*(thin|legacy)\s*$/m.test(raw)) mode = raw.match(/^flow\s*:\s*(thin|legacy)\s*$/m)[1]
    const th = raw.match(/^\s*edit_ratio_threshold\s*:\s*([0-9.]+)\s*$/m)
    const en = raw.match(/^\s*edit_ratio_enforcement\s*:\s*(advisory|block)\s*$/m)
    return {
      mode,
      editRatioThreshold: th ? Number(th[1]) : 0.5,
      editRatioEnforcement: en ? en[1] : 'advisory',
    }
  } catch {
    return { mode: 'thin', editRatioThreshold: 0.5, editRatioEnforcement: 'advisory' }
  }
}

/** 基线以来变更文件（git diff 基线→HEAD + 工作区 dirty——flow done 测试门清单来源，D-003）。
 * 排除 .sillyspec/ 内部产物（观测对象≠交付物；spec 文件不触发测试门也不算 dirty 恢复信号）。 */
function changedFilesSinceBaseline(cwd, baselineCommit) {
  const files = new Set()
  const addIfDeliverable = (p) => {
    if (p && !p.replace(/\\/g, '/').startsWith('.sillyspec/')) files.add(p)
  }
  if (baselineCommit) {
    const d = gitQuiet(cwd, ['diff', '--name-only', `${baselineCommit}..HEAD`])
    if (d) for (const l of String(d).split('\n')) if (l.trim()) addIfDeliverable(l.trim())
  }
  const s = gitQuiet(cwd, ['status', '--porcelain'])
  if (s) {
    for (const line of String(s).split('\n')) {
      if (!line || line.length < 4) continue
      const p = line.slice(3).trim().replace(/^"|"$/g, '')
      const arrow = p.indexOf(' -> ')
      const path = arrow !== -1 ? p.slice(arrow + 4) : p
      addIfDeliverable(path)
    }
  }
  return [...files]
}

/** 材料路径清单（稳定前缀——缓存最优；按在场性列出，不读内容）。 */
function materialPaths(specBase, changeName, changeDir) {
  const paths = [
    join(changeDir, FLOW_STATE_FILE),
    join(specBase, 'docs', 'sillyspec', 'scan', 'PROJECT.md'),
    join(specBase, 'docs', 'sillyspec', 'scan', 'CONVENTIONS.md'),
    join(specBase, 'docs', 'sillyspec', 'modules', '_module-map.yaml'),
    join(specBase, 'knowledge', 'INDEX.md'),
  ]
  return paths.filter((p) => { try { return existsSync(p) } catch { return false } })
}

/**
 * flow start —— 第 1 次协议调用（建卡+下发）。已存在 change → 恢复简报（不新建不重置）。
 * @param {{change:string, input?:string, thick?:boolean, withTasks?:boolean, cwd:string, specBase:string, json?:boolean}} p
 */
export async function cmdFlowStart({ change, input, thick = false, withTasks = false, cwd, specBase, json = false }) {
  const cfg = readFlowConfig(specBase)
  if (cfg.mode === 'legacy') {
    console.error('❌ 本项目配置 flow.mode=legacy——2-调用薄协议未启用，走既有流程：sillyspec run <stage> --change <名>')
    console.error('   回滚一行 yaml：local.yaml 删掉 mode: legacy 或改为 mode: thin（缺省即 thin）')
    process.exit(2)
  }
  const { ProgressManager } = await import('./progress.js')
  const pm = new ProgressManager()
  const changesDir = join(specBase, 'changes')
  const changeDir = join(changesDir, change)
  const runtimeRoot = resolveRuntimeRoot({}, specBase)

  if (existsSync(changeDir)) {
    const st = readFlowState(changeDir)
    if (!st) {
      console.error(`❌ change 目录已存在但无 ${FLOW_STATE_FILE}（legacy 记账的既有变更）——混跑回退：走 run <stage> 续跑，勿用 flow`)
      process.exit(2)
    }
    printRecoveryBriefing({ cwd, specBase, change, changeDir, runtimeRoot, st })
    return { recovery: true }
  }

  pm.initChange(cwd, change, {})
  try {
    const { resolveSessionIdentity } = await import('./progress.js')
    const { session } = resolveSessionIdentity({ flagSession: null, cwd })
    pm.claimChangeOwner(cwd, change, session)
  } catch { /* claim 失败不阻断启动（fail-open，同 runCommand 接线） */ }

  // watcher 拉起（D-001：change 启动即观测——flow start 走 index.js 分发不经 runCommand，
  // 需在此独立接线；语义同 command.js 侧：无条件 spawn+单飞锁合并+best-effort 不阻断，
  // 未连接平台也 spawn（本地 jsonl 是事件唯一真相源）；SILLYSPEC_WATCHER=0 逃生阀）。
  try {
    const { spawnWatcher } = await import('./watcher.js')
    const r = await spawnWatcher(cwd, change, { specBase })
    if (r.status === 'spawned') console.log(`🔄 [watcher] 观测旁路已拉起：事件流 .sillyspec/.runtime/watcher-events-${change}.jsonl（恒带 provisional:true）`)
  } catch { /* 观测旁路 best-effort，绝不阻断协议面 */ }

  const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
  const baseline = typeof head === 'string' && head.trim() ? head.trim() : null
  writeFlowState(changeDir, {
    tier: thick ? 'thick' : 'thin',
    // born_face=工件面出身（R7 切片四修正：失败升厚改 tier 只升仪式不回溯出身——薄面出身归档
    // 恒走 skipPlanCheck，防「升厚后无 plan.md 归档死锁」；厚面出身（--thick 起步）才要 plan.md）
    born_face: thick ? 'thick' : 'thin',
    with_tasks: Boolean(withTasks),
    baseline_commit: baseline,
    substeps: {},
  })

  // 全件机器起草（R7 切片三 / FR-07：工件回填轮=0——治理工件 CLI 写，agent 只裁例外）。
  // 任务卡分岔（用户裁定#3）：默认 thin+直写零任务卡；--thick/--with-tasks 才生成任务卡。
  let drafted = []
  try {
    const { draftAll } = await import('./flow-draft.js')
    const r = draftAll({ changeDir, change, input, withTasks: thick || withTasks, runtimeRoot })
    drafted = r.written
  } catch (e) {
    console.warn(`⚠️ 机器起草失败（薄工件面降级为 flow done 默认验收；best-effort 不阻断）: ${(e && e.message) || e}`)
  }

  const materials = materialPaths(specBase, change, changeDir)
  const lines = [
    `🏃 flow start（${thick ? 'thick 厚档（--thick 显式声明，人声明不做启发式）' : 'thin 薄跑道'}）: ${change}`,
    `══════════════════════════════════════`,
    `【协议调用 1/2（本次）】change 已建 + 基线锚定（baseline_commit=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）${withTasks ? ' + 任务卡模式（--with-tasks：中间自愿用 task done，收尾仍 flow done）' : ''}`,
    ``,
    `【你要做的】直接干活：改代码、写测试。治理工件不用你写——flow done 机器做（协议记账单位=change 级）。`,
    `例外裁决面（唯一合法 .sillyspec 书写）：AGENT 槽填充 / flow amend-draft（确要改机器稿时）。`,
    ``,
    `【协议调用 2/2（干完后）】sillyspec flow done --change ${change}`,
    `  测试对账：P2 账本优先，无记录 CLI 亲测（fail-closed：实测失败/超时=整单 FAIL exit≠0；中断重入断点续）。`,
    ``,
    `材料路径清单（稳定前缀，按需 Read）：`,
    ...materials.map((p) => `  - ${p}`),
  ]
  if (json) {
    console.log(JSON.stringify({ change, tier: thick ? 'thick' : 'thin', baseline, materials }))
  } else {
    console.log(lines.join('\n'))
  }
  // 平台同步（2026-09-22-thin-fr-distill-sync：flow 走 index.js 分发不经 runCommand，此前后台
  // spec-sync 从不触发——薄道 docs/knowledge 不推平台。对齐 run 族语义：尾部 best-effort 后台推）
  try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
  return { change, baseline, materials }
}

/** 恢复简报：盘面状态（checkbox/提交/账本/dirty files）→ 做到哪、剩什么、下一步。 */
function printRecoveryBriefing({ cwd, specBase, change, changeDir, runtimeRoot, st }) {
  const done = []
  const left = []
  for (const k of SUBSTEPS) (st.substeps?.[k] === 'done' ? done : left).push(k)
  let checked = 0, total = 0
  try {
    const t = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    checked = (t.match(/^- \[x\]/gm) || []).length
    total = (t.match(/^- \[( |x)\]/gm) || []).length
  } catch { /* 无 tasks.md = 零任务卡（thin 默认） */ }
  const commits = st.baseline_commit
    ? (gitQuiet(cwd, ['rev-list', '--count', `${st.baseline_commit}..HEAD`]) || '0').toString().trim()
    : '?'
  const dirty = changedFilesSinceBaseline(cwd, st.baseline_commit).length
  const hasLedger = existsSync(join(runtimeRoot, `verify-quality-scan-${change}.json`))
  console.log([
    `🔁 flow start 恢复简报（重入）: ${change}（tier=${st.tier}${st.legacy_fallback ? '，legacy_fallback=true 混跑回退中' : ''}）`,
    `══════════════════════════════════════`,
    `- 做到哪：任务勾选 ${checked}/${total}；基线以来提交 ${commits} 个；变更/dirty 文件 ${dirty} 个；P2 质量扫描记录 ${hasLedger ? '在场' : '无'}。`,
    `- 六子步标记：${done.length ? `已完成 ${done.join('/')}` : '（无）'}${left.length ? `；待办 ${left.join('/')}` : '；全部完成'}`,
    `- 剩什么：${left.length === 0 && dirty === 0 ? '活已干完' : dirty > 0 ? '活未干完（继续改代码）' : '收尾待裁决'}`,
    `- 下一步：${left.length === 0 ? `sillyspec flow done --change ${change}` : `继续干活；干完跑 flow done（断点续）`}`,
  ].join('\n'))
}

/**
 * flow done —— 第 2 次协议调用（唯一裁决点，六子步幂等）。
 * 子步：artifacts（工件校验）→ ledger（账本对账+亲测）→ probes（探针）→ distill（决策提炼）
 * → archive（归档经 runArchiveChain，thin 薄工件面跳过 plan.md 硬校验）→ events（事件收口）。
 */
export async function cmdFlowDone({ change, cwd, specBase, confirmArchive = true }) {
  const changeDir = join(specBase, 'changes', change)
  const st = readFlowState(changeDir)
  if (!st) {
    console.error(`❌ ${change} 无 ${FLOW_STATE_FILE}（未参与 thin 协议）——走 run <stage> 既有流程`)
    process.exit(2)
  }
  if (st.legacy_fallback) {
    console.error('❌ 本 change 已混跑回退 legacy（跑过 run <stage>）——剩余流程按厚档走 run <stage>，flow done 不再裁决')
    process.exit(2)
  }
  const runtimeRoot = resolveRuntimeRoot({}, specBase)
  let markDir = changeDir
  const mark = (k) => { writeFlowState(markDir, { substeps: { [k]: 'done' } }); doneList.push(k) }
  const doneList = []
  const skip = (k) => { doneList.push(`${k}(skip)`) }
  const reportMidFail = (failed) => {
    console.error(`❌ flow done 中断于子步「${failed}」。已完成：${doneList.length ? doneList.join('、') : '（无）'}；待办：${SUBSTEPS.filter((k) => st.substeps?.[k] !== 'done' && k !== failed).join('、') || '（无）'}`)
    console.error('   重入：修复后重跑同一条命令——已完成子步幂等跳过，从断点续（半态可重入不可假绿：归档子步未完成前 change 仍 active）')
  }

  // ① artifacts：机器稿指纹校验（draft-ledger 在场时三态拒收——标记缺失/哈希失配/手工重锚
  // 未审计；AGENT 槽是合法书写面不参与指纹；缺 ledger=not-applicable 放行）
  if (st.substeps?.artifacts === 'done') { skip('artifacts') } else {
    const { verifyFlowDrafts } = await import('./flow-draft.js')
    const r = verifyFlowDrafts({ changeDir, change, runtimeRoot })
    if (r.applicable && r.violations.length > 0) {
      console.error(`❌ 工件校验拒收（机器稿指纹三态）：`)
      for (const v of r.violations) console.error(`   - ${v}`)
      reportMidFail('artifacts')
      process.exit(1)
    }
    mark('artifacts')
  }

  // ② ledger：P2 账本对账+亲测（runQuickTestLintGate 同源：账本优先→真跑→recordTestLedger 落账）
  if (st.substeps?.ledger === 'done') { skip('ledger') } else {
    const { runQuickTestLintGate } = await import('./run/quick-audit.js')
    const changedFiles = changedFilesSinceBaseline(cwd, st.baseline_commit)
    const gate = await runQuickTestLintGate({ cwd, specBase, changedFiles, changeName: change })
    if (gate && gate.action === 'fail') {
      console.error(`❌ 测试门 FAIL（整单 FAIL——实测失败/超时=失败，不继续 distill/归档）：`)
      console.error(`   ${gate.reason || gate.message || JSON.stringify(gate)}`)
      // 失败触发升级（R7 切片四 / FR-10 / 护栏#4：不依赖 agent 主动）——剩余流程按厚档走
      writeFlowState(changeDir, { tier: 'thick', upgrade_reason: `verify 实测失败（${gate.reason || 'test fail'}）——失败自动升厚` })
      console.error('   ⬆️ 已自动升厚档（tier=thick）：重入修复后剩余流程按厚档语义（归档不跳过 plan.md 校验）')
      reportMidFail('ledger')
      process.exit(1)
    }
    mark('ledger')
  }

  // ③ probes：thin 薄跑无 verify-result 骨架——探针产物面（probe1-8 事实核验）由 flow done
  // 裁决自含（测试门+工件指纹）；升厚（tier=thick）时探针链由 run verify 的既有 --init --draft
  // 产物面承接（第 3 批资产复用，不重做）。本子步记账占位：thin=not-applicable 直过。
  if (st.substeps?.probes === 'done') { skip('probes') } else {
    if (st.tier === 'thick') console.log('ℹ️ 厚档探针链：run verify --done 时经 verify-probes --init --draft 承接（第 3 批既有面）')
    mark('probes')
  }

  // ④ distill：决策提炼（rejected/needsWait 异态 → 升厚留人工裁决，不静默吞）+ FR 索引提炼
  // （2026-09-22-thin-fr-distill-sync：薄道此前只蒸馏 decisions 不调 indexRequirements——
  // requirements 永不进 knowledge/fr，知识复利在新默认道断流；薄变更无 design.md，域路由
  // 以基线以来交付 diff 供 deliverableFiles，伪域回退同口径）
  if (st.substeps?.distill === 'done') { skip('distill') } else {
    try {
      const { distillIntoKnowledge } = await import('./decision-distill.js')
      const knowledgeRoot = join(specBase, 'knowledge')
      const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      const res = distillIntoKnowledge(changeDir, knowledgeRoot, typeof head === 'string' ? head.trim() : '', null)
      const abnormal = res && (res.rejected > 0 || res.needsWait > 0)
      if (abnormal) {
        writeFlowState(changeDir, { tier: 'thick', upgrade_reason: `distill 异态（rejected=${res.rejected} needsWait=${res.needsWait}）——升厚留人工裁决` })
        console.warn(`⚠️ distill 异态 → 已升厚档（tier=thick）。剩余流程按厚档走 run <stage> 完整仪式；归档子步仍将执行（厚档语义不跳过 plan.md 校验）。`)
      }
    } catch (e) {
      console.warn(`⚠️ distill best-effort 失败（不阻断归档链）: ${(e && e.message) || e}`)
    }
    try {
      const { indexRequirements } = await import('./fr-index.js')
      const knowledgeRoot = join(specBase, 'knowledge')
      const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      const deliverableFiles = changedFilesSinceBaseline(cwd, st.baseline_commit)
      const r = indexRequirements({ changeDir, knowledgeRoot, headHash: typeof head === 'string' ? head.trim() : '', deliverableFiles })
      if (r && Array.isArray(r.written) && r.written.length > 0) {
        console.log(`📚 FR 索引提炼：${r.written.map((w) => w.id).join('、')} → knowledge/fr/（域=${r.written[0].file}）`)
      }
    } catch (e) {
      console.warn(`⚠️ FR 索引提炼 best-effort 失败（不阻断归档链）: ${(e && e.message) || e}`)
    }
    mark('distill')
  }

  // ⑤ archive：归档经 runArchiveChain（thin 薄工件面跳过 plan.md 硬校验；thick 不跳）
  if (st.substeps?.archive === 'done') { skip('archive') } else {
    const { ProgressManager } = await import('./progress.js')
    const { runArchiveChain } = await import('./run/complete-handlers.js')
    const { archiveDestDirName } = await import('./stage-contract.js')
    const pm = new ProgressManager()
    const date = new Date().toISOString().slice(0, 10)
    const destName = archiveDestDirName(date, change)
    const destDir = join(specBase, 'changes', 'archive', destName)
    await runArchiveChain({
      pm, cwd, specBase, changeName: change,
      srcDir: changeDir,
      destDir,
      skipPlanCheck: (st.born_face ?? st.tier) === 'thin',
    })
    // 归档后 changeDir 已搬走——后续子步标记随归档目录走（flow-state 随变更包留存审计）
    markDir = destDir
    mark('archive')
  }

  // ⑥ events：事件收口（watcher 观测旁路 best-effort 读回，非真相源）
  if (st.substeps?.events === 'done') { skip('events') } else {
    try {
      const eventsPath = join(runtimeRoot, `watcher-events-${change}.jsonl`)
      if (existsSync(eventsPath)) {
        const n = readFileSync(eventsPath, 'utf8').split('\n').filter(Boolean).length
        console.log(`📊 watcher 事件收口：${n} 条 provisional 事件在案（.runtime 留档，平台展示面）`)
      } else {
        console.log('📊 watcher 事件收口：无事件文件（观测旁路未在跑——best-effort，不影响裁决）')
      }
    } catch { /* 读回失败不阻断 */ }
    mark('events')
  }

  // ── 切片四收口面：路由信号醒目打印 + 遥测四列记一笔（advisory 定案——只记录不判罚）──
  const cfg = readFlowConfig(specBase)
  if (st.route_hint === 'thick') {
    console.warn(`🧭 route_hint: thick（机器稿改写比例 ${st.edit_ratio ?? '?'} > 阈值 ${cfg.editRatioThreshold}——决策覆盖度低，该走厚档；advisory 不强制，测绿已薄档过）`)
    if (cfg.editRatioEnforcement === 'block') {
      console.error('❌ flow.edit_ratio_enforcement=block：超阈阻断 done（降阈/改走 thick/回退 advisory 三选一）')
      process.exit(1)
    }
  }
  try {
    const { appendFileSync } = await import('node:fs')
    appendFileSync(join(runtimeRoot, 'flow-telemetry.jsonl'), JSON.stringify({
      ts: new Date().toISOString(), change, protocolCalls: 2,
      draftAmendments: st.edit_ratio != null ? 1 : 0, editRatio: st.edit_ratio ?? null,
      routeHint: st.route_hint ?? null, tier: st.tier, upgraded: st.upgrade_reason ?? null,
    }) + '\n', 'utf8')
  } catch { /* 遥测 best-effort */ }

  console.log(`✅ flow done 完成（2/2 协议调用收口）：${change}——六子步 ${doneList.join('、')}；change 已归档注销。`)
  // 平台同步（同 flow start 尾部接线——归档后的 docs/knowledge/FR 面随本轮回推平台）
  try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
  return { change, substeps: doneList }
}

/** flow 命令族入口（index.js case 'flow' 接线）：flow start|done|amend-draft。 */
export async function cmdFlow(args, cwd, specDir = null) {
  const sub = args[0] || ''
  const rest = args.slice(1)
  const specBase = specDir || join(cwd, '.sillyspec')
  const getFlag = (name) => {
    const i = rest.indexOf(name)
    return i !== -1 && i + 1 < rest.length ? rest[i + 1] : null
  }
  const hasFlag = (name) => rest.includes(name)
  if (sub === 'start') {
    const change = getFlag('--change') || `flow-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(16).slice(2, 6)}`
    return cmdFlowStart({
      change,
      input: getFlag('--input') || undefined,
      thick: hasFlag('--thick'),
      withTasks: hasFlag('--with-tasks'),
      cwd, specBase,
      json: hasFlag('--json'),
    })
  }
  if (sub === 'done') {
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow done 需 --change <名>'); process.exit(2) }
    return cmdFlowDone({ change, cwd, specBase })
  }
  if (sub === 'amend-draft') {
    // 机器稿唯一留痕修改通道（R7 切片三 / FR-08）：重锚哈希 + ledger amendment 审计；
    // 首版原文 body 永存（切片四 editRatio 基准）。
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow amend-draft 需 --change <名>'); process.exit(2) }
    const changeDir = join(specBase, 'changes', change)
    const runtimeRoot = resolveRuntimeRoot({}, specBase)
    const { amendFlowDraft } = await import('./flow-draft.js')
    const r = amendFlowDraft({ changeDir, change, runtimeRoot })
    if (r.reanchored.length === 0) {
      console.error('（无可重锚机器稿——draft ledger 不在案或稿件无标记段）')
      process.exit(1)
    }
    // 切片四：editRatio 路由信号（D-005 advisory 定案——测绿可薄档过；超阈提示+route_hint 落档）
    const cfg = readFlowConfig(specBase)
    // 路由信号取段级最大改写比（任一段过半=该段决策未被输入覆盖——聚合比会被未改段稀释）；
    // 段级明细 sectionRatios 已随 amendment 入 ledger，遥测可见。
    const maxRatio = Math.max(0, ...Object.values(r.sectionRatios || {}))
    if (maxRatio > cfg.editRatioThreshold) {
      writeFlowState(changeDir, { route_hint: 'thick', edit_ratio: maxRatio })
      console.warn(`⚠️ route_hint: thick——机器稿段级最大改写比例 ${maxRatio}（阈值 ${cfg.editRatioThreshold}）：决策覆盖度低，该走厚档（advisory：测绿可薄档过，不强制；flow done 将醒目提示+遥测记账）`)
    } else {
      writeFlowState(changeDir, { edit_ratio: maxRatio })
    }
    console.log(`✅ flow amend-draft 留痕重锚：${r.reanchored.join('、')}——ledger amendment 审计在案；editRatio=${maxRatio}（段级最大；基准=首版原文，AGENT 槽不计入）`)
    return r
  }
  console.error('用法: sillyspec flow start --change <名> --input "<任务>" [--thick|--with-tasks] | sillyspec flow done --change <名>')
  process.exit(2)
}

export default { cmdFlow, cmdFlowStart, cmdFlowDone, readFlowState, writeFlowState, readFlowConfig }
