---
author: t
created_at: 2026-11-26 11:21:03
---

# 模块影响分析（骨架由 `sillyspec module-impact --change <变更名>` 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。
>
> **首版口径说明**：本变更尚未执行（plan 期首版）——矩阵按 design.md 文件变更清单的**计划影响面**填写；
> 骨架原按当前工作区 dirty diff 归类的 3 行（platform-interface-map.md / complete.js / plan-postcheck.js）是
> 并行会话在途文件，非本变更面，已剔除；execute/verify 期以实际 git diff 校正（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| stages | `src/stages/verify.js`（删除）、`src/stages/index.js`、`src/stages/archive.js`（3→4 步+移交项块删）、`src/stages/execute.js`、`src/stages/plan.js`、`src/stages/quick.js`、`src/stages/doctor.js`、`src/stages/plan-postcheck.js` | 逻辑变更（verify 阶段定义删除） | 是（大删+步骤表变更） |
| runtime | `src/run/stage.js`（skip 短路删+checkTransition 调用方）、`src/run/gates.js`（verify 收尾块族+reapVerifyServices 删）、`src/run/complete.js`、`src/run/complete-handlers.js`（REVIEW_STAGES）、`src/run/command.js`、`src/run/prompt.js`（HANDOVER_SUMMARY 删）、`src/run/next.js`、`src/run/shared.js`、`src/run/progress-confirm.js`、`src/run/verify-quality-scan.js`（更名 archive-quality-scan）、`src/run/green-cache.js` | 调用关系变更 + 逻辑变更 | 是（门挂载+收尾管线） |
| progress | `src/progress.js`、`src/progress/shared.js`（四枚举删 verify）、`src/progress/change-registry.js`、`src/progress/stage-machine.js`（legacyCompleteRetiredStage 新增） | 接口变更（枚举）+ 逻辑变更 | 是（枚举下游推导链） |
| core-engine | `src/stage-contract.js`（verify 规则族退役+checkTransition 改边 :2048）、`src/stage-contract-spec.js`、`src/verify-postcheck.js`（拆分保留十签名）、`src/verify-probes.js`（删除）、`src/verify-facts-schema.js`（删除）、`src/probe7-anchor-check.js`（删除）、`src/verify-mode.js`（删除）、`src/verify-draft.js`、`src/config-schema.js`（键清理）、`src/change-risk-profile.js`、`src/archive-delta.js`、`src/scope-audit.js`、`src/validate-artifacts.js`、`src/prefill.js`、`src/machine-draft.js` | 逻辑变更 + 删除（工具族退役） | 是（R-04 十签名保护面） |
| cli-entry | `src/index.js`（run verify 路由/verify-probes 命令族删除）、`src/flow.js`、`src/flow-parity.js`（升厚文案）、`src/preview-progress.js`、`src/doctor-diagnostics.js`、`src/watcher.js`、`src/redlines.js` | 接口变更（命令族）+ 逻辑变更 | 是 |
| machine-interface | `src/machine-interface.js`（verify 分支/文案，保留签名消费不动） | 逻辑变更 | 否 |
| sillyhub-mcp | `src/mcp-server.js`（stage enum 删 'verify'、facet verify-test 保留、description 中文指路） | 接口变更 | 否 |
| worktree | `src/worktree.js`、`src/worktree-apply.js`、`src/foreign-declared.js`（注释/文案核对） | 逻辑变更（文案级） | 否 |
| docs-consistency | `docs/sillyspec/file-lifecycle.md`、`docs/prompt/verify.md`（删除）、`docs/prompt/_extract.mjs`（staticStages 删 'verify'）、`docs/prompt/_extracted.json`（重跑） | 文档变更 | 否 |
| skills-docs | `.claude/skills/sillyspec-verify/`（删除）、auto/continue/flow 等 skill 的 verify 提及更新 | 文档变更 | 否 |
| hooks | `src/hooks/worktree-guard.js`（'verify' 枚举核对） | 逻辑变更（文案级） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- 无（骨架原列的 `test/taskcard-frontmatter-hardgate.test.mjs` 为并行会话在途 dirty 面，非本变更交付，剔除；本变更计划新建的 `NEW:test/archive-quality-scan.test.mjs`、`NEW:test/verify-mode-retired.test.mjs` 等测试文件落 test/——本仓政策性不登记面（module_gate_ignore: test），无需 rebuild）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/stages.md` | 更新 stages 模块卡（verify 阶段删除、archive 3→4 步、execute/plan/quick/doctor 面变化） | skipped（verify 阶段退役：模块卡正文由 task-10 文档镜像统一更新；行为变化见 file-lifecycle 与各模块卡契约摘要） |
| `modules/runtime.md` | 更新 runtime 模块卡（门挂载、收尾管线、更名文件） | skipped（verify 阶段退役：模块卡正文由 task-10 文档镜像统一更新；行为变化见 file-lifecycle 与各模块卡契约摘要） |
| `modules/progress.md` | 更新 progress 模块卡（枚举+legacyCompleteRetiredStage） | skipped（verify 阶段退役：模块卡正文由 task-10 文档镜像统一更新；行为变化见 file-lifecycle 与各模块卡契约摘要） |
| `modules/core-engine.md` | 更新 core-engine 模块卡（工具族退役、十签名保留面、checkTransition 改边） | skipped（verify 阶段退役：模块卡正文由 task-10 文档镜像统一更新；行为变化见 file-lifecycle 与各模块卡契约摘要） |
| `modules/cli-entry.md` | 更新 cli-entry 模块卡（命令族删除） | skipped（verify 阶段退役：模块卡正文由 task-10 文档镜像统一更新；行为变化见 file-lifecycle 与各模块卡契约摘要） |
| `_module-map.yaml` | paths 更新（verify 族文件删除、verify-quality-scan 更名归档） | skipped（verify 阶段退役：模块卡正文由 task-10 文档镜像统一更新；行为变化见 file-lifecycle 与各模块卡契约摘要） |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
