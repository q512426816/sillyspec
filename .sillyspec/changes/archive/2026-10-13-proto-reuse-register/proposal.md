---
author: flow-machine-draft
created_at: 2026-10-13T06:46:39.576Z
---
# 提案书（Proposal）— 2026-10-13-proto-reuse-register

## 动机

任务原话转写：fire-equipment 实证暴露规则缝隙：用户已提供可复跑 HTML 原型时，brainstorm 原型分级无「复用」档，agent 只能按精神跳过且不登记——原型未落变更目录、execute 注入（execute.js 按 prototype-*.html 命名扫描注入）不生效，对照全靠 prompt 临时绝对路径，跨会话即断。堵法：分级加「免生成·登记复用」档，复用必须按 prototype-<名称>.html 命名落变更目录才会被 execute 注入。

成功标准：
- brainstorm「HTML 原型分级」含登记复用档：用户已提供可复跑 HTML 原型且覆盖本次 UI 面 → 免重画，必须复制进变更目录并命名 prototype-<名称>.html + 声明来源与覆盖面；静态截图/设计稿不适用本档（仍须生成可跑 HTML）
- 分级步操作与铁律同步三选一口径（生成/登记复用/跳过声明）
- brainstorm-auto 原型节、explore 复制复用行、gates 软提醒文案、design-facts 自审清单项同步该口径
- 新增测试覆盖分级文本含 prototype-<名称>.html 命名硬要求与软提醒复用出路；npm test 全绿、lint 绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. brainstorm「HTML 原型分级」含登记复用档：用户已提供可复跑 HTML 原型且覆盖本次 UI 面 → 免重画，必须复制进变更目录并命名 prototype-<名称>.html + 声明来源与覆盖面；静态截图/设计稿不适用本档（仍须生成可跑 HTML）
2. 分级步操作与铁律同步三选一口径（生成/登记复用/跳过声明）
3. brainstorm-auto 原型节、explore 复制复用行、gates 软提醒文案、design-facts 自审清单项同步该口径
4. 新增测试覆盖分级文本含 prototype-<名称>.html 命名硬要求与软提醒复用出路；npm test 全绿、lint 绿

## 成功标准（可验证）

1. brainstorm「HTML 原型分级」含登记复用档：用户已提供可复跑 HTML 原型且覆盖本次 UI 面 → 免重画，必须复制进变更目录并命名 prototype-<名称>.html + 声明来源与覆盖面；静态截图/设计稿不适用本档（仍须生成可跑 HTML）
2. 分级步操作与铁律同步三选一口径（生成/登记复用/跳过声明）
3. brainstorm-auto 原型节、explore 复制复用行、gates 软提醒文案、design-facts 自审清单项同步该口径
4. 新增测试覆盖分级文本含 prototype-<名称>.html 命名硬要求与软提醒复用出路；npm test 全绿、lint 绿
