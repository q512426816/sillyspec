---
author: qinyi
created_at: 2026-09-09T01:05:00+08:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent | 写 tasks/*.md depends_on（依赖唯一真相）；预排 Wave 仅草稿 |
| CLI（门禁） | 违规检测→提案验证→自动修复；plan_level 信号复核 |

## 功能需求

### FR-01: Wave 违规自动修复
覆盖决策：D-001@v1, D-002@v1
Given plan.md Wave 段存在依赖方向违规（depends_on 同 Wave/后置 Wave）且拓扑提案干净（一致性复跑过 + 逐 Wave allowed_paths 无交集）
When plan --done
Then 自动落盘拓扑布局（Wave 段+W 列）+ 回执（违规明细→验证结果→段数），继续后续检查

Given 违规且提案脏（同 Wave 文件重叠/护栏拒绝）
Then 保留手排原文，throw 原失败信息 + 冲突明细

Given 结构不一致但方向合法（保守串行）
Then 静默放行（零改写零输出）

### FR-02: 修复回执
Given 自动修复发生
Then 回执含违规明细、提案验证结论、落盘段数；plan.md 无静默变更

### FR-03: plan_level 客观复核
覆盖决策：D-003@v1
Given plan_level=light/full 且（design 文件清单 > 8 或模块跨度 > 2）
When plan --done
Then warning 透出信号与建议（不阻断；agent 一行理由豁免）

### FR-04: prompt 与文档同步
覆盖决策：D-004@v1
Given 本变更落地
Then plan.js :431-434 教学补「违规自动修复/合法串行不改写」句；docs/prompt 镜像 _verify exit 0；模块卡 sidecar；execute 解析零改动（测试锁定）

## 非功能需求
- 兼容性：提案异常回落现状 throw；none/light taskFiles 守卫保留零新阻断
- 可回退：mode 默认 write 向后兼容，CLI 调用点零改动
- 可测试：三分流各至少 1 用例；幂等断言

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | 违规才自动修，合法布局永不碰 |
| D-002@v1 | FR-01 | W 列随修复同步 |
| D-003@v1 | FR-03 | 第二把尺子 warn 不接管 |
| D-004@v1 | FR-04 | execute 消费侧零变更 |
