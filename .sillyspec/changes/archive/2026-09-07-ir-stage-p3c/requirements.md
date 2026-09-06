---
author: qinyi
created_at: 2026-09-07T04:20:00+08:00
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent | 落盘 D 条目时填模块域（NEW: 前缀声明新模块）；Step6 优先填 design-init 骨架 |
| CLI（机器） | 末步核验模块域；渲染骨架；注入 _facts |
| 审阅者 | 决策追踪表机器预填可对照 |

## 功能需求

### FR-01: 模块域机器核验（validateDecisionModuleRefs）
覆盖决策：D-001@v1, D-002@v1, D-004@v1
Given 变更 decisions.md 存在 D 条目
When brainstorm「生成规范文件」步 --done（步骤级钩子链）
Then 各当前版本条目模块域逐 id 核验：∈ _module-map.yaml 或 NEW: 前缀（冒号后无空格）→ 通过；不存在且无前缀=ERROR（含出路提示）；实改面（design 清单×paths）与声明域差异=WARNING 双向提示；全缺失=WARNING 汇总；无 map/无 decisions=跳过

### FR-02: design-init 骨架渲染
覆盖决策：D-003@v1
Given 变更进入 Step 6
When 跑 sillyspec design-init --change <名>
Then design.md 十三章节骨架落盘（决策追踪表从当前版本 D 条目预填、文件清单表骨架、章节标题与 stage-contract-spec 目标定义一致）；已存在不覆盖（--force 覆盖）；手写路径仍合法

### FR-03: _facts.md 注入
覆盖决策：D-003@v1
Given docs/<project>/scan/_facts.md 存在
When brainstorm Step 2 prompt 组装
Then 底稿全文注入 + 禁止重复 grep 红线；fail-soft

## 非功能需求
- 兼容性：存量（无模块域/无 map/手写 design）零红门禁；SillyHub additive
- 可测试：双源一致性（distill vs design-facts 解析）、核验分级、骨架标题契约断言

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 载体=decisions.md |
| D-002@v1 | FR-01 | ERROR 语义与 NEW: 豁免 |
| D-003@v1 | FR-02, FR-03 | 三件套形态 |
| D-004@v1 | FR-01, FR-02 | Grill 修正五项 |
