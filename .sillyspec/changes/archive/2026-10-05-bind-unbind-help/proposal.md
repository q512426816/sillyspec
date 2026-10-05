---
author: flow-machine-draft
created_at: 2026-10-05T14:15:38.829Z
---
# 提案书（Proposal）— 2026-10-05-bind-unbind-help

## 动机

任务原话转写：tests 命令 --bind/--unbind 语义无文档（主清单项 4）：--bind 是新增绑定行不替换旧行（row_id 显式或自动 manual:*，同锚旧行保留）、--unbind 按 --row-id（或 --tests 路径）删行——help 用法行只列 flag 名不说明语义，行为只能试。实测语义依据 index.js:3110-3121（row 对象构造 append、unbind ids 按 rowId/tests 删）。修法：用法行随附语义短注 + 源级回归锁定。
成功标准：
- tests 用法行含 --bind/--unbind 语义说明（追加新行不替换旧行 / 按 --row-id 或 --tests 删行）
- 语义说明与实现一致（bind 行构造 append 语义、unbind 删行 id 来源两口径）
- 源级回归测试锁定用法行语义文本在场

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. tests 用法行含 --bind/--unbind 语义说明（追加新行不替换旧行 / 按 --row-id 或 --tests 删行）
2. 语义说明与实现一致（bind 行构造 append 语义、unbind 删行 id 来源两口径）
3. 源级回归测试锁定用法行语义文本在场

## 成功标准（可验证）

1. tests 用法行含 --bind/--unbind 语义说明（追加新行不替换旧行 / 按 --row-id 或 --tests 删行）
2. 语义说明与实现一致（bind 行构造 append 语义、unbind 删行 id 来源两口径）
3. 源级回归测试锁定用法行语义文本在场
