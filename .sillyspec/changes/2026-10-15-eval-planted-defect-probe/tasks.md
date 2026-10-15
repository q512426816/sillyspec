---
author: flow-machine-draft
created_at: 2026-10-15T11:52:30.994Z
---
# 任务注册表（Tasks）— 2026-10-15-eval-planted-defect-probe

- [x] task-01: eval/tasks/004-phase-stats/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/events.log（承载五类隐含输入的固定 fixture）、verify.mjs（期望硬编码、fail 时可定位哪条隐含面挂了）、solution/bin/phase-stats.mjs（参考解过 verify）
- [x] task-02: 判别力：naive 实现（按文件邻接配对、不跳空行）verify 必拒；参考解必过——仓库测试钉死（test/eval-planted-defect-probe.test.mjs）
- [x] task-03: eval 管道集成：node eval/run.mjs --dry-run 含新任务零报错跑通（A 臂 solution 路径、B 臂占位路径）
- [x] task-04: 变更自身测试面跑绿，lint 通过
