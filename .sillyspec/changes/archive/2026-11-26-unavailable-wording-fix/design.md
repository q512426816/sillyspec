---
author: flow-machine-draft
created_at: 2026-11-26T14:21:28.116Z
---
# 设计记录（Design Record）— 2026-11-26-unavailable-wording-fix

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

只做三处文案订正，零逻辑改动：
1. `.sillyspec/local.yaml`：commands 段注释改为如实描述——`test: unavailable` 仅取消显式命令，`extractTestCommand` 返回 null 后 `runFullCommand` 回退 `inferFullTestCommand` 结构推断照跑（引 `src/verify-postcheck.js:3056-3068`）；删除「unavailable→skip 逃逸」「关闭亲跑」表述。
2. `src/stages/archive.js:12`：首步注释同款订正（删除「D-008 关闭亲跑」）。
3. `docs/sillyspec/file-lifecycle.md:53`：archive 行「D-008 关闭亲跑留痕归 CI」改为如实语义。

选择「只改文字、不改配置取值」：用户明确选择「保持测试照跑 + 只订正文案」；改取值为空命令或 skip 都会改变实测行为，与选择相悖。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无接口变化：仅注释与文档文字；`local.yaml` 取值保持 `test: unavailable`；所有函数签名、命令行为、门禁判定零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：本变更无事件流与输入处理，纯静态文字。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

三处文件均为小范围文本替换；`.sillyspec/local.yaml` 为 gitignored 机器本地配置，多会话各写各机不冲突；源码/文档由 git 合并，冲突概率极低且易读。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：无状态迁移；中断仅留下未完成的文字替换，重跑幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：本仓 local.yaml 仅本机生效；源码/文档变更随本仓提交同步，与他仓无关。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：订正后仍有人把 `unavailable` 理解为「跳过实测」——缓解：新注释显式写明「执行层回退结构推断仍会跑」，并给出源码锚 `verify-postcheck.js:3056-3068`。
- 试过并放弃：改 `commands.test` 为真实命令或空值——会改变实测行为（用户选择保持现行为）；改 `test_strategy: skip`——会真正关闭轻量道与 archive 门实测，与选择相悖。
