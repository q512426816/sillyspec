---
author: flow-machine-draft
created_at: 2026-10-20T15:00:00.000Z
---
# 设计记录（Design Record）— 2026-10-20-scoped-verify-policy

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户裁决：收口自验口径与失败面复跑应钉进工具而非靠 agent 自觉。①规则面：AGENTS.md（本仓）与 templates/agents-instruction.md（init 生成模板，传播所有用仓）规则 4 追加同句——把「变更测试面+lint 即证据、全量归 pre-push、长输出落日志」从口头习惯升为规则；②runner 面：run-tests.mjs 加失败清单落盘与 --failed 复跑——失败定位不再需要整体重跑（本轮吞输出的教训），清单路径 env 可覆写防并行套件互踩（套件 TEMP 隔离同哲学）；过滤/落盘提纯函数模块便于单测。本变更自身即新口径首验：不手跑全量。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 `test/runner-failure-face.mjs`（parseFailureList/filterToFailedFace/persistFailureList 纯函数导出）；`test/run-tests.mjs` 新增 `--failed` flag 与清单落盘（默认路径 .sillyspec/.runtime/test-last-failures.txt，env SILLYSPEC_TEST_FAILURE_LIST 覆写）；无 CLI 命令/flag/文件格式变化；AGENTS.md 与模板各追加一句（措辞逐字一致）。
- 行为变化：全量失败后清单文件在场（gitignored runtime，无仓污染）；--failed 只跑清单面。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
清单是上一轮汇总的快照，迟到新失败不在清单内——--failed 面重跑全绿后自清，再跑全量兜底；无时序假设。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
并行双套件同写默认清单可能互踩——env 覆写路径供并行/测试场景分家（与套件 TEMP 隔离同源哲学）；默认路径单人场景下 last-writer-wins 可接受。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
清单是 gitignored runtime 派生物，删了也能全量重建；中断不破坏套件语义。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
清单路径锚定本仓 .sillyspec/.runtime（testDir 派生 repoRoot），各仓各一份；env 覆写为测试/并行提供隔离通道。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险1：--failed 全绿自清后用户以为无失败——自清即「失败面已清零」的正确语义，汇总区打印复跑指引与清零提示；可接受。
- 风险2：清单陈旧（测试改名/删除）——filterToFailedFace 对缺失项显式 warn，不静默；可接受。
- 死路：考虑过把失败清单嵌 verify-runs 的 test-result.json 复用——放弃：该文件是收口账本产物（每 runId 一份，不覆盖），复用需读最新 runId 引入耦合；独立清单文件一目了然，写入点就在汇总区。
