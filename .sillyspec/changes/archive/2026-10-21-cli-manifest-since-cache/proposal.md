---
author: flow-machine-draft
created_at: 2026-10-21T14:12:39.700Z
---
# 提案书（Proposal）— 2026-10-21-cli-manifest-since-cache

## 动机

任务原话转写：CLI 清单增量游标消费
动机：平台 spec-manifest 已支持 ?since=<spec_version> 增量返回（multi-agent-platform 2026-10-21-spec-manifest-incremental 已归档）。CLI 每条命令全量拉清单（2.2MB/5.5s@400KBps）吃掉 8s 同步预算——本变更加本地清单缓存+since 增量合并，稳态亚秒。旧平台（无 spec_version 字段）自动回退全量，兼容未部署窗口。

成功标准：
- 有缓存时 GET 带 ?since=<spec_version>，响应增量行合并进缓存（含墓碑行）
- 无缓存/对账轮/环境变量 SILLYSPEC_SPEC_SYNC_FULL=1 走全量并落缓存
- 旧平台响应（无 spec_version）自动作废缓存回退全量，行为与现状一致
- 服务端 spec_version 倒退（重建）时一次性全量重拉对账
- 稳态清单请求 <1s（本地 mock e2e 实证）

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 有缓存时 GET 带 ?since=<spec_version>，响应增量行合并进缓存（含墓碑行）
2. 无缓存/对账轮/环境变量 SILLYSPEC_SPEC_SYNC_FULL=1 走全量并落缓存
3. 旧平台响应（无 spec_version）自动作废缓存回退全量，行为与现状一致
4. 服务端 spec_version 倒退（重建）时一次性全量重拉对账
5. 稳态清单请求 <1s（本地 mock e2e 实证）

## 成功标准（可验证）

1. 有缓存时 GET 带 ?since=<spec_version>，响应增量行合并进缓存（含墓碑行）
2. 无缓存/对账轮/环境变量 SILLYSPEC_SPEC_SYNC_FULL=1 走全量并落缓存
3. 旧平台响应（无 spec_version）自动作废缓存回退全量，行为与现状一致
4. 服务端 spec_version 倒退（重建）时一次性全量重拉对账
5. 稳态清单请求 <1s（本地 mock e2e 实证）
