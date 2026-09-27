---
author: flow-machine-draft
created_at: 2026-09-26T15:33:23.785Z
---
# 任务注册表（Tasks）— 2026-09-26-dynamic-test-inference

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件→其…
- [x] task-02: runner 自项目结构推断（uv run pytest/vitest/jest/node --test），不依赖 local.yaml 测试配置
- [x] task-03: local.yaml modules.*.test 不再消费（在场打印退役指引）
- [x] task-04: commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
- [x] task-05: FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 归一 tests）
- [x] task-06: 新增 tests repair-paths 子命令修复存量错形路径
- [x] task-07: 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自仓根解析
- [x] task-08: 全仓测试绿
