---
author: qinyi
created_at: 2026-09-21T16:20:00
plan_level: full
risk_level: medium
---

# 设计文档 — R5 效率优化第 2 批（四修复）

## 背景与证据链

R5 对撞（round5/r5-collision-ehs-attribution.md）+ 第 1 批 verify 实证移交两项 + GSD 源码对照（第十一节）。四项互不耦合，接触面分属渲染层（run/prompt.js）、快照层（run/gate-snapshot.js）、派发层（stages/execute.js + plan.js）。

- **P8**：73 次 CLI 调用注入 252KB 指令文本，同步骤复入全量重印（单次最大 24KB），随上下文每轮重发——「轮数 × 上下文」乘数的基数贡献者。
- **P16/batch1 移交**：gate 快照双写分叉（双侧均异于 merge-base 祖先）取主仓，定向 worktree 跑遇主仓并行异动时拿走无本变更代码的版本 + worktree 新测试 → module 实测假红一轮。
- **P13/GSD**：per-task 派发 15 次交接、每子代理重建 100K+ 冷上下文（R4 实测轮均 148K）；GSD 以 PLAN（2-3 任务）为派发单位、阻塞回收。
- **P14/GSD 对照纠错**：GSD 在 Claude Code 上永远 spawn+阻塞等待，inline 仅运行时兜底——direct 模式是本仓数据的结论（对撞 A 组 7′ vs B 组 70′），非 GSD 抄袭项，须显式标注分歧。

## 总体方案（范围）

四模块修复渲染层/快照层/派发层三个互不重叠的接触面：M1 指令指纹增量压「轮数×上下文」基数（P8 252KB 实证）；M2 快照分叉态取 worktree 血统根除 verify 假红（batch1 移交）；M3 PLAN 粒度派发默认化压交接税（P13/GSD，复用第 1 批三条件与返回契约）；M4 execution_mode 直写通道承接清晰输入任务（对撞 A 组实证，GSD 分歧在案）。红线不动：四道防线判定语义/请求钳/allowed_paths 门禁/状态机步数/DB schema/ceremony 定价（决策密度轴属第 3 批）。Wave：W1=M1+M2 并行（独立测试面、文件正交），W2=M3、W3=M4（同触 execute.js 拆波串行），W4=镜像与文档收口。

## 模块 M1：F7 指令指纹增量（渲染层，D-001@v1）

**落点**：`src/run/prompt.js`（outputStep 步骤指引渲染）。

**机制**：
1. 步骤指引**静态段**（persona/prompt 正文模板/铁律/命令模板等不含动态占位符替换结果的部分）渲染后计算 sha256 指纹；
2. 首见（指纹变更或落盘文件缺失）→ 全量渲染 + 落盘 `.sillyspec/.runtime/step-guides/<stage>-<stepIdx>-<fingerprint8>.md`；
3. 复入（指纹一致）→ 只输出 3 行头部：步骤名 + `fingerprint=<8位>` + 落盘路径 + 「指引内容未变，需要全文 Read 上述路径」；**动态注入段（材料包/知识命中/{DOCS_DEBT}/进度快照等每次不同的段）不缓存、照常渲染**；
4. `--json` 模式（src/index.js withJsonOutput 劫持 console.log→stderr）不受影响走全量（机器消费方不读盘、outputStep 全文照出）——Grill P2-2 修订：原引 machine-interface.js 有误，该文件是门控/事实核验 JSON envelope 层无指引输出通道。

**指纹输入集口径（Grill P3-3）**：指纹=**本次实际渲染出的静态段字符串**的 sha256（非模板原文）——条件话术分支/persona 仅首步注入等上下文差异自然导致指纹不同→全量重印，无歧义口径。**边界**：不改变任何步骤语义与门禁判定；guide 文件按指纹寻址天然幂等，`.runtime` 归档清理路径照扫。

**验收**：同指纹复入输出 ≤10 行（含动态段另计）断言；指纹变更全量重印；动态段两次渲染均在；machine 接口全量不回归。

## 模块 M2：gate 快照血统根治（快照层，D-002@v2）

**落点**：`src/run/gate-snapshot.js:408-430` 会话文件 overlay 的双写一致性判定。

