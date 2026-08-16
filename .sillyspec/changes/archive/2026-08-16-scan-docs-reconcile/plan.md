---
author: qinyi
created_at: 2026-08-16T18:31:20+08:00
updated_at: 2026-08-16T18:31:20+08:00
plan_level: light
---

# 轻量计划（Light Plan）：scan 文档对账

## 来源

brainstorm 四件套（design.md 四阶段方案 / D-001@v1 组合 a+b 裁决 / FR-01~05）已确认，方案 A 分批定点对账。

## 范围

14 文件全在 `.sillyspec/docs/sillyspec/`（12 改 2 新增），零源码改动。清单见 design.md「文件变更清单」。

## Tasks

- [x] task-01: P1 module-map 升 v2（schema_version: 2 + 全模块补 paths）+ 新建 progress.md / docs-consistency.md 两卡（26 文件归卡，每文件读源码头注释写 1-2 行描述）+ core-engine/stages/runtime/worktree 四卡补录与 propose 回收（覆盖：FR-01, FR-02）
- [x] task-02: P2 STRUCTURE.md 目录树按当前 `ls src/` 实测刷新（run.js barrel、src/run/ 11、src/progress/ 5、src/dispatch/、src/sillyhub-mcp/、src/stages/ 15、根级全列）+ 移除 propose 条目（覆盖：FR-02, FR-03）
- [x] task-03: P3 ARCHITECTURE/CONVENTIONS 补 dispatch/sillyhub-mcp/progress/docs-consistency 段落 + 修 ARCHITECTURE.md:L99 失效引用；PROJECT/INTEGRATIONS/TESTING/CONCERNS 逐份核对刷新 + 各文档 frontmatter source_commit/updated_at 更新（覆盖：FR-02, FR-04）
- [x] task-04: P4 验证与提交：`docs check`（清单内 0 新增失效，存量 5 并行遗留）+ `npm test`（210 全绿）+ grep propose 零残留 + 显式 pathspec 提交（覆盖：FR-05, D-001@v1）

任务依赖：task-01→02→03→04 串行（P1 建卡后 P2/P3 引用其模块名）。

## 验收

- AC-01: `_module-map.yaml` schema_version=2 且 26 文件全部有 paths 归属；`node -e` 调 parseModuleMapSimple 解析模块数 ≥ 20
- AC-02: `grep -ri propose .sillyspec/docs/sillyspec/scan/ .sillyspec/docs/sillyspec/modules/` 仅剩"移除了 propose"类历史性提及，无阶段描述残留
- AC-03: STRUCTURE.md 目录树条目与 `ls src/` 逐项一致
- AC-04: `docs check` 失效 ≤ 5（并行遗留）且清单内 14 文件 0 新增；`npm test` 全绿
- AC-05: 四个 task 各自独立 commit（可单独 revert），提交用显式 pathspec 未夹带并行会话暂存

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-03（修 L99）、task-04（相对口径验证） | AC-04 |
