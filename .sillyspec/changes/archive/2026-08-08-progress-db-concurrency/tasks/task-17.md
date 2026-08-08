---
id: task-17
title: 文档同步——docs/sillyspec/file-lifecycle.md（引擎+删 gate-status）+ `.claude/skills/` 进度库描述 + `node docs/prompt/_extract.mjs` 再生（如涉及 stages prompt）
title_zh: 文档同步（file-lifecycle 引擎与删 gate-status + skills 进度库描述）
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P1
depends_on: [task-14]
blocks: []
requirement_ids: [FR-01, FR-05]
decision_ids: [D-01@v1, D-02@v1]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/file-lifecycle/storage-and-state.md
  - docs/sillyspec/file-lifecycle/worktree-and-guard.md
  - docs/sillyspec/interface-contract.md
  - .claude/skills/sillyspec-doctor/SKILL.md
  - .claude/skills/sillyspec-resume/SKILL.md
  - docs/prompt/README.md
  - docs/prompt/_extract.mjs
goal: >
  同步文档与 .claude/skills/ 至 better-sqlite3 + 废 gate-status 后的代码口径：file-lifecycle 全家
  （主文档 + storage-and-state + worktree-and-guard）+ interface-contract 副作用声明 + skills 进度库
  描述全部对齐真实代码，完成标准为文档与代码一致。
implementation:
  - file-lifecycle.md：sillyspec.db 持久化描述由「sql.js + 整库 export 原子写」（:107）改「better-sqlite3 WAL 原生事务 + .bak 回退」；删 gate-status.json 全部条目——.runtime 目录表（:75「gate」）、平台模式残留清理白名单（:80/:206）、机器接口副作用声明表（:157）与取证例外（:161）；updated_at 戳更新
  - storage-and-state.md：删 `## gate-status.json` 章节（59-84）与 runtime 目录树条目（:17）；sillyspec.db 节（:36）改 better-sqlite3 WAL 引擎描述；updated_at 戳更新
  - worktree-and-guard.md：阶段门禁读序「1 gate-status.json 2 sqlite3 CLI」（217-218）改「hook 直读 DB（better-sqlite3 只读连接 queryDbFirstCell，WAL 并发安全，不依赖外部 sqlite3 CLI）」；execute 写入段「读取 gate-status.json 或 SQLite」（226）改「直读 DB」
  - interface-contract.md：副作用声明表删「写 gate-status.json」行（:277）与取证例外「不进 gate-status.json」（:287）——file-lifecycle.md 机器接口节要求副作用声明变更须同步契约文档
  - .claude/skills/sillyspec-doctor/SKILL.md：`runtime list` 描述（:65）删 gate-status.json 枚举项；sillyspec-resume/SKILL.md 核对（通用 SQLite 描述，引擎替换后仍准确，无需改动）
  - 预期不触发 `node docs/prompt/_extract.mjs` 再生：grep 实证 src/stages/*.js 不引用 sql.js/gate-status（仅 sillyspec.db 与外部 sqlite3 CLI，better-sqlite3 下文件格式不变仍准确），docs/prompt/README.md 无引擎描述——二者仅在 stages prompt 涉及时才改
acceptance:
  - docs/ 与 .claude/skills/ 下 grep `gate-status.json` / `sql.js` 无残留（历史评审 review-2026-08-08.md、self-audit-2026-08-07.md、scan/ 生成文档除外）
  - file-lifecycle.md 机器接口节与 interface-contract.md 副作用声明表一致（均不再声明 gate-status.json）
  - storage-and-state.md 无 gate-status.json 章节；worktree-and-guard.md 阶段门禁描述为直读 DB
  - docs/prompt/_extracted.json 与 src/stages/*.js 逐字一致（未改 stages prompt 则无需重跑脚本）
verify:
  - node docs/prompt/_extract.mjs（仅当 stages prompt 有改动时必跑；本次预期跳过）
  - grep -rn "gate-status.json\|sql.js" docs/sillyspec .claude/skills（核对残留）
constraints:
  - 只改文档与 skills，不手改 docs/prompt/<stage>.md 的 prompt 原文——改 prompt 须改源码后重跑 _extract 再生（CLAUDE.md 提示词文档同步）
  - skills 保持对外纯净性：不引入 D-编号/源码符号/内部路径术语（CLAUDE.md）
  - 不触碰历史评审/自审文档（review-2026-08-08.md、self-audit-2026-08-07.md）与 scan 生成文档（docs/sillyspec/scan/）
  - 文件生命周期文档同步检查清单：文件名引用、阶段步骤描述、归档清理流程、DB schema 描述与代码一致（CLAUDE.md）；schema 不变（design §8），storage-and-state.md DDL 表无需改
---
