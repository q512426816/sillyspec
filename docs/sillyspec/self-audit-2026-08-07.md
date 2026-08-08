---
title: SillySpec 三维度自审报告（2026-08-07）
updated_at: 2026-08-08
type: audit
status: fixed
---

# SillySpec 三维度自审报告（2026-08-07）

> **修复状态（2026-08-08）：14 条全部修复完成，`npm test` 130/0、`lint` 72 文件通过。** 详见文末「修复落实」。

一次工作流驱动的三维度自审，三个审查代理并行跑、结果与 `prompt-control-debt.md` 债单去重。
本报告是落盘存档 + 修复顺序依据。每条标注来源维度与复核状态。

**三维度**：
- **guidance** — 驾驭方式引导话术（Grill-Me 视角：单问单答 / 确认门控 / 准确性）
- **prompt-machine** — prompt 与机器校验一致性（产物路径 / wait 流 / 占位符注入）
- **cli-logic** — CLI 核心逻辑（状态机 / 并发 / gate 只读契约）

---

## 复核结论（critical 降级）

cli-logic 报的 critical「machine-interface 声明只读却会建库落盘写 marker」经主会话逐行复核：

- **属实部分**：`runGate/runDerive` → `pm.read` → `_ensureDB` → `db.init()`，`db.js:init():43-47` 在 **schema 版本戳不匹配时**会 `_createSchema() + _save() + 写戳`。即 DB 不存在 / 版本落后（冷启动、版本升级）时，只读路径确实会建库+落盘+写版本戳，违反 D-002「不写 sillyspec.db」字面契约。
- **不属实部分**：「写 marker」——`pm.read` 纯 SELECT，`init` 只写 schema 和版本戳，**不是进度 marker**。且 sql.js 内存库 `PRAGMA journal_mode=WAL` 不产生 `.db-wal/.db-shm` 磁盘旁文件（现网实测无）。
- **触发条件**：仅冷启动/版本升级，**非常态**。稳定态下只读路径零写盘（W4-H 优化）。

**定级：critical → medium-high**。真实契约不一致，但非「每次只读都写库」的高危破坏。修复方向：machine-interface 只读打开 db / db 不存在返回 exit 2；execute marker 缺失对齐 gates.js 生成稳定 runId。

---

## 修复顺序（按严重级 + 影响面）

| # | 严重级 | 维度 | 标题 | 文件 |
|---|--------|------|------|------|
| 1 | critical→med-high | cli-logic | machine-interface 只读契约被破 + execute marker 缺失误导 | src/machine-interface.js |
| 2 | high | prompt-machine | `sillyspec worktree diff` 幻影命令 | src/stages/execute.js:334, src/index.js:811 |
| 3 | high | prompt-machine | auto 模式 brainstorm 产物路径与 validator 硬冲突 | src/stages/brainstorm-auto.js, src/stage-contract.js:264 |
| 4 | high | cli-logic | plan.md 读-改-写无锁（多 agent 并发覆盖） | src/run/complete.js:524-562 |
| 5 | high | cli-logic | execute-run-id 缺失覆盖 marker（无目录扫描兜底） | src/run/gates.js:323-335 |
| 6 | high | guidance | plan→execute 零确认门（最大默认共识擅自开工点） | src/stages/plan.js |
| 7 | high | guidance | requiresWait 只校验 waitAnswer 非空，防不住伪造回答 | src/run/complete.js:201 |
| 8 | high | guidance | conditionalWait 逃逸口邀请默认共识（需求澄清/Design Grill） | src/stages/brainstorm.js:178 |
| 9 | high | guidance | 「一次问清」与「一次只问一个」自相矛盾 | src/stages/brainstorm.js:82 vs :155 |
| 10 | high | guidance | propose skill 指向不存在的 stage | .claude/skills/sillyspec-propose/SKILL.md |
| 11 | medium | cli-logic | STAGE_ORDER 含 scan 致下游判定把 scan 当主流程首环 | src/progress/shared.js:22, stage-machine.js |
| 12 | medium | cli-logic | resolveWaitingStepWithAnswer 只解第一个 waiting（多 waiting 静默错答） | src/run/complete.js:140-195 |
| 13 | medium | prompt-machine | --confirm-mode 惰性 flag（解析后无消费者） | src/stages/execute.js:190, complete.js:157 |
| 14 | medium | prompt-machine | scan 两处条件等待缺 conditionalWait flag（页脚不渲染） | src/stages/scan.js:40, 331 |

> guidance 维度的 6-10 属「机制补确认门 / 话术准确性」，改动面较大且涉及行为语义，建议单独评估是否走完整流程；1-5 为确定性 bug / 死引用，优先 quick 修。

---

## 各维度详录

### 维度一：cli-logic（CLI 核心逻辑）

