---
author: flow-machine-draft
created_at: 2026-11-02T11:41:53.573Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-redomain-map

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按 4B 审查修正版实现三件事：

**工具**：src/redomain-unmapped.js 加 --map 显式映射模式——planFromMap（映射 [{id,domain}] 精确匹配段头；未知 id 收集报错；__prune__ 归入 prunes）、pruneUnmappedEntries 新原语（split → anchor 过滤 → 精确计数断言 → 裁空删文件 + syncIndexRoutingLines / 非空回写；prune-only 也调 sync）、applyFromMap（fail-fast；apply 后重算段头守恒断言 + 幂等复跑 0 断言；supersedes 目标留源作警告）。启发式路径（无 --map）行为不变（逐组容错保留）。

**本仓执行**：一次性脚本（变更目录 gen-prune-map.mjs）重跑 4A 判定逻辑（id+change duplicate，防 id 漂移）生成 __prune__ 映射 → CLI --map --apply 落盘 → eval 确认零变化。

**平台输出**：脚本只读生成两栏建议（平票检测输出候选集）+ 孤儿字段块警告。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- cmdRedomainUnmapped：新增 --map <file> 参数（JSON [{id,domain}]，domain 可为 __prune__）；--map 下 dry-run/apply 都走映射（旁路投票）；无 --map 行为不变。
- 新增导出 planFromMap / applyFromMap / pruneUnmappedEntries（供测试与清单生成复用）。
- 本仓知识文件：decisions/unmapped.md 裁 duplicate、fr/unmapped.md 裁 duplicate（清零）；INDEX 不变（两文件不空）。
- 平台仓零写入。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。映射按 id 精确匹配、groups 稳定排序；守恒与幂等断言以 apply 时刻文件为准。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

apply 为破坏性写；单写者约定（同一时刻只一个会话跑 --map --apply）；git pathspec 提供回滚面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

fail-fast + 幂等：中断后重跑，已迁移组幂等跳过、未裁剪条目仍在；守恒断言兜底；极端半态由 git 回滚。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。--map 作用于 cwd 的 knowledge；平台清单生成只读平台路径（env 可覆盖）、零写入。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① 裁剪是破坏性写——精确计数断言 + fail-fast + 幂等 + git 回滚四层防御；② id 漂移——执行时重判定、未知 id 断言拦截；③ 平票语义错误传染平台清单——清单侧检测平票输出候选集不硬选。

**放弃的方案**：① 不裁剪只归档（搬第二个停车场）——新增维护面且 unmapped 已被检索过滤，收益为零；② 正文 hash 硬阻断——段头/原编号/最近确认天然不同会错杀（226/229 逐字节一致、2 条仅锚点拼写差异，警告披露即可）；③ 9 unique 在本仓打 provenance 标——解析契约无此字段，标记设计并入 4C；④ --map 保留逐组容错——显式契约应 fail-fast。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/redomain-unmapped.js | --map 模式 + pruneUnmappedEntries + fail-fast apply + 守恒/幂等/supersedes 断言 |
| 新增 | test/redomain-unmapped-map.test.mjs | --map/__prune__/守恒/幂等/过期 id/supersedes 测试 |
| 新增 | .sillyspec/changes/2026-11-02-knowledge-redomain-map/gen-prune-map.mjs | 执行时重判定 + 本仓映射 + 平台两栏清单（一次性） |
| 修改 | .sillyspec/knowledge/decisions/unmapped.md | 裁 duplicate |
| 修改 | .sillyspec/knowledge/fr/unmapped.md | 裁 duplicate |
| 新增 | .sillyspec/changes/2026-11-02-knowledge-redomain-map/4B-REPORT.md | 执行报告（移交指针/平台清单/警告） |
