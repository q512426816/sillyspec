---
author: flow-machine-draft
created_at: 2026-09-29T07:37:47.369Z
---
# 设计记录（Design Record）— 2026-09-29-flow-agent-log-report

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
在 cmdFlow（src/flow.js）加 reportAgentLog(changeKey, subName) 内联 helper，四个子命令分支（start/status/done/amend-draft）在 change 名解析+校验之后各调用一次 recordAgentLogInvocation——与 runCommand 入口（run/command.js:913-936）同款：探测 agent 环境登记 <runtimeRoot>/agent-session-log.json 并 POST /api/agent-logs 上报。context.changeKey=flow 的 change 名（flow 无 quick 会话概念，quickId 恒空；hubSessionId 走 env SILLYHUB_SESSION_ID 与 run 同源）；runtimeRootOpt 映射 platformOpts.runtimeRoot 保持 --runtime-root 透传口径。选分支级调用而非塞进 cmdFlowStart/cmdFlowDone 内部：change 在分支内才解析完成（start 的自动生成名尤其如此），且不动两个大函数体、--json 输出面零污染。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无新导出/无签名变化。对外可见行为：flow 族四个子命令各多一个 best-effort 副作用——agent 环境在场时写 <runtimeRoot>/agent-session-log.json（own 条目携带 change_key=<change 名>、last_command=子命令名+flag 名）并尝试上报平台（POST /api/agent-logs，payload 与 run 族同 schema）；探测不到/上报失败静默，协议面输出与 exit code 不变。
文件变更清单（自声明）：src/flow.js（cmdFlow helper + 四分支调用）、src/agent-session-log.js（JSDoc 一行「run 命令入口」→「run/flow」口径纠偏）、test/flow-agent-log-report.test.mjs（新增）、docs/platform-agent-log-protocol.md（触发时机补 flow 族）、.sillyspec/docs/sillyspec/modules/cli-entry.md（模块注记）。冻结面里其余文件（src/hooks/worktree-guard.js 等）属并行会话在途交付（9a44c325/77f9049e），非本变更交付——本变更各提交均显式 pathspec 隔离。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：每次调用独立登记，产物合并按 log_path 去重（同路径 invocations+1 刷新时间戳），调用次序不影响正确性；推送失败本地留底下次调用自愈。
2. 并发写：多会话并行 run/flow 时 agent-session-log.json 的读-改-写在 recordAgentLogInvocation 内部走 withFileLock 文件锁串行化（BUG-17 同款口径），本变更不改该逻辑。
3. 切换/中断：登记是附带动作，flow-state/冻结面不依赖它；中途断电最多丢一次登记，下次任意 flow 调用重写。
4. 作用域：own 锚定（env 覆盖/各 harness 会话锚定）保证只改写本会话条目，他人共享留底条目只刷探测事实不改归属（D-001/D-007 复用）；change_key 是 flow 分支内校验过的白名单名，无注入面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-agent-log-report 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：平台慢时 push 拖延协议面首屏。缓解：PUSH_TIMEOUT_MS=5s 硬上限 + 无平台配置即跳过 + 失败静默留底（与 run 族同语义，run --status 已付同代价）。放弃的方案：①挂 cmdFlowStart/cmdFlowDone 尾部（对齐 triggerSync 位置）——需改两个大函数、start 尾部有 --json 纯 JSON 输出面会被登记日志污染；②挂 index.js 分发层——change 未解析，auto 生成的 start 名拿不到，change_key 归属会缺。
