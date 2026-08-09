---
author: qinyi
created_at: 2026-08-09T15:50:00+08:00
---
# 方案概述（Proposal）— worktree junction 解链 fail-loud

## 概述
修复 `docs/sillyspec/review-2026-08-09.md` #4 [P1]：`worktree.js` cleanup(:742) + `_doctorReprovision`(:870) 两处 `lstatSync` 判 junction 被 `try{}catch{}` 静默化——Windows 杀毒/索引锁 junction 偶发 EPERM 时 `isLink` 保持 false → 跳过解链 → 后续 `git worktree remove`/`rmSync`/`provisionDeps` 跟随 junction **删/改主仓 node_modules**。改双 fail-loud（lstat 失败 + 解链失败均 throw 阻断），保护主仓 node_modules。

## 方案（方案A 双 fail-loud，step3/4 用户确认）
- cleanup:742 lstat 静默 `catch{}` → throw fail-loud（EPERM 阻断 cleanup）
- cleanup:744-754 解链 catch → throw fail-loud
- _doctorReprovision:870 lstat + :872-878 解链同源改 throw（废弃 :878 best-effort「解链失败不阻断：交 provisionDeps」）
- 新增 `test/worktree-junction-fail-loud.test.mjs`（mock EPERM + 解链失败 + 正常解链）

## 不在范围内（Non-Goals）
- 不改 `git worktree remove` 本身（仅保护 junction 解链前置步骤）
- 不改 in-place-fallback / native-worktree 分支（无 junction）
- **不加自动 npm install 恢复**（fail-loud 显式错误让用户决策，符合 review 建议；自动恢复掩盖根因）
- 不改其他 `lstatSync` 用法（仅 junction 解链两处）
- ③ complete-stage 后门 / R5 4th persist（#2 defer 债）不在本变更范围
