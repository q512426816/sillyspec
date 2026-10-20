---
author: flow-machine-draft
created_at: 2026-10-20T02:28:57.944Z
---
# 提案书（Proposal）— 2026-10-20-decision-caliber-unify

## 动机

任务原话转写：决策类型状态口径单一源统一

动机与背景：决策 type/status 值集三套口径并存——decisions-io 写入白名单（type 6 值缺 feasibility/consistency）、decision-distill 蒸馏入选集（7 类含 scope 排除；status 仅 confirmed/accepted）、brainstorm 提示面两处清单（含 term/premise/risk 等机器永不收录的值）；盘面实证 40+ 种 type 散值、status=implemented 写入合法但蒸馏不入选、deferred 无任何白名单收录。写入者拒绝蒸馏想收的值、提示面教 agent 写机器不认的值，是真实事故温床（八条 feasibility 决策漏选入库事故即同构）。用户裁定：统一。

成功标准：
- type/status 值集单一源：decisions-io 导出正典集，decision-distill 入选集自其派生（类型=正典去 scope），零独立字面集
- decisions add 可写 feasibility/consistency（写入白名单对齐蒸馏入选面）
- status=implemented 条目蒸馏入选（IMPLEMENTED_STATUSES 加 implemented）
- brainstorm 两处 type 提示清单与正典集一致（term/premise/risk 等散值从提示面清除）
- 手写开放世界兼容不变：解析宽容保留、存量散值条目行为零变化
- 新增/更新测试全绿，decisions-io/decision-distill 相关既有套件零回归

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. type/status 值集单一源：decisions-io 导出正典集，decision-distill 入选集自其派生（类型=正典去 scope），零独立字面集
2. decisions add 可写 feasibility/consistency（写入白名单对齐蒸馏入选面）
3. status=implemented 条目蒸馏入选（IMPLEMENTED_STATUSES 加 implemented）
4. brainstorm 两处 type 提示清单与正典集一致（term/premise/risk 等散值从提示面清除）
5. 手写开放世界兼容不变：解析宽容保留、存量散值条目行为零变化
6. 新增/更新测试全绿，decisions-io/decision-distill 相关既有套件零回归

## 成功标准（可验证）

1. type/status 值集单一源：decisions-io 导出正典集，decision-distill 入选集自其派生（类型=正典去 scope），零独立字面集
2. decisions add 可写 feasibility/consistency（写入白名单对齐蒸馏入选面）
3. status=implemented 条目蒸馏入选（IMPLEMENTED_STATUSES 加 implemented）
4. brainstorm 两处 type 提示清单与正典集一致（term/premise/risk 等散值从提示面清除）
5. 手写开放世界兼容不变：解析宽容保留、存量散值条目行为零变化
6. 新增/更新测试全绿，decisions-io/decision-distill 相关既有套件零回归
