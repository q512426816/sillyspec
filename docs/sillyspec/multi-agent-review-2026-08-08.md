# 多代理审查报告：SillySpec 逻辑缺陷与驾驭话术（对照 Grill-Me v1.1）

> 生成时间：2026-08-08 01:05
> 方法：5 个只读子代理并行审查（brainstorm 对齐 / 核心流程状态机 / quick·progress 一致性 / 引导话术与 SKILL / 债单对照），交叉去重后汇总。
> 性质：**只读审查报告**，未改任何代码。本文是后续改进的依据，不触发流程（修复走 quick 或完整流程，见文末行动清单）。
> 防重复基线：已逐条对照 `prompt-control-debt.md` + `self-audit-2026-08-07.md`，标明哪些是**真新发现**、哪些是**已知债单项**。

---

## 0. 一句话结论

SillySpec 在 **Grill-Me v1.1 三大原则**上：原则 3（Facts/Decisions 区分）做得比 Grill-Me 更扎实（决策记录带 `source` 可审计化）；原则 1（一次只问一个）已修；**原则 2（强制确认门控）是结构性弱项**，但根因不是"没写门控话术"，而是"门控分布错位 + `requiresWait` 只校验 answer 非空可被伪造绕过"——这是 self-audit 已知的 open follow-up，非本次新发现。

**本次审查的真正价值不在复核三原则（多数已决策），而在挖出一批债单里没有的真 bug**：noAI 步骤收尾绕过全部阶段完成 gate、quick 会话 change 行永不注销累积污染、brainstorm-auto Step 2 的 `requiresWait` 与"跳过追问"硬冲突、continue SKILL 引用已删除的 `/sillyspec:propose`、`DANGEROUS_PATTERNS` 在 W6 重构后过期等。详见 §2。

---

## 1. Grill-Me v1.1 三原则对照（含已有决策出处）

| v1.1 原则 | SillySpec 现状 | 已有决策出处 | 评判 |
|---|---|---|---|
| **1. 一次只问一个问题（正向引导）** | 主模式明确"一次一个"+正向理由；自动模式纯反向禁止 | self-audit #9（brainstorm.js 自相矛盾）已 fixed | **符合**（话术偏反，低危） |
| **2. 强制确认门控（未确认不得推进）** | Step 4/5（方案/设计）= `requiresWait` 真硬门；**Step 3（需求澄清）= conditionalWait 无硬门**；Step 8 末步显式去门控；`requiresWait` 只校验 answer 非空，挡不住 AI 伪造回答 | self-audit #6/#7/#8 保守修（conditionalWait 通道 + 话术警示，**未加硬门**）；P4.3/P4.3a defer（Grill verdict 推 sillyhub） | **部分符合**（门在方案/设计，不在需求对齐；有已知绕过路径） |
| **3. Facts 自主查 / Decisions 必须问用户** | "能查代码就不问"明确，P0/P1/P2 决策分级清晰，决策记录 `source: user/code/docs` 可审计 | P3.1 done（语义交 Design Grill）；B1 done（decisions 追踪矩阵诚实降级） | **符合且优于 Grill-Me**（source 字段是 Grill-Me 没有的可审计化） |

**关键定位差异（勿照搬 Grill-Me）**：Grill-Me 是给人在 IDE 里按按钮的 skill，确认门控靠"人没点确认就不推进"。SillySpec 是给 Agent 调用的 CLI 流程控制器，确认门控靠 `requiresWait` 让 `--done --answer` 不带 answer 时 exit(1) 硬阻断。两者的门控形态不同——SillySpec 的"门控"必须落到 CLI 层才有意义，prompt 层的"必须确认"对弱模型只是建议。这条差异决定了 §3 对"加强制门"类建议的处理态度。

---

## 2. 真新发现（债单里没有，按严重度）

### 2.1 状态机绕过类（最严重，直接掏空既有 gate）

#### 【S1·高·真 bug】noAI 步骤收尾绕过所有阶段完成 gate
- **位置**：`src/run/stage.js:315-345`
- **现象**：`runStage` 处理 `noAI: true` 步骤时，自动执行 `_cliAction` 后直接把 `stageData.status='completed'` 并落盘，**从不调用 `runStageCompletionGates`**。`runStageCompletionGates` 只在 `complete.js:464` 的 `completeStep` 阶段完成分支被调用——noAI 自动收尾与人工 `--done` 收尾走两套完全不同的逻辑。
- **直接受害者**：
  - **plan 阶段**：`buildPlanSteps` 返回 `[..., postcheck]`，postcheck 是 noAI 末步（`src/stages/plan.js:479-489`）。agent 完成 coordinator 后 `--done` → CLI 自动跑 postcheck → 直接标 plan completed。被绕过的 gate：Stage Review Gate（tier=independent 的 plan 审查 verdict=fail **不再阻断**）、`validatePlanOutputs`（FR 覆盖 / decision blocker / entry-point-wiring）、Plan→Execute Contract（`validatePlanForExecute`）。
  - **平台 quick scan**：`scan-profile.js:164` 把 step3 设为 noAI `scanPostcheck` 末步。平台模式 quick scan 完成 → 跳过 `handleScanStageCompleted` → manifest.json / postcheck-result.json / SCAN_COMPLETED 指针全部不落盘，**SillyHub 看不到 scan 完成**。
