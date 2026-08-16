---
author: qinyi
created_at: 2026-08-16T18:33:00+08:00
updated_at: 2026-08-16T18:33:00+08:00
---

# 模块影响分析（Module Impact）— scan 文档对账

> plan 首版 + execute 实际结果（2026-08-16 对账完成，worktree apply 回主仓）。

## 实际变更结果（execute 后更新）

17 文件落盘主仓（15 改 + 2 新增）：_module-map.yaml 升 schema v2（22 模块全补 paths 共 63 条，26 个漂移文件零缺失收录，worktree 卡 needs_review 闭环）；新增 progress.md / docs-consistency.md 两卡；8 张现有卡补录（stages/runtime/core-engine/worktree/setup/change-management/cli-entry）；scan 7 文档全量刷新（STRUCTURE 目录树 83 文件实测一致、ARCHITECTURE 补 4 新模块段落 + L99→command.js:1099、CONVENTIONS 补 4 条新约定、PROJECT/INTEGRATIONS/TESTING/CONCERNS 按当前代码核对——版本 3.26.8 / node:sqlite 引擎 / Node >=22.13 / 210 测试文件等技术事实全部实测修正）。

## 影响矩阵（plan 首版，保留供追溯）

| 模块/体系 | 影响类型 | 涉及文件 | 说明 |
|---|---|---|---|
| progress（新建） | 新增 | modules/progress.md | progress.js facade + src/progress/ 5 文件 |
| docs-consistency（新建） | 新增 | modules/docs-consistency.md | docs-check/gate/debt + scan-staleness 四件 |
| stages/runtime/core-engine/worktree/setup/change-management/cli-entry | 文档修改 | modules/*.md 8 卡 | 补录归属 + propose 回收 + needs_review 闭环 |
| 模块索引 | 数据升级 | modules/_module-map.yaml | schema v1→v2 + 63 paths |
| scan 快照（全局） | 文档修改 | scan/ 7 文档 | 目录树/模块段落/技术事实刷新 + propose 回收 + L99 修复 |

## unmapped

- 本次零源码改动，无代码模块影响面。

## 连带验证（实测结果）

- `npm test`：210/0 全绿（EXIT=0）
- `docs check`：415 处全过（基线 383 + 新增 32 处引用全过，191 处带关键词断言）
- `docs gate`：0=0 放行；D-001@v1 预留的 5 处存量豁免未动用（并行会话已自行清偿）
- grep propose：scan 7 文档 + 10 卡零阶段描述残留（仅"已移除"事实标注与 knowledge 子命令名）
- 未跑 `modules rebuild --force`（design P4 警告遵守）
