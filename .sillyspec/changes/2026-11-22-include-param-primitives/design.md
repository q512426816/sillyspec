---
author: flow-machine-draft
created_at: 2026-11-21T23:27:44.739Z
---
# 设计记录（Design Record）— 2026-11-22-include-param-primitives

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按批 3a survey（docs/sillyspec/prompt-primitives-survey.md）施工路径分两步：①扩展 `src/run/shared.js` 的 resolvePromptIncludes——正则支持 `{{include: name|key=value|key2=value2}}` 参数段，模板文件内 `{{param:key}}` 占位被实参替换（缺参保留原样+warn；无参写法向后兼容；模板缺失保留占位符 warn 的 fail-soft 哲学不变）；②按 survey 顺序抽取四条高优原语进 templates/prompts/——高 2（前台同步禁后台，零参数直抽 ×2 处）与高 5（评审豁免，零参数直抽 ×3 处独立块，execute.js dispatchExec 段的指针句保留不动）；高 4（审查子代理纪律包，budget/scope 参数）与高 9（材料包基准面，pack 参数）参数化抽取，阶段特有差异段（既往勿重验/gate 重试修复）按最小扰动保留 stage 原文。选此方案因为共性进模板单一源+侧重走参数是 survey D 节既定路径，且每批抽取后金档可机械验证。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- resolvePromptIncludes：签名不变（text→text 纯函数）；语法扩展——`{{include:name|key=value}}`（key 匹配 `[\w-]+`，value 允许中文/字母/数字/空格/短横线/斜杠，禁 `|`/`{`/`}`）；模板内 `{{param:key}}` 被对应实参替换
- templates/prompts/ 新增四模板：foreground-sync（零参）、review-unsupervised-exempt（零参）、review-subagent-discipline（budget/scope 参数）、material-pack-baseline（pack 参数）
- stages 六处引用位改 include 引用（高 2 ×2、高 5 ×3、高 4 ×3、高 9 ×3——以施工时锚文本定位为准，行号随 stages 演化漂移）
- CLI 命令面/agent 可见流程：无变化（agent 收到的仍是自包含 prompt 字符串）

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。参数替换是 prompt 组装时的纯文本一次性变换（渲染期，早于占位符注入），无顺序依赖；多参数无序传入结果确定。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   模板文件是 git 管理的只读面（运行时 readFileSync），无并发写点；与既有 include 机制同。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。纯函数无状态；中断重入渲染幂等（同输入同输出）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。模板按 CLI 安装位置解析（shared.js 相对路径），参数只出现在本仓源码字符串内——与既有机制同；worktree 各渲染各的。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：抽取时渲染文本微妙漂移改变 agent 行为——缓解：逐字保留纪律句原文进模板（差异只走参数槽），金档再生 diff 审读+新单测断言关键语义句在场；既有 include 按名计数测试（execute-testcase-design-include 等）核对不受新增模板影响（按名计数天然隔离）。
- 知识注入段禁 include 约束维持（knowledge-inject 相关断言不放松）。
- 死路：模板内条件语法（{{#if}} 开关段）——放弃：引入模板逻辑复杂度，本批四条原语用参数槽+原文保留差异段即可承载；真需要时再议（批 3c 前重评）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/run/shared.js | resolvePromptIncludes 参数化语法+模板内 {{param:}} 替换 |
| 新增 | templates/prompts/foreground-sync.md | 高 2 前台同步禁后台 |
| 新增 | templates/prompts/review-unsupervised-exempt.md | 高 5 评审豁免 |
| 新增 | templates/prompts/review-subagent-discipline.md | 高 4 审查子代理纪律包（budget/scope） |
| 新增 | templates/prompts/material-pack-baseline.md | 高 9 材料包基准面（pack） |
| 修改 | src/stages/execute.js | 高 2/5/4/9 引用位改 include |
| 修改 | src/stages/verify.js | 高 2 引用位 |
| 修改 | src/stages/brainstorm.js | 高 5/4/9 引用位 |
| 修改 | src/stages/plan.js | 高 5/4/9 引用位 |
| 新增 | test/prompt-include-params.test.mjs | 参数化解析/替换/兼容/缺参单测 |
| 再生 | docs/prompt/_extracted.json、docs/prompt/*.md | 金档同步（含单 A 后的可移植归一） |