**总评**：质量相当高，坑编号+历史教训注释密集，多数 gate fail-closed、回滚收敛、原子写齐备。但因经验补丁多，出现几处「三处判定不同源」裂缝（completeStep / checkTransition / runGate）。

1. **[critical→med-high]** machine-interface 只读契约被破（详见上方复核结论）。
2. **[high]** gate 对 execute 的 task-reviews 校验口径与 execute --done 完成门不一致；execute-run-id 缺失时 `gates.js:323-335` 直接 generate 覆盖 marker，无目录扫描兜底（stage-review 的 `getLatestStageReviewRunId` 有），marker 丢失而 agent 已用旧 runId 落盘时误判缺 review.json。两条 run-id 恢复路径不同源。
3. **[high]** `autoCheckPlanFromReviews`（complete.js:524-562）execute --done 路径对 plan.md 读-改-写无锁，并发 execute --done / 手动勾选互相覆盖；plan.md 是 agent 与 CLI 共享文件，Windows 整文件覆盖会读半截（fs-atomic.js 头注明的坑这里没用原子写）。
4. **[medium]** `STAGE_ORDER` 含 scan（shared.js:22），`_getDownstreamStages` 把 scan 当主流程首环，一致性检查（consistency-doctor.js:74-83）在 scan stale/revising 时误报 brainstorm/plan/execute 不该 completed。`_getNextSuggestion` 已显式跳过 scan 但下游判定同源不同判。
5. **[medium]** `resolveWaitingStepWithAnswer`（complete.js:140-195）只 `findIndex` 解第一个 waiting，多 waiting 时 `--done --answer` 静默落到非目标步骤；continueStep 已做「多 waiting 必须 --from-step 指定」保护，completeStep 没有。

### 维度二：prompt-machine（prompt ↔ 机器校验一致性）

**总评**：产物文件名/路径与 validator 严格同源，wait 流与 complete.js 逐字对齐，三个 frontmatter 均被真实读取。债单去重后残留集中在 execute 阶段，无 critical。

1. **[high]** `sillyspec worktree diff` 幻影命令：execute.js:334 prompt + index.js:811 引导都引用未实现子命令，违反「编造不存在 CLI 子命令」铁律（prompt.js:544）。建议实现该子命令（包装 `git -C <worktree> diff <base>`）。
2. **[high]** auto 模式 brainstorm 产物写 `brainstorm/` 子目录，`validateBrainstormOutputs` 只认变更根目录，step3 --done 必被硬阻断，auto 流程第一步产物落盘即卡死。
3. **[medium]** `--confirm-mode` 惰性 flag：execute.js:190 让 agent「读取 CLI 传入的参数」，但值既不注入 prompt 也无消费者（complete.js:157 解构后再无引用）。
4. **[medium]** scan 两处条件等待（scan.js:40、331）prompt 体内手写 --wait 命令，但 step 定义缺 `conditionalWait: true` 字段，CLI 不注入条件等待页脚，与注入框架脱节。

### 维度三：guidance（驾驭方式引导话术，Grill-Me 视角）

**总评**：机制强、话术参差。硬门控（requiresWait/Stage Review Gate/docHash fail-closed）兜住关键确认点，但对照 Grill 三原则有四个实质缺口。

1. **[high]** requiresWait 门只校验 waitAnswer 非空，挡不住「AI 伪造回答」；brainstorm skill 把「方式一：AI 自行交互后一步 --done --answer」设为官方推荐，等于诱导中继式确认。
2. **[high]** plan（Wave/task 拆分）→ execute 全程零确认门，是整个链路最大「默认共识擅自开工」点；plan.md 由 AI 生成+自审+机械 postcheck 后直接流转 execute。
3. **[high]** 「能一次问清的不要拆成多轮」(brainstorm.js:82) 与「一次只问一个问题」(:155) 自相矛盾，弱模型最易读成批量提问许可。
4. **[high]** conditionalWait 逃逸口（brainstorm.js:178-179）「需求已清晰可正常完成」由 AI 自评无外部校验，邀请默认共识。
5. **[high]** `sillyspec-propose` skill 整体指向不存在的 stage（`sillyspec run propose` 报「未知阶段」）；continue/status 残留 HANDOFF.json 死引用；status/state/progress 三套并存。

---

## 备注

- 本报告由三代理工作流产出，critical 经主会话独立复核降级，其余 high/medium 保留代理定级（修复时逐条实证核验）。
- guidance 维度 6-10 涉及行为语义变更，修复前先查 `prompt-control-debt.md` 确认非已 done/defer 决策。

---

## 修复落实（2026-08-08）

14 条全部修复，`npm test` 130/0、`lint` 72 文件通过。逐条：

