---
author: flow-machine-draft
created_at: 2026-11-02T02:07:32.485Z
---
# 提案书（Proposal）— 2026-11-02-knowledge-eval

## 动机

任务原话转写：知识检索评测面：分面基线与缺陷探针

当前知识库检索缺乏任何量化验收面，此前所有改进（词边界、层序、灌入）都是盲修。需要一个可复跑、只读、分消费面的评测工具，为后续排序与降噪变更提供验收尺子。历史遥测 matchedFiles 被旧版本代码污染不可作标签，归档 input 仅本仓 2026-10 轻量道 211 条且平台仓为零，故主查询语料用遥测 query 池配合人工标签。

成功标准：
- 三源数据集：organic（遥测 query 去重池，本仓 110/平台 548，抽样人工 anchor 级标签 30 条起步）、self（211 条归档 input 回放，leave-one-out 防泄漏，只作 smoke 不作质量指标）、probes（合成缺陷 fixtures）
- 缺陷探针 fixtures 覆盖六类：score 输出契约（=命中标签数）、词边界（_/- 策略）、fr/decisions 路由行混入 entries 率、scope 层手工条目可达性、known-issues 已修复条目注入率、决策↔代码关联率
- 分面 runner 输出 Top-1/Top-3（entries@3、decisionHits@5、search@10、scope@3/20 四个核心面），raw 与 rendered 两套结果可区分引擎未召回与渲染截断
- 全流程零网络零遥测副作用（SILLYSPEC_KNOWLEDGE_VECTOR=off、SILLYSPEC_HITS_PUSH=0、临时 runtimeDir），结果带 git HEAD + knowledge 目录 hash 快照指纹
- baseline.json 可提交可 diff，npm run eval:knowledge 可复跑，附零网络 smoke test

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 三源数据集：organic（遥测 query 去重池，本仓 110/平台 548，抽样人工 anchor 级标签 30 条起步）、self（211 条归档 input 回放，leave-one-out 防泄漏，只作 smoke 不作质量指标）、probes（合成缺陷 fixtures）
2. 缺陷探针 fixtures 覆盖六类：score 输出契约（=命中标签数）、词边界（_/- 策略）、fr/decisions 路由行混入 entries 率、scope 层手工条目可达性、known-issues 已修复条目注入率、决策↔代码关联率
3. 分面 runner 输出 Top-1/Top-3（entries@3、decisionHits@5、search@10、scope@3/20 四个核心面），raw 与 rendered 两套结果可区分引擎未召回与渲染截断
4. 全流程零网络零遥测副作用（SILLYSPEC_KNOWLEDGE_VECTOR=off、SILLYSPEC_HITS_PUSH=0、临时 runtimeDir），结果带 git HEAD + knowledge 目录 hash 快照指纹
5. baseline.json 可提交可 diff，npm run eval:knowledge 可复跑，附零网络 smoke test

## 成功标准（可验证）

1. 三源数据集：organic（遥测 query 去重池，本仓 110/平台 548，抽样人工 anchor 级标签 30 条起步）、self（211 条归档 input 回放，leave-one-out 防泄漏，只作 smoke 不作质量指标）、probes（合成缺陷 fixtures）
2. 缺陷探针 fixtures 覆盖六类：score 输出契约（=命中标签数）、词边界（_/- 策略）、fr/decisions 路由行混入 entries 率、scope 层手工条目可达性、known-issues 已修复条目注入率、决策↔代码关联率
3. 分面 runner 输出 Top-1/Top-3（entries@3、decisionHits@5、search@10、scope@3/20 四个核心面），raw 与 rendered 两套结果可区分引擎未召回与渲染截断
4. 全流程零网络零遥测副作用（SILLYSPEC_KNOWLEDGE_VECTOR=off、SILLYSPEC_HITS_PUSH=0、临时 runtimeDir），结果带 git HEAD + knowledge 目录 hash 快照指纹
5. baseline.json 可提交可 diff，npm run eval:knowledge 可复跑，附零网络 smoke test
