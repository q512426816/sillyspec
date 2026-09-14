# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/scan-refresh.js` <!--TODO: 归属判定-->
- `src/scan-diff.js` <!--TODO: 归属判定-->
- `src/scan-postcheck.js` <!--TODO: 归属判定-->
- `src/scan-staleness.js` <!--TODO: 归属判定-->
- `src/hooks/worktree-guard.js` <!--TODO: 归属判定-->
- `src/index.js` <!--TODO: 归属判定-->
- `test/scan-refresh.test.mjs` <!--TODO: 归属判定-->
- `test/scan-diff.test.mjs` <!--TODO: 归属判定-->
- `test/scan-staleness.test.mjs` <!--TODO: 归属判定-->
- `test/worktree-guard.test.mjs` <!--TODO: 归属判定-->
- `docs/sillyspec/platform-interface-map.md` <!--TODO: 归属判定-->
- `docs/sillyspec/file-lifecycle.md` <!--TODO: 归属判定-->

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已增改：src/scan-refresh.js 登记 core-engine paths（task-06 执行期 lint 驱动补录，commit 9e97b3e） | done |
| `modules/core-engine.md` `modules/docs-consistency.md` `modules/hooks.md` `modules/cli-entry.md` | module-docs-sync sidecar 变更索引行 + updated_at 戳（幂等） | done |
| 并行变更产物裁决 | diff 多出的 5 文件（knowledge/decisions/*.md ×4 + design-d7-scan-lifecycle.md）属并行会话 quick-exit-tiered-gates 归档期的 decision-distill/文档写入，非本变更范围——不列入本表；module-impact 列出的 13 文件已在交付 commit（4613c0e 前身，见 git log scan-refresh 交付提交）落地 | skipped（归属裁决记录） |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
