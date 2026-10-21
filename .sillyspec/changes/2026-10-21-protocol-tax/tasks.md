---
author: flow-machine-draft
created_at: 2026-10-21T14:15:09.575Z
---
# 任务注册表（Tasks）— 2026-10-21-protocol-tax

- [x] task-01: 建 src/timing.js（timingMark/emitTimingIfEnabled，env 门控）并在 shared.js triggerSync、gates.js completeStageGates、prompt.js outputStep、complete.js 状态写点插桩——验证：test/timing-segments.test.mjs 绿（四段 [timing] 行输出、默认无 [timing] 行）
- [x] task-02: index.js 全局 --out-file/--tail N 输出收集器（exit 钩子写全文+打尾行，退出码不拦截）——验证：test/out-file-tail.test.mjs 绿（成功与 exit 1 命令的尾行/全文件/退出码一致）
- [x] task-03: prompt.js outputStep 重复渲染增量面 + .runtime/render-ledger.json 台账（writeAtomicSync，键=change）——验证：test/output-repeat-delta.test.mjs 绿（重复 <60 行+锚引用行、换步恢复全量）且 test/output-step-render.test.mjs 回归绿（首渲染口径）
- [x] task-04: complete.js waitStep --json（唯一 JSON 对象）与 continueStep --answers 多答（引号感知解析、全键命中才回填）——验证：test/wait-json-answers.test.mjs 绿（JSON 可解析、一次三答、miss 键整单拒绝）
- [x] task-05: complete.js 无 waiting 步骤时 --continue 幂等 exit 0 + 指引行——验证：test/continue-idempotent.test.mjs 绿（无 waiting exit 0、有 waiting 语义不变）
- [x] task-06: index.js 只读命令（status/progress show/handoff 查看态）跳过平台同步——验证：test/status-nosync.test.mjs 绿（无 [sync] 行、写命令同步不变）+ 消费仓实测 status --change <1.5s 记入决策留痕
- [ ] task-07: git-helper.js batchCatFileCheck + doctor-diagnostics.js anchorOk 批量化 + worktree.js _branchReviewReferences 批量化——验证：test/doctor-anchor-batch.test.mjs 绿（悬空判定与逐 SHA 等价）+ test/doctor-archive-integrity.test.mjs 回归绿 + 本仓实测 doctor <5s 记入决策留痕