**现状（源码核实，Grill P2-1 修订）**：三方比对按 **merge-base 祖先内容**（`git show mb:file`，CRLF 归一+trim 同口径），非 mtime。三态：①`cwdDiff && !wtDiff`（主仓直写新、worktree 停基线）→ 取主仓（2026-09-20 保护场景，**不动**）；②`wtDiff && !cwdDiff` → 取 worktree（正常流，不动）；③**双写分叉（双侧均异于祖先且互不相等）→ 现行取主仓（cwd）**——batch1 假红根因：定向 worktree 跑 verify 时，主仓侧同文件被并行 quick 修复改动，分叉取主仓=拿走无本变更代码的版本，配上 worktree 新增测试文件（新文件不受分叉判定）→ src/test 血统断裂假红。

**机制（只改第③态）**：双写分叉 → **取 worktree 版**（sourceRoot=worktree 定向跑的语义=验证本变更分支交付，分支是本变更血统真相；主仓侧同文件异动是干扰源）+ 保留现行显式警告，警告文案补对齐指引（"分叉取 worktree 分支版——主仓侧改动若需保留请 apply/对齐后复跑"）。①②态逐字节不动。

**与保护场景的关系（Grill P1 修订）**：保护场景=①态（worktree 停基线、wtDiff=false），走原路取主仓——本修复不触碰；分叉态下取 worktree 不会回归 2026-09-20 实证（该实证是纯①态）。apply 完成后主仓单源，verify 不再定向 worktree，无新冲突面。

**验收**：三态回归钉各一——①态取主仓（既有保护零回归）／②态取 worktree（零回归）／③态分叉取 worktree（batch1 假红场景复刻：主仓异动+worktree 交付 → src/test 同血统，module 实测不再假红）；既有 5 个快照一致性测试零回归。

## 模块 M3：PLAN 粒度派发（派发层·默认化，D-003@v1）

**落点**：`src/stages/execute.js`（buildWavePrompt 派发段）+ `src/stages/plan-postcheck.js`（checkBatchAdvisory 升级）。

**机制**（第 1 批已建 batch 通道，本批把它从「agent 可选」升为「CLI 预计算默认」）：
1. CLI 按**第 1 批三条件**（allowed_paths 正交 / 无 provides-expects_from 契约链 / ≤3）机械预计算本 Wave 推荐分组，注入派发段「推荐分组：[task-03,task-04] / [task-06]」；
2. 不满足条件的 task 独立成组照旧；agent 可偏离推荐但须在 Wave 摘要披露理由（保留裁决权，机械建议不夺权）；
3. checkBatchAdvisory 从「提醒可并批」升级为附推荐分组清单（同一纯函数输出扩展）；
4. 子代理返回契约（第 1 批 C-1）按组聚合回收：组内逐 task 审查/review.json/checkbox 照旧，主代理回收按组一次。
5. **SillyHub 派发互斥（Grill P3-1）**：SillyHub 模式按派发段一 Wave 一 mission 执行，推荐分组注入段仅本地 Agent tool 派发路径渲染（同第 1 批 batch 指导的互斥口径，execute.js:1346 既有约定）。

**验收**：三条件分组函数纯函数单测（正交/契约链/帽值边界）；buildWavePrompt 渲染含推荐分组行；advisory 文案含分组；既有 per-task 派发路径零回归（不满足条件时行为与旧版逐字节一致）。

## 模块 M4：execute direct 模式（派发层·通道，D-004@v1）

**落点**：`src/stages/plan.js`（frontmatter 模板）+ `src/stages/execute.js`（步骤渲染分支）。

**机制**：
1. plan.md frontmatter 新增 `execution_mode: main | dispatch`，**缺省 dispatch**（既有变更零影响）；
2. `execution_mode: main` 时 execute Wave 步渲染切换为**主代理直写指引**（M3 推荐分组段在 main 模式下显式抑制——无派发即无分组语义，Grill P3-2）：逐任务「读卡 → 实现（worktree 内直写）→ 每任务 commit → writeCommitAnchorToTaskCard 锚点 → review write → 下一任务」；跳过子代理派发段/工作目录强制段/并发帽段（无子代理）；
3. worktree 隔离、写入守卫、review.json、verify 门禁全部保留——只换执行宿主，不换任何防线；
4. 判据自动化（何时建议 main）留第 3 批 ceremony 决策密度轴；本批纯通道，由 agent 在 plan 生成时按「输入已含决策 × 任务文件正交性」声明。