- **根因**："阶段完成"判定与"跑 gate"分散在 `completeStep` / `runStage-noAI` / `continueStep` 三处，没收敛到单一入口。
- **建议修法**：在 `runStage` 的 noAI 自动收尾分支标记 completed 前，调用 `runStageCompletionGates`（失败回滚不标 completed，与 completeStep 同范式）；或更稳妥——noAI 步骤只标自身 completed + 推进下一步，**不直接标阶段 completed**，把阶段完成决策权交还 `completeStep`。
- **档位**：完整流程（触及阶段核心流转，需 design + 测试）。

#### 【S2·中·真 bug】continueStep 阶段完成分支绕过 gate 与阶段 handler
- **位置**：`src/run/complete.js:859-919`
- **现象**：`continueStep` 在"无返回当前步 + 无 pending/waiting 步"时直接标 completed 返回，不调 `runStageCompletionGates`、不调 `handleScanStageCompleted`/`handleQuickStageCompletion`/`handleExecuteWorktreeCleanup`/`validateFileLocations`/`validateMetadata`，与 `completeStep` 的完成分支（complete.js:333-475）严重不对称。
- **触发窗口**：一个 `conditionalWait` 步骤是阶段最后未完成步骤、其后 optional 步骤全被 `--skip` 时可达。scan 的 `构建扫描项目列表`/`生成模块卡片文档`（scan.js:41,336）是 conditionalWait，可选步可 skip——理论上可达。
- **建议修法**：把阶段完成收尾抽成共享函数（`completeStage` 已存在于 stage-machine.js 且会跑 `_validateStageArtifacts`），让 continueStep 完成分支与 completeStep 一样跑 gates + handler。
- **档位**：与 S1 同批完整流程。

#### 【S3·中】"跳过任意一步 → validator 跳过"守卫过严
- **位置**：`src/run/complete.js:383-391, 463-469`
- **现象**：阶段完成分支用 `actualCompleted = filter(status==='completed').length` 与 `steps.length` 比较，**仅完全相等才跑 validator**。`skipped` 不计入 `actualCompleted`，所以**只要跳过任一 optional 步骤，整个阶段 validator 都不跑**。
- **后果**：scan 含 3 个 optional 步骤，agent `--skip` 其一后，`validateScanOutputs`（7 份 scan 文档 + modules 目录校验）在 `--done` 时整体跳过——核心 scan 文档缺失也不捕获。造成 run 路径与 `machine-interface gate` 路径结论分裂（gate 路径仍跑 validator）。
- **建议修法**：判定改 `filter(status==='completed' || status==='skipped').length === steps.length`；或更彻底——validator 不受 step 计数影响，进完成分支就跑。
- **档位**：quick（改判定逻辑 + 补测试）。

### 2.2 quick·progress 一致性类

#### 【Q1·中高·真 bug】quick 会话 change 行永不注销，listChanges 累积污染
- **位置**：`src/run/complete-handlers.js:550-673`（`handleQuickStageCompletion` 全函数无 `unregisterChange`）；`src/run/command.js:647`（quick 启动 `registerChange` 对 `quick-<hex>` 也执行）；`src/progress/change-registry.js:202`（`unregisterChange` 仅被 archive 调用）。
- **现象**：每个 quick sessionId（`quick-<8hex>`）启动时写入 `changes` 表 `status='active'`。`--done` 成功后只清 session 目录 + 重置 steps，**从不调用 `unregisterChange`**，归档也永远不走。结果 DB 里 active 的 `quick-<hex>` 行随每次 quick 单调累积。
- **后果**：
  1. `resolveQuickLinkedChanges` 累积 ≥2 条后，新 quick 非交互环境返回 `[]`（不关联真正活跃变更），交互环境把僵尸 `quick-<hex>` 当可关联变更列出。
  2. `progress.js` 的 `listChanges().length===1` 自动择一降级失效 → 不带 `--change` 时退到"无法确定当前变更"。
  3. doctor 孤儿检查（`doctor.js:59-76`）只遍历 `changes/` 目录、不遍历 DB active 集；quick-<hex> 无目录 → **既不被孤儿检查发现，也不被 consistency-doctor 发现**（quick 不在 `STAGE_ORDER`）。
- **建议修法**：`handleQuickStageCompletion` 成功路径补 `await pm.unregisterChange(cwd, changeName)`；doctor 孤儿检查增加反向遍历"active 但无目录且匹配 `quick-<hex>`"的行并提示/自动归档。
- **档位**：quick（修收尾 + 扩 doctor 检查）。

#### 【Q2·中】多 agent 并发下他者源码改动被算进本 quick 审计
- **位置**：`src/run/shared.js:411-520`（`auditQuickCompletion`）+ `src/run/stage.js:226-235`（baseline 录入）。
- **现象**：baseline 只在 quick 启动那一刻快照"已脏文件"。会话期间另一 agent 改了 `src/business.js`（非 `.sillyspec/`），到本 quick `--done` 时该文件不在 baseline、又非元数据 → 进 `changedFiles`，按危险模式/新增文件规则计入本会话审计，可能触发 BLOCKED 或被回填进本 quick 的 QUICKLOG "文件："行。
- **根因**：quick 用"整工作区"当审计域，无 per-session inflight 锚点。
- **建议修法**：长期看向 worktree-apply 的"锚 commit diff"范式靠拢（quick 启动落一个 inflight 锚 commit，`--done` 时 `git diff <anchor>..HEAD` 归属）。短期至少先修 Q3（裸 git status 静默降级）。
- **档位**：长期项走完整流程（需 design）；Q3 可 quick。

