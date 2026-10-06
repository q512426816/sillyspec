---
author: flow-machine-draft
created_at: 2026-10-06T13:07:05.571Z
---
# 决策记录（Decisions）— 2026-10-06-datetime-timeago

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：档位换算复刻不严导致进度面板展示漂移（如 59 分 59 秒被四舍五入进位）。对策：逐字复刻 floor 链（分钟 floor → 小时 floor(分钟/60) → 天 floor(小时/24)）+ 测试钉住全部档位边界（含 59 分 59 秒 / 23 小时 59 分 / 未来时间）。 试过放弃①：把解析失败回退（返回原串/『未知』）做进 timeAgo 内部——会让「无效输入必须抛 TypeError」的契约失效，且容错回退是 stage-machine 对脏数据的展示职责，塞进通用工具语义含糊，放弃。 试过放弃②：解析也一并迁给 datetime（让 timeAgo 吃 _parseFlexibleTs 的 zh-CN 回退）——回退正则是进度面板对存量 lastActive 的兼容面，迁走等于把调用方私有数据形态泄漏进通用模块，放弃。
