---
author: flow-machine-draft
created_at: 2026-10-09T01:06:25.719Z
---
# 设计记录（Design Record）— 2026-10-09-zcode-skills-sentinel-shorthand

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三处小修共用一个主题：宿主技能面与收口证据面的缺口清偿。① init 双层缺口（坑 init-skills-sync-no-zcode）：detectTools 加 `.zcode` 存在性分支、cmdInstall 内联 skillToolDirs 映射补 `zcode: '.zcode/skills'`，自动发现与显式 `--tool zcode` 两路都通；detectTools 由私有改导出供测试直测。② 提交消息连写组（坑 flow-done-sentinel-token-split）：sentinel-assertions.js 新增纯函数 expandTaskShorthand 把 `task-01/02/03`、`task-1、2，03` 等连写组展开为补零规范 token，哨兵判定（detectFakeCheckCompletion）与 flow.js autopilot 勾选提取共用同一函数（动态 import，避免两处正则分叉）。③ 评审任务书（flow-review.js）补「无子代理通道时主会话代行自审、reviewer 字段如实标注降级」指引。另随包补三个内嵌技能（export/quick/resume，纯文档资产）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `detectTools(projectDir)`（src/init.js）：私有改导出，行为新增——`.zcode` 在场报 `zcode`；既有六信号输出不变。
- `expandTaskShorthand(messages: string[]): string[]`（src/sentinel-assertions.js）：新导出纯函数；连写组展开+补零两位；尾数前瞻 `(?!\d)` 防版本串误切；非连写输入零变化。
- `detectFakeCheckCompletion`：判定前先经 expandTaskShorthand 展开，对外结果形态（status/missing）不变。
- `cmdFlowDone` autopilot 勾选提取（src/flow.js）：提取正则口径改为展开后文本，勾选行为不变。
- CLI 命令面、npm 包入口零变化；无文件格式变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——展开函数为无状态纯函数（字符串进字符串出），无时序假设；detectTools 基于调用时点目录存在性快照，无事件乱序面。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   无新增共享可变状态；技能复制沿用 cmdInstall 既有同步流程（单进程安装语义）；哨兵与 autopilot 在 flow done 单进程内先后执行。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——flow done 中断重入时 patch 冻结以 baseline..HEAD 提交面为准，展开函数幂等（同输入同输出），重跑无累积效应。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——detectTools 只看传入 projectDir 下的信号目录；expandTaskShorthand 只消费消息字符串，不触盘。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：展开正则过宽把非任务数字串（如版本号 task-013、task-010）误切放大证据面——以尾数前瞻 `(?!\d)` + 组内逐段 `\d{1,2}` 双约束锁边，测试③钉住。试过但放弃：在 flow.js 内联一份连写展开正则（放弃理由——与哨兵判定口径分叉，正是本坑复发的温床；收敛为 sentinel-assertions.js 单一导出、两处共用）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| M | src/init.js | detectTools 加 .zcode 分支并导出；skillToolDirs 补 zcode 映射 |
| M | src/sentinel-assertions.js | 新增导出 expandTaskShorthand；detectFakeCheckCompletion 判定前先展开 |
| M | src/flow.js | autopilot 勾选提取改经 expandTaskShorthand 同口径展开 |
| M | src/flow-review.js | 评审任务书补无子代理通道代行自审降级标注指引 |
| A | test/init-zcode-skills.test.mjs | zcode 发现/源级映射钉/六信号零变化（3 用例） |
| A | test/sentinel-token-shorthand.test.mjs | 连写组三形态/纯函数边界/前瞻边界/独立 token 零变化（4 用例） |
| A | .claude/skills/sillyspec-export/SKILL.md | 新内嵌技能：成功方案导出为可复用模板 |
| A | .claude/skills/sillyspec-quick/SKILL.md | 新内嵌技能：quick 直改轻量道 |
| A | .claude/skills/sillyspec-resume/SKILL.md | 新内嵌技能：恢复中断工作 |
