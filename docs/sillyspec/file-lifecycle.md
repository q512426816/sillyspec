---
author: qinyi
created_at: 2026-05-31 11:00:00
updated_at: 2026-07-02 10:00:00
---

# SillySpec 文件生命周期

> 本文档按当前代码重写。它描述的是仓库里已经实现或运行时会暴露的行为，不描述期望设计。

## 文档拆分

| 文件 | 说明 |
|---|---|
| [storage-and-state.md](file-lifecycle/storage-and-state.md) | `.sillyspec/.runtime/`、SQLite、gate、artifact、history、local 配置口径 |
| [stage-artifacts.md](file-lifecycle/stage-artifacts.md) | 各阶段的运行时步骤、变更目录产物、归档和 quicklog |
| [worktree-and-guard.md](file-lifecycle/worktree-and-guard.md) | `sillyspec worktree`、`meta.json`、apply、cleanup、Claude hook 门禁 |
| [platform-workflows-sync.md](file-lifecycle/platform-workflows-sync.md) | 平台模式、workflow check、manifest、SillyHub sync |
| [known-implementation-gaps.md](file-lifecycle/known-implementation-gaps.md) | 当前代码与提示文案/旧文档不一致的地方 |

## 代码依据

本组文档主要对照以下实现：

- `src/init.js`
- `src/db.js`
- `src/scan-postcheck.js`
- `src/knowledge-match.js`
- `src/progress.js`
- `src/run.js`
- `src/stages/*.js`
- `src/worktree.js`
- `src/worktree-apply.js`
- `src/hooks/worktree-guard.js`
- `src/workflow.js`
- `src/sync.js`
- `src/modules.js`
- `src/index.js`

运行时阶段列表以导入 `src/stages/index.js` 后得到的对象为准。当前导入结果：

| 阶段 | 当前步骤数 | 备注 |
|---|---:|---|
| scan | 11 | 辅助阶段；step 2 后会按项目动态展开 `perProject` 步骤；第 10 步「Extract Project Knowledge」写入 `knowledge/` |
| brainstorm | 11 | 独立包含“写设计文档并自审”和“用户确认并生成规范文件” |
| propose | 7 | 包含“生成规范文件”与“自检门控”，四件套是该阶段预期产物 |
| plan | 动态 | 默认 8 步；`plan.md` 解析到任务后插入任务蓝图协调器 |
| execute | 动态 | 默认 12 步；Wave 来自 `plan.md`，解析失败时默认 3 个 Wave |
| verify | 7 | 只读校验 + 写 `verify-result.md` |
| archive | 5 | 辅助阶段；第 4 步必须带 `--confirm`，由 `run.js` 移动目录并注销 active change |
| quick | 3 | 辅助阶段；直接在主工作区实现，不创建 worktree |
| explore | 1 | 只读探索 |
| status | 3 | 状态展示 |
| doctor | 5 | 环境和项目自检 |

## 顶层目录口径

当前 `sillyspec init` 会创建或维护以下目录：

| 路径 | tracked | 创建/维护方 | 当前生命周期 |
|---|---|---|---|
| `.sillyspec/projects/` | 是 | `init.js`、scan prompt 人工确认后 | 项目注册表，`*.yaml` 描述项目名、路径、状态 |
| `.sillyspec/docs/<project>/scan/` | 是 | `init.js` 建目录；scan 阶段生成文档 | 代码扫描产物，workflow `scan-docs` 会检查 |
| `.sillyspec/docs/<project>/modules/` | 是 | scan 可选步骤、archive sync、`modules` 子命令 | 模块索引和模块卡片 |
| `.sillyspec/changes/<change>/` | 是 | `ProgressManager.initChange()` 确保目录；阶段 prompt 写入 | 单个变更包文档和验收产物 |
| `.sillyspec/changes/archive/` | 是 | archive `确认归档 --confirm` 分支 | 已归档变更目录 |
| `.sillyspec/knowledge/` | 是 | `init.js` 建目录；scan「Extract Project Knowledge」步骤产出 | `INDEX.md`、`uncategorized.md`，以及 scan 提取的 `conventions.md`/`patterns.md`/`known-issues.md` |
| `.sillyspec/workflows/` | 是 | `init.js` 从模板复制 | workflow check 定义 |
| `.sillyspec/quicklog/` | 是 | quick prompt | 每次 quick 任务记录（始终写入；关联变更另在各 change tasks.md 勾选） |
| `.sillyspec/shared/` | 是 | `init.js` | 共享目录，当前无核心生命周期逻辑 |
| `.sillyspec/workspace/` | 是 | `init.js` | 工作区目录，当前无核心生命周期逻辑 |
| `.sillyspec/.runtime/` | 否 | `init.js`、`ProgressManager`、运行时命令 | DB、gate、artifacts、history、workflow-runs、worktrees、knowledge-hit-report.json、postcheck-result.json |

`init.js` 会把 `.sillyspec/.runtime/`、`.sillyspec/local.yaml`、`.sillyspec/codebase/SCAN-RAW.md` 追加到 `.gitignore`。

