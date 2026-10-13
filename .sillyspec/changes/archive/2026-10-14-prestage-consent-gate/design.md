---
author: flow-machine-draft
created_at: 2026-10-13T16:19:34.884Z
---
# 设计记录（Design Record）— 2026-10-14-prestage-consent-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

选道双峰问题（本仓 659 归档：全轻量 222 vs 完整五阶段 437，「头脑风暴预段+轻量收编」中道仅 3 例）的根因不在机制缺失——清晰度门/前门自检/出口 scale 分叉/adopt 收编/hindsight 闭环四件套齐全——而在触发器全部是非阻断弱信号：清晰度门是纯结构校验（成功标准行数>0），agent 代笔的标准恒过门；前门自检问法对过度自信的 agent 恒答「无」。本变更把 route-hindsight 既有标记的消费侧从「下次 start 点名提示（可无视）」升级为「声明即过的同意门」：标记在场时全新 `flow start` 须 `--no-prestage` 显式声明（留痕 flow-state.prestage_ack、标记消费）或先走 `run brainstorm` 预段（adopt 收编时自动消费标记）。同时收紧 AGENTS.md 选道表判据：成功标准须来自用户原话/既有文档转写，agent 推断拟出的标准＝需求不清晰。这是本仓既有治理模式（--autopilot/--upgrade-thick/--user-confirmed 同意门留痕）的复用，不是新发明。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/route-hindsight.js` 新增两个导出：`readHindsightMark({ specBase })`（结构化读标记，无/损坏 → null）、`clearHindsightMark({ specBase })`（消费删除，返回是否真删，幂等）；既有 `readHindsightHint`（resume 提示行渲染）不动。
- `src/flow.js` `cmdFlowStart` 新增参数 `prestageAck`（CLI flag `--no-prestage`）；全新 start 路径在清晰度门之后插入同意门（标记在场 + 无声明 → exit 2 两选一；声明 → 放行 + 消费标记）；flow-state 新增字段 `prestage_ack`（缺省 false，与 autopilot 同风格）；adopt（头脑风暴收编）分支开头消费标记；usage 帮助两行更新。
- 文案面三处同步：本仓 `AGENTS.md` 与 `templates/agents-instruction.md` 选道表第 1/2 行、`assets/command-cards/flow.md` 何时用+防坑清单。模板变更经版本发布后的 init 重跑传播到存量项目（同版本不更新的既有契约）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：标记由上个变更收口时写入、本次 start 时读取，时序单向（先标后拦），无乱序面。并行会话在本次 start 之后落新标记：本次已过门不受影响，下次 start 再拦——一次性反馈语义，可接受。
2. 并发写：两个会话同时 start 且标记在场——两者都读同一标记，各自声明各自消费，`clearHindsightMark` 幂等（后删者 false 零副作用）；标记文件本身由 `writeAtomicSync` 原子写（既有面）。最坏情形是双会话各声明一次，无数据损坏。
3. 切换/生命周期：被拦（exit 2）时不建变更目录、不写任何状态——重试无残留。声明放行后 `prestage_ack` 随 flow-state 持久化，收口/归档审计可见；标记消费后文件删除，再被标记会重新落盘重新拦（不会一次声明永久豁免）。
4. 作用域：标记按 specBase（per-repo/per-spec-root）隔离，跨仓不串台。resume（重入早退于门之前）与平台 writer 预建空目录（proceedFreshEmptyDir 豁免——平台自动派发无选道对话面）不受影响；平台路径不消费标记，留给人工会话消化。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：误拦摩擦——tasks 改写率阈值 0.6 偏敏感（agent 按真实实现路径改写机器种子是 tasks 契约鼓励的行为），可能频繁触发门，agent 为省事机械带 `--no-prestage` 让门退化为提示。缓解：声明有留痕（prestage_ack 可审计「确认过」vs「没被问过」），且这是自校准回路的第一环——后续可按误拦率调阈值。放弃的方案：① `--input` 自报来源字段（用户原话/agent 拟定）——100% 变更加摩擦、自报可绕（过度自信的 agent 恒报「用户原话」）、与 D-003/D-005「机器只产封闭面形态信号、语义判定归 agent/用户」的既有裁定冲突；② 把前门自检升级为硬门——盘问对象是本次需求（语义面），机器无判据，违背同一条裁定。同意门只消费上次的过程形态信号（封闭面：diff 比例/记录计数），不判本次需求，边界成立。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/route-hindsight.js | 新增 readHindsightMark/clearHindsightMark 导出（结构化读取+幂等消费），fs 导入加 rmSync |
| 修改 | src/flow.js | cmdFlowStart 加 prestageAck 参数；清晰度门后插预段同意门（exit 2 两选一/声明放行消费）；flow-state 落 prestage_ack；adopt 分支消费标记；start flag 接线 --no-prestage；usage 帮助更新 |
| 修改 | AGENTS.md | 选道表第 1/2 行判据收紧（成功标准来源判定）+ 同意门指路 |
| 修改 | templates/agents-instruction.md | 同上（init 模板同步） |
| 修改 | assets/command-cards/flow.md | 何时用+防坑清单同步判据与同意门 |
| 修改 | test/flow-clarity-probe.test.mjs | 既有④两用例随契约演进更新（标记在场全新 start 从点名提示→同意门 exit 2；声明放行 ack 行纯增量；端到端回路终点改门拦截形态） |
| 修改 | docs/sillyspec/platform-interface-map.md | 随手机械修 10 处 sync.js/index.js 行号锚漂移（并行会话 sync-ledger-tombstone 提交致，同 567661aa 惯例——非本变更行为面） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | setup 模块补登记 templates/、assets/command-cards/ 两路径（模块图门清偿） |
| 新增 | NEW:test/prestage-consent-gate.test.mjs | 门行为 7 用例（拦/放/adopt 消费/平台豁免/resume 豁免/无标记零影响/单元面） |
