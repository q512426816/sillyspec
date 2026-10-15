---
author: flow-machine-draft
created_at: 2026-10-15T08:23:22.119Z
---
# 需求规格（Requirements）— 2026-10-15-decision-redomain

## 功能需求

### FR-01: plan/apply 双态：段字节保真（标题/字段行/原编号/最近确认随段）、id 不变、路由行补

- decision-redomain.js 必须提供 planDecisionRedomain（干跑预览：条目/id/title/目标存在性/源空壳判定）与 redomainDecisionEntries（执行：段 lines 整体搬运零改写、id=number@version 不变、目标域新建头对齐 decision-distill 形态、INDEX 路由行经 syncIndexRoutingLines 补）。

#### 场景：主路径

- Given fixture 三段落真域，When apply by-change，Then 段字节保真（标题/理由/机器行）、目标新建+路由行补、源留余条（测试①②③）。

### FR-02: 冲突双键：跨变更同号共存不误判、同 id 同变更批内/目标域冲突跳过不覆盖

- 冲突判定必须用 id+变更双键：跨变更同号（合法共存形态）必须正常迁移；同 id 同变更且目标域已有（或批内已选）必须跳过并报告 skippedConflicts，不覆盖、不丢失（留源）。

#### 场景：主路径

- When 两变更同号条目先后迁同域，Then 共存无死锁（测试④）；When 目标预置同 id 同变更段，Then 跳过+报告+留源不丢（测试⑤）。

### FR-03: 幂等：重跑零命中拒（源空壳删除后源不存在）；空壳删除与 INDEX 失效行清理

- 全迁后源文件必须删除（防空壳污染域列表）；重跑必须拒绝（源不存在）；INDEX 路由必须经 syncIndexRoutingLines 自动清理消失域的行（失效行删）与补新域行。

#### 场景：主路径

- When 全量 anchor 迁移，Then sourceDeleted=true+空壳已删+重跑拒（测试⑥⑦⑧）；INDEX 无失效行（平台实测回执）。

### FR-04: 平台仓真实库全量迁移实测：436 条迁出+validate ok+digest 伪域 0 留档

- 工具必须经平台仓真实库全量迁移实证：442 段（含数据修复：3 重复段/1 粘连残迹/1 坏段补标题）迁出 436 条、unmapped.md 空壳删除、INDEX 失效行清零、knowledge validate ok:true、digest 伪域 0。

#### 场景：主路径

- Given 平台仓真实库，When 270 批 by-change + 3 批 anchor 迁移执行，Then 迁移回执与 validate/digest 复核留档。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decision-redomain.test.mjs「①②③ apply：迁两段真域、段字节保真、路由行补、源留余条」
FR-02: test/decision-redomain.test.mjs「④⑤ 跨变更同号共存；目标同 id 同变更冲突跳过不覆盖」
FR-03: test/decision-redomain.test.mjs「⑥⑦⑧ 幂等/空壳删除/机器行保真」
FR-04: 不适用：平台仓消费端数据迁移——验收靠迁移回执（436 条/270+3 批）+ validate ok + digest 伪域 0 实测留档
