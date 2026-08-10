---
id: task-12
title: 文档同步——镜像 extract + file-lifecycle + skills
title_zh: 文档同步
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P1
depends_on: [task-01, task-03, task-04, task-05, task-06, task-08, task-09, task-10, task-11]
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - docs/prompt/scan.md
  - docs/prompt/execute.md
  - docs/prompt/verify.md
  - docs/prompt/doctor.md
  - docs/prompt/_extracted.json
  - docs/sillyspec/file-lifecycle.md
  - .claude/skills/
provides: []
expects_from: {}
---

## goal

本变更是「源码先行、文档收尾」的最后一步：task-01~11 改完 `src/stages/{scan,execute,verify,doctor}.js` + `src/sync.js` + dispatch 子系统源码后，本任务把文档镜像与文件生命周期文档同步到核验版，确保文档与代码一致（CLAUDE.md「提示词文档同步」「文件生命周期文档同步」铁律）。仅同步 `docs/` 与 `.claude/skills/`，不碰源码、不碰 design.md。

## implementation

- **镜像刷新**：在主仓库根跑 `node docs/prompt/_extract.mjs`（机制见源文件头注释——静态阶段直读 `definition.steps`，plan/execute 动态阶段跑 `buildPlanSteps`/`buildExecuteSteps`），重生 `docs/prompt/_extracted.json`；对照 `_extracted.json` 逐字替换 `docs/prompt/{scan,execute,verify,doctor}.md` 的 prompt 正文（scan Step6 补策略+外部连接引导 / execute getDispatchMode + 兜底 / verify 兜底 / doctor 行353 修正后的文案均由源码驱动落地）
- **file-lifecycle.md**：更新 `docs/sillyspec/file-lifecycle.md` 中 local.yaml 生成逻辑为核验版（detect 核验 scripts/gradlew 存在性，命令缺失不写键）+ 新增 `mcp` 段描述（producer sync.js connect 写 platform+mcp 段同源假设 / consumer readMcpConfig + env fallback / 与 platform 段并列语义独立）+ 文档头部 `updated_at` 时间戳
- **skills 检查**：扫 `.claude/skills/*/SKILL.md`，对应 skill（scan/execute/verify/doctor/local-detect/sync 相关）检查是否需同步；遵守 SKILL 对外纯净性——禁出现内部 docs 路径（`docs/prompt/...`）、源码符号（行号/函数名如 `getDispatchMode`/`readMcpConfig`）、D-编号

## 验收标准

- `node docs/prompt/_extract.mjs` 跑通且 `docs/prompt/_extracted.json` 与当前源码一致；`docs/prompt/{scan,execute,verify,doctor}.md` 的 prompt 正文与 `_extracted.json` 对应段逐字一致（无残留旧文案）
- `docs/sillyspec/file-lifecycle.md` local.yaml 生成逻辑为核验版（commands 键存在性由 scripts 驱动）+ 含 `mcp` 段描述（platform+mcp 段并列、readMcpConfig + env fallback）+ 头部 `updated_at` 已更新
- `.claude/skills/*/SKILL.md` 对外纯净——grep 无内部 docs 路径 / 源码符号（`getDispatchMode`/`readMcpConfig`/`SyncManager.connect` 等）/ D-编号泄漏
- `npm run lint` 通过（lint 不扫 docs/，但触及 `.claude/skills` 可能被扫，确认无语法问题）

## verify

- 跑 `node docs/prompt/_extract.mjs` 输出各阶段 steps 计数与源码一致
- 人工核对 `_extracted.json` 中 scan Step6 prompt 含 `platform connect` / `mcp.url` / `probe_ttl_ms` / `SILLYHUB_MCP_URL` 关键字（task-09 落地证据）；execute prompt 含 getDispatchMode 兜底；verify prompt 含兜底引导；doctor prompt 含 `sillyspec local detect`（非 init）
- `git diff docs/sillyspec/file-lifecycle.md` 仅含 local.yaml 核验版 + mcp 段描述 + updated_at 三类改动，无误删既有段落
- `grep -rn "docs/prompt\|getDispatchMode\|readMcpConfig\|D-00" .claude/skills/` 无命中（SKILL 纯净性）

## constraints

- 镜像 `docs/prompt/*.md` **禁手改** prompt 原文——extract 覆盖（CLAUDE.md「提示词文档同步」铁律：要改提示词改源码后重跑脚本）
- 必须在 task-03~11 源码改完后跑（depends_on 锁定 9 个前置 task），否则镜像与源码不一致
- design.md 不在本 task allowed_paths——design §6 文件清单 `sync.js:150-167` 行号 stale（connect 实际 `SyncManager.connect` L202）+ §12 并行变更 scope 描述有误（`readLocalYaml/_getPlatform` 应为 `connect/sync/resolvePlatformUser`）两处 design 更正归 verify 阶段，task-12 只同步 docs/skills 不碰 design
- 不改源码、不跑 `npm test`（纯文档改动，CLAUDE.md 规则 8 纯 doc/配置可跳过测试，仅 lint 兜底）
