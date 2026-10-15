---
author: flow-machine-draft
created_at: 2026-10-15T08:55:17.622Z
---
# 提案书（Proposal）— 2026-10-15-ui-proto-form-config

## 动机

任务原话转写：四例原型形态偏档（fire-equipment/deploy-release-notes/knowledge-search/server-logs-panel）定稿原型形态契约，用户四点裁决：①缺省行为=强提醒登记（提醒不阻断）；②bootstrap 颗粒度=单开一个轻量变更先搭最小真码入口（管线建设与业务变更分离）；③豁免字段 schema=ruling{by,at,reason} 必填、缺失响警告；④多仓 override=repos.<子仓> 优先于仓级兜底。机制：local.yaml 新增 ui_prototype 段（form: real-code|single-html + ruling + repos 子仓 override）；工具三层引导——buildUiGuidanceLines 消费该段（flow start 须知与 brainstorm {UI_VISUAL_GUIDANCE} 注入同源）、生成要求文本修正（抄值≠引入/历史先例不构成管线/单开轻量变更 bootstrap/生成档来源声明必填）、收口软面查声明在场。

成功标准：
- readUiPrototypeForm 解析 local.yaml ui_prototype：form/ruling/repos override；未登记 registered=false；single-html 缺 ruling 字段标记 rulingComplete=false
- resolveUiPrototypeFor 按触达路径匹配 repos 子仓 override 优先、仓级兜底
- buildUiGuidanceLines(specBase) 按形态分四态注入：real-code 登记/豁免+完整 ruling/豁免缺 ruling 警告/未登记强提醒（含阶梯与收口前补登记）；无 specBase 时零新增（既有测试兼容）
- brainstorm 生成要求四句修正：token 抄值=复刻≠引入仍属手搓仿制；历史原型先例不构成管线存在；查无真码管线先单开轻量变更搭最小入口；生成档输出必带素材来源声明（token 源/组件来源/入口位置）——「高保真」=组件即实现原料
- design-facts 自审清单与 gates 软提醒同步登记指引
- 新增测试锁解析/优先级/四态注入/文本锚；npm test 全绿、lint 绿、docs/prompt 同步零 miss

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. readUiPrototypeForm 解析 local.yaml ui_prototype：form/ruling/repos override；未登记 registered=false；single-html 缺 ruling 字段标记 rulingComplete=false
2. resolveUiPrototypeFor 按触达路径匹配 repos 子仓 override 优先、仓级兜底
3. buildUiGuidanceLines(specBase) 按形态分四态注入：real-code 登记/豁免+完整 ruling/豁免缺 ruling 警告/未登记强提醒（含阶梯与收口前补登记）；无 specBase 时零新增（既有测试兼容）
4. brainstorm 生成要求四句修正：token 抄值=复刻≠引入仍属手搓仿制；历史原型先例不构成管线存在；查无真码管线先单开轻量变更搭最小入口；生成档输出必带素材来源声明（token 源/组件来源/入口位置）——「高保真」=组件即实现原料
5. design-facts 自审清单与 gates 软提醒同步登记指引
6. 新增测试锁解析/优先级/四态注入/文本锚；npm test 全绿、lint 绿、docs/prompt 同步零 miss

## 成功标准（可验证）

1. readUiPrototypeForm 解析 local.yaml ui_prototype：form/ruling/repos override；未登记 registered=false；single-html 缺 ruling 字段标记 rulingComplete=false
2. resolveUiPrototypeFor 按触达路径匹配 repos 子仓 override 优先、仓级兜底
3. buildUiGuidanceLines(specBase) 按形态分四态注入：real-code 登记/豁免+完整 ruling/豁免缺 ruling 警告/未登记强提醒（含阶梯与收口前补登记）；无 specBase 时零新增（既有测试兼容）
4. brainstorm 生成要求四句修正：token 抄值=复刻≠引入仍属手搓仿制；历史原型先例不构成管线存在；查无真码管线先单开轻量变更搭最小入口；生成档输出必带素材来源声明（token 源/组件来源/入口位置）——「高保真」=组件即实现原料
5. design-facts 自审清单与 gates 软提醒同步登记指引
6. 新增测试锁解析/优先级/四态注入/文本锚；npm test 全绿、lint 绿、docs/prompt 同步零 miss
