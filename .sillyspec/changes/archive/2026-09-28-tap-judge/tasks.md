---
author: flow-machine-draft
created_at: 2026-09-28T09:15:41.329Z
---
# 任务注册表（Tasks）— 2026-09-28-tap-judge

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 双报告器批命令 + tap 标记 + judgeTapOutput 用例粒度判账 + 非 TAP 回退 (FR-01)
- [x] task-02: buildExemptPats/matchExemptLine 共用单点抽取，partitionFailures 改用（语义回归全绿） (FR-02)
- [x] task-03: runOneModule 剥离 NODE_TEST_CONTEXT（脏 env 0 输出复现 → 清洗后 22/22 含 ⑮ 全过，P1 实证闭环）；豁免 D 组三条按删除条件移除 (FR-03 FR-04)
- [x] task-04: 单测六用例含真实双报告器集成（嵌套 env 坑发现并锁定）+ 全相关回归（tap-judge 6/6、task-done、flow-protocol、known-failures 全绿） (FR-05)
