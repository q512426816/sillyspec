---
author: flow-machine-draft
created_at: 2026-09-27T09:01:58.457Z
---
# 任务注册表（Tasks）— 2026-09-27-confirm-on-use

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - row: 块的 confirmed_by≠agent 行）
- [x] task-02: 知识注入面：未确认条目带 ⚪N未确认 标记
- [x] task-03: 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符则收口前 sillyspec tests confirm --anchor <id> --ev…
- [x] task-04: 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解析为真实文件…
- [x] task-05: 已是 active 幂等提示
- [ ] task-06: 无绑定行
- [ ] task-07: 证据不可解析拒绝 exit 1
- [ ] task-08: 全仓测试绿
