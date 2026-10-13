---
author: flow-machine-draft
created_at: 2026-10-13T15:09:29.968Z
---
# 需求规格（Requirements）— 2026-10-13-proto-real-code

## 功能需求

### FR-01: brainstorm「生成要求」升级为真码产物口径（必须）

「HTML 原型分级」步的「生成要求」节必须以「定稿原型＝真码产物」为口径，并禁止再以「生成一个独立的 HTML 文件（内联 CSS + JS）」作为定稿指令。必须同时含五要素：①同方言——真实组件库/设计 token/样式从项目源码或 node_modules 引入，不手搓仿制样式；②可复跑——能被本项目工具链跑起来（就近发现项目原型管线，没有则搭最小入口留在项目惯例位置）；③手绘单文件仅限一次性粗选对比、不得作为定稿原型（须引 frontend-apple-style 实证锚）；④例外——项目本身即单文件 HTML 方言（纯静态站）时单文件即真码，不适用手绘限定；⑤降级出路——无法同方言真码化（如目标平台无 HTML 运行面）时必须显式声明降级与理由请用户裁决留痕（对齐收口「UI 视觉证据」探针 error 门）。`prototype-<名称>.html` 入口命名（execute 注入契约）不变。

#### 场景：主路径——React 项目出原型

Given 项目前端为 React+antd 且 node_modules 在场
When brainstorm 走到「必须生成」档产出定稿原型
Then 入口为变更目录 `prototype-<名称>.html`，其中挂载真实组件（从项目源码或 node_modules 引入），浏览器打开即真实组件渲染，而非手搓仿制标签。

#### 场景：降级——小程序平台无 HTML 面

Given 目标平台无 HTML 运行面（如小程序原生）
When 无法同方言真码化
Then 显式声明降级与理由、请用户裁决留痕——不得静默交手绘件充当定稿。

### FR-02: explore 原型定位为粗选件并注明交接升级（必须）

explore「HTML 原型生成」节必须写明：探索期原型是粗选对比件、手绘单文件在探索期合法；交接行必须区分两种去向——已是可复跑真码的原型复制进变更目录走登记复用档（保留 `prototype-<名称>.html` 命名），手绘粗选件只是方向输入、进入 brainstorm 定稿时必须升级为真码，禁止把手绘件直接当定稿登记。

#### 场景：主路径——探索手稿进入 brainstorm

Given explore 产出了手绘粗选件且话题进入 brainstorm
When brainstorm 做原型分级
Then 该手稿仅作方向输入；定稿必须按 FR-01 生成真码（或登记其他可复跑真码），手稿不得复制充当变更原型登记。

### FR-03: design-facts 自审清单同步真码口径（必须）

design-facts 自审清单 UI 原型项必须扩为「新生成（定稿＝与实现同方言的真码产物，手绘仅限粗选）或登记复用（按 prototype-<名称>.html 命名）或跳过原因记入风险登记」。brainstorm 分级档位、命名约定、execute 注入逻辑必须零改动。

#### 场景：主路径——自审复核

Given agent 在 brainstorm 写 design.md 自审
When 过 UI 原型分级核对清单项
Then 该项提示定稿须真码同方言，手绘仅粗选。

### FR-04: 测试锁口径防漂移且全绿（必须）

新增测试必须断言：brainstorm 生成要求含真码/同方言/手绘仅粗选/frontend-apple-style 实证锚/单文件方言例外/降级出路，且旧手绘指令文案（「生成一个独立的 HTML 文件（内联 CSS + JS）」）已从 brainstorm prompt 移除；explore 粗选定位与交接升级在场；design-facts 清单含真码口径；brainstorm prompt 与 `buildUiGuidanceLines()` 共享关键词（真码/粗选/工具链）——两处规则源锁成同源防再漂移。收口前 `npm test` 必须全绿、`npm run lint` 必须绿、docs/prompt 三份派生文档同步零 miss。

#### 场景：主路径

Given 改动落盘
When 跑新增测试与全量测试
Then 断言全过、既有测试零失败、lint 零错误、`_verify` 对 brainstorm/explore 零 miss。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/proto-real-code.test.mjs「生成要求＝真码产物五要素在场且旧手绘指令移除」
FR-02: test/proto-real-code.test.mjs「explore 粗选定位与交接升级在场」
FR-03: test/proto-real-code.test.mjs「design-facts 清单真码口径 + 注入契约未动」
FR-04: test/proto-real-code.test.mjs「brainstorm 与 ui-visual 须知关键词同源锁」
