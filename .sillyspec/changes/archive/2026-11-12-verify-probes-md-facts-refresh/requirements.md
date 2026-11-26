---
author: qinyi
created_at: 2026-11-11T23:46:10.339Z
---
# 需求规格（Requirements）— 2026-11-12-verify-probes-md-facts-refresh

## 功能需求

### FR-01: writeVerifyFacts 落盘前，若变更目录 verify-result.md 存在，则从 md 重解析并刷新 handover / dbScriptDeclarations / matrixPartialRows 三段（md 为真相源）

- verify-probes 命令落盘 facts 时，若变更目录存在 verify-result.md，必须以该 md 当前内容刷新 handover / dbScriptDeclarations / matrixPartialRows 三段（md 为真相源，重跑即对齐）。

#### 场景：主路径

Given 变更目录有 verify-result.md（含两行移交项表格）
When 跑 `sillyspec verify-probes --change X`
Then facts.handover.count = 2 且各行 type/severity 正确；md 清空后重跑 → count 归零

### FR-02: verify-result.md 不存在时行为与现状完全一致（不产新段）

- 变更目录无 verify-result.md 时，落盘禁止产出 handover 等三段（与现状零回归）。

#### 场景：主路径

Given 变更目录无 verify-result.md（未 --init 过）
When 跑 verify-probes 命令
Then facts 中无 handover 字段（与改动前一致）

### FR-03: conclusion 段维持现状（解析器在 stage-contract，分层单向不引入反向 import）

- 本变更禁止引入 verify-probes → stage-contract 的反向 import；conclusion 段必须维持既有产出通道（gates verify 收尾 backfill）。

#### 场景：主路径

Given 任意调用路径
When writeVerifyFacts 落盘
Then facts.conclusion 仅来自 prev 保留或 backfill，本命令不解析结论枚举

### FR-04: 新增测试覆盖：md 含移交项表格时重跑命令后 facts.handover 反映 md 内容

- 新增测试必须覆盖 md 在场解析、md 缺场不产段、md 改写后重跑刷新三个分支。

#### 场景：主路径

Given test/verify-facts-v2.test.mjs 新用例「writeVerifyFacts md 派生段刷新」
When `node --test test/verify-facts-v2.test.mjs` 执行
Then 三分支断言（在场解析 / 缺场不产段 / 清空归零）全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/verify-facts-v2.test.mjs「writeVerifyFacts md 派生段刷新：verify-result.md 在场时重解析 handover 等三段，缺场时不产段」
FR-02: test/verify-facts-v2.test.mjs「writeVerifyFacts md 派生段刷新：verify-result.md 在场时重解析 handover 等三段，缺场时不产段」（缺场分支断言）
FR-03: 不适用：反向 import 禁止为静态结构约束，由模块 import 关系保障（src/verify-probes.js 无 stage-contract import，代码评审面）
FR-04: test/verify-facts-v2.test.mjs「writeVerifyFacts md 派生段刷新：verify-result.md 在场时重解析 handover 等三段，缺场时不产段」（含清空归零分支）
