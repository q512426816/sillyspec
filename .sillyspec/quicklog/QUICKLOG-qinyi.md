
### [2026-05-13] 修复 ProjectOverview.vue resetLayout 重复声明
- author: qinyi
- created_at: 2026-05-13T09:59:00Z
**问题**：Vue 编译错误 "Identifier 'resetLayout' has already been declared"
**原因**：第 40 行从 useLayout 解构 resetLayout，第 51 行又定义同名函数
**修复**：删除解构声明，保留本地函数（含确认对话框）
**文件**：packages/dashboard/src/components/ProjectOverview.vue


### [2026-05-13] 修复 dashboard 项目扫描数据格式不一致
- author: qinyi
- created_at: 2026-05-13T10:15:00Z
**问题**：dashboard 显示"0 个项目"
**原因**：watcher.js 发送的项目数据缺少 overview 字段，与 server/index.js 的 projects:init 格式不一致
**修复**：watcher.js 添加 parseProjectOverview 导入和调用，所有发送的数据现在包含 state 和 overview
**文件**：packages/dashboard/server/watcher.js

## ql-20260604-001-7a4c | 2026-06-04 16:47:41 | 对齐文件生命周期文档与工具实现
状态：已完成
文件：src/stages/brainstorm.js, src/stages/propose.js, src/stages/scan.js, src/run.js, src/progress.js, src/hooks/worktree-guard.js, test/*.mjs, docs/sillyspec/file-lifecycle*.md, .sillyspec/docs/sillyspec/modules/{stages,runtime}.md
结果：修复阶段步骤丢失、local.yaml 口径、archive confirm、sync/approval 参数接线和 worktree guard 登记校验；更新生命周期文档与剩余差异清单；新增回归测试并通过 lint/test。

## ql-20260617-002-b8d2 | 2026-06-17 11:28:01 | 默认执行 Design Grill 并引入决策版本
状态：已完成
文件：src/stages/brainstorm.js, src/stages/plan.js, src/stages/verify.js, src/stage-contract.js, test/stage-contract.test.mjs, test/stage-definitions.test.mjs
结果：Design Grill 改为设计后的默认交叉审查步骤，支持显式跳过与小型单模块豁免；decisions.md 引入 D-xxx@vN 版本链和 supersedes 机制；plan/verify/stage-contract 按当前决策版本追踪覆盖，并阻断 P0/P1 未决项；npm run lint 与 npm test 通过。

## ql-20260617-003-c3d9 | 2026-06-17 13:32:42 | 收紧 Grill 流程语义与决策 ID 解析
状态：已完成
文件：src/stages/brainstorm.js, src/stage-contract.js, test/stage-contract.test.mjs, test/stage-definitions.test.mjs, .sillyspec/docs/sillyspec/modules/stages.md
结果：合并 Grill 触发判断和深度追问为可选的需求澄清 Grill，保留 Design Grill 作为设计后默认交叉审查；决策 ID 抽取改为结构化行解析；decision record 支持 heading 与 list/YAML 风格；新增误提取和 YAML 决策阻断回归测试；npm run lint 与 npm test 通过。

## ql-20260617-004-a91f | 2026-06-17 13:52:11 | 收紧缺省 priority 的未决决策阻断
状态：已完成
文件：src/stage-contract.js, test/stage-contract.test.mjs, .sillyspec/docs/sillyspec/modules/stages.md
结果：缺 priority 的 unresolved/blocking/blocker decision 默认按 P1 处理并阻断；错误信息标注 priority=missing->P1；新增 YAML accepted decision 追踪、缺 priority 阻断、brainstorm 普通正文 D-ID 过滤回归测试；npm run lint 与 npm test 通过。

## ql-20260617-001-9c4a | 2026-06-17 11:16:23 | 接入 Grill 深度追问与决策追踪链路
状态：已完成
文件：src/stages/brainstorm.js, src/stages/plan.js, src/stages/verify.js, src/stage-contract.js, test/stage-contract.test.mjs, test/stage-definitions.test.mjs
结果：新增 Grill 触发判断和深度追问步骤；规范链路支持 decisions.md/D-xxx；plan/task/verify 引入 FR/D 覆盖追踪；stage-contract 在 decisions.md 存在时校验 D/FR ID 传播；npm run lint 与 npm test 通过。
## ql-20260604-001-7a4c | 2026-06-04 16:47:41 | 对齐文件生命周期文档与工具实现
状态：已完成
文件：src/stages/brainstorm.js, src/stages/propose.js, src/stages/scan.js, src/run.js, src/progress.js, src/hooks/worktree-guard.js, test/*.mjs, docs/sillyspec/file-lifecycle*.md, .sillyspec/docs/sillyspec/modules/{stages,runtime}.md
结果：修复阶段步骤丢失、local.yaml 口径、archive confirm、sync/approval 参数接线和 worktree guard 登记校验；更新生命周期文档与剩余差异清单；新增回归测试并通过 lint/test。
