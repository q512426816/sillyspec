---
author: flow-machine-draft
created_at: 2026-11-21T15:51:52.927Z
---
# 需求规格（Requirements）— 2026-11-21-shadow-dispatch-form-respect

## 功能需求

### FR-01: 声明 --no-review 或 --turbo 形态的变更，其 brainstorm/plan/execute 收口不再派发影子审查，对照账 skips 留痕理由含形态表述

- 收口影子派发链（`dispatchShadowReview` mode=create）在既有前置校验最前必须新增形态免评审检查：读变更 `flow-state.yaml`，凡 `review_force === false`（--no-review 声明）或 `turbo === true`（--turbo 声明），必须跳过派发且禁止向平台创建影子 mission/worker，同时在影子对照账 skips 段留痕一条 reason 含 `form-review-exempt` 标识与形态表述（免评审声明）的条目。

#### 场景：no-review 形态收口跳派留痕

- Given：轻档（S1）变更 `flow-state.yaml` 含 `review_force: false`，平台在线。
- When：brainstorm 收口触发 `dispatchShadowReview({mode:'create'})`。
- Then：返回 `skipped: true` 且 reason 含 `form-review-exempt`；shadow-ledger.json skips 尾部新增该 change/stage 条目；平台侧无 mission 创建、无 worker 派发。

#### 场景：turbo 形态收口同跳

- Given：`flow-state.yaml` 含 `turbo: true`（不论 review_force 取值）。
- When：同上。
- Then：同上（skip + form-review-exempt 留痕 + 零平台派发）。

#### 场景：run 跑道变更不命中（flow-state 缺失放行）

- Given：变更目录无 `flow-state.yaml`（run 五阶段跑道变更，未参与 thin）。
- When：同上。
- Then：不命中形态 skip，走既有链路（档位/shadow/probe 既有判定），行为与改动前逐字一致。

### FR-02: 未声明免评审形态的轻档变更影子照派，且「影子审查已后台派发」披露行在收口命令退出前同步打出（不再 fire-and-forget 丢输出）

- 收口门（`src/run/gates.js`）的影子派发触发段必须改为 await 同步执行（`dispatchShadowReview` 自身 catch-all 永不抛、网络面有界，await 安全）：未命中形态 skip 时，「ℹ️ 影子审查已后台派发（mission …）」披露行必须在收口命令进程退出前出现在 stdout；禁止恢复 fire-and-forget 的孤儿 Promise 形态。

#### 场景：派发成功披露行同步可见

- Given：非免评审形态轻档变更 + 平台在线。
- When：收口命令执行完毕退出。
- Then：stdout 含 missionId 的影子派发披露行已打出（await 保证时序）。

#### 场景：平台不可用不 hang 收口

- Given：平台离线 / probe 失败。
- When：收口执行。
- Then：影子走既有 skip 静默记账（无 ℹ️ 行），收口命令正常退出、门判定不受影响。

### FR-03: 档位判定、ceremony.shadow 开关、幂等闸、probe 前置等既有影子链路逻辑零改动，缺省行为对非免评审形态变更不变

- 本变更禁止改动档位判定（tier 文件读取）、ceremony.shadow 开关、幂等闸、probe 前置、影子命名空间隔离与 ledger 条目结构等既有影子链路逻辑；形态检查必须以新增前置校验项方式插入——非免评审形态（含 `review_force: true` 强制评审档与未声明三态 null）的派发行为与既有 skip 文案逐字不变。已知归因变化（可接受）：免评审形态 + S2 重档的条目理由由 `tier-not-light` 改归因为 `form-review-exempt`（形态是更根本原因，skip 结果不变）。

#### 场景：既有 skip 理由不漂移

- Given：S2 重档且无免评审声明的变更。
- When：收口触发影子派发。
- Then：skip 理由仍为 `tier-not-light（…）` 既有文案逐字不变。

#### 场景：强制评审档不豁免

- Given：`flow-state.yaml` 含 `review_force: true`（--review 声明档）。
- When：收口触发影子派发。
- Then：不命中形态 skip，走既有链路照派。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/shadow-dispatch-form.test.mjs「形态免评审 skip：review_force=false / turbo=true 各 skip+ledger 留痕，flow-state 缺失放行」
FR-02: test/shadow-dispatch-form.test.mjs「gates 影子挂点同步化：源码结构断言 await 语义（孤儿 .catch fire-and-forget 形态不存在）」
FR-03: test/shadow-dispatch-form.test.mjs「既有链零改动：非免评审形态走既有链 + tier-not-light 既有文案逐字 + review_force=true 不豁免」
