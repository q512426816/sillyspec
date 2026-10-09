---
author: flow-machine-draft
created_at: 2026-10-09T03:58:40.335Z
---
# 需求规格（Requirements）— 2026-10-09-fourpiece-created-at-local

## 功能需求

### FR-01: fourpiece-init 生成的 proposal.md/requirements.md/decisions.md 骨架 created_at 为本地墙钟（datetime.js nowWallClock，YYYY-MM-DD HH:mm:ss，与 taskcard/design-init 同口径）

- fourpiece-init 生成的三件骨架 frontmatter `created_at` **必须**为本地墙钟（`datetime.js nowWallClock()`，形状 YYYY-MM-DD HH:mm:ss），**禁止** `toISOString()` 写 UTC 数字的裸形状（无时区标记，读取端按本地墙钟解析会偏时区数）。

#### 场景：非 UTC 时区生成

- Given 机器时区非 UTC（实证机 UTC+8）
- When 执行 `sillyspec fourpiece-init --change <名>` 生成三件骨架
- Then 三件骨架 `created_at` 与生成时刻本地墙钟一致（以生成前后各取一次 nowWallClock 构成的窗断言落窗内）

### FR-02: 新增回归测试：生成前后本地墙钟窗断言三件骨架 created_at 全落窗内（UTC 写入在非 UTC 时区必偏移出窗）

- `test/fourpiece-init.test.mjs` **必须**新增回归用例：生成前后取本地墙钟窗，断言三件骨架 `created_at` 全部落窗；实现若退回 UTC 写入形态，在非 UTC 时区机上该断言**必须**失败（偏移出窗）。

#### 场景：UTC 写入回归被拦

- Given 实现退回 `toISOString()` 写入（机器时区非 UTC）
- When 运行该回归用例
- Then 断言失败（created_at 偏移出本地墙钟窗）

### FR-03: 既有 fourpiece-init 测试面全绿

- 改动落盘后，既有 fourpiece 触点测试面（`test/fourpiece-init.test.mjs` 全部用例 + `test/skeleton-provenance.test.mjs`）**必须**保持全绿。

#### 场景：主路径

- Given 改动已落盘
- When `node --test test/fourpiece-init.test.mjs test/skeleton-provenance.test.mjs`
- Then 全部用例 pass

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fourpiece-init.test.mjs「fourpiece-init：created_at 为本地墙钟（坑 taskcard-created-at-utc 同族回归锁）」
FR-02: test/fourpiece-init.test.mjs「fourpiece-init：created_at 为本地墙钟（坑 taskcard-created-at-utc 同族回归锁）」
FR-03: test/fourpiece-init.test.mjs「fourpiece-init：三件骨架生成 + frontmatter/章节齐 + 幂等不覆盖」+ test/skeleton-provenance.test.mjs 全文件
