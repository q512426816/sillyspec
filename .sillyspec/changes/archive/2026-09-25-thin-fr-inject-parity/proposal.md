---
author: flow-machine-draft
created_at: 2026-09-25T09:43:19.035Z
---
# 提案书（Proposal）— 2026-09-25-thin-fr-inject-parity

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:eb19071d9817c1e60669b626f3dae9d7074ea24badf1a8d3a43c8ae6a63b132c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
任务原话转写：动机：轻量变更为默认快道但知识读取注入面缺失——{FR_INDEX_DIGEST}/{DECISION_HITS} 只在 brainstorm 装配（prompt.js stageName 条件），轻量道 fresh 不经 brainstorm，knowledge/fr 现行 FR 与 decisions 否决条目对 agent 不可见，已知坑无 execute 式知识命中报告；quick 退役后 fr-rot-suspect 检测（quick-done 侧独有）悬空；轻量 FR distill 直写索引无重复嫌疑对账（brainstorm --done 软门不在 flow 道复用）。实证：FR-runtime-020 与实现相反长期无人发现。
成功标准：
- flow start 简报（fresh/resume/adopt 三路径）追加知识注入段：触达域 active FR digest（域路由 fresh 用 --input 路径提取+模块前缀匹配，resume/adopt 用基线 diff/design 工件，退化空态给一行提示）+ 否决决策命中（knowledge-match 复用）+ 知识命中摘要；材料清单稳定前缀不被动态内容污染
- flow done 收口加 fr-rot-suspect 等价检测：按本变更归属文件面→模块域→active FR 打待复核标记+遥测（迁 quick-done 逻辑，advisory 不阻断）
- flow done distill 前加 FR 重复嫌疑软门：新 FR × 同域 active 条目标题重叠检测（复用 brainstorm --done 判据），advisory warning+遥测不阻断
- 新逻辑测试覆盖三面（注入段路由退化/rot 打标/重复告警）且既有套件全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:6d6e4e4dd2749441fe9c4ea1fa7f38be005cba4996aebc899eb895823536bd34:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. flow start 简报（fresh/resume/adopt 三路径）追加知识注入段：触达域 active FR digest（域路由 fresh 用 --input 路径提取+模块前缀匹配，resume/adopt 用基线 diff/design 工件，退化空态给一行提示）+ 否决决策命中（knowledge-match 复用）+ 知识命中摘要
2. 材料清单稳定前缀不被动态内容污染
3. flow done 收口加 fr-rot-suspect 等价检测：按本变更归属文件面→模块域→active FR 打待复核标记+遥测（迁 quick-done 逻辑，advisory 不阻断）
4. flow done distill 前加 FR 重复嫌疑软门：新 FR × 同域 active 条目标题重叠检测（复用 brainstorm --done 判据），advisory warning+遥测不阻断
5. 新逻辑测试覆盖三面（注入段路由退化/rot 打标/重复告警）且既有套件全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:2104103a07f0333c6fcb3945f369dc1c6f17e984ae18bdaa0e5a061d786d4b82:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-inject-parity 留痕重锚 -->
1. flow start 简报（fresh/resume/adopt 三路径）追加知识注入段：触达域 active FR digest（域路由 fresh 用 --input 路径提取+模块前缀匹配，resume/adopt 用基线 diff/design 工件，退化空态给一行提示）+ 否决决策命中（knowledge-match 复用）+ 知识命中摘要
2. 材料清单稳定前缀不被动态内容污染
3. flow done 收口加 fr-rot-suspect 等价检测：按本变更归属文件面→模块域→active FR 打待复核标记+遥测（迁 quick-done 逻辑，advisory 不阻断）
4. flow done distill 前加 FR 重复嫌疑软门：新 FR × 同域 active 条目标题重叠检测（复用 brainstorm --done 判据），advisory warning+遥测不阻断
5. 新逻辑测试覆盖三面（注入段路由退化/rot 打标/重复告警）且既有套件全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
