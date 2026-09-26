---
author: flow-machine-draft
created_at: 2026-09-26T01:13:44.373Z
---
# 任务注册表（Tasks）— 2026-09-26-verify-gate-restrictfiles

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。

- [x] task-01: gates.js verify 测试对账门的 runVerifyTestCheck 调用传入 restrictFiles=resolveVerifyChange…
- [x] task-02: 空清单时不传（走全量——防 restrict 空数组反而制造假 skip）
- [x] task-03: verify.js 步骤渲染首部加一行长会话提示（上下文已重时建议新会话跑 verify——R18 实证 verify 段轮均 3-4 倍长会话税）
- [x] task-04: 测试：gates 文本级接线钉（restrictFiles 在场）+ 既有 gates
- [x] task-05: verify 套件零回归
