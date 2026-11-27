---
author: qinyi
created_at: 2026-11-27 23:40:57
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
变更文档目录（`.sillyspec/changes/`）默认随 git 入库，dogfood 仓已积累 13227 个入库文件（archive 占 99.8%、125MB），每次 clone 全量拖载、git status 长期有变更目录噪音；而平台用户侧已有权威的 spec 文件同步管道（manifest 增量推送 + 乐观锁），git 副本属双重存储。用户决策：变更文档**默认不放 git**——平台用户由平台管、单机用户自担、想跟踪的用户显式开启。

## 关键问题
1. **默认行为与用户意图错配**：CLI 假定所有仓都想把变更文档入 git，平台用户被迫维护「文档随变更提交」的额外纪律，单机用户没有选择。
2. **收口提示在「不入库」仓里是常驻噪音**：flow done 终态「🚨 归档提交未落库 + commit 命令」（src/run/complete-handlers.js:892 renderArchiveLandingEpilogue）对选择不入库的仓每轮必现且具误导性。
3. **归档链与 ignore 的冲突**：归档链对 changes/ 面的 git add（complete-handlers.js:648/:704）在 ignore 行在位时被 git 拒绝告警；knowledge/docs 面 add 照常入暂存区但失去出口——需要枚举分支把暂存行为与声明对齐。

## 变更范围
sillyspec 仓内：local.yaml 新增 `changes.doc_tracking` 枚举（platform 缺省 | never | repo，D-004@v2）；收口 epilogue 两段式分支与归档链 changes/ 面暂存短路（knowledge/docs 面解耦保留）；init 条件写 .gitignore + example 注释；doctor 存量迁移 INFO；本仓自身切换新默认（存量保留、新增不入库，D-002@v1）；文档族（CLAUDE.md/AGENTS.md/skills/file-lifecycle）措辞同步；测试面六块。

## 不在范围内（显式清单）
- 平台侧任何代码改动（spec-pull 一键化、同步失败显性化、内容版本历史）——另立变更（D-001@v1）
- 不迁移存量入库文件、不改归档/收口状态机与子步流程结构（仅暂存动作按枚举短路）
- 不做平台策略字段与本地枚举的运行时联动/映射层

## 成功标准（可验证）
- `changes.doc_tracking` 缺省/解析失败回退 platform 且留痕；非法值被 config validate 拦截
- doc_tracking=platform/never 时：新变更 flow done 收口输出单行形态说明+回退指引，归档链不触 changes/ 面 git add（无 ⚠️ 补暂存失败告警），knowledge/docs 面暂存保留且有落库指引出口
- doc_tracking=repo 时：收口 epilogue 与归档链行为与改动前逐字一致
- init 建仓（生效值≠repo）幂等写入 `.sillyspec/changes/` 忽略行；repo 值不写
- doctor 对「存量+未显式声明」仓输出迁移 INFO；残留检测 changes/ 面语义不变
- 本仓切换后：git status 对新变更目录无未跟踪条目，存量 13227 文件跟踪不变
