---
author: flow-machine-draft
created_at: 2026-09-27T13:09:56.352Z
---
# 任务注册表（Tasks）— 2026-09-27-thin-module-scope-persist

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: `reconcileModuleDocs`（src/flow-parity.js）换 collectModuleMaps 统一口径——修旧实现四缺陷（modules: 包层解析/多项目全图非取首图/子项目 paths 前缀/doc 同步按仓根相对比对），结构化返回 `modules`/`uncoveredDirs`/`moduleMaps`（test/flow-parity.test.mjs ①②③ 锁定）
- [x] task-02: flow.js patch 子步对账调用前移至 change-patch.json 写盘前，meta 新增三键（无图/零命中空数组兜底，fail-soft 不变；test/flow-parity.test.mjs ④ 集成锁定归档件三键与 console 同源）
- [x] task-03: 填充 git 已跟踪 0 字节占位件 test/flow-parity.test.mjs：单元（结构化返回/无图/零命中/子项目前缀/doc 缺失）+ 集成（临时仓真跑 flow done 断言 change-patch.json）4 用例
- [x] task-04: 验证面全绿：新测试 4/4 + 回归 flow-protocol 22/22 + flow-route/review/draft 16/16 + lint（check-syntax 840 文件，未引用导出 0）+ 交付显式 pathspec 提交
- [x] task-05: 评审清偿（FAIL→修复→重评）：P1 buildFrozenPatch diff 失败 fail-closed 返 null 不落伪 patch（test/flow-parity.test.mjs ⑤ 锁定；环境项 core.bare 误写 true 已还原）+ P3 双清偿（对账输入改冻结面 ownFiles 口径 + 三键恒在场空数组兜底）；scope-audit 回归 41/41
