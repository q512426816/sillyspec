---
author: qinyi
created_at: 2026-08-15 21:15:00
change: 2026-08-15-docs-debt-inject
plan_level: full
---

# 计划（Plan）

## Wave 1

- [x] task-01: src/docs-debt.js（matchFilesToModules 三级归属 paths||core_files→卡片引用→unmapped；computeDocsDebt 双 commit %h %ct 对账 + rev-list behind + untracked 卡 behind=null；全降级不抛）【FR-001/FR-002/FR-006/FR-007】

## Wave 2

- [x] task-02: parseModuleMapSimple 入口 CRLF 归一（modules.js，行为扩散见 design 风险 4）【FR-003】
- [x] task-03: execute.js Wave 模板加 {DOCS_DEBT} 占位符 + prompt.js outputStep 替换分支（KNOWLEDGE_HIT_REPORT 同范式；changedFiles=worktree baseline..HEAD+未提交并集，in-place 退 cwd）【FR-004/FR-007】

## Wave 3

- [x] task-04: test/docs-debt.test.mjs（归属三级/双 commit/untracked/零输出/CRLF/超时降级；本仓实测 loadModuleContextIndex 非空）【FR-003/FR-006】

## Wave 4

- [x] task-05: 文档同步（file-lifecycle 行为扩散说明 + 债单第六节拼图登记 + _extract 镜像重跑）【FR-005 收口】

## 全局验收标准

- npm test 全量绿 + lint 过【FR-005】
- 本仓实测：loadModuleContextIndex 返回 ≥9 模块（CRLF 修复生效）【FR-003】
- 注入实测：有债 fixture 出现 [docs-debt] 块；无债 fixture 无残留占位符【FR-004】
- 集成冒烟：隔离仓跑 run execute，Wave prompt 含注入事实【FR-007】
