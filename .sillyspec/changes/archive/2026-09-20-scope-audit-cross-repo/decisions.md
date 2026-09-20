---
author: qinyi
created_at: 2026-09-20 16:31:35
---

# Decisions — 2026-09-20-scope-audit-cross-repo

## D-001@v1: 跨仓 actual 采集采用「共享 per-repo 采集内核 + 锚点分级」(方案 A)

- **type**: architecture
- **status**: confirmed
- **source**: user
- **date**: 2026-09-20
- **question**: scope-audit 跨仓真实对账的实现路径——共享内核 / scope-audit 独立实现 / 直接拼装 cross-repo-reconcile 现有结果?
- **answer**: 方案 A(共享内核+锚点分级)。从 src/cross-repo-reconcile.js 抽「per-repo 采集内核」collectRepoActual(仓注册解析→仓根→锚点分级→actual 文件集→可选行数),scope-audit 与 verify-postcheck(reconcileCrossRepoDeclarations)双侧共同消费;锚点分级:execute task reviews 的 base..head 封闭区间(最优,收尾后不漂移) > HEAD~1..HEAD 窗口(现行口径,降级注记) > HEAD 未提交窗口(降级注记) > 仓不可达(degraded 一行不炸整体)。信封 repos[] 仅多仓输出、含 main 条目与三态计数(单仓变更零新增字段保逐字节等价)。
- **normalized_requirement**: 跨仓计划条目按仓取 actual 出真实三态与行数;JSON 契约 additive 扩仓库维度;采集口径单一真相源防 verify/scope-audit 两份漂移;纯读 advisory(D-006)。
- **impacts**: src/cross-repo-reconcile.js(新增导出+重构)、src/scope-audit.js(computeFullFlowAudit/renderScopeAuditTable/getFileDiff)、src/verify-postcheck.js(notes 文案)、src/run/gates.js(渲染标签)、src/index.js(帮助文案)、test/scope-audit-cross-repo.test.mjs(新增)、test/scope-audit.test.mjs(改进点2 断言更新)。
- **evidence**: brainstorm Step 4 方案选择轮(用户经 AskUserQuestion 显式选定)。否决理由留痕——方案 B 与任务书「防两份口径漂移」直接冲突;方案 C 口径错位(task 卡 target_files vs design 清单两声明面文件集不一致)且无行数、锚点恒 B 档。
- **锚点**: src/cross-repo-reconcile.js:61(reconcileCrossRepoDeclarations 旁新增 collectRepoActual)
- **模块域**: core-engine
- **priority**: P0
- **附**:锚点锡点适用面查证(用户中途质询「S0/S1 是否不生成 review.json」驱动):review.json 有两套——阶段评审(stage-review,受 ceremony tier 控制,S0/S1 轻仪无)与 execute-runs task review(带 base/head/repo 锡点,S0-S3 全档硬门禁:enforceReviewJsonGate + generateTaskReviewDrafts 草稿兜底 + validateReviewSchema 强制 base/head 非空)。锚点取后者,「execute 走过即有」;停在 plan / 无 task 卡 / run 归属断裂的变更无 reviews → 降级链生效。

## D-002@v1: 快照产物对应调整——json 自动继承契约,patch 保持主仓单仓,跨仓冻结载体=reviews 锡点

- **type**: architecture
- **status**: confirmed
- **source**: user
- **date**: 2026-09-20
- **question**: execute --done 落盘的 scope-audit.json(快照)与 scope-audit.patch(冻结 patch)是否随跨仓对账调整?
- **answer**: ①json 快照:结构即 computeChangeScopeAudit 返回值(src/run/complete.js `...snap` 展开),跨仓真实行与 repos[] 信封自动冻结,落盘代码零改动,design.md 契约节文档化新字段语义;②patch 保持主仓单仓不拼接跨仓段——拼接破坏单流 git diff(git apply 面)+filter/slice 按仓分流改动面大+共享仓内容拷进主仓属冗余;跨仓内容的原生冻结载体=跨仓仓 git commit 区间,repos[].anchor.{base,head} 冻锡点进快照 json(commit sha 即内容指纹),--file 跨仓行优先 `git diff base..head -- file`(封闭区间不漂,语义等价主仓冻结 patch 档),A 档不可得才退该仓实时窗口;③patchSha256 校验语义不变;跨仓未提交尾巴只冻文件集与行数不冻内容(载体是该仓工作树会漂,如实注记)。
- **normalized_requirement**: 快照 json 增量字段自动冻结且旧快照读取兼容;patch 链行为不变;跨仓内容回看走该仓锚点区间 diff;存量旧快照跨仓段不回算、⊘+注记。
- **impacts**: src/scope-audit.js(getFileDiff 跨仓路由)、src/run/complete.js(零代码改动,快照自动继承)、契约文档(design.md 接口定义节)。
- **evidence**: brainstorm Step 5 设计确认轮用户质询驱动(「变更会生成 scope-audit.patch 和 scope-audit.json 这些是不是也要对应的调整」);查证 src/run/complete.js:913 落盘链(结构即返回值原样+savedAt)与 buildFrozenPatch 主仓单仓口径。
- **锚点**: src/scope-audit.js:1187(getFileDiff 冻结 patch 优先链的跨仓旁路)
- **模块域**: core-engine
- **priority**: P1