#### 【Q3·中·真 bug】baseline/audit 用裸 `git status` 未带 safe.directory，失败静默降级
- **位置**：`src/run/stage.js:226-227`、`src/run/shared.js:420`（裸 `execSync('git status --porcelain')`）；对比同文件 `safeGit(cwd, ['config','user.name'])`（stage.js:241）带 safe.directory。
- **现象**：两处不走 `safeGit`，在 cwd 存在 safe.directory 问题（linked worktree / 容器异 uid / Windows 挂载点）时抛错。stage.js baseline 抛错被 `catch` 吞（`:279` `console.warn('baseline 记录失败')`）→ `progress.quickGuard` 不写 → `--done` 时 guard=null → brownfield 跳过审计（同 Q4 后果）。
- **建议修法**：两处改 `safeGit(cwd, ['status','--porcelain'])`；baseline 捕获失败时不应静默继续，应 fail-loud 或显式阻断。
- **档位**：quick。

#### 【Q4·中·真 bug】平台模式 quick guard 写入路径与读取路径不一致
- **位置**：写 `src/run/stage.js:215`（`specBase/.runtime/quick-sessions/<change>`）；漂移检测读 `src/run/shared.js:176`（同 `specBase/.runtime`）；收尾读 `src/run/complete-handlers.js:558`（`resolveRuntimeRoot` → 设了 `runtimeRoot` 时返回 `runtimeRoot`，否则 `specBase/.runtime`）。
- **现象**：stage.js 与 shared.js 恒用 `specBase/.runtime`，complete-handlers.js 用 `resolveRuntimeRoot`。当 `runtimeRoot` 被设且与 `specBase/.runtime` 不同时，guard 写到 specBase/.runtime、收尾从 runtimeRoot 读 → 读不到 → `handleQuickStageCompletion` 走 guard=null brownfield 分支 → **完全跳过边界审计** + 兜底重分配 qlId + session 目录清错位置。
- **建议修法**：把"quick-sessions 目录"位置抽成单一函数（`resolveQuickSessionsDir`），三处共用。
- **档位**：quick。

#### 【Q5·中·真 bug】`DANGEROUS_PATTERNS` 在 W6 重构后过期
- **位置**：`src/run/shared.js:437-451`。
- **现象**：列表含 `src/run.js`、`src/progress.js`、`src/db.js`，但 W6 后这三者是 barrel/facade（run.js 23 行 barrel），真正逻辑在 `src/run/command.js`、`src/run/complete.js`、`src/run/gates.js`、`src/progress/stage-machine.js` 等。`file === p || file.startsWith(p)` 对 `src/run.js` 不会匹配 `src/run/command.js`（`.` vs `/`）。
- **后果**：本应触发"危险文件"BLOCKED 的改动不再触发，安全门静默失效。
- **建议修法**：dangerous 判定从硬编码清单改为目录前缀（`src/run/`、`src/progress/`、`src/db.js`、`src/hooks/` 等）；重构守则补一条"重构 src/ 模块时同步 DANGEROUS_PATTERNS"。
- **档位**：quick。

#### 【Q6·中】quick 第 3 步 `--done` 不带 `--output` 时静默产出空结果条目
- **位置**：`src/run/complete-handlers.js:603`（`if (outputText) validateQuickResult`）+ `:654`（`resultText: outputText || ''`）。
- **现象**：四字段校验与结果落盘都依赖 `outputText` 真值，completeStep 不强制 quick 末步必带 `--output`。agent 漏给 → QUICKLOG 条目仍翻"已完成"、结果块为空、无拦截。
- **建议修法**：quick 末步 `--done` 要求 `--output` 非空，缺则回退 pending + exit(1)。
- **档位**：quick。

#### 【Q7·中】`current-quick-run-id` 单文件 last-writer-wins，并发 `--done` 不带 `--change` 命中他者
- **位置**：`src/run/command.js:741`（每次 quick 非-done 启动覆盖写）；`:423-433`（`--done` 不带 `--change` 时 fallback 读该文件）。
- **现象**：并发两个 quick 会话，B 后启动覆盖 A 的 id；A 若 `--done` 不带 `--change` → 读到 B 的 sessionId → 用 B 的 changeName 读 progress、读 B 的 session guard、翻 B 的 QUICKLOG 条目。与 Q1 叠加更乱。
- **建议修法**：`--done` 不带 `--change` 且 fallback 文件 id 对应的 progress 已无 pending 步骤 / 已 completed 时，拒绝推进并要求显式 `--change`。
- **档位**：quick。

### 2.3 brainstorm-auto 自相矛盾类

