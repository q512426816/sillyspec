---
author: flow-machine-draft
created_at: 2026-11-15T00:05:38.077Z
---
# 设计记录（Design Record）— 2026-11-15-auxiliary-scan-no-stick

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

run <stage> 入口（src/run/command.js:1425）在无 --change 时经 `resolveChangeName` 兜底吸附仓内活跃变更，随后 :1456 混跑回退块把「在轻量跑道变更上跑 run <stage>」当升厚意图拦进 --upgrade-thick 同意门——scan（辅助阶段，definition.auxiliary: true，无变更归属）也被一并吸附：仓里任一活跃轻量变更在场即整仓跑不了 scan（2026-11-14 端到端实测在 multi-agent-platform 被拦+libuv 崩溃；且行为状态敏感——currentChange 指向谁取决于并行会话推进，不可预测）。

修复：command.js 在 effectiveChange 解析前判定 stage ∈ 无变更归属辅助子集（本变更界定为 scan 与 explore——quick/archive 虽在 AUXILIARY_STAGES 但有变更归属语义（quick 会话/archive 收口锚定变更），不豁免；status/doctor 已有 READONLY 分流不受影响），命中则 effectiveChange=null——不吸附、不注册变更、不触发混跑回退门，辅助阶段直接执行。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `sillyspec run scan` / `run explore` 在活跃变更在场时不再输出「⛔ 本变更在轻量跑道上」拦截（exit 2），改为直接执行辅助阶段（scan 走原启动段，无变更语义不变）。
- 显式 `--change <名>` 跑 scan/explore 的旧形态：保留吸附吗？——不保留（辅助阶段本无变更归属，--change 对 scan 无消费方）；quick/archive/status/doctor 行为零变化。无签名/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立——豁免判定只看 stageName 常量集合，与会话/变更状态无关（这正修复了原行为的状态敏感：currentChange 指向谁不再影响 scan 可用性）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：scan 自身的并发面不变（guard/计划文件原子写，上游已治理）；本变更不改写路径。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全——scan 不再注册变更/不写变更进度（辅助阶段进度走自身 stage 记录，与现行无 --change 跑 scan 的形态一致）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会——豁免只是不吸附变更名，scan 的 specBase/cwd 锚定不变；多仓各自解析。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
答：最大风险是用户原本依赖「跑 scan 时顺带看到活跃变更提示」的可见性——吸附拦截文本顺带了变更恢复指路，豁免后该提示消失。缓解：scan 启动输出本就含平台同步的变更进度行（[sync] 已拉取变更进度），可见性不损失。放弃的方案：全 AUXILIARY_STAGES 豁免——quick/archive 有变更归属语义（quick --linked-changes、archive --change 收口），豁免会破坏它们的变更锚定，放弃收窄为 scan/explore。
