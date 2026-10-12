---
author: flow-machine-draft
created_at: 2026-10-12T01:32:18.864Z
---
# 需求规格（Requirements）— 2026-10-12-review-na-variant

## 功能需求

### FR-01: classifyReviewNeed 对「四问全 n/a：…」「边界并发四问：不适用…」「均不适用…」「n/a：…」「N/A」开头且其余信号不命中的轻量 design 判豁免（exemptEvidence 含「自述不适用」类证据）

- 盲维四问作答以整声明变体开头时——可选前缀「盲维四问/边界并发四问/四问」+ 可选冒号 + 可选限定词「全部/均/皆/都/全」+ 「不适用」或「n/a」（不分大小写）——classifyReviewNeed MUST 产生「盲维四问自述不适用」豁免证据（不产生「盲维四问有实质作答」reason），其余信号不命中时 MUST 整体判 required=false。

#### 场景：变体整声明豁免

- Given design.md v2 边界节作答为「四问全 n/a：纯 CSS 类，无状态/写路径/作用域引入。」、无承诺词、patch 无危险原语、变更名在采样桶外
- When classifyReviewNeed 定档
- Then required=false 且 exemptEvidence 含「自述不适用」

### FR-02: 逐问混合形态（任一问带实质内容，如「1. 乱序：n/a。2. 并发写：存在竞态…」）仍判需评审

- 盲维四问作答以逐问编号行开头（如「1. 乱序：n/a 纯展示。2. 并发写：…」）时，classifyReviewNeed MUST 按实质作答升级（不做逐问否定聚合判定），产生「盲维四问有实质作答」reason。

#### 场景：逐问形态不豁免

- Given design.md v2 边界节作答以「1. 乱序：n/a。」逐问行开头且任一问含实质内容
- When classifyReviewNeed 定档
- Then reasons 含「盲维四问有实质作答」

### FR-03: 回归：既有「不适用：…」口径不变仍豁免；实质作答仍升级；v1 槽3 分支与 v2 节分支同口径

- 既有「不适用：…」开头作答 MUST 仍豁免；实质作答（非变体开头）MUST 仍升级；变体判定 MUST 为单一实现（v1 槽3 分支与 v2 节分支同源调用，禁止两处独立正则）。

#### 场景：口径不回归

- Given 「不适用：无风险面」与「用队列缓冲晚到事件」两个既有形态作答
- When classifyReviewNeed 分别定档
- Then 前者豁免证据含「自述不适用」、后者 reasons 含「实质作答」，且两分支判定经同一 helper

### FR-04: 新用例先红后绿；全量测试零失败

- 新增用例 MUST 在实现前失败（红）、实现后通过（绿）；全量测试套件（node test/run-tests.mjs）MUST 零失败。

#### 场景：全量绿

- When node test/run-tests.mjs
- Then 退出码 0、零失败文件

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-review.test.mjs「盲维不适用变体：整声明开头不误升级」
FR-02: test/flow-review.test.mjs「盲维不适用变体：逐问混合形态仍升级」
FR-03: test/flow-review.test.mjs「盲维不适用变体：既有口径回归（v1/v2 同源）」
FR-04: test/run-tests.mjs「全量零失败」