#### 【B1·高·真 bug】brainstorm-auto Step 2 `requiresWait: true` 与"需求清晰跳过追问"硬冲突
- **位置**：`src/stages/brainstorm-auto.js:59`（`requiresWait: true, repeatableWait: true, maxWaitRounds: 5`）、`:71`（"目标明确…跳过追问，直接进入方案设计"）、`:111`（checklist 全 ✅ → AUTO_DECIDED）。
- **现象**：硬冲突。`requiresWait: true` 触发 CLI 硬门（`complete.js:223`），`--done` 不带 `--answer` 直接 exit(1)。但 prompt 又说"需求清晰就跳过追问、checklist 全 ✅ 就 AUTO_DECIDED"——这两种场景 AI 没问题要问，却被 CLI 强制要 `--answer`。AI 要么被迫编一个 `--answer "无需追问"`（伪造回答，正是 Grill 第三病），要么 `--wait` 一个不存在的问题。这是自动模式独有的设计裂缝，self-audit #6/#7/#8 未覆盖。
- **建议修法**：Step 2 改 `conditionalWait: true`（与主模式 Step 3 对齐），让"无需追问"路径能直接 `--done`。
- **档位**：quick（改元数据 + 同步 prompt 镜像 + SKILL）。

#### 【B2·中】brainstorm-auto AC checklist 缺业务/产品决策维度
- **位置**：`src/stages/brainstorm-auto.js:97-113`。
- **现象**：AC-001~AC-010 全是技术风险维度（公共 API / schema / 鉴权 / allowed_paths / 依赖 / 核心模块 / 项目约定 / 向后兼容 / 数据迁移 / 单模块）。一个变更技术上零风险（10 项全 ✅）但仍含业务取舍（默认 opt-in 还是 opt-out、日志是否含 PII、限流阈值、灰度策略）——这些会被 AUTO_DECIDED 吞掉。边界画错：把"低技术风险"等同于"无需用户决策"。
- **建议修法**：checklist 补 AC-011"不涉及业务规则/产品范围/默认行为/用户可见行为变更"；或判定逻辑改"技术 checklist 全 ✅ **且** 无 P0 业务歧义"才允许 AUTO_DECIDED。
- **档位**：quick。

#### 【B3·中】主模式 Step 8 末步显式去门控 + 两变体行为不一致
- **位置**：`src/stages/brainstorm.js:448-452`（注释"去确认门控"）、`:467`（"不暂停，展示完直接 --done"）、`:563`；对比 `brainstorm-auto.js:204-208`（Step 4 末步保留 `requiresWait: true`）。
- **现象**：主模式末步明确去确认门（理由"Step 5 已确认过设计"），但 brainstorm-auto 变体反而保留——两变体行为不一致。且 scale 跨档（Step 2 粗判 large → Step 8 精判 small，丢弃已写四件套转 quick）时用户无确认机会，只能在 `--done` 后 `--reopen` 回退。
- **建议修法**：至少在 scale 跨档（large→small 或 small→large）或生成后续变更包时，末步恢复一次 `requiresWait`；或统一两变体行为。
- **档位**：quick（需先在债单原则下评估——见 §3）。

### 2.4 话术/纯净性类（SKILL.md 与 CLI 行为不符）

#### 【P1·高·CLI 行为不符】continue SKILL 引用已删除的 `/sillyspec:propose`
- **位置**：`.claude/skills/sillyspec-continue/SKILL.md:20, 27`。
- **现象**：continue SKILL 仍指令 agent 执行 `/sillyspec:propose`，但 propose 入口在 self-audit #10 删孤儿 skill 时已移除（`docs/prompt/README.md:180` 标 `@deprecated`）。弱模型照做会报"命令不存在"，部分弱模型会脑补一个 propose 子命令（违反 SKILL 自己教的"不要编造 CLI 子命令"铁律）。这是删 propose 时漏了 continue 里的引用。
- **建议修法**：把 `2c` 改为"没有 design.md → 提示 `/sillyspec:brainstorm`"，删两处 propose 引用；或整棵判断树（2a~2g）按 `currentStage` 推进重写（`sillyspec status` 给的权威状态机比文件探测准）。
- **档位**：quick（纯文档）。

#### 【P2·中·CLI 行为不符】auto SKILL 门控机制与实际 AC-checklist 完全不符
- **位置**：`.claude/skills/sillyspec-auto/SKILL.md:42`（关键词匹配）、`:64-79`（简单/中等/复杂→0/1/2-3 审核子代理表）；实际 `brainstorm-auto.js:97-113`（AC-001~010 checklist）+ tier(self/independent)。
- **现象**：两套完全不同机制。SKILL 教弱模型做"关键词匹配 + 简单/中等/复杂→子代理数"启发式，但 agent 实际收到的 brainstorm-auto prompt 用 AC checklist + tier。弱模型按 SKILL 关键词法去读 prompt，发现匹配不上（prompt 写的是 AC-xxx 而非"请用户选择"），要么困惑要么回退自创规则。`command.js:134/640/938` 证实 auto 模式 brainstorm 走 `brainstormAutoDef`，与 SKILL 描述脱节。
- **建议修法**：auto SKILL 的"步骤循环/判断是否需要用户确认"段整段重写对齐 brainstorm-auto.js 真实机制；删"简单/中等/复杂→子代理数"表，改为"审查分级由 CLI 按 plan_level/文件数自动判 tier=self/independent"。
- **档位**：quick（纯文档）。

