---
author: qinyi
created_at: 2026-08-18T22:45:00+08:00
updated_at: 2026-08-19T10:55:00+08:00
---

# 模块影响分析（Module Impact）— docs check --fix 零侵入自动重锚

## 模块影响矩阵

对照 design.md §6 文件变更清单 × plan.md 任务列表 × 实际 git diff，按 `_module-map.yaml` 匹配：

| 模块 | 影响类型 | 涉及文件 | 说明 |
|------|------|------|------|
| docs-consistency | 修改 | `src/docs-check.js` | 新增 applyFixes 写回函数 + 失效引用 fixable/needs-manual 分类；suggestLines 复用不改动（task-01/02） |
| cli-entry | 修改 | `src/index.js` | docs check 子命令路由透传 --fix/--dry-run（BARE_FLAGS + fixActive + fixReport + exit code 三态）（task-03） |
| docs-consistency | 新增（测试） | `test/docs-check-fix.test.mjs` | 六场景 16 测试 + CLI 子进程旧版对照（task-04） |
| —（unmapped） | 伴随（lint 白名单） | `test/check-syntax.mjs` | 未引用导出白名单加 src/docs-check.js（task-03 接线前过渡期） |
| —（unmapped） | 修改（文档） | `docs/sillyspec/platform-interface-map.md` | task-05 真实漂移实测对象（临时已还原）；verify 期间因 execute 并行变更产生真漂移转正式修复——6 处锚点：--fix 自动 2 处唯一命中 + 人工修 4 处多命中，doc-ref-check 80/80 |
| docs-consistency | 修改（文档） | `.sillyspec/docs/sillyspec/modules/docs-consistency.md` | 模块卡「四件全部只读」表述修正（task-06） |
| —（unmapped） | 修改（文档） | `docs/sillyspec/file-lifecycle.md` | docs check 命令描述同步 --fix/--dry-run/exit code/fixReport（task-06） |
| cli-entry | 修改（文档） | `.sillyspec/docs/sillyspec/modules/cli-entry.md` | 变更索引补 platform-map-auto-anchors 条目（路由层摘要，verify 收尾） |

## 未匹配文件

unmapped 文件（`_module-map.yaml` 无归属，均为文档/测试伴随改动，不涉模块结构变化）：

| 文件 | 处置 |
|------|------|
| `docs/sillyspec/platform-interface-map.md` | 接口地图锚点修复（feature 目标场景实战） |
| `docs/sillyspec/file-lifecycle.md` | 文件生命周期文档命令描述同步 |
| `test/check-syntax.mjs` | lint 白名单过渡期条目 |

并行 session 同期改动（`src/stages/brainstorm.js` / `docs/prompt/*` / `.sillyspec/quicklog/QUICKLOG-qinyi.md` / `.gitattributes`）**非本变更归属**，不纳入本矩阵。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/docs-consistency.md` | 更新 docs-consistency 模块卡（新增 --fix 写路径，修正只读表述） | done（task-06：L20 契约行 + L29 四件写侧边界，updated_at 已刷新） |
| `docs/sillyspec/file-lifecycle.md` | 同步 docs check 命令描述（如涉及） | done（task-06：L59-68 命令签名 + --fix/--dry-run/exit code/fixReport，updated_at 已刷新） |
| `_module-map.yaml` | 无变化（未增删模块，docs-check.js/index.js 路径归属不变） | skipped |
| `modules/cli-entry.md` | 检查是否需补 --fix flag 描述（路由层增量，best-effort） | done（verify 收尾：变更索引补 platform-map-auto-anchors 条目——BARE_FLAGS+fixActive+fixReport 路由层摘要，写回逻辑指向 docs-consistency 模块；updated_at 已刷新） |
