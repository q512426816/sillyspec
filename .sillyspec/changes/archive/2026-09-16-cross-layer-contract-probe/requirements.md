---
author: qinyi
created_at: 2026-09-16 12:23:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者 | sillyspec 维护者，消费探针8 契约维度结果定位跨层契约错位 |
| agent | 流程执行者，在 verify 阶段读探针8 预填段并逐条裁定 |

## 功能需求

### FR-01: design 契约面解析
覆盖决策：D-001@v1, D-002@v1
Given design.md 含契约类章节（标题含「接口定义/数据模型/接口契约/字段」）且表头首列含「字段/Field」
When parseDesignContracts(designPath) 执行
Then 每张命中表产出 {name, fields, required}，required=说明列含「必填/required/※」
Given design.md 不存在 / 无契约面 / 章节含 <!-- probe8-skip -->
When parseDesignContracts 执行
Then 返回空契约面或跳过该章节，不报错

### FR-02: 契约外载荷键维度（contractOrphans）
覆盖决策：D-001@v1, D-002@v1
Given 前端载荷键（既有 extractPayloadKeys 提取，零改动）∉ 全部契约面字段并集，且该键已落入既有 feOnly/mispairs 疑似面
When runProbe8PayloadParity 执行
Then contractOrphans 含该键（附可选 hint=对契约字段集 token-Jaccard≥0.4 提示配对），advisory 不阻断
Given 载荷键 ∈ 契约字段
Then 不进 contractOrphans（既有维度照常输出）

### FR-03: 契约必填漏发维度（missingRequired）
覆盖决策：D-001@v1, D-002@v1
Given 契约 required 字段在 feKeys 全集零出现，且 design 接口定义章含 POST/PUT 行
When runProbe8PayloadParity 执行
Then missingRequired 含 {field, contract}，advisory
Given design 无提交端点行
Then 本维度不启用（防查询载荷误报）

### FR-04: 既有维度零回归
覆盖决策：D-002@v1
Given 任意 design/改动集输入
When 探针8 执行
Then 既有 mispairs/feOnly/missingNotNull 输出与三提取器（extractJavaFields/extractSqlNotNullColumns/extractPayloadKeys）行为与 ed540c6 语义完全一致；既有 test/probe8-payload-parity.test.mjs 五组用例零触碰零失败

### FR-05: 渲染与 metrics 扩展
覆盖决策：D-002@v1
Given 探针8 执行（applicable）
Then PROBE8 渲染段新增 contractOrphans/missingRequired 两行（skipped 时注记不空段），facts metrics 同步扩展

### FR-06: 一致性抽查接线（ed540c6 缺口）
覆盖决策：D-002@v1
Given verify 阶段探针一致性抽查执行
Then probe8 维度按 WARNING 级（环境敏感组，对齐 probe3/probe5 处置）参与正文预填段与机械结果对账

## 非功能需求
- 兼容性：既有探针8 直接比对语义与既有测试零变动；无契约面变更（纯后端/纯文档）两新维度 skipped 零噪音
- 可回退：两新维度为新增代码路径，revert 即回退
- 可测试：parseDesignContracts 纯函数；五用例 fixture 独立可重复
- 性能：契约解析单文件单遍；比对复用既有归一化/配对原语

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01~FR-03 | design 契约枢纽 + advisory 核心思想（形态随 D-002 调整为扩展维度） |
| D-002@v1 | FR-02~FR-06 | 扩展现有探针8：既有零回归 + 渲染/metrics + 一致性接线 |
