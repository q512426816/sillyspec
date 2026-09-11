# 决策知识 — stages

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-006@v1 防复潮注入挂 brainstorm Step2（knowledge-match 扩展），不新建步骤
状态：implemented
锚点：未记录
最近确认：test123
理由：扩展 knowledge-match 扫描 knowledge/decisions/，Step2 加载上下文时命中即注入否决理由与复潮条件；不加新步骤、不动 Step3+
来源：2026-08-23-adopt-harness-practices

## D-007@v1 decisions.md 记录契约扩展四字段，保纯函数提炼
状态：implemented
锚点：未记录
最近确认：test123
理由：扩展 brainstorm Step6 决策记录模板，四字段在决策产生时写入（锚点：src/…:NN、模块域：module-id、否决理由/复潮条件：rejected 必填）；decision-distill 保持纯函数机械提炼。放弃备选「archive 时 agent 辅助补推」——归档时上下文陈旧、LLM 补推易错、不可确定性测试
来源：2026-08-23-adopt-harness-practices

## D-001@v1 方案A：复用现有管道（用户批准）
状态：implemented
锚点：src/docs-debt.js:1
最近确认：8aab190
理由：锚点触碰走 docs-debt facts 注入形态（纯函数+同一注入点）；漂移检测走 doctor 既有检查项形态（同"决策待复核检查"先例）；不新增占位符体系/新步骤结构/新命令
来源：2026-08-24-decision-touch-cli-drift

## D-002@v1 doctor 漂移检测优先并入既有 step
状态：implemented
锚点：src/stages/doctor.js:1
最近确认：8aab190
理由：优先并入既有检查段（决策待复核检查同段或汇总报告前），避免 doctor 步骤数再动（上一变更六步化已连带改 6 个测试）
来源：2026-08-24-decision-touch-cli-drift

## D-003@v1 决策触碰注入必须覆盖 Wave 步 prompt
状态：implemented
锚点：src/run/prompt.js:502
最近确认：8aab190
理由：双渲染点：既有第 4 步注入（重入/reset 场景）+ Wave 步 prompt 追加渲染（buildWavePrompt 复用同一 facts 计算，changedFiles=porcelain ∪ baseline..HEAD），无新占位符
来源：2026-08-24-decision-touch-cli-drift
supersedes：无（修订 design 初稿注入时机）

## D-004@v1 CLI 漂移检测双轨：git 比较 + version 兜底
状态：implemented
锚点：src/doctor-diagnostics.js:933
最近确认：8aab190
理由：git 轨（有 .git 时 commit+归一化 remote 同源比较）+ version 兜底轨（package.json version 双仓比较）；同 version 不同 commit 的热改残余盲区显式声明
来源：2026-08-24-decision-touch-cli-drift

## D-002@v1 : 方案A 双gate分治——plan 声明核验 + verify 对账，change 级 worktree diff 权威
状态：implemented
变更：2026-09-06-ir-stage-p3a
锚点：未记录
最近确认：11aa319
理由：用户选方案A（2026-09-06 对话轮）：plan 侧 task 卡 target_files 声明 + plan-postcheck 新增声明核验检查；verify 侧新增对账检查，Σ(target_files) vs resolveVerifyChangedFiles（change 级 worktree diff，机器权威）算三类差集。拒绝方案B（per-task 对账押在 agent 手写 changedFiles 上，违背「CLI 算事实不信任 agent 自报告」约定，其归因价值降级为对账报告附注）与方案C（advisory 无门禁力，违背种子稿「对账 gate」意图）。

## D-002@v1 : 方案A——facts.json 审计底稿 + gate 重跑对比正文预填段（防篡改不依赖底稿）
状态：implemented
变更：2026-09-07-ir-stage-p3b
锚点：未记录
最近确认：6d72aca
理由：用户预授权自主抉择方案A（2026-09-07「做完 p3a 就继续 p3b」轮）：①verify-facts.json=CLI 全权写的审计底稿（探针命令行+首跑关键指标+时间戳，供事后复跑，agent 勿手改）；②gate 一致性检查=重跑 runVerifyProbes 对比 verify-result.md 正文预填段——对比基准是正文而非 facts.json（删底稿绕不过防篡改）；③分级：探针1命中数/探针6删除清单不符或预填段缺失=ERROR（确定性高），探针3/5 指标不符=WARNING（测试文件列表/端点 parity 环境敏感）。拒绝B（全 ERROR 环境变化假红）与C（无门禁力，违背「防声称测过」意图）。

