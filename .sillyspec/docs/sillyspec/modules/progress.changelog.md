# progress 变更索引

> 由 sillyspec modules split-changelog 自模块卡迁出；新条目继续追加到本文件，勿写回模块卡。

- 2026-06-03 | 初始文档
- 2026-09-02 | overview(cwd) 只读全局总览（单一状态源 P0-1）
- 2026-08-16 | W6 重构：facade + 4 子模块
- ql-20260819-012-66fc | updateStep completed_at 条件化 + waitAnswers JSON 损坏诊断 + 清理 makeInitialProgress/makeInitialGlobal/VALID_STAGE_STATUSES 死代码
- ql-20260907-002-b9d4 | ghost 判定排除 quick 会话行（stage-machine overview/show 同源 _isGhostChange）：quick-<8hex> 按设计无 changes/ 实体目录（initChange 跳过），「active+无目录」判定对 quick 是类别错误——进行中 quick 从写库起即误报 ghost（quick-inflight-ghost-misjudge，面板清了又长）；cleanup-ghosts 侧有意保留 quick 行归档能力（收尾中断兜底）
- 2026-09-08-ir-verify-facts | getStageCompletedAt 只读访问器（verifyStartAt 基准）
| 2026-09-10 | ql-20260910-003-2709（quick） | getStageStartedAt（change-registry + progress.js facade 委托）：evidence mtime 窗口锚点 execute completed_at→started_at（gates 接线 started 优先 completed 兜底）——消「先提交则 diff 空、不提交则 mtime 旧」时序两难的 mtime 半边（execute 期间产的证据不再判旧）。test/verify-window-regression.test.mjs ②b。 |
- ql-20260911-017-0c35 | initChange/renameChange 注释标注：日期前缀门禁只在 CLI 边界强制，库函数保持宽松（测试/平台工具 fixture 依赖任意名，~30 处存量）
ql-20260911-030-bad4 | updateStep stepId 查找收进 UPDATE 同一事务+阶段自动完成提交前复查 pending（堵并发丢写与 15s validator 窗口错标）；reopenStage/consistency-doctor 时间戳 zh-CN→ISO；getLatestActivityAt 改 JS 解析侧取最新（治字符串 MAX 恒取 zh-CN 致时近性闸误判）
