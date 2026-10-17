---
author: flow-machine-draft
created_at: 2026-10-17T06:33:11.678Z
---
# 决策记录（Decisions）— 2026-10-17-archive-terminal-sync-strict

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：exit 1 被上游 agent 误读为「归档失败」而重跑 flow done——告警文案首行明确「本地归档已完成」，且 flow done 重跑对已归档变更是幂等拒绝（不产生二次归档）；平台持续宕机时终态命令将稳定 exit 1（如实反映「一致性未达成」，胜过静默半态）。已试并放弃：①改 triggerSync 全局行为（17 调用点全部受累，非终态命令被拖入阻塞——违背 2026-09-20 后台化的既有决策）；②时间驱动 watchdog 兜底（跨平台常驻进程/计划任务面大，留坑档案远改档）；③仅告警不置退出码（agent 侧无重试信号，保底仍缺一环）。
