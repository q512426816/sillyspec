---
author: flow-machine-draft
created_at: 2026-10-20T14:00:00.000Z
---
# 需求规格（Requirements）— 2026-10-20-proto-provenance-hardline

## 功能需求

### FR-01: 生成要求溯源硬边界（必须）

brainstorm「生成要求」必须新增「产物必须可溯源到源码」硬边界，含四要素：①三通道枚举——本仓原型管线编译产物 / 项目真实运行面渲染捕获产物（dev server 或预览路由渲染真实组件后离线化导出；捕获脚本可随变更交付，捕获物仍是渲染结果非手写）/ 登记复用的既有真码原型；②手写 HTML 禁令——不得作为变更产物交付（含从截图抄色值复刻）；③对比稿/视觉稿边界——凡供用户评审决策的原型即定稿提案，无粗选豁免（粗选仅限口头或一次性草稿快速比选，不落变更目录充当交付物）；④现状对照要求——重做/视觉类变更的现状基线必须真实渲染捕获（现状页/现有截图），禁止凭主题默认值想象或手写复刻现状。

#### 场景：主路径——页面级原型管线撑不起

Given 本仓原型管线只支持组件级（如仅相对导入 primer），页面级原型需要完整依赖树（antd/状态库/别名导入）
When agent 需产页面级定稿原型
Then 按通道②用项目真实运行面渲染（dev 路由渲染真实组件）后离线化捕获交付——而不是自创旁门或退回手写 HTML。

#### 场景：排除——手写视觉稿

Given agent 想手写单文件 HTML 作为现状 vs 改进对比稿供用户决策
Then 禁令生效：供用户决策即定稿，必须走三通道之一。

### FR-02: 声明面同步（必须）

ui-visual.js 须知（buildUiGuidanceLines 前四条区）、design-facts.js 自审清单 UI 原型项、gates.js 软提醒文案必须同步该口径（溯源三通道/手写禁令/对比稿即定稿），保持各面与生成要求一致不漂移。

#### 场景：主路径

Given 改动落盘
When grep 四处文本面
Then 溯源口径在场且措辞同源。

### FR-03: 测试覆盖与全绿（必须）

新增测试必须断言生成要求四要素文本锚与三处声明面同步锚。收口前本变更测试面必须全绿（新增测试+受影响既有面 ui-visual/proto 系列）、npm run lint 必须绿、docs/prompt 同步零 miss；全量套件若存在与本变更无关的既有红（stash 实证归属并行会话在途债），必须留痕归属而非静默忽略。

#### 场景：主路径

Given 改动落盘
When 跑新增测试与全量
Then 全过、零回归、lint 零错误。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/proto-provenance-hardline.test.mjs「生成要求四要素锚」
FR-02: test/proto-provenance-hardline.test.mjs「三处声明面同步锚」
FR-03: test/proto-provenance-hardline.test.mjs（全绿由收口实测对账保证）
