---
author: qinyi
created_at: 2026-08-16T21:12:00+08:00
updated_at: 2026-08-16T21:12:00+08:00
plan_level: light
---

# 轻量计划（Light Plan）：scan diff 增量刷新命令

## 来源

brainstorm 四件套（design.md 方案决策 D-001~003@v1 / FR-01~06）已确认，用户裁决独立命令 + 方案 A。

## 范围

src 3 文件（新增 scan-diff.js + 改 index.js/command.js）+ test 1 + 文档同步。见 design.md「文件变更清单」。

## Tasks

- [x] task-01: 实现 src/scan-diff.js——computeScanDiff 纯函数（四分类 A/D/M/R + matchFilesToModules 归模块 + isAncestor 守卫 + 默认范围=map paths + safeGit timeout 处理）+ runScanDiff IO（终端渲染聚合/--full 展开/--report 落盘 scan-diff-report.md）（覆盖：FR-01/02/03/04/06, D-001@v1 接线前提）
- [x] task-02: 接线——src/index.js case 'scan' 拦截 filteredArgs[1]==='diff'（跳过 triggerPullActiveChange）+ src/run/command.js scan 参数表补 --diff flag（覆盖：FR-05, D-001@v1）
- [x] task-03: 写 test/scan-diff.test.mjs——四分类（含 W6 rename 场景 R 归变更）/归模块与 matchFilesToModules 一致/unmapped 标注/isAncestor 守卫/无漂移 0 退出/--report 落盘/CLI 集成（覆盖：FR-01~06）
- [x] task-04: 文档同步（docs/prompt/scan.md + file-lifecycle.md + design-d7-scan-lifecycle.md 标注 D-7 剩余项落地）+ npm test 全绿 + 显式 pathspec 提交（覆盖：全 FR）

任务依赖：task-01→02→03→04 串行（计算先行，接线依赖其导出，测试依赖实现，文档收尾）。

## 验收

- AC-01: `sillyspec scan diff` 实测输出四分类清单，归模块与 docs-debt 一致，无漂移 0 退出
- AC-02: `--base` 非祖先 commit 被守卫拦截；`--report` 落盘 scan-diff-report.md
- AC-03: `sillyspec scan diff` 走 index.js 拦截（非 command.js 裸 token 静默吞）
- AC-04: npm test 全绿（新增 scan-diff 单测通过）；docs check 无新增失效
- AC-05: 提交显式 pathspec 未夹带并行会话改动（state-machine-fail-open）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02 | AC-03 |
| D-002@v1 | task-01 | AC-01（复用验证） |
| D-003@v1 | task-01/task-03 | AC-01（R/C 归变更测试） |
