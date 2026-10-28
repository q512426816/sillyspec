---
author: flow-machine-draft
created_at: 2026-10-28T00:26:52.805Z
---
# 提案书（Proposal）— 2026-10-26-target-files-main-docs-rescue

## 动机

任务原话转写：target-files 主仓治理文档救赎（假红根治）；动机：倒推收编 2026-10-27 中断会话留在工作区的在途三件（src/verify-postcheck.js + test/target-files-main-docs-rescue.test.mjs + package.json test:core 登记）。坑实证（2026-10-26-session-stage-progress verify 门）：模块卡等治理文档按 CLI 铁律一律写主仓（绝不写 worktree 副本），而 worktree 形态 actual=worktree diff+porcelain 结构性看不见主仓侧改动——声明主仓治理路径恒落 missing 假红，「写 worktree=产物蒸发，写主仓=对账 missing」两规则打架，此前只能 target_files:[] 绕行。改法：reconcileTargetFiles 在 worktree 形态增救赎臂——主仓 .sillyspec/ 的 status（未提交）∪ baseline..HEAD diff（已提交）构成主仓治理面，仅救赎「声明而 missing」的主仓治理路径（不扩 undeclared 面，与近窗救赎同语义；-uall 展开未跟踪目录折叠；fail-open 读失败走既有判定）。配回归三臂（救赎命中/已提交臂/无改动不虚造 matched）。

成功标准：
- worktree 形态声明主仓治理文档经主仓实际改动面救赎命中，missing 清零且 undeclared 不扩（新测试①②绿）
- 主仓无改动时不虚造 matched（missing 如实在场，新测试③绿）
- 受影响面 verify-postcheck 关联套件 25/25 绿 + lint 1087 文件绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. worktree 形态声明主仓治理文档经主仓实际改动面救赎命中，missing 清零且 undeclared 不扩（新测试①②绿）
2. 主仓无改动时不虚造 matched（missing 如实在场，新测试③绿）
3. 受影响面 verify-postcheck 关联套件 25/25 绿 + lint 1087 文件绿

## 成功标准（可验证）

1. worktree 形态声明主仓治理文档经主仓实际改动面救赎命中，missing 清零且 undeclared 不扩（新测试①②绿）
2. 主仓无改动时不虚造 matched（missing 如实在场，新测试③绿）
3. 受影响面 verify-postcheck 关联套件 25/25 绿 + lint 1087 文件绿
