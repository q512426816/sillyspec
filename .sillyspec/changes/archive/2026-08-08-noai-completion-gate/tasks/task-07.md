---
id: task-07
title: 同步 file-lifecycle.md + 重跑 prompt 镜像 + 检查 skills（noAI 末步走 completeStageGates）
title_zh: 文档同步（file-lifecycle + prompt 镜像 + skills）
author: qinyi
created_at: 2026-08-08 08:41:43
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/_extracted.json
---

## 目标
按 CLAUDE.md「文件生命周期文档同步」「提示词文档同步」检查清单，把 task-01~04 的实现定稿同步到文档：file-lifecycle.md 描述 noAI 末步 / continueStep 完成分支现在走 `completeStageGates`（不再直接标阶段完成）；prompt 镜像与 skills 如有过时描述一并修。

## allowed_paths
- docs/sillyspec/file-lifecycle.md
- docs/prompt/_extracted.json
- docs/prompt/*.md
- .claude/skills/*/SKILL.md

## 验收标准
- file-lifecycle.md「核心修正」段新增一条：noAI 步骤作为阶段末步时，`runStage` 在标 stage completed + 落盘后调用 `completeStageGates`（gates.js），与 completeStep / continueStep 完成分支走同一套 gate + handler + 校验（修 multi-agent-review §2.1 S1/S2）；现有 line 214「validator 失败回滚（completeStep）」措辞补「noAI 末步 / continueStep 完成分支同走 completeStageGates，同样受 rollback 保护」。
- file-lifecycle.md「代码依据」段补 `src/run/gates.js`（completeStageGates + validateMetadata/validateFileLocations 迁入）；更新头部 `updated_at` 时间戳为本变更合并日。
- `node docs/prompt/_extract.mjs` 重跑后 `_extracted.json` 与各 `<stage>.md` 无漂移（noAI 步骤 step 定义未改，预期 prompt 正文零变更——若 diff 为空则在 task 内记一笔「prompt 镜像无需改」即可）。
- `.claude/skills/*/SKILL.md` 经 grep「noAI / 阶段完成 / completeStage / 直接标 completed」核查：若有描述 noAI 末步「自动完成阶段」的措辞则同步；无则记「skills 无过时描述」。

## 依赖
- **expects_from**: task-01（completeStageGates 定义）+ task-02/03/04（三处接入）实现定稿、符号迁移落盘后，本 task 才能 据「实际代码」改文档；先行启动会写成臆测。
- **reads**: design.md §6 文件变更清单 + §5.2 三处接入行号、plan.md Wave 4 task-07 描述、CLAUDE.md 两份同步检查清单。
- **blocks**: 无（文档同步为本 change 收尾，archive 前最后一道）。

## 实现要点
- 顺序：改源码（task-01~04）已合并 → 重跑 `node docs/prompt/_extract.mjs` 刷新 `_extracted.json` → 看 diff 决定是否同步各 `<stage>.md` → 改 file-lifecycle.md → grep skills 决定是否改 SKILL.md。
- file-lifecycle.md 改动点定位（已 grep 确认）：line 209「executePlanPostcheck（noAI）」段 + line 213-214「Agent 门控强化」段。补一句「noAI 末步 / continueStep 完成分支现已走 completeStageGates，原 S1/S2 绕过已闭合」，勿整段重写（保守增量）。
- CLAUDE.md「文件生命周期文档同步」检查清单逐项过：文件名引用一致 / 阶段步骤描述与 `src/stages/*.js` 一致 / 归档清理流程与代码一致 / db schema 描述与 `src/db.js` 一致（本次无 schema 变更，记 N/A）/ updated_at 已更新。
- 提示词文档同步检查清单：prompt 正文以 `_extracted.json` 为准逐字对照；占位符总表 / persona 表 / CLI 注入框架（README.md）本次无变动（`outputStep` 未改），无需动 README。

## TDD
本 task 不写测试。验收以 `npm run lint` 通过为准——lint 不扫 `docs/`（空转无信息），但扫 `src/`（task-01~04 改动需 lint 绿，已在各自 task 验收，本 task 复核未回退）。文件名引用一致性 + prompt 镜像零漂移为人工对照（`_extract.mjs` 跑完 git diff 为空即「镜像一致」）。
