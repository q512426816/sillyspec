---
id: task-01
title: 新建 src/machine-interface.js — envelope/退出码/输出纪律 + gate 命令
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P0
depends_on: []
blocks: [task-02]
allowed_paths:
  - src/machine-interface.js
provides:
  - contract: machine-interface-module
    fields: [runGate, buildEnvelope, EXIT_OK, EXIT_BLOCKED, EXIT_UNKNOWN]
  - contract: gate-envelope-json
    fields: [schema_version, command, stage, change, ok, errors, warnings, checks, generated_at]
goal: |
  建立机器接口模块骨架：统一 JSON envelope、退出码常量（0/1/2）、stdout 纯 JSON 输出纪律，
  并实现 runGate(stage, changeName, opts) 聚合门控。
implementation: |
  新建 src/machine-interface.js（ESM，零新依赖）：
  1. 常量：EXIT_OK=0 / EXIT_BLOCKED=1 / EXIT_UNKNOWN=2（decisions.md D-004@v1）。
  2. buildEnvelope({command, stage, facet, change, ok, errors, warnings, checks, data})：
     顶层固定字段 schema_version:1 / command / change / ok / errors / warnings / generated_at(ISO)，
     stage/facet/checks/data 按需出现（design.md §3.4 示例）。
  3. runGate(stage, changeName, { cwd })：
     - 读进度：ProgressManager 只读路径（read/listChanges），变更不存在 → 返回 {exitCode:2}。
     - checks 聚合（design.md §3.1 表）：
       a. artifacts：stage-contract.js runValidators(stage, cwd, changeName, {projectName, specRoot})
       b. transition：checkTransition(currentStage, stage)，结果标 informational:true，不参与综合 ok
       c. stage==='execute'：加 task-reviews（task-review.js validateTaskReviews，gitDir 优先 worktree meta）
          与 execute-evidence（stage-contract.js checkExecuteCodeEvidence）
       d. stage==='verify'：加 verify-test（verify-postcheck.js runVerifyTestCheck）
     - D-008@v1 去重：execute 下 checkExecuteCodeEvidence 只调用一次，结果同时供
       execute-evidence check 的 data 与综合结论使用；artifacts 与 execute-evidence 结论不得矛盾。
     - 综合 ok = 所有非 informational check 均 ok；exitCode = ok?0 : 1；核验过程抛异常 → 2。
  4. 输出纪律（D-002/D-004）：导出 emitJson(envelope) —— --json 模式下先把 console.log 劫持到
     stderr（局部、函数内恢复），最终 envelope 用 process.stdout.write 单段输出；
     内部异常兜底 catch → 输出 {ok:false, errors:['internal: …']} 合法 JSON 并 exit 2。
  5. 只读约束：不调用 ProgressManager 的 _write/completeStage/updateStep，不写 gate-status.json，
     不 triggerSync。verify-test 落盘 .runtime/verify-runs/ 取证文件是允许的副作用（design §3.3）。
acceptance: |
  - runGate 对存在的变更返回 envelope（含 checks 数组）与 exitCode ∈ {0,1}
  - 变更不存在 / 内部异常 → exitCode 2 且 envelope 仍为合法结构
  - execute 阶段 checks 含 artifacts/transition/task-reviews/execute-evidence 四项
  - transition 标 informational:true 且不影响综合 ok
  - 调用前后 sillyspec.db 内容不变
verify: |
  task-07 的测试直测本模块；本任务内先用 node --input-type=module -e 手工冒烟：
  对现有变更跑 runGate('brainstorm', '2026-07-09-machine-interface-v1', {cwd}) 确认 envelope 结构。
constraints: |
  - 只改 allowed_paths 内文件；零新增外部依赖
  - 不修改 stage-contract/task-review/verify-postcheck/progress 任何被调模块
  - 复用既有函数签名，不在本模块重写校验逻辑（design §2：只聚合不新增校验）
---

# task-01: 新建 src/machine-interface.js — envelope/退出码/gate

## 目标

见 frontmatter goal。核心：daemon 一次 exec 得到"该阶段现在能否标记完成"的综合结论 + 逐项 checks。

## 实现蓝图

见 frontmatter implementation。被调函数均已存在：

- `runValidators(stage, cwd, changeName, context)` — src/stage-contract.js
- `checkTransition(from, to)` — src/stage-contract.js
- `checkExecuteCodeEvidence(cwd, changeName)` — src/stage-contract.js
- `validateTaskReviews(changeDir, opts)` — src/task-review.js
- `runVerifyTestCheck({cwd, specBase, changeName})` — src/verify-postcheck.js

## 验收标准

见 frontmatter acceptance（5 条，task-07 落为自动化断言）。

## TDD/验证

见 frontmatter verify。先写最小冒烟脚本再实现，红→绿。
