---
author: flow-machine-draft
created_at: 2026-11-04T02:52:07.481Z
---
# 提案书（Proposal）— 2026-11-04-deploy-env-build-switch-cleanup

## 动机

任务原话转写：deploy.env 禁建库残留开关清理

动机与背景
2026-11-04 知识索引漏推故障（CLI 漏推 daemon.md）平台侧四查发现：仓库 deploy/.env:67-69 残留 KNOWLEDGE_SEARCH_SERVER_BUILD=0（2026-10-19-knowledge-build-switch-rollout 所设），但 docker-compose.yml 的 backend environment 从未引用该变量，值从未传进生产容器；生产实际按代码默认 True 在容器内建库（日志实证 78s/110s 请求内差量重嵌入）。残留与生产实态矛盾，存在未来补 compose 引用或照抄部署时意外关建库的陷阱，按移交清单清理。

成功标准：
- deploy/.env 中 KNOWLEDGE_SEARCH_SERVER_BUILD=0 及其误导性注释块（67-69 行）删除，其余配置行不动
- docker-compose.yml 不改（显式传递列为后续建议不在本变更）
- 提交仅含 deploy/.env 单文件（显式 pathspec）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. deploy/.env 中 KNOWLEDGE_SEARCH_SERVER_BUILD=0 及其误导性注释块（67-69 行）删除，其余配置行不动
2. docker-compose.yml 不改（显式传递列为后续建议不在本变更）
3. 提交仅含 deploy/.env 单文件（显式 pathspec）

## 成功标准（可验证）

1. deploy/.env 中 KNOWLEDGE_SEARCH_SERVER_BUILD=0 及其误导性注释块（67-69 行）删除，其余配置行不动
2. docker-compose.yml 不改（显式传递列为后续建议不在本变更）
3. 提交仅含 deploy/.env 单文件（显式 pathspec）
