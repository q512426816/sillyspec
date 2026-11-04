---
author: flow-machine-draft
created_at: 2026-11-04T05:13:24.652Z
---
# 设计记录（Design Record）— 2026-11-04-junction-guard-rename-content

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处独立小修，均为 2026-11-04 跨工作区污染事故的护栏（根因已修：本机 daemon junction 错绑重指）：① progress.js resolvePlatformSpecDir 的 pointer 分支在返回前对解析结果做 git 根比对——cwd 与 specRoot 分属不同 git 仓时 console.warn 跨仓告警（错绑当场可见，此前 CLI 忠实跟随错绑指针零提示）；② spec-sync.js computeSpecOps 的 rename op 增携 content（base64，与 add/update 同款）——服务端源行缺失时不再 422 拒整批（生产实证 5 连败卡死文件树通道）。两者都是「让既有故障形态可见/不放大」，不改任何正确路径行为。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `resolvePlatformSpecDir(cwd, explicitSpecDir)` 签名与返回值不变；新增副作用：跨仓形态 warn 一行（含两仓路径/pointer 路径/修复指引）。显式 specDir、同仓、任一侧无 .git 三形态零输出。
- `computeSpecOps` 产物的 rename op 增 `content` 字段（base64）；op/path/new_path/base_version 不变；add/update/delete op 形态不变。POST 载荷：rename 数通常为归档移动量级（个位到十位数小 md 文件），增量可忽略。
- 无端点/命令/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   告警是纯只读比对（解析结果 vs cwd，两者同函数调用时点取值）；rename content 取自本地文件读取时点，与 add/update 同一致性口径。无时序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   告警零写面。rename content 读本地文件与 hashFiles 批 E-① buf 随行同源（内存 buf 优先，缺失回退 readFileSync）——与 update 路径同并发语义。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   两者均无状态残留（warn 即时输出、content 在 op 对象内随 POST 生灭）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   告警本身就是跨仓串台的探测器（规约 00 兼容：路径来自解析结果与 cwd，无硬编码）；content 是本地文件字节，无仓特定逻辑。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：git 根比对在异构形态（裸快照 specRoot 无 .git）误报——已以「双侧都有 .git 才比对」收窄；显式 specDir 是用户意志直接豁免。放弃的方案：① 跨仓时直接 throw 阻断——错绑场景下用户可能确有临时跨仓操作需求（只读查询他仓快照），阻断比告警伤面大，且本事故根因在机器态不在 CLI；② rename 无内容时降级为 delete+add 两 op——改变服务端移动语义（软删备份 vs 直接物化），副作用不可控；content 随行是服务端 422 文案明示的期望补法。
