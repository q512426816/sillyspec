---
author: flow-machine-draft
created_at: 2026-11-04T13:48:08.880Z
---
# 需求规格（Requirements）— 2026-11-04-sync-push-chunking

## 功能需求

### FR-01: ops 超过阈值时自动按 op 数与 base64 字节数双约束切块顺序推送，逐块独立提交，全部块落地后行为与单批等价（冲突/墓碑/成功语义不变）

- 推送腿必须按「块内 op 数与 base64 字节粗估和」双约束切块顺序提交：ops 数或字节和超出块上限时自动切多块，逐块独立 POST；全部块落地后，合并响应的冲突/墓碑/成功语义必须与单批推送等价（任一块 conflict 即按单批冲突路径处理）。小块（一块装下）必须保持现状单请求直发，零行为变化。

#### 场景：主路径

Given 12 个本地新增文件、`SILLYSPEC_SPEC_SYNC_CHUNK_OPS=5`；When 推送；Then 服务器收到 3 次 POST（5+5+2 ops 顺序提交），全部 200 后 `synced=12, ok=true`。Given ops 总量在一块内；When 推送；Then 恰 1 次 POST（现状不变）。

### FR-02: 推送单请求预算可通过 SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS 调整（默认 30s 不变）；块大小可经 SILLYSPEC_SPEC_SYNC_CHUNK_OPS / SILLYSPEC_SPEC_SYNC_CHUNK_BYTES 调整

- 三个 env 键必须实现为可选调优（缺省值 30000ms / 128 ops / 2MiB，缺省路径行为与现状一致）；非法值（非数字、小于下限 1000ms / 1 op / 1024B）必须回退缺省不得报错。

#### 场景：主路径

Given `SILLYSPEC_SPEC_SYNC_CHUNK_OPS=5`；When 12 ops 推送；Then 每块 ≤5 ops（块切分随 env 生效）。Given env 未设置；When 推送；Then 单请求预算 30s、块上限 128/2MiB（缺省零回归）。

### FR-03: 中途某块失败时已落地块保留（不回滚），下轮同步 diff 自动只含未落地部分（断点续传），失败提示标注已落地块数

- 中途块失败时必须立即停止后续块（不整批重放），已落地块不得回滚；失败警告行必须标注「前 N/M 块已落地」；断点续传必须不依赖客户端新记账（下轮 diff 以服务器刷新后的清单为锚自动只含未落地路径）。

#### 场景：主路径

Given 12 ops 切 3 块、服务器对第 2 块回 500；When 推送；Then 返回 `{synced:0, ok:false}`、服务器只见 2 次 POST（第 1 块已落地 + 第 2 块失败），警告含「前 1/3 块已落地」。

### FR-04: 分批纯逻辑函数有判别性单测（边界：超限单 op 独占一块、恰好等于阈值、双约束同时生效）

- `chunkOpsForPush` 必须有覆盖以下边界的判别性单测：单 op 单块、恰好等于 ops 阈值（=1 块）、超出阈值切块、字节阈值切块、双约束同时生效取更严、超字节单 op 独占一块（不切不丢弃不死循环）、flatten 保序、空数组零块。

#### 场景：主路径

Given 测试文件以显式 `opts.maxOps/maxBytes` 驱动各边界；When 断言块数与块内分布；Then 全部通过（无 env 依赖、无顺序依赖）。

### FR-05: 既有测试套件全绿

- 本变更合入后既有测试套件必须全绿（重点回归 hub08-spec-sync-conflict / hub09-sync-circuit-abort / platform-mode-trigger-sync 等同步面），lint 必须通过。

#### 场景：主路径

Given 实现与测试就位；When 运行新测试、相邻同步回归与 lint；Then 全部退出码 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/sync-push-chunking.test.mjs「B. 12 ops 按 env CHUNK_OPS=5 → 3 块顺序提交全部落地」
FR-02: test/sync-push-chunking.test.mjs「B. 12 ops 按 env CHUNK_OPS=5 → 3 块顺序提交全部落地」（env 生效面）+「A. chunkOpsForPush 双约束切块」（缺省直发由 A 单 op 单块与既有 hub08/hub09 单批路径回归覆盖）
FR-03: test/sync-push-chunking.test.mjs「C. 中途块 500 → ok:false、已落地 1 块保留、下轮 diff 续传」
FR-04: test/sync-push-chunking.test.mjs「A. chunkOpsForPush 双约束切块」
FR-05: test/hub08-spec-sync-conflict.test.mjs 全文件 + test/hub09-sync-circuit-abort.test.mjs 全文件 + node test/check-syntax.mjs（lint）