#### 【P3·中·纯净性】内部占位符 `{REVIEW_JSON_CONTRACT}` 泄露进 npm 化 SKILL
- **位置**：`.claude/skills/sillyspec-brainstorm/SKILL.md:104`、`sillyspec-plan/SKILL.md:73`、`sillyspec-execute/SKILL.md:109,113`。
- **现象**：`{REVIEW_JSON_CONTRACT}` 是 `prompt.js` 内部占位符，运行时已被替换（agent 实际收到的 prompt 没这串字面）。SKILL 提它 = 把源码内部符号塞进 npm 包分发给用户项目，违反 SKILL 外部纯净性规则。弱模型可能误以为要在产出里写这串字面。
- **建议修法**：统一改为"运行时 CLI 会把精确 schema 表 + 完整 JSON 示例 + docHash 算法注入到该步 prompt，以你实际收到的注入版契约为权威逐字模板"——删占位符名，描述行为。
- **档位**：quick（纯文档）。

#### 【P4·中】通用铁律 8 条全反向禁止、无"为什么"理由附着
- **位置**：`src/run/prompt.js:539-549`。
- **现象**：`只做本步骤描述的操作，不得自行扩展或跳过` / `不要回头修改已完成的步骤` / `不要编造不存在的 CLI 子命令` / `完成后立即执行 --done 命令，不得跳过`——8 条全是"不要/不得/禁止"，违反 Grill 原则 1（正向价值引导）。弱模型对否定指令遵从度系统性低于正向指令（"don't think of an elephant"效应），且无理由附着，弱模型遇未覆盖边缘情境时无原则可依。
- **建议修法**：关键几条改正向 + 理由。例：`不要编造不存在的 CLI 子命令` → `CLI 子命令必须来自本 prompt 或上一条 --done 输出的字面，不确定时停下问用户而非猜测`；`完成后立即 --done，不得跳过` → `本步骤产物落盘后必须跑 prompt 末尾的 --done，CLI 才会校验产出并推进状态机；不跑 = 进度永远停在本步`。
- **档位**：quick（改源码 prompt.js，同步 prompt 镜像 + 所有阶段 md）。

#### 【P5·中】execute persona 承诺"停下来反馈"但 CLI 无 `--wait` 通道
- **位置**：`src/run/prompt.js:155`（persona "发现 plan 不合理就停下来反馈，不要自己改方案"）；`sillyspec-execute/SKILL.md:148`；但 execute 全 12 步 `等待配置：无（可直接 --done）`。
- **现象**：话术正确但 execute 全阶段无 requiresWait/conditionalWait，CLI 不给 `--wait` 分支。"停下来反馈"在 prompt 末尾的"完成后执行"里没有对应命令模板——弱模型读完 persona 想反馈，却找不到 `sillyspec run execute --wait` 示例，可能干脆自己改方案或硬 `--done`。话术承诺通道，CLI 没铺设。
- **建议修法**：在 execute Wave 步 prompt 末尾加 `### 发现 plan 不合理时` + 显式命令 `sillyspec run execute --wait --reason "plan 缺陷：<具体问题>" --options "回 plan 修订,继续按现状执行"`（需同时在 execute.js 给 Wave 步加 `conditionalWait: true`）。
- **档位**：完整流程（触及 execute 阶段定义 + 需评估是否打破 execute 无人工门架构）。

### 2.5 低危/latent 类（可选，附录于 §5）

包含：continueStep 漏查 `in-progress`（latent）、`withFileLock` stale 30s 偏紧、`--from-step`+`--done` 静默忽略、`status==='blocked'` 无复位路径脆弱不变量、quick 删除文件无 override flag、`rotateIfNeeded` 裸 `renameSync`（Windows）、`tasks.md` 无独立锁、死分支 `status===' D'`、`maxWaitRounds=8` vs "2-3 轮即进入"张力、persona 只注入 step0、brainstorm Step 8 缺 outputHint、AUTO_DECIDED 丢失 source 区分、NEEDS_REVIEW 死状态、SKILL 残留 propose 对照（execute reviewType）、execute "不要自查 git 状态"过度绝对、knowledge SKILL 暴露 `src/stages/`。详见 §5 附录。

---

## 3. 需决策项（引用债单原则，勿直接加门）

> **重要**：以下"加强制门"类建议，与 `prompt-control-debt.md` 的改进原则冲突（**纯减法优先 / enforcement 三档标注 / 软判定推 sillyhub**）。立项前需论证为何推翻已决策原则，否则登记时引用 self-audit「遗留」段而非新立项。

#### 【D1】确认门控加硬门（self-audit #6/#7/#8 + 本次多处）
- **现状**：原则 2 的结构性弱项。最该门控的"需求对齐"环节（Step 3 conditionalWait）反而无硬门，末步（Step 8）还显式拆门；`requiresWait` 只校验 answer 非空、挡不住 AI 伪造回答（self-audit #7 已知）。
- **已决策**：self-audit #6/#7/#8 保守修（加 conditionalWait 通道 + 话术警示），明列"高危 requiresWait 强制真实交互 / AI 中继帧单独计数"为中等工程 follow-up，建议另起 change 评估。P4.3/P4.3a defer（Grill verdict 软判定推 sillyhub）。
- **决策点**：是否要把"确认门控"从 prompt 层自律升级为 CLI 硬门（如检测"是否经历过 waiting 状态"，无 waiting 痕迹直接走 `--done --answer` 的可疑路径给 warning/阻断）。
- **建议**：先做 self-audit「遗留」段建议的"AI 中继帧单独计数"（CLI 可机械判定），再考虑是否对 Step 3 / plan full 加硬门。**属定位决策，需 brainstorm**。

