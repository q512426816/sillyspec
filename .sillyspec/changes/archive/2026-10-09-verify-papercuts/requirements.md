---
author: zcode-verify-friction
created_at: 2026-10-09T20:55:00+08:00
---
# 需求规格（Requirements）— 2026-10-09-verify-papercuts

## 功能需求

### FR-01: 命令提取器标点截断

- validateScriptCommands 提取的 script 名必须只含 [A-Za-z0-9:_.\-]——全角标点（；。，：）与 ASCII 分隔符（&& / , / |）禁止拼入 script 名；被截断后的 script 名仍必须按 package.json 真实存在性校验（不因截断而豁免）。

#### 场景：全角句读

- Given task 卡 verify 字段「npm run test；模块卡 diff 一致」且 package.json 有 test script；When plan postcheck 校验；Then 提取 script=test 校验通过，不误报命令不存在。

### FR-02: --force 保人工面

- verify-probes --init --force 重生成骨架时必须按段携载已填人工面：纯人工段（结论/移交项/证据账/集成回执/任务完成度/设计一致性/独立复核/变更风险等级）已填（无 <待填/<TODO 占位）则原样保留；矩阵段（决策追踪/接口验证覆盖）与探针段的已填表格行必须按首列键携载；未填段/占位段必须换新骨架；旧文独有自定义段禁止销毁。

#### 场景：force 后重填归零

- Given verify-result.md 已填结论 PASS WITH NOTES + 移交项行 + 探针 7 covered 行；When --init --force；When 直读新文；Then 上述已填内容在场，新增矩阵行从骨架进场。

### FR-03: 消息锚定救援窗口

- 无分支/审计 tag 锚的主代理直改形态下，对账 actual 采集必须补充「提交信息锚定窗口」：近 30 提交中消息含变更名的提交，其触及面进入 declared-rescue 窗口；窗口文件禁止进入全局 union（undeclared 面不受影响）；真未交付的声明文件必须仍如实报 ②类。

#### 场景：直改已 commit 不假红

- Given task 卡声明 src/delivered.js 且该文件已随含变更名消息提交到主干、工作区干净、无 sillyspec/<变更> 分支；When reconcileTargetFiles；Then 该文件不落 ②类 missing，sources 含 log-msg-window；声明 src/never-delivered.js（从未交付）仍落 ②类。

### FR-04: 归档暂存排除嵌套异物

- stageArchiveArtifacts 的 git add 必须排除归档目录内嵌套的 .sillyspec/ 子树（pathspec exclude）；嵌套异物在场时必须点名提示处置；正常归档产物必须不受排除影响照常进暂存。

#### 场景：夹带拦截

- Given 归档目录含 verify-result.md 与嵌套 .sillyspec/.runtime/sillyspec.db；When archive 收尾暂存；Then md 进暂存、db/日志不进。

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`）

FR-01: test/verify-papercuts-batch.test.mjs「① 全角标点不拼入 script 名」
FR-02: test/verify-papercuts-batch.test.mjs「② --force 保人工面」
FR-03: test/verify-papercuts-batch.test.mjs「③ 无分支锚形态：消息锚定窗口救赎」
FR-04: test/verify-papercuts-batch.test.mjs「④ 归档暂存排除嵌套 .sillyspec 异物」
