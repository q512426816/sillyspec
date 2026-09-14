---
author: qinyi
created_at: 2026-09-14 11:33:28
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 收尾 agent（quick --done / archive 执行者） | 收到归类提议渲染，执行 knowledge classify 确认归类 |
| CLI（prompt 组装 + 收尾渲染链） | 机械匹配、注入、提议渲染、棘轮对比、遥测落盘 |
| 人（抽审位） | 归档/doctor 抽审自动归类结果，可 revert |

## 功能需求

### FR-01: quick --done 归类提议
覆盖决策：D-001@v1
Given quick --done 收尾渲染（complete-handlers.js handleQuickStageCompletion），四字段 outputText 已通过校验且根因非「无，纯新增/纯样式」形态
When CLI 用根因字段拼查询串跑 matchKnowledge 且有命中
Then 收尾输出渲染「待归类提议」（ql-ID + 疑似命中目标文件#条目 + classify 建议命令）；未命中或纯新增形态时不渲染任何提议

### FR-02: knowledge classify 子命令
覆盖决策：D-001@v1
Given uncategorized.md 存在可寻址条目（标题行 `## <qlId> |` 前缀 ∪ 正文尾注 `（<qlId>）` ∪ --title 模糊兜底）
When 执行 sillyspec knowledge classify --ql <id> --file <目标> [--section] [--keywords] [--dry-run]
Then 四步动作：条目解析 → 追加目标知识文件（## 标题 + 原文）→ INDEX.md 补路由行（anchor=条目标题；keywords 显式传或标题分词兜底）→ 从 uncategorized.md 删除；幂等（目标已含同标题则只迁移收尾）；--dry-run 只渲染；归类动作写一行审计进 .runtime/knowledge-hits.jsonl

### FR-03: knowledge-baseline 棘轮
覆盖决策：D-001@v1
Given .sillyspec/knowledge-baseline 存在（单整数；缺失=未启用）
When quick --done / archive 收尾按 validate 同款正则（/^#{2,3}\s+\S/gm）计数 uncategorized 条数
Then 超线 → 软警告（建议 classify 清单，不阻断）；低于基线 → 自动收紧基线到当前值；文件缺失 → 不警告不阻断

### FR-04: 机械注入（消费端升级）
覆盖决策：D-002@v1
Given prompt 组装时查询串可得（execute：既有 {KNOWLEDGE_HIT_REPORT} 来源 + Wave 任务名串；quick：readQuickGuardField('taskDescription')）
When CLI 跑 matchKnowledge 有命中
Then 命中文件正文注入 prompt（top-3 文件限额按 INDEX 行序取前 3 个不同 file、单文件截断），段头标「CLI 按任务描述机械匹配」；未命中整段零字节；注入逐条落 .runtime/knowledge-hits.jsonl（type: inject）；既有 knowledge-hit-report.json 照旧落盘（兼容）

### FR-05: knowledge stats 命中矩阵
覆盖决策：D-002@v1
Given .runtime/knowledge-hits.jsonl 存在（缺失则输出空矩阵 + 提示）
When 执行 sillyspec knowledge stats [--since-days N] [--json]
Then 输出命中矩阵（文件 × 次数 × 最近命中时间）+ 从未命中文件清单（对照 INDEX 全集标注疑似死重）；纯只读

## 非功能需求
- 兼容性：INDEX.md/knowledge 目录缺失全链路 no-op；baseline 缺失=未启用；存量 uncategorized 17 条三种寻址全覆盖；旧 knowledge-hit-report.json 保留；Windows append 单行 + '\n' 残行容忍
- 审计：归类与注入均留 hits.jsonl 事件流；归类可 revert（条目不丢，位置可改）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02, FR-03 | 归类闭环选型：agent 归类 + 人抽审 + 棘轮 |
| D-002@v1 | FR-04, FR-05 | 消费端升级：机械注入 + 遥测，不做硬门禁 |
