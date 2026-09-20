---
author: zcode-fr-l2
created_at: 2026-09-20 07:24:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 归档管线 | noAI 步自动提取 D→FR 并入库 |
| brainstorm 注入 | digest 消费 decisions 供翻案回溯 |

## 功能需求

### FR-01: 依据决策机读链
Given requirements.md 含决策覆盖矩阵（D-xxx@vN → FR-NN 映射）
When 归档 indexRequirements 执行
Then 条目含「依据决策：」行、digest 条目含 decisions 数组；无矩阵/无命中省略行且不阻断

### FR-02: 模块卡指针显式化
Given 任一 knowledge/fr/<域>.md 文件写入/更新
When 文件头 blockquote 落盘
Then 含「模块卡：modules/<域>.md」一行

### FR-03: GWT 场景正文入库
Given requirements.md 含 Given/When/Then 行
When 归档 indexRequirements 执行
Then 条目含「场景正文：」块（每场景一行，各段截 80 字，≤5 场景）

## 非功能需求
- 兼容性：旧条目无新行照常解析；digest.decisions=[] 空处理
- 可测性：纯函数（changeDir/knowledgeRoot 注入）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 依据决策入条目与 digest |
| D-002@v1 | FR-02 | 模块卡指针 |
| D-003@v2 | FR-03, FR-04 | GWT 入库+回填（翻 v1） |

### FR-04: 存量回填
Given knowledge/fr 存在 active 条目缺场景正文，且其来源变更归档目录 requirements.md 在场
When sillyspec fr-backfill 执行
Then 按标题匹配补齐正文（幂等：已有正文的条目跳过；匹配失败警告不阻断）
