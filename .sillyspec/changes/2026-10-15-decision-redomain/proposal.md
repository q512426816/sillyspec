---
author: flow-machine-draft
created_at: 2026-10-15T08:23:22.119Z
---
# 提案书（Proposal）— 2026-10-15-decision-redomain

## 动机

任务原话转写：用户指令：平台仓存量决策迁真域。背景：模块路径 glob 匹配失效（2026-10-15-module-path-glob-match 已修复止增量）导致平台仓 decisions/unmapped.md 积 442 条历史决策。redomain.js 只管 fr/ 面，决策面缺机器通道——本变更新增 decision-redomain.js 孪生实现（复用 decision-distill 参数化底座 splitKnowledgeSections/joinKnowledgeFile/syncIndexRoutingLines）：--decisions flag 切 decisions 面（--from/--to/--anchor/--by-change/--write 同族）；段字节整体搬运（id/机器行零改写）；冲突双键（id+变更——跨变更同号合法共存，完全重复批内跳过报告）；空壳删除+INDEX 路由同步（失效行自动删）。消费侧：平台仓 442 条存量迁移（另一变更）已全量执行，迁出 436 条、残留 0（含 3 重复段/1 粘连残迹的数据修复）。

成功标准：
- plan/apply 双态：段字节保真（标题/字段行/原编号/最近确认随段）、id 不变、路由行补
- 冲突双键：跨变更同号共存不误判、同 id 同变更批内/目标域冲突跳过不覆盖
- 幂等：重跑零命中拒（源空壳删除后源不存在）；空壳删除与 INDEX 失效行清理
- 平台仓真实库全量迁移实测：436 条迁出+validate ok+digest 伪域 0 留档

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. plan/apply 双态：段字节保真（标题/字段行/原编号/最近确认随段）、id 不变、路由行补
2. 冲突双键：跨变更同号共存不误判、同 id 同变更批内/目标域冲突跳过不覆盖
3. 幂等：重跑零命中拒（源空壳删除后源不存在）；空壳删除与 INDEX 失效行清理
4. 平台仓真实库全量迁移实测：436 条迁出+validate ok+digest 伪域 0 留档

## 成功标准（可验证）

1. plan/apply 双态：段字节保真（标题/字段行/原编号/最近确认随段）、id 不变、路由行补
2. 冲突双键：跨变更同号共存不误判、同 id 同变更批内/目标域冲突跳过不覆盖
3. 幂等：重跑零命中拒（源空壳删除后源不存在）；空壳删除与 INDEX 失效行清理
4. 平台仓真实库全量迁移实测：436 条迁出+validate ok+digest 伪域 0 留档
