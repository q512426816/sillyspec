---
author: flow-machine-draft
created_at: 2026-09-27T09:44:22.951Z
---
# 任务注册表（Tasks）— 2026-09-27-tool-debt-cleanup

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: filterCommittedFace 纯函数（flow-parity 导出，先归一后过滤）+ flow.js 换用 + .sillyspec/docs/ 保留 + walk 排 flow-state.yaml + note 更新 (FR-01 FR-02)
- [x] task-02: _module-map 登记 ui-visual.js、hunk-attribution.js（cli-entry）与 knowledge-digest.js（core-engine，importer 家族归属） (FR-03)
- [x] task-03: test-bindings 去 normalizeTestsRootRel 冗余导出；check-syntax 全仓实测 pass 1 fail 0 解锁 (FR-04)
- [x] task-04: 单测 5 用例锁定过滤契约（非 sillyspec 全留/本变更目录留/他侧变更滤除/docs 保留/knowledge 与 runtime 滤除/反斜杠归一）+ 共享文件 5 hunk 逐条人工核对零外源 (FR-05 FR-06)
