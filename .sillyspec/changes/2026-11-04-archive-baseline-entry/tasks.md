---
author: flow-machine-draft
created_at: 2026-11-04T00:08:40.461Z
---
# 任务注册表（Tasks）— 2026-11-04-archive-baseline-entry

- [x] task-01: 归档蒸馏时为每个含做法概述段且交付面可匹配模块的变更机械产出恰好一条 D-000@v1 基线条目（标题=变更标题+首句、正文=做法概述整段、文件=change-patch.json、锚点=归档 design 路径、字段齐全不被 dispositionOf 落选）
- [x] task-02: 基线条目幂等（重蒸馏不重复），D-000 已被人工占用时跳基线
- [x] task-03: 检索去重：同文件内基线条目排序不抢人工决策条目之前
- [x] task-04: 存量回放脚本走同一代码路径（不另立条目体系），信号词表为脚本参数非硬编码
- [ ] task-05: 平台仓回放落地后搜「冻结」词面命中 2026-10-21-daemon-sync-hardening 基线条目
