---
author: qinyi
created_at: 2026-09-23 10:05:00
---
# 提案书（Proposal）— 2026-09-23-sentinel-rules

## 动机
watcher（R7 切片一）已把观测从协议解耦：产物签名轮询 → 事件流（恒 provisional:true）→
本地 jsonl + 平台展示。但它**只看不喊**——面板能看见"checkbox 翻了"，却不能提示"翻了但
没有对应提交"；能看见"测试账本红了又绿"，却不能提示"绿之前动过测试文件"。观测的下一步
是让机械可疑模式**主动成为 advisory 信号**，人在面板上一眼看到"哪里不对劲"，而不是事后
归档审计才发现。这就是 L1 哨兵规则引擎：watcher 从"只看"升级为"会喊"。

## 关键问题
1. **假勾选无信号**：tasks.md 勾掉 task-XX 但没有对应提交、没有 review.json 变更——
   现有事件流只记 checked N→N+1，"完成声明无完成证据"这一可疑模式无人提示，归档审计
   才兜底，发现太晚。
2. **改测试凑绿无信号**：verify-quality-scan 账本记 FAIL → 测试文件被改 → 账本记 PASS
   的序列，可能是修 bug 也可能是改断言凑绿——序列本身是机械事实，值得一条 warning
   给人判，现在没有任何提示面。
3. **范围漂移与停滞不可见**：声明面之外的代码文件被改（多 agent 并行时他者改动混入）、
   变更长时间无事件（"在想"还是"死了"），面板上均无区分。

## 变更范围
- src/watcher.js 内加哨兵规则引擎：四规则（假勾选/改测试凑绿/范围漂移/停滞），全部
  机械事实判定，输出恒 advisory warning 事件——追加进既有 watcher-events-<change>.jsonl
  （加 rule 名 + severity=warning，恒带 provisional:true），继续 POST 平台 events 端点；
  **不写 progress db**（真相库只归协议调用——单写者纪律）。
- 新文件 src/sentinel-assertions.js：纯函数 `detectFakeCheckCompletion({changeDir,
  tasksMd, commits})`，供 --done 收口侧拒收（L0 升级通道）；**本批只交付函数+单测，
  收口接线留给下批**（避免与并行会话改同文件）。
- watcher 水位回补：重启时按上次事件水位 diff 期间文件状态补发事件（修面板连续性，
  非恢复依赖，幂等）。
- run 族最小挂点：runCommand 尾部 triggerSync 附近 spawnWatcher（与 flow start 同款
  best-effort）——现状核对后实际缺口为 `run auto` 早退分支（既有 1367 挂点在早退之后）。

## 不在范围内（显式清单）
- 不做 --done 收口接线（detectFakeCheckCompletion 只交付函数+单测，调用点下批）
- 不做 flow pause（停滞规则只告警不停流程）
- 不做旧流程折叠（flip-3.31.0 其余件不在本变更）
- 不做平台端 ingest/UI 改造（事件字段 additive，平台未升级照旧展示）
- 不做规则可配置化（阈值以导出常量落地，配置面后续按需）
- 不做 blocking/error 级别（恒 advisory，唯一 L0 例外是下批的收口拒收）
