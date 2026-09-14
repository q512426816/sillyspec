---
author: qinyi
created_at: 2026-09-14 23:45:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI（verify-probes + gates） | 机械预填归属与提示、槽位 fail-closed 校验 |
| verify agent | 填四枚举判定 + 证据（covered/partial 附测试锚点） |
| 写测试的 agent | 按 testcase-design 第 7 条对齐 acceptance |

## 功能需求

### FR-01: 探针 7 结构归属与提示
覆盖决策：D-001@v1
Given verify-probes 运行且变更存在 tasks/ TaskCard
When 逐 task 解析 frontmatter acceptance（jsYaml 自解析，string/array 双形态）
Then 输出每 task 的 acceptance 列表 × 归属测试文件（allowed_paths 测试模式匹配 ∪ 当前 runId review.json changedFiles 的 test/ 前缀，runId 内联 marker 解析禁 task-review import）× 关键词命中提示（标识符+CJK 片段 grep 归属文件，上限 5 词，仅提示不判定）

### FR-02: 矩阵骨架与 fail-closed 门禁
覆盖决策：D-001@v1
Given verify-result.md 骨架生成（--init）或已存在但缺矩阵段
When tasks/ 存在
Then 骨架含「#### 探针 7：验收×测试覆盖矩阵」章节（每 task 一表，判定槽四枚举 covered/partial/uncovered/non-testable + 证据列）；缺段时幂等追加（不触既有正文，自举通道）；verify --done runValidators 校验：未填槽=0 且 covered/partial 行证据非空（测试锚点形态），违者 ERROR 阻断；有 tasks 无段（严格档）ERROR

### FR-03: 映射约定文档化
覆盖决策：D-001@v1
Given templates/prompts/testcase-design.md 为单一真源（4 处 prompt include）
When 追加第 7 条
Then 写测试引导含覆盖对账约定（每条 acceptance 至少一用例或显式 non-testable；对应关系探针 7 机械核对）；verify-probes.md 探针清单与 verify.js step5 prompt 同步矩阵消费说明

## 非功能需求
- 兼容性：无 tasks/（quick/旧变更）probe7.applicable=false 零行为变化；探针 3 与 7 口径差异骨架注记（存在性面 vs 承接面，冲突以 7 为准）
- 审计：hints 为普通对象（json 可序列化）；applicable 顶层键

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02, FR-03 | 三层分工：机械归属+提示 / 语义判定+证据 / 槽位 fail-closed |
