# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。
> （2026-09-19-ceremony-pricing-five-cuts 回填注记：骨架生成时按当时 map 匹配 0 文件——本变更
> 自身就在改 map/模块域，逐行按变更后归属人工回填。）

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/blast-surface.js | 新增（blast 声明面解析/装载唯一入口） | 已 review（QA 两轮） |
| core-engine | src/change-risk-profile.js | 接口变更（detectChangeRisk 删除；resolveChangeRisk/RISK_TO_TIER 新增） | 已 review |
| core-engine | src/ceremony-tier.js | 接口变更（blastTier 直入/applyDeclarationCatchUp/reconcileDualRun warn） | 已 review |
| core-engine | src/verify-postcheck.js | 逻辑变更（事实面零内容扫描 + warn 消费） | 已 review |
| core-engine | src/stage-contract.js / src/stage-contract-spec.js | 调用关系变更（四消费点切 resolveChangeRisk；注释同步） | 已 review |
| core-engine | src/review-tier.js | 调用关系变更（实判支声明面切换） | 已 review |
| core-engine | src/verify-probes.js 未触及（骨架误列剔除） | — | — |
| runtime | src/run/gates.js | 逻辑变更（追赶重定价接线 + readDesignOwnFiles 委托） | 已 review |
| runtime | src/run/verify-quality-scan.js | 调用关系变更（草稿否决声明面切换） | 已 review |
| docs-consistency | src/modules.js | 逻辑变更（--force 顶层段通用回插） | 已 review |
| setup | src/config-schema.js | 配置变更（ceremony.blast_surfaces 键 + 注记两处 + 模板面） | 已 review |
| stages | src/stages/verify.js | 逻辑变更（判级教学段声明面重写） | 已 review |
| core-engine / runtime / stages（测试面） | test/ 六文件 + NEW:test/blast-surface.test.mjs + NEW:test/modules-rebuild-preserve.test.mjs | 新增/翻新（六组测试） | 已 review |

## 未匹配文件

（无——全部按变更后 _module-map.yaml 归属落矩阵；src/blast-surface.js 已入 core-engine paths。）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 顶层 blast 段新增（自举声明表 30 前缀，D-010）+ src/blast-surface.js 入 core-engine paths + 头注 rebuild 语义更新（task-01 提交；骨架路径裸写 _module-map.yaml 是机械核对「列而 diff 无」根因——按真实全路径修正） | done |
| `.sillyspec/docs/sillyspec/modules/core-engine.md` | 认领五点契约变更（task-04）+ 头行日期并行会话簿记保真（apply 手工合并） | done |
