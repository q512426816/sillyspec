---
author: flow-machine-draft
created_at: 2026-10-13T06:46:39.576Z
---
# 需求规格（Requirements）— 2026-10-13-proto-reuse-register

## 功能需求

### FR-01: brainstorm「HTML 原型分级」含登记复用档（必须）

「展示设计方案」步的「HTML 原型分级」指引必须包含「免生成·登记复用」档，且该档必须同时写明四要素：①适用条件——用户已提供**可复跑**的 HTML 原型且覆盖本次 UI 面；②硬要求——把原型复制进 `{SPEC_ROOT}/changes/<变更名>/` 并按 `prototype-<名称>.html` 命名（execute 阶段按此命名扫描注入，不按此命名等于没登记）；③输出要求——声明原型来源路径与覆盖面；④排除项——截图/静态设计稿不可复跑，不适用本档，仍按「必须生成」产出可跑 HTML。

#### 场景：主路径——既有可复跑原型

Given 用户在 brainstorm 前提供了终稿 HTML 原型（如 fire-equipment 的 4497 行原型）
When agent 走到「展示设计方案」步做原型分级
Then 走登记复用档：把原型复制为变更目录下 `prototype-<名称>.html`、声明来源与覆盖面，不重画。

#### 场景：排除——静态截图

Given 用户只提供了截图/静态设计稿
When agent 做原型分级
Then 不适用登记复用档，仍按「必须生成」产出可复跑的 HTML 原型。

### FR-02: 分级决策从二选一扩为三选一（必须）

分级步操作第 6 条、铁律段、输出契约必须同步三选一口径：**生成原型 / 登记复用既有原型 / 写出跳过原因**——三者必居其一，不得沉默跳过；输出行从「原型文件路径 或 跳过原因」扩为「原型文件路径 或 复用声明（来源+覆盖面）或 跳过原因」。

#### 场景：主路径——三选一落在复用

Given 本次 UI 面已有可复跑既有原型
When agent 完成分级决策
Then 输出含复用声明（来源路径+覆盖面）与登记后的 `prototype-*.html` 路径，且暂停前该文件已在变更目录。

### FR-03: 周边四处指引同步复用口径（必须）

以下四处必须与 FR-01/02 口径一致：① `brainstorm-auto.js`「如果有用户提供的原型/截图」节含登记复用指引（含命名要求）；② `explore.js` 原型复用行注明复制时保留 `prototype-<名称>.html` 命名（execute 注入约定）；③ `gates.js` `warnMissingUiPrototype` 软提醒文案补登记复用出路（判定逻辑不变）；④ `design-facts.js` 自审清单 UI 原型项扩为「新生成或登记复用（复用须按 prototype-*.html 命名）或跳过原因记入风险登记」。

#### 场景：主路径——提醒兜底

Given agent 声明了登记复用但忘了把文件复制进变更目录
When brainstorm「生成规范文件」步 --done 触发软提醒
Then 提醒文案给出登记复用出路（复制为 prototype-<名称>.html），用户可照办或否决。

### FR-04: 测试覆盖与全绿（必须）

新增测试文件必须断言：brainstorm 分级文本含「登记复用」档及 `prototype-<名称>.html` 命名硬要求与静态稿排除项；三选一落在操作/铁律/输出三处；brainstorm-auto/explore/gates/design-facts 四处口径在场。收口前 `npm test` 必须全绿、`npm run lint` 必须绿。

#### 场景：主路径

Given 改动落盘
When 跑新增测试与全量测试
Then 新测试断言全过、既有测试零失败、lint 零错误。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/proto-reuse-register.test.mjs「分级含登记复用档且命名硬要求在场」
FR-02: test/proto-reuse-register.test.mjs「三选一口径落在操作/铁律/输出三处」
FR-03: test/proto-reuse-register.test.mjs「四处周边指引同步复用口径」
FR-04: test/proto-reuse-register.test.mjs（本文件即覆盖载体；全绿由收口实测对账保证）
