---
author: flow-machine-draft
created_at: 2026-10-16T00:25:50.314Z
---
# 设计记录（Design Record）— 2026-10-16-spec-sync-fail-alarm

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

本变更解决「spec-sync 对平台业务错误只打状态码 + 失败无限静默重试」的可观测性缺口（2026-10-16 生产索引损坏事故实证：422 真因要手动重放请求才拿得到，归档半态挂数小时无人知晓）。改 `src/spec-sync.js` 单文件：新增 `describeErrorBody`（响应体 JSON 解析为 code+message+details.path 摘要）与 `bumpFailStreak`/`clearFailStreak`/`readFailStreak`（按 label 的连续失败计数，持久化 `specRoot/.runtime/spec-sync-fail-streak.json`），GET 清单失败/POST 失败/异常三个失败分支接入「告警行拼响应体摘要 + 计数」，计数 ≥3 时升级 🚨 显式告警；无差异早退与两处成功路径清零计数。选这个方案是因为它零协议改动（不动请求形态、不动冲突协议）、fail-soft（计数落盘失败不影响同步主流程），与既有 sync-noise 噪音闸同层叠加。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出纯函数：`describeErrorBody(status, rawBody)` → 摘要串（JSON 有 code 用 code、无则 `HTTP_<status>`；有 details.path 拼 `path=…`；非 JSON 截断原文前 200 字；空体返回空串）。
- 新增导出：`readFailStreak(specRoot)` → `{[label]: {count,lastAt,lastError}}`；`bumpFailStreak(specRoot, label, detail)` → 递增后 count；`clearFailStreak(specRoot, label)`。
- 新增运行时文件：`.runtime/spec-sync-fail-streak.json`（不入 git 不上平台，已登记 file-lifecycle.md）。
- `syncSpecTree` 对外返回值形状不变（`{synced, conflict?, ...}`）；行为变化仅告警输出（失败行追加 ` —— <响应体摘要>`，计数 ≥3 追加一行 🚨 提示）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：计数只关心「成功/失败」二态与次序无关；乱序到达的响应各自独立计数/清零，最后一次操作赢（last-write-wins），无时序假设。
2. 并发写：两个进程同时 bump 同一 label 会读改写竞态，最坏丢一次自增（计数少 1，告警晚一轮）——fail-soft 可接受，与 sync-noise 闸同类语义；写文件用整文件覆盖（JSON 全量），不产生半行。
3. 切换/生命周期：计数文件随 specRoot/.runtime 生命周期留存，进程中断/重启后 streak 延续（这正是告警诉求——跨进程连续失败才可怕）；文件损坏时 readFailStreak 回空对象重新计，不清零已告警过的历史也无害。
4. 作用域：计数按 specRoot 隔离（各仓各自的 .runtime），label 即同步标签（变更名或 full-tree），跨仓/跨工作区不串台；同仓并行会话共享计数文件——这是期望行为（同一平台工作区的连续失败是共享事实）。

## 文件变更清单

- `src/spec-sync.js`：新增 describeErrorBody/readFailStreak/bumpFailStreak/clearFailStreak 四导出 + GET 清单失败/POST 失败/异常三失败分支接入 + 无差异与两处成功路径清零
- `test/spec-sync-fail-streak.test.mjs`（NEW）：A 纯函数（describeErrorBody）+ B mock 平台集成（三轮 422 升级 🚨/成功清零/label 隔离/无差异早退清零）——清零接入点共三处（无差异早退/正常成功/冲突自动消解），测试覆盖前两处；自动消解分支需构造 baseHash/lastSyncTs 跟随分片状态，mock 成本高，作为已声明残留不在本变更覆盖
- `docs/sillyspec/file-lifecycle.md`：登记 .runtime/spec-sync-fail-streak.json 运行时文件类型（规则 19）+ updated_at 批次链

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：连接类抖动（网络闪断）也计入 streak，可能对偶发网络故障打出 🚨 造成「狼来了」——接受此取舍，因为 🚨 文案明确指向「平台文件树持续落后」的语义，偶发抖动在任一次成功后即清零，不会长期挂红。试过但放弃的方案：①把告警接到平台侧（webhook/站内信）——平台侧正是故障方，自己通知自己不可靠；②只在 4xx 业务态计数、连接类不计——连接类失败同样造成文件树落后半态（平台长时间不可达），漏报比误报代价高；③复用 sync-noise 静音窗——静音窗会吞掉升级告警本身，与目标相反。
