---
author: flow-machine-draft
created_at: 2026-09-27T11:37:00.043Z
---
# 任务注册表（Tasks）— 2026-09-27-redomain

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 新增 tests redomain 子命令：--from <域> --to <域> [--anchor <FR-id>]，干跑缺省列出将迁移条目…
- [x] task-02: 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号
- [x] task-03: 前缀与域不符属历史痕迹，文档说明）
- [x] task-04: 段切割用 splitKnowledgeSections
- [x] task-05: joinKnowledgeFile 单源
- [x] task-06: 目标域文件缺席则按 loadDomainSections 同款头新建
- [x] task-07: 目标域无 INDEX 路由行则经 syncIndexRoutingLines 补
- [x] task-08: 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）
- [x] task-09: anchor 模式精确单条
- [x] task-10: 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
- [x] task-11: 全仓测试绿
