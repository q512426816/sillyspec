---
author: flow-machine-draft
created_at: 2026-11-26T01:33:10.489Z
---
# 提案书（Proposal）— 2026-11-26-flow-help-flag-shortcircuit

## 动机

任务原话转写：flow 帮助旗标短路不再误立项
sillyspec flow start --help 不被识别为帮助旗标：按「缺 --input 的 flow start」走需求清晰度提示，提示里还给出一个按日期加随机后缀生成的临时变更名（看似真实却从未落盘），照着提示去跑会把一个从未立项的名字带进头脑风暴预段；其余子命令带 --help 则报「需 --change <名>」。根因是 cmdFlow 只按 args[0] 分发，--help 留在 rest 里无人消费（坑档在 multi-agent-platform 仓：docs/sillyspec/2026-11-25-flow-start-help-as-start-call，2026-11-25 实证）。

成功标准：
- sillyspec flow start --help 及任一 flow 子命令带 --help / -h 打印用法并正常返回，不再生成临时变更名、不再走需求清晰度提示
- 帮助短路先于平台 spec 根解析与任何立项落盘逻辑，零文件系统副作用
- 用法列出全部八个子命令与代码内实际消费的旗标；未知子命令与空子命令的兜底行为不变
- 新增测试全绿，既有测试零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. sillyspec flow start --help 及任一 flow 子命令带 --help / -h 打印用法并正常返回，不再生成临时变更名、不再走需求清晰度提示
2. 帮助短路先于平台 spec 根解析与任何立项落盘逻辑，零文件系统副作用
3. 用法列出全部八个子命令与代码内实际消费的旗标；未知子命令与空子命令的兜底行为不变
4. 新增测试全绿，既有测试零回归

## 成功标准（可验证）

1. sillyspec flow start --help 及任一 flow 子命令带 --help / -h 打印用法并正常返回，不再生成临时变更名、不再走需求清晰度提示
2. 帮助短路先于平台 spec 根解析与任何立项落盘逻辑，零文件系统副作用
3. 用法列出全部八个子命令与代码内实际消费的旗标；未知子命令与空子命令的兜底行为不变
4. 新增测试全绿，既有测试零回归
