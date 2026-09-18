---
author: qinyi
created_at: 2026-09-17 22:52:35
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
requirements.md 归档后浅解析零提炼、FR 无跨 change 稳定身份、被取代需求无人标记——「现行需求」不存在可查询面。本变更为三轮评审+战略定位定稿的 **L1**：稳定 FR id + knowledge 索引 + 取代标记，定位 **L3 的证据发生器**——跑 20-30 个 change 后用遥测数据裁决活规格真源，把 L3 从产品辩论变工程题（含证伪出口：实验失败可杀/冻 L3，索引降级检索面）。

## 关键问题
1. FR-NN 是 change 局部编号——索引/取代/召回无处着力。
2. 无取代标记的索引必腐烂成坟场（评审双护栏：无 id 的索引无法取代、无取代的索引是坟场）。
3. 写作期看不见现行 FR——重复 FR 只能靠人眼，实验无数据。

## 变更范围
1. 新模块 `src/fr-index.js`：parseChangeRequirements / indexRequirements（发号+承接翻链+幂等）/ readActiveFrDigest / frTitleOverlap（bigram）。
2. decision-distill 四底座函数参数化复用（decisions 侧零回归钉死）。
3. archive noAI 步挂 indexRequirements；brainstorm step8 模板（stages/brainstorm.js）插 {FR_INDEX_DIGEST} + 承接行指引；step8 --done advisory 重复检测。
4. 四类遥测事件（fr-inject/fr-supersede/fr-duplicate-warning/fr-unreferenced）走 knowledge-hits 透传。
5. doctor D14 第四检查（epoch=2026-09-18 分界，机制复用零新账本）+ 删除缺口探针（advisory，显式不算 L3 门禁）。

## 不在范围内（显式清单）
- 未声明删除的门禁检测（L3 领地；探针仅 advisory 采集信号）
- 模块卡挂 FR 指针（L2 领地，暂不挂卡显式声明）
- 活规格树/合并引擎/scenario 丢失检测（L3 领地）
- 重复 FR 硬拦（只 advisory+计数）
- 存量 93 份归档回填（epoch 分界，不伪造历史）
- knowledge-stats 聚合接入（后续变更）
- quick/scale:small 变更产索引（覆盖面边界：无 requirements 无索引义务）

## 成功标准（可验证）
- 归档变更的每条入选 FR 获全局稳定 id，同变更重跑零新增零漂移（幂等）。
- 承接引用→旧条目 superseded+链完整；坏 id warn 不阻断。
- step8 注入触达域 active 清单（superseded 藏），四类遥测事件各至少一条实测落盘且读回字段完整。
- D14 第四检查：epoch 前归档零检查；epoch 后缺索引/取代未标→warning offender（豁免走既有账本）。
- 本变更自身归档即首个 epoch 样本——自举验证（R-05）。
