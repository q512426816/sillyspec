---
author: qinyi
created_at: 2026-08-06 16:05:00
---

# 模块影响分析（Module Impact）— execute-runs/stage-reviews 与 worktree 生命周期解耦

## 变更简述
方案 A（specDriftAnchor）：drift 守卫命中时补设 `platformOpts.specDriftAnchor = 主仓 specBase`，下游 13 处 runtimeRoot 解析站点统一改调 `resolveRuntimeRoot`（src/run/shared.js），drift 场景 execute-runs/stage-reviews 落主仓 `.runtime`，不再被 worktree cleanup 整目录删吃掉。

## 三重交叉验证（以 git diff 为准）

- **声明范围**（proposal/design）：command.js drift 守卫 + shared.js resolveRuntimeRoot + 13 站点 + test + file-lifecycle.md
- **任务范围**（plan/tasks）：task-01..05（producer / consumer / test / docs / regression）
- **真实变更**（git status）：8 源码 + 1 测试 + 1 file-lifecycle.md + 3 模块卡（均已匹配，见下）

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| runtime | 逻辑变更 | `src/run/shared.js` | 新增 `resolveRuntimeRoot(platformOpts, localSpecBase)`（三级优先级 runtimeRoot > specDriftAnchor > 本地兜底），统一 .runtime 根解析；模块卡 `runtime.md` 已补 specDriftAnchor 语义 + resolveRuntimeRoot | false |
| cli-entry | 逻辑变更 | `src/run/command.js` | drift 守卫（:536-546）if(wt) 块补设 `platformOpts.specDriftAnchor = wt.mainSpecBase`（producer）；quick marker 站点（:427/:735）改调 resolveRuntimeRoot；模块卡 `cli-entry.md` 已补 drift 守卫 specDriftAnchor 增补 | false |
| worktree | 逻辑变更（影响面） | `src/worktree.js`（本变更**不改**）、模块卡 `worktree.md` | 方案 A 使 cleanup（9 调用点 + rmSync 整目录删）不再威胁 execute-runs/stage-reviews（drift 场景落主仓 .runtime）；cleanup 调用点全无需改（NG-1）；模块卡已补「cleanup 不威胁」说明 | false |
| machine-interface | 边界（defer） | `src/machine-interface.js:184/402` | B 类毗邻残留旧公式 `runtimeRoot || join(specRoot,'.runtime')`，本变更 **defer**（非 execute-runs/stage-reviews 事故链必经；design 文末「待 plan 拍板」），留后续单独 change 统一 | true |

## 未匹配文件（_module-map.yaml 无 paths 字段，按语义归属）

| 文件 | 归属模块（语义） | 说明 |
|------|----------------|------|
| `src/run/gates.js` / `src/run/stage.js` / `src/run/complete.js` / `src/run/prompt.js` / `src/run/complete-handlers.js` | runtime + cli-entry | 15 站点中 11 A 类 + complete-handlers.js:558 + gates.js:219 改调 resolveRuntimeRoot（marker/review.json 落点） |
| `src/task-review.js` | runtime（execute-runs 落点） | :631 writeExecuteRunMarker / task review 写入改调 resolveRuntimeRoot |
| `test/execute-runs-isolation.test.mjs` | runtime（测试） | T-01..T-08 新增，锁死 drift 落主仓契约 |
| `docs/sillyspec/file-lifecycle.md` | docs | .runtime 落点说明 + resolveRuntimeRoot 公式 + updated_at |

## 更新结果
- `_module-map.yaml`：**无需改**（paths/depends_on 本卡未维护；本次不增删模块、不改模块拓扑）。
- 模块卡片：`runtime.md` / `worktree.md` / `cli-entry.md` 已在 execute task-04 同步（resolveRuntimeRoot + specDriftAnchor + cleanup 不威胁说明）。
- 人工备注：三张卡 `<!-- MANUAL_NOTES_START/END -->` 原样保留（未覆盖）。
- `sillyspec modules rebuild`：非必需（_module-map.yaml 无 paths 字段，无结构变化）。
