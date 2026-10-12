---
author: flow-machine-draft
created_at: 2026-10-12T14:53:07.330Z
---
# 提案书（Proposal）— 2026-10-12-verify-handover-hint

## 动机

任务原话转写：fire-equipment dogfood 复盘的 verify 枚举评估结论落地（低成本替代枚举扩展）：矩阵门已有合法逃生口——non-testable（理由一句话准入、直接剔除有效分母）+ 移交项联动 + PASS 封顶，但报错与骨架文案均未点名「运行验证移交」场景（构建级验证已过、运行冒烟移交部署后执行），导致 agent 不识别该阀门、被迫用 covered-service 硬凑（实证五轮试错）。本变更把该场景在三处文案显性化，零判定语义变化。

成功标准：
- stage-contract.js 覆盖不足报错（约 1305 行）：「不适用端点改 non-testable 并写一句理由」处扩展点名移交场景（构建回执+移交去向写法、该行不计入分母）
- stage-contract.js 证据缺失报错（约 985 行）：修复句的 non-testable 理由处补同一场景括注
- verify-probes.js 矩阵骨架口径注记：枚举说明后补 non-testable 移交场景适用句（预填前 agent 可见）
- 三处均为纯文案追加：门判定/白名单/算式/锚点校验零变化；既有钉死测试断言的子串全部保留
- 矩阵相关回归族全绿（api-coverage-matrix、acceptance-matrix-gate/probe、verify-probes、contract-matrix、stage-contract）

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. stage-contract.js 覆盖不足报错（约 1305 行）：「不适用端点改 non-testable 并写一句理由」处扩展点名移交场景（构建回执+移交去向写法、该行不计入分母）
2. stage-contract.js 证据缺失报错（约 985 行）：修复句的 non-testable 理由处补同一场景括注
3. verify-probes.js 矩阵骨架口径注记：枚举说明后补 non-testable 移交场景适用句（预填前 agent 可见）
4. 三处均为纯文案追加：门判定/白名单/算式/锚点校验零变化；既有钉死测试断言的子串全部保留
5. 矩阵相关回归族全绿（api-coverage-matrix、acceptance-matrix-gate/probe、verify-probes、contract-matrix、stage-contract）

## 成功标准（可验证）

1. stage-contract.js 覆盖不足报错（约 1305 行）：「不适用端点改 non-testable 并写一句理由」处扩展点名移交场景（构建回执+移交去向写法、该行不计入分母）
2. stage-contract.js 证据缺失报错（约 985 行）：修复句的 non-testable 理由处补同一场景括注
3. verify-probes.js 矩阵骨架口径注记：枚举说明后补 non-testable 移交场景适用句（预填前 agent 可见）
4. 三处均为纯文案追加：门判定/白名单/算式/锚点校验零变化；既有钉死测试断言的子串全部保留
5. 矩阵相关回归族全绿（api-coverage-matrix、acceptance-matrix-gate/probe、verify-probes、contract-matrix、stage-contract）
