---
author: flow-machine-draft
created_at: 2026-11-02T12:56:27.437Z
---
# 提案书（Proposal）— 2026-11-02-knowledge-status-lines

## 动机

任务原话转写：known-issues 状态行与停车场头注收尾

4C 方案审查确认：状态行纯数据侧标注零代码行为变化（isResolvedRoute 只读 INDEX 不读正文，docs-check 只扫 decisions/*.md，anchor_drift 只比 heading，scope 摘要面不收集本仓 known-issues）；修正两点——decisions/unmapped 不加 draft 字段行（字段行是 docs-check 机械解析契约且 producer=decision-distill 勿手改），改头注一行自描述；状态行放条目首段说明之后（防 scope 摘要误取，虽本仓无 scope 标记）。标注错误无检索后果（复核以语义准确为目标不设行为门）。

成功标准：
- 状态行：本仓 known-issues.md 53 条 heading 全部标注一行「- 状态：现行|已修复|已解决|已退役|观察|债务」（固定六值词表），放首段说明之后；heading/标题词/INDEX 全不动；判据=emoji+标题词+正文语义启发式，先出建议清单再落盘
- 平台 48 条：只出建议清单（heading→建议状态→判据）不写入
- decisions/unmapped 头注加一行「本池条目为检索面-only 停车场（语义等价 draft/exclude）」自描述（不加字段行）
- fr/unmapped 头注「残余 625 条」修正为实际（2 条）并更新治理注记
- 验收：knowledge validate 零新增告警 + docs-check 零回归 + eval 六探针五面零回归 + 既有 knowledge-rank-denoise 测试绿（isResolvedRoute 不变性）
- 测试：不适用——纯数据标注（验收靠 validate/docs-check/eval 零回归）

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. 状态行：本仓 known-issues.md 53 条 heading 全部标注一行「- 状态：现行|已修复|已解决|已退役|观察|债务」（固定六值词表），放首段说明之后；heading/标题词/INDEX 全不动；判据=emoji+标题词+正文语义启发式，先出建议清单再落盘
2. 平台 48 条：只出建议清单（heading→建议状态→判据）不写入
3. decisions/unmapped 头注加一行「本池条目为检索面-only 停车场（语义等价 draft/exclude）」自描述（不加字段行）
4. fr/unmapped 头注「残余 625 条」修正为实际（2 条）并更新治理注记
5. 验收：knowledge validate 零新增告警 + docs-check 零回归 + eval 六探针五面零回归 + 既有 knowledge-rank-denoise 测试绿（isResolvedRoute 不变性）
6. 测试：不适用——纯数据标注（验收靠 validate/docs-check/eval 零回归）

## 成功标准（可验证）

1. 状态行：本仓 known-issues.md 53 条 heading 全部标注一行「- 状态：现行|已修复|已解决|已退役|观察|债务」（固定六值词表），放首段说明之后；heading/标题词/INDEX 全不动；判据=emoji+标题词+正文语义启发式，先出建议清单再落盘
2. 平台 48 条：只出建议清单（heading→建议状态→判据）不写入
3. decisions/unmapped 头注加一行「本池条目为检索面-only 停车场（语义等价 draft/exclude）」自描述（不加字段行）
4. fr/unmapped 头注「残余 625 条」修正为实际（2 条）并更新治理注记
5. 验收：knowledge validate 零新增告警 + docs-check 零回归 + eval 六探针五面零回归 + 既有 knowledge-rank-denoise 测试绿（isResolvedRoute 不变性）
6. 测试：不适用——纯数据标注（验收靠 validate/docs-check/eval 零回归）
