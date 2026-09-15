---
plan_level: full
---

# 实现计划（Plan）— 2026-09-15-worktree-dual-truth-gates

## Spike 前置验证

不需要——五个修复点全部锚定既有机制与先例（own/foreign oracle、getBlobHashMap/chunkPaths、buildAcceptanceHints 双根、D-004@v1 归因口径），无新技术栈/未验证集成。Design Grill 已对全部关键假设做源码级核实。

## Wave 1（并行，无依赖）

- task-01
- task-02
- task-04

## Wave 2（依赖 Wave 1；同文件串行——task-03 与 task-01 共 worktree.js、task-05 与 task-04 共 verify-postcheck.js，plan-postcheck 同 Wave 共享硬拦）

- task-03
- task-05

## Wave 3（依赖 Wave 1+2）

- task-06

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | overlay 隔离并行会话声明文件 | W1 | P0 | — | FR-01, D-001@v1 | `_overlayBaseline` 增 changeName，三道 foreign 剔除 + 隔离打印（src/worktree.js） |
| task-02 | no-op 文件剔除 | W1 | P0 | — | FR-02, D-002@v1 | `applyWorktree` step 2 hash-object vs 主仓 HEAD blob 对照（复用 getBlobHashMap/chunkPaths，src/worktree-apply.js） |
| task-03 | supplyFiles 生成物供给 | W2 | P0 | task-01（同文件 worktree.js 串行） | FR-03, D-003@v1 | config-schema 注册键 + create step 5.9 供给步 + meta.supplyFiles（src/config-schema.js / src/worktree.js） |
| task-04 | 勾选口径统一 + 归因多归属 | W1 | P0 | — | FR-04, D-004@v1 | `collectWorktreeChangedFiles` helper + prefetchDiffFileSet 并入并剔 baselineFiles + attributeSuspectTasks 多归属（src/task-review.js / src/run/complete.js / src/verify-postcheck.js） |
| task-05 | evidence 双根核验 | W2 | P0 | task-04（同文件 verify-postcheck.js 串行） | FR-05, D-005@v1 | `runRequiredEvidenceCheckV2` 候选根双根化（src/verify-postcheck.js） |
| task-06 | 测试收口 + 文档 + 全量门禁 | W3 | P0 | task-01~05 | 全部 FR | test/worktree-dual-truth-gates.test.mjs 收口 + troubleshooting 新章节 + 全量 npm test / lint |

注：同文件对已按 plan-postcheck 同 Wave 共享硬拦拆 Wave（01→03 共 worktree.js、04→05 共 verify-postcheck.js）；Wave 内三任务（01/02/04）文件面互不相交，可并行。

## 关键路径

task-01 → task-03 → task-06 与 task-04 → task-05 → task-06（两条同文件串行链，最短周期由 Wave 层数决定）

## 全局验收标准

1. 全量 `npm test` 通过（含新增 test/worktree-dual-truth-gates.test.mjs）、`npm run lint` 0 告警
2. 五坑回归测试各含正向 + 零回归断言（AC 细节在 TaskCard acceptance）
3. （brownfield）未配置 `worktree.supplyFiles` / 无并行声明 / 无 worktree meta 的存量场景行为不变
4. 五坑场景按 requirements.md GWT 逐条可复现修复后行为

## 覆盖矩阵（如存在 decisions.md）

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC：并行声明文件不进 meta.baselineFiles/checkpoint message |
| D-002@v1 | task-02 | AC：「内容=主仓 HEAD」文件不进 changedFiles，warnings 列清单 |
| D-003@v1 | task-03 | AC：配置后 create 供给且 meta.supplyFiles 记录；未配置零变化 |
| D-004@v1 | task-04 | AC：未提交改动命中勾选；baselineFiles 剔除防误勾；多归属渲染 |
| D-005@v1 | task-05 | AC：worktree 独有新文件不再误报「文件不存在」 |
