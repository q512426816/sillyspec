---
author: flow-machine-draft
created_at: 2026-10-14T01:42:48.352Z
---
# 设计记录（Design Record）— 2026-10-14-guide-anchor-adopt-proto

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两层修复截断丢规则面。①`src/run/prompt.js` outputStep：guide 落盘机制已存在（首见全量渲染+写 step-guides 文件+state 指纹；复入短输出），缺的是「输出被 harness 尾部截断时全文路径仍可见」——在 outputStep 打印序列末尾（两分支汇合后）加一行锚：step-guides 文件绝对路径 + 「截断/上下文丢失时 Read 拿回全文」。repo 已有同因先例：complete.js task-08 尾部锚定行（「长 prompt 易被 tail 截断」），本锚是它的补全（带路径，不只报位置）。②`src/flow.js`：adopt 路径中部已有「🖼️ 原型在场」必看行（2026-09-25-flow-tick-prototype 枚举机制沿用），但尾部材料清单只列 scan 稳定前缀——追加变更原型 HTML 清单；resume 简报对含原型变更（changeArtifactPaths 扫 prototype-*.html）同样补尾部行。回答用户问题：头脑风暴转轻量变更的原型**会被采用**（adopt 枚举必读+🖼️ 行），本变更是让该指针截断不掉、resume 不隐身。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 无函数签名/CLI 命令/文件格式变化；outputStep 与 flow start/adopt/resume 的 stdout 增行（锚行/原型行）。
- 锚行仅在 guideEnabled（缺省开）且非 --json 劫持态打印；`SILLYSPEC_STEP_GUIDE=0` 时零新增（stdout 确定性测试族的既有逃生门口径不变）。
- 无原型变更的 adopt/resume 输出与改动前逐字一致。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：锚行是渲染期同步打印，无时序假设；不适用。
2. 并发写：step-guides 文件写入已有指纹命名与 fail-soft；锚行只引用当次写入路径，无新共享状态。
3. 切换/生命周期：锚行正面向抗「上下文压缩丢失」（guide 文件持久在盘，跨会话可 Read）；resume 尾部原型行补齐会话切换后的可发现性。
4. 作用域：锚行路径为当次 runtimeRoot（平台模式 specRoot / 本地 .sillyspec）下的绝对路径，与复入短输出分支既有 📄 行同源同根；flow 原型行用 changeArtifactPaths 既有枚举（changeDir 直下 .html + prototypes/ 子目录），跨仓/平台路径语义不变。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险1：锚行/原型行增 stdout 字节，可能碰既有字节精确断言测试。对策：guide 关闭零输出的口径保住确定性族；其余测试跑全量验证，若有个别 exact 断言碎则按新输出更新（属预期契约变化，非掩盖）。
- 风险2：锚行打在 outputStep 末尾但 complete.js 的「🚀 advanced」行在其后——锚行仍在尾部窗口内（实证 msg53 末 1896 字符含 🚀 行与其前 ~1800 字符），两行相距 1 行必同幸存。
- 死路：考虑过把决策关键节（分级/生成要求）复制到每步输出尾部——放弃：段落级复制让每步输出膨胀数百字节且节内容随步骤变化维护面大；一行路径锚以 ~120 字节拿到同等恢复能力，guide 文件才是全文唯一真相源。
