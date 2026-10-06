---
author: flow-machine-draft
created_at: 2026-10-06T09:45:56.759Z
---
# 决策记录（Decisions）— 2026-10-06-git-optional-locks

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：读命令不再刷新 stat 缓存，后续读每次都要重扫文件 stat——大仓上 status 略慢、index 文件 mtime 不再被本工具更新。可接受：正确性无差（status 结果仍如实反映工作区），性能差在毫秒级轮询场景不可观测。 放弃的方案：①逐调用点加 `--no-optional-locks` flag——放弃，只覆盖被改的调用点且维护面碎；watcher/后台全覆盖需要枚举改点，恰是要避免的形态。②在 stageArchiveSourceSideMoves 里对 lock 类错误做有界重试——放弃（本变更时点）：重试是下游补丁，治标；上游消灭锁窗口后本工具自扰的锁冲突已不存在，外部进程的偶发冲突由 archive-stage-claim 的告警面兜住。若外部冲突实测高频再议。
