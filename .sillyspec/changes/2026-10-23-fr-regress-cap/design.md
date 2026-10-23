---
author: flow-machine-draft
created_at: 2026-10-23T00:27:36.745Z
---
# 设计记录（Design Record）— 2026-10-23-fr-regress-cap

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

verify-postcheck.js 新增纯函数 applyFrRegressCap(fr, cap)（fr 对象→{fr: 帽后副本, capApplied: {kept,total}|null}）与键读取 readFrRegressCap(specBase)（逐键正则，module_gate_ignore/readFlowConfig 同款防线），组面处（runVerifyTestCheck 的 fr 段）在 frLinked/frReport/frAll 推导**之前**对 fr.files 施帽——下游（并集、优先面标记、批组卷、计数披露）全部从帽后面对象自然推导，无第二套口径；超帽/off 各打一行 loud 披露（被弃数与去向 pre-push/CI 门，防静默漏测）。选「配置键+缺省无帽」而非改缺省：零回归是消费仓升级底线，仓主按各自脸肥程度自定（本仓 24 自举、平台仓升级 CLI 后可配）；选「只帽 FR 层」而非连 import 依赖一起帽：变更测试∪import 依赖是 AGENTS 契约的验收面（新增+直接受影响），FR 回归是保险层——用户原话「留 ci 跑」恰是保险层的正确去向。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

local.yaml 新键 `fr_regress_cap: <N|off>`（N 为 1-2000 正整数；off=FR 层跳过；缺省/坏值=无帽现状）。src/verify-postcheck.js 新导出 applyFrRegressCap/readFrRegressCap（纯函数可测）；组面处帽后推导零第二口径。CLI 子命令面零变化；无键时组面输出与改前逐字一致。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：帽在组面单一时点应用（每次实测面组装现算，无缓存态）；键变更下一轮收口即生效，与 known_failures 等既有配置面同语义。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

键读取 fail-soft（读失败=无帽=现状），与并行会话写 local.yaml 的竞态最坏退化为「该轮无帽多跑」——保守方向；纯函数零写盘。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：帽不落任何状态面（每轮组面重算）；被弃面的存在由披露行+回执 frReport 恒可见，中断重跑幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：键是仓级 local.yaml；FR 面本身按本仓 specBase 索引推导（既有语义不动）；平台仓等消费仓需 CLI 升级到含本键版本方可消费（配置面版本兼容性由缺省无键保证）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：被弃的 FR 回归面里恰有本轮变更破坏的用例 → 本地绿、CI 红（回归位移到 CI）。对策：①loud 披露行每轮点名被弃数与去向（不静默）；②帽只作用于保险层，验收层（变更测试∪import 依赖）整跑；③pre-push/CI 门是既有全量兜底（AGENTS 规则 4 既定分工）；④键值仓主可调，脸瘦的变更（fr 面 < N）零弃置零变化。放弃方案：①改缺省为有帽——对所有消费仓是行为变更，升级即变脸，违反零回归底线，弃；②连 import 依赖一起帽——那是「直接受影响面」验收本体，帽它等于自验面失真，弃；③按 FR 新旧/域内排序择优——需引入绑定质量信号（无既有单一源），v1 用现有稳定序，排序优化留数据窗后再定。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/verify-postcheck.js | 新导出 applyFrRegressCap/readFrRegressCap；组面 fr 段施帽+两形态披露行 |
| 改 | .sillyspec/local.yaml | 本仓落地 fr_regress_cap: 24（自举） |
| 增 | test/fr-regress-cap.test.mjs | 纯函数四态+键三态+本仓键在场断言 |
