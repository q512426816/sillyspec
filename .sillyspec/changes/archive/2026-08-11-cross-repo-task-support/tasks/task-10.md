---
id: task-10
title: 文档同步 file-lifecycle.md + docs/prompt/execute.md 重跑 _extract.mjs + skills（覆盖：NFR-04）
title_zh: 跨仓机制文档与提示词镜像与 SKILL 同步
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P1
depends_on: [task-09]
blocks: []
requirement_ids: [NFR-04]
decision_ids: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/execute.md
  - docs/prompt/_extracted.json
  - .claude/skills/sillyspec-execute/SKILL.md
  - .claude/skills/sillyspec-plan/SKILL.md
goal: >
  同步 file-lifecycle 与 execute 提示词镜像与 execute 加 plan SKILL，反映跨仓 task 协议与 MultiRepoContext 运行时。
implementation:
  - file-lifecycle.md 同步 task 卡片 repo 加 base_commit 加 head_commit frontmatter 与 local.yaml repos 段与 MultiRepoContext 运行时与跨仓 apply no-op
  - 改 execute.js 后重跑 node docs/prompt/_extract.mjs 刷新 _extracted.json 加 execute.md 镜像
  - sillyspec-execute SKILL.md 加跨仓 task 指引（task 卡片 repo 与 local.yaml 注册与 workdir 切换与 commit 到跨仓主干）
  - sillyspec-plan SKILL.md 加跨仓 task 卡片协议
acceptance:
  - file-lifecycle.md updated_at 时间戳更新且含跨仓机制描述
  - _extracted.json 与 execute.js 源码一致
  - SKILL.md 含跨仓指引且对外纯净无内部术语
verify:
  - node docs/prompt/_extract.mjs
  - npm test
constraints:
  - 纯文档改动不改 src 加 test
  - SKILL.md 对外纯净（进 npm 加 init 复制到用户项目，禁内部 docs 路径加 D 编号加源码符号）
  - prompt 镜像以 _extracted.json 为准逐字替换不手改
---

# task-10：跨仓机制文档与提示词镜像与 SKILL 同步

## 上下文（现状锚点）

- **file-lifecycle.md**：`docs/sillyspec/file-lifecycle.md` 头部 `updated_at: 2026-08-11T14:35:00+08:00`（:4）。文档拆分为 5 个子文档（storage-and-state / stage-artifacts / worktree-and-guard / platform-workflows-sync / known-implementation-gaps）。跨仓机制涉及 task 卡片 `repo:` / `base_commit:` / `head_commit:` frontmatter、`local.yaml` `repos:` 段、MultiRepoContext 运行时、跨仓 task review.json 路径、跨仓 apply no-op——按子文档归属补到 worktree-and-guard（apply no-op + meta/worktree 多仓）与 stage-artifacts（task 卡片 frontmatter + review.json schema v2）两节，并更新头部 `updated_at` 时间戳。
- **prompt 镜像**：`docs/prompt/_extract.mjs`（:86-97）对 execute 跑 `buildExecuteSteps(planFilePath, { worktreePath })`，demoPlanFile 不存在 → 用默认 3 Wave。task-08 改 execute.js 的 `buildWavePrompt` worktreeSection（execute.js:561-579）单值改 per-task 多值表后，重跑 `node docs/prompt/_extract.mjs` 刷新 `docs/prompt/_extracted.json`，再以 `_extracted.json` 为准逐字替换 `docs/prompt/execute.md` 的 Wave 步骤 prompt 正文（CLAUDE.md 提示词文档同步铁律：禁手改 md prompt 原文）。
- **SKILL.md**：`.claude/skills/sillyspec-execute/SKILL.md`（Worktree 隔离 :39-46 + Task Review Gate :59）与 `.claude/skills/sillyspec-plan/SKILL.md`（动态步骤 :45-47）目前全单仓假设。跨仓 task 指引按子段插入：execute SKILL 加「跨仓 task workdir 切换 + commit 到跨仓主干 + 不经主仓 worktree」段；plan SKILL 加「跨仓 task 卡片协议（repo: + allowed_paths 相对跨仓仓根）」段。
- **design 依据**：§6 文件变更清单行 144-147（file-lifecycle / execute.md+_extract.mjs / execute SKILL / plan SKILL 四份文档同步）；§5.4 数据流（跨仓 task commit 落跨仓主干 + review 主仓统一存 + 跨仓 apply no-op）；§7.2 task 卡片 frontmatter 协议；§7.3 local.yaml repos: schema。

## 关键约束

- **纯文档不改 src/test**：本 task 触及的 execute.js 改造由 task-08 完成、ctx 构造由 task-09 完成，本 task 只跑 `node docs/prompt/_extract.mjs`（机械提取，不改源码）+ 编辑 4 份文档 + 1 份 JSON（自动生成）。`npm test` 仅佐证文档改动不破坏测试。
- **prompt 镜像以 _extracted.json 为准逐字替换**（CLAUDE.md 提示词文档同步铁律）：execute.md 的 Wave 步骤 prompt 正文必须从重跑后的 `_extracted.json` 逐字复制，**禁手改**（下次提取会覆盖且与源码不一致）。要改 prompt 改 execute.js 源码后重跑脚本，不在本 task 范围。
- **SKILL.md 对外纯净**（记忆 [[sillyspec-skill-external-purity]]）：SKILL.md 进 npm 包 + `sillyspec init` 复制到用户项目，**禁内部 docs 路径 / D-编号决策 / 源码符号（如 execute.js:466 / MultiRepoContext / worktreeSection）/ 路径A 术语**。跨仓指引用用户视角描述（「task 卡片写 `repo: <key>` + 在 local.yaml `repos:` 注册仓路径」），不引用 design/plan 内部锚点。
- **file-lifecycle updated_at 时间戳**：CLAUDE.md 文件生命周期文档同步检查清单要求更新头部 `updated_at`，改为本 task 完成日期。
- **_extract.mjs 无 diff 验收**：重跑后 `git diff docs/prompt/_extracted.json` 应反映 execute.js 源码变更（per-task workdir 表）；若 task-08 未改 execute.js prompt 文本（只改注入逻辑），`_extracted.json` 可能零 diff——此时 execute.md 也零变更，属正常（机械提取忠实反映源码）。

## 依赖

- **task-09**：execute 启动入口构造 MultiRepoContext + 调用链透传完成（shared.js/index.js），且 task-08 的 buildWavePrompt per-task workdir 改造已落 execute.js。本 task 在源码稳定后跑提取脚本，避免提取后源码再变又重跑。

## 不在本 task 范围

- 任何 `src/` 或 `test/` 改动（源码改造分属 task-01..09）。
- file-lifecycle 子文档（storage-and-state / stage-artifacts / worktree-and-guard / platform-workflows-sync / known-implementation-gaps）的深度重写——只补跨仓机制相关段落，不重构既有结构。
- `docs/prompt/README.md` 占位符总表更新——除非 task-08 引入新占位符（per-task workdir 表若用新占位符则需更新，否则不动）。
- 跨仓端到端验证（task-11）与全量 npm test/lint 验收（task-12）。
