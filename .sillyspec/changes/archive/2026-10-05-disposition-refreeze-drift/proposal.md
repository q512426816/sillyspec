---
author: flow-machine-draft
created_at: 2026-10-05T13:13:05.580Z
---
# 提案书（Proposal）— 2026-10-05-disposition-refreeze-drift

## 动机

任务原话转写：处置重入审计错位（P1，2026-10-05-review-promise-negation 先例 905397ef + 2026-10-05-flowdone-lintfail-output 收编活体复现）：评审发现处置若涉及代码修改，重跑 flow done 后 patch 子步幂等跳过，change.patch 与 review.json 停在处置前时点——归档审计件缺处置面（实证：冻结 patch 检 RISK_ADMITTING_RE 零命中，处置 hunks 全缺）。修法：patch 子步跳过前检测漂移——change-patch.json.head（冻结锚）..HEAD 窗口内存在本变更名后缀交付提交即漂移；漂移时自动重冻结（等价 --refreeze）并隔离旧 review.json（评审结论对着旧冻结面不作数，强制重评）。
成功标准：
- 冻结后窗口内出现本变更名后缀交付提交时，重跑 flow done 检出漂移：输出审计时点漂移警告并自动重冻结（change.patch 含处置提交面，无需手动 --refreeze）
- review 已有结论（review.json 在场）时漂移触发隔离：旧件改名 review.json.superseded 留档，review 子步标记重置，本次重新定档/重评
- 窗口内仅他侧提交或无新提交时不触发（幂等跳过行为不变；归属判定按提交 message 变更名后缀）
- 单测覆盖归属判定三形态（本变更后缀触发/他侧后缀不触发/裸提交不触发）+ e2e 锁定处置重入链路（漂移警告+重冻结+隔离+重评任务书再现）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 冻结后窗口内出现本变更名后缀交付提交时，重跑 flow done 检出漂移：输出审计时点漂移警告并自动重冻结（change.patch 含处置提交面，无需手动 --refreeze）
2. review 已有结论（review.json 在场）时漂移触发隔离：旧件改名 review.json.superseded 留档，review 子步标记重置，本次重新定档/重评
3. 窗口内仅他侧提交或无新提交时不触发（幂等跳过行为不变；归属判定按提交 message 变更名后缀）
4. 单测覆盖归属判定三形态（本变更后缀触发/他侧后缀不触发/裸提交不触发）+ e2e 锁定处置重入链路（漂移警告+重冻结+隔离+重评任务书再现）

## 成功标准（可验证）

1. 冻结后窗口内出现本变更名后缀交付提交时，重跑 flow done 检出漂移：输出审计时点漂移警告并自动重冻结（change.patch 含处置提交面，无需手动 --refreeze）
2. review 已有结论（review.json 在场）时漂移触发隔离：旧件改名 review.json.superseded 留档，review 子步标记重置，本次重新定档/重评
3. 窗口内仅他侧提交或无新提交时不触发（幂等跳过行为不变；归属判定按提交 message 变更名后缀）
4. 单测覆盖归属判定三形态（本变更后缀触发/他侧后缀不触发/裸提交不触发）+ e2e 锁定处置重入链路（漂移警告+重冻结+隔离+重评任务书再现）
