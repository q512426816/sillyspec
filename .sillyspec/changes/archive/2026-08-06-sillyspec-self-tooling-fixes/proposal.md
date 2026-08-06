---
author: qinyi
created_at: 2026-08-06T09:19:19
---

# 提案书（Proposal）— sillyspec 自工具坑确定性修复

## 一句话

修复工具驾驭复盘流程本身暴露的 4 个 SillySpec 确定性缺陷（execute 批量完成 marker 缺失、detectChangeRisk 误判引导不足、worktree apply 漏模块文档、archive git add 漏 archive/），坑5（多代理中间态 import 链污染）入 ROADMAP。

## 动机

继 `2026-08-05-tooling-feedback-fixes`（`db5d160` + `a7e2cf7`）修复 5 个工程坑后，该流程本身又暴露 4 个确定性缺陷——都在真实 dogfood 中拖累 agent，且都有明确代码根因（行号基于 HEAD=`a7e2cf7` 重核，step7 Grill 子代理独立核实）：

1. execute 批量完成时 stage review marker 不写，gate 读 null 报 `execute-null/review.json`，agent 不知往哪补（本流程已踩，手动生成 runId 才过）。
2. detectChangeRisk 机械匹配否定语境误判，`6417a27` 已加 frontmatter 覆盖但仅 PASS 缺证据错误才透出指引，FAIL/早期不提示。
3. worktree apply 一刀切排除 `.sillyspec/`，模块文档要手动 `git show`（Windows MSYS path mangling 加剧）。
4. archive 归档目录移动后不更新 git index，step5 prompt 驱动 git add 漏 `archive/` untracked 子目录。

## 关键问题（现有方案为何不够）

- **坑1**：`gates.js:276` stage review gate 读 marker 无 fallback；`gates.js:315-320` 的 fallback 是 **task review**（`current-execute-run-id-`）非 stage review（`current-stage-review-run-id-execute-`），两套同名易混（Grill X-008 核实）。
- **坑2**：`6417a27` frontmatter 覆盖是出路，但 `stage-contract.js:481` "出路③"触发条件 `requiresEvidence && !evidenceCheck.ok`，仅 PASS/PASS WITH NOTES 缺证据时显示；agent 到 verify 末尾撞错才发现可覆盖（Grill B-002）。
- **坑3**：`filterDeliverableFiles` 一刀切，`.sillyspec/docs/` 模块文档（交付物）被排除。
- **坑4**：`archiveChangeDirectory`（complete-handlers.js:95-150）只 mkdir+rename+unregister，不 git add；prompt 驱动不可靠。

## 变更范围

4 坑确定性局部修复（每坑 ≤3 文件）+ 文档同步：
- 坑1：`gates.js` marker 自生（~8 行）
- 坑2：`stage-contract.js` 早期 warning（~5 行）
- 坑3：`worktree-apply.js` filter 精细 + `verify-postcheck.js` import 去双写（~15 行）
- 坑4：`complete-handlers.js` CLI 下沉 safeGit add（~6 行）

## 不在范围内（显式清单）

- **不做 body 豁免短语扫描**（坑2，`6417a27` 已否决"正则层脆弱否定识别"，D-06 防复读）。
- **不做多代理并行 import 链隔离**（坑5，架构级，入 ROADMAP，D-05）。
- **不改 detectChangeRisk 判级逻辑 / frontmatter 优先级**（`6417a27` 已就位）。
- **不改 stage review gate fail-closed 语义 / task review marker 机制**。
- **不改 archive.js step5 prompt 文案**（CLI 下沉已确定性，prompt 幂等兜底）。
- **不引入新 stage / 文件类型 / schema**。

## 成功标准（可验证）

- execute 批量完成撞 stage review gate 时，错误路径为 `execute-review-<id>`（非 `execute-null`），agent 可直接定位补 review.json。
- detectChangeRisk 判 integration/deployment-critical 且无 frontmatter 时，verify 早期透出 warning 指引加 risk_level 覆盖（不依赖 conclusion）。
- worktree apply 后 `.sillyspec/docs/sillyspec/modules/*.md` 改动自动 apply 回主仓（不再手动 git show）。
- archive 归档后 `git status` 显示 `archive/` + `docs/` 已暂存（不需手动补 add）。
- npm test 全绿 + lint 0 错；现有测试不回归（filter 行为变更的 `test/worktree-apply-meta-exclude.test.mjs` 同步更新）。

## 影响范围

跨 5 模块：runtime（gates marker / complete-handlers git add）、stage-contract（change risk warning）、worktree-apply（filter）、verify-postcheck（内联副本去双写）、cli-entry（index 注释）。详见 design.md §6 文件变更清单。

## 预期收益

- execute 批量完成不再撞 execute-null 死路（marker 自生，路径确定可执行）。
- detectChangeRisk 误判时 agent 早期看到 frontmatter 覆盖出路（不必撞错才发现）。
- worktree apply 模块文档自动回主仓（消除手动 git show + MSYS path 折腾）。
- archive 归档目录确定性进 git index（消除手动补 add）。
- 双写漂移消除（verify-postcheck import worktree-apply 共享 filter）。
