---
author: flow-machine-draft
created_at: 2026-09-26T10:50:12.876Z
---
# 任务注册表（Tasks）— 2026-09-26-full-autopilot-parity

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: execute --done 自动勾选：execute 阶段完成路径（detectExecuteBatchFinish 后/或 --done 收口）解析 run…
- [x] task-02: verify --done 自动绑定：verify 阶段收口测试门之后（test-result.json 已生成）…
- [x] task-03: GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——brainstorm 步骤 8 已有 design 可…
- [x] task-04: 两条均向后兼容（已有内容不覆盖）
- [x] task-05: 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件零回归
