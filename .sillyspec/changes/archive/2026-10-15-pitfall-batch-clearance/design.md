---
author: flow-machine-draft
created_at: 2026-10-14T23:31:43.981Z
---
# 设计记录（Design Record）— 2026-10-15-pitfall-batch-clearance

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

六坑十一条修复线，全部是 sillyspec CLI 既有机制的最小校正，不新增模块：

1. **坑1**（stage-contract.js / run/gates.js / verify-probes.js / verify-postcheck.js）：
   - `API_ANCHOR_DESIGN_API_RE` 路径字符类补对称排除 `（(`（与既有 `）)` 对称）；
   - 空指汇总错误文案追加 parseSet 实际解析端点集（空集显式标注）；
   - verify 收口的探针一致性 / draft 篡改 / ceremony 双跑三道纯文档门**前移到检查点 A 之前**并改为
     push docGateFailures（原在实测门之后逐个 fail-fast）——三门数据面（facts backfill 已于
     runValidators 前完成、md/sidecar/tier 文件/git diff）在检查点 A 前全部可得，前移零语义损失，
     且文档问题不再先付 195s 实测门成本；
   - `buildVerifyFacts` 透传 result.apiFace 落键 + `writeVerifyFacts` 合并段保留 apiFace（修
     re-init 抹除回填键）；
   - `resolveReconcileActualFiles` 尾段加 EOL-only 过滤：对每个贡献 actual 面的 git 源配一次
     `--ignore-cr-at-eol` 同基点对照（思路源自 run/shared.js eolOnly 先例；实现期实测发现其
     `--name-only` 形态在 git≥2.45 不吃该 flag——本变更改走 `--numstat` 配对探测，见偏离记录①），
     未跟踪文件豁免，剔出文件归 eolOnlyFiles 软留痕并从 union 移除。
2. **坑2**（stage-review.js + 三份 SKILL.md）：新增读侧助手 `resolveStageReviewDir`（规范
   `<stage>-<runId>` → 双前缀 `<stage>-review-<runId>` → 裸 `<runId>` 三级探测，全不在则返回规范
   路径保持报错文案语义）；validateStageReview / autoRefresh / refresh-hash 三处读点统一走助手；
   SKILL.md 三份口径改为「目录名 = `<stage>-` + marker 值原样」。只读容错不搬文件——写入侧恒规范。
3. **坑3**（run/complete.js）：detectExecuteBatchFinish 在代码证据核验后、FR-04 复核循环前调既有
   `generateTaskReviewDrafts`（幂等：已存在不覆盖）补缺失草稿——退役时只摘了调用点，函数本体与
   `backfill-reviews` 手动通道都在，此处重新接线（批量完成路径），archive 真相源天然在场。
4. **坑4**（run/complete.js）：full-autopilot 代勾证据源从「%B 全文提 token」收敛为「%s subject 提
   token + 提交触及面 × 任务卡 allowed_paths 交叠（parseAllowedPaths + pathMatches，与草稿归属同
   口径）」；无卡面/无 allowed_paths 时退化为仅 subject token。shouldAutoCheckTask 的草稿守卫改为
   ctx 缺席时同样保守不勾（原 ctx=null 直接放行）。
5. **坑5**（stages/brainstorm.js + stage-templates.js + run/archive-distill.js）：模板骨架在
   故障面/退役判据后追加 `- 否决理由:`/`- 复潮条件:` 两行（标注 status=rejected 时必填）；
   distill needsWait 报错附两字段可粘贴补丁样例。
6. **坑6**（verify-probes.js + commit-suggest.js + sync.js）：probe7 归属列 slice(0,5) +
   mdEscapeCell + 「共 N 个」折叠（收集面同步设帽）；commit 建议 quick 来源锚定「quicklog 文件 ∈
   本次变更集」+ 归档 tasks.md 解析已勾 task + type 分派重排（task 面 ⇒ feat 优先，纯阶段产出不再
   谎称 quick 修复）+ body 与 subject 去重；sync 两个 fetch helper 的非 2xx 回显改结构化单行摘要
   （409 冲突解析 conflict/last_pushed_at 打一行）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- CLI 行为变化（无函数签名删除/改名）：verify --done 文档门报错聚合面扩大（三门并入）；
  verify-probes --init 产物新增 apiFace 键、re-init 保留固化键；verify 对账结果新增 eolOnlyFiles
  字段与 note；stage-review 读侧容错错位目录；register-stage-review --refresh-hash 对错位文件可用；
  execute 批量完成自动补 per-task review 草稿；full-autopilot 代勾判据收紧；commit 建议输出修正；
  sync 409 日志形态改单行。
