# 模块影响分析（骨架由 `sillyspec module-impact --change <变更名>` 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**与 review 标记是语义判断，以本变更 design.md 文件变更清单为准（真实 > 声明）。
> 注：CLI 骨架扫描时抓到的是主仓工作区脏面（含并行会话 ql-20260915-008 在途文件），与本变更
> 无关——本矩阵按本变更计划改动面填写，ql-008 文件在「未匹配文件」节声明排除。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| worktree | src/worktree.js | 逻辑变更（_overlayBaseline foreign 剔除 + create 供给步） | 是（overlay/供给为 create 关键路径） |
| worktree | src/worktree-apply.js | 逻辑变更（applyWorktree no-op 剔除段） | 是（changedFiles 是 assess/apply 共用锚） |
| core-engine | src/task-review.js | 接口变更（新增导出 collectWorktreeChangedFiles）+ 逻辑变更（草稿并入段改消费 helper） | 是 |
| core-engine | src/verify-postcheck.js | 逻辑变更（attributeSuspectTasks 多归属 + runRequiredEvidenceCheckV2 双根） | 是（suspectTask 边界 join 保下游） |
| runtime | src/run/complete.js | 调用关系变更（prefetchDiffFileSet 并入 helper 集合并剔 baselineFiles） | 是（勾选守卫防伪底线相关） |
| setup | src/config-schema.js | 配置变更（注册 worktree.supplyFiles） | 否（纯增量键，默认空零行为） |
| （测试，跨模块） | NEW:test/worktree-dual-truth-gates.test.mjs | 新增 | 否 |
| （文档） | docs/sillyspec/troubleshooting.md | 逻辑变更（新增章节，纯文档） | 否 |

## 未匹配文件

以下文件是 CLI 骨架从主仓工作区脏面抓到的**并行会话 ql-20260915-008 在途改动**（scope-audit 跨仓清单盲区三项改进），不属本变更，排除出本矩阵与 allowed_paths：

- `src/change-list.js`（ql-008 并行会话在途，非本变更）
- `src/scope-audit.js`（ql-008 并行会话在途，非本变更）
- `src/verify-postcheck.js`（ql-008 并行会话在途——本变更同文件但改动区不同：ql-008 动 resolveReconcileActualFiles，本变更动 attributeSuspectTasks/runRequiredEvidenceCheckV2；Edit 前重读最新态）
- `src/worktree-apply.js`（ql-008 并行会话在途——同文件不同函数：ql-008 动 classifyToolScaffold/filterDeliverableFiles，本变更动 applyWorktree step2；Edit 前重读最新态）
- `test/change-list-operation.test.mjs` / `test/scope-audit.test.mjs` / `test/worktree-apply-meta-exclude.test.mjs`（ql-008 并行会话在途，非本变更）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无未匹配的本变更文件（未匹配项均为并行会话在途，非索引过期） | skipped |
| `docs/sillyspec/modules/worktree.md` | execute 后认领 overlay/供给/no-op 段行为契约更新 | done（sidecar worktree.changelog.md 追加 2026-09-15 条目：三道 foreign 剔除/detectNoOpFiles/supplyFiles 供给） |
| `docs/sillyspec/modules/core-engine.md` | execute 后认领 helper/多归属/双根行为契约更新（如模块文档含相关章节） | done（sidecar core-engine.changelog.md 追加 2026-09-15 条目：collectWorktreeChangedFiles/多归属/V2 双根） |
