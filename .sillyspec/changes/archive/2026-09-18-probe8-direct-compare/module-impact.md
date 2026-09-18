---
author: qinyi
created_at: 2026-09-18 08:15:00
---
# 模块影响分析（Module Impact）— 2026-09-18-probe8-direct-compare

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review | 状态 |
|---|---|---|---|---|
| core-engine | src/verify-probes.js | 逻辑变更（diff 源切换+四导出函数+骨架子段渲染） | ✅ | pending |
| core-engine | NEW:test/probe8-direct-compare.test.mjs | 新增（FR-01~03 直测） | — | pending |
| core-engine | test/probe8-payload-parity.test.mjs | 逻辑变更（diff 源替换后断言适配） | — | pending |
| core-engine | test/probe8-contract-pivot.test.mjs | 逻辑变更（渲染面子段追加后断言随行） | — | pending |

## 未匹配文件
无。

## 更新结果
| 目标 | 状态 |
|---|---|
| _module-map.yaml | skipped（无边界变更） |
| modules/core-engine.md | done（probe8 直比维度 changelog 流转） |
