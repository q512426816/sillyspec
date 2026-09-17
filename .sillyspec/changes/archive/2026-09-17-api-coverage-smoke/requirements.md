---
author: qinyi
created_at: 2026-09-17 21:50:00
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者（agent） | 按流程执行变更的 AI agent——矩阵用例的派生者（须挂依据 ID）与 smoke 脚本的编写者 |
| 工具（CLI） | smoke 亲跑执行方、矩阵预填与对账方、第五条件封顶方 |
| 用户 | 变更审批点裁决人；commands.smoke 的配置决策者 |

## 功能需求

### FR-01: commands.smoke 配置与 CLI 亲跑
覆盖决策：D-001@v1, D-010@v1
Given local.yaml 配置 commands.smoke 且 verify 质量扫描步执行
When CLI 亲跑该命令
Then 实录 exit/log（.runtime/verify-logs/smoke-<change>.log）/mtime；300s 超时帽（超时记失败态）；快照内超时回退主仓复跑一次（lint 先例）

Given 代码与 smoke 脚本未变（指纹命中）
When 质量扫描步重跑
Then 复用上次实测记录不重跑

Given 未配置 commands.smoke
When verify
Then 零行为变化（执行段休眠，smokeRan=not-configured）

### FR-02: facts.smokeRan 第五事实条件
覆盖决策：D-002@v1
Given 判级 integration/deployment-critical 且 facts.smokeRan≠'ran' 且结论=PASS
When 封顶校验
Then triggered 含 smoke-not-run 枚举 + error（修复指引：配 commands.smoke 复跑质量扫描步 / 降级 PASS WITH NOTES 移交承载）

Given advisory handover 行在场且 smokeRan≠'ran' 且判级 critical 且结论=PASS
When 封顶校验
Then 仍触发（advisory handover 不豁免 smoke 缺失）

Given 判级非 critical（unit-sufficient 等）
When 封顶校验
Then 第五条件零行为

Given producer 边界：记录在场无 smoke 段 → not-ran+注记；unavailable → not-configured；记录缺失 → not-ran+fail-open 注记
When smokeRan 判定
Then 五边界态封闭如 design §2

### FR-03: 回执机器段与来源标记链
覆盖决策：D-003@v1
Given quality-scan 亲跑过 smoke
When verify-result 回执槽
Then CLI 预填机器段（command/exit/log/mtime 实录 + `source: cli-noai-smoke` 标注），agent 只可追加不可改写（checkProbeConsistency 回执槽一致性对比拦截改写）

Given 机器段在场（任意命令形态，含 node scripts/smoke.mjs / bash smoke.sh 脚本形态）
When classifyReceiptSourceTag / classifyReceiptCommandSource 分类
Then 直判 cross-layer（认 source 标记，非命令词匹配——Grill B-1）

Given 未配置/配置未跑
When 回执槽
Then 标注 not-configured / not-ran 缺态

### FR-04: 接口验证覆盖矩阵
覆盖决策：D-004@v1, D-006@v1
Given design 接口表解析出 N 端点（或声明 N）
When validateApiCoverageMatrix 校验
Then 矩阵 covered 端点行数 < 有效分母（N − non-testable 行数）→ error 逐条列缺覆盖端点

Given 端点行在场但判定 partial/uncovered 且移交项零有效行
When 校验
Then error（同 probe7 条件④联动——已覆盖不足且有未验证端点无去向不可静默）

Given 端点行判定 non-testable 且理由非空
When 校验
Then 合法（不占分子、从分母扣除，对齐 probe7 先例）

Given 无依据 ID 的用例行（判定 uncovered + [探索] 标记）
When 记账
Then 不算覆盖（探索性显式分离）

Given 消费端子行（两空格缩进 `↳ <消费端>:` 前缀）
When 记账
Then 不计入分母分子（advisory 附加面）；有消费端的端点未填子行 → warning

### FR-05: tolerant 解析与声明降级
覆盖决策：D-005@v1
Given design.md 接口段（段头含 接口/端点/API/REST 关键词）表格行含 HTTP 方法 token + 路径样式 token
When parseDesignApiTable
Then 产出 {method, path, rowIdx} 端点集；非接口段表格行不计（段头过滤）

Given 解析零行
When 骨架生成
Then 注入声明占位行「本变更接口面：<N> 端点（agent 声明）」，对账按声明数；声明与解析并存以解析为准

Given 解析零行且零声明且判级 critical
When 校验
Then error（接口面不可静默为零）

Given 判级 critical 且声明 0 端点
When 校验
Then warning 提示复核（D-005 故障面条款）

### FR-06: 表间完备性 advisory
覆盖决策：D-007@v1
Given 接口表写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段命中且无「无权限约束」豁免标记
When 校验
Then warning「写端点 X 未在权限矩阵声明——补行或显式豁免」（不阻断）

### FR-07: prompt 纪律与清单与镜像
覆盖决策：D-008@v1
Given local.yaml 配置 commands.smoke 或变更判级 critical
When verify 阶段 prompt 渲染
Then smoke 纪律段注入（断言派生表/负向下界/执行口径/锚点注释四段）

Given stages/verify.js 既有「CLI 不代跑集成进程」两处文案
When 本变更
When 改写
Then 与亲跑语义一致（「commands.smoke 配置后由 CLI 亲跑机器落盘，其余形态仍须 agent 实跑」）

Given REVIEW_CHECKLISTS
When 本变更
Then 新增 verify 键 + 渲染接线 + smoke 纪律条目；快照测试随行（键 3→4）；文档镜像三步流水线再生

## 非功能需求
- 兼容性：未配置零行为；存量 critical 变更首跑三条合法出路（配 smoke/降 NOTES/risk_level 降级）；facts schemaVersion 与结论枚举不变；probe7/probe8 语义不动
- 可回退：第五条件=分支移除；validator=注册行移除；执行段=配置键删除即休眠
- 可测试：纯函数+mock 命令三态+真实 design.md 解析夹具，+50~70 断言

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | commands.smoke CLI 亲跑 |
| D-002@v1 | FR-02 | 第五事实条件 |
| D-003@v1 | FR-03 | 机器段与来源标记 |
| D-004@v1 | FR-04 | 矩阵行数 fail-closed 与记账 |
| D-005@v1 | FR-05 | tolerant 解析降级 |
| D-006@v1 | FR-04 | 消费面 advisory |
| D-007@v1 | FR-06 | 表间完备性 |
| D-008@v1 | FR-07 | prompt 纪律 |
| D-009@v1 | 全 FR 边界 | 非目标清单 |
| D-010@v1 | FR-01, FR-04 | 方案 A 硬度形态 |
