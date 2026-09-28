---
author: t
created_at: 2026-09-29 15:30:00
---

# 决策记录（Decisions）

## D-001@v1: 否决入库侧路由词表派生——同窗词片按序截断=抽签
- type: architecture
- priority: P1
- status: rejected
- question: 检索词覆盖缺口（专业域词不在路由行）要不要在蒸馏入库时把域文件稀有词片派生进路由 tag？
- answer: 实测否决：unmapped.md n∈[2,3] 窗 1176 个词片，目标词（谓词 n=2）排第 759——任何 cap 都是抽签而非选择；入库时挑选词表与「枚举定义开放世界」同构（挑选权无处安放）。改查询侧：只测查询自身几十个词片，无挑选无 cap。
- 否决理由：同窗词片按序截断=抽签，选择面无信号；且 INDEX 行膨胀不可读。
- 复潮条件：出现可靠的封闭面词显著性判据（非出现频次）或蒸馏 agent 主动写 tag 的机制落地。
- normalized_requirement: 检索词覆盖扩展 MUST 走查询侧（查询词片×文件内频次窗口），MUST NOT 入库时挑选派生词表。
- impacts: [FR-01]
- evidence: 2026-09-29 实测（本变更探索轮）：unmapped n∈[2,3] 计 1176、谓词排 759
