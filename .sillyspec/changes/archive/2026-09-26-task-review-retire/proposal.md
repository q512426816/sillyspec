---
author: flow-machine-draft
created_at: 2026-09-26T02:31:44.112Z
---
# 提案书（Proposal）— 2026-09-26-task-review-retire

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ba175784cf3d2b068ea8b723bb9a25c0911f8b720544bd486a4dc18bb177d8ce:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
任务原话转写：动机/背景：R18 对撞实验实证 execute 每任务 review.json 评审层在无嵌套派发环境全降自审表演——15 次拦截中 5 次仅形式合规（缺件/假 hash/枚举错），实质拦截为零；前置豁免通道（2026-09-26-review-unsupervised-exit）已落地归档。本变更把 Task Review 层（每任务粒度）从「可豁免」推进到「退役」；Stage Review 层（阶段粒度）保留（R8 实证有真独立评审者时抓过缺口，豁免通道已覆盖其余场景）。

成功标准：
- src/run/gates.js 三处消费门退役：Execute Task Review Gate 整块删除（含 review-unsupervised 豁免分支）、enforceReviewJsonGate 函数体退役、enforceAlignExecuteReviewGate 的 Task Review 段删除（doctor 门只留 Stage Review 段+豁免头）
- 生成侧停写：complete.js 不再调用 autoCheckPlanFromReviews 与 generateTaskReviewDrafts 兜底；execute.js 指引三处改为手动勾选语义（完成=实现+测试绿+wt-commit 即手动勾 checkbox）
- src/stages/verify.js 对 verify-required-evidence.json 改兼容读（随 Task Review 退役停写，在场则消费，缺席不阻断）
- src/task-review.js 与 src/stage-review.js 模块保留不删（历史归档兼容读侧）
- 门拦截测试重写/删除（align-execute-review-gate / review-json-field-gate），新增三消费点退役钉用例（源码文本钉+勾选新文案在场）；全量测试绿
- .sillyspec/knowledge/known-issues.md 中 R18 系列 task-review 形式拦截条目状态更新为已退役并指向本变更号
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:f5175a210ce2595a3ed7639ad17d50732884563953e143ca9ce66fb2c1a6b90a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. src/run/gates.js 三处消费门退役：Execute Task Review Gate 整块删除（含 review-unsupervised 豁免分支）、enforceReviewJsonGate 函数体退役、enforceAlignExecuteReviewGate 的 Task Review 段删除（doctor 门只留 Stage Review 段+豁免头）
2. 生成侧停写：complete.js 不再调用 autoCheckPlanFromReviews 与 generateTaskReviewDrafts 兜底
3. execute.js 指引三处改为手动勾选语义（完成=实现+测试绿+wt-commit 即手动勾 checkbox）
4. src/stages/verify.js 对 verify-required-evidence.json 改兼容读（随 Task Review 退役停写，在场则消费，缺席不阻断）
5. src/task-review.js 与 src/stage-review.js 模块保留不删（历史归档兼容读侧）
6. 门拦截测试重写/删除（align-execute-review-gate / review-json-field-gate），新增三消费点退役钉用例（源码文本钉+勾选新文案在场）
7. 全量测试绿
8. .sillyspec/knowledge/known-issues.md 中 R18 系列 task-review 形式拦截条目状态更新为已退役并指向本变更号
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7a530cef0fd42f55647616230e07f5a126c35df6d92af059a725fbb9b91f31eb:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
1. src/run/gates.js 三处消费门退役：Execute Task Review Gate 整块删除（含 review-unsupervised 豁免分支）、enforceReviewJsonGate 函数体退役、enforceAlignExecuteReviewGate 的 Task Review 段删除（doctor 门只留 Stage Review 段+豁免头）
2. 生成侧停写：complete.js 不再调用 autoCheckPlanFromReviews 与 generateTaskReviewDrafts 兜底
3. execute.js 指引三处改为手动勾选语义（完成=实现+测试绿+wt-commit 即手动勾 checkbox）
4. src/stages/verify.js 对 verify-required-evidence.json 改兼容读（随 Task Review 退役停写，在场则消费，缺席不阻断）
5. src/task-review.js 与 src/stage-review.js 模块保留不删（历史归档兼容读侧）
6. 门拦截测试重写/删除（align-execute-review-gate / review-json-field-gate），新增三消费点退役钉用例（源码文本钉+勾选新文案在场）
7. 全量测试绿
8. .sillyspec/knowledge/known-issues.md 中 R18 系列 task-review 形式拦截条目状态更新为已退役并指向本变更号
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
