---
author: flow-machine-draft
created_at: 2026-11-08T04:59:59.870Z
---
# 需求规格（Requirements）— 2026-11-08-bare-commit-attribution-narrow

## 功能需求

### FR-01: 纯裸提交（subject 无变更名括号且无 task-NN token）touch 的文件被剔除出 own 面/冻结面/FR 域路由

- **必须**：`buildCommitAttribution` 聚合时记录每文件是否存在带 task-NN token（`task-\d+`）或变更名的 touch；`isForeignByCommit` 对「存在无名 touch 且全部无名 touch 均无 task token 且 owners 不含本变更名」的文件返回 true（判 foreign）。
- **必须**：三消费面同刀继承——`splitOwnVsForeignDiffFiles`（own/foreign 切分）、`filterCommittedFace`（patch 冻结面）、`attributedChangedFiles`（FR 域路由/实测面，经 splitOwnVsForeignDiffFiles 单源）均按新语义剔除。

#### 场景：主路径（坑② 10-28 实证复现）

Given baseline..HEAD 内存在他侧归档变更的 chore 提交（subject 如 `chore: gen release record`，无变更名括号、无 task token）touch 了 `deploy/scripts/gen-release-record.sh`，When 本变更收口走归属切分，Then 该文件判 foreign——不进冻结面（change.patch files）、不进 FR 域路由、不出现在「归属收窄」own 面。

#### 场景：Merge 提交

Given 窗口内有 `Merge branch 'x'` 提交 touch 并行分支文件（无 token 无变更名），When 归属切分，Then 该文件判 foreign 剔除。

### FR-02: 带本变更名或含 task-NN token 的提交 touch 的文件恒 own（fail-closed 不变）

- **必须**：subject 含本变更名（括号形态）的 touch → own；subject 含 `task-NN` token 的无名 touch → own（交付协议证据——thin-tasks-v3 起勾选证据=task token 提交，收口哨兵按它核）。
- **禁止**：因本变更细分把带 task token 的他侧提交误剔（无法区分谁的 task token——保守 own，不劣于现状）。

#### 场景：本变更交付提交

Given 本变更交付提交 subject 为 `feat(x): 摘要 (task-01/02/03)`（无变更名括号），When 归属切分，Then 其 touch 的交付文件恒 own——不误剔进冻结缺口。

### FR-03: 误剔兜底面保持——收口「提交面夹带嫌疑 advisory」不改

- **必须**：既有 advisory（提交面文件未被本变更声明面提及 → 点名提示补声明/pathspec 隔离）行为不变——用户手动裸提交被新语义误剔时，收口对账仍会点名该文件。

#### 场景：用户手动裸提交

Given 用户手动提交了一个本变更交付文件但 subject 无 token 无变更名，When 收口，Then 该文件被判 foreign 剔出冻结面，且提交面对账 advisory 点名它（用户看到后补声明或接受缺口）。

### FR-04: 既有归因测试面按新口径改写后全绿

- **必须**：`test/commit-attribution-split.test.mjs`（锁定语义 2 改口径：裸提交 touch 恒 own → 纯裸判 foreign、token 裸恒 own）与 `test/filter-committed-face.test.mjs`、`test/hunk-gate-commit-attribution.test.mjs`、`test/foreign-own-priority.test.mjs` 等归因消费面测试全绿。

#### 场景：回归

Given 判定细分落盘，When 运行上述测试文件，Then 全部用例通过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/commit-attribution-split.test.mjs「① 解析纯函数：标题变更名提取与归属聚合（细分断言）+ ② 混窗集成：纯裸剔除/token 保留」
FR-02: test/commit-attribution-split.test.mjs「② 混窗集成：token 裸提交与具名提交文件保留 own」
FR-03: test/commit-attribution-split.test.mjs「② 混窗集成（advisory 面不动——经 flow.js 既有面，绑定到集成回归）」
FR-04: test/filter-committed-face.test.mjs + test/hunk-gate-commit-attribution.test.mjs + test/foreign-own-priority.test.mjs「归因消费面回归」