| # | 修复内容 | 关键文件 |
|---|---------|---------|
| 1 | machine-interface 两处入口（runGate/runDerive）加只读契约守卫：db 不存在时 fail-closed 返回 exit 2 不建库；execute 段 marker 缺失改用 `resolveLatestExecuteRunId` 扫描兜底（不再拿 `''` 误导校验） | src/machine-interface.js |
| 2 | 实现 `sillyspec worktree diff <change> [--base]` 子命令（包装 `git -C <worktree> diff <base>`，base 取 meta.baseHash→HEAD）+ help 补一行 | src/index.js |
| 3 | auto brainstorm step3 全部产物（design/decisions/gaps/assumptions/next-action）改写变更根目录（对齐 validator），step4 删冗余「根目录再写一份 decisions」 | src/stages/brainstorm-auto.js |
| 4 | plan.md 读-改-写整体包 `withFileLock` + `writeAtomicSync`（锁文件 changeDir/.plan.md.lock） | src/run/complete.js |
| 5 | task-review.js 新增导出 `resolveLatestExecuteRunId`（marker→目录扫描 mtime 最新）；gates.js execute 完成门 marker 缺失先扫描再决定是否 generate | src/task-review.js, src/run/gates.js |
| 6 | plan `review_plan` step 加 `conditionalWait:true` + prompt 加「执行前确认门（plan_level=full 时展示计划摘要等用户确认）」 | src/stages/plan.js |
| 7 | brainstorm skill 方式一/二互换：分步式（用户亲见选项再答）升推荐，一步式降非推荐，加「--answer 须为用户真实回答、防伪造」警示 | .claude/skills/sillyspec-brainstorm/SKILL.md |
| 8 | brainstorm 需求澄清步铁律：「正常完成」前提改为「输出可否决的确认清单」，禁纯凭自评放行 | src/stages/brainstorm.js |
| 9 | brainstorm 探索步开头「能一次问清的不要拆成多轮」重写为「一次只问一个」无歧义正向句 + 价值解释 | src/stages/brainstorm.js |
| 10 | 删除孤儿 skill `.claude/skills/sillyspec-propose/`（A6 删了 src/stages/propose.js 漏删 skill，会被 init 复制给所有用户） | .claude/skills/ |
| 11 | `MAIN_FLOW_ORDER` 从 STAGE_ORDER 拆出去掉 scan；consistency-doctor 上下游判定（d 段 + Fix b）改用 MAIN_FLOW_ORDER；推翻 revision-v1 有意测试（scan reopen 不再 cascade brainstorm，经用户裁决） | src/progress/shared.js, consistency-doctor.js, test/revision-v1.test.mjs |
| 12 | completeStep 加多 waiting 歧义守卫（对齐 continueStep），`--done --answer` 遇 ≥2 waiting 报错列出而非静默错答 | src/run/complete.js |
| 13 | 清 `--confirm-mode` 惰性 flag：execute.js prompt 改诚实表述 + command.js/complete.js 断死透传（保留 flag 白名单防老脚本崩） | src/stages/execute.js, src/run/command.js, src/run/complete.js |
| 14 | scan 两 step 补 `conditionalWait:true` + waitReason/waitOptions（CLI 条件等待页脚此前不渲染） | src/stages/scan.js |

**同步**：`docs/prompt/_extract.mjs` 重跑刷新 `_extracted.json`，brainstorm/plan/execute/scan/brainstorm-auto 五个 `docs/prompt/<stage>.md` 镜像同步。

**遗留**：guidance #6/#7/#8 为「保守版」——只加 conditionalWait 通道/话术警示，未加硬门、未改 requiresWait 校验机制。若要更强的「防伪造回答」机制（如高危 requiresWait 强制真实交互、AI 中继帧单独计数），属中等工程，建议另起 change 评估。

> **EVALUATED-NO（2026-08-08 专题评估，勿重提）**：上述「强机制」经评估**否决，不开 brainstorm**。依据链：①伪造是已知且被接受的既定设计（债单 P1.3a，保留硬门+行为约束）；②代码库对伪造的原则性答案是 **enforcement-of-facts**（P6.1a：docHash 重算校验），非加固确认门；③「用户是否真答过」非客观事实、属软/意图判定，按 P4.3/sillyhub 语义边界归 sillyhub，不归 SillySpec 确定性 gate；④B1（brainstorm-auto `requiresWait`→`conditionalWait`）证明代码库轨迹是「更少更软的门」而非更强；⑤**根限制**：SillySpec 是无头 CLI，`--continue --answer` 与 `--done --answer` 都经 agent 进程到达，**CLI 根本无法区分 agent 中继 vs 人类输入**，所谓「机械可判定中继帧」与"有无人类参与"零相关。三处独立评审（债单 P1.3a、本报告 #7、并发 multi-agent-review-2026-08-08 §3 D1）已收敛。唯一可能 follow-up（非现在、sillyhub 驱动）：machine-interface 将来若需要可暴露非阻塞 `confirmationSource` 字段，仅在 sillyhub 真消费时加。
