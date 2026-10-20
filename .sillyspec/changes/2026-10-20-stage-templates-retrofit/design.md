---
author: flow-machine-draft
created_at: 2026-10-20T03:13:57.621Z
---
# 设计记录（Design Record）— 2026-10-20-stage-templates-retrofit

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

倒推入册（选道表「代码已先写好」形态）：交付=提交 8227bd0a861f8d1e52aa56ce90ae7626b84c6a71（git show 可复核 diff），内容为 src/stage-templates.js 四件套 decisions 模板 type/status 清单由字面旧口径（type 含 term/premise/risk，status 含 unresolved）改为插值正典常量 `DECISION_TYPES.join(' | ')` / `DECISION_STATUSES.join(' | ')`（正典单一源 src/decision-values.js），配套 test/decision-caliber-unify.test.mjs 用例④扩展断言（tplTypeInterp/tplStatusInterp=1 + 旧散值清单清除）与上一变更 design.md 变更清单补录。

背景：该交付原属变更 2026-10-20-decision-caliber-unify 的评审 P2 清偿，因提交消息只带 (task-04) 未带变更名尾缀，收口漂移检测（detectPatchDrift 按提交消息识别本变更提交，src/flow-parity.js:509）静默失明，diff 未进其归档冻结件（change.patch 停在 4e1a9d8b）。本变更不重做交付、不改任何代码——只把已达标事实写成 spec 面归档，补全审计链。本仓基线（d7f0095c）晚于交付提交，故本变更冻结面不含该 diff，审计引用以本 design + git 历史为准。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无。本变更是纯治理入册（spec 文档 + 归档），零代码零配置改动；交付提交 8227bd0a 的行为面（模板插值、白名单拒绝形态）已在其原生变更 requirements/design 契约内。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：纯文档入册无运行时时序面；交付行为的时序语义已在原生变更 design 论证过（插值常量为模块加载期冻结值）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：零写代码面；本变更自身文件走既有 flow 协议原子写与显式 pathspec 提交纪律。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：倒推入册幂等——spec 面重写同内容零漂移，flow done 断点续跑；交付提交已在库不可变（sha 锚定）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会：引用的 8227bd0a 是本仓 git 对象；归档件随本仓分发，跨机 clone 后 git show 同 sha 可复核。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险=形式主义（为补流程装样子）——倒推入册的价值仅在审计链补全，若交付本身未验证就是空转。对冲：FR-02 绑定真实测试且收口实测门复核（6/6 绿是协议硬门非自述）。放弃的方案：a) 手工改上一变更归档件（往 change.patch 里补 diff）——归档件是 sha256 锚定的冻结审计面，回写违反不可变原则（D-unmapped-152 同款死路：归档件不回写）；b) revert 后重交付走完整协议——无谓翻搅 git 历史，交付内容零变化纯增风险；c) 不补册（接受缺口留 git log）——缺口已向用户披露、用户指示入册，补册成本一条轻量变更是合理对价。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 无代码交付 | （引用 8227bd0a861f8d1e52aa56ce90ae7626b84c6a71） | 交付已在库：src/stage-templates.js + test/decision-caliber-unify.test.mjs + 上一变更 design.md |
