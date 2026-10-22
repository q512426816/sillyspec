---
author: flow-machine-draft
created_at: 2026-10-22T23:49:53.216Z
---
# 设计记录（Design Record）— 2026-10-23-turbo-docs-auto

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

cmdFlowDone 入口的 `const turbo = st.turbo===true && st.tier!=='thick'`（flow.js:1272）扩为旗标档+配置档双源：旗标档原样（turboSource=flag），未开且配置 turbo: docs-auto 时用 changedFilesSinceBaseline（提交∪脏面、dirty_gate_ignore 前缀剔除后——与 dirty 门同一残渣口径，两机制可组合）判纯文档面（quick-audit 的 CODE_PATH_SEGMENT_RE/CODE_EXTENSION_RE 单一源分类器，导出复用零新增枚举），命中则 turbo=true、turboSource=docs-auto 并打一行授权源留痕。五个消费点读同一局部变量零改动继承（2026-10-14-thin-turbo-mode 已验证的取值表达式扩展法）；唯一带「用户显式触发」字样的实测门 reason 换 turboLabel 按源渲染。授权权留在仓主（local.yaml 一行常设声明），CLI 只做面判定——agent 仍无法自行启用（AGENTS.md 禁令针对 agent 自选，配置是仓主意志）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

local.yaml 新键 `turbo: docs-auto`（readFlowConfig 增 turboDocsAuto 布尔，未配置/坏值 fail-soft false）。src/run/quick-audit.js 的 CODE_PATH_SEGMENT_RE/CODE_EXTENSION_RE 加 export（常量本体零变化，flow.js 动态 import 消费）。CLI 子命令面零变化；turbo 档收口输出增一行授权源留痕（仅 docs-auto 档）；实测门 reason 文案按授权源渲染。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：面判定读 done 调用时点快照（baseline..HEAD 提交面+git status 脏面），与实测门/冻结面的同一时点只读事实；判定后新提交的代码文件不进本轮判定——但本轮收口的冻结面同样不含它（下一轮兜底），无静默放行窗口。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

判定全程只读（git diff/status），零新增写盘；与并行会话的竞态最坏=脏面读到对方在途代码文件→命中分类器→不降档走全量（保守方向）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：降档判定是收口内时点决策不落 flow-state（turbo_source 仅随收口输出/遥测留痕）；升厚即失效继承旗标档语义（tier=thick 时双源均关）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：键是仓级 local.yaml；面判定用本仓 baseline..HEAD+status；分类器是纯路径正则无仓状态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：误降档（有代码面被判纯文档→跳过实测与评审）。对策三重：①分类器复用实测门同源常量（实测门「宁可多跑不可漏跑」口径的同一双通道正则——src 段+代码扩展名）；②面含脏面（未提交代码文件也拦降档）且经 dirty_gate_ignore 剔除后判（已知残渣口径与 dirty 门同源）；③判定异常/面空 fail-closed 全量。放弃方案：①docs-auto 档保留评审 1/4 采样（与旗标档差异化）——需把评审豁免从 turbo 单布尔改成分源路由，五个消费点的简单继承就破了，采样校准由豁免面既有 1/4 承担，docs-auto 不叠加机制，弃（如实披露：docs-auto 档与旗标档同形全免）；②按 requirements/design 声明面判纯文档——声明可谎报/滞后，git 面是机械事实，弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/flow.js | readFlowConfig 增 turboDocsAuto；turbo 双源解析+turboSource/turboLabel+授权源留痕行；实测门 reason 换 turboLabel |
| 改 | src/run/quick-audit.js | CODE_PATH_SEGMENT_RE/CODE_EXTENSION_RE 加 export（本体零变化） |
| 增 | test/turbo-docs-auto.test.mjs | 四态 e2e＋readFlowConfig 键三态 unit |
