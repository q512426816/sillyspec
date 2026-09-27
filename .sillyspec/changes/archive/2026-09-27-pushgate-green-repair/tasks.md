---
author: flow-machine-draft
created_at: 2026-09-27T12:57:41.423Z
---
# 任务注册表（Tasks）— 2026-09-27-pushgate-green-repair

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
- [x] task-02: 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
- [x] task-03: test/config-schema.test.mjs 全绿（renderExample 含 ui_visual_gate/hunk_gate 两个 live 键首段+末段 token——9e4572e9 登记门键时 example 未同步的既有红）
