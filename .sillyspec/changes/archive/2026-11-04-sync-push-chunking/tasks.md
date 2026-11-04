---
author: flow-machine-draft
created_at: 2026-11-04T13:48:08.880Z
---
# 任务注册表（Tasks）— 2026-11-04-sync-push-chunking

- [x] task-01: ops 超过阈值时自动按 op 数与 base64 字节数双约束切块顺序推送，逐块独立提交，全部块落地后行为与单批等价（冲突/墓碑/成功语义不变）
- [x] task-02: 推送单请求预算可通过 SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS 调整（默认 30s 不变）；块大小可经 SILLYSPEC_SPEC_SYNC_CHUNK_OPS / SILLYSPEC_SPEC_SYNC_CHUNK_BYTES 调整
- [x] task-03: 中途某块失败时已落地块保留（不回滚），下轮同步 diff 自动只含未落地部分（断点续传），失败提示标注已落地块数
- [x] task-04: 分批纯逻辑函数有判别性单测（边界：超限单 op 独占一块、恰好等于阈值、双约束同时生效）
- [x] task-05: 既有测试套件全绿
