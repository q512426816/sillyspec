---
author: flow-machine-draft
created_at: 2026-10-27T21:23:00.522Z
---
# 设计记录（Design Record）— 2026-10-28-knowledge-hits-cli-push

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

CLI 直报主通道的发送侧（用户拍板「本地必写 + 有 TOKEN 即时增量直报」；接收端点 POST /api/changes/-/hits-sync 已由平台仓 2026-10-28-knowledge-hits-cli-direct 上线——shpsync_ 令牌派生工作区、行级幂等）。改点收敛在唯一写入口：`appendKnowledgeHit`（src/knowledge-hits.js）是全部遥测类型（inject/fr-inject/classify/fr-supersede/…共 10 个调用方）的落盘函数——在它落盘成功后 fire 直报，所有调用方零改动自动获得直报能力。直报函数 `pushKnowledgeHitToPlatform` 照 agent-session-log 的 `pushAgentLogToPlatform` 先例（AbortController 超时 + best-effort warn 不抛），配置读取复用其 `readPlatformPushConfig`（本变更将其 export 化，单一源不复制解析逻辑）；specBase 由 runtimeDir 剥尾 `.runtime` 段反推（两调用形态——`join(specBase,'.runtime')` 与 resolveRuntimeRoot 产物——都归一到该规则）。选型依据：写入口唯一性使通道升级面最小；行级幂等（服务端 (workspace_id, line_hash) 去重）使「写一行报一行」的逐行直报与 daemon 周期上行、平台按钮 flush 三通道并存零重复（承平台仓 2026-10-27-knowledge-hits-flush-button D-001 裁决）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- **`appendKnowledgeHit(runtimeDir, hit)`**：签名与返回值不变；新增副作用——落盘成功后有平台配置时 void fire 一次直报（无配置/关闭时零行为差异）。
- **新增 `pushKnowledgeHitToPlatform({ specBase, env, line })`**（src/knowledge-hits.js 导出）：读配置 → POST `{url}/api/changes/-/hits-sync`，body `{lines:[line], daemon_local_id:'cli'}`，Bearer token；返回 `Promise<{pushed:boolean|null, reason?:string}>`（null=未配置/被禁用，同 agent-log 先例语义）。daemon_local_id 恒 `'cli'`（通道标识已足够——user 维度平台侧可由令牌溯源，不扩 readPlatformPushConfig 的解析面）。
- **`readPlatformPushConfig(specBase, env)`**（src/agent-session-log.js）：私有函数改 export——签名与行为零变化，仅供 knowledge-hits.js 复用（单一源）。
- **env 开关 `SILLYSPEC_HITS_PUSH`**：`=0` 显式关闭直报（`SILLYSPEC_AGENT_LOG_PUSH` 同款先例）。
- **命令/CLI 入口/文件格式**：无变化（knowledge-hits.jsonl 行格式不动、daemon 兜底通道不动）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。逐行直报无顺序假设（行自含 occurred_at 与变更名）；与 daemon 周期上行并发报同批行由服务端 (workspace_id, line_hash) 行级唯一约束去重（IntegrityError 逐行 savepoint 吞并）——迟到的重复上报只是 duplicates 计数，零副作用。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   多 CLI 实例并发 append 同文件是既有形态（R-04 并发 append 交错容忍，行完整追加）；直报是每实例各自 fire 各自行（行级幂等互不干扰）。fetch 并发无共享状态（函数无状态）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。直报无本地状态（无游标无重试队列）——失败即弃（本地行在、daemon 兜底会再报该行）；CLI 短命进程显式 process.exit 砍掉在飞直报属接受边界（FR-02 声明），被砍行由 daemon 周期上行补齐。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不串台。workspace 归属由令牌决定（服务端从 shpsync_ 派生，CLI 不传 workspace 标识）——specBase 的 local.yaml 配哪个平台的哪个工作区令牌，行就落哪个工作区；同仓库多工作区绑定时按各检出场地的 local.yaml 各自定向，与 daemon junction 通道（显式 wsId）并存各行其道。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：**逐行直报的请求频次**——高频遥测命令（如 fr-rot-suspect 一命令多条 append）每行一发 HTTP。缓解：注入场景每命令通常数条量级、AbortController 超时上限兜住最坏等待；实测过频再优化（见放弃方案①的攒批形态）。次风险：直报拖住进程退出（活跃 socket 语义）——超时上限兜底 + SILLYSPEC_HITS_PUSH=0 可一键关闭；平台地址配错时每行一次失败 warn 的日志噪音——先例 agent-log 同款形态（warn 一行含状态码），可接受。

试过但放弃的方案：
- **命令收尾攒批直报**（收集本次进程新增行一次 POST）：需跨模块传收集器或引入模块级缓冲状态（生命周期面复杂化——缓冲在进程退出时同样有被砍窗口），而逐行直报零状态、行为可局部推理；请求频次问题留实测证据再优化，不为假想性能加状态；
- **改各调用方显式上报**（10 个调用点各自接 push）：写入口唯一性是现成资产，改 10 处徒增漂移面；
- **CLI 侧维护已上行 offset**（复刻 daemon 增量机制）：双通道各自记 offset 必然漂移，行级幂等使客户端零状态成为更简正确解。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/knowledge-hits.js | 落盘后 fire 直报 + 新增导出 pushKnowledgeHitToPlatform + specBase 反推 helper |
| 修改 | src/agent-session-log.js | readPlatformPushConfig 私有改 export（零行为变化） |
| 新增 | test/knowledge-hits-push.test.mjs | 直报四路单测 + 路径反推跨平台形态 |
