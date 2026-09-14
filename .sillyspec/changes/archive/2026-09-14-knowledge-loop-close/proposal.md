---
author: qinyi
created_at: 2026-09-14 11:33:28
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
知识学习闭环的吞吐两处堵塞：生产端归类卡人闸（uncategorized 实测 17 条积压，6-7 月条目未清），消费端不完整不可聚合（execute 已有 report 级命中注入但 quick 侧空白、遥测是 json 快照非事件流，命中矩阵无从统计）。沉淀是否被真实消费缺全链路事实依据。

## 关键问题
1. 归类需「经用户确认」逐条人闸，注意力稀缺 → 积压只增不减；归档侧 decision-distill 已机械化（b89180f 实证），quick 侧是唯一断点。
2. 消费是「建议 agent 自行 cat INDEX 匹配」（quick.js:28）或 report 级清单（execute）——读没读无从验证，正文不进上下文。
3. 无命中遥测聚合 → 知识库 136K 沉淀哪些是死重，没有数据依据。

## 变更范围
五个子机制（D-001/D-002 已批准）：A 归类提议器（quick --done 收尾渲染，进程内根因字段 × matchKnowledge）；B knowledge classify 子命令（双格式寻址 + 四步迁移 + 幂等 + dry-run）；C knowledge-baseline 棘轮（validate 同款计数正则，软警告起步）；D 机械注入（升级既有 {KNOWLEDGE_HIT_REPORT} 至正文级 + quick step1 新增，top-3 限额）；E knowledge stats（hits.jsonl 聚合矩阵 + 死重清单）。

## 不在范围内（显式清单）
- 不做「必须消费」硬门禁（先遥测后优化）
- 不做知识文件自动删除/合并（死重只报告）
- 不新造匹配引擎（复用 knowledge-match.js）
- 不改归档侧 decision-distill 既有链路
- 不移除既有 knowledge-hit-report.json（保留兼容）
- 不涉及平台/dashboard 侧改动

## 成功标准（可验证）
- uncategorized 17 条可全部经 classify 三种寻址迁移，条数受棘轮约束单调下降
- quick step1 与 execute prompt 含 CLI 机械注入的命中正文段（未命中零字节）
- .runtime/knowledge-hits.jsonl 记录 inject/classify 两类事件，stats 可输出近 30 天矩阵与死重清单
- 全链路对 INDEX 缺失/baseline 缺失/旧消费方兼容（no-op 不炸）
