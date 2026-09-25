/**
 * flow.js — 2-调用协议（R7 切片二 / D-002 D-003 D-007 / FR-03~06）。
 *
 * 协议形状属性（机械 harness 可验，非 agent 配额）：轻量跑道 CLI 必需交互 = 2——
 *   ① `flow start`（一次下发：建 change + 基线锚定 + 轻量变更说明 + 全部材料**路径**清单
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
 * `flow.mode: thin|legacy`——YAML 单键形态语义一致）：缺省 thin（2026-09-25-thin-default-flip
 * 入口归一——D-010@v2 实验通道定位由轻量变更加固件【设计记录/测试绑定/patch 留档/预段收编】推翻，
 * quick 退役第 1 步）；legacy=显式回旧道，既有 run <stage> 全族逐字不动，flow start 拒跑并指路
 * （切回一行 yaml）。thin change 上跑 run <stage> =
 * 混跑回退（flow-state 落 legacy_fallback，flow done 按厚档裁决——两套记账不叠加）。
 *
 * 状态落文件不落 DB（红线）：.sillyspec/changes/<名>/flow-state.yaml（tier/baseline_commit/
 * 六子步完成标记/legacy_fallback/route_hint）——fs-atomic 原子写，缺文件=未参与 thin。
 * 幂等循 task-done 先例：子步各查自身完成标记，中断半态重入断点续，中段失败精确报告。
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import yaml from 'js-yaml'
import { git, gitQuiet } from './git-helper.js'
import { writeAtomicSync } from './fs-atomic.js'
import { resolveRuntimeRoot, triggerSync } from './run/shared.js'

const FLOW_STATE_FILE = 'flow-state.yaml'
const SUBSTEPS = ['artifacts', 'ledger', 'patch', 'review', 'probes', 'distill', 'archive', 'events']

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

/** 读 local.yaml 的 flow 配置（缺省 thin——2026-09-25-thin-default-flip 翻转：入口归一，
 * D-010@v2 实验通道定位由轻量变更加固件（设计记录/测试绑定/patch 留档/预段收编）的数据推翻；
 * 显式 mode: legacy 的仓维持旧道。文本级读同既有习惯）。 */
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
export async function cmdFlowStart({ change, input, thick = false, withTasks = false, reviewForce = null, cwd, specBase, runtimeRootOpt = null, json = false }) {
  const cfg = readFlowConfig(specBase)
  if (cfg.mode === 'legacy') {
    console.error('❌ 本仓显式配置 flow.mode=legacy——走既有流程：sillyspec run <stage> --change <名>')
    console.error('   切回轻量跑道（2026-09-25 起缺省即 thin）：local.yaml 删掉 mode: legacy 或改为 mode: thin')
    process.exit(2)
  }
  // PM 锚定 specBase（平台参数面修复：此前裸构锚 resolveSpecDir(cwd)——DB 行/change 目录落本地，
  // specBase 侧无目录 → writeFlowState ENOENT 崩溃、进度与工件分裂两处根）
  const { ProgressManager } = await import('./progress.js')
  const pm = new ProgressManager({ specDir: specBase })
  const changesDir = join(specBase, 'changes')
  const changeDir = join(changesDir, change)
  const runtimeRoot = resolveRuntimeRoot(runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {}, specBase)

  let proceedFreshEmptyDir = false
  if (existsSync(changeDir)) {
    const st = readFlowState(changeDir)
    if (!st) {
      // adopt 收编（2026-09-25-thin-brainstorm-prestage）：头脑风暴预段产物（proposal/design 在场、
      // 无 flow-state）收编进轻量变更——brainstorm 是 run 族预段，先跑后到不触发混跑守卫；产物原样
      // 保留，机器只补缺件与绑定面。无产物 = 真 legacy 既有变更，维持原拒收。
      const hasBsArtifacts = existsSync(join(changeDir, 'proposal.md')) || existsSync(join(changeDir, 'design.md'))
      if (hasBsArtifacts) {
        const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
        const baseline = typeof head === 'string' && head.trim() ? head.trim() : null
        writeFlowState(changeDir, { tier: 'thin', born_face: 'thin', adopted_from: 'brainstorm', review_force: reviewForce, baseline_commit: baseline, substeps: {} })
        try {
          const { redraftMissingArtifacts, ensureBindingSlots } = await import('./flow-draft.js')
          const r = redraftMissingArtifacts({ changeDir, change, input: null, runtimeRoot })
          if (r.drafted.length > 0) console.log(`📌 收编补生成缺失机器稿：${r.drafted.join('、')}（brainstorm 未产的工件机器补齐，criteria 从 proposal 成功标准回提；已存在文件未动）`)
          const b = ensureBindingSlots({ changeDir })
          if (b.appended) console.log(`📌 收编追加测试绑定槽 ${b.slots} 枚（brainstorm requirements 无绑定面——干活时作答，flow done 校验）`)
        } catch (e) { console.warn(`⚠️ 收编补件失败（best-effort）: ${(e && e.message) || e}`) }
        try {
          const { spawnWatcher } = await import('./watcher.js')
          const w = await spawnWatcher(cwd, change, { specBase })
          if (w.status === 'spawned') console.log(`🔄 [watcher] 观测旁路已拉起：事件流 .sillyspec/.runtime/watcher-events-${change}.jsonl（恒带 provisional:true）`)
        } catch { /* 观测旁路 best-effort */ }
        const materials = materialPaths(specBase, change, changeDir)
        console.log([
          `🧲 头脑风暴产物已收编进轻量跑道: ${change}（adopted_from=brainstorm，baseline=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）`,
          `══════════════════════════════════════`,
          `【你要做的】直接干活：改代码、写测试。brainstorm 的 design/decisions 是本变更的承诺锚（flow done 豁免 design 四节槽，以其为准）。`,
          `requirements 测试绑定槽（收编追加）每条 FR 至少一行作答；写码前后顺手填。`,
          `⚠️ 交付纪律：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD，未提交不进审计件。`,
          ``,
          `【协议调用 2/2（干完后）】sillyspec flow done --change ${change}`,
          ``,
          `材料路径清单（按需 Read）：`,
          ...materials.map((p) => `  - ${p}`),
        ].join('\n'))
        try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
        return { adopted: true, change, baseline }
      }
      // 平台 writer 预建空目录放行（平台参数面）：平台派发先建目录后 spawn——空目录=全新 thin
      // 起点而非 legacy 记账证据；非空且无头脑风暴产物才是真 legacy 拒收面
      let dirEmpty = false
      try { dirEmpty = readdirSync(changeDir).length === 0 } catch { dirEmpty = false }
      if (dirEmpty) {
        console.log('ℹ️ 预建空变更目录放行（平台 writer 形态）：按全新轻量跑道 start 处理')
        proceedFreshEmptyDir = true
      } else {
        console.error(`❌ change 目录已存在但无 ${FLOW_STATE_FILE}（legacy 记账的既有变更）——混跑回退：走 run <stage> 续跑，勿用 flow`)
        process.exit(2)
      }
    }
    if (!proceedFreshEmptyDir) {
    // 幂等补起草（2026-09-25-thin-dogfood-fixes 修复①）：draft 谱系是 start 时点快照，工具
    // 升级新增工件后重入补缺（已存在不碰、ledger 合并）——恢复简报前执行，简报读到补齐后的盘面。
    try {
      const { redraftMissingArtifacts } = await import('./flow-draft.js')
      const r = redraftMissingArtifacts({ changeDir, change, input, runtimeRoot })
      if (r.drafted.length > 0) {
        console.log(`📌 重入补生成缺失机器稿 ${r.drafted.length} 件：${r.drafted.join('、')}（工具升级晚于 start 的在途变更补件；已存在文件未动）`)
      }
    } catch (e) { console.warn(`⚠️ 补起草失败（不阻断恢复简报）: ${(e && e.message) || e}`) }
    printRecoveryBriefing({ cwd, specBase, change, changeDir, runtimeRoot, st })
    return { recovery: true }
    }
  }

  // 需求清晰度门（2026-09-25-thin-brainstorm-prestage）：轻量跑道假定输入已含决策——--input 缺失
  // 或成功标准提取 0 条时不建变更、exit 2 给两选一（头脑风暴预段 / 补成功标准重跑）。
  // 重入与 adopt 路径在上方分支早退，不受此门影响。CLI 只产信号，选择权归用户/agent。
  {
    const { extractSuccessCriteria } = await import('./flow-draft.js')
    if (!input || extractSuccessCriteria(input).length === 0) {
      console.error(`❓ 需求不够清晰（--input ${input ? '在场但「成功标准」条目提取 0 条' : '缺失'}）——轻量跑道假定输入已含决策，两选一：`)
      console.error(`   ① 头脑风暴预段（需求不明时推荐）：sillyspec run brainstorm --change ${change}`)
      console.error(`      人机交互探索需求、出 design/决策/原型；完成后回来 sillyspec flow start --change ${change}，产物自动收编续跑轻量变更`)
      console.error(`   ② 确认输入已含决策：sillyspec flow start --change ${change} --input "<完整需求>"，input 过门格式：`)
      console.error(`      先写动机/背景；随后独立一行只写「成功标准：」；再每行一条「- <可验证标准>」`)
      process.exit(2)
    }
  }

  // 升厚预判已删除（2026-09-25-thin-precheck-removal）：技术面关键词（数据库/迁移等）测错轴——
  // R16 实证碰迁移的变更轻量变更带评审最优收口，预判反诱发误升厚（臂 A 129M）与误报打断。选道只留
  // 形态信号：清晰度门管「需求说不清楚」（预段收编），升厚只留用户决策（--upgrade-thick 同意门）
  // 与运行时证据（实测失败升档/edit_ratio/评审——风险面在收口时点按承诺词/diff 原语/盲维判定）。

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
    // born_face=工件面出身（R7 切片四修正：失败升厚改 tier 只升仪式不回溯出身——轻量面出身归档
    // 恒走 skipPlanCheck，防「升厚后无 plan.md 归档死锁」；厚面出身（--thick 起步）才要 plan.md）
    born_face: thick ? 'thick' : 'thin',
    with_tasks: Boolean(withTasks),
    review_force: reviewForce,
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
    console.warn(`⚠️ 机器起草失败（轻量工件面降级为 flow done 默认验收；best-effort 不阻断）: ${(e && e.message) || e}`)
  }

  const materials = materialPaths(specBase, change, changeDir)
  const lines = [
    `🏃 flow start（${thick ? 'thick 厚档（--thick 显式声明，人声明不做启发式）' : 'thin 轻量跑道'}）: ${change}`,
    `══════════════════════════════════════`,
    `【协议调用 1/2（本次）】change 已建 + 基线锚定（baseline_commit=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）${withTasks ? ' + 任务卡模式（--with-tasks：中间自愿用 task done，收尾仍 flow done）' : ''}`,
    ``,
    `【你要做的】直接干活：改代码、写测试。治理工件不用你写——flow done 机器做（协议记账单位=change 级）。`,
    `例外裁决面（唯一合法 .sillyspec 书写）：AGENT 槽填充 / flow amend-draft（确要改机器稿时）。`,
    `⚠️ design.md 四节 AGENT 槽（做法/接口契约/边界并发四问/风险）动码前后顺手作答——每节至少一行，`,
    `   写「不适用：<理由>」也算答；flow done 空槽拒收（承诺锚点，评审与 FR 对账都对着它）。`,
    `📜 requirements 的 FR 是机器摘录候选——语义要改写时直接编辑机器段后跑 flow amend-draft 留痕`,
    `   （槽里写的不进 FR 索引）；输入含编号行为条目时机器已优先摘编号条目。`,
    `📦 冻结面在 flow done 时点采集（baseline..HEAD 提交面）：未提交交付文件——会话专属 worktree 自动并入；`,
    `   共享主仓可带 --freeze-dirty 显式声明并入；git 中间提交归档后可 reset --soft 压扁为单提交`,
    `   （审计真相在 change.patch 冻结件 sha256 锚定，不依赖 git 历史形态）。`,
    `⚖️ 独立评审定档（flow done 按危险证据判，不看文件数）：高危承诺词/盲维实质作答/diff 危险`,
    `   原语/决策密度任一命中即需评审（届时会收到评审任务书，起子代理产出 review.json）；豁免`,
    `   也有 1/4 抽查采样。要强制/豁免可重启时带 --review / --no-review${reviewForce === true ? '（本变更已声明 --review）' : reviewForce === false ? '（本变更已声明 --no-review）' : ''}。`,
    `⚠️ 交付纪律：收口前先把交付代码用显式 pathspec 提交（git add -- <文件> && git commit）——`,
    `   patch 冻结件范围=baseline..HEAD 提交面，未提交的代码不进审计件（R16 评审 P2 实证）。`,
    ``,
    `🛑 三断点纪律（可控性要求——用户没说「全跑完」就必须在每个断点向用户汇报并等确认）：`,
    `   ① spec 断点：填完 FR 区和 design 槽后，把摘要给用户看（FR 条目+盲维作答+方案概述），`,
    `      等用户确认方案再动手写代码——方案错了返工最贵。`,
    `   ② 执行断点：写完代码跑完测试后，把测试结果（过了几个/挂了什么）给用户看，`,
    `      等用户确认再跑收口。`,
    `   ③ 归档断点：flow done 跑完后（无论过/拒），把结果（归档成功/被什么拦了）给用户看。`,
    `   用户明确说「直接跑完/不用问我」→ 三断点全跳过（agent 自主干到底）。`,
    `   随时可查进度：sillyspec flow status --change ${change}`,
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
  // spec-sync 从不触发——轻量变更 docs/knowledge 不推平台。对齐 run 族语义：尾部 best-effort 后台推）
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
 * → archive（归档经 runArchiveChain，thin 轻量工件面跳过 plan.md 硬校验）→ events（事件收口）。
 */
export async function cmdFlowDone({ change, cwd, specBase, runtimeRootOpt = null, confirmArchive = true, freezeDirty = false }) {
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
  const runtimeRoot = resolveRuntimeRoot(runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {}, specBase)
  // 归属收窄清单（2026-09-25-thin-dogfood-fixes 修复②）：baseline..HEAD 不分作者——并行会话在
  // start..done 之间的提交会混入本变更实测面与 FR 域路由。复用 verify 对账同款切分器：他侧显式
  // 声明（quick --files / design 清单）的文件剔除归他者；未声明文件保留（fail-closed 不因并行漏跑）。
  // ledger 门与 distill 的 deliverableFiles 单源走这里（此前 distill 直取 git diff 未切分）。
  const attributedChangedFiles = async () => {
    let files = changedFilesSinceBaseline(cwd, st.baseline_commit)
    try {
      const { splitOwnVsForeignDiffFiles } = await import('./foreign-declared.js')
      const { own, foreign } = splitOwnVsForeignDiffFiles(cwd, change, files, { specBase })
      if (foreign.length > 0) {
        console.log(`🔗 归属收窄：剔除 ${foreign.length} 个他侧声明文件（${foreign.slice(0, 5).map((x) => x.file).join(', ')}${foreign.length > 5 ? ' 等' : ''}）——不进本变更实测面与 FR 域路由`)
        return own
      }
    } catch { /* 切分失败 fail-closed 保留全量 */ }
    return files
  }
  let markDir = changeDir
  const mark = (k) => { writeFlowState(markDir, { substeps: { [k]: 'done' } }); doneList.push(k) }
  const doneList = []
  const skip = (k) => { doneList.push(`${k}(skip)`) }
  let reviewOutcome = null
  let gateSummaryText = null
  // 遥测单点（2026-09-25-thin-parity-assets 修评审 P2①：失败路径 exit 前也要落账——校准信号
  // 不许在失败面丢失；成功收口走函数末尾同款记录，失败面只多不少）
  const appendTelemetry = (review) => {
    try {
      appendFileSync(join(runtimeRoot, 'flow-telemetry.jsonl'), JSON.stringify({
        ts: new Date().toISOString(), change, protocolCalls: 2,
        draftAmendments: st.edit_ratio != null ? 1 : 0, editRatio: st.edit_ratio ?? null,
        routeHint: st.route_hint ?? null, tier: st.tier, upgraded: st.upgrade_reason ?? null,
        review,
      }) + '\n', 'utf8')
    } catch { /* 遥测 best-effort */ }
  }
  const reportMidFail = (failed) => {
    console.error(`❌ flow done 中断于子步「${failed}」。已完成：${doneList.length ? doneList.join('、') : '（无）'}；待办：${SUBSTEPS.filter((k) => st.substeps?.[k] !== 'done' && k !== failed).join('、') || '（无）'}`)
    console.error('   重入：修复后重跑同一条命令——已完成子步幂等跳过，从断点续（半态可重入不可假绿：归档子步未完成前 change 仍 active）')
  }

  // ① artifacts：机器稿指纹校验（draft-ledger 在场时三态拒收——标记缺失/哈希失配/手工重锚
  // 未审计；AGENT 槽是合法书写面不参与指纹；缺 ledger=not-applicable 放行）
  //    + 设计记录空槽拒收（2026-09-24 v3 设计记录全档化第一片：盲维四问每跑必答——空槽=未答，
  //    「不适用：<理由>」也是答；纯文档检查前置于实测门，秒级失败秒级返工）
  if (st.substeps?.artifacts === 'done') { skip('artifacts') } else {
    const { verifyFlowDrafts, verifyDesignRecordFilled } = await import('./flow-draft.js')
    const r = verifyFlowDrafts({ changeDir, change, runtimeRoot })
    if (r.applicable && r.violations.length > 0) {
      console.error(`❌ 工件校验拒收（机器稿指纹三态）：`)
      for (const v of r.violations) console.error(`   - ${v}`)
      reportMidFail('artifacts')
      process.exit(1)
    }
    // 头脑风暴预段设计豁免（2026-09-25-thin-brainstorm-prestage）：adopted 变更的 design 是
    // brainstorm 人机交互产物（比四节骨架丰富）——承诺以其为准，槽位门不适用
    if (st.adopted_from === 'brainstorm' && existsSync(join(changeDir, 'design.md'))) {
      console.log('ℹ️ 头脑风暴预段设计在场——豁免 design 四节槽门（adopted_from=brainstorm，设计承诺以 brainstorm design 为准）')
    } else {
      const dr = verifyDesignRecordFilled({ changeDir })
      if (dr.applicable && dr.emptySlots.length > 0) {
        console.error(`❌ 设计记录未作答：design.md 有 ${dr.emptySlots.length} 个空 AGENT 槽（${dr.emptySlots.join('、')}）`)
        console.error(`   每节至少写一行（小改动可写「不适用：<理由>」）——设计承诺是评审与 FR 对账的锚点，空槽=承诺未落盘`)
        reportMidFail('artifacts')
        process.exit(1)
      }
    }
    // 需求测试绑定槽位门（2026-09-25-thin-patch-bindings：每条 FR 至少一行测试锚或「不适用：理由」）
    const { verifyRequirementBindings } = await import('./flow-draft.js')
    const rb = verifyRequirementBindings({ changeDir })
    if (rb.applicable && rb.emptySlots.length > 0) {
      console.error(`❌ 需求测试绑定未作答：requirements.md ${rb.emptySlots.length} 处（${rb.emptySlots.slice(0, 4).join('、')}${rb.emptySlots.length > 4 ? ' 等' : ''}）`)
      console.error(`   每条 FR 至少一行：test 文件路径或用例名（distill 时铸 test-trace 随发号提升全局）；无测试面写「不适用：<理由>」`)
      reportMidFail('artifacts')
      process.exit(1)
    }
    mark('artifacts')
  }

  // ② ledger：P2 账本对账+亲测（runQuickTestLintGate 同源：账本优先→真跑→recordTestLedger 落账）
  if (st.substeps?.ledger === 'done') {
    skip('ledger')
    // 实测面回填（2026-09-25-thin-r16-patches 修复③：断点续跑收口的回执不失忆——review 回填同族）
    if (!gateSummaryText) {
      try {
        const { backfillGateSummary } = await import('./flow-parity.js')
        gateSummaryText = backfillGateSummary(runtimeRoot, change)
      } catch { /* 回填 best-effort */ }
    }
  } else {
    const { runQuickTestLintGate } = await import('./run/quick-audit.js')
    const changedFiles = await attributedChangedFiles()
    // 哨兵断言（2026-09-25-sentinel-wiring）：tasks.md 全勾但零完成证据（区间提交 subject 无
    // task-NN token 且无对应 review.json）→ 拒收——L0 硬门接线，两道收口同一哨兵（quick 侧同判）。
    try {
      const { detectFakeCheckCompletion } = await import('./sentinel-assertions.js')
      const tasksPath = join(changeDir, 'tasks.md')
      if (existsSync(tasksPath)) {
        const _logRaw = gitQuiet(cwd, ['log', '--format=%s', `${st.baseline_commit}..HEAD`])
        if (!_logRaw) {
          console.log('ℹ️ 哨兵：git log 不可用，跳过（fail-open——空提交组照判会假拦）')
        } else {
        const commitSubjects = String(_logRaw).split('\n').filter(Boolean)
        const sent = detectFakeCheckCompletion({ changeDir, tasksMd: readFileSync(tasksPath, 'utf8'), commits: commitSubjects })
        if (sent.status === 'fake') {
          console.error(`🚫 哨兵断言拒收：tasks.md 全勾（${sent.checked}/${sent.claimTotal}）但 ${sent.missing.length} 个任务零完成证据（区间提交无 token、无 review.json）：${sent.missing.join('、')}`)
          console.error('   补证据（提交带 task-NN 或产 review.json）或取消勾选后重跑——假完成主张不许过门')
          appendTelemetry({ sentinel: 'fake', missing: sent.missing.length })
          reportMidFail('ledger')
          process.exit(1)
        }
        if (sent.status === 'complete') console.log(`🛡️ 哨兵：全勾 ${sent.checked}/${sent.claimTotal} 证据齐（提交 token/review.json）`)
        }
      }
    } catch (e) { console.warn(`⚠️ 哨兵断言失败（fail-open 放行，best-effort）: ${(e && e.message) || e}`) }
    const gate = await runQuickTestLintGate({ cwd, specBase, changedFiles, changeName: change, skipSentinel: true /* flow 侧已有带 baseline 的哨兵，quick 侧区间不可靠——单判不双判 */ })
    if (gate && gate.action === 'fail') {
      console.error(`❌ 测试门 FAIL（整单 FAIL——实测失败/超时=失败，不继续 distill/归档）：`)
      console.error(`   ${gate.reason || gate.message || JSON.stringify(gate)}`)
      // 失败触发升级（R7 切片四 / FR-10 / 护栏#4：不依赖 agent 主动）——剩余流程按厚档走
      writeFlowState(changeDir, { tier: 'thick', upgrade_reason: `verify 实测失败（${gate.reason || 'test fail'}）——失败自动升厚` })
      console.error('   ⬆️ 已自动升厚档（tier=thick）：重入修复后剩余流程按厚档语义（归档不跳过 plan.md 校验）')
      reportMidFail('ledger')
      process.exit(1)
    }
    // 实测面对账（2026-09-25 修复③）：agent 可核对自己的测试有没有被扫到——命令/时长/结果文件
    // 一行打全（skip 路径 test/lint 为 null 显示 —；结果文件 test-result.json 含完整文件清单可回溯）。
    const fmt = (r) => r
      ? `${r.status}${r.command ? ` ← ${r.command}` : ''}${typeof r.durationMs === 'number' ? `（${(r.durationMs / 1000).toFixed(1)}s）` : ''}${r.resultPath ? ` 结果：${r.resultPath}` : ''}`
      : '—'
    gateSummaryText = `test: ${fmt(gate && gate.test)}｜lint: ${fmt(gate && gate.lint)}｜门文件 ${Array.isArray(changedFiles) ? changedFiles.length : '?'} 个`
    console.log(`🧾 实测面对账 — ${gateSummaryText}`)
    try { writeFlowState(changeDir, { gate_summary: gateSummaryText }) } catch { /* 存档 best-effort */ }
    mark('ledger')
  }

  // ②b patch：变更级 patch 留档（2026-09-25-thin-patch-bindings，noAI）：quicklog/patches 生态
  // 退役后审计件挂变更自身。范围=归属收窄后的本变更文件面（他侧声明剔除、含工作树未提交与
  // untracked 自拼 hunk），基=baseline，时点=done 冻结。fail-soft：失败只告警不阻断归档、
  // 不标 done（重入 done 重试）。
  if (st.substeps?.patch === 'done') { skip('patch') } else {
    let patchOk = false
    try {
      // patch 面 = 本变更可归属变化（2026-09-25-thin-patch-scope-fix 收窄：dirty 全扫面会把并行
      // 会话未声明 WIP 冻结进来——上变更实测 49 文件泄漏）：①baseline..HEAD 提交面（.sillyspec/
      // 治理面只留本变更目录，他侧 quicklog/knowledge WIP 不入）②本变更目录全部工作树件（未提交
      // 治理面/槽位作答）——排除 patch 自引用。提交面再过他侧声明切分（他侧同窗口提交的防线）。
      if (!st.baseline_commit) {
        console.log('📦 patch 留档跳过：无 git 基线（无历史仓）')
        patchOk = true
      } else {
        const ownPrefix = `.sillyspec/changes/${change}/`
        const diffOut = gitQuiet(cwd, ['diff', '--name-only', `${st.baseline_commit}..HEAD`])
        const committedRaw = String(diffOut || '').split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
        let committed = committedRaw.filter((f) => !f.startsWith('.sillyspec/') || f.startsWith(ownPrefix))
        try {
          const { splitOwnVsForeignDiffFiles } = await import('./foreign-declared.js')
          committed = splitOwnVsForeignDiffFiles(cwd, change, committed, { specBase }).own
        } catch { /* 切分失败 fail-closed 保留提交面 */ }
        const changeDirFiles = []
        const walk = (dir) => {
          for (const e of readdirSync(dir, { withFileTypes: true })) {
            const p = join(dir, e.name)
            if (e.isDirectory()) walk(p)
            else changeDirFiles.push(relative(cwd, p).replace(/\\/g, '/'))
          }
        }
        try { walk(changeDir) } catch { /* 目录异常=空面 */ }
        // 冻结面收集（2026-09-25-thin-r16-patches 修复①）：committed 为主；会话专属 worktree
        // （gate-snapshot 同款路径判定）下未提交 dirty 交付面一并入冻结——独占树内全归属本变更；
        // 共享主仓 dirty 无法归属只警告（他侧声明免警告），审计缺口显式化不再静默。
        let exclusiveFrom = null // 'flag' | 'worktree' | null——入冻路径来源（输出标签区分）
        if (freezeDirty === true) {
          exclusiveFrom = 'flag' // --freeze-dirty：显式声明非他侧声明 dirty 全归属本变更（独占树自动路径的手动版）
        } else {
          try {
            const { shouldSkipGateSnapshotForWorktree } = await import('./run/gate-snapshot.js')
            if (shouldSkipGateSnapshotForWorktree(cwd)) exclusiveFrom = 'worktree'
          } catch { /* 判定异常按共享主仓 */ }
        }
        const exclusive = exclusiveFrom != null
        let freeze = null
        try {
          const { collectFreezeFiles } = await import('./flow-parity.js')
          freeze = collectFreezeFiles({ cwd, specBase, change, committed, exclusive })
        } catch { freeze = { files: [...committed], dirtyAdded: [], dirtyWarned: [] } }
        if (freeze.dirtyAdded.length > 0) {
          console.log(`🔒 ${exclusiveFrom === 'flag' ? '--freeze-dirty 显式声明' : '会话专属 worktree'}：${freeze.dirtyAdded.length} 个未提交交付文件一并入冻结面`)
        }
        if (freeze.dirtyWarned.length > 0) {
          console.warn(`⚠️ ${freeze.dirtyWarned.length} 个未提交交付文件未入冻结面（共享主仓无法归属）——三选一：`)
          console.warn(`   ① 本次接受缺口（审计面少这些文件）② 确认全部归属本变更：重跑 flow done --freeze-dirty 并入冻结 ③ 下次用会话专属 worktree。Git 中间提交可归档后压扁（见收口指引）`)
          console.warn(`   ${freeze.dirtyWarned.slice(0, 3).join('、')}${freeze.dirtyWarned.length > 3 ? ' 等' : ''}`)
        }
        const ownFiles = [...new Set([...freeze.files, ...changeDirFiles])]
          .filter((f) => f && !f.endsWith('change.patch') && !f.endsWith('change-patch.json'))
        if (ownFiles.length === 0) {
          console.log('📦 patch 留档跳过：本变更可归属文件面为空')
          patchOk = true
        } else {
          const { buildFrozenPatch, collectNumstatByPath } = await import('./scope-audit.js')
          const frozen = buildFrozenPatch(cwd, ownFiles, { baseRef: st.baseline_commit })
          const stats = collectNumstatByPath(cwd, ownFiles, { baseRef: st.baseline_commit })
          let additions = 0
          let deletions = 0
          for (const f of ownFiles) {
            const s = stats.get(f)
            if (s && Number.isFinite(s.additions)) additions += s.additions
            if (s && Number.isFinite(s.deletions)) deletions += s.deletions
          }
          const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
          const meta = {
            change,
            baseline: st.baseline_commit,
            head: typeof head === 'string' ? head.trim() : null,
            files: ownFiles,
            totals: { files: ownFiles.length, additions, deletions },
            savedAt: new Date().toISOString(),
            note: 'flow done 时点冻结（本变更可归属面：baseline..HEAD 提交面过滤 .sillyspec/ 非本变更目录 + 本变更目录工作树件；含未提交与 untracked）',
          }
          if (typeof frozen === 'string' && frozen) {
            const patchText = frozen.endsWith('\n') ? frozen : frozen + '\n'
            writeFileSync(join(changeDir, 'change.patch'), patchText)
            meta.patchSha256 = createHash('sha256').update(patchText.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
            meta.patchStatus = 'ok'
          } else {
            meta.patchStatus = 'failed'
          }
          writeFileSync(join(changeDir, 'change-patch.json'), JSON.stringify(meta, null, 2) + '\n')
          console.log(`📦 变更 patch 留档：change.patch + change-patch.json（${ownFiles.length} 文件，+${additions}/-${deletions}${meta.patchStatus === 'ok' ? '，sha256 已锚' : '——patch 采集失败已留痕'}）`)
          // 模块文档对账（2026-09-25-thin-parity-assets：厚道 module-impact 死信门的轻量变更 advisory
          // 等价物——模块文档是后续变更门禁收窄/知识注入的原料，失供是复利折旧）
          try {
            const { reconcileModuleDocs } = await import('./flow-parity.js')
            const rec = reconcileModuleDocs({ specBase, ownFiles: committed, committedRaw })
            if (rec.lines.length > 0) for (const l of rec.lines) console.log(l)
          } catch { /* 对账 best-effort */ }
          patchOk = true
        }
      }
    } catch (e) {
      console.warn(`⚠️ patch 留档失败（fail-soft 不阻断归档；重入 flow done 从断点重试）：${(e && e.message) || e}`)
    }
    if (patchOk) mark('patch')
  }

  // ②c review：危险证据定档的独立评审（2026-09-25-thin-review-slice）。定档=证据累积制
  // （承诺词一票/盲维实质作答/diff 原语/决策密度/声明一票），文件数出局；缺省要评审、豁免要
  // 多证并举、豁免者 1/4 定额抽查采样。评审任务书由 CLI 渲染（agent 起干净上下文子代理执行，
  // 协议调用数不变）；FAIL 或 P1 发现=拦截（修复后删件重评再重跑 done，断点续）。
  if (st.substeps?.review === 'done') {
    skip('review')
    // 回填（修评审 P2②：续跑成功轮遥测不失忆——review 已发生但子步已标，从留档件回读结论）
    try {
      const { validateReviewJson } = await import('./flow-review.js')
      const rp = join(changeDir, 'review.json')
      if (existsSync(rp)) {
        const v = validateReviewJson(rp)
        reviewOutcome = v.ok
          ? { required: true, sampled: false, verdict: v.review.verdict, findingsP1: (v.review.findings || []).filter((f) => /^P1$/i.test(String(f.severity || ''))).length, backfilled: true }
          : { required: true, sampled: false, verdict: 'invalid', backfilled: true }
      } else {
        reviewOutcome = { required: false, sampled: false, verdict: 'exempt', backfilled: true }
      }
    } catch { reviewOutcome = { required: null, verdict: 'done', backfilled: true } }
  } else {
    const { classifyReviewNeed, renderReviewerTaskbook, validateReviewJson } = await import('./flow-review.js')
    let patchText = null
    try { patchText = readFileSync(join(changeDir, 'change.patch'), 'utf8') } catch { /* patch 子步 skip/失败面 */ }
    const tier = classifyReviewNeed({ changeDir, input: null, patchText, editRatio: st.edit_ratio ?? null, reviewForce: st.review_force ?? null, change })
    if (!tier.required) {
      console.log(`⚖️ 评审豁免（低风险证据齐全）：${tier.exemptEvidence.join('；')}`)
      reviewOutcome = { required: false, sampled: false, verdict: 'exempt' }
      mark('review')
    } else if (!existsSync(join(changeDir, 'review.json'))) {
      console.log(`⚖️ 本变更需要独立评审（${tier.reasons.join('；')}）——评审任务书如下，起一个干净上下文的子代理执行后重跑本命令：\n`)
      console.log(renderReviewerTaskbook({ change, changeDir }))
      reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'missing' }
      appendTelemetry(reviewOutcome) // 修评审 P2①：失败面先落账再 exit（校准信号不丢）
      reportMidFail('review')
      process.exit(1)
    } else {
      const v = validateReviewJson(join(changeDir, 'review.json'))
      if (!v.ok) {
        console.error(`❌ review.json 校验失败（${v.errors.join('；')}）——按任务书 schema 修正后重跑`)
        reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'invalid' }
        appendTelemetry(reviewOutcome) // 修评审 P2①
        reportMidFail('review')
        process.exit(1)
      }
      const p1s = (v.review.findings || []).filter((f) => /^P1$/i.test(String(f.severity || '')))
      const others = (v.review.findings || []).filter((f) => !/^P1$/i.test(String(f.severity || '')))
      if (v.review.verdict === 'FAIL' || p1s.length > 0) {
        console.error(`❌ 独立评审未过（verdict=${v.review.verdict}，P1 发现 ${p1s.length} 项）——承诺与实现不一致，不许归档：`)
        for (const f of [...p1s, ...others]) console.error(`   [${f.severity}] ${f.title} — ${f.evidence || ''}${f.location ? `（${f.location}）` : ''}`)
        console.error(`   修复后删除 review.json 并重新执行评审任务书（起子代理重评），再重跑 flow done（断点续）`)
        reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'FAIL', findingsP1: p1s.length }
        appendTelemetry(reviewOutcome) // 修评审 P2①：sampled+FAIL 恰是误豁免率校准的最关键信号
        reportMidFail('review')
        process.exit(1)
      }
      if (others.length > 0) {
        console.warn(`⚠️ 评审非阻断发现 ${others.length} 项（P2/P3，随归档留档）：`)
        for (const f of others) console.warn(`   [${f.severity}] ${f.title} — ${f.evidence || ''}`)
      }
      console.log(`✅ 独立评审通过（reviewer=${v.review.reviewer}${tier.sampled ? '，豁免抽查采样命中' : ''}）`)
      reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'PASS', findingsP1: 0 }
      mark('review')
    }
  }

  // ③ probes：thin 轻量跑无 verify-result 骨架——探针产物面（probe1-8 事实核验）由 flow done
  // 裁决自含（测试门+工件指纹）；升厚（tier=thick）时探针链由 run verify 的既有 --init --draft
  // 产物面承接（第 3 批资产复用，不重做）。本子步记账占位：thin=not-applicable 直过。
  if (st.substeps?.probes === 'done') { skip('probes') } else {
    if (st.tier === 'thick') console.log('ℹ️ 厚档探针链：run verify --done 时经 verify-probes --init --draft 承接（第 3 批既有面）')
    mark('probes')
  }

  // ④ distill：决策提炼（rejected/needsWait 异态 → 升厚留人工裁决，不静默吞）+ FR 索引提炼
  // （2026-09-22-thin-fr-distill-sync：轻量变更此前只蒸馏 decisions 不调 indexRequirements——
  // requirements 永不进 knowledge/fr，知识复利在新默认道断流；轻量变更无 design.md，域路由
  // 以基线以来交付 diff 供 deliverableFiles，伪域回退同口径）
  if (st.substeps?.distill === 'done') { skip('distill') } else {
    // 槽4收割（2026-09-25-thin-parity-assets：design「风险与死路」实质作答合成 decisions.md——
    // 轻量变更决策产出从零到一；已有 decisions 不覆盖）
    try {
      const { harvestSlot4Decision } = await import('./flow-parity.js')
      const h = harvestSlot4Decision({ changeDir, change })
      if (h.harvested) console.log(`🌱 槽4（风险与死路）收割 → decisions.md（随蒸馏链进 knowledge）`)
    } catch { /* 收割 best-effort */ }
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
    // 测试绑定行落盘（2026-09-25-thin-patch-bindings）：requirements 绑定槽 → test-trace.json
    // （FR 局部锚/candidate/machine），紧接的 indexRequirements 发号后随既有归档提升铸全局。
    try {
      const { extractRequirementBindings } = await import('./flow-draft.js')
      const rows = extractRequirementBindings({ changeDir, change })
      if (rows.length > 0) {
        const { writeChangeTrace } = await import('./test-bindings.js')
        const w = writeChangeTrace(changeDir, change, rows)
        if (w.changed) console.log(`🔗 测试绑定行落盘：${rows.length} 行 → test-trace.json（随 indexRequirements 发号归档提升）`)
      }
    } catch (e) { console.warn(`⚠️ 测试绑定行落盘失败（fail-open）：${(e && e.message) || e}`) }
    try {
      const { indexRequirements } = await import('./fr-index.js')
      const knowledgeRoot = join(specBase, 'knowledge')
      const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      const deliverableFiles = await attributedChangedFiles()
      const r = indexRequirements({ changeDir, knowledgeRoot, headHash: typeof head === 'string' ? head.trim() : '', deliverableFiles })
      if (r && Array.isArray(r.written) && r.written.length > 0) {
        console.log(`📚 FR 索引提炼：${r.written.map((w) => w.id).join('、')} → knowledge/fr/（域=${r.written[0].file}）`)
      }
    } catch (e) {
      console.warn(`⚠️ FR 索引提炼 best-effort 失败（不阻断归档链）: ${(e && e.message) || e}`)
    }
    mark('distill')
  }

  // ⑤ archive：归档经 runArchiveChain（thin 轻量工件面跳过 plan.md 硬校验；thick 不跳）
  if (st.substeps?.archive === 'done') { skip('archive') } else {
    // verify-result 机器回执（2026-09-25-thin-parity-assets：人类可读收口结论，随归档留档）
    try {
      const { renderVerifyReceipt } = await import('./flow-parity.js')
      let patchMeta = null
      try { patchMeta = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8')) } catch { /* 无冻结件 */ }
      let traceCount = 0
      try { traceCount = (JSON.parse(readFileSync(join(changeDir, 'test-trace.json'), 'utf8')).rows || []).length } catch { /* 无锚行 */ }
      // 实测面回填（断点续跑 ledger 已 skip 时本轮 var 为 null——从 flow-state.gate_summary 回读。
      // 不回读 verify-runs/test-result.json：隔离快照模式的结果落在临时快照目录且收尾即清，不可靠）
      if (!gateSummaryText) {
        try {
          const stNow = readFlowState(changeDir)
          if (stNow && stNow.gate_summary) gateSummaryText = String(stNow.gate_summary) + '（断点续跑回读）'
        } catch { /* 回读失败留 — */ }
      }
      const headNow = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      writeFileSync(join(changeDir, 'verify-result.md'), renderVerifyReceipt({
        change, baseline: st.baseline_commit, head: typeof headNow === 'string' ? headNow.trim() : null,
        gateSummary: gateSummaryText, review: reviewOutcome, traceCount, patchMeta,
        generatedAt: new Date().toISOString(),
      }))
      console.log('🧾 验证回执已合成：verify-result.md（随归档留档）')
    } catch (e) { console.warn(`⚠️ 回执合成失败（不阻断归档）：${(e && e.message) || e}`) }
    const { ProgressManager } = await import('./progress.js')
    const { runArchiveChain } = await import('./run/complete-handlers.js')
    // 锚定同 start（平台参数面）
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
    console.warn(`🧭 route_hint: thick（机器稿改写比例 ${st.edit_ratio ?? '?'} > 阈值 ${cfg.editRatioThreshold}——决策覆盖度低，该走厚档；advisory 不强制，测绿已轻量档过）`)
    if (cfg.editRatioEnforcement === 'block') {
      console.error('❌ flow.edit_ratio_enforcement=block：超阈阻断 done（降阈/改走 thick/回退 advisory 三选一）')
      process.exit(1)
    }
  }
  appendTelemetry(reviewOutcome) // 成功收口（失败面已在各失败路径提前落账，appendTelemetry 单点）

  console.log(`📦 归档断点：全部子步完成，即将归档——agent 把收口结果（子步清单+评审结论+验证回执）给用户看。`)
  console.log(`✅ flow done 完成（2/2 协议调用收口）：${change}——${SUBSTEPS.length} 子步 ${doneList.join('、')}；change 已归档注销。`)
  // Git 历史整理指引（2026-09-25-thin-freeze-git-hygiene）：多轮中间提交可压扁为单提交——审计
  // 真相在 change.patch（sha256 锚定）与归档产物，不依赖历史形态；baseline 在 change-patch.json。
  try {
    const finalHead = gitQuiet(cwd, ['rev-parse', 'HEAD'])
    if (st.baseline_commit && typeof finalHead === 'string' && finalHead.trim() && finalHead.trim() !== st.baseline_commit) {
      console.log(`🧹 Git 历史可自由整理：多轮中间提交可压扁为单提交——git reset --soft ${st.baseline_commit.slice(0, 10)} && git commit -m "<最终提交信息>"`)
      console.log(`   审计真相已冻结在归档件 change.patch（sha256 锚定）+ verify-result + review.json，不依赖 git 历史；`)
      console.log(`   注：knowledge「最近确认」hash 为溯源快照，压扁后成孤儿引用属预期（非活引用）。`)
    }
  } catch { /* 指引 best-effort */ }
  // 平台同步（同 flow start 尾部接线——归档后的 docs/knowledge/FR 面随本轮回推平台）
  try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
  return { change, substeps: doneList }
}

