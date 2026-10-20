---
author: flow-machine-draft
created_at: 2026-10-20T01:21:33.016Z
---
# 任务注册表（Tasks）— 2026-10-20-gate-snapshot-carried-deps

- [x] task-01: createGateSnapshot 增可选 carriedFiles：与 files 同款 overlay 语义（三态源判定/运行时面跳过/import 冒烟），计数与清单入返回值（carriedFiles），不进判定面
- [x] task-02: createVerifyGateSnapshot 的 foreign 剔除改为「判定面剔除+物理携带」，控制台提示携带 N 个他者声明文件；全部被剔仍回退主仓的既有语义不变
- [x] task-03: 未声明的无主脏文件在 worktree 模式照旧不进快照（隔离核心不动）；in-place 无主文件 fail-closed 保留语义不变
- [x] task-04: 坑文场景钉测试：本变更文件依赖他者声明文件的新导出 → 快照含他者文件工作区版本（依赖自洽）；既有快照套件语义变化处（他者声明文件物理在场断言）同步改钉
- [x] task-05: 既有 gate-snapshot 全家族测试与 verify 门相关回归全绿
