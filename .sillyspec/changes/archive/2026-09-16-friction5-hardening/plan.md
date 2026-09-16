---
author: qinyi
created_at: 2026-09-16 11:31:40
plan_level: full
---

# 实现计划（Plan）— 2026-09-16-friction5-hardening

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-03
- task-04
- task-05

## Wave 2（依赖 Wave 1）
- task-06

> 五码任务各改各文件、零交叉（见任务总表 target 面），Wave 1 全并行；收尾统一跑全量 `npm test`（任一任务的改动若撞既有测试面，由该任务负责修复）。task-06 模块文档认领汇总五任务行为契约，依赖 Wave 1 全部完成。

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | target_files | 说明 |
|---|---|---|---|---|---|---|---|
| task-01 | 回执双形态解析 | W1 | P0 | — | FR-01, D-001@v1 | src/verify-facts-schema.js, src/verify-probes.js, src/stages/verify.js, NEW:test/receipt-multiline-parse.test.mjs | parseEvidenceSlots 单行正则保留 + 多行 YAML 聚合；骨架/prompt 双形态文案 |
| task-02 | TaskCard 重复键检测 | W1 | P0 | — | FR-02, D-004@v1 | src/stages/plan-postcheck.js, NEW:test/taskcard-duplicate-key.test.mjs | detectDuplicateTopKeys 纯函数导出 + feasibility 接线 error |
| task-03 | apply docs 白名单 | W1 | P0 | — | FR-03, D-003@v2 | src/worktree-apply.js, test/worktree-allow-list-violations.test.mjs, test/cross-repo-apply.test.mjs, NEW:test/apply-docs-allowlist.test.mjs | 条件加白（声明面非空才加）+ declaredFace 审计报备；连带更新两既有测试 4 条 deepEqual 断言（加白后 main Set 多 `.sillyspec/docs/`，属有意语义变更的合法断言更新——plan-review 实证 :114/:152/:94/:122） |
| task-04 | 快照 copy 面 | W1 | P0 | — | FR-04, D-002@v1 | src/config-schema.js, src/run/gate-snapshot.js, NEW:test/gate-snapshot-copy.test.mjs | gate_snapshot.copy 键登记（**同步 renderExample() 加 gate_snapshot: 段**——config-schema.test.mjs:109/:111 防漂耦合钉死）+ junction/copy 回退 |
| task-05 | probe7 锚点对齐 | W1 | P0 | — | FR-05, D-005@v1 | src/probe7-anchor-check.js, src/run/gates.js, NEW:test/probe7-anchor-testfile.test.mjs | .test. 锚口径 + advisory 文案同步 |
| task-06 | 模块文档认领 | W2 | P1 | task-01,02,03,04,05 | 全 FR 交付面 | .sillyspec/docs/sillyspec/modules/core-engine.changelog.md, .sillyspec/docs/sillyspec/modules/stages.changelog.md, .sillyspec/docs/sillyspec/modules/worktree.changelog.md, .sillyspec/docs/sillyspec/modules/runtime.changelog.md, .sillyspec/docs/sillyspec/modules/setup.changelog.md | 五模块 sidecar changelog 追加 2026-09-16 条目（module-impact 更新结果 pending → done） |

## 关键路径
task-01~05 全并行 → task-06（唯一汇合点：五码任务完成后认领模块文档）；全量 npm test 收尾门。

## 全局验收标准
1. 全部单元测试通过（新增 5 组直测 + 既有 500 文件测试面零回归，除 task-03 声明的 4 条有意断言更新）
2. 存量行为逐一不变（design 兼容策略五条）：单行回执解析逐字节不变 / 无重复键卡片零新 error / 空清单变更 fail-open 不变 / 未配 gate_snapshot.copy 快照零变化 / file:line 锚判定不变
3. （brownfield）未配置新功能时行为不变——五处改动全部增量式
4. npm run lint 通过

> 验收结论不落在 plan.md——逐项核验结果由 verify 阶段写入 verify-result.md；task 级验收对照 TaskCard frontmatter acceptance 字段。

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | test/receipt-multiline-parse.test.mjs（多行/混合/fail-closed/存量回归四组） |
| D-002@v1 | task-04 | test/gate-snapshot-copy.test.mjs（junction/copy 回退/未配置零行为） |
| D-003@v2 | task-03 | test/apply-docs-allowlist.test.mjs（条件加白/declaredFace 审计/空清单 fail-open） |
| D-004@v1 | task-02 | test/taskcard-duplicate-key.test.mjs（depends_on 重复/块列表不误报/无重复零误报） |
| D-005@v1 | task-05 | test/probe7-anchor-testfile.test.mjs（.test. 锚收认/file:line 维持） |
