---
author: flow-machine-draft
created_at: 2026-10-23T15:39:59.137Z
---
# 需求规格（Requirements）— 2026-10-23-push-plan-anchor-batch-perf

## 功能需求

### FR-01: 锚点可解析性判定合并为单次批量调用，逐锚 spawn 消除

- `computeEffectiveBase` 的锚点解析必须以单次 `git cat-file --batch-check`（按输入序回读）批量完成，禁止对每个锚点各起一次 `rev-parse` 进程；解析结果须保留「输入短哈希 → 解析后完整 sha」映射供后续祖先判定使用。

#### 场景：多锚批量

- Given 43 个 scan 锚点
- When 计划层解析
- Then 批量调用恰 1 次 git 进程，逐锚 spawn 为 0

### FR-02: 预存坏锚点警告收敛为单行摘要

- 不可解析/非 HEAD 祖先的锚点警告必须合并为单行（总数+分类计数+首 3 锚点标识），禁止逐锚一行刷屏；live 锚点的抬升警告保持逐条（低频且需要归因）。

#### 场景：43 个预存坏锚点

- When 计划层跑完整锚点集
- Then warnings 中坏锚点相关条目恰 1 行

### FR-03: 非 dry-run 路径消除第二次 ls-remote 网络探测

- `runPush` 已 fetch 目标分支后，必须将远端跟踪引用解析结果传入 `planPush`（既有 `remoteSha` 入参），非 dry-run 路径不得再发起第二次 `ls-remote` 网络探测；dry-run 与推送前安全再探的既有探测保持不变。

#### 场景：真推送

- Given 非 dry-run 且 fetch 成功
- When 计划层构建
- Then 计划内网络探测 0 次（base 取自 fetch 后的远端跟踪引用）

### FR-04: 计划输出语义不变，既有测试面全绿

- base/groups/守卫判定与警告分类语义必须与改前一致；既有 push 测试面（plan+cli）必须全绿。

#### 场景：验收

- When 跑 test/push-plan.test.mjs 与 test/push-cli.test.mjs
- Then 全绿，且 dry-run 计划与改前同构

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/push-plan.test.mjs「签名标记解析纯函数」（套件回归覆盖 computeEffectiveBase 批量路径）；test/push-cli.test.mjs「--dry-run 零写盘」（真仓 43 锚形态）
FR-02: test/push-cli.test.mjs「--dry-run 零写盘」（警告单行断言）
FR-03: test/push-cli.test.mjs「③ 快进 push + --undo」（真推送路径回归）
FR-04: test/push-plan.test.mjs（套件）；test/push-cli.test.mjs（套件）
