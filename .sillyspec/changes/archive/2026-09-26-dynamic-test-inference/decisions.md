---
author: flow-machine-draft
created_at: 2026-09-26T17:03:54.567Z
---
# 决策记录（Decisions）— 2026-09-26-dynamic-test-inference

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：动态子集的覆盖面判断错误→漏测放行（门禁漏跑=静默通过）。缓解：三源并集宁可多跑（import 闭包+FR 回归都是加法面）、deps 批超帽照旧（30/组保底 5）、全量语义留 test_strategy: full+CI 兜底；existing 测试大量断言 commands.test 执行——显式 full 逃生阀保住该路径语义，fixture 迁移成本可控。次风险：结构推断 runner 猜错（如 monorepo 双 package manager）——推断按「最近清单祖先」就近原则，猜不出降档 skipped 带指引不硬跑。放弃的方案：① 纯静态修补（继续 local.yaml 加 per-module 键）——治标，并行互改问题原样；② bindings 单源（只跑 FR 绑定测试）——冷启动仓索引空会饿死，且 bindings 是「上次跑过」非「必须跑」的形式化证明；③ agent 每变更自带测试命令参数——把配置问题转移成提示词纪律，无机器校验面。
