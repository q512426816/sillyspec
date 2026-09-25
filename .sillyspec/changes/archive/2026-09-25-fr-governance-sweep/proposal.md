---
author: flow-machine-draft
created_at: 2026-09-25T12:27:31.614Z
---
# 提案书（Proposal）— 2026-09-25-fr-governance-sweep

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:b3335a503bb97bb39a64438a2b8ce7948673ed963e05692ce529f4258ceaa4e4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
任务原话转写：动机：两项知识/防线治理清偿。①知识漂移：FR-runtime-020（flow.mode 缺省翻回 legacy，依据 D-010@v2）仍 active 且与现实现（缺省 thin，2026-09-25-thin-default-flip）相反——该变更归档时漏承接，现在知识注入面会把它反向喂给 runtime/cli-entry 域变更；②评审留档四个开放 P3：patch 采集失败被 review 误标「无交付 diff」豁免证据（flow-review.js else 分支不区分 null 两种来源——防线虚焊）、--review/--no-review 对在途变更 resume 静默失效（不落 review_force）、flow status 归档检测 includes 子串误报（flow-check 命中 flow-checkpoints）、flow-review.js 头注释「承诺词一票升级」与 --no-review 先判实现矛盾。合并一条：纯治理变更交付面为空会落伪域，并入四个 P3 小修提供真实 src 交付面。
成功标准：
- requirements 新 FR 声明 flow.mode 缺省 thin 现状并带承接行（承接: FR-runtime-020）——flow done distill 翻旧条目 superseded（superseded_by+取代链+D-010@v2 依据链留痕）
- flow-review.js 定档：patchText null（采集失败）不再进豁免证据，改判需评审；空 patch（真无 diff）豁免照旧——两种 null 来源分径
- flow start resume 分支落盘 review_force（--review/--no-review 对在途变更生效，与新变更/adopt 两路口径一致）
- flow status 归档检测改精确匹配（目录名恒等 change 名），flow-check 不再误命中 flow-checkpoints
- flow-review.js 头注释与实现一致（承诺词一票升级，--no-review 显式豁免除外）
- 测试：null/空分径用例+resume review_force e2e+status 精确匹配用例，flow 族套件全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:bf3aa2666a33a919534f08d9524415eb6fc002b35bf55189527f4ef910d9de35:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. requirements 新 FR 声明 flow.mode 缺省 thin 现状并带承接行（承接: FR-runtime-020）——flow done distill 翻旧条目 superseded（superseded_by+取代链+D-010@v2 依据链留痕）
2. flow-review.js 定档：patchText null（采集失败）不再进豁免证据，改判需评审
3. 空 patch（真无 diff）豁免照旧——两种 null 来源分径
4. flow start resume 分支落盘 review_force（--review/--no-review 对在途变更生效，与新变更/adopt 两路口径一致）
5. flow status 归档检测改精确匹配（目录名恒等 change 名），flow-check 不再误命中 flow-checkpoints
6. flow-review.js 头注释与实现一致（承诺词一票升级，--no-review 显式豁免除外）
7. 测试：null
8. 空分径用例+resume review_force e2e+status 精确匹配用例，flow 族套件全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:8b841e8fe971bd72298e58abf44cfe53e73a61b892738aea6518b3915c626436:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
1. requirements 新 FR 声明 flow.mode 缺省 thin 现状并带承接行（承接: FR-runtime-020）——flow done distill 翻旧条目 superseded（superseded_by+取代链+D-010@v2 依据链留痕）
2. flow-review.js 定档：patchText null（采集失败）不再进豁免证据，改判需评审
3. 空 patch（真无 diff）豁免照旧——两种 null 来源分径
4. flow start resume 分支落盘 review_force（--review/--no-review 对在途变更生效，与新变更/adopt 两路口径一致）
5. flow status 归档检测改精确匹配（目录名恒等 change 名），flow-check 不再误命中 flow-checkpoints
6. flow-review.js 头注释与实现一致（承诺词一票升级，--no-review 显式豁免除外）
7. 测试：null
8. 空分径用例+resume review_force e2e+status 精确匹配用例，flow 族套件全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
