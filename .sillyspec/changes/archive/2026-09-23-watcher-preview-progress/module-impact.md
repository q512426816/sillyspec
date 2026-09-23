# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| cli-entry | `src/index.js` | 接口变更（progress show 增 --preview flag 分支） | 否（渲染面 additive，出口测试锁定） |
| cli-entry | `src/handoff.js` | 逻辑变更（输出追加机器预览态段，best-effort） | 否（`test/preview-outlet.test.mjs` T2 锁定） |
| core-engine | `src/db.js` | 数据结构变更（v7：authority/preview_evidence 列+复合索引，幂等迁移） | 已 review（task-01 review pass；迁移测试钉） |
| progress | `src/progress.js` | 逻辑变更+数据结构（六读点保险丝+权威 upsert 归章+serializeForSync 权威视图渲染+readPreviewProgress 导出） | 已 review（task-01/03/05 review pass；保险丝/隔离/归章三钉） |
| sync | `src/watcher.js` | 调用关系变更（循环 inferEvents 后 best-effort 预览投影接线） | 已 review（task-02 review pass；watcher 回归 45/45） |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/preview-progress.js` → runtime（worktree module-map 已补录 src/preview-progress.js；主仓 apply 时随合并生效）
- `test/preview-migration.test.mjs` → 测试（task-01 产物）
- `test/preview-progress.test.mjs` <!--TODO: 归属判定-->
- `test/preview-outlet.test.mjs` <!--TODO: 归属判定-->
- `test/preview-gc.test.mjs` <!--TODO: 归属判定-->
- `test/preview-gate-isolation.test.mjs` <!--TODO: 归属判定-->

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/cli-entry.md` | 补 --preview flag 与 handoff 预览段登记 | done |
| `modules/core-engine.md` | 补 v7 authority/preview_evidence 列登记 | done |
| `modules/progress.md` | 补保险丝/归章/权威视图渲染/readPreviewProgress 登记（worktree 内实际卡片名见 sync/progress 卡） | done |
| `modules/sync.md` | 补 watcher 预览投影接线与 preview-progress 模块登记 | done |
| `_module-map.yaml` | runtime 模块 paths 补录 src/preview-progress.js（worktree 已改，apply 随合并） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
