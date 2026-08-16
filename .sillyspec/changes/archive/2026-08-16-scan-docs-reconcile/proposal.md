---
author: qinyi
created_at: 2026-08-16T18:22:10+08:00
updated_at: 2026-08-16T18:22:10+08:00
---

# 提案书（Proposal）

## 动机

scan 快照停 850b485（2026-06-24），期间源码推进 400+ commit（W6 重构、dispatch/sillyhub-mcp 子系统、docs 一致性四件等）。文档三类漂移实证：26 个 src 文件缺文档、`stages/propose.js` 已删但 5 处文档仍描述、STRUCTURE 目录树等 4 份快照停在旧结构。brainstorm 读过期文档 → design 基于错误假设 → 错误层层放大（D-7 设计稿问题重述）。

## 关键问题

1. **增量更新机制缺失**：现状只有"全量重扫（token 大 + 覆盖保护冲突 + rebuild 清空手动字段）"和"漂移提示（只提示不更新）"两极，中间缺"diff 清单驱动定点补"的省 token 路径（D-7 剩余项）
2. **module-map schema v1 无 paths 字段**：26 个新文件（尤其根级）无法收录归属，worktree 卡自己标注"待升 v2 补录"——模块索引回答不了"哪个文件属于哪个模块"
3. **多文档无回收**：propose 阶段已从 VALID_STAGES 移除，但 5 处文档仍描述，读者会被误导为该阶段存在

## 变更范围

四阶段定点对账（详见 design.md）：P1 module-map 升 v2 + 模块卡补录 + propose 回收；P2 STRUCTURE 目录树刷新；P3 剩余 scan 文档核对（含 ARCHITECTURE.md:L99 顺手修复）；P4 docs-check 相对口径验证 + npm test + 显式 pathspec 提交。共 14 文件（12 改 2 新增），全部在 `.sillyspec/docs/sillyspec/` 下，零源码改动。

## 不在范围内（显式清单）

- 不做 scan/模块卡双轨合并（D-7 方案 C，已裁决暂不做）
- 不改 src/ 任何源码（modules.js 已支持 v2+paths）
- 不重跑 `scan --force-rescan` 全量生成
- 不刷新 `docs/sillyspec/scan/` 旧副本（platform 模式实际消费 `.sillyspec/docs/sillyspec/scan/`）
- 不清偿并行会话遗留的 5 处 docs-check 失效（D-001@v1：谁污染谁治理）

## 成功标准（可验证）

- 26 个缺文档文件全部在 `_module-map.yaml`（v2+paths）与对应模块卡中有准确归属与 1-2 行描述
- `_module-map.yaml` schema_version=2，`docs-debt`/`prompt` 等读侧消费正常
- propose 在 7 份 scan + 模块卡中零残留描述
- STRUCTURE.md 目录树与 `ls src/` 实际结构一致（run.js barrel、src/run/ 11、src/progress/ 5、src/dispatch/、src/sillyhub-mcp/、src/stages/ 15）
- `docs check` 失效数 ≤ 存量 5（并行遗留）且清单内 0 新增；`npm test` 210 文件全绿
