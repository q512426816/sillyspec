---
author: flow-machine-draft
created_at: 2026-10-17T06:17:49.417Z
---
# 设计记录（Design Record）— 2026-10-17-archive-terminal-sync-strict

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

归档/删除收尾的 triggerSync 全链 best-effort + 后台化，可靠性押在「下一条命令」上——而终态恰是全生命周期最不可能再有下一条命令的时刻；平台慢窗口内 DB 通道成功 + 文件树通道失败即成 location 半态（生产实证见 multi-agent-platform 仓坑档案）。修法三层：① `spec-sync.js syncSpecTree` 返回加 `ok` 显式契约（12 个返回点分类标记，无 ok=未确认 fail-closed）；② `sync.js` sync() 主链把树通道结果捕获进返回值 `treeOk`（既有 debugLog 吞点不再丢信息）；③ `run/shared.js` 新增 `triggerSyncTerminalStrict`——状态机驱动（仅 DB 终态生效，非终态委托 triggerSync 零行为变化），终态时绕过后台化内联有界同步（45s 下限同后台轮，opts.timeoutMs 可注入），失败 🚨 告警 + 自救命令 + exit 1。接线三终态点：flow.js flow done 收尾、complete.js 阶段完成尾部（状态机驱动单点覆盖 run archive --done）、change-delete.js 第 5 步。用户已批准该中改方案（会话 2026-10-17）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `syncSpecTree`（spec-sync.js）：返回对象新增可选 `ok: boolean`——成功/合法态 true、通道失败 false、未决冲突三路径不带 ok（未确认）。历史消费方（syncSpecTreeOnly/resolve forcePush）不读该字段，兼容。
- `SyncManager.sync`（sync.js）：成功路径返回新增 `treeOk: boolean`（树通道 ok 契约透传）；其余返回形状不变，17 个 triggerSync 调用点不消费返回值，兼容。
- 新导出 `triggerSyncTerminalStrict(cwd, changeName, platformOpts, opts)`（run/shared.js）：opts 支持 `timeoutMs`（测试注入短窗）、`syncImpl`/`changeStatus`（测试注入缝）、`exitOnUnconfirmed:false`（抑制退出码）；返回 `{confirmed, delegated?, skipped?, result?}`。
- `raceWithAbort`（run/shared.js 模块私有）：补返回值透传（历史调用方忽略返回值，零影响；超时 resolve null）。
- 端点/命令/表结构：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：终态强校验与 bg 后台轮可能并存（先前命令 spawn 的 bg 轮未收）——内联与 bg 对同一 sync() 端点均为幂等推送（409 自愈/无差异 no-op），乱序无害；强校验的树结果可能被 bg 轮提前收敛（no-diff ok:true），判读仍正确。
2. 并发写：sync() 内部既有 409 乐观锁 + base_ts 自愈链不变；本变更不改任何写路径，仅新增结果透传与终态分支判定（DB 读）。
3. 切换/生命周期：强校验失败置 process.exitCode=1 不抛异常——complete.js/flow.js 既有收尾流程照常走完（进度/归档文件已落盘），失败现场保留；exitOnUnconfirmed:false 可抑制（非交互嵌入场景）。
4. 作用域：终态判定按 resolvePlatformSpecDir(cwd) 定位 DB（与 collectTerminalSyncPending 同源库路径），平台 specRoot 模式与本地默认模式一致；跨仓/多实例经平台服务端乐观锁既有机制隔离。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：exit 1 被上游 agent 误读为「归档失败」而重跑 flow done——告警文案首行明确「本地归档已完成」，且 flow done 重跑对已归档变更是幂等拒绝（不产生二次归档）；平台持续宕机时终态命令将稳定 exit 1（如实反映「一致性未达成」，胜过静默半态）。已试并放弃：①改 triggerSync 全局行为（17 调用点全部受累，非终态命令被拖入阻塞——违背 2026-09-20 后台化的既有决策）；②时间驱动 watchdog 兜底（跨平台常驻进程/计划任务面大，留坑档案远改档）；③仅告警不置退出码（agent 侧无重试信号，保底仍缺一环）。

## 文件变更清单（自声明对账面）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/spec-sync.js | syncSpecTree 12 返回点加 ok 契约 + 头注释 |
| 修改 | src/sync.js | sync() 主链树结果捕获 treeOk 透传返回 |
| 修改 | src/run/shared.js | 新增 triggerSyncTerminalStrict + raceWithAbort 返回值透传 |
| 修改 | src/flow.js | flow done 收尾接线终态强校验 |
| 修改 | src/run/complete.js | 阶段完成尾部接线（状态机驱动，import + 单点替换） |
| 修改 | src/change-delete.js | 删除终态第 5 步接线 + import 收窄 |
| 新增 | test/terminal-sync-strict.test.mjs | ok 契约两件 + 状态机七件单测 |
