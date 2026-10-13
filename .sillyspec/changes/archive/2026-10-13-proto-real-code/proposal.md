---
author: flow-machine-draft
created_at: 2026-10-13T15:09:29.967Z
---
# 提案书（Proposal）— 2026-10-13-proto-real-code

## 动机

任务原话转写：用户实证：brainstorm 生成的原型是手绘假 HTML，与实际前端代码栈不搭。根因是规则自相矛盾：ui-visual.js flow start 须知要求「定稿原型必须是可复跑的真码产物（与实现同方言、能被本项目工具链构建），手绘单文件仅限一次性粗选对比」（frontend-apple-style 实证），但 brainstorm.js 生成要求字面指令「生成一个独立的 HTML 文件（内联 CSS + JS），单文件浏览器直接打开」——步骤 prompt 战胜一次性 advisory，agent 照做手绘件。堵法：brainstorm 生成要求升级为真码产物口径（与 ui-visual 须知同源），explore 定位粗选件+交接升级，测试锁两处口径防再漂移。

成功标准：
- brainstorm「生成要求」升级：定稿原型＝真码产物——与实现同方言（真实组件库/设计 token 从项目源码或 node_modules 引入，不手搓仿制样式）、可复跑（本项目工具链/原型管线跑起来，就近发现已有管线没有搭最小入口）；手绘单文件仅限一次性粗选对比不得作定稿（引 frontend-apple-style 实证）；纯单文件 HTML 方言项目例外不适用手绘限定；无法同方言真码化时显式声明降级请用户裁决留痕（对齐收口 UI 视觉证据探针 error 门）
- explore 原型生成定位为粗选件：手绘在探索期合法，交接行注明——已是可复跑真码按登记复用档复制（保留 prototype-<名称>.html 命名），手绘粗选件只是方向输入、brainstorm 定稿须升级真码不得直接登记
- design-facts 自审清单 UI 原型项同步「新生成（定稿＝真码同方言，手绘仅粗选）」口径；brainstorm 分级/命名/execute 注入契约不动
- 新增测试：brainstorm 生成要求含真码/同方言/手绘仅粗选/实证锚/例外/降级出路且旧手绘指令文案已移除；explore 粗选定位与交接升级在场；brainstorm prompt 与 buildUiGuidanceLines 关键词同源（真码+粗选+工具链）锁防漂移；npm test 全绿、lint 绿、docs/prompt 同步零 miss

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. brainstorm「生成要求」升级：定稿原型＝真码产物——与实现同方言（真实组件库/设计 token 从项目源码或 node_modules 引入，不手搓仿制样式）、可复跑（本项目工具链/原型管线跑起来，就近发现已有管线没有搭最小入口）；手绘单文件仅限一次性粗选对比不得作定稿（引 frontend-apple-style 实证）；纯单文件 HTML 方言项目例外不适用手绘限定；无法同方言真码化时显式声明降级请用户裁决留痕（对齐收口 UI 视觉证据探针 error 门）
2. explore 原型生成定位为粗选件：手绘在探索期合法，交接行注明——已是可复跑真码按登记复用档复制（保留 prototype-<名称>.html 命名），手绘粗选件只是方向输入、brainstorm 定稿须升级真码不得直接登记
3. design-facts 自审清单 UI 原型项同步「新生成（定稿＝真码同方言，手绘仅粗选）」口径；brainstorm 分级/命名/execute 注入契约不动
4. 新增测试：brainstorm 生成要求含真码/同方言/手绘仅粗选/实证锚/例外/降级出路且旧手绘指令文案已移除；explore 粗选定位与交接升级在场；brainstorm prompt 与 buildUiGuidanceLines 关键词同源（真码+粗选+工具链）锁防漂移；npm test 全绿、lint 绿、docs/prompt 同步零 miss

## 成功标准（可验证）

1. brainstorm「生成要求」升级：定稿原型＝真码产物——与实现同方言（真实组件库/设计 token 从项目源码或 node_modules 引入，不手搓仿制样式）、可复跑（本项目工具链/原型管线跑起来，就近发现已有管线没有搭最小入口）；手绘单文件仅限一次性粗选对比不得作定稿（引 frontend-apple-style 实证）；纯单文件 HTML 方言项目例外不适用手绘限定；无法同方言真码化时显式声明降级请用户裁决留痕（对齐收口 UI 视觉证据探针 error 门）
2. explore 原型生成定位为粗选件：手绘在探索期合法，交接行注明——已是可复跑真码按登记复用档复制（保留 prototype-<名称>.html 命名），手绘粗选件只是方向输入、brainstorm 定稿须升级真码不得直接登记
3. design-facts 自审清单 UI 原型项同步「新生成（定稿＝真码同方言，手绘仅粗选）」口径；brainstorm 分级/命名/execute 注入契约不动
4. 新增测试：brainstorm 生成要求含真码/同方言/手绘仅粗选/实证锚/例外/降级出路且旧手绘指令文案已移除；explore 粗选定位与交接升级在场；brainstorm prompt 与 buildUiGuidanceLines 关键词同源（真码+粗选+工具链）锁防漂移；npm test 全绿、lint 绿、docs/prompt 同步零 miss
