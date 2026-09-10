---
author: qinyi
created_at: 2026-09-10 10:38:06
---

# 决策记录（Decisions）

## D-001@v1: 计划侧不做行数（含估算值），只做文件级三态
- type: definition
- priority: P1
- status: accepted
- source: user
- question: 计划改动是否展示 +/- 行数（没有精确值时给估算）？
- answer: 用户初始提议「计划侧行数没有的话给个大概也行」；讨论后收敛不做——design.md 清单是文件级声明无行数语义，LLM 估行数无法追责（估 50 实 300 分不清是计划错还是估算错），与本仓「每条数据要么机械真实要么明确是人的判断」门禁哲学冲突。规模感如需后续用 T-shirt 尺寸（明确是判断的粗粒度），不在本变更。
- normalized_requirement: 计划侧仅文件级三态判定（✓ 计划内/⚠️ 计划外/⚠️ 计划未动），不产出任何行数或估算值
- 模块域：runtime
- impacts: [FR-1, task-01]
- evidence: 本会话第 1 轮设计讨论（agent 评估 → 用户后续轮次未反对并推进）

## D-002@v1: 实际侧行数一律 git 真值（numstat 优先）
- type: definition
- priority: P0
- status: accepted
- source: user
- question: 实际改动行数数据源？
- answer: 用户明确「实际改动的文件（+ - 行数，这个要真实的）」。tracked 改动用 `git diff --numstat`（与文件清单同基点，天然自洽）；untracked 新文件 numstat 不可得 → wc -l 记全 + 行；binary（numstat 为 `-`）显 BIN。
- normalized_requirement: 行数只出自 git numstat / wc -l 真值，禁止估算；基点复用 resolveReconcileActualFiles 的 merge-base 锚定，不得拿主仓 HEAD 当基点
- 模块域：runtime
- impacts: [FR-1, task-01, task-02]
- evidence: src/worktree-apply.js:1796（--shortstat 先例）；run/prompt.js:929（HEAD 基点教训注释）

## D-003@v1: 架构 = 纯函数单一真相 + 独立命令随时查 + 阶段点薄注入
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 展示绑阶段 --done 还是独立命令？
- answer: 用户提议「独立一个参数或者命令去展示，可以随时查看」。三层：computeChangeScopeAudit 纯函数（单一真相）；sillyspec scope-audit 命令（人类可读 + --json）；execute --done / verify --done / archive --confirm 三处薄注入调同一函数。对齐 verify-probes / module-impact 已验证的「纯函数 + 命令 + 阶段集成」三层模式。
- normalized_requirement: 三处注入与独立命令输出同源自同一纯函数，禁止各自实现采集逻辑
- 模块域：runtime, cli-entry
- impacts: [FR-2, FR-3, task-02, task-03]
- evidence: 本会话第 3 轮（用户：「或者这样，独立一个参数或者命令去展示呢？可以随时查看」）

## D-004@v1: quick 流程纳入——复用 auditQuickCompletion 窗口归属，归属状态表而非三态
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: quick 的范围是否也能统计到？
- answer: 用户问「quick 的范围是否也能统计到呢」，评估后纳入。quick 无事前计划（--files 是事后声明），不做三态做归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面）。窗口归属复用 auditQuickCompletion（baseline 快照/他者退栈/软归属已存在）；随时查看依赖 guard.json 持久化 + locateQuickSessionGuard。quick 提交后窗口已 commit，降级读 QUICKLOG 条目文件行（记录态非实时）。
- normalized_requirement: quick 模式不新建归属口径，复用 auditQuickCompletion 判定结果；提交后明确提示降级而非出空表
- 模块域：runtime, change-management
- impacts: [FR-4, task-04, task-05]
- evidence: src/run/shared.js:1180（auditQuickCompletion）；guard.json 持久化 + locateQuickSessionGuard（shared.js:216）

## D-005@v1: 三个阶段点展示分工（execute 全表 / verify 一行 / archive 全表）
- type: process
- priority: P1
- status: accepted
- source: user
- question: 主展示点放哪个阶段？
- answer: 用户问「是不是应该在执行完成阶段就展示下更好呢」——采纳：execute --done 是代码改动冻结点且修正成本最低（agent 还在 execute 上下文可当场消化 ⚠️：补 design 声明或 output 注明）。verify 阶段禁改源码，全表必重复 → 一行漂移确认（与 execute 时点对比）。archive --confirm 是用户最终决策材料 → 全表复现。
- normalized_requirement: execute --done 全表 + ⚠️ 出口指引；verify --done 一行（文件数/行数/相对 execute 时点漂移）；archive --confirm 注入全表
- 模块域：stages
- impacts: [FR-3, task-03]
- evidence: 本会话第 2 轮（用户：「是不是应该在执行完成阶段就展示下更好呢」）

## D-006@v1: ⚠️ 计划外/计划未动/未声明均为 advisory，不阻断
- type: boundary
- priority: P1
- status: accepted
- source: user
- question: 对账发现范围漂移是否阻断流程？
- answer: 不阻断。多 agent 并行是本仓常态（AGENTS.md 核心前提），计划外文件可能是他者演进或 plan 后 design 漏更新（常态），硬拦会把正常流逼进 rescue 手动路径（diff 规模两档制先例同教训）。⚠️ 项给出明确出口：execute 时点补 design.md 声明或 --output 注明原因。
- normalized_requirement: scope-audit 全部输出为 advisory，不新增任何 blocked/warning 门禁状态；既有 auditQuickCompletion 门禁行为不变（只加行数展示）
- 模块域：runtime
- impacts: [FR-3, task-03, task-05]
- evidence: src/worktree-apply.js:1789（diff 规模两档制教训注释）；本会话第 1 轮评估
