---
author: flow-machine-draft
created_at: 2026-10-12T14:53:07.330Z
---
# 设计记录（Design Record）— 2026-10-12-verify-handover-hint

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

verify 枚举扩展评估（2026-10-12 会话结论）判定：门已有合法逃生口（non-testable 理由一句话准入 + 剔除有效分母 + 移交项联动 + PASS 封顶），缺的只是场景显性化——fire-equipment 实证 agent 不识别「运行验证移交」可用 non-testable，被迫 covered-service 硬凑五轮试错。本变更三处纯文案追加把场景写明（覆盖不足报错/证据缺失报错/骨架口径注记），零判定语义变化。选文案而非加枚举：加 covered-build 进分子会稀释防假完成激励（fire 复盘「门有牙」是核心正面资产），不进分子则与 non-testable 同义——文案显性化以近零风险拿走剩余价值，枚举扩展降级为「复发再立案」（复发信号：再出现 covered-service 硬凑或 non-testable 语义抱怨）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/stage-contract.js 两处报错文案追加括注/短句（覆盖不足 errors、证据缺失 errors）。
- src/verify-probes.js renderApiCoverageMatrixLines 口径注记追加一句。
- 零变化：MATRIX_VERDICT_WHITELIST、分子/分母算式、锚点校验（matrixEvidenceHasAnchor）、validatePassEligibility、退出码、骨架表结构。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| M | src/stage-contract.js | 两处报错文案移交场景显性化 |
| M | src/verify-probes.js | 骨架口径注记追加场景句 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   纯静态文案——无时序面。n/a。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   无共享态。n/a。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   文案常量无状态。n/a。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   报错与骨架为 CLI 单源常量，全工作区一致。文案追加不引入任何解析面变化（口径注记是 HTML 注释，解析器不消费其内容）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：文案与判定漂移——若未来 non-testable 准入变严（如要求锚点），场景句会误导。缓解：句内写法与现行校验逐字对齐（理由一句话）；本仓探针 cli-copy-selfsufficient 已把「文案与门判定一致」纳入评审必查。

试过但放弃：①加 covered-build/handover 枚举——进分子稀释激励、不进分子与 non-testable 同义（详见做法概述）；②只改骨架注释不改报错——agent 撞门时读的是报错不是骨架，两处都要。
