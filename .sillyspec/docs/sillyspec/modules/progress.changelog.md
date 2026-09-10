# progress 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-06-03 | 初始文档
- 2026-09-02 | overview(cwd) 只读全局总览（单一状态源 P0-1）
- 2026-08-16 | W6 重构：facade + 4 子模块
- ql-20260819-012-66fc | updateStep completed_at 条件化 + waitAnswers JSON 损坏诊断 + 清理 makeInitialProgress/makeInitialGlobal/VALID_STAGE_STATUSES 死代码
- ql-20260907-002-b9d4 | ghost 判定排除 quick 会话行（stage-machine overview/show 同源 _isGhostChange）：quick-<8hex> 按设计无 changes/ 实体目录（initChange 跳过），「active+无目录」判定对 quick 是类别错误——进行中 quick 从写库起即误报 ghost（quick-inflight-ghost-misjudge，面板清了又长）；cleanup-ghosts 侧有意保留 quick 行归档能力（收尾中断兜底）
- 2026-09-08-ir-verify-facts | getStageCompletedAt 只读访问器（verifyStartAt 基准）
| 2026-09-10 | ql-20260910-003-2709（quick） | getStageStartedAt（change-registry + progress.js facade 委托）：evidence mtime 窗口锚点 execute completed_at→started_at（gates 接线 started 优先 completed 兜底）——消「先提交则 diff 空、不提交则 mtime 旧」时序两难的 mtime 半边（execute 期间产的证据不再判旧）。test/verify-window-regression.test.mjs ②b。 |