#### 【D2】plan.md / tasks.md 共享写竞态（lost update）
- **位置**：`src/run/complete.js:566-583`（`autoCheckPlanFromReviews` 持 `.plan.md.lock` 但 agent Edit/Write 不持锁）；tasks.md 无同款锁。
- **现象**：CLI 的 read-modify-write 与 agent 写入存在 lost update；`enforceReviewJsonGate` 早跑只校验已勾 task，`autoCheckPlanFromReviews` 新勾的不复查。多 agent / 并发 session 撞同一 change 时高频。
- **根因**：agent 侧无法加锁是根本限制。
- **建议**：plan.md 的勾选权威收归 CLI（agent 只写 review.json，CLI 自动勾），彻底消除共享写；或 doctor 自检加"plan.md checkbox vs review.json verdict 对账"阻断型检查。
- **建议档位**：完整流程（数据所有权变更，需 design）。

#### 【D3】execute 加人工 checkpoint
- **现象**：execute 全阶段零人工确认门，弱模型一路 `--done` 冲到底，错代码拖到 verify 才暴露（P5）。
- **已决策依据**：这是架构选择（worktree 隔离 + Task Review Gate 是机械防护）。若加 checkpoint 属行为语义变更。
- **建议**：至少在 execute SKILL 明示"execute 无人工确认门，弱模型批量执行风险由 verify 兜底"让调用方知情；或给 Wave 步 conditionalWait 让用户可选介入。
- **建议档位**：完整流程。

---

## 4. 优点与设计高光（保留作标杆，勿误改）

审查中确认的高水准设计，**不应在后续优化中削弱**：

1. **反脑补话术精准命名失败模式**：brainstorm 三处铁律不是泛泛"不要脑补"，而是命名模型最可能犯的具体形态——"自问自答 → 假装共识 → 推进"三连。弱模型对具体例子的遵从度远高于抽象禁令。这是多数系统做不到的。（`brainstorm.md:217,253,305` / `brainstorm-auto.js:129`）
2. **brainstorm SKILL L64 诚实披露 `requiresWait` 局限**：「requiresWait 门只校验 --answer 非空，挡不住『AI 伪造用户回答』——所以对方案选择/设计确认这类关键决策，优先用方式一让用户亲手作答」。完美的 Facts/Decisions 权责声明，符合 sillyhub 语义层分工。建议其它 SKILL 的 wait 步复用同款披露句式。
3. **Step 3 "可否决确认清单"显式命名逃逸口**：「未与用户确认过任何需求点、纯凭自身判断的场景，不得仅凭『我觉得清晰』直接放行（**这是把默认共识伪装成共识的逃逸口**）」。设计者自己点名了 Grill-Me v1.1 要根治的病。唯一遗憾是仅 prompt 层防御（见 D1）。
4. **verify 破坏性操作禁令三处一致**：SKILL + `_globalGuardrails` + 每步精简提醒（防 context 压缩遗忘）三处逐条对齐。
5. **quicklog CLI 接管层工程质量高**：`src/quicklog.js` 有完整并发/原子写/reader-writer 回归测试覆盖，已知历史问题（baseline 录入、flag 双生效、幻影目录、quicklog 并发加锁、四字段嵌套冒号）修复扎实。
6. **软化词扫描基本干净**：全 src 无"尽量不要/除非必要"类致命软化词漏洞。

---

## 5. 低危/latent 附录（P4，可选）

