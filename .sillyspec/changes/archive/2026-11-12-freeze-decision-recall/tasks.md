---
author: t
created_at: 2026-11-12 16:56:37
---
# 任务注册表（Tasks）— 2026-11-12-freeze-decision-recall

- [x] task-01: `dispositionOf` 增加复潮条件第二判据 + implemented 条目渲染「复潮条件：」行（src/decision-distill.js），补判据分流与渲染测试
- [x] task-02: 四处防复潮过滤同步加 `|| h.revisitWhen`（src/flow.js ×2、src/run/prompt.js、src/knowledge-graph.js），补口径一致测试
- [x] task-03: `archive-baseline-replay.js` 加 full 模式 + `knowledge distill-backfill` 子命令（src/stages/knowledge.js），补幂等测试
- [x] task-04: 对本仓执行 distill-backfill：dry-run 核对 → --apply → 验证 D-001@v1 入库
