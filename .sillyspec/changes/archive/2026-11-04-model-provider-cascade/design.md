---
author: flow-machine-draft
created_at: 2026-11-04T01:50:26.999Z
---
# 设计记录（Design Record）— 2026-11-04-model-provider-cascade

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 frontend 两处 + 新增一个本地记忆助手：① 新增 `frontend/src/lib/model-memory.ts`（localStorage `sh:last-model:<providerId>` 读写，容错 SSR 安全）；② SessionConfigBar 级联重做——供应商点选（暂存/预会话/即时）时模型自动解析「记忆（候选集内）→ 候选第一个 → 空串跟随」并经既有通道同步（onStagedSwitch model 键 / setProvisionalModel+onProvisionalModelSwitch / companion.model）；模型下拉在显示层供应商为具体供应商时移除「默认」选项（不指定态维持下拉不渲染）；显式选模型时写记忆并在 provider NULL 场景成对补暂存 engineDefaultProvider.id；快照模型为空时显示值回退自动解析（仅显示不暂存，载荷零变化）；③ panel-page/dialog 五个 inject 失败 catch 点补 notify.error 即时 toast。选「配置条内完成配对」而非改 buildStagedInjectOptions 远端解析的原因：engineDefaultProvider/providers/engine 派生已全部在配置条内（2026-10-28 显示回退同源），载荷语义与显示值天然一致；builder 既有 companion 保留为兜底不动。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出（frontend/src/lib/model-memory.ts）：`rememberLastModel(providerId: string, model: string): void`、`getLastModel(providerId: string): string | null`（key `sh:last-model:<providerId>`，JSON 容错，SSR/隐私模式静默）。SessionConfigBar 内部行为变化（props 签名不变）：executeSwitch 暂存/预会话分支的供应商级联从「模型重置默认」改为「模型自动解析」；模型 select 的 option 集合按显示层供应商分派；模型点选 handler 增加记忆写入与 provider NULL 成对补暂存（onStagedSwitch 多发一条 provider patch / onProvisionalSwitch 补 provider）。对外 API/端点/协议：无变化（inject 载荷仍走既有 SessionInjectRequest 字段；createSession 既有 model/llm_provider_id 字段）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。级联是同步 UI 事件流（点选→同步 patch），无异步竞争面；localStorage 读写同步且仅浏览器本地单标签语义（多标签页并发写同 key 为 last-write-wins，记忆丢失仅回退候选第一个，无正确性影响）。暂存配置（stagedConfig）仍由面板单一 useState 持有，本变更不改其所有权。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

单线程事件循环内同步执行，无并发写。localStorage 同 key 跨标签页写竞争为 last-write-wins，语义可接受（记忆是启发式缓存非权威数据）。stagedConfig 成对写入经既有 handleStagedSwitch 两次 setStagedConfig 函数式更新（prev 展开），同一事件内两次 setState 批处理安全。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。记忆 key 按 providerId 独立，跨会话/跨切换天然隔离；供应商删除后记忆成孤儿（读到候选集外回退第一个，FR-01 场景三锁定）；会话切换时 stagedConfig 既有清理逻辑不变（sessionStorage 恢复链路不感知本变更）。发送失败路径（toast 新增）不影响既有占位轮回退/草稿保留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。记忆按 providerId 键控（provider 归属用户，同浏览器多会话共享同一份记忆是预期语义——「上次选过的模型」本就是跨会话的用户偏好）；不入库、不随同步面扩散。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：既有会话「跟随供应商配置（model 空）」的用户被自动解析改变预期——缓解：仅显示层回退自动值（载荷不带 model，后端行为零变化），只有用户显式动作（点供应商/点模型）才成对进载荷；候选第一个取主模型（sonnet role 置顶既有排序），与 claim 链默认注入的 default_fallback_model 口径一致，显示与实际注入大概率同值。
试过放弃的方案：① buildStagedInjectOptions 内解析引擎默认供应商——面板层无 providers/engine 数据（配置条自取 providersQ），需新增查询或传参，改动面大且与显示层两处派生易漂移；② 模型下拉保留「默认」但仅记忆不自动选——用户明确定调「默认只在 不指定 时可选」，且不自动选会继续产生「显示已选但载荷不带」的错位（本变更动机本身）；③ 记忆存后端用户偏好表——跨设备一致性好但需迁移+端点，当前问题纯浏览器层，过度设计。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | frontend/src/lib/model-memory.ts | localStorage 供应商→模型记忆读写助手 |
| 新增 | frontend/src/lib/__tests__/model-memory.test.ts | 助手单测（读写/容错/缺键） |
| 修改 | frontend/src/components/sessions/session-config-bar.tsx | 级联重做：供应商点选自动解析模型（三模式）、模型下拉默认项门控、显式选模型写记忆+provider NULL 成对补暂存、快照空模型显示回退 |
| 修改 | frontend/src/components/sessions/__tests__/session-config-bar.test.tsx | 级联行为单测（FR-01/02/04） |
| 修改 | frontend/src/components/daemon/session-panel/session-panel-page.tsx | 三发送点位失败 catch 补 notify.error |
| 修改 | frontend/src/components/daemon/session-panel/session-panel-dialog.tsx | 两发送点位失败 catch 补 notify.error |
| 修改 | frontend/src/components/daemon/session-panel/__tests__/page.test.tsx | 发送失败 toast 断言（FR-05） |
