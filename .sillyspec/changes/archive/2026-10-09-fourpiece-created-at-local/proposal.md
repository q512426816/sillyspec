---
author: flow-machine-draft
created_at: 2026-10-09T03:58:40.335Z
---
# 提案书（Proposal）— 2026-10-09-fourpiece-created-at-local

## 动机

任务原话转写：平台时间线「变更诞生」时刻错 8 小时（2026-10-09-workspace-init-skill-gate 实证：requirements/proposal created_at=02:04:06 而 design.md=09:58:48，watcher 事件流证实文件真实出现于本地 10:04:08）。根因：fourpiece-init 骨架 created_at 用 toISOString() 写 UTC 数字的裸形状（无时区标记），平台/CLI 读取端按本地墙钟解析直接显示 UTC 值。datetime.js 已立规（坑 taskcard-created-at-utc：frontmatter 人读时间统一本地墙钟），taskcard/design-init 均已改 nowWallClock，fourpiece-init 是漏网点（src/index.js:2175-2177）。

成功标准：
- fourpiece-init 生成的 proposal.md/requirements.md/decisions.md 骨架 created_at 为本地墙钟（datetime.js nowWallClock，YYYY-MM-DD HH:mm:ss，与 taskcard/design-init 同口径）
- 新增回归测试：生成前后本地墙钟窗断言三件骨架 created_at 全落窗内（UTC 写入在非 UTC 时区必偏移出窗）
- 既有 fourpiece-init 测试面全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. fourpiece-init 生成的 proposal.md/requirements.md/decisions.md 骨架 created_at 为本地墙钟（datetime.js nowWallClock，YYYY-MM-DD HH:mm:ss，与 taskcard/design-init 同口径）
2. 新增回归测试：生成前后本地墙钟窗断言三件骨架 created_at 全落窗内（UTC 写入在非 UTC 时区必偏移出窗）
3. 既有 fourpiece-init 测试面全绿

## 成功标准（可验证）

1. fourpiece-init 生成的 proposal.md/requirements.md/decisions.md 骨架 created_at 为本地墙钟（datetime.js nowWallClock，YYYY-MM-DD HH:mm:ss，与 taskcard/design-init 同口径）
2. 新增回归测试：生成前后本地墙钟窗断言三件骨架 created_at 全落窗内（UTC 写入在非 UTC 时区必偏移出窗）
3. 既有 fourpiece-init 测试面全绿
