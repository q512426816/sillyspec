---
author: flow-machine-draft
created_at: 2026-10-05T12:44:46.600Z
---
# 设计记录（Design Record）— 2026-10-05-flowdone-lintfail-output

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

本变更为在途代码的倒推收尾（坑 flowdone-lint-fail-no-output，2026-10-03 实证；本会话接手收编，非原作者）。三层：① verify-postcheck.js 新增 persistLintResult——lint 结果优先读改写并入 test 的 test-result.json（modules 并列 `lint` 节），test 无结果文件（skipped/未跑）而 lint 实跑时按 writeRunResult 形状独立落盘（kind:lint），best-effort 失败返 null 不阻断门禁；② quick-audit.js 在门收尾处调 persistLintResult 并把 `failed` 数组提升到 try 块外——原块级作用域使 finally 快照回拷（P6b）读 failed.length 抛 ReferenceError 被空 catch 吞，回拷与 resultPath 重映射自 2026-09-28 落地即死代码（快照 FAIL 时结果文件随临时目录蒸发恒死链）；③ flow.js 的 flow done FAIL 输出在 test 三件套之后补 lint 件套（命令/输出尾部后15行/失败文件前10/结果文件路径），best-effort try 包裹。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出 persistLintResult({specBase, changeName, testResultPath, lint})（verify-postcheck.js）→ 落盘路径或 null。test-result.json 文件格式扩展：新增可选顶层 `lint` 节（command/exitCode/status/durationMs/outputTail/reason/failureFiles/resultPath），既有字段（modules 等）不受扰；独立落盘形态带 kind:'lint'。quick-audit runQuickTestLintGate 返回值不变，副作用新增 lint 持久化与 failed 作用域修正（对外行为=快照 FAIL 回拷真实生效）。flow done CLI 输出扩展（lint FAIL 时多四段输出）。runVerifyLintCheck 本体未改。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——persistLintResult 在 lint 实跑完成后单次调用（同步），读改写 test-result.json 时无并发写者（同门内串行）；lint 对象是当场结果非缓存，无迟到重放面。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   同 change 的 quick 门本就单会话串行；跨 change 各写各的 verify-runs 目录（时间戳目录名）。并入分支对 test-result.json 是读改写（非原子）——若恰有他进程并发写同文件，最坏丢一次 lint 节或被他写覆盖（best-effort 显式声明，不阻断门禁）；writeFileSync 整文件覆写不会留半文件交错损坏形态。收编评审 P1 处置补记：finally 的重映射引用 test/lint 原为 try 块级声明（ReferenceError 死代码），三变量齐提升后真实生效。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——三处改动均 try/catch best-effort 包裹（flow 件套输出、persistLintResult、quick-audit 调用点），任一中断只少一段输出/一节落盘，FAIL 主判定（failed.length>0）不受影响；failed 提升只改作用域不改生命周期。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：落盘路径锚 specBase（本变更 .runtime/verify-runs），独立落盘目录名时间戳+读改写仅限传入的 testResultPath；e2e 夹具仓与真仓各自 specBase 隔离。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：读改写 test-result.json 的并入分支在结果文件损坏时静默退独立落盘——同变更可能留下两份结果文件（原损坏件+独立 lint 件），消费端按 kind 字段区分；显式 best-effort 边界已在 JSDoc 声明。倒推收尾特有风险：接手非本会话原创的代码，语义理解偏差——已逐行核对 diff 与既有 test 三件套同构性并实跑其自带 e2e 锁定。放弃的方案：① 在 runVerifyLintCheck 内直接落盘——该函数被多路径复用（verify/quick/flow），落盘时机与归属 change 名在调用方才知道，写入层错位；② 改 tally 记全量输出——tally 是计数器不是存储，扩容错位。均已弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/verify-postcheck.js | 新增 export persistLintResult（并入/独立落盘/skipped 不落三态） |
| 修改 | src/run/quick-audit.js | failed 提升到 try 外（修 P6b 死代码）+ 门收尾调 persistLintResult |
| 修改 | src/flow.js | flow done FAIL 输出补 lint 件套（best-effort） |
| 新增 | test/flowdone-lint-fail-output.test.mjs | persistLintResult 三态单测 + lint 门 FAIL e2e 全链路 |
