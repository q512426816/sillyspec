---
author: flow-machine-draft
created_at: 2026-09-28T15:05:00.000Z
---
# 任务注册表（Tasks）— 2026-09-28-sentinel-mirror-waiver

> 按实际实现路径覆写（thin-agent-tasks）。

- [x] task-01: sentinel-assertions 任务来源判据（mirroredTaskIds＋baselineTasksMd 参数＋mirrored 返回）＋route-hindsight readBaselineTasks 导出
- [x] task-02: 三消费方接线（flow done 拒收/豁免 info/cadence 门控、quick-audit 基线、watcher R1 镜像过滤）
- [x] task-03: 测试与实弹（单测五用例＋watcher 回归 45/45＋Drill1 镜像放行/Drill2 覆写拒收双实弹＋test:core 221/221）
- [x] task-04: 审查 P1/P2/P3 修正——watcher R1 改 changeDir 入参接线（裸键正则死代码修正）＋端到端用例、quick-audit 基线接线落地（此前 python 替换静默未生效）、design 槽4 CRLF 口径对齐实现
