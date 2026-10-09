---
author: flow-machine-draft
created_at: 2026-10-09T04:24:04.313Z
---
# 需求规格（Requirements）— 2026-10-09-module-card-updated-at-iso

## 功能需求

### FR-01: syncModuleDocSidecars 戳的卡 updated_at 为全量 ISO（toISOString()，带 Z），瞬间正确（解析值=真实写入时刻），不再拼硬编码偏移

- `syncModuleDocSidecars` 给模块卡盖的 `updated_at` **必须**为全量 ISO（`new Date().toISOString()`，带 Z 后缀、毫秒在场），保证 `Date.parse` 解析瞬间等于真实写入时刻；**禁止** UTC 数字拼硬编码 `'+08:00'` 偏移（瞬间恒早 8 小时且不随机器时区）。

#### 场景：主路径

- Given 模块卡含 `updated_at:` 行且该变更可归类到该模块
- When `syncModuleDocSidecars` 执行盖戳
- Then 卡 `updated_at` 形如 `YYYY-MM-DDTHH:mm:ss.sssZ`，`Date.parse` 值与写入时刻一致（非 ±8h 偏移）

### FR-02: 回归测试：同步后卡 updated_at 经 Date.parse 落在同步前后时刻窗内（旧实现恒偏 8h 必出窗）

- `test/knife-batch2.test.mjs` **必须**补强断言：同步前后取时刻窗，同步后卡 `updated_at` 经 `Date.parse` 的瞬间**必须**落窗内；旧实现（UTC 数字拼 +08:00）解析瞬间恒早真实时刻 8 小时，**必须**出窗被拦。

#### 场景：时区拼接回归被拦

- Given 实现退回 `toISOString().slice(0,19) + '+08:00'` 形态
- When 运行该断言
- Then 失败（解析瞬间早于窗 8 小时）

### FR-03: 既有 module-docs-sync 测试面（knife-batch2.test.mjs 等）全绿

- 改动落盘后，`test/knife-batch2.test.mjs` 全部用例与 `test/r4-followup-fixes.test.mjs`（同函数触点）**必须**保持全绿。

#### 场景：主路径

- Given 改动已落盘
- When `node --test test/knife-batch2.test.mjs test/r4-followup-fixes.test.mjs`
- Then 全部用例 pass

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knife-batch2.test.mjs「syncModuleDocSidecars：sidecar 追加 + 卡戳 + 幂等二跑跳过」
FR-02: test/knife-batch2.test.mjs「syncModuleDocSidecars：sidecar 追加 + 卡戳 + 幂等二跑跳过」（新增时刻窗断言）
FR-03: test/knife-batch2.test.mjs 全文件 + test/r4-followup-fixes.test.mjs 全文件
