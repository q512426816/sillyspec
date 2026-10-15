---
author: flow-machine-draft
created_at: 2026-10-15T08:30:00.000Z
---
# 需求规格（Requirements）— 2026-10-15-ui-proto-form-config

## 功能需求

### FR-01: local.yaml ui_prototype 段解析（必须）

`src/ui-visual.js` 必须新增 `readUiPrototypeForm(specBase)`：用 js-yaml 读 local.yaml 顶层 `ui_prototype` 段（fail-soft），返回 `{ registered, form, ruling, rulingComplete, repos }`。语义：段缺席 → `registered:false`；`form: real-code` → 登记真码；`form: single-html` 须带 `ruling{by,at,reason}` 全三字段（缺任一 → `rulingComplete:false`）；`repos.<子仓键>` 同构 override。非法值/文件不可读 → `registered:false` 零抛出。

#### 场景：主路径——豁免登记

Given local.yaml 含 `ui_prototype: { form: single-html, ruling: { by, at, reason } }`
When readUiPrototypeForm(specBase)
Then registered=true、form='single-html'、rulingComplete=true。

#### 场景：边界——豁免缺裁决字段

Given form=single-html 而 ruling 缺 reason
Then rulingComplete=false（消费方须响警告——静默漂移禁止）。

### FR-02: 多仓 override 按触达路径优先（必须）

必须新增 `resolveUiPrototypeFor(specBase, paths=[])`：paths 与 local.yaml `repos:` 注册路径（key→path 映射）前缀匹配，命中子仓且其 ui_prototype.repos 有 override 时必须以该子仓形态优先；未命中必须走仓级兜底。返回形态条目列表（供须知组合）。

#### 场景：主路径——三仓变更

Given repos 注册 subgrid/spdemo 两子仓且各有 override，触达路径落在 spdemo 下
Then spdemo 的 override 生效，未触达 subgrid 不并列。

### FR-03: buildUiGuidanceLines 四态注入（必须）

`buildUiGuidanceLines(specBase=null, paths=[])` 必须保留既有四条须知（零变化），并追加第 5 节「本仓原型形态」按态注入：①real-code 登记——定稿须真码，无管线先单开轻量变更搭最小入口；②single-html+完整 ruling——豁免生效（含 by/at 摘要），自包含 HTML 须带真值 token 来源声明；③single-html 缺 ruling——警告豁免登记不完整（静默漂移），指引补齐；④未登记——强提醒（提醒不阻断）：本次按阶梯执行（真实前端工具链→真码；无→登记豁免），收口前补登记 local.yaml。`specBase=null` 时零新增行（既有无参调用兼容，生态命令词禁入——guidance-output-neutrality 契约）。

#### 场景：主路径——未登记仓

Given local.yaml 无 ui_prototype 段且 flow start 检测 UI 触达
When 须知注入
Then 含「未登记」「阶梯」「收口前补登记」关键词的强提醒块。

### FR-04: 生成要求四句修正与声明面同步（必须）

`src/stages/brainstorm.js`「生成要求」必须含四项：①token 数值抄进自定义 CSS 变量＝复刻≠引入，仍属手搓仿制；②历史原型先例同为单文件不构成管线存在——查无真码管线时先单开一个轻量变更搭最小入口（bootstrap 与业务变更分离）；③生成档输出必带素材来源声明（真值 token 源文件路径/组件来源/入口位置）——「高保真」＝组件即实现原料，不是「看起来像」；④本仓 local.yaml `ui_prototype` 登记形态优先于本节默认阶梯（多仓 repos override 优先）。design-facts 自审清单 UI 原型项与 gates.js 软提醒文案同步「未登记先登记」指引。

#### 场景：主路径——文本锚

Given 改动落盘
When grep brainstorm 生成要求
Then 四句锚与 ui_prototype 引用在场；design-facts/gates 同步。

### FR-05: 测试覆盖与全绿（必须）

新增测试必须断言：readUiPrototypeForm 五态（缺席/真码/完整豁免/缺字段豁免/repos override）、resolveUiPrototypeFor 优先级、buildUiGuidanceLines 四态+无参兼容、brainstorm 四句锚、design-facts/gates 同步锚。收口前 `npm test` 必须全绿、`npm run lint` 必须绿、docs/prompt 同步零 miss。

#### 场景：主路径

Given 改动落盘
When 跑新增测试与全量
Then 全过、零回归、lint 零错误。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/ui-prototype-form.test.mjs「readUiPrototypeForm 五态解析」
FR-02: test/ui-prototype-form.test.mjs「多仓 override 按触达路径优先」
FR-03: test/ui-prototype-form.test.mjs「四态注入 + 无参兼容零新增」
FR-04: test/ui-prototype-form.test.mjs「生成要求四句锚 + 声明面同步」
FR-05: test/ui-prototype-form.test.mjs（全绿由收口实测对账保证）
