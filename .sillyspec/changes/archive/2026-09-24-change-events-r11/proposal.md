---
author: qinyi
created_at: 2026-09-23 18:39:33
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
sillyspec CLI 侧 watcher/哨兵已向 `{platform.url}/api/changes/{name}/events` 推送旁路观测事件（POST JSON：kind/rule/severity/provisional:true/detail/ts 等，恒 provisional），但平台侧该端点不存在，推送全部静默 404——变更执行期的观测信号（如产物签名变化、阶段异常告警）无法到达平台，面板上变更详情只有流程态（进度/审批/文档），看不到旁路观测层。

## 关键问题
1. 消费端缺失：watcher 推送无人接（404），观测数据整条链路断在平台门口；
2. 无展示位：变更详情页没有「观测事件」区，用户无法在平台侧看到变更执行期的旁路信号（尤其 warning 级）；
3. 无幂等与上限策略：watcher 产物签名轮询会重推，若不设计去重与容量上限，表会被重复事件与无限增长拖垮。

## 变更范围
- backend（`app/modules/platform_sync/`）：
  - 新表 `platform_change_events`（append-only，workspace+change_name+dedup_key 唯一幂等，单变更上限 5000 截最旧）；
  - `POST /api/changes/{name}/events`：shpsync_ 写通道接收写入（单事件或数组批量）；
  - `GET /api/changes/{name}/events?since=<iso>`：读 scope 鉴权，ts 正序增量拉取；
  - Alembic 迁移 + pytest 五组（收/取/去重/鉴权/上限）。
- frontend（`frontend/`）：
  - 变更详情页新增「观测事件」折叠卡（缺省收起、有 warning 默认展开+角标、时间线 warning 琥珀高亮、provisional 徽标悬停提示）；
  - 打开 GET 一次 + 30s 轮询（SSE 不做）；
  - 组件测试四组（渲染/高亮/空态/角标）+ `pnpm gen:types` 再生成 api-types.ts 与 backend/openapi.json。

## 不在范围内（显式清单）
- 不做 SSE/WebSocket 推送通道（30s 轮询已满足旁路观测时效）
- 不做事件的任何业务消费：不触发状态机流转、不参与审批门控、不影响 execute/verify 判定（红线：provisional 只展示不消费）
- 不做事件的管理端（删除/确认/处置）与通知（站内信/邮件）能力
- 不做移动端（`src/app/m/`）变更详情页的事件区（桌面端先行，移动端后续按需）
- 不改 sillyspec CLI 侧 watcher 推送逻辑（生产端契约已存在，本件只建消费端）

## 成功标准（可验证）
- dev 后端起服后，curl 以 shpsync_ token 连推 5 条事件（含 2 条 warning）→ 200；`GET /api/changes/{name}/events` 返回正序列表；重推同 id/ts+rule 事件不产生新行（去重生效）
- 无凭据 401 / shk_live_·JWT 打写通道 403 / 面板 JWT 读通道 200
- 单变更推超 5000 条后表内最多 5000 条且保留的是最新侧
- 变更详情页出现「观测事件」折叠区：空态收起无角标；有 warning 默认展开+角标计数；warning 行琥珀高亮；provisional 徽标悬停显示「旁路观测信号，非流程真相」
- pytest 五组 + 前端组件测试四组全绿（按 CLI 门禁实测口径）
