---
author: flow-machine-draft
created_at: 2026-11-04T02:52:07.481Z
---
# 任务注册表（Tasks）— 2026-11-04-deploy-env-build-switch-cleanup

- [ ] task-01: deploy/.env 中 KNOWLEDGE_SEARCH_SERVER_BUILD=0 及其误导性注释块（67-69 行）删除，其余配置行不动
- [ ] task-02: docker-compose.yml 不改（显式传递列为后续建议不在本变更）
- [ ] task-03: 提交仅含 deploy/.env 单文件（显式 pathspec）
