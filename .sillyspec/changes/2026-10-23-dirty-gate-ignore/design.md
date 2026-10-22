---
author: flow-machine-draft
created_at: 2026-10-22T23:39:13.117Z
---
# 设计记录（Design Record）— 2026-10-23-dirty-gate-ignore

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

过滤落在 collectFreezeFiles 单一源内（src/flow-parity.js）：函数内 fail-soft 读 local.yaml 的 dirty_gate_ignore 键（逐键正则，module_gate_ignore/readFlowConfig 同款防线），dirty 面收集后按前缀剔除并返回 dirtyIgnored 清单——权威门（flow.js patch 子步）与收口预检（flow-preflight.js）共用同一函数自动继承，零镜像面（2026-10-23-flow-done-preflight 确立的同源原则）。权威门在 dirtyWarned 处理前打一行 ℹ️ 留痕；剔除后缺口为空即不阻断。选配置键而非「自动猜测残渣」：残渣判定是仓主知识（什么算已知残渣因仓而异），CLI 自动猜必枚举路径内容（违反零枚举红线）且必误伤——显式配置是唯一治理诚实的形态；module_gate_ignore 已验证同款先例。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

collectFreezeFiles 返回值新增 `dirtyIgnored: string[]`（既有调用方不读该字段零影响）。local.yaml 新键 `dirty_gate_ignore: <前缀1>,<前缀2>`（单行逗号、posix 前缀匹配、列表块形态不支持——readFlowConfig 逐键正则同款）。CLI 子命令面零变化；阻断文案（权威门+预检拷贝）各增第④条出路行。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：忽略清单在每次 collectFreezeFiles 调用时点重读盘面（无缓存），配置变更下一轮生效；与权威门/预检读到同一时点同一清单。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

local.yaml 读取 fail-soft（读失败/坏格式 → 空清单 = 现状行为），与并行会话写配置的竞态最坏退化为「该轮忽略未生效照常阻断」——保守方向，无写写冲突（本变更零新增写盘）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：无状态副作用；剔除只影响 dirty 缺口判定面，冻结件/flow-state/子步标记零触碰；ℹ️ 留痕行进收口输出可审计。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：键是仓级 local.yaml（.sillyspec 机/仓本位），各仓各自声明；前缀匹配在归一 posix 路径上做（反斜杠归一同款）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：仓主把真交付路径误配进忽略清单 → 真缺口静默漏审。对策：①前缀是显式仓主声明（与 module_gate_ignore 同治理等级）；②ℹ️ 留痕行每轮可见（配了什么、剔了几个可审计）；③文档口径「已知残渣面」写进键语义。放弃方案：①CLI 自动猜残渣（untracked 整目录/运行库模式启发式）——枚举路径内容违反零枚举红线且必误伤真交付，弃；②按「他侧活跃变更声明」自动放行——经查 collectFreezeFiles 的 split.own 切分已实现该语义（他侧声明的 dirty 本就不进 dirtyWarned），无增量可做，留现状。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/flow-parity.js | collectFreezeFiles 内 fail-soft 读键+前缀剔除+返回 dirtyIgnored |
| 改 | src/flow.js | patch 子步权威门 ℹ️ 留痕行；权威门+预检两处阻断文案各增第④条出路 |
| 增 | test/dirty-gate-ignore.test.mjs | 四态矩阵（未配置零回归/命中剔除/不命中阻断/unit 切分） |
