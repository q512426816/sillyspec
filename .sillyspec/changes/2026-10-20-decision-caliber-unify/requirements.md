---
author: flow-machine-draft
created_at: 2026-10-20T02:28:57.944Z
---
# 需求规格（Requirements）— 2026-10-20-decision-caliber-unify

## 功能需求

### FR-01: type/status 值集单一源：decisions-io 导出正典集，decision-distill 入选集自其派生（类型=正典去 scope），零独立字面集

- 决策 type/status 正典值集必须由单一模块（src/decision-values.js）导出；decisions-io 写入白名单与 decision-distill 入选集必须从其导入派生，禁止保留独立字面集。
- 正典 type 必须为 8 值：architecture、compatibility、boundary、definition、process、scope、feasibility、consistency；正典 status 必须为 7 值：confirmed、accepted、implemented、rejected、proposed、superseded、draft。
- 蒸馏入选类型集必须恒等于正典 type 去 scope（7 值）；蒸馏入选状态集必须为 confirmed、accepted、implemented 三值。

#### 场景：主路径

Given src/decision-values.js 导出正典集
When decisions-io 校验与 decision-distill 裁决引用值集
Then 两处零字面重复定义（导入派生），scope 在写入面合法、在蒸馏入选面恒排除

### FR-02: decisions add 可写 feasibility/consistency（写入白名单对齐蒸馏入选面）

- `decisions add` 与底层 renderDecisionEntry 必须接受 type=feasibility 与 type=consistency（当前白名单拒绝而蒸馏想收的值）；正典 8 值外的 type 必须照旧拒绝（fail-fast 不放松）。

#### 场景：主路径

Given renderDecisionEntry 入参 type=feasibility / type=consistency
When 渲染条目
Then 零抛错正常产出；type=term / type=risk 等正典外值仍抛「type 白名单外」

### FR-03: status=implemented 条目蒸馏入选（IMPLEMENTED_STATUSES 加 implemented）

- status=implemented 且 type 属蒸馏入选类型的条目必须被 dispositionOf 判为入选（implemented 裁决），随蒸馏链进知识库；superseded/proposed/draft 状态照旧不入选。

#### 场景：主路径

Given decisions.md 含 status=implemented、type=architecture 条目
When distillIntoKnowledge 执行
Then 该条目写盘入选；status=draft 同 type 条目不入选

### FR-04: brainstorm 两处 type 提示清单与正典集一致（term/premise/risk 等散值从提示面清除）

- src/stages/brainstorm.js 两处决策记录模板的 type/status 值清单必须与正典集逐值一致（type 8 值、status 7 值）；term/premise/risk/unresolved 等正典外值必须从提示面清除；docs/prompt/brainstorm.md 渲染产物必须再生成保持同步。

#### 场景：主路径

Given brainstorm.js 两处模板清单
When 提取清单值与正典集对比
Then 集合相等（零多值零缺值）；渲染产物含同样清单

### FR-05: 手写开放世界兼容不变：解析宽容保留、存量散值条目行为零变化

- parseDecisions 对正典外散值条目（历史 40+ 种 type）必须照旧解析保留（不抛错）；其蒸馏行为必须零变化——非入选集条目照旧解析保留不写盘，已有知识库条目不受影响。

#### 场景：主路径

Given 含 type=term 条目的 decisions.md（存量形态）
When parseDecisions + distillIntoKnowledge
Then 解析零报错，该条目不入选不写盘（与改动前行为逐字节一致）

### FR-06: 新增/更新测试全绿，decisions-io/decision-distill 相关既有套件零回归

- 新增 test/decision-caliber-unify.test.mjs 必须覆盖 FR-01..FR-05 行为断言且全绿。
- 既有 decisions-io、decision-distill-flat-list、decision-distill-heading-variants、decision-anchor-backfill 四套件必须零回归。

#### 场景：主路径

Given 本变更交付完成
When node --test 跑新套件与四既有套件
Then 全部 pass、零 fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decision-caliber-unify.test.mjs「① 单一源派生」
FR-02: test/decision-caliber-unify.test.mjs「② 写入白名单对齐」
FR-03: test/decision-caliber-unify.test.mjs「③ implemented 入选」
FR-04: test/decision-caliber-unify.test.mjs「④ brainstorm 提示清单同步」
FR-05: test/decision-caliber-unify.test.mjs「⑤ 开放世界兼容」
FR-06: test/decision-caliber-unify.test.mjs「⑥ 既有套件零回归」