## D-001@v1 : 载体=decisions.md 模块域字段增强，不新建 design.facts 文件
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：种子稿原案 design.facts.yaml 不建——decisions.md 条目已含 type/question/answer/模块域/evidence（九字段+可选四字段），语义即「设计决定+影响模块+理由」；设计事实层=decisions.md 模块域字段从可选提升为推荐并加机器核验。判断层 design.md 散文不动。分析修正采纳：md 列表而非 YAML（agent 不易写坏，直进 docs-check 核验链）。

## D-003@v1 : 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。

## D-005@v1 : 三个阶段点展示分工（execute 全表 / verify 一行 / archive 全表）
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户问「是不是应该在执行完成阶段就展示下更好呢」——采纳：execute --done 是代码改动冻结点且修正成本最低（agent 还在 execute 上下文可当场消化 ⚠️：补 design 声明或 output 注明）。verify 阶段禁改源码，全表必重复 → 一行漂移确认（与 execute 时点对比）。archive --confirm 是用户最终决策材料 → 全表复现。

## D-001@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/run/prompt.js, src/run/quick-audit.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-002@v1 排查结论：ql-020 任务行是设计内行为；真缺陷是 quick --done 自动归档竞态（防护已落地，热修让位并行会话）
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/run/complete-handlers.js
最近确认：358af35
理由：**任务行追加是设计内行为**（quick 启动契约：对每个关联变更 tasks.md 追加 `- [ ] <ql-id> <任务描述>`，stages/quick.js step1；关联本身是协作声明——两变更共享 decision-distill.js，ql-020 allowedFiles 含该文件），保留该行不覆盖，本变更任务追加其下。**真缺陷（quick-done-autoarchive-misfire 缺陷②，ql-20260819-010 只修了缺陷①）**：closeQuickLinkedChanges 阶段闸允许集含 brainstorm，stage_status=completed 闸只堵「brainstorm 完成→plan 开始」空窗——**brainstorm 进行中 + tasks.md 仅含 ql 行**（完整流程 plan 前无自有任务行，「isChangeTasksComplete 全勾」恒真空洞）时，关联 quick --done 勾掉 ql 行即触发在途变更被轻量归档注销。防护（本变更已落地）：写入自有未勾选 task-01..07 行——isChangeTasksComplete 恒 false 直至 execute/verify，彼时阶段不在允许集，竞态窗口关闭。

## D-002@v2 quick --done 自动归档闸补时近性闸（缺陷②修复实现选型）
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/run/complete-handlers.js, src/progress/change-registry.js
最近确认：手动确认
理由：**复潮实现取时近性信号（v1 复潮条件三候选均被否）**——新增 getLatestActivityAt（变更全部 stages/steps completed_at 最大值，时近性只读），closeQuickLinkedChanges 在阶段闸后增 60 分钟进度活动窗：窗口内=会话分钟级在推进（在途）不自动归档，僵尸最后活动陈旧（或 null 无完成步）照常清理。否决理由：候选①「全勾判定要求存在非 ql 自有任务行」推翻 small 逃生通道（僵尸 tasks.md 本就仅含 ql 行，quick-done-linked-changes.test :249 锁定）；候选②「in_progress 一律不归档」推翻真·僵尸清理（:299 锁定）——阶段态区分不了「活跃在途」与「启动后弃单」，时近性是唯一同时保两条逃生通道语义的信号。pm 无 getLatestActivityAt（旧 mock/旧库）按无近期活动放行：误放行最坏回到缺陷②现状（tasks.md 自有未勾任务行防护兜底），误拦截则僵尸永不清——权衡取放行。
supersedes：D-002@v1（v1 的防护措施继续有效；本条补齐热修）
