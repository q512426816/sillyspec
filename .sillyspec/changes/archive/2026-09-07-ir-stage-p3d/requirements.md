---
author: qinyi
created_at: 2026-09-07T06:40:00+08:00
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI（机器） | delta 命令聚合四源；archive 确认步自动生成 |
| 审阅者/agent | 读 delta.md 审计与 scan 刷新建议 |

## 功能需求

### FR-01: delta 聚合器与 CLI
覆盖决策：D-001@v1, D-002@v1, D-003@v1
Given 变更存在（任意龄——存量或新）
When sillyspec delta --change <名>
Then delta.md 落变更目录：Before（受影响模块注册信息+声明域）/Delta（交付文件×模块归属表+决策清单+探针摘要，reconcile 按 change 过滤取最新、缺失用 apply-pathspec 兜底）/After（module-impact 引用+scan 刷新建议+端点基线立项提示）；四源缺省逐段降级注记；幂等复跑；--json 机读

### FR-02: archive 自动生成
覆盖决策：D-002@v1
Given archive --confirm
Then 目录移动前自动生成 delta.md（随归档进 archive/）；fail-soft（生成异常归档不阻断，提示手动补）

## 非功能需求
- 兼容性：存量变更四源缺失逐段降级；不改 scan facts/contract-matrix/module-changelog 行为
- 可测试：四源聚合/降级/归属推导/幂等/归档集成断言

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 缩范围与不做清单 |
| D-002@v1 | FR-01, FR-02 | 双入口/三段式 |
| D-003@v1 | FR-01 | --json/兜底/源4 形态 |