**与 GSD 的显式分歧标注**：GSD 在 Claude Code 永远 spawn 子代理（inline 仅无 Agent 工具运行时兜底）；本通道依据是本仓对撞实证（A 组主代理直写 7′ 进码 vs B 组派发 70′），源码对照记录于 round5 第十一节——设计文档留此分歧声明防后人误考据。

**验收**：frontmatter 缺省 dispatch 渲染与现行为逐字节一致（零回归钉）；main 模式渲染含直写指引段且不含派发段；两模式锚点/review 调用一致。

## 红线（全部不动）

四道防线判定语义 / 请求钳 / allowed_paths 门禁 / 状态机步数 / DB schema / ceremony 定价引擎（决策密度轴属第 3 批）。

## Wave 划分

- **W1（并行）**：M1（渲染层）+ M2（快照层）——互不依赖，独立测试面。
- **W2（依赖 W1 合入后的全量绿）**：M3 + M4（同触 execute.js 派发段，串行实现避免同文件冲突；M3 先 M4 后）。

## 验收协议（本批 → R5 对撞重跑）

硬门：全量测试零回归 + lint；快照血统回归钉；指纹增量输出断言。重跑对撞指标（外部执行）：写码前 ≤35′ / 门禁轮次 ≤2 / token ≤1.7× / 三类卡点零复现。

## 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| M2 分叉取 worktree 在「apply 后主仓单源」场景拿旧版 | 中 | apply 完成后 verify 不再定向 worktree（sourceRoot 缺省主仓），路径不交叉；警告文案含对齐指引 |
| M1 指纹误判给旧指引 | 低 | 指纹=渲染结果 sha256 内容寻址，静态段变必换指纹 |
| M3 预分组误并契约任务 | 低 | 三条件含契约链检查 + agent 可偏离须披露（双层） |
| M4 agent 滥声明 main | 低 | 防线与模式无关恒在；误用只损失并行收益不损失审查/验证 |
| 主仓并行会话同文件冲突 | 中 | W2 串行同文件实现；提交走显式 pathspec（既有纪律） |

## 自审（Self-Review）

- 四模块接触面互不重叠（渲染/快照/派发三层），Wave 划分 W1 并行两独立面、W2 同文件串行——无隐式耦合。
- 与第 1 批关系：复用 batch 三条件与返回契约（D-003 明示），无重造；遗留移交两项（快照血统/指令体积）全部承接。
- Grill 两轮纠错在案：M2 存在性判定→谓词判定（P1）、mtime 错引→merge-base 口径（P2-1）、machine-interface→withJsonOutput（P2-2）——设计修订均溯源到源码行号。
- GSD 分歧显式标注（M4）：防后人误考据 direct 模式出处。
- 红线清单显式划出 ceremony 决策密度轴（第 3 批）与 F8 步进折叠——本批不触碰。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/prompt.js | M1 指纹分流渲染（静态段指纹+落盘+复入短输出） |
| 修改 | src/run/gate-snapshot.js | M2 分叉态取 worktree（:424-426，①②态不动） |
| 修改 | src/stages/execute.js | M3 推荐分组注入 + M4 main 模式渲染分支 |
| 修改 | src/stages/plan.js | M4 frontmatter 模板加 execution_mode 键 |
| 修改 | src/stages/plan-postcheck.js | M3 checkBatchAdvisory 附分组清单 |
| 新建 | NEW:test/step-guide-fingerprint.test.mjs | M1 指纹断言（复入 ≤10 行/--json 全量） |
| 新建 | NEW:test/gate-snapshot-lineage.test.mjs | M2 三态回归钉 |
| 新建 | NEW:test/plan-grouping-recommend.test.mjs | M3 分组纯函数+渲染断言 |
| 新建 | NEW:test/execution-mode-render.test.mjs | M4 双模式渲染钉（缺省零回归） |
| 修改 | test/gate-snapshot-ancestor-trim.test.mjs | task-02 连带：③态语义翻转期望更新（D-002@v2 批准语义，与 trim/verify-gate-snapshot 同款先例——执行期补录，非计划文件） |
| 修改 | docs/prompt/plan.md | 镜像机械重生成 |
| 修改 | docs/prompt/execute.md | 镜像机械重生成 |
| 修改 | docs/prompt/_extracted.json | 镜像机械重生成 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md | task-05 行为行增补 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.changelog.md | task-05 边车 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | task-05 视落位增补 |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | task-05 边车 |
