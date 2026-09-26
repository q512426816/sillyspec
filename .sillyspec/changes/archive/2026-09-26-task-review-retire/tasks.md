---
author: flow-machine-draft
created_at: 2026-09-26T02:31:44.113Z
---
# 任务注册表（Tasks）— 2026-09-26-task-review-retire

> 任务面按实际实现路径覆写（保持 checkbox 行形态）；验收锚在 requirements。

- [x] task-01: src/run/gates.js 三处消费门退役：Execute Task Review Gate 整块删除（含 review-unsupervised 豁免分支）、enforceReviewJsonGate 函数与导出删除（调用方 complete.js 同步删）、enforceAlignExecuteReviewGate 的 Task Review 段删除（doctor 门只留 Stage Review 段+豁免头）+ 文件头/级联注释同步
- [x] task-02: complete.js 生成侧停写：:600 区 autoCheckPlanFromReviews 调用删（detectExecuteBatchFinish 保留）、per-task review 草稿兜底块删、execute 完成提示区第二处 autoCheck 调用删（退役后其「review.json 缺失→archive 会拦」警告成误导噪音）
- [x] task-03: execute.js 指引改手动勾选语义：Task Review Gate 段整体删除；主模式/调度模式/调度要求段勾选句改「完成=实现+测试绿+wt-commit 即手动勾」；QA 子代理分层前提改写（无 task review 层）；任务边界上报段 review write 措辞删
- [x] task-04: verify.js 兼容读：verify-required-evidence.json 检查项改「随 Task Review 退役停写——在场则消费」；「逐项检查任务」步勾选口径句（勾选唯一写入者是 CLI）改手动语义
- [x] task-05: 指引收敛：brainstorm.js/plan.js/execute.js 旧「无 Agent tool 时降级自审」句删除（review-unsupervised.md 豁免句已在，措辞修为仅 Stage Review 门）；brainstorm 档位段对旧句的引用同步修
- [x] task-06: 保留面验证：src/task-review.js 与 src/stage-review.js 模块不删（validateCheckedTaskReviews 等导出保留，review write/backfill-reviews/task-done 兼容路径不动）
- [x] task-07: 测试面：align-execute-review-gate 场景①③语义翻转+新增源码退役钉；review-unsupervised-exit 的 review-json 硬门豁免钉删（align 门钉保留）；execute-run-marker-drift 改退役钉；新增三消费点退役钉用例（源码文本钉+勾选新文案在场）；review-json-field-gate 头注更新（模块兼容读侧测试）
- [x] task-08: 全量测试绿（node --check 全部改动文件 + 受影响测试文件 + npm run test:core）
- [x] task-09: .sillyspec/knowledge/known-issues.md 中 R18 系列 task-review 形式拦截条目状态更新为已退役并指向本变更号
