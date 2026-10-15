---
author: flow-machine-draft
created_at: 2026-10-15T11:52:30.994Z
---
# 提案书（Proposal）— 2026-10-15-eval-planted-defect-probe

## 动机

任务原话转写：eval 种植缺陷探针任务——004-phase-stats：规格隐含但未具名输入的 A/B 判别任务，量化流程对盲区的捕获率（对照 Superpowers planted-defect probes 方法）

动机：obra/superpowers 用种植缺陷探针量化技能行为（writing-plans v6.4.2 的 9/9 实证：所有实现者都在'规格隐含但从未具名的输入'上交付同一崩溃）。现有 eval 三任务（001-003）的 instruction 把边界逐条写明（如 001 把 null/unicode/连字符全列出），测的是执行质量不是盲区捕获。刚落地的 Review Focus 机制（2026-10-15-plan-review-focus）正需要这类任务验证真实收益。004 号任务的反向设计：指令只命名日志解析格式与输出契约，五类隐含输入（行序乱序/空行/尾随空白行/未闭合 START/孤儿 END）全部由固定 fixture 承载，每类有唯一合理解；verify.mjs 期望值硬编码独立于实现。真实 token 的 A/B 实测不在本变更范围（需 claude CLI 登录态与真额度），本变更交付探针任务本体 + 零 token 管道验证 + 判别力测试。

成功标准：
- eval/tasks/004-phase-stats/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/events.log（承载五类隐含输入的固定 fixture）、verify.mjs（期望硬编码、fail 时可定位哪条隐含面挂了）、solution/bin/phase-stats.mjs（参考解过 verify）
- 判别力：naive 实现（按文件邻接配对、不跳空行）verify 必拒；参考解必过——仓库测试钉死（test/eval-planted-defect-probe.test.mjs）
- eval 管道集成：node eval/run.mjs --dry-run 含新任务零报错跑通（A 臂 solution 路径、B 臂占位路径）
- 变更自身测试面跑绿，lint 通过

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. eval/tasks/004-phase-stats/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/events.log（承载五类隐含输入的固定 fixture）、verify.mjs（期望硬编码、fail 时可定位哪条隐含面挂了）、solution/bin/phase-stats.mjs（参考解过 verify）
2. 判别力：naive 实现（按文件邻接配对、不跳空行）verify 必拒；参考解必过——仓库测试钉死（test/eval-planted-defect-probe.test.mjs）
3. eval 管道集成：node eval/run.mjs --dry-run 含新任务零报错跑通（A 臂 solution 路径、B 臂占位路径）
4. 变更自身测试面跑绿，lint 通过

## 成功标准（可验证）

1. eval/tasks/004-phase-stats/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/events.log（承载五类隐含输入的固定 fixture）、verify.mjs（期望硬编码、fail 时可定位哪条隐含面挂了）、solution/bin/phase-stats.mjs（参考解过 verify）
2. 判别力：naive 实现（按文件邻接配对、不跳空行）verify 必拒；参考解必过——仓库测试钉死（test/eval-planted-defect-probe.test.mjs）
3. eval 管道集成：node eval/run.mjs --dry-run 含新任务零报错跑通（A 臂 solution 路径、B 臂占位路径）
4. 变更自身测试面跑绿，lint 通过