| # | 位置 | 现象 | 建议 | 档位 |
|---|---|---|---|---|
| L1 | `complete.js:857` | continueStep nextPendingIdx 只查 'pending' 漏 'in-progress'（latent，无现行触发路径） | 统一为 `pending \|\| in-progress` | quick |
| L2 | `quicklog.js:30-62` | withFileLock stale 30s 偏紧，偷锁后无 predicate 校验 | staleMs 提到 60-120s 或 CAS 语义 | quick |
| L3 | `command.js:172,689,781` | `--from-step`+`--done` 可同时传，前者被静默忽略 | 加入互斥校验 fail-fast | quick |
| L4 | `complete.js:262-280` | `status='blocked'` 后 exit 不落盘是隐式不变量，一旦有路径 `_write` 就卡死 | runStage findIndex 显式排除 'blocked' | quick |
| L5 | `shared.js:485-487` | 删除文件无 override flag，合法删除永久 BLOCKED | 显式声明"quick 禁删"或 `--force-baseline` 同时降级删除 | quick |
| L6 | `quicklog.js:209-215` | `rotateIfNeeded` 裸 renameSync，Windows 读端占用会崩 | 复用 writeAtomic 重试机制 | quick |
| L7 | `quicklog.js:226-244` | tasks.md 无独立锁，跨 git-user 关联同一 change 有竞态 | 加 `.tasks.md.lock`（同 plan.md 范式） | quick |
| L8 | `shared.js:466` | 死分支 `status === ' D'`（trim 后永不命中） | 删或注释说明 | quick |
| L9 | `brainstorm.js:79,180` | maxWaitRounds=8 vs "2-3 轮即进入"张力 | 改"按 P0 歧义数决定轮次，P0 全澄清后即进入" | quick |
| L10 | `prompt.js:151,178` | persona 含"不猜"但只注入 step0，context 压缩后失效 | 抽成 brainstorm `_globalGuardrails` 享每步提醒 | quick |
| L11 | `brainstorm.md:547` | Step 8 缺 outputHint（其它 7 步都有） | 补 `outputHint: '规范文件路径列表'` | quick |
| L12 | `brainstorm-auto.js:152-162` | AUTO_DECIDED 丢失 source 区分 | 规定 source 必填 code/docs 并附 evidence | quick |
| L13 | `brainstorm-auto.js:154` | NEEDS_REVIEW 是无触发条件的死状态 | 定义触发条件或从枚举删除 | quick |
| L14 | `execute/SKILL.md:91` | reviewType 残留 propose 对照 | 改为"区别于 brainstorm/plan 的 design" | quick |
| L15 | `execute/SKILL.md:45` | "不要自行检查 git 状态"过度绝对（apply 阶段实际校验 dirty） | 限定为"worktree 创建/进入不依赖 git 状态；apply 步以命令输出为准" | quick |
| L16 | `knowledge/SKILL.md:42,79` | JSON 示例暴露内部 `src/stages/` 路径 | 改为不涉及实现路径的描述 | quick |
| L17 | `doctor.js:59-76` + `consistency-doctor.js:44` | 僵尸 quick 会话无检测（与 Q1 同源） | doctor 增"active 但无目录且匹配 quick-<hex>"检查 | quick |

---

## 6. 行动清单（按优先级 + 建议档位）

### P0 真bug·尽快修
| # | 发现 | 档位 | 依据原则 |
|---|---|---|---|
| 1 | **S1** noAI 收尾绕过 gate（掏空 plan 审查门 + 平台 scan 集成） | 完整流程 | 纯减法收敛到单一入口 |
| 2 | **B1** brainstorm-auto Step2 requiresWait 与跳过追问硬冲突 | quick | 元数据修复 |
| 3 | **Q1** quick change 行永不注销累积污染 | quick | 修收尾 + 扩 doctor |
| 4 | **P1** continue SKILL 引用已删 `/sillyspec:propose` | quick | 纯文档 |
| 5 | **Q5** DANGEROUS_PATTERNS W6 后过期 | quick | 目录前缀化 |
| 6 | **Q3** baseline/audit 裸 git status 静默降级 | quick | 改 safeGit + fail-loud |
| 7 | **Q4** 平台 guard 写读路径不一致 | quick | 抽单一函数 |

### P1 质量门/弱模型·批量修
| # | 发现 | 档位 |
|---|---|---|
| 8 | **P3** `{REVIEW_JSON_CONTRACT}` 泄露进 3 SKILL | quick |
| 9 | **P2** auto SKILL 门控描述与实际不符 | quick |
| 10 | **Q6** quick --done 不带 --output 静默空结果 | quick |
| 11 | **S2** continueStep 完成分支绕过 gate | 完整流程（与 S1 同批） |
| 12 | **S3** "跳过任意步→validator跳过"守卫过严 | quick |
| 13 | **Q7** current-quick-run-id 单文件并发污染 | quick |
| 14 | **B2** brainstorm-auto AC checklist 缺业务维度 | quick |

### P2 话术正向化 + 一致性·批量走 quick
| # | 发现 | 档位 |
|---|---|---|
| 15 | **P4** 通用铁律 8 条正向化 | quick（改 prompt.js + 同步镜像） |
| 16 | **B3** brainstorm Step8 两变体一致性 + scale 跨档确认 | quick（先评估） |
| 17 | **P5** execute persona 承诺反馈但无 --wait 通道 | 完整流程（架构性） |
| 18-22 | L4/L8/L1/L14/L15 等低危纯文档/死分支清理 | quick 合并 |

### P3 需决策·立项前论证（§3）
| # | 发现 | 处理 |
|---|---|---|
| 19 | **D1** 确认门控加硬门 | 引用 self-audit「遗留」段，先做"AI 中继帧计数"再评估，需 brainstorm |
| 20 | **D2** plan.md/tasks.md 共享写竞态 | 勾选权威收归 CLI，需 design |
| 21 | **D3** execute 加人工 checkpoint | 需 design |
| 22 | **Q2** quick 并发审计他者改动 | 锚 commit diff 范式，需 design |

### 处置状态（2026-08-08 P2 批次，quick ql-20260808-001-fd63）

> 并发进行的 P0/P1 批次（`stage.js`/`shared.js`/`brainstorm-auto.js`/`continue SKILL` + 测试，均他人未提交）与本批在 `stage.js`/`shared.js`/`complete.js` 撞车，故拆分：安全子集先落，撞车项让出待补。

