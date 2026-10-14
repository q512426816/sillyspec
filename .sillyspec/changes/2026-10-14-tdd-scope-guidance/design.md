---
author: flow-machine-draft
created_at: 2026-10-14T01:01:21.283Z
---
# 设计记录（Design Record）— 2026-10-14-tdd-scope-guidance

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

TDD 声明面加分层适用引导，机器门零改动。单一源先行：`templates/prompts/testcase-design.md` 头部（基础习惯行之后、逐条检查之前）加「先判该不该写：按层适用」块——纯逻辑严格 test-first / 行为契约断言用户可见行为 / 视觉样式与纯配置不写，附一句话判据（能写成「当 X 发生时，用户应看到/发生 Y」→ 写测试；只能描述成「看起来更精致」→ 不写）。经既有 `{{include: testcase-design}}` 机制自动流进 execute 派发三条路径、quick 档位与 dispatch 双后端子代理提示词，与 ql-20260812-006 建立的单源防漂移路线一致。声明面三实例（agents-instruction 模板 + AGENTS.md + CLAUDE.md 的规则 3/5）追加分层尾注；execute.js 任务闭环行、local-agent/sillyhub-mcp 写模式行、flow 命令卡「直接干活」行各加「按层适用」短语收口。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化（src/flow.js 门逻辑零改动）。对外可见变化=提示词与指引文本：① testcase-design.md 新增适用范围块——标题与 7 条检查原样保留，既有注入测试断言面不变；② 规则 3（模板）/规则 5（CLAUDE.md）追加「测试按层适用」尾注；③ execute/dispatch/flow 卡三处 TDD 措辞带「按层适用」限定。docs/prompt/ 提取副本同步重提取。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：纯文本面无事件序；include 是运行时解析（resolvePromptIncludes），模板改完即生效，无缓存序问题。
2. 并发写：turbo 变更（2026-10-14-thin-turbo-mode）源侧已提交（d49dd2b2），AGENTS.md/flow 命令卡无并行占用；本变更全部文件在提交后基线上编辑，Edit 前已核对最新态。
3. 切换/生命周期：指引文本无状态；模板对既有安装项目不回灌（init 同版本不更新），新装/升版才生效——旧项目行为不变，无中途切换风险。
4. 作用域：分层判据为语言无关表述（纯逻辑/行为契约/视觉样式/配置文档），非前端专词，后端与脚本项目同样适用；FR 测试绑定「不适用：理由」既有机制口径不变，只是引导该用就用。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：措辞过宽导致 agent 把「样式不写」误推到「前端不写」——用一句话判据收口判断，行为契约层明示组件/API 皆然。试过放弃：改 src/flow.js 测试门逻辑（按层机器豁免测试面）——放弃，层归属需人判，机器判会误伤（quick-audit 既有「0 测试改动」advisory 已覆盖提示职责）；本变更只动引导不动门。

## 文件变更清单

- templates/prompts/testcase-design.md
- templates/agents-instruction.md
- AGENTS.md
- CLAUDE.md
- src/stages/execute.js
- src/dispatch/backends/local-agent.js
- src/dispatch/backends/sillyhub-mcp.js
- assets/command-cards/flow.md
- test/tdd-scope-guidance.test.mjs（新增）
- docs/prompt/ 提取副本（execute.md / quick.md / README.md / _extracted.json / index.html 同步）
