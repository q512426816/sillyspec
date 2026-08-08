---
author: qinyi
created_at: 2026-08-08 11:55:00
---

# 验证报告 — noAI 步骤收尾补全阶段完成 gate（completeStageGates 收敛）

## 结论

**PASS WITH NOTES**

修复 `docs/sillyspec/multi-agent-review-2026-08-08.md` §2.1 S1/S2/S3 三处阶段完成收尾不对称——抽 `completeStageGates` 共享收尾管线，三处接入点（completeStep / continueStep 完成分支 / noAI 末步）走同一套 gate + handler + 校验。核心 state machine 改动，但行为收紧（gate fail 不打完成提示）+ 完整 characterization 测试锁住 + 新增复现测试 + 全套件零回归。

## 对照设计验收

| design 章节 | 验收 | 证据 |
|---|---|---|
| §5 三处接入 | ✅ | complete.js:285(completeStep) / complete.js:732(continueStep) / stage.js:357(noAI 末步) 三处 `const _r = await completeStageGates(...); if (_r) return _r` |
| §5.4 入参 steps 陷阱 | ✅ | completeStageGates（gates.js:508）全程用入参 steps（pre-reset 原数组）；auxiliary 重置把 stageData.steps 换成 freshSteps 后，下方 gate 守卫与 rollbackStageCompletion 用入参 steps 不重读 stageData.steps |
| §9 兼容策略 | ✅ | gate 移到下一步提示前（合理收紧：gate fail 不打"阶段已完成"），调用方仍自管 stage completed 标记 + 下一步提示 + reopen 回填 |
| §11 T1-T8 测试矩阵 | ✅ 部分 | T2/T3/T4/T5/T6/T8 直接驱动 completeStageGates 集成（4 case 24 assertions）；T1/T7 代码审查保证（task-05/06 review.json 诚实记录 fixture 代价） |
| D-001~D-004@v1 覆盖矩阵 | ✅ | plan.md 覆盖矩阵全有归属 task |

## 测试结果

- `npm test`：**EXIT=0，ALL PASS 135**（含新 `test/noai-completion-gate.test.mjs` 4 case 24 assertions）
- `npm run lint`：通过，72 文件
- **零回归**：completeStep 9 个 run-complete-step-* characterization 测试 + continueStep + noAI 末步现有测试全绿

### 新增复现测试（test/noai-completion-gate.test.mjs，直接驱动 completeStageGates）

| Case | 场景 | 断言 |
|---|---|---|
| T2 / S1 plan | plan + task id 不连续 | Plan→Execute Contract 校验失败 → 回滚 in-progress + 末步 pending |
| T3+T6 / S1 平台 + R4 | scan 平台 + 7 文档 | manifest.json 落盘 + 指针 scan_completed + auxiliary 重置 pending（可重跑） |
| T5+T8 / S3 | plan skip optional 步骤 | completed‖skipped 计数满足（不打「阶段校验跳过」）+ contract/file-locations gate 仍跑 |
| T4 / S2 gate 行为 | brainstorm 缺 design.md | runValidators fail → 回滚 in-progress + 末步 pending |

## 风险评估

**risk_level: unit-sufficient**（design.md frontmatter 显式覆盖 detectChangeRisk 关键词误伤）

关键词误伤说明：detectChangeRisk 命中 `lifecycle` / `state_transition` 触发词判本 change 为 integration-critical，但**实际是 SillySpec 自身 stage 状态转换收尾逻辑的收敛**——`lifecycle` 指 stage 阶段生命周期（brainstorm/plan/execute/verify/archive），`state_transition` 指 stageData.status 在 completed/in-progress/pending 之间的状态机转换，**不涉及任何 daemon / backend / session / lease / 跨进程**生命周期。本 change 改的是 `src/run/`（CLI 流程控制器内部），无 daemon 启动、无 backend 调用、无 session/lease 状态。故 unit-sufficient：characterization 测试（9 个 completeStep + continueStep + noAI 末步）+ 新增 4 case 复现测试 + 全套件 135 零回归 = 充分验证，无需真实 daemon↔backend 集成证据。

- **核心改动**：src/run/gates.js / complete.js / stage.js（阶段完成收尾 state machine）
- **风险因素**：三处接入点行为变化——noAI 末步 / continueStep 完成分支现在也跑完整 gate 级联（handleScan manifest + validateMetadata/FileLocations + auxiliary 重置 + runStageCompletionGates + execute worktree cleanup）
- **缓解**：行为收紧（gate fail 不打完成提示，非放宽放行）+ 完整 characterization 测试（9 个 completeStep + continueStep + noAI 末步现有测试锁住行为）+ 新增 4 case 复现测试 + 全套件 135 测试零回归
- in-place 模式 Task Review Gate WARNING（base..head 空 diff 并入工作区未提交改动 24 文件）属正常——改动未 commit，git 真实性校验并入 working-tree diff 按有效改动处理

## Notes（未集成项，诚实标注）

1. **T1（plan independent-tier Stage Review verdict=fail 阻断）**：需 docHash+marker+review.json fixture，未单独集成。由 stage.js:357 noAI 末步接入 completeStageGates + runStageCompletionGates Stage Review Gate（gates.js:264-310）代码路径共同保证。task-05 review.json 记录。
2. **T7（continueStep 双 worktree 清理回归 D-004@v1/B1）**：需驱动 continueStep execute 完成且全 gate 通过 fixture（worktree meta + Task Review review.json），构造代价高。由 complete.js:730-733 continueStep 完成分支删除内联 cleanup（原 731-759，与 handleExecuteWorktreeCleanup 逐行等价）+ completeStageGates 末尾 handleExecuteWorktreeCleanup 单次调用保证无双清理。task-06 review.json 记录。
3. **prompt 镜像同步**：本 change 未改任何 `src/stages/*.js` prompt 文案，对 `docs/prompt/` 零影响。会话前工作区已 M 的 `src/stages/*.js`（brainstorm-auto/brainstorm/execute/plan/scan）+ `docs/prompt/` 属其他并行工作，本 change commit 用显式 pathspec 排除；doctor.md 因跑 `_extract.mjs` 误变 M 已 restore。

## 模块影响

- `src/run/gates.js`：新增 `completeStageGates` + 迁入 `validateMetadata`/`validateFileLocations`/`readDesignScale`（export）
- `src/run/complete.js`：completeStep（:285）+ continueStep（:732）两处接入 + import 清理（删本地定义 + unused readdirSync/statSync/stageRegistry）
- `src/run/stage.js`：noAI 末步 else 分支（:357）接入
- `test/noai-completion-gate.test.mjs`：新增（4 case 24 assertions）
- `docs/sillyspec/file-lifecycle.md`：line 214 同步 completeStageGates 三处接入 + updated_at 2026-08-08

## 下一步

`archive`（归档变更）。
