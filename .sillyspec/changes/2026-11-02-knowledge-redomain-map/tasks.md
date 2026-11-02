---
author: flow-machine-draft
created_at: 2026-11-02T11:41:53.573Z
---
# 任务注册表（Tasks）— 2026-11-02-knowledge-redomain-map

- [x] task-01: 工具——redomain-unmapped.js 加 --map（planFromMap 未知 id 拦截、__prune__ pruneUnmappedEntries 原语含精确计数/裁空删文件+sync、applyFromMap fail-fast + 守恒 + 幂等复跑 + supersedes 警告）；CLI 接 --map；启发式路径不变
- [x] task-02: 测试——test/redomain-unmapped-map.test.mjs（--map 迁移/裁剪/裁空删文件+INDEX/守恒/幂等/过期 id/supersedes 警告/prune-only sync）+ 既有 redomain 三套回归全绿
- [x] task-03: 本仓执行——gen-prune-map.mjs 执行时重判定 duplicate（防 id 漂移）生成 __prune__ 映射 → --map --apply 落盘；eval 确认六探针 GREEN 五面零变化；幂等复跑 0
- [x] task-04: 平台清单——两栏建议 + fr/backend.md 孤儿字段块警告 + 重生成提示；4B-REPORT.md（9 unique 移交指针 + 头注失真记 4C）
- [x] task-05: 提交与验收——knowledge 改动显式 pathspec 提交、守恒数字记录、lint 绿
