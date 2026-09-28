---
author: flow-machine-draft
created_at: 2026-09-28T06:39:48.180Z
---
# 任务注册表（Tasks）— 2026-09-28-known-failures-hardening

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 匹配语义——锚定式语法 + 泛用裸模式停用 + exemptedBy 追加字段 + PER_TEST_FAIL_RE 补 ✖ (FR-01 FR-02)
- [x] task-02: 分层入库——known-failures.yaml（24 条审计迁移）+ loader 两源合并 + 装载/停用披露 (FR-03)
- [x] task-03: 裁判披露——锚定与裸子串命中分计、裸命中收敛提示 (FR-04)
- [x] task-04: 测试 +11 断言（锚定豁免、M1 kill-shot 三连、兼容非硬行、裁判披露、合并装载、空输出形状），74/74 全过 + task-done/flow-protocol 回归 26/26 (FR-05 FR-06)
