---
author: flow-machine-draft
created_at: 2026-10-23T15:19:42.030Z
---
# 需求规格（Requirements）— 2026-10-23-flow-done-shared-repo-multi-session-frictions

## 功能需求

### FR-01: 归档面 staged（A/R）但 HEAD 树无本变更 archive 路径时，提示走 stderr 🚨 并附幂等命令与不执行后果；已落库时走 stdout 语义不变

- flow done 归档子步打印归档提交命令时，必须先做落库判定（`archiveLandedInHeadTree`：HEAD 树是否含 `.sillyspec/changes/archive/` 下本变更路径）；未落库必须以 stderr 升级 🚨 提示（含幂等可执行命令 + 不执行的后果说明），已落库必须保持既有 stdout 语义不变。

#### 场景：未落库半态

- Given 共享仓竞态下命令未被本会话执行（归档目录 staged A/R、HEAD 树无归档路径）
- When flow done 归档子步运行
- Then stderr 出现 🚨 与「立即执行」幂等命令及后果说明（advisory 升级不阻断归档链——design 死路 2 既有取舍，提示失败不阻断）

#### 场景：已落库

- Given HEAD 树已含本变更归档路径
- When 归档子步运行
- Then stdout 「一笔到位」提示语义不变（正文加落库态前缀「归档路径已在 HEAD 树」）

### FR-02: archiveLandedInHeadTree 纯函数三态有测试锚（落地/未落地/-changeName 后缀兼容形态）

- 落库判定必须是纯函数（headTreeFiles 由调用方喂入），三态必须有测试锚：落地命中、未落地不命中、目录名以 `-<changeName>` 后缀结尾的历史形态兼容命中。

#### 场景：三态

- When 分别喂入含本变更/不含/后缀兼容目录名的 headTree 清单
- Then 判定 true / false / true

### FR-03: 既有 archive-commit-suggest-race 套件绿；doc-ref-check 行号引用绿

- 归档提交竞态加固套件与 docs 行号引用检查必须全绿；本变更不得引入其他测试面回归。

#### 场景：验收

- When 跑 test/archive-commit-suggest-race.test.mjs 与 test/doc-ref-check.test.mjs
- Then 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archive-commit-suggest-race.test.mjs「runArchiveChain 真链：未落库态 stderr 升级与幂等命令」；test/archive-commit-suggest-race.test.mjs「已落库态 stdout 语义不变」
FR-02: test/archive-commit-suggest-race.test.mjs「archiveLandedInHeadTree 三态判定」
FR-03: test/archive-commit-suggest-race.test.mjs（套件）；test/doc-ref-check.test.mjs
