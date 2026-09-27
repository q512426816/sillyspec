---
author: flow-machine-draft
created_at: 2026-09-27T14:15:28.924Z
---
# 任务注册表（Tasks）— 2026-09-27-watcher-push-endpoint

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [ ] task-01: watcher 推送改走 POST {base}/api/changes/{name}/events 单条契约（kind/rule/severity/provi…
- [ ] task-02: 推送失败语义保持 best-effort（失败即弃本地 jsonl 兜底），去重回退 ts+rule 语义不变
- [ ] task-03: watcher 测试套件同步更新并通过