- 新增导出：stage-review.js `resolveStageReviewDir`；sync.js `formatSyncHttpErrorLine`（纯函数）；
  complete.js `detectExecuteBatchFinish`（转导出供测试）与 `autoTickTasksFromCommitSubjects`（代勾
  独立函数，subject token × allowed_paths 事实锚）；verify-probes.js `renderProbe7Lines`（转导出
  供测试）；commit-suggest.js 无新签名（行为修正）。

## 文件变更清单

- src 实现：src/stage-contract.js、src/run/gates.js、src/verify-probes.js、src/verify-postcheck.js、
  src/stage-review.js、src/run/complete.js、src/stages/brainstorm.js、src/stage-templates.js、
  src/run/archive-distill.js、src/commit-suggest.js、src/sync.js
- skill 文档：.claude/skills/sillyspec-brainstorm/SKILL.md、sillyspec-plan/SKILL.md、
  sillyspec-execute/SKILL.md（FR-06 口径统一）
- 测试：test/pitfall-*.test.mjs 新增 11 份 + 3 份既有契约钉随新契约更新
  （task-review-retire / execute-batch-endtoend-checkbox / execute-batch-zero-diff）
- 文档机械重锚（docs check --fix 行号漂移回执，sync.js 插入致漂移）：docs/sillyspec/*.md 5 份、
  .sillyspec/docs/** 模块卡与 scan 9 份、.sillyspec/knowledge/** 蒸馏件引用重锚 4 份
- 模块图登记：.sillyspec/docs/sillyspec/modules/_module-map.yaml（skills-docs 新条目）+
  modules/skills-docs.md（新卡片，.claude/skills 目录入图）

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. **乱序/迟到**：代勾按 subject token + diff 交叠判据，晚到的实现提交在下次 --done 重新评估
   （HEAD~20 窗口）；补草稿幂等（review 已在不写），重复 --done 无副作用；EOL 过滤在每次对账
   现算现对照，行尾后被真实改动时自然回到 actual 面。
2. **并发写**：tasks.md 代勾沿既有 writeAtomicSync；review 草稿写入沿 generateTaskReviewDrafts
   既有 fail-open 契约；stage-review 目录容错是只读探测（existsSync）不搬文件不写盘；对账
   --ignore-cr-at-eol 只读探测失败时不过滤（fail-open，与 shared.js 同契约）。
3. **切换/生命周期**：--init 重跑保留固化键（apiFace/consumerHints/handover 等），中断重入安全；
   三门前移后 rollback 语义不变（同一 rollbackCompletionAndReturn，进度不丢）；execute 批量完成
   乐观预标戳回滚机制不变。
4. **作用域**：目录容错探测限定本 runtimeRoot/stage-reviews 下；EOL 对照使用与对账同仓库同基点
   （主仓 HEAD / worktree 各自探测）；commit 建议 quick 锚定以本次变更集为准，跨会话 quicklog
   不污染；SKILL.md 为随包分发文档，改的是本仓三份源文件。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：①三门并入收集后单轮报错列表变长（可接受——本就是 CLI 承诺形态）；②代勾判据收紧可能
漏勾（保守方向正确：漏勾人工补，误勾破坏真相源——坑 4 两次实证）；③EOL 过滤对「声明了但只改了
行尾的文件」会转 ②missing（语义正确：计划落空应收口可见，eolOnly 留痕可解释）。
已试弃方案：marker 值改为完整目录名（破坏存量 marker 读取兼容，读侧容错零迁移成本更优）；
archive 改复合真相源（语义面改动大且与 backfill-reviews 先例冲突，选自动补草稿路线）；
锚点正则改白名单制与 API_FACE_PATH_RE 同源（更彻底但改动面大，选对称补字符类的最小修）。

实现期三点偏离记录：① EOL 过滤首版 absence-based（「不在真实集即剔」）会误伤 B3 pathspec
来源的已交付文件，改为 plain×ignore-cr 配对探测（正向信号才剔，D-005）；且实测发现
`--name-only` 不吃 `--ignore-cr-at-eol`（git 2.45 行为），内容过滤必须走 `--numstat`——同款
手法在 run/shared.js quick 审计的既有实现受同一怪癖影响（fail-open 方向，未观察到误行为，
本次不动、留待该面下次触碰时对齐）。② 既有契约钉三处随本变更更新：task-review-retire 钉②
（批量路径草稿重接线限定）、execute-batch 两用例的「ctx 缺省草稿照勾」向后兼容钉（更新为
保守不勾，坑 4 认定的误勾向量）。③ 代勾日志格式 %s%x1e 会使文件清单错位到下一 chunk，
分隔符前置为 %x1e%s。
