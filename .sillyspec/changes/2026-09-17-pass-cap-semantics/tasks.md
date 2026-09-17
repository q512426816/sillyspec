---
author: qinyi
created_at: 2026-09-17 11:53:15
---

# 任务清单（Tasks）

- [x] task-01: facts 管线 producer 扩写——backfillFactsFromMdAndTests 增 integrationRan/dbScriptDeclarations/矩阵摘要，parseHandoverRows 三列扩四列+缺省映射，parseDbScriptDeclarations 新函数，verify-facts-schema additive 登记 (depends_on: 无)
- [x] task-02: validatePassEligibility 注册壳+纯函数+factsExpected 判定，requiresEvidence :646-652 三处分层，change-risk-profile auditRuntimeReceipt sourceTag (depends_on: task-01)
- [x] task-03: probe7 partial/uncovered 联动（validateAcceptanceMatrix 分支读 facts.handover）+ Runtime Evidence 不涉及收口与降级路径提示 (depends_on: task-01, task-02)
- [x] task-04: fix.sql 双门——worktree-apply 尾声 + archive --confirm 前置兜底 + db-script 互斥 + archive Step3 handover 清单注入 (depends_on: task-01)
- [ ] task-05: 配套四小修——skip 跨仓档位 / adopt 勾选两层 / probe7 多根 / design 无段头缺口 (depends_on: task-01)
- [ ] task-06: prompt/清单新增条目 + verify prompt 封顶提示 + 文档镜像再生（_extract.mjs） (depends_on: task-02)
- [ ] task-07: 测试补全——NEW test/pass-eligibility.test.mjs + 8 个既有测试文件就近断言 (depends_on: task-01, task-02, task-03, task-04, task-05, task-06)
- [ ] task-08: Wave 步骤完成度门——assertWaveTasksComplete（Wave N --done 前校验本 Wave checkbox 全勾，fail-closed）+ NEW test/wave-task-complete-gate.test.mjs (depends_on: task-05)
- [x] ql-20260917-006-1deb 法证收口：批量写入方留痕——用户复现撤回「平台同步回写」归因后定位真实缺口：take-platform 回放/pull --spec 解包/worktree apply 三个批量写入口逐字节落盘且零留痕（他机 CRLF 内容原样回放，事后只…
