---
author: flow-machine-draft
created_at: 2026-09-28T06:51:06.976Z
---
# 任务注册表（Tasks）— 2026-09-28-flow-date-gate

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: flow start --change friction-signal-hint（净新建、无日期前缀）exit 2 且报错含 YYYY-MM-DD-<简短描述>…
- [x] task-02: flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
- [x] task-03: 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉）
- [x] task-04: 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-DD-flow-<hex> 形态）
- [x] task-05: 既有 flow 族测试全部适配通过（test+lint 双绿）
