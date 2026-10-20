---
author: flow-machine-draft
created_at: 2026-10-20T01:21:33.016Z
---
# 提案书（Proposal）— 2026-10-20-gate-snapshot-carried-deps

## 动机

任务原话转写：门禁快照携带他者声明依赖自洽

动机与背景：坑 verify-gate-worktree-crossrepo-three-defects 缺陷二（结构性，留设计项至今）——quick+full 多变更叠加同一文件时，快照面=本变更 declared 集，被 foreign 过滤剔除的他者声明文件（如 quick 未提交的 stripPathPrefix）物理不进快照 → 快照=HEAD 旧版缺依赖 → 本变更测试 TypeError 假红；现靠 SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF=1 逃生回主仓。期望修复（坑文）：快照对叠加内容自洽（worktree 版本本身已含 baseline 携带的叠加内容）。

设计要点（判定面与物理面分离）：他者声明文件从判定面剔除的归属语义不变，但改以「携带态」物理进快照——worktree 模式携带 worktree 内在场的他者文件（快照≈worktree 自洽态）、in-place 模式携带主仓工作区版本（快照≈SNAPSHOT_OFF 回退主仓时的真实树）；未声明的无主脏文件在 worktree 模式仍物理隔离。坑文场景（本变更文件 import 他者新增导出）从此在快照内自洽。

成功标准：
- createGateSnapshot 增可选 carriedFiles：与 files 同款 overlay 语义（三态源判定/运行时面跳过/import 冒烟），计数与清单入返回值（carriedFiles），不进判定面
- createVerifyGateSnapshot 的 foreign 剔除改为「判定面剔除+物理携带」，控制台提示携带 N 个他者声明文件；全部被剔仍回退主仓的既有语义不变
- 未声明的无主脏文件在 worktree 模式照旧不进快照（隔离核心不动）；in-place 无主文件 fail-closed 保留语义不变
- 坑文场景钉测试：本变更文件依赖他者声明文件的新导出 → 快照含他者文件工作区版本（依赖自洽）；既有快照套件语义变化处（他者声明文件物理在场断言）同步改钉
- 既有 gate-snapshot 全家族测试与 verify 门相关回归全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. createGateSnapshot 增可选 carriedFiles：与 files 同款 overlay 语义（三态源判定/运行时面跳过/import 冒烟），计数与清单入返回值（carriedFiles），不进判定面
2. createVerifyGateSnapshot 的 foreign 剔除改为「判定面剔除+物理携带」，控制台提示携带 N 个他者声明文件；全部被剔仍回退主仓的既有语义不变
3. 未声明的无主脏文件在 worktree 模式照旧不进快照（隔离核心不动）；in-place 无主文件 fail-closed 保留语义不变
4. 坑文场景钉测试：本变更文件依赖他者声明文件的新导出 → 快照含他者文件工作区版本（依赖自洽）；既有快照套件语义变化处（他者声明文件物理在场断言）同步改钉
5. 既有 gate-snapshot 全家族测试与 verify 门相关回归全绿

## 成功标准（可验证）

1. createGateSnapshot 增可选 carriedFiles：与 files 同款 overlay 语义（三态源判定/运行时面跳过/import 冒烟），计数与清单入返回值（carriedFiles），不进判定面
2. createVerifyGateSnapshot 的 foreign 剔除改为「判定面剔除+物理携带」，控制台提示携带 N 个他者声明文件；全部被剔仍回退主仓的既有语义不变
3. 未声明的无主脏文件在 worktree 模式照旧不进快照（隔离核心不动）；in-place 无主文件 fail-closed 保留语义不变
4. 坑文场景钉测试：本变更文件依赖他者声明文件的新导出 → 快照含他者文件工作区版本（依赖自洽）；既有快照套件语义变化处（他者声明文件物理在场断言）同步改钉
5. 既有 gate-snapshot 全家族测试与 verify 门相关回归全绿
