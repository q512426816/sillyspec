---
author: flow-machine-draft
created_at: 2026-10-06T05:44:41.765Z
---
# 需求规格（Requirements）— 2026-10-06-archive-cmd-race-and-brief

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: 归档建议命令的 src 侧 pathspec 仅含 HEAD 树在册路径（转瞬即逝的源侧 A 条目不进命令）；dst 侧为单条归档目录 pathspec；正常形态下打印命令可原样执行成功（exit 0）

- 必须：归档收尾建议命令的源侧（`changes/<名>/` 非归档）pathspec 只允许出现 HEAD 树在册路径；归档侧收拢为单条 `.sillyspec/changes/archive/<名>/` 目录 pathspec（该目录为本变更专属，工具既有窄化 add 同一前提）；knowledge/docs 共享面条目须 HEAD 在册或工作区在场方可入列。正常归档形态下打印命令原样执行必须 exit 0 且提交包含归档目录文件与源侧删除。

#### 场景：主路径

- Given：变更归档完成、暂存面为归档 rename + 新增 + knowledge 修改的正常形态
- When：执行打印的一笔到位 commit 命令
- Then：exit 0；`git show --name-status` 含 archive/ 侧文件与源侧 rename/删除；源侧 pathspec 全部 HEAD 在册

### FR-02: 竞态注入形态（源侧幽灵 A 条目进暂存区后消失）下，打印命令仍可执行成功且提交面不含幽灵路径

- 必须：共享仓并行会话在「打印→执行」窗口内改动暂存区（幽灵 A 条目先进后出）时，打印命令仍可执行成功（exit 0），且幽灵路径不得进入提交面；被丢弃的瞬时条目必须显式提示（数量+路径）。建议块必须附带 fallback 指引：执行报 pathspec 不匹配时以 `git diff --cached --name-only` 全量重核替换。

#### 场景：竞态注入

- Given：源侧幽灵文件被暂存（A）后 runArchiveChain 打印建议，随后条目被移出暂存区（模拟兄弟会话瞬改）
- When：原样执行打印命令
- Then：exit 0；提交面不含幽灵路径；打印含「丢弃 N 个瞬时暂存条目」提示

### FR-03: flow done 首轮中断简报的「待办」不再包含本轮已完成/已跳过的子步（与重入后口径一致）

- 必须：中断简报的「待办」= 全部子步 − 盘上历史 done − 本轮 doneList（含 skip）− 中断子步；禁止把本轮刚完成/跳过的子步列入待办（st 运行头快照不回填导致的陈旧读必须消除）。

#### 场景：主路径

- Given：无任何预完成子步的变更，artifacts/ledger/patch 本轮完成后 review 中断
- When：读取中断简报「待办」行
- Then：待办恰为 probes、distill、archive、events（不含 artifacts/ledger/patch/review）

### FR-04: 新增单元测试覆盖上述三点并纳入 test:core，test:core 全绿

- 必须：新增测试文件覆盖 FR-01/02（纯函数 pathspec 构成 + runArchiveChain 真链执行打印命令两形态）与 FR-03（待办计算函数），登记进 package.json test:core；test:core 全量跑绿。

#### 场景：主路径

- Given：仓库含本变更实现
- When：`npm run test:core`
- Then：全部用例通过，含新增测试文件

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archive-commit-suggest-race.test.mjs「resolveArchiveCommitPathspecs 构成（HEAD 锚 src/目录 dst/共享面在场判定）」+「runArchiveChain 正常形态打印命令原样执行 exit 0」
FR-02: test/archive-commit-suggest-race.test.mjs「竞态注入：幽灵 A 条目被丢弃且命令仍可执行/瞬时条目提示在场」
FR-03: test/flow-done-fail-brief.test.mjs「remainingSubstepsAtFail 并集口径（历史 done + 本轮 doneList + failed 剔除）」
FR-04: test/archive-commit-suggest-race.test.mjs「test:core 清单驻留断言」
