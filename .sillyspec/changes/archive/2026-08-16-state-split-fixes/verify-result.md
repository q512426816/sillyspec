---
author: qinyi
created_at: 2026-08-17T01:20:00+08:00
---

# 验证报告 — 并发状态分裂三坑修复（2026-08-16-state-split-fixes）

## 结论

PASS WITH NOTES

## 验证范围

change 2026-08-16-state-split-fixes，交付 commit `31b6d9e`（worktree 分支 sillyspec/2026-08-16-state-split-fixes，17 文件 +1113/-12）。

- **#1 execute run marker 原子化**（D-001@v1）：`src/run/stage.js` 主写入点 + `src/run/gates.js` / `src/run/prompt.js` / `src/task-review.js` 三处 fallback 写入点，统一「mkdir `execute-runs/<runId>/tasks` 先于 marker」不变量 + 分层 fail 语义（stage throw / gates fail-closed / prompt 降级留痕 / task-review 去静默保 fail-open）。
- **#2 applyByMerge 预对齐**（D-002@v1）：`src/worktree-apply.js` `preAlignBaselineToMain`，merge 前把 baseline 中 main 已推进的并行文件 checkout main 版 + 提交对齐 commit；失败降级原 merge 路径。
- **#3 livingDocDrift 提示**（FR-03）：`src/run/shared.js` `resolveLivingDocs` + `matchLivingDocRefs` + `auditQuickCompletion` 扩展；`src/run/quick-audit.js` 输出；`src/config-schema.js` `docs-check.living-docs` 键登记。

## 任务验收（4/4）

| Task | acceptance 要点 | 实证 |
|---|---|---|
| task-01 | 不变量：marker 在则 tasks/ 在；分层语义有测试 | `test/execute-run-dir-fail-loud.test.mjs` 33/33：四写入点顺序源码扫描断言；真实 fs 障碍（execute-runs 占位为普通文件）注入下 stage 子进程 exit 1 + 修复指引 + DB rollback；prompt in-process 降级（console.error 留痕 + `{EXECUTE_RUN_ID}` 仍替换）；task-review 失败侧返回统计不抛 |
| task-02 | baseline 含并行文件 merge 成功；dirty 不被覆盖；降级可触发 | `test/worktree-merge-baseline-align.test.mjs` 27 断言：5 场景（预对齐生效/并行文件取 main 版/交付文件保留/dirty 跳过/降级路径）+ 19 既有 worktree-apply 回归全绿 |
| task-03 | 交集非空提示；不误报；配置可扩展 | `test/docs-living-drift-hint.test.mjs` 15/15：命中/无关文件不误报/living-docs 配置追加/活文档缺失静默跳过 |
| task-04 | npm test 全绿；docs check 无新增失效；提交未夹带 | worktree `npm test` 213/214；docs check 本变更引入失效清零；`31b6d9e` 17 文件全在本变更 allowed_paths 范围内 |

## 单元测试结论

- worktree 侧 `npm test`：**213/214 通过**（总耗时 63.8s，214 文件并发 12）。
- 本变更新增 3 测试文件：`execute-run-dir-fail-loud`（33 断言）、`worktree-merge-baseline-align`（27 断言）、`docs-living-drift-hint`（15 断言）全绿。
- `npm run lint`：check-syntax 303 文件（src 84 + test 219）全过，无未引用导出新增。

## NOTES（非阻断说明）

1. **doc-ref-check 唯一失败的归因**：worktree 的 `docs/sillyspec/platform-interface-map.md` 是 baseline overlay 的快照副本（含 9 处旧 index.js 行号引用），而 worktree 的 `src/index.js` 是 main 现版——overlay 副本对当前源码必然失效。**main 上同 9 处引用已被并行会话修复且 docs check 通过**（实测 main doc-ref-check 80/80 全过）。apply 后 worktree 差异合并到 main，此失败消失。非本变更代码缺陷。
2. **task-04 范围补登记**：`src/config-schema.js`（living-docs 键 + renderExample 模板行）不在 design §4 清单，属 task-03 配置面的收口（config-schema 测试强制「每个 live 键必须出现在 renderExample 模板」防漂耦合），module-impact.md 已补登记。
3. **文档行号同步**：本变更源码编辑导致 `platform-interface-map.md`（stage.js:113/127/149→122/136/158）与 `prompt-control-debt.md`（prompt.js:563→571、task-review.js:976→984、gates.js:557→561）引用漂移，已在 worktree 提交内同步修复；apply 时 3way 合并保留 main 侧并行更新。

## 风险与残留

- `risk_level: unit-sufficient`（design frontmatter 显式声明）：变更不触及部署入口/daemon；分层 fail 语义与预对齐分支均有确定性单测覆盖；#2 的真实 merge 场景已在 tmp git 仓完整仿真（非 mock fs）。
- 遗留观察（不阻断）：worktree overlay 快照与 main 的活文档漂移是结构性现象（本变更 #3 的 livingDocDrift 提示正是为此设计）；apply 后建议跑一次 `sillyspec docs check` 终验。
