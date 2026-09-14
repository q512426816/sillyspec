---
author: qinyi
created_at: 2026-09-14 03:19:07
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-scan-incremental-refresh
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 范围=7 份 scan 文档刷新闭环，不碰模块卡/map 结构/knowledge（复潮边界记录）
- type: boundary
- priority: P0
- status: accepted
- source: docs
- question: 增量刷新的范围边界在哪——是否顺带刷新模块卡 / _module-map.yaml / knowledge？
- answer: 只做 scan 7 文档（docs/<project>/scan/*.md）。模块卡归 archive（sync-module-docs）、_module-map 结构归 `modules rebuild --force`（merge 语义，手动字段全保留）、knowledge 是人工追加域——refresh 越界会变成第三个写入方，重新打开 D-7 推迟方案 C 的双轨问题。知识库 decisions/core-engine.md D-001@v1（ir-stage-p3d）原句「增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）」是范围切割非方向否决——本变更即 scan 域立项，复潮条件满足。
- normalized_requirement: refresh 的写面仅限 docs/<p>/scan/ 下 7 份文档 + _facts.md 重跑；modules/、knowledge/、glossary 均不写。
- impacts: [FR-1, task-01]
- evidence: docs/sillyspec/design-d7-scan-lifecycle.md（方案 C 裁决「暂不做」+ 双轨问题陈述）；.sillyspec/knowledge/decisions/core-engine.md D-001@v1；src/modules.js:92（rebuild merge 语义注释）

## D-002@v1: 入口形态=`sillyspec scan refresh` 子命令（CLI 算差异+门控+出工单，agent 手术编辑，--done 盖章）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 增量刷新以什么形态入口——独立子命令 / scan 阶段新模式（--incremental）/ 纯 agent 自发行为？
- answer: 独立子命令 `sillyspec scan refresh`（与 `scan diff` 同族旁路，不动 scan 主流程 11 步注册表）。两拍交互：①refresh（只读）= 算受影响文档集 + 门控 + 渲染手术工单（每文档：过时引用清单 + 相关 diff hunks + commit messages + 编辑纪律）；agent 按工单定点编辑文档正文。②`scan refresh --done` = stamp bump 盖章（只推进本次核对过的文档的 source_commit/updated_at，generator 标 scan-refresh）+ 跑 postcheck + 记录刷新审计。依据：D-7 落地记录明确刷新形态为「agent 按清单定点补」；仓库哲学 CLI 预咀嚼事实、agent 从发现降级为解读；scan diff 已是该模式的只读半边。用户在 2026-09-14 对话轮对「落地形态」建议回复「干」= 预授权。
- normalized_requirement: 新增 src/scan-refresh.js（计算层+IO 面分层，仿 scan-diff.js 结构）；index.js 子命令接线（仿 scan diff 转发）；不改 stages/scan.js 步骤结构。
- impacts: [FR-2, FR-3, task-02, task-03]
- evidence: docs/sillyspec/design-d7-scan-lifecycle.md 落地记录；src/scan-diff.js 分层先例；用户 2026-09-14「干」轮

## D-003@v1: 基线语义=per-doc bump（只推进被核对过的文档），scan diff 基线读取改取最旧
- type: compatibility
- priority: P0
- status: accepted
- source: code
- question: 刷新后 source_commit 怎么推进——整批推到 HEAD 还是按文档推进？readSourceCommit「批次同值」假设如何兼容？
- answer: per-doc bump：只有本次核对过的文档（staleRefs 命中 + agent 实际修订）推进到 HEAD；未核对文档保留旧基线——这是诚实的（它确实未被验证到新 HEAD），下次 refresh 从旧基线重算继续覆盖它。computeScanDiff 的 readSourceCommit 从「首个命中」改为「取最旧」（保守：不漏检任何文档的漂移窗）。worktree-guard 消费方不受影响：其比对是 doc source_commit vs scan 会话 commit，异基线本就触发保护（--force-rescan 语义），per-doc bump 不改变该契约。
- normalized_requirement: stampScanDocHeaders 增加 bump 模式（只改指定文档的 source_commit/updated_at，其余键不动）；computeScanDiff 基线聚合=各文档 source_commit 取最旧提交时间者。
- impacts: [FR-3, FR-4, task-02, task-04]
- evidence: src/scan-diff.js:384-395（readSourceCommit 首个命中）；src/hooks/worktree-guard.js:214-231（guard 比对语义）；src/scan-postcheck.js:518-558（只补缺不覆盖现状）

## D-004@v1: 脏工作区 fail-closed——in-scope 有未提交改动拒绝刷新
- type: risk
- priority: P0
- status: accepted
- source: code
- question: scan diff 算 base..HEAD（仅已提交）而全量 scan 读工作区，本仓常态脏（多 agent 并行）——增量刷新遇未提交改动怎么处理？
- answer: fail-closed：refresh 前置检查 `git status --porcelain`（限 module-map scope 内路径），in-scope 有未提交改动 → 拒绝刷新并提示（提交后重试 / 或走全量 scan）。依据：若此时推进 source_commit 到 HEAD，等于把「未验证状态」盖章成「已验证」——未提交改动一旦提交落在新基线之后，永远逃出漂移窗。宁可误拒不漏检（D-7 §四同款保守原则）。scope 外脏（如 .sillyspec 文档自身）不阻断。
- normalized_requirement: computeRefreshPlan 增加 dirtyCheck：scope 内 A/M 文件非空 → 返回 { ok:false, reason:'dirty-worktree', files }；不做自动 stash/commit。
- impacts: [FR-5, task-02, task-05]
- evidence: 本仓 git status 常态脏（多会话共享）；src/scan-diff.js:116（diff 仅 base..HEAD）

## D-005@v1: 回退门=硬门三条件 + 软门阈值告警（--force 可越软门不可越硬门）
- type: boundary
- priority: P1
- status: accepted
- source: docs
- question: 什么情况下增量刷新必须回退全量 scan？
- answer: 硬门（拒绝执行，--force 也不可越）：①任一 scan 文档无 source_commit（旧版/绿地——无基线可增量）；②基线非 HEAD 祖先（分支切换/rebase——diff 两快照对比呈假象，本仓 brainstorm 注入漂移事实 2026-09-14 实证出现过）；③受影响文档含 scan_depth: quick（浅文档本就该 --deep 升级全量重写）。软门（warning 建议全量，--force 可继续）：漂移合计 > 100 文件或 behindCommits > 200（token 收益消失，一致性风险上升——阈值仿 staleness 50/14 的量级惯例放大）。依据：仓库近案 fail-closed 惯例（ql-20260914-003 双占用硬拦不猜归属）。
- normalized_requirement: 门控三硬一软；软门阈值漂移>100 文件或落后>200 commit；输出明确区分「拒绝（含理由与建议命令）」与「告警（--force 继续语义）」。
- impacts: [FR-5, task-02, task-05]
- evidence: src/scan-staleness.js:22（阈值惯例 50/14）；CLI 注入漂移事实实证「source_commit 4401b3d 不在当前分支历史」；src/stages/scan.js:124（quick 浅层覆盖升级语义）

## D-006@v1: 检出极限如实声明——refresh 不撤 staleness advisory，产物标注核对范围
- type: risk
- priority: P1
- status: accepted
- source: docs
- question: staleRefs 只能发现带 file:line 引用的过期陈述，无引用的事实性论断检不出——增量刷新的保证边界如何呈现？
- answer: ①refresh 不替代也不撤除 scan-staleness advisory（其判定语义 2026-08-16 已裁决：落后数≠文档错误）；②refresh --done 后的审计记录与文档 frontmatter 只声称「核对至 HEAD 的检出项已处理」，不声称「文档与源码一致」；③帮助文案与 workflow 文档显式写明检出极限。依据：scan-staleness 头注释判定语义修正案（ql-20260916-009-fb44 同源原则——advisory 信号与判定信号分层）。
- normalized_requirement: refresh 输出/审计不含「一致」断言文案；staleness 注入逻辑零改动；README/help 含检出极限说明。
- impacts: [FR-6, task-06]
- evidence: src/scan-staleness.js:9-13（判定语义裁决记录）；docs/sillyspec/design-d7-scan-lifecycle.md 方案 A 定位