> **平台模式残留清理边界**（`init.js` `cleanupRuntimeResidue`，由 `run.js` 启动时复用）：
> 当 `specRoot` 指向外部、源码目录的 `.sillyspec/` 含真实资产（`changes/`/`projects/`/`sillyspec.db`）时，只清理运行时残留，**不整删 `.runtime/`**。清理白名单保留权威状态：`worktrees/`、`sillyspec.db`、`global.json`、`gate-status.json`、`contract-artifacts/`、`execute-runs/`；其余子项（`artifacts/`、`scan-runs/`、`scan-projects.json`、`user-inputs.md`、`postcheck-result.json` 等可重建缓存）逐项删除，`local.yaml`、`codebase/` 整删。未知子项默认保留（安全侧倾斜）。

## 主要文件流

```text
sillyspec init
  -> .sillyspec/projects/<project>.yaml
  -> .sillyspec/docs/<project>/scan/.gitkeep
  -> .sillyspec/workflows/*.yaml
  -> .sillyspec/knowledge/{INDEX.md,uncategorized.md}
  -> .sillyspec/.runtime/{sillyspec.db,user-inputs.md,artifacts,history,logs,templates}

sillyspec run scan
  -> .sillyspec/docs/<project>/scan/*.md
  -> .sillyspec/docs/<project>/modules/_module-map.yaml      (optional prompt)
  -> .sillyspec/docs/<project>/modules/<module>.md           (optional prompt)
  -> .sillyspec/knowledge/{conventions,patterns,known-issues}.md  (Extract Project Knowledge)
  -> .sillyspec/knowledge/INDEX.md                           (索引更新)
  -> .sillyspec/.runtime/scan-projects.json                  (step expansion state)
  -> .sillyspec/.runtime/postcheck-result.json              (scan-postcheck 结构化结果)

brainstorm / propose / plan / execute / verify / archive
  -> .sillyspec/changes/<change>/...
  -> .sillyspec/.runtime/sillyspec.db
  -> .sillyspec/.runtime/user-inputs.md
  -> .sillyspec/.runtime/artifacts/*.txt                     (long step output)

execute
  -> .sillyspec/.runtime/worktrees/<change>/meta.json
  -> .sillyspec/.runtime/knowledge-hit-report.json           (启动时按 taskContext 匹配 knowledge)
  -> worktree branch sillyspec/<change>
  -> apply patch back to main workspace, then cleanup

quick
  -> .sillyspec/quicklog/QUICKLOG-<git-user>.md              (without --change)
  -> or append checkbox to .sillyspec/changes/<change>/tasks.md
  -> code changes are made in the main workspace
```

## 核心修正

这版文档相对旧版长文档做了几项关键修正：

- `quick` 不走 worktree 生命周期。hook 在 quick 阶段对写文件放行，只拦截危险 Bash 命令。
- `scan` 当前定义是 10 步，并且 step 2 后会动态展开项目级步骤，不是固定 12 步。
- `brainstorm` 和 `propose` 的重复 object key 已拆成独立步骤，运行时步骤数分别是 11 和 7。
- `.sillyspec/local.yaml` 是当前主配置口径；scan prompt 写这里，sync 读写这里，hook 优先读这里并兼容根目录 fallback。
- 平台模式的 `manifest.json` 已接入 scan 完成回调；`workflow-runs` 的 runtimeRoot 路径支持在 `workflow.js` 中存在，但 `run.js` 当前调用没有传入 `runtimeRoot`。
- `archive` 的目录移动已经由 `run.js` 在第 4 步 `--confirm` 时执行；未带 `--confirm` 会回退该步骤并提示补参。
- scan 第 10 步「Extract Project Knowledge」把长期有效的项目知识写入 `.sillyspec/knowledge/`（`conventions.md`/`patterns.md`/`known-issues.md` + 更新 `INDEX.md`）；`scan-postcheck.js` 校验产物（INDEX.md 存在、引用文件真实存在）。
- execute 启动时由 `knowledge-match.js` 按 plan.md 的 task 关键词匹配知识库，命中报告注入 prompt 并写 `.runtime/knowledge-hit-report.json`。
- 平台模式残留清理只删缓存、保留权威状态（`worktrees/`、`sillyspec.db`、`global.json`、`gate-status.json`、`contract-artifacts/`、`execute-runs/`），不再整删 `.runtime/`——否则 worktree meta 被清掉会导致 `depsStatus` 恒为 unknown、`branch already exists` 死循环、`worktree doctor` orphan 误判。
- plan→execute Contract 校验（`parseWavesFromPlan`）只解析 `## Wave N` 段内的 `- [ ] task-XX:` 行；遇到非 Wave 标题行（`## 自检` 等）即退出当前 Wave 段，避免自检 `- [x]` checkbox 被误当 task 定义。
- `executePlanPostcheck` 的 `resolveChangeDir` 复用 `run.js` 模块内本地函数，不从 `./modules.js` 导入（该模块未导出此函数）。
- Revision v1：`stages` 表新增 `revision`/`reopened_from_step`/`reopened_at`/`stale_reason` 列；阶段新增 `revising`/`stale` 状态；`sillyspec run <stage> --reopen --from-step <n>` 重开已完成阶段、级联标记下游 stale；`.runtime/postcheck-result.json` 由 `scan-postcheck.js` 的 `writeStructuredResult` 落盘（本地写 `specDir/.runtime`，平台写 `runtimeRoot/scan-runs/<id>`）。
