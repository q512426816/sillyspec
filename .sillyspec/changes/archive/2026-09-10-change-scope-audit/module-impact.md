# 模块影响分析（Module Impact）— 变更范围对账（scope-audit 三态表+独立命令+阶段注入）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/scope-audit.js | 新增 | 否 |
| core-engine | src/verify-postcheck.js | 接口变更（resolveReconcileActualFiles 补 export + 返回结构新增 baseAnchor，纯增量） | 否 |
| cli-entry | src/index.js | 新增（scope-audit 命令 case + usage 行；高风险入口文件已声明） | 否 |
| runtime | src/run/complete.js | 逻辑变更（execute/verify 完成输出区 advisory 注入 + 快照，双路径） | 否 |
| runtime | src/run/complete-handlers.js | 逻辑变更（quick 收尾文件行/审计行上行数） | 否 |
| runtime | src/run/prompt.js | 逻辑变更（{SCOPE_AUDIT_TABLE} 注入 fail-soft） | 否 |
| stages | src/stages/archive.js | 配置变更（确认归档步 prompt 增占位符，不改判定） | 否 |
| cli-entry | docs/sillyspec/platform-interface-map.md | 配置变更（6 处 index.js 行号锚点机械平移，无内容改动） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `test/scope-audit.test.mjs`（NEW）——测试文件按仓约定不入模块 paths（check-syntax 的 module-map 覆盖检查只核 src/，实测全绿），游离为设计内状态

### 并行会话在途文件（不属本变更影响面，不认领）

三重核对「diff 有而 module-impact 未列」中以下文件为并行会话在主仓的未提交 WIP（baseline checkpoint 372b24c 已注记排除）或临时产物，归属其自身变更流程的 module-impact，本变更不列入影响矩阵：CLAUDE.md、docs/sillyspec/doc-consistency-debt.md、src/change-list.js、src/stages/brainstorm.js、src/stages/execute.js、src/stages/plan.js、test/change-list-operation.test.mjs、bash.exe.stackdump、.tmp-p2-regression.mjs（他者 P2 spike 临时脚本，作者自注运行后即删）。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | core-engine paths 补录 src/scope-audit.js（紧随同族纯函数 change-risk-profile.js；verify 期 lint 门禁驱动，check-syntax 复跑 module-map 覆盖全） | done |
| `.sillyspec/docs/sillyspec/modules/core-engine.md` | 对外接口表新增「src/scope-audit.js — 变更范围对账纯函数」节（三导出签名+消费契约 D-003），verify 期已同步 | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
