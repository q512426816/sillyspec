# 模块影响分析（Module Impact）— apply-conflict-hardening 护栏收口

> 影响类型与 review 标记以 git diff 为准；路径仓根全口径（对齐 CLI 三重核对）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| worktree | src/worktree-apply.js、.sillyspec/docs/sillyspec/modules/worktree.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md | 逻辑变更（merge 写回批末 add、writeApplyManifest 三出口、guard 相交预检三分支、rescue 指引行）；接口变更（ApplyManifest/GuardOverlapCheck 内部面） | 是（task-01/02 review pass + acceptance QA pass） |
| change-management | src/quicklog.js、.sillyspec/docs/sillyspec/modules/change-management.md | 接口变更（collectActiveQuickGuardFiles/listQuickSessionGuards 导出） | 是 |
| cli-entry | src/index.js | 逻辑变更（apply 分支 --force 解析/usage/透传；assess 入口 autoApply 置位） | 是 |
| core-engine | src/doctor-diagnostics.js、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md | 逻辑变更（detectApplyManifestDrift 检查项，advisory） | 是 |
| setup（规则面文档） | .sillyspec/ROADMAP.md、docs/sillyspec/troubleshooting.md | 文档变更（D-004 观察项、§64 状态更新） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 模块 paths 或不需归类：

- `test/apply-conflict-hardening.test.mjs`（新建）、`test/worktree-apply-rescue.test.mjs`：测试文件不入 map（仓惯例），随源文件模块走。
- `meta.json`：worktree CLI 自管供给态，非交付。
- 其余 .sillyspec/changes/ 产物：流程文档不参与核对。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 本变更未改（无新增源文件需登记；模块卡按既有模块更新） | done |
| `modules/worktree.md` + sidecar | task-04：写回收口/manifest/相交预检登记 | done |
| `modules/change-management.md` | task-04：collectActiveQuickGuardFiles/listQuickSessionGuards 登记 | done |
| `modules/core-engine.md` + sidecar | task-04：doctor 漂移检查登记 | done |
| `docs/sillyspec/troubleshooting.md` §64 | task-03：状态「已修复/落档」 | done |
