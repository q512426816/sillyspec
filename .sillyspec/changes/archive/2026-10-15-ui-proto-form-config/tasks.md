---
author: flow-machine-draft
created_at: 2026-10-15T08:55:17.622Z
---
# 任务注册表（Tasks）— 2026-10-15-ui-proto-form-config

- [x] task-01: readUiPrototypeForm 解析 local.yaml ui_prototype：form/ruling/repos override；未登记 registered=false；single-html 缺 ruling 字段标记 rulingComplete=false
- [x] task-02: resolveUiPrototypeFor 按触达路径匹配 repos 子仓 override 优先、仓级兜底
- [x] task-03: buildUiGuidanceLines(specBase) 按形态分四态注入：real-code 登记/豁免+完整 ruling/豁免缺 ruling 警告/未登记强提醒（含阶梯与收口前补登记）；无 specBase 时零新增（既有测试兼容）
- [x] task-04: brainstorm 生成要求四句修正：token 抄值=复刻≠引入仍属手搓仿制；历史原型先例不构成管线存在；查无真码管线先单开轻量变更搭最小入口；生成档输出必带素材来源声明（token 源/组件来源/入口位置）——「高保真」=组件即实现原料
- [x] task-05: design-facts 自审清单与 gates 软提醒同步登记指引
- [x] task-06: 新增测试锁解析/优先级/四态注入/文本锚；npm test 全绿、lint 绿、docs/prompt 同步零 miss