/** flow 命令族入口（index.js case 'flow' 接线）：flow start|done|amend-draft。 */
export async function cmdFlow(args, cwd, specDir = null) {
  const sub = args[0] || ''
  const rest = args.slice(1)
  // 平台参数面（2026-09-25-thin-platform-args，平台侧三子代理核对驱动）：specBase 统一走
  // resolvePlatformSpecDir——显式 --spec-dir/--spec-root > .sillyspec-platform.json 指针（fail-closed，
  // 指针失效报错不静默回退本地防状态分裂）> 本地。此前 flow 族零平台支持：--spec-dir 是 ENOENT
  // 崩溃路径、指针不读、--spec-root 静默忽略——平台 thin 派发被完全挡住。
  const getFlag = (name) => {
    const i = rest.indexOf(name)
    return i !== -1 && i + 1 < rest.length ? rest[i + 1] : null
  }
  const hasFlag = (name) => rest.includes(name)
  let specBase
  try {
    const { resolvePlatformSpecDir } = await import('./progress.js')
    specBase = resolvePlatformSpecDir(cwd, specDir || getFlag('--spec-root'))
  } catch (e) {
    console.error(`❌ 平台 spec 根解析失败（fail-closed，不回退本地防状态分裂）：${(e && e.message) || e}`)
    console.error('   修复：重跑平台 scan 重建 .sillyspec-platform.json 指针，或显式传 --spec-dir <specRoot>')
    process.exit(2)
  }
  // --runtime-root 透传（start/done 内部 resolveRuntimeRoot 优先取 platformOpts.runtimeRoot）
  const runtimeRootOpt = getFlag('--runtime-root') || null
  // 变更名白名单（平台核对实证：穿越名 ../evil 实测逃逸、default/quick-<hex> 形态崩溃）——
  // 词字符/点/横线/连字符/中文，拒路径分隔符与点穿越；default 与 quick-<8hex> 是进度库辅助键
  // 非实体变更，flow 层直接拒收
  const validateChangeName = (name, exitCode = 2) => {
    const bad = !name || name === 'default' || /^quick-[0-9a-f]{8}$/.test(name)
      || !/^[\w.\-一-鿿]{1,120}$/.test(name) || name.includes('..') || /[\/]/.test(name)
    if (bad) {
      console.error(`❌ 非法变更名「${name}」——flow 族要求：词字符/点/横线/中文，无路径分隔符与 ..，非 default/quick-<hex> 辅助键（平台键 <日期>-<slug>-<hex6> 天然合法）`)
      process.exit(exitCode)
    }
  }
  if (sub === 'start') {
    const change = getFlag('--change') || `flow-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(16).slice(2, 6)}`
    validateChangeName(change)
    return cmdFlowStart({
      change,
      input: getFlag('--input') || undefined,
      thick: hasFlag('--thick'),
      withTasks: hasFlag('--with-tasks'),
      reviewForce: hasFlag('--review') ? true : hasFlag('--no-review') ? false : null,
      cwd, specBase,
      json: hasFlag('--json'),
    })
  }
  if (sub === 'status') {
    // 三断点配套（2026-09-25-flow-checkpoints）：随时可查当前变更阶段/槽位/子步进度
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow status 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    const changeDir = join(specBase, 'changes', change)
    const st = readFlowState(changeDir)
    if (!st) {
      if (existsSync(join(changeDir, 'review.json')) || existsSync(join(changeDir, 'change.patch'))) {
        console.log(`📦 ${change}：已归档`)
      } else if (existsSync(changeDir)) {
        console.log(`📁 ${change}：变更目录在场但无 flow-state（可能头脑风暴预段产物，尚未进入轻量变更）`)
      } else {
        console.log(`❓ ${change}：变更不存在`)
      }
      return
    }
    const subDone = SUBSTEPS.filter((k) => st.substeps?.[k] === 'done')
    const subLeft = SUBSTEPS.filter((k) => st.substeps?.[k] !== 'done')
    // 槽位快检
    let designFilled = false, frFilled = false, bindingsFilled = 0, bindingsTotal = 0
    try {
      const dText = readFileSync(join(changeDir, 'design.md'), 'utf8')
      designFilled = Array.from(dText.matchAll(/<!--AGENT:槽\d+[^\n]*-->\n(\S)/g)).length >= 3
    } catch { /* 无 design */ }
    try {
      const rText = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
      frFilled = /### FR-\d+:/.test(rText.replace(/<!--[\s\S]*?-->/g, ''))
      bindingsTotal = (rText.match(/<!--AGENT:测试绑定FR-\d+/g) || []).length
      bindingsFilled = (rText.match(/<!--AGENT:测试绑定FR-\d+[^\n]*-->\n\S/g) || []).length
    } catch { /* 无 requirements */ }
    // 阶段推断
    let phase = '① spec（填 FR + design 槽）'
    if (designFilled && frFilled && bindingsFilled >= bindingsTotal && bindingsTotal > 0) phase = '② 执行（写代码跑测试）→ ①卡点：spec 摘要给用户确认'
    if (subDone.includes('ledger')) phase = '③ 归档（flow done 收口）'
    console.log([
      `📋 ${change}`,
      `   阶段：${phase}`,
      `   design 槽：${designFilled ? '✅ 已填' : '⬜ 未填'}｜FR 区：${frFilled ? '✅ 已填' : '⬜ 未填'}｜绑定槽：${bindingsFilled}/${bindingsTotal}`,
      `   子步：${subDone.length}/${SUBSTEPS.length}${subDone.length > 0 ? `（${subDone.join('、')}）` : ''}`,
      subLeft.length > 0 ? `   待办：${subLeft.join('、')}` : '',
      st.legacy_fallback ? `   ⚠️ 已升厚（legacy_fallback）——剩余流程走 run <stage>` : '',
    ].filter(Boolean).join('\n'))
    return
  }
  if (sub === 'done') {
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow done 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    return cmdFlowDone({ change, cwd, specBase, runtimeRootOpt, freezeDirty: hasFlag('--freeze-dirty') })
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
    // 切片四：editRatio 路由信号（D-005 advisory 定案——测绿可轻量档过；超阈提示+route_hint 落档）
    const cfg = readFlowConfig(specBase)
    // 路由信号取段级最大改写比（任一段过半=该段决策未被输入覆盖——聚合比会被未改段稀释）；
    // 段级明细 sectionRatios 已随 amendment 入 ledger，遥测可见。
    const maxRatio = Math.max(0, ...Object.values(r.sectionRatios || {}))
    if (maxRatio > cfg.editRatioThreshold) {
      writeFlowState(changeDir, { route_hint: 'thick', edit_ratio: maxRatio })
      console.warn(`⚠️ route_hint: thick——机器稿段级最大改写比例 ${maxRatio}（阈值 ${cfg.editRatioThreshold}）：决策覆盖度低，该走厚档（advisory：测绿可轻量档过，不强制；flow done 将醒目提示+遥测记账）`)
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
