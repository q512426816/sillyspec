---
stage: verify
change: 2026-08-09-complete-gate-atomicity
risk_level: unit-sufficient
conclusion: PASS WITH NOTES
verified_at: 2026-08-09
author: qinyi
created_at: 2026-08-09T15:06:07+08:00
---

# 验证报告：persist completed→gate 崩溃窗口 + completeStageGates 异常兜底

## 结论 / Conclusion

**PASS WITH NOTES**

修复 `docs/sillyspec/review-2026-08-09.md` #2 [P1]：阶段完成 persist（`pm._write`+`triggerSync`）从 gate 前移到 `completeStageGates` 成功之后（消除"persist completed → 跑 gate 崩溃"窗口，DB 不再留假 completed）+ `completeStageGates` 收尾段整体 try/catch（任一段抛非结构化异常 → `rollbackCompletionAndReturn`，不冒顶 exit 1）。FR-01~07 全部落实，R1~R5 风险缓解，execute acceptance review pass/pass。3 条非阻塞观察（见末节），不降级结论。

## 单元测试结论

- **`test/stage-completion-atomicity.test.mjs`**（task-05 新增）：5 用例 / 34 断言全 PASS——(a) runValidators throw→catch rollback；(b) validateMetadata throw（fixture ENOTDIR）→rollback（证整体 try 覆盖 validateMetadata 段，非仅 runStageCompletionGates）；(c) handleScanStageCompleted throw→rollback；(d) 原子性：runValidators throw 后 DB（pm.read）stageData.status!=='completed' + 入参 stageData 回滚 in-progress + 末步 pending；(e) bonus runVerifyTestCheck throw→rollback。裸跑 EXIT 0；worktree apply 后主干冒烟复跑 `✅ 通过 34 / 失败 0`。
- **全量 `npm test`**：✅ 通过 146 / ❌ 失败 0（worktree 跑；较 review#1 的 145 +1 即本测试；含 stage 完成 E2E 回归套件 noai-completion-gate / run-complete-step-validator-rollback / concurrent-preflight-hooks 等零回归）。
- **`npm run lint`**：Checked 225 JavaScript files（src 75 + test 150），全绿。

## FR 验收

- **FR-01/02（persist 移后原子性）**：grep 反向断言三处阶段完成 persist 在 `completeStageGates` 之后——`stage.js:357(gate)→:360(_write)`、`complete.js:278(gate)→:282(_write)+:283(triggerSync)`、`complete.js:729(gate)→:732(_write)`。gate 异常/失败→`rollbackCompletionAndReturn` 回 in-progress 并落盘，DB 不留假 completed。✅
- **FR-03/04/05（completeStageGates 整体 try/catch）**：Read `gates.js:549` 确认 :554-621 收尾段整体 try，catch→`rollbackCompletionAndReturn` 不冒顶，:624 `handleExecuteWorktreeCleanup` 在 try 外（副作用独立），execute 并发预检内层 advisory try/catch 保留。✅
- **FR-06（测试覆盖）**：stage-completion-atomicity 5 用例覆盖 runValidators/runVerifyTestCheck/validateMetadata/handleScanStageCompleted throw + 原子性。✅
- **FR-07（全绿）**：npm test 146/0 + lint 225。✅

## 风险缓解（R1~R5）

- **R1（persist 移后破坏 auxiliary）**：auxiliary（scan）完成后重置 pending，gate 成功后统一 `_write`，`stageData.status` 内存值决定落盘值（auxiliary=pending，non-auxiliary=completed）。现有 scan/stage 完成 E2E 回归（noai-completion-gate 等）通过。✅
- **R2~R5**：execute acceptance review 独立实证 8 pass / 0 gap / 0 fail（详见 `.sillyspec/.runtime/stage-reviews/execute-review-2026-08-09-145215/review.json`）。R3（triggerSync 仅 complete.js:266 一处）澄清无遗漏；R5（4th persist handleScanStageCompleted pre-existing）登记为 defer 债。

## 决策追踪矩阵

**D-001@v1**（requirements.md 引用；decisions.md 未独立建文件——D-001 为"阶段完成状态机原子性"决策占位）→ FR-01~05（persist 移后 + completeStageGates try/catch）→ task-01~04 → evidence：npm test 146/0 + stage-completion-atomicity 34/0 + grep persist 在 gate 后 + acceptance review pass/pass。

> D-001@v1 字面引用源 `requirements.md`（无独立 decisions.md，悬空引用，非阻断——CLI 仅校验 D-xxx@vN ID 字面出现在本报告）。

## Runtime Evidence

- **apply 后主干冒烟**：`node test/stage-completion-atomicity.test.mjs` → `✅ 通过 34 / 失败 0`（real runtime，非 mock-only——用例 (d) 端到端读 DB(pm.read) 确认 status 非 completed）。
- **stage 完成 E2E 回归**：npm test 含现有 noai-completion-gate / run-complete-step-validator-rollback / concurrent-preflight-hooks 套件，confirm persist 移后行为不变（gate 全过→completed，gate 失败/异常→in-progress）。

## docHash

design.md sha256 = `540abdd5b431981988f6f6004510c26ea688370917dc1a965014133adcd59a59`（execute acceptance review 独立 node crypto 复核一致）。

## 非阻塞观察（NOTES，不降级结论）

1. design.md 注解 `:624` 漂移至实际 `:633`（try/catch 插入后行号偏移），功能一致。
2. R4 fail-safe 残余：`rollbackStageCompletion` 对 `status!=='completed'` 不回滚（auxiliary 已 pending 时 skip），design 认可。
3. scan 阶段 gate 前 throw 回 in-progress 可恢复（rollback 路径覆盖，memory 记录的 fail-safe 语义）。
4. **已知 defer 债（非本次范围）**：③ complete-stage 后门（`stage-machine.js:36` `completeStage` 仅 `_validateStageArtifacts` 不跑 Stage/Task Review/verify-test gate，review#2b defer）；R5 4th persist（`handleScanStageCompleted` 内 pre-existing persist，review#2c defer）。

## 下一步

PASS → `sillyspec run archive` 归档。
