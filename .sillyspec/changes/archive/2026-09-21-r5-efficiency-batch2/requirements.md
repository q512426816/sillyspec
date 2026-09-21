---
author: qinyi
created_at: 2026-09-21 07:59:28
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent 会话主代理 | 消费 CLI 步骤指引/派发 execute 的执行者（本变更的性能受益方） |
| CLI 渲染层 | run/prompt.js outputStep 与 gate-snapshot.js 快照装配 |
| execute 派发段 | buildWavePrompt 派发/材料渲染消费方 |

## 功能需求

### FR-01: 指令指纹增量——同步骤复入只印指纹+路径
步骤指引静态段按渲染结果 sha256 指纹寻址落盘 .runtime/step-guides/；同指纹复入输出 ≤10 行（步骤名/指纹/路径/按需 Read 提示）；动态注入段（材料包/知识命中/DOCS_DEBT）每次渲染永不缓存；--json 模式全量不受影响。

### FR-02: gate 快照分叉态取 worktree 血统
双写分叉（双侧均异于 merge-base 祖先且互不相等）改取 worktree 版+警告补对齐指引；保护态（cwdDiff&&!wtDiff 取主仓）与正常态（wtDiff&&!cwdDiff 取 worktree）逐字节不动；三态各一回归钉。

### FR-03: PLAN 粒度派发默认化
CLI 按第 1 批三条件（正交/无契约链/≤3）预计算推荐分组注入派发段；agent 可偏离须披露；checkBatchAdvisory 附分组清单；SillyHub 模式互斥不注入；main 模式下抑制。

### FR-04: execute direct 模式通道
plan frontmatter execution_mode: main|dispatch 缺省 dispatch（既有变更逐字节零回归）；main 时 Wave 步渲染直写指引（逐任务读卡→worktree 内实现→commit→锚点→review write），派发段/工作目录段/并发帽段不渲染；worktree 隔离/写入守卫/review/verify 全保留。
Given 同一 (stage, step) 第二次渲染且静态段指纹一致
When run <stage> 复入输出步骤指引
Then 输出 ≤10 行（指纹+落盘路径+按需 Read 提示），动态段照常渲染，--json 模式全量输出不变

## 非功能需求
- 兼容性：--json 全量、machine envelope 不变；.runtime 归档清理照扫 step-guides/

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