| # | 项 | 处置 | 说明 |
|---|---|---|---|
| 15 | **P4** 通用铁律正向化 | ✅ 已修 | `prompt.js` 5 条否定式（只做/回头/编造命令/--done/mv 改名）改正向 + 理由附着；保留 3 条已正向条目 + 测试断言（`### ⚠️ 铁律` / `- 文档优先`）；`docs/prompt/README.md` 镜像同步 |
| 21 | **L14** execute SKILL reviewType 残留 propose | ✅ 已修 | `brainstorm/plan/propose` → `brainstorm/plan` |
| 22 | **L15** execute SKILL「不要自行检查 git 状态」过度绝对 | ✅ 已修 | 限定为 worktree 创建/进入不依赖 git 状态；apply 步以命令输出为准 |
| 16 | **B3** brainstorm 末步两变体一致性 + scale 跨档 | ⊘ 评估后保留 | 两变体各含一次设计确认（主模式中段「分段展示设计」requiresWait 步、auto 末步 Step4 requiresWait），表面不一致由流程位置决定、意图一致，非 bug；「scale 跨档/后续变更包末步恢复 requiresWait」属加门，违反债单「纯减法优先」（§3/§7）。不改源码 |
| 18 | **L4** runStage findIndex 显式排除 blocked（latent） | ⏭ 让出 | 撞 `stage.js`（他人 P0/P1 S1 未提交）；待提交后另起 quick |
| 19 | **L8** `shared.js` 死分支 `status === ' D'` | ⏭ 让出 | 撞 `shared.js`（他人 Q3/Q5 未提交）；待提交后另起 quick |
| 20 | **L1** continueStep `nextPendingIdx` 漏 in-progress | ⏭ 让出 | 撞 `complete.js`（他人 S2 改 :859-919，紧邻 L1 :857）；待提交后另起 quick |
| 17 | **P5** execute persona 承诺反馈无 --wait 通道 | ⏭ 完整流程 | 架构性（触及 execute 阶段定义 + 评估是否打破 execute 无人工门），不在本 quick 批 |

---

## 7. 方法论反思：SillySpec vs Grill-Me 的定位差异（供改进方向校准）

用户参考的 Grill-Me v1.1 文章，其核心结论有三层，**逐层对应到 SillySpec 时要小心不要照搬表层话术**：

1. **"管住 AI 的嘴（单问单答）"** → SillySpec 已做（self-audit #9）。**但 SillySpec 比 Grill-Me 多一层**：Grill-Me 靠人读屏幕判断"问题是不是一次只问一个"，SillySpec 靠 `maxWaitRounds` + P0/P1/P2 深度优先 + `conditionalWait` 把"问几个、问什么"也结构化。这层不要丢。

2. **"管住 AI 的手（确认再开工）"** → 这是 SillySpec 的结构性弱项，但**根因与 Grill-Me 不同**。Grill-Me 的痛点是"AI 擅自跳转编码"（IDE skill 无 CLI 强制），解法是加一句"Do not enact until I confirm"。SillySpec 没有"擅自跳转编码"问题（状态机锁死，没 `--done` 就不推进），它的真问题是**"门控分布错位"**（门在方案/设计，不在需求对齐）+ **"硬门可被伪造 answer 绕过"**（self-audit #7）。照搬 Grill-Me 的"加确认话术"对 SillySpec 无效——话术已经够多了（Step 3 逃逸口、SKILL L64 披露都是话术），缺的是**机制**（D1 的"中继帧计数"）。

3. **"严格区分 Facts/Decisions"** → **SillySpec 做得比 Grill-Me 更彻底**。Grill-Me 文章里的区分是 prompt 层的"AI 只查事实、决策归用户"原则；SillySpec 把它物化成了 `source: user | code | docs` 字段（决策记录可审计）+ Design Grill 独立子代理（语义判定剥离主流程）+ sillyhub 语义层分工（软判定外推）。这是 SillySpec 的真正优势，改进时**应强化这个方向**（如 B2 给 brainstorm-auto 补业务维度 AC、L12 强制 source 落 code/docs），而不是削弱它去模仿 Grill-Me 的纯话术形态。

**一句话**：Grill-Me v1.1 是给弱人机交互补话术护栏；SillySpec 的同类问题是补**机制**（D1 中继帧、S1/S2 gate 收敛、Q1 进度库一致性）。话术层面 SillySpec 已是业界 8.5 分水准（§4），短板全在"话术承诺了机制却没兑现"（P1 幽灵命令、P2 机制不符、P5 无 --wait 通道、S1 gate 被绕过）。改进优先级应是**兑现机制** > 补正向话术 > 加新门控。

---

## 附：审查覆盖文件清单

- `src/run/stage.js`、`src/run/complete.js`、`src/run/complete-handlers.js`、`src/run/gates.js`、`src/run/command.js`、`src/run/prompt.js`、`src/run/shared.js`、`src/run/scan-profile.js`
- `src/stages/{brainstorm,brainstorm-auto,plan,execute,scan,verify}.js`、`src/stages/doctor.js`
- `src/progress/{shared,consistency-doctor,change-registry,stage-machine,step-store}.js`、`src/quicklog.js`、`src/task-review.js`、`src/machine-interface.js`、`src/index.js`
- `.claude/skills/sillyspec-{brainstorm,plan,execute,verify,quick,continue,auto,knowledge}/SKILL.md`
- `docs/prompt/{README,brainstorm,brainstorm-auto,plan,execute,quick,scan}.md`
- `docs/sillyspec/prompt-control-debt.md`、`docs/sillyspec/self-audit-2026-08-07.md`
