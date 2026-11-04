---
author: flow-machine-draft
created_at: 2026-11-04T13:48:08.880Z
---
# 提案书（Proposal）— 2026-11-04-sync-push-chunking

## 动机

任务原话转写：spec 同步推送分批化根治大积压超时
生产实证：multi-agent-platform 工作区 spec 文件树同步自 2026-10-20 起 15 天零落地（spec_version 冻结 6469），根因是单批 POST 全量 ops（今日积压 2436 ops/45.7MB，base64 后 ~60MB）在客户端单请求预算（清单 10s/推送 30s 写死）内上传+服务端 apply 双双超时，best-effort 重试永不收敛；服务器侧 8 小时 37 连败（16-34s 后 400/中断）。

成功标准：
- ops 超过阈值时自动按 op 数与 base64 字节数双约束切块顺序推送，逐块独立提交，全部块落地后行为与单批等价（冲突/墓碑/成功语义不变）
- 推送单请求预算可通过 SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS 调整（默认 30s 不变）；块大小可经 SILLYSPEC_SPEC_SYNC_CHUNK_OPS / SILLYSPEC_SPEC_SYNC_CHUNK_BYTES 调整
- 中途某块失败时已落地块保留（不回滚），下轮同步 diff 自动只含未落地部分（断点续传），失败提示标注已落地块数
- 分批纯逻辑函数有判别性单测（边界：超限单 op 独占一块、恰好等于阈值、双约束同时生效）
- 既有测试套件全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. ops 超过阈值时自动按 op 数与 base64 字节数双约束切块顺序推送，逐块独立提交，全部块落地后行为与单批等价（冲突/墓碑/成功语义不变）
2. 推送单请求预算可通过 SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS 调整（默认 30s 不变）；块大小可经 SILLYSPEC_SPEC_SYNC_CHUNK_OPS / SILLYSPEC_SPEC_SYNC_CHUNK_BYTES 调整
3. 中途某块失败时已落地块保留（不回滚），下轮同步 diff 自动只含未落地部分（断点续传），失败提示标注已落地块数
4. 分批纯逻辑函数有判别性单测（边界：超限单 op 独占一块、恰好等于阈值、双约束同时生效）
5. 既有测试套件全绿

## 成功标准（可验证）

1. ops 超过阈值时自动按 op 数与 base64 字节数双约束切块顺序推送，逐块独立提交，全部块落地后行为与单批等价（冲突/墓碑/成功语义不变）
2. 推送单请求预算可通过 SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS 调整（默认 30s 不变）；块大小可经 SILLYSPEC_SPEC_SYNC_CHUNK_OPS / SILLYSPEC_SPEC_SYNC_CHUNK_BYTES 调整
3. 中途某块失败时已落地块保留（不回滚），下轮同步 diff 自动只含未落地部分（断点续传），失败提示标注已落地块数
4. 分批纯逻辑函数有判别性单测（边界：超限单 op 独占一块、恰好等于阈值、双约束同时生效）
5. 既有测试套件全绿
