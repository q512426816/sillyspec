---
author: qinyi
created_at: 2026-09-11 10:10:58
---
# 任务清单（Tasks）

- [x] task-01: 新增 src/friction-tally.js 数据层（record/consume/render/配置读取 + quick 会话路由 + 静默降级） (provides: friction-api)
- [x] task-02: gates.js 埋点——rollbackCompletionAndReturn 可选 friction 尾参 + 13 处调用点类型/来源标签 (depends_on: task-01)
- [x] task-03: verify 埋点与双 consume——verify-quality-scan.js 失败判定记 verify_run_failed（含 advisory lint）；complete.js completeStep+continueStep 两处 consume (depends_on: task-01)
- [x] task-04: quick 埋点/收尾/prune——complete-handlers.js 两处失败分支 record、handleQuickStageCompletion 收尾 consume、pruneArchivedChangeRuntime 清单补 friction-tally (depends_on: task-01)
- [x] task-05: config-schema.js 注册 friction_hint.enabled（默认 true，example 注释）
- [x] task-06: test/friction-tally.test.mjs——路由/清零/开关/截尾/降级/隐私值域单测 (depends_on: task-01, task-02, task-03, task-04, task-05)
- [x] task-07: 文档同步——modules/runtime.md 新模块职责 + docs/sillyspec/file-lifecycle.md 计数文件生命周期 (depends_on: task-01)
- [x] ql-20260911-013-5dcf 修驾驭小结第八批结构性盲区：verify 实测门跑在 main 工作区，多会话并发任何人的 WIP 都能弄红别人的门（本会话第二次真实阻塞）——verify test/lint 对账改隔离快照定向跑本变更内容（gate-snapshot 扩…
- [x] ql-20260911-014-3e32 修 docs gate 窗口关键词误伤：跨文件引用+反话论述形态（锚 A 文件而行内反引号 token 全是 B 概念）层 2 必失败，只能删行号绕开——给纯位置引用一等语法「:行号?」（REF_RE 增可选 ? 捕获组，collectDo…
- [x] ql-20260911-015-55d5 scope-audit 快照优先放宽：post-apply（分支已删=execute 已收尾）无论活跃/归档一律快照优先；快照缺失给漂移警告（旧变更无法重建冻结记录如实告知）
