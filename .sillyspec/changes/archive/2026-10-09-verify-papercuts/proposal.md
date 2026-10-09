---
author: flow-machine-draft
created_at: 2026-10-09T14:08:47.326Z
---
# 提案书（Proposal）— 2026-10-09-verify-papercuts

## 动机

任务原话转写：2026-10-09-verify-reuse-friction 全流程实证暴露的四个 CLI 小刺（摩擦源为本人会话实测）：
①任务卡 verify/implementation 命令提取器吞全角标点——『npm run test；模块卡』的全角分号被拼进 script 名，plan postcheck 误报命令不存在，多跑 3 轮；
②verify-probes --init --force 无差别重置 verify-result.md——已填的探针矩阵判定/决策矩阵/移交项全部被 wipe，整套重填（本次最大单点浪费）；
③主代理直改形态（无 worktree/分支锚）对账盲区——交付已 commit 后 actual 只剩工作区脏面单源，②类全量假红，需手工喂 apply-pathspec 才能过（撞 3 轮才定位到 B3 机制）；
④archive 收尾的机械 git add 夹带——目录级暂存把他变更遗留的嵌套 .sillyspec/ 运行时异物（db/日志）一并提交（违反仓规第 11 条自己的规则）。

成功标准：
- 全角标点（；。：，）不再进命令名：『npm run test；xxx』提取为 script=test 且校验通过（回归测试钉住）
- --init --force 刷新机器段时保留已填人工面：结论槽/移交项表/探针矩阵已填判定行/决策矩阵已填格不被 wipe（回归测试钉住）
- 无分支锚形态下，含变更名的近期提交窗口自动作为 declared-rescue 源：已 commit 的声明文件不再假红 ②类，undeclared 侧不受影响（不放大 scope creep 盲区）（回归测试钉住）
- archive 暂存面只含本变更归档产物与固定路径，嵌套 .sillyspec/ 运行时异物不进暂存；已提交的历史异物清理出库（回归测试钉住）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 全角标点（；。：，）不再进命令名：『npm run test；xxx』提取为 script=test 且校验通过（回归测试钉住）
2. --init --force 刷新机器段时保留已填人工面：结论槽/移交项表/探针矩阵已填判定行/决策矩阵已填格不被 wipe（回归测试钉住）
3. 无分支锚形态下，含变更名的近期提交窗口自动作为 declared-rescue 源：已 commit 的声明文件不再假红 ②类，undeclared 侧不受影响（不放大 scope creep 盲区）（回归测试钉住）
4. archive 暂存面只含本变更归档产物与固定路径，嵌套 .sillyspec/ 运行时异物不进暂存；已提交的历史异物清理出库（回归测试钉住）

## 成功标准（可验证）

1. 全角标点（；。：，）不再进命令名：『npm run test；xxx』提取为 script=test 且校验通过（回归测试钉住）
2. --init --force 刷新机器段时保留已填人工面：结论槽/移交项表/探针矩阵已填判定行/决策矩阵已填格不被 wipe（回归测试钉住）
3. 无分支锚形态下，含变更名的近期提交窗口自动作为 declared-rescue 源：已 commit 的声明文件不再假红 ②类，undeclared 侧不受影响（不放大 scope creep 盲区）（回归测试钉住）
4. archive 暂存面只含本变更归档产物与固定路径，嵌套 .sillyspec/ 运行时异物不进暂存；已提交的历史异物清理出库（回归测试钉住）
