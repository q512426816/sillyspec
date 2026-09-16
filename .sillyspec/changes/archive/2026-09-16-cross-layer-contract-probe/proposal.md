---
author: qinyi
created_at: 2026-09-16 12:23:00
---
# 提案书（Proposal）

## 动机
2026-09-15 wp EHS 三仓会话实证：verify 判 PASS WITH NOTES 后人工深挖出 5 个 P1，其中 4 个是纯机器可查的跨层字段对齐问题（前端载荷字段名错位 / 必填字段漏发）——design.md 契约写对了、实现侧偏了，而探针 1-7 无任何一档覆盖「实现载荷 ↔ design 契约」对齐面。本变更在 verify 探针族补这一档（探针8 跨层契约一致性，advisory 口径）。

## 关键问题
1. 前端提交载荷键 ∉ design 契约字段（字段错位，EHS `leaderUserId` vs `rpLeaderUserId` 类，3 处 P1 之源）
2. design 契约必填字段在前端载荷零出现（漏发，EHS 小程序 `reportOrgId` 类，开立必拒）
3. 两类信号目前完全依赖人工复核才能发现——verify 门禁对此盲

## 变更范围
- src/verify-probes.js：探针8 实现（4 个导出函数）+ verify-result 骨架预填段
- src/run/gates.js：探针一致性抽查纳入 probe8 维度（WARNING 级）
- test/cross-layer-contract-probe.test.mjs：EHS 案例缩小版 fixture 五用例

## 不在范围内（显式清单）
- 不做硬门（advisory 起步，升门是后续独立决策）
- 不做类型形状比对（Map vs Array，留待实证）
- 不做前后端直接互比（design 契约是唯一枢纽，D-001）
- 不覆盖 js/ts/jsx/vue + java 之外的语言对
- 不改探针 1-7 语义

## 成功标准（可验证）
- EHS 三类案例缩小版 fixture 全部命中：字段错位 1 条 WARNING（含 file:line）、必填漏发 1 条 WARNING、对齐场景零告警
- 动态键（非字面量计算键）不炸不报；纯后端/纯文档变更 status=skipped + 注记
- verify-result.md 骨架含「探针8」预填段；gate 一致性抽查 probe8 走 WARNING 级
- npm test 全量 0 失败 + lint 过
