---
author: flow-machine-draft
created_at: 2026-11-09T06:35:00.825Z
---
# 需求规格（Requirements）— 2026-11-09-archive-landing-visibility

## 功能需求

### FR-01: flow done 终态输出携带归档落库状态：已落库 → 成功行注明；未落库 → 输出末尾（最终可见行）高亮 🚨 与待执行 commit 命令（幂等 pathspec），退出码保持 0（exit≠0 语义已被测试门/收口失败占用，防 fail-closed 消费者误判）

- flow done 的终态成功行之后必须再输出归档落库状态：已落库 → 单行确认（「归档提交已落库」）；未落库 → 以 🚨 结尾块（最终可见行）提示后果 + 可直接执行的幂等 commit 命令（pathspec 构成复用 resolveArchiveCommitPathspecs 的稳定性分级）。
- 状态判定必须在终态打印时独立重算（不依赖归档子步是否 skip——断点续跑轮归档子步已 done 也要重算），复用 archiveLandedInHeadTree；退出码必须保持 0（未落库属设计内人工交接，不得与「收口失败」的 exit≠0 语义混用）。
- 归档提交的执行主体必须保持不变（agent 手工执行；工具只补暂存 + 打印命令——共享仓竞态与 hook 纪律，complete-handlers.js 既有注释论证）。

#### 场景：主路径（未落库 → 尾部高亮）

- Given flow done 全子步完成，归档目录已 staged 但 HEAD 树无该变更 archive/ 路径
- When flow done 打印终态
- Then 「✅ flow done 完成」行之后紧跟 🚨 尾块（后果 + commit 命令）且为输出最后内容；进程 exit 0

#### 场景：已落库

- Given HEAD 树已含 archive/<名>/ 路径
- Then 成功行后输出单行「归档提交已落库」确认，无 🚨 尾块

### FR-02: doctor 新增「归档提交残留」检查项：暂存区存在指向 changes/<名>/ 或 changes/archive/<名>/ 的条目且该变更未落 HEAD 树 → WARNING + 修复命令建议（只读 advisory，复用 archiveLandedInHeadTree 判定）

- doctor 必须新增只读检查项 archive_commit_residue：扫 `git diff --cached --name-status`，凡条目路径（src 或 dst）落在 `.sillyspec/changes/<名>/` 或 `.sillyspec/changes/archive/<名>/` 且该 `<名>` 未落 HEAD 树 → findings 点名 + WARNING + safe_actions 给修复命令（git commit -m "chore(archive): <名> 归档留档" -- 两侧目录）。
- 暂存区无此类条目 → PASSED；非 git 仓或 git 不可用 → skipped 不判红；必须只读（不 add/commit/删除任何东西）。

#### 场景：主路径（残留命中）

- Given 暂存区有 R/A/D 条目指向 changes/2026-x-x/ ↔ changes/archive/2026-x-x/，且 archive/2026-x-x/ 不在 HEAD 树
- When doctor 运行
- Then 该检查项 WARNING，findings 点名变更名，safe_actions 含修复 commit 命令

#### 场景：干净/非仓

- Given 暂存区无归档相关条目 → PASSED；非 git 仓 → skipped

### FR-03: 新增测试：终态渲染（落库/未落库两态）与 doctor 检查（残留命中/干净/非仓跳过）；既有 archive-commit-suggest-race 回归全绿

- FR-01 的终态渲染（纯函数）必须有落库/未落库两态测试；FR-02 检查项必须有残留命中/干净/非仓三态测试；既有 test/archive-commit-suggest-race.test.mjs 必须全绿。

#### 场景：主路径

- Given 实现合入
- When 跑新增测试与既有回归
- Then 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archive-landing-epilogue.test.mjs「renderArchiveLandingEpilogue 未落库态尾部含 🚨 与命令、落库态单行确认」
FR-02: test/archive-landing-epilogue.test.mjs「detectArchiveCommitResidue 残留命中 WARNING/干净 PASSED/非仓 skipped」
FR-03: test/archive-commit-suggest-race.test.mjs「既有竞态回归全绿」
