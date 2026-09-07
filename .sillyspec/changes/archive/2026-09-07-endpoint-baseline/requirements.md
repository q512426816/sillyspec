---
author: qinyi
created_at: 2026-09-07T08:30:00+08:00
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent | execute Step3 按指引跑基线命令一次 |
| CLI（机器） | 幂等拍基线（主仓锚定）；归档现算 diff |
| 审阅者 | delta.md 端点增删节 |

## 功能需求

### FR-01: 基线采集
覆盖决策：D-001@v1, D-002@v1
Given 变更进入 execute（Step3 后任意时点）
When sillyspec endpoints baseline --change <名>
Then scanBackendEndpoints 现算主仓端点集（worktree 内时锚定主仓根）落 endpoint-baselines/<change>.json（幂等已存在不覆盖）；--json 机读

### FR-02: 增删计算与 delta 消费
覆盖决策：D-001@v1, D-002@v1
Given 基线存在
When 归档生成 delta.md
Then 现算当前 × 基线 diffEndpointSets（METHOD+normalizePath 归一；changed 独立行不配对）→ After 段「端点增删」节；基线缺失降级注记（门控 backendEndpoints>0）

### FR-03: execute 指引
覆盖决策：D-001@v1
Given execute Step 3 prompt
When 组装
Then 含基线命令指引一行（幂等说明+用途）

## 非功能需求
- 兼容：存量无基线降级；空端点集语义正确；endpoints extract 子命令零改动
- 可测试：幂等/归一/diff/主仓锚定/降级/delta 集成断言

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01~03 | 采集/消费时机 |
| D-002@v1 | FR-01, FR-02 | 四项 Grill 修正 |
